import { CLAIMABLE_ADMIN, isClaimableAdminName, normalizeUsername } from "./_lib/auth.js";
import { profilePageHtml } from "./_lib/profile-page.js";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const m = url.pathname.match(/^\/@([^/]+)\/?$/);
  if (m && (context.request.method === "GET" || context.request.method === "HEAD")) {
    let raw;
    try {
      raw = decodeURIComponent(m[1]);
    } catch {
      raw = m[1];
    }
    const parsed = normalizeUsername(raw);
    if (!parsed) {
      return new Response("Página não encontrada.", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    let canonical = parsed.username;
    if (context.env.DB) {
      const row = await context.env.DB.prepare(
        "SELECT username FROM users WHERE username_lc = ?"
      )
        .bind(parsed.username_lc)
        .first();
      if (row) canonical = row.username;
      else if (isClaimableAdminName(parsed.username_lc)) canonical = CLAIMABLE_ADMIN;
    } else if (isClaimableAdminName(parsed.username_lc)) {
      canonical = CLAIMABLE_ADMIN;
    }

    if (raw !== canonical) {
      const dest = new URL(`/@${canonical}`, url.origin);
      return Response.redirect(dest.toString(), 302);
    }

    const html = profilePageHtml({
      title: `>>${canonical} — basedisso`,
      initialPath: `/@${canonical}`,
    });
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
  return context.next();
}
