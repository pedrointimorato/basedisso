import { errorJson, json } from "../../_lib/shared.js";
import { disponibilidadeErro, nameConflict, normalizeUsername } from "../../_lib/reservas.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço de reservas indisponível.", 503);
  const nome = new URL(request.url).searchParams.get("nome") || "";
  const parsed = normalizeUsername(nome);
  if (!parsed) {
    return json({
      ok: false,
      disponivel: false,
      erro: disponibilidadeErro(null, null),
    });
  }
  const conflict = await nameConflict(env.DB, parsed.username_lc);
  const erro = disponibilidadeErro(parsed, conflict);
  if (erro) return json({ ok: true, disponivel: false, erro, username: parsed.username });
  return json({ ok: true, disponivel: true, username: parsed.username });
}
