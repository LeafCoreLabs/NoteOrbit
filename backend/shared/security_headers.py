import re
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Production security hardening middleware:
    1. Sets OWASP recommended defense-in-depth security headers.
    2. Enforces SameSite=Strict, Secure, and HttpOnly on all Set-Cookie headers.
    """

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # 1. Defense-in-depth HTTP Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"

        # Content-Security-Policy (allows Vite scripts and styles, disallows embedding in iframes)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; "
            "frame-ancestors 'none';"
        )

        # 2. Enforce SameSite=Strict, Secure, and HttpOnly on Cookies
        cookie_headers = response.headers.getlist("set-cookie")
        if cookie_headers:
            new_cookies = []
            for cookie in cookie_headers:
                parts = [p.strip() for p in cookie.split(";")]
                cookie_dict = {}
                main_cookie = parts[0]

                # Check if attributes are already set
                has_samesite = any("samesite" in p.lower() for p in parts[1:])
                has_secure = any(p.lower() == "secure" for p in parts[1:])
                has_httponly = any(p.lower() == "httponly" for p in parts[1:])

                updated_parts = [main_cookie]
                for p in parts[1:]:
                    # Retain non-duplicate parts
                    if not any(k in p.lower() for k in ("samesite", "secure", "httponly")):
                        updated_parts.append(p)

                # Inject modern security attributes
                updated_parts.append("SameSite=Strict")
                updated_parts.append("Secure")
                updated_parts.append("HttpOnly")

                new_cookies.append("; ".join(updated_parts))

            # Replace headers
            del response.headers["set-cookie"]
            for c in new_cookies:
                response.headers.append("set-cookie", c)

        return response
