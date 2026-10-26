import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { verify, json } from "../lib/auth.mjs";
const KEYS = ["vendas", "elegiveis", "cadastro", "base"];
export default async (req: Request) => {
  const store = getStore({ name: "combos-config", consistency: "strong" });
  if (req.method === "GET") {
    const c = (await store.get("config", { type: "json" })) || {};
    return json(c);
  }
  if (req.method !== "POST") return json({ erro: "método não suportado" }, 405);
  const user = await verify(req);
  if (!user) return json({ erro: "Sessão expirada. Entre novamente." }, 401);
  let b: any = {};
  try { b = await req.json(); } catch {}
  const atual: any = (await store.get("config", { type: "json" })) || {};
  const fontes: Record<string, string> = { ...(atual.fontes || {}) };
  for (const k of KEYS) {
    if (!(k in (b.fontes || {}))) continue;
    const v = String(b.fontes[k] || "").trim();
    if (!v) { delete fontes[k]; continue; }
    try { if (new URL(v).protocol !== "https:") throw 0; } catch { return json({ erro: `Link inválido em ${k}.` }, 400); }
    fontes[k] = v;
  }
  const novo = { fontes, atualizado: new Date().toISOString(), por: user };
  await store.setJSON("config", novo);
  return json(novo);
};
export const config: Config = { path: "/api/config" };
