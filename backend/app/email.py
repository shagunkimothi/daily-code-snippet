"""Email sending abstraction — currently backed by Resend's HTTP API
(https://resend.com/docs/api-reference/emails/send-email). Swapping
providers later (SendGrid, Postmark, SES) means changing only this file;
every caller just imports send_email() and never touches the provider
directly."""
import os
import httpx

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM", "DailyCode <onboarding@resend.dev>")


def send_email(to: str, subject: str, html: str) -> bool:
    """Sends one email. Returns True/False rather than raising — email
    delivery must never break the request that triggered it (signup,
    login), so failures are logged and swallowed here, not propagated."""
    if not RESEND_API_KEY:
        print(f"[email] RESEND_API_KEY not set — skipping email to {to} ({subject})")
        return False

    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json={"from": EMAIL_FROM, "to": [to], "subject": subject, "html": html},
            timeout=10.0,
        )
        response.raise_for_status()
        return True
    except Exception as e:
        print(f"[email] Failed to send to {to}: {e}")
        return False
