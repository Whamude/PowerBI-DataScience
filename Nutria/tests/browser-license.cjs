// Emissor descartável de testes. Nunca usar esta chave no APK de produção.
const EMAIL = "tester@example.com";
async function modules() {
  return {
    lib: await import("../src/auth/license.mjs"),
    ed: (await import("@noble/curves/ed25519.js")).ed25519,
  };
}
async function accountKey(email = EMAIL) {
  const { lib } = await modules();
  return "nutria:account:" + lib.accountId(email) + ":v2";
}
async function login(page, email = EMAIL) {
  await page.getByLabel("E-mail de ativação").waitFor();
  const { lib, ed } = await modules(),
    secret = Uint8Array.from({ length: 32 }, (_, i) => i + 1),
    publicKey = lib.toBase64Url(ed.getPublicKey(secret));
  const p = {
      v: 1,
      app: "app.nutria.mobile",
      kid: lib.keyId(publicKey),
      email,
      iat: Date.now() - 1000,
      exp: Date.now() + 86400000,
      id: "a".repeat(32),
    },
    raw = JSON.stringify(p),
    code =
      "NTR1." +
      lib.toBase64Url(lib.asciiBytes(raw)) +
      "." +
      lib.toBase64Url(ed.sign(lib.signingMessage(raw), secret));
  await page.getByLabel("E-mail de ativação").fill(email);
  await page.getByLabel("Código de ativação").fill(code);
  await page.getByRole("button", { name: "Ativar e entrar" }).click();
}
module.exports = { login, accountKey, EMAIL };
