// MOR-36: permissões e utilidades da gestão de etiquetas (ADMs).
import { countRate, errorJson, recordRate } from "./shared.js";
import { canModerate, getAdminContext } from "./admins.js";
import { TAGDEF_PER_HOUR } from "./etiquetas.js";

export async function authzTags(request, env) {
  const ctx = await getAdminContext(request, env);
  if (!ctx.loggedIn) return { res: errorJson("Não autorizado.", 401) };
  if (!ctx.any) return { res: errorJson("Apenas ADMs gerem etiquetas.", 403) };
  if (!env.DB) return { res: errorJson("Serviço indisponível.", 503) };
  return { ctx };
}
export function canManageScope(ctx, scope) {
  if (scope === "site") return Boolean(ctx.site);
  return canModerate(ctx, scope);
}
export function modTag(t) {
  return { id: t.id, escopo: t.scope, nome: t.name, slug: t.slug, cor: t.color || "0", descricao: t.description || "", ativa: Boolean(t.active), ordem: Number(t.position || 0),
    usos: Number(t.usos || 0), criada_em: t.created_at, atualizada_em: t.updated_at };
}
export async function rateTagDef(env, ctx) {
  if (!ctx.user) return null; // token de ADM: sem limite por conta
  const key = "u:" + ctx.user.id;
  if ((await countRate(env.DB, key, "tagdef", new Date(Date.now() - 3600000).toISOString())) >= TAGDEF_PER_HOUR) return errorJson("Limite de mudanças em etiquetas por hora atingido.", 429);
  await recordRate(env.DB, key, "tagdef");
  return null;
}

