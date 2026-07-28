"""Reusable HTML email templates. One shared table-based layout (_layout)
wraps whatever content block a specific email needs, so welcome/reminder/
weekly-summary/future emails all inherit the same header, footer, and
brand styling instead of duplicating markup. Inline styles throughout
since most email clients strip <style> blocks or ignore external CSS —
plain, honest copy throughout, matching the product's established voice
(no marketing language, no filler)."""
import html

DEFAULT_FRONTEND_URL = "https://daily-code-snippet.vercel.app"


def _layout(preheader: str, body_html: str, frontend_url: str) -> str:
    return f"""<!doctype html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:#f4f5f7;">{preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#0b0f1a;padding:20px 32px;">
              <span style="display:inline-block;width:30px;height:30px;background:#00d4ff;border-radius:8px;color:#03080e;font-weight:800;font-family:'Courier New',monospace;text-align:center;line-height:30px;font-size:12px;">&lt;/&gt;</span>
              <span style="color:#ffffff;font-weight:700;font-size:15px;margin-left:10px;vertical-align:middle;">DailyCode</span>
            </td>
          </tr>
          <tr><td style="padding:32px;color:#14161a;font-size:15px;line-height:1.6;">
            {body_html}
          </td></tr>
          <tr>
            <td style="padding:18px 32px;background:#f8f9fb;border-top:1px solid #e5e7eb;font-size:12px;color:#8898b0;">
              You're receiving this because you have a DailyCode account.
              <a href="{frontend_url}/settings" style="color:#0077aa;">Manage email preferences</a>
              &middot; &copy; DailyCode
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>"""


def _button(label: str, url: str) -> str:
    return (
        f'<a href="{url}" style="display:inline-block;background:#0077aa;color:#ffffff;'
        f'text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px;">'
        f"{label}</a>"
    )


def welcome_email_html(frontend_url: str = DEFAULT_FRONTEND_URL) -> str:
    body = f"""
      <h1 style="margin:0 0 12px;font-size:20px;color:#14161a;">Welcome to DailyCode</h1>
      <p style="margin:0 0 16px;">
        DailyCode gives you one new programming concept a day — read it, save it,
        and build a real learning habit over time. No overwhelming course list,
        no giant backlog. Just today's snippet.
      </p>
      <p style="margin:0 0 24px;">Your first one is already waiting.</p>
      {_button("Read today's snippet →", frontend_url + "/")}
    """
    return _layout(preheader="Your first concept is ready.", body_html=body, frontend_url=frontend_url)


def reminder_email_html(snippet, frontend_url: str = DEFAULT_FRONTEND_URL) -> str:
    """`snippet` is a Snippet ORM object — title/explanation are
    user-generated content (any authenticated user can publish a public
    snippet, which is exactly what feeds the daily rotation this email
    announces), so they're html.escape()'d before going into this raw HTML
    string. Unlike JSX on the frontend, an f-string here does not
    auto-escape — skipping this would be a stored-XSS-via-email vector.
    Deliberately just a teaser (title + short explanation), not the code
    itself — code blocks render inconsistently across email clients, and
    the point is to pull the reader back into the app, not replace it."""
    title = html.escape(snippet.title)
    explanation = html.escape(snippet.explanation or "")
    body = f"""
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#0077aa;">Today's concept</p>
      <h1 style="margin:0 0 12px;font-size:19px;color:#14161a;">{title}</h1>
      <p style="margin:0 0 20px;color:#4a5570;">{explanation}</p>
      {_button("Read it on DailyCode →", frontend_url + "/")}
    """
    return _layout(preheader=f"Today: {title}", body_html=body, frontend_url=frontend_url)
