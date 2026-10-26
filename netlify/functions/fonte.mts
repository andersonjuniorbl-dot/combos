import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { verify, json } from "../lib/auth.mjs";
// Busca a planilha pelo servidor quando o navegador é bloqueado (ex.: links do Google Drive).
const DEF: Record<string, string> = {"vendas": "https://docs.google.com/spreadsheets/d/e/2PACX-1vS5vuO78ihBPYlnYDiP8UYF-cNT5WQHMKap5zOy-5L3BOiYxP87mMnM9MKYDoymNA/pub?output=csv", "elegiveis": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ4M2GLPF99O70xuMoHKX0jdMGA1a4yK833zM9zfFudpVentC6uQaQ0AcWWWb6sKw/pub?output=csv", "cadastro": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTK16p-ZNfeKTPdymIJ2Ka9Fc2Lla-9g7Y5KQ27V1_7WbN7sxhRNO51zqYSmp20uw/pub?output=csv", "base": "https://docs.google.com/spreadsheets/d/e/2PACX-1vSRvIBwdJwyRrjDHog5KELnzJ9FRokw8xauLOaINEkupBSSYZQYFb-e_Pf5ueOt-Q/pub?output=csv"};
const OK = /(^|\.)(google\.com|googleusercontent\.com)$/i;
function normal(u: string) {
  let m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/) || u.match(/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([\w-]+)/);
  if (m) return `https://drive.usercontent.google.com/download?id=${m[1]}&export=download&confirm=t`;
  m = u.match(/docs\.google\.com\/spreadsheets\/d\/([\w-]{20,})\/(?:edit|view)[^#]*(?:#gid=(\d+))?/);
  if (m) return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv${m[2] ? "&gid=" + m[2] : ""}`;
  return u;
}
export default async (req: Request) => {
  const q = new URL(req.url).searchParams;
  const k = q.get("k") || "";
  let u = q.get("u") || "";
  if (u) { if (!(await verify(req))) return json({ erro: "não autorizado" }, 401); }
  else {
    const c: any = (await getStore({ name: "combos-config", consistency: "strong" }).get("config", { type: "json" })) || {};
    u = c.fontes?.[k] || DEF[k] || "";
    if (!u) return json({ erro: "fonte não configurada" }, 404);
  }
  u = normal(u);
  let host = "";
  try { host = new URL(u).hostname; } catch { return json({ erro: "link inválido" }, 400); }
  if (!OK.test(host)) return json({ erro: "só são aceitos links do Google (Planilhas/Drive)" }, 400);
  const r = await fetch(u, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 painel-combos" } });
  if (!r.ok) return json({ erro: `a planilha respondeu HTTP ${r.status}` }, 502);
  return new Response(r.body, { headers: { "content-type": r.headers.get("content-type") || "application/octet-stream", "cache-control": "no-store" } });
};
export const config: Config = { path: "/api/fonte" };
