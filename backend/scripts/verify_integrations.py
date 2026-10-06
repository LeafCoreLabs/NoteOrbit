"""Check Groq + SMTP env configuration (run from backend/: python scripts/verify_integrations.py)."""
from __future__ import annotations

import sys

from shared.config import settings
from shared.email_utils import smtp_configured
from shared.groq_client import call_groq_api


def main() -> int:
    ok = True

    if settings.groq_api_key:
        reply, err = call_groq_api("Reply with exactly: NoteOrbit Groq OK")
        if err:
            print(f"[FAIL] Groq: {err}")
            ok = False
        else:
            print(f"[OK]   Groq: {reply[:80].strip()!r}")
    else:
        print("[SKIP] Groq: GROQ_API_KEY not set in .env")
        ok = False

    if smtp_configured():
        print(f"[OK]   SMTP: configured ({settings.smtp_host}:{settings.smtp_port} as {settings.smtp_user})")
        print("       Send a real notification email (e.g. notice upload) to confirm delivery.")
    else:
        print("[SKIP] SMTP: set SMTP_HOST, SMTP_USER, SMTP_PASS in .env")
        ok = False

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
