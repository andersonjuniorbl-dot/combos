import type { Config } from "@netlify/functions";
import { sign, safeEq, json } from "../lib/auth.mjs";
export default async (req: Request) => {
  if (req.method !== "POST") return json({ erro: "use POST" }, 405);
  let b: any = {};
  try { b = await req.json(); } catch {}
  const U = Netlify.env.get("ADMIN_USER") || "", P = Netlify.env.get("ADMIN_PASS") || "";
  if (!U || !P) return json({ erro: "administrador não configurado" }, 500);
  if (!safeEq(String(b.user || "").trim(), U) || !safeEq(String(b.pass || ""), P)) {
    await new Promise(r => setTimeout(r, 800));
    return json({ erro: "Usuário ou senha inválidos." }, 401);
  }
  return json({ token: await sign(U), user: U });
};
export const config: Config = { path: "/api/login" };
