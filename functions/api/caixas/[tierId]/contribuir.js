import { normalizeEmail } from "../../../_lib/auth.js";
import { countRate, errorJson, hashIp, isSameOrigin, json, recordRate } from "../../../_lib/shared.js";
import { CONTRIB_MAX_CENTS, createContribution, getTier } from "../../../_lib/caixas.js";
import { reservasAbertas } from "../../../_lib/mp.js";

export async function onRequestPost(context) {
  const { request, env, params } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  let data;
  try {
    data = await request.json();
  } catch {
    return errorJson("Pedido inválido.", 400);
  }
  if (data && typeof data.website === "string" && data.website.trim() !== "") return errorJson("Pedido inválido.", 400);
  const tier = await getTier(env.DB, params.tierId);
  if (!tier || !Number(tier.enabled)) return errorJson("Esta caixa não está disponível.", 404);
  let cents = data?.amount_cents;
  if ((cents == null || cents === "") && data?.valor != null) {
    cents = Math.round(Number(String(data.valor).replace(",", ".")) * 100);
  }
  cents = Number(cents);
  if (!Number.isInteger(cents) || cents < Number(tier.min_contribution_cents || 100)) {
    return errorJson("A contribuição mínima é de R$ 1,00 (valor em centavos inteiros).", 400);
  }
  if (cents > CONTRIB_MAX_CENTS) return errorJson("O valor máximo por contribuição é R$ 1.000,00.", 400);
  const email = normalizeEmail(data?.email);
  if (!email) return errorJson("Informe um e-mail válido para o Pix.", 400);
  if (!reservasAbertas(env)) return errorJson("Os pagamentos abrem em breve.", 503);
  const ipHash = await hashIp(request, env);
  const now = Date.now();
  const perMin = await countRate(env.DB, ipHash, "caixa_pix", new Date(now - 60000).toISOString());
  const perHour = await countRate(env.DB, ipHash, "caixa_pix", new Date(now - 3600000).toISOString());
  if (perMin >= 3 || perHour >= 15) return errorJson("Muitos Pix gerados deste endereço. Espere um pouco.", 429);
  await recordRate(env.DB, ipHash, "caixa_pix");
  const out = await createContribution(env, { tierId: tier.id, amountCents: cents, email, ipHash });
  if (out.error) return json({ erro: out.error, detalhe: out.detalhe || null }, out.status || 400);
  return json(out, 201);
}
