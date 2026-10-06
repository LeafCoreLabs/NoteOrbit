"""Shared helpers ported from legacy Flask app."""
from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime

import requests

from shared.config import settings
from shared.storage import get_s3_client, upload_to_minio

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
except ImportError:
    canvas = None
    A4 = None

try:
    import pdfkit
except ImportError:
    pdfkit = None


def mask_email(email: str) -> str:
    try:
        if "@" not in email:
            return email
        user, domain = email.split("@", 1)
        if len(user) <= 2:
            masked_user = user[0] + "***"
        else:
            masked_user = user[:2] + "***" + user[-1]
        return f"{masked_user}@{domain}"
    except Exception:
        return email


def cents_to_rupees_str(amount_cents: int) -> str:
    return f"{amount_cents // 100}.{amount_cents % 100:02d}"


def ensure_receipt_pdf(html_content: str, filename_base: str) -> str:
    tmp_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "tmp", "receipts")
    os.makedirs(tmp_dir, exist_ok=True)
    fname = f"{filename_base}.pdf"
    local_path = os.path.join(tmp_dir, fname)

    if pdfkit:
        try:
            pdf_bytes = pdfkit.from_string(html_content, False)
            with open(local_path, "wb") as f:
                f.write(pdf_bytes)
            return local_path
        except Exception:
            pass

    if canvas and A4:
        try:
            c = canvas.Canvas(local_path, pagesize=A4)
            textobject = c.beginText(40, 800)
            temp_content = html_content
            if "<body>" in html_content:
                try:
                    temp_content = html_content.split("<body>")[1].split("</body>")[0]
                except Exception:
                    temp_content = html_content
            lines = [
                line.split(">", 1)[-1].replace("</p>", "").replace("</strong>", "")
                for line in temp_content.split("<p>")
            ]
            for line in lines:
                line_plain = (
                    line.strip()
                    .replace("<h2>", "")
                    .replace("</h2>", "")
                    .replace("<strong>", "")
                    .replace("</small>", "")
                    .replace("<a>", "")
                    .replace("</a>", "")
                )
                if line_plain:
                    textobject.textLine(line_plain[:200])
            c.drawText(textobject)
            c.showPage()
            c.save()
            return local_path
        except Exception:
            pass

    txt_path = os.path.join(tmp_dir, f"{filename_base}.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("Payment Receipt\n\n")
        clean = re.sub(r"<[^>]+>", "\n", html_content)
        f.write(clean)
    return txt_path


def upload_receipt(path_local: str, dest_key: str | None = None) -> tuple[str, str]:
    if not dest_key:
        dest_key = settings.receipt_prefix + os.path.basename(path_local)
    content_type = "application/pdf" if path_local.endswith(".pdf") else "text/plain"
    with open(path_local, "rb") as f:
        _, dest_key = upload_to_minio(f, dest_key, content_type)
    presigned = get_s3_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.minio_default_bucket, "Key": dest_key},
        ExpiresIn=3600,
    )
    return dest_key, presigned


def search_open_library(query: str) -> list[dict]:
    try:
        response = requests.get(settings.openlibrary_url, params={"q": query, "limit": 10}, timeout=15)
        response.raise_for_status()
        data = response.json()
        books = []
        for doc in data.get("docs", []):
            author_names = doc.get("author_name")
            if doc.get("title") and author_names:
                isbn = doc.get("isbn")
                books.append(
                    {
                        "id": f"OL-{doc.get('key')}",
                        "title": doc["title"],
                        "author": ", ".join(author_names),
                        "source": "OpenLibrary",
                        "cover_url": (
                            f"https://covers.openlibrary.org/b/id/{doc.get('cover_i')}-M.jpg"
                            if doc.get("cover_i")
                            else None
                        ),
                        "isbn": isbn[0] if isbn and isinstance(isbn, list) else None,
                        "file_url": None,
                        "degree": None,
                        "semester": None,
                    }
                )
        return books
    except Exception as e:
        print(f"Error calling OpenLibrary API: {e}")
        return []


def create_daily_message_with_ai(msg_type: str, user_name: str) -> str:
    if not settings.groq_api_key:
        return "Enjoy your day! (AI Key missing)"

    if msg_type == "sunday":
        prompt = (
            f"Write a short, relaxing, and funny message for a student named {user_name} "
            "because it's Sunday. Max 2 sentences. Include a relaxing emoji."
        )
    elif msg_type == "no_class":
        prompt = (
            f"Write a short, hype message for a student named {user_name} who has no classes today. "
            "Include a 'Did you know?' fun fact. Max 3 sentences."
        )
    elif msg_type == "good":
        prompt = (
            f"Write a short encouraging message for {user_name} who attended most classes today. "
            "Max 2 sentences."
        )
    else:
        prompt = (
            f"Write a short motivational message for {user_name} who missed some classes today. "
            "Max 2 sentences."
        )

    try:
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama3-8b-8192",
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=5,
        )
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"AI Gen Error: {e}")
    return "Have a great day!"
