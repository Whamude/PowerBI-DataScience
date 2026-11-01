import { ed25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
export function toBase64Url(bytes) {
  let text = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i],
      b = bytes[i + 1],
      c = bytes[i + 2],
      n = (a << 16) | ((b || 0) << 8) | (c || 0);
    text += ALPHABET[(n >>> 18) & 63] + ALPHABET[(n >>> 12) & 63];
    if (i + 1 < bytes.length) text += ALPHABET[(n >>> 6) & 63];
    if (i + 2 < bytes.length) text += ALPHABET[n & 63];
  }
  return text;
}
export function fromBase64Url(text) {
  if (
    typeof text !== "string" ||
    !text.length ||
    !/^[A-Za-z0-9_-]+$/.test(text) ||
    text.length % 4 === 1
  )
    throw new Error("Codificação inválida.");
  let bits = 0,
    buffer = 0,
    out = [];
  for (const c of text) {
    buffer = (buffer << 6) | ALPHABET.indexOf(c);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >>> bits) & 255);
      buffer &= (1 << bits) - 1;
    }
  }
  const bytes = Uint8Array.from(out);
  if (toBase64Url(bytes) !== text) throw new Error("Codificação inválida.");
  return bytes;
}
export function asciiBytes(text) {
  if (typeof text !== "string" || /[^\x20-\x7e\n]/.test(text))
    throw new Error("Conteúdo inválido.");
  return Uint8Array.from(text, (c) => c.charCodeAt(0));
}
export function normalizeEmail(value) {
  if (typeof value !== "string") throw new Error("Informe um e-mail válido.");
  const email = value.trim().toLowerCase();
  const parts = email.split("@");
  if (
    email.length > 254 ||
    parts.length !== 2 ||
    parts[0].length > 64 ||
    !parts[0] ||
    parts[0].startsWith(".") ||
    parts[0].endsWith(".") ||
    parts[0].includes("..") ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
      email,
    )
  )
    throw new Error("Informe um e-mail válido.");
  return email;
}
export function keyId(publicKey) {
  const bytes = fromBase64Url(publicKey);
  if (bytes.length !== 32) throw new Error("Chave pública inválida.");
  return Array.from(sha256(bytes).slice(0, 8), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export function accountId(email) {
  return Array.from(sha256(asciiBytes(normalizeEmail(email))), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export function signingMessage(payload) {
  return asciiBytes("Nutria activation v1\n" + payload);
}
export function verifyActivation({ email, code, publicKey, now = Date.now() }) {
  const normalized = normalizeEmail(email);
  if (!publicKey)
    throw new Error(
      "A chave pública de ativação ainda não foi configurada neste aplicativo.",
    );
  let payload;
  try {
    if (typeof code !== "string" || code.length > 4096) throw new Error();
    const parts = code.replace(/\s/g, "").split(".");
    if (parts.length !== 3 || parts[0] !== "NTR1") throw new Error();
    const bytes = fromBase64Url(parts[1]),
      signature = fromBase64Url(parts[2]);
    if (bytes.length > 1500 || signature.length !== 64) throw new Error();
    const serialized = String.fromCharCode(...bytes);
    asciiBytes(serialized);
    const key = fromBase64Url(publicKey);
    if (
      key.length !== 32 ||
      !ed25519.verify(signature, signingMessage(serialized), key, {
        zip215: false,
      })
    )
      throw new Error();
    payload = JSON.parse(serialized);
    if (
      payload.v !== 1 ||
      payload.app !== "app.nutria.mobile" ||
      payload.kid !== keyId(publicKey) ||
      normalizeEmail(payload.email) !== payload.email ||
      !Number.isSafeInteger(payload.iat) ||
      payload.iat < 0 ||
      !/^[a-f0-9]{32}$/.test(payload.id) ||
      (payload.exp !== null &&
        (!Number.isSafeInteger(payload.exp) || payload.exp <= payload.iat))
    )
      throw new Error();
  } catch {
    throw new Error(
      "Código de ativação inválido ou não emitido para este Nutria.",
    );
  }
  if (payload.email !== normalized)
    throw new Error("Este código não corresponde ao e-mail informado.");
  if (payload.iat > now + 5 * 60000)
    throw new Error("Confira a data e a hora do aparelho antes de ativar.");
  if (payload.exp !== null && payload.exp <= now)
    throw new Error(
      "Este código expirou. Solicite um novo código ao administrador.",
    );
  return {
    email: normalized,
    accountId: accountId(normalized),
    licenseId: payload.id,
    expiresAt: payload.exp,
    issuedAt: payload.iat,
  };
}
