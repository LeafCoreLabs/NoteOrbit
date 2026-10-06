import json
import time

import requests

from shared.config import settings


def groq_chat(messages: list[dict], temperature: float = 0.7, json_mode: bool = False):
    if not settings.groq_api_key:
        return {"error": "GROQ_API_KEY not configured"}
    payload = {
        "model": settings.groq_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 2048,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    try:
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=60,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        if json_mode:
            clean = content.replace("```json", "").replace("```", "").strip()
            return json.loads(clean)
        return content
    except Exception as e:
        return {"error": str(e)}


def call_groq_api(prompt: str) -> tuple[str | None, str | None]:
    if not settings.groq_api_key:
        return None, "GROQ_API_KEY environment variable is missing or empty."
    payload = {
        "model": settings.groq_model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are Orbit Bot, an Academic Assistant trained by Meta and tuned at LeafCore Labs. "
                    "Provide helpful, concise, academically relevant answers."
                ),
            },
            {"role": "user", "content": prompt},
        ],
    }
    for attempt in range(3):
        try:
            resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.groq_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=60,
            )
            resp.raise_for_status()
            text = resp.json().get("choices", [{}])[0].get("message", {}).get("content")
            if text:
                return text, None
            return None, "API returned empty response"
        except requests.exceptions.HTTPError as e:
            if resp.status_code in (429, 500, 503) and attempt < 2:
                time.sleep(2**attempt)
                continue
            return None, str(e)
        except Exception as e:
            return None, str(e)
    return None, "Failed to connect to Groq API"
