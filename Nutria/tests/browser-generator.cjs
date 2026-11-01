const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("fs");
(async () => {
  const http = require("node:http");
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      fs.readFileSync(
        require("node:path").resolve(
          __dirname,
          "../tools/gerador-ativacao.html",
        ),
      ),
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = "http://127.0.0.1:" + server.address().port;
  const { verifyActivation } = await import(
    "/workspace/Nutria/src/auth/license.mjs"
  );
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    acceptDownloads: true,
    viewport: { width: 1180, height: 900 },
  });
  const errors = [],
    requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/^https?:/.test(r.url()) && r.url() !== url + "/")
      requests.push(r.url());
  });
  await page.goto(url);
  await page.locator("#new-password").fill("SomenteTeste!2026-Chave");
  await page.locator("#confirm-password").fill("SomenteTeste!2026-Chave");
  await page.locator("#create").click();
  await page.locator("#key-state").waitFor();
  const config = JSON.parse(await page.locator("#public-config").inputValue());
  assert.equal(config.publicKey.length, 43);
  const downloaded = page.waitForEvent("download");
  await page.locator("#download-private").click();
  const download = await downloaded;
  await download.saveAs("/tmp/nutria-test-issuer.issuer.json");
  const bundle = JSON.parse(
    fs.readFileSync("/tmp/nutria-test-issuer.issuer.json", "utf8"),
  );
  assert.equal(bundle.format, "nutria-issuer-v1");
  assert.ok(bundle.encryptedPrivateKey && !bundle.privateKey);
  await page.locator("#backup-confirmed").check();
  await page.locator("#email").fill("Pessoa@Example.com");
  await page.locator("#validity").selectOption("30");
  await page.locator("#generate").click();
  const code = await page.locator("#code").inputValue();
  assert.equal(
    verifyActivation({
      email: "pessoa@example.com",
      code,
      publicKey: config.publicKey,
    }).email,
    "pessoa@example.com",
  );
  await page.screenshot({ path: "/tmp/nutria-generator.png", fullPage: true });
  await page.locator("#lock").click();
  assert.equal(await page.locator("#generate").isDisabled(), true);
  await page
    .locator("#key-file")
    .setInputFiles("/tmp/nutria-test-issuer.issuer.json");
  await page.locator("#unlock-password").fill("senha-errada");
  await page.locator("#unlock").click();
  await page.getByText(/Não foi possível abrir a chave/).waitFor();
  assert.equal(await page.locator("#generate").isDisabled(), true);
  await page.locator("#unlock-password").fill("SomenteTeste!2026-Chave");
  await page.locator("#unlock").click();
  await page.getByText(/Gerador desbloqueado\. Você/).waitFor();
  await page.locator("#email").fill("outro@example.com");
  await page.locator("#validity").selectOption("none");
  await page.locator("#generate").click();
  const next = await page.locator("#code").inputValue();
  const result = verifyActivation({
    email: "outro@example.com",
    code: next,
    publicKey: config.publicKey,
  });
  assert.equal(result.expiresAt, null);
  assert.throws(() =>
    verifyActivation({
      email: "pessoa@example.com",
      code: next,
      publicKey: config.publicKey,
    }),
  );
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  console.log(
    "PASS generator: key creation, encrypted backup, wrong password, unlock, email binding, expiry, offline and client verification",
  );
  await browser.close();
  server.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
