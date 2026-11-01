import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto, randomBytes } from "node:crypto";
import { ed25519 } from "@noble/curves/ed25519.js";
import { readFileSync } from "node:fs";
import {
  toBase64Url,
  fromBase64Url,
  asciiBytes,
  keyId,
  normalizeEmail,
  accountId,
  signingMessage,
  verifyActivation,
} from "../src/auth/license.mjs";
const secret = Uint8Array.from({ length: 32 }, (_, i) => i + 1),
  pub = toBase64Url(ed25519.getPublicKey(secret));
const now = Date.UTC(2026, 10, 1, 12);
const payload = (overrides = {}) => ({
  v: 1,
  app: "app.nutria.mobile",
  kid: keyId(pub),
  email: "pessoa@example.com",
  iat: now - 60000,
  exp: now + 86400000,
  id: "a".repeat(32),
  ...overrides,
});
const sign = (p, secretKey = secret) => {
  const s = JSON.stringify(p);
  return (
    "NTR1." +
    toBase64Url(asciiBytes(s)) +
    "." +
    toBase64Url(ed25519.sign(signingMessage(s), secretKey))
  );
};
test("assinatura válida vincula um e-mail normalizado e mantém a mesma conta em renovações", () => {
  const a = verifyActivation({
    email: " PESSOA@EXAMPLE.COM ",
    code: sign(payload()),
    publicKey: pub,
    now,
  });
  assert.equal(a.email, "pessoa@example.com");
  const b = verifyActivation({
    email: a.email,
    code: sign(payload({ id: "b".repeat(32) })),
    publicKey: pub,
    now,
  });
  assert.equal(a.accountId, b.accountId);
  assert.notEqual(a.licenseId, b.licenseId);
  assert.notEqual(a.accountId, accountId("outra@example.com"));
});
test("email diferente, código alterado, outro emissor, prazo vencido e relógio anterior são rejeitados", () => {
  assert.throws(
    () =>
      verifyActivation({
        email: "outra@example.com",
        code: sign(payload()),
        publicKey: pub,
        now,
      }),
    /e-mail/,
  );
  const p = payload({ email: "fraude@example.com" });
  const good = sign(payload()).split(".");
  const forged =
    "NTR1." + toBase64Url(asciiBytes(JSON.stringify(p))) + "." + good[2];
  assert.throws(
    () =>
      verifyActivation({ email: p.email, code: forged, publicKey: pub, now }),
    /inválido/,
  );
  const other = toBase64Url(ed25519.getPublicKey(new Uint8Array(32).fill(9)));
  assert.throws(
    () =>
      verifyActivation({
        email: "pessoa@example.com",
        code: sign(payload()),
        publicKey: other,
        now,
      }),
    /inválido/,
  );
  assert.throws(
    () =>
      verifyActivation({
        email: "pessoa@example.com",
        code: sign(payload({ exp: now - 1 })),
        publicKey: pub,
        now,
      }),
    /expirou/,
  );
  assert.throws(
    () =>
      verifyActivation({
        email: "pessoa@example.com",
        code: sign(payload({ iat: now + 3600000, exp: null })),
        publicKey: pub,
        now,
      }),
    /data e a hora/,
  );
});
test("sem chave pública não há ativação; códigos inválidos não liberam o aplicativo", () => {
  assert.throws(
    () =>
      verifyActivation({
        email: "pessoa@example.com",
        code: sign(payload()),
        publicKey: "",
        now,
      }),
    /não foi configurada/,
  );
  for (const code of [
    "",
    "NTR1.abc.abc",
    "x".repeat(5000),
    "NTR2." + sign(payload()).slice(5),
  ])
    assert.throws(() =>
      verifyActivation({
        email: "pessoa@example.com",
        code,
        publicKey: pub,
        now,
      }),
    );
  for (const email of [
    "abc",
    "a..b@example.com",
    "a@localhost",
    "á@example.com",
  ])
    assert.throws(() => normalizeEmail(email));
});
test("códigos Web Crypto do gerador são interoperáveis com o verificador do APK", async () => {
  const keys = await webcrypto.subtle.generateKey({ name: "Ed25519" }, true, [
    "sign",
    "verify",
  ]);
  const publicKey = toBase64Url(
    new Uint8Array(await webcrypto.subtle.exportKey("raw", keys.publicKey)),
  );
  const p = payload({ kid: keyId(publicKey), exp: null }),
    raw = JSON.stringify(p);
  const signature = new Uint8Array(
    await webcrypto.subtle.sign(
      "Ed25519",
      keys.privateKey,
      signingMessage(raw),
    ),
  );
  const code =
    "NTR1." + toBase64Url(asciiBytes(raw)) + "." + toBase64Url(signature);
  assert.equal(
    verifyActivation({ email: p.email, code, publicKey, now }).expiresAt,
    null,
  );
});
test("base64url preserva bytes e rejeita formas não canônicas", () => {
  for (let n = 1; n < 100; n++) {
    const bytes = randomBytes(n);
    assert.deepEqual(Buffer.from(fromBase64Url(toBase64Url(bytes))), bytes);
  }
  for (const text of ["=", "a", "ab+", "ab/", "YQ=="])
    assert.throws(() => fromBase64Url(text));
});
test("configuração de distribuição permanece sem chave privada ou chave de teste", () => {
  const config = JSON.parse(
    readFileSync(
      new URL("../src/auth/activation-config.json", import.meta.url),
    ),
  );
  assert.deepEqual(Object.keys(config).sort(), [
    "issuer",
    "keyId",
    "publicKey",
  ]);
  assert.notEqual(config.publicKey, pub);
});
