const enc = new TextEncoder();
async function key() {
  const s = Netlify.env.get("ADMIN_SECRET") || "";
  return crypto.subtle.importKey("raw", enc.encode(s), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
const b64 = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export async function sign(user, hours = 12) {
  const payload = `${user}.${Date.now() + hours * 3600e3}`;
  const sig = await crypto.subtle.sign("HMAC", await key(), enc.encode(payload));
  return `${btoa(payload)}.${b64(sig)}`;
}
export async function verify(req) {
  const h = req.headers.get("authorization") || "";
  const t = h.replace(/^Bearer\s+/i, "");
  const [p, s] = t.split(".");
  if (!p || !s || !Netlify.env.get("ADMIN_SECRET")) return null;
  let payload = "";
  try { payload = atob(p); } catch { return null; }
  const sig = await crypto.subtle.sign("HMAC", await key(), enc.encode(payload));
  if (b64(sig) !== s) return null;
  const [user, exp] = payload.split(".");
  return Number(exp) > Date.now() ? user : null;
}
export function safeEq(a, b) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
export const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
