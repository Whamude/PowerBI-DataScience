const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const { accountId } = await import("../src/auth/license.mjs");
  const { createTrial, createGuestTrial, TRIAL_DURATION } = await import(
    "../src/auth/trial.mjs"
  );
  const { initialData } = await import("../src/domain/model.mjs");
  const browser = await chromium.launch({
    executablePath: process.env.NUTRIA_CHROMIUM_EXECUTABLE,
    args: ["--no-sandbox"],
  });
  const errors = [];
  async function fresh(seed = {}) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.addInitScript((seed) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem("nutria.language.v1", "pt");
        for (const [key, value] of Object.entries(seed))
          localStorage.setItem(key, value);
        sessionStorage.setItem("seeded", "1");
      }
    }, seed);
    const p = await context.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("http://localhost:8082/", {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    return p;
  }
  const savedAccounts = (p) =>
    p.evaluate(() =>
      Object.keys(localStorage).filter((k) => /^nutria:account:.*:v2$/.test(k)),
    );
  async function weightPrompt(p, value = "72,4") {
    await p.getByRole("tab", { name: "Evolução" }).click();
    await p.getByRole("button", { name: "Registrar →", exact: true }).click();
    await p.getByLabel("Peso (kg)", { exact: true }).fill(value);
    await p.getByRole("button", { name: "Salvar peso", exact: true }).click();
    await p
      .getByText("Sua evolução merece um lugar especial", { exact: true })
      .waitFor();
  }
  async function register(p, email) {
    await p
      .getByRole("button", { name: "Criar cadastro", exact: true })
      .click();
    await p.getByLabel("Seu nome", { exact: true }).fill("Ana");
    await p.getByLabel("E-mail do cadastro", { exact: true }).fill(email);
    await p
      .getByRole("button", { name: "Concluir cadastro", exact: true })
      .click();
  }
  try {
    const p = await fresh();
    await p.getByRole("tab", { name: "Receitas" }).waitFor();
    assert.equal(await p.getByLabel("E-mail de ativação").count(), 0);
    let trial = await p.evaluate(() =>
      JSON.parse(localStorage.getItem("nutria.trial.v1")),
    );
    const started = trial.startedAt;
    assert.equal(trial.email, null);
    await p.reload({ waitUntil: "networkidle" });
    assert.equal(
      await p.evaluate(
        () => JSON.parse(localStorage.getItem("nutria.trial.v1")).startedAt,
      ),
      started,
    );
    await p.getByRole("tab", { name: "Receitas" }).click();
    await p.getByRole("tab", { name: "Planos" }).click();
    assert.deepEqual(await savedAccounts(p), []);
    await weightPrompt(p);
    fs.mkdirSync(process.env.NUTRIA_EVIDENCE_DIR, { recursive: true });
    await p.screenshot({
      animations: "disabled",
      path: process.env.NUTRIA_EVIDENCE_DIR + "/aviso-cadastro-android.png",
    });
    await p.getByRole("button", { name: "Agora não", exact: true }).click();
    assert.deepEqual(await savedAccounts(p), []);
    assert.equal(await p.getByLabel("Peso (kg)").inputValue(), "72,4");
    await p.getByRole("button", { name: "Salvar peso", exact: true }).click();
    await p
      .getByRole("button", { name: "Criar cadastro", exact: true })
      .click();
    await p.getByLabel("Seu nome", { exact: true }).fill("Ana");
    await p.getByLabel("E-mail do cadastro", { exact: true }).fill("invalido");
    await p
      .getByRole("button", { name: "Concluir cadastro", exact: true })
      .click();
    await p.getByText("Informe um e-mail válido.", { exact: true }).waitFor();
    assert.deepEqual(await savedAccounts(p), []);
    await p
      .getByLabel("E-mail do cadastro", { exact: true })
      .fill("ana@example.com");
    await p
      .getByRole("button", { name: "Concluir cadastro", exact: true })
      .click();
    await p.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("nutria.trial.v1")).email ===
        "ana@example.com",
    );
    const id = accountId("ana@example.com");
    let data = await p.evaluate(
      (id) => JSON.parse(localStorage.getItem(`nutria:account:${id}:v2`)),
      id,
    );
    assert.equal(data.weights.at(-1).value, 72.4);
    trial = await p.evaluate(() =>
      JSON.parse(localStorage.getItem("nutria.trial.v1")),
    );
    assert.equal(trial.startedAt, started);
    assert.equal(trial.version, 1);
    await p.reload({ waitUntil: "networkidle" });
    await p.getByRole("tab", { name: "Evolução" }).click();
    await p.getByText("72,4 kg", { exact: true }).first().waitFor();
    console.log(
      "PASS entrada sem cadastro, navegação, cancelamento, e-mail inválido, cadastro e peso persistido; prazo original preservado",
    );

    const purchase = await fresh();
    await purchase.getByRole("tab", { name: "Perfil", exact: true }).click();
    await purchase
      .getByRole("button", { name: "Comprar ou ativar acesso", exact: true })
      .click();
    await purchase
      .getByText("Para comprar seu acesso, primeiro crie seu cadastro.", {
        exact: true,
      })
      .waitFor();
    await register(purchase, "compra@example.com");
    await purchase.getByLabel("Código de ativação", { exact: true }).waitFor();
    assert.equal(
      await purchase.getByLabel("E-mail de ativação").inputValue(),
      "compra@example.com",
    );
    console.log(
      "PASS compra solicita cadastro e segue para ativação sem checkout fictício",
    );

    const old = initialData();
    old.onboarded = true;
    old.profile.name = "Histórico anterior";
    old.days["2026-10-20"] = {
      meals: [],
      water: 500,
      fruit: 1,
      vegetables: 0,
      activities: [],
    };
    old.weights = [{ date: "2026-10-20", value: 75 }];
    const oldId = accountId("existente@example.com");
    const merge = await fresh({
      [`nutria:account:${oldId}:v2`]: JSON.stringify(old),
    });
    await weightPrompt(merge, "74");
    await register(merge, "existente@example.com");
    await merge.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("nutria.trial.v1")).email ===
        "existente@example.com",
    );
    data = await merge.evaluate(
      (id) => JSON.parse(localStorage.getItem(`nutria:account:${id}:v2`)),
      oldId,
    );
    assert.equal(data.profile.name, old.profile.name);
    assert.equal(data.days["2026-10-20"].water, 500);
    assert.equal(data.weights.length, 2);
    const existing = await fresh({
      "nutria.trial.v1": JSON.stringify(createTrial("existente@example.com")),
      [`nutria:account:${oldId}:v2`]: JSON.stringify(old),
    });
    await existing.getByRole("tab", { name: "Perfil", exact: true }).click();
    await existing
      .getByText("existente@example.com", { exact: true })
      .waitFor();
    assert.equal(
      await existing
        .getByText("Você está explorando como visitante.", { exact: true })
        .count(),
      0,
    );
    console.log("PASS usuários existentes e históricos anteriores preservados");

    const expired = await fresh({
      "nutria.trial.v1": JSON.stringify(
        createGuestTrial(Date.now() - TRIAL_DURATION - 1000),
      ),
    });
    await expired.getByLabel("E-mail de ativação").waitFor();
    await expired
      .getByRole("button", { name: "Continuar como visitante", exact: true })
      .click();
    assert.equal(
      await expired.getByRole("tab", { name: "Receitas" }).count(),
      0,
    );
    assert.equal(
      await expired.evaluate(
        () => JSON.parse(localStorage.getItem("nutria.trial.v1")).ended,
      ),
      true,
    );
    console.log("PASS visitante vencido não ganha novo teste");
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
