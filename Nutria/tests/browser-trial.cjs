const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const { createTrial, TRIAL_DURATION } = await import("../src/auth/trial.mjs");
  const lib = await import("../src/auth/license.mjs");
  const { initialData } = await import("../src/domain/model.mjs");
  const { ed25519 } = await import("@noble/curves/ed25519.js");
  const secret = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
  const pub = lib.toBase64Url(ed25519.getPublicKey(secret));
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:8082/recipe?id=bowl", {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    await page.getByLabel("E-mail de ativação").waitFor();
    const email = "trial@example.com",
      id = lib.accountId(email);
    const data = initialData();
    data.onboarded = true;
    data.profile.name = "Pessoa em teste";
    data.profile.water = 2345;
    await page.evaluate(
      ({ id, data }) =>
        localStorage.setItem(`nutria:account:${id}:v2`, JSON.stringify(data)),
      { id, data },
    );
    await page
      .getByRole("button", { name: "Começar ou retomar teste de 4 dias" })
      .click();
    await page.getByRole("alert").waitFor();
    await page.getByLabel("E-mail de ativação").fill(email);
    await page
      .getByRole("button", { name: "Começar ou retomar teste de 4 dias" })
      .click();
    await page.getByRole("tab", { name: /Perfil/ }).click();
    await page
      .getByText("Teste experimental de 4 dias", { exact: true })
      .waitFor();
    const original = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("nutria.trial.v1")),
    );
    await page
      .getByRole("button", { name: "Sair do teste / inserir código" })
      .click();
    await page.reload({ waitUntil: "networkidle" });
    await page.getByLabel("E-mail de ativação").fill("outra@example.com");
    await page
      .getByRole("button", { name: "Começar ou retomar teste de 4 dias" })
      .click();
    await page.getByText(/já está associado a outro e-mail/).waitFor();
    await page.getByLabel("E-mail de ativação").fill(email);
    await page
      .getByRole("button", { name: "Começar ou retomar teste de 4 dias" })
      .click();
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /Perfil/ }).click();
    await page
      .getByText("Teste experimental de 4 dias", { exact: true })
      .waitFor();
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("nutria.trial.v1")).startedAt,
      ),
      original.startedAt,
    );
    console.log(
      "PASS private link, email validation, start, sign-out, reload, same deadline and email isolation",
    );
    // Seed a near-expiry trial and exercise the real provider timer with browser time.
    const now = Date.now();
    const saved = {
      ...createTrial(email, now - TRIAL_DURATION + 60000),
      lastSeenAt: now,
    };
    await page.evaluate(
      (saved) => localStorage.setItem("nutria.trial.v1", JSON.stringify(saved)),
      saved,
    );
    await page.clock.install({ time: now });
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /Perfil/ }).waitFor();
    await page.clock.fastForward(90000);
    await page.getByLabel("E-mail de ativação").waitFor();
    await page.getByText(/Seu teste de 4 dias terminou/).waitFor();
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("nutria.trial.v1")).ended,
      ),
      true,
    );
    await page.getByLabel("E-mail de ativação").fill(email);
    await page
      .getByRole("button", { name: "Começar ou retomar teste de 4 dias" })
      .click();
    await page.getByText(/Seu teste de 4 dias terminou/).waitFor();
    const payload = JSON.stringify({
      v: 1,
      app: "app.nutria.mobile",
      kid: lib.keyId(pub),
      email,
      iat: now - 1000,
      exp: null,
      id: "a".repeat(32),
    });
    const code = `NTR1.${lib.toBase64Url(lib.asciiBytes(payload))}.${lib.toBase64Url(ed25519.sign(lib.signingMessage(payload), secret))}`;
    await page.getByLabel("Código de ativação").fill(code);
    await page.getByRole("button", { name: "Ativar e entrar" }).click();
    await page.getByRole("tab", { name: /Perfil/ }).click();
    await page.getByText("Ativação individual", { exact: true }).waitFor();
    const preserved = await page.evaluate(
      (id) => JSON.parse(localStorage.getItem(`nutria:account:${id}:v2`)),
      id,
    );
    assert.equal(preserved.profile.name, data.profile.name);
    assert.equal(preserved.profile.water, 2345);
    assert.deepEqual(errors, []);
    console.log(
      "PASS expiry while open, no trial reset, signed activation, preserved records and no browser errors",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
