// Decodes a JWT's payload for display purposes only (e.g. showing the
// logged-in user's email on the Profile page) — never used for auth
// decisions, which stay entirely server-side. No signature verification,
// since a tampered token would just show wrong display text, not grant access.
export function decodeJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}
