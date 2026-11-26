// Turnstile só para quem interage sem conta. Siteverify no servidor; o segredo fica no Pages (TURNSTILE_SECRET).
import { clientIp } from "./shared.js";

export const TURNSTILE_ACTIONS = { comentario: "comentario", postagem: "postagem" };

export async function verifyTurnstile(request, env, token, action) {
  const secret = env.TURNSTILE_SECRET;
  if (!secret) return { ok: true, skipped: true }; // ambiente sem Turnstile (dev local)
  const hostnames = new Set(String(env.TURNSTILE_HOSTNAMES || "").split(",").map((h) => h.trim()).filter(Boolean));
  if (typeof token !== "string" || !token || token.length > 2048 || !hostnames.size) {
    return { ok: false, codes: ["missing-input-response"] };
  }
  let result;
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10000),
      body: new URLSearchParams({ secret, response: token, remoteip: clientIp(request) }),
    });
    if (!r.ok) throw new Error("siteverify " + r.status);
    result = await r.json();
  } catch {
    return { ok: false, codes: ["siteverify-indisponivel"] };
  }
  if (!result.success) return { ok: false, codes: (result["error-codes"] || []).slice(0, 4) };
  if (result.action !== action) return { ok: false, codes: ["acao-invalida"] };
  if (!hostnames.has(result.hostname)) return { ok: false, codes: ["hostname-invalido"] };
  return { ok: true };
}

export const TURNSTILE_ERRO = "Confirme que você não é um robô (verificação do Cloudflare) e tente de novo. Quem entra na conta não precisa disso.";
