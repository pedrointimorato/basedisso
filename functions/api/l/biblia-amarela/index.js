import { json } from "../../../_lib/shared.js";
import { getAdminContext } from "../../../_lib/admins.js";
import { BIBLIA_DEFAULT, readBiblia } from "../../../_lib/biblia.js";

// GET /api/l/biblia-amarela → documento atual (D1 ou padrão) + pode_editar.
export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return json({ ok: true, origem: "padrao", ...BIBLIA_DEFAULT, editado: null, pode_editar: false });
  const doc = await readBiblia(env.DB);
  let pode = false;
  try {
    const ctx = await getAdminContext(request, env);
    pode = Boolean(ctx.site);
  } catch {
    pode = false;
  }
  return json({ ok: true, ...doc, pode_editar: pode }, 200, { "Cache-Control": "no-store" });
}
