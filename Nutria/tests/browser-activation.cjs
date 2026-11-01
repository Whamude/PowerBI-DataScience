const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const lib = await import("../src/auth/license.mjs");
  const { ed25519 } = await import(
    "/workspace/Nutria/node_modules/@noble/curves/ed25519.js"
  );
  const { initialData, dateKey } = await import(
    "/workspace/Nutria/src/domain/model.mjs"
  );
  const secret = Uint8Array.from({ length: 32 }, (_, i) => i + 1),
    pub = lib.toBase64Url(ed25519.getPublicKey(secret));
  const issue = (email, exp = Date.now() + 86400000) => {
    const p = {
        v: 1,
        app: "app.nutria.mobile",
        kid: lib.keyId(pub),
        email,
        iat: Date.now() - 1000,
        exp,
        id: "a".repeat(32),
      },
      raw = JSON.stringify(p);
    return (
      "NTR1." +
      lib.toBase64Url(lib.asciiBytes(raw)) +
      "." +
      lib.toBase64Url(ed25519.sign(lib.signingMessage(raw), secret))
    );
  };
  const alice = "alice@example.com",
    bob = "bob@example.com",
    aliceCode = issue(alice),
    bobCode = issue(bob);
  const previous = initialData();
  previous.onboarded = true;
  previous.profile.name = "Registros antigos";
  previous.days[dateKey()] = {
    meals: [
      {
        id: "old",
        name: "Refeição anterior",
        kcal: 300,
        protein: 20,
        carbs: 30,
        fat: 10,
        group: "Almoço",
      },
    ],
    water: 750,
    fruit: 0,
    vegetables: 0,
    activities: [],
  };
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await context.addInitScript((d) => {
    if (!localStorage.getItem("nutria:state:v2"))
      localStorage.setItem("nutria:state:v2", JSON.stringify(d));
  }, previous);
  const p = await context.newPage(),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://localhost:8082/recipe?id=bowl", {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await p.getByLabel("E-mail de ativação").waitFor();
  assert.equal(await p.getByText("Mãos à obra", { exact: true }).count(), 0);
  console.log("PASS private deep link requires activation");
  await p.getByLabel("E-mail de ativação").fill(bob);
  await p.getByLabel("Código de ativação").fill(aliceCode);
  await p.getByRole("button", { name: "Ativar e entrar" }).click();
  await p
    .getByText("Este código não corresponde ao e-mail informado.", {
      exact: true,
    })
    .waitFor();
  await p.getByLabel("E-mail de ativação").fill(alice);
  await p.getByLabel("Código de ativação").fill(issue(alice, Date.now() - 1));
  await p.getByRole("button", { name: "Ativar e entrar" }).click();
  await p.getByText(/Este código expirou/).waitFor();
  await p.getByLabel("Código de ativação").fill(aliceCode);
  await p.getByRole("button", { name: "Ativar e entrar" }).click();
  await p
    .getByRole("button", { name: "Associar meus registros a este e-mail" })
    .waitFor();
  assert.equal(
    await p.getByRole("button", { name: "Editar Refeição anterior" }).count(),
    0,
  );
  console.log(
    "PASS wrong email and expired code blocked; migration requires consent",
  );
  await p
    .getByRole("button", { name: "Associar meus registros a este e-mail" })
    .click();
  await p.getByRole("button", { name: "Editar Refeição anterior" }).waitFor();
  let state = await p.evaluate(
    (id) => JSON.parse(localStorage.getItem("nutria:account:" + id + ":v2")),
    lib.accountId(alice),
  );
  assert.equal(state.days[dateKey()].water, 750);
  assert.ok(await p.evaluate(() => localStorage.getItem("nutria:state:v2")));
  console.log("PASS migration keeps diary and original backup");
  await p.getByRole("tab", { name: /Receitas/ }).click();
  await p.getByText("105 receitas nesta seleção", { exact: true }).waitFor();
  await p.reload({ waitUntil: "networkidle" });
  await p.getByLabel("E-mail de ativação").waitFor();
  console.log(
    "PASS no browser token persistence; protected route locks after reload",
  );
  await p.getByLabel("E-mail de ativação").fill(alice);
  await p.getByLabel("Código de ativação").fill(aliceCode);
  await p.getByRole("button", { name: "Ativar e entrar" }).click();
  await p.getByRole("button", { name: "Editar Refeição anterior" }).waitFor();
  await p.getByRole("tab", { name: /Perfil/ }).click();
  await p.getByRole("button", { name: "Sair desta ativação" }).click();
  await p.getByLabel("E-mail de ativação").waitFor();
  console.log("PASS logout removes access and retains account data");
  await p.getByLabel("E-mail de ativação").fill(bob);
  await p.getByLabel("Código de ativação").fill(bobCode);
  await p.getByRole("button", { name: "Ativar e entrar" }).click();
  await p.getByLabel("Como podemos chamar você?").waitFor();
  assert.equal(
    await p
      .getByRole("button", { name: "Associar meus registros a este e-mail" })
      .count(),
    0,
  );
  await p.getByLabel("Como podemos chamar você?").fill("Bob");
  for (let i = 0; i < 3; i++)
    await p.getByRole("button", { name: "Continuar", exact: true }).click();
  await p.getByRole("button", { name: "Começar minha jornada" }).click();
  await p
    .getByRole("button", { name: "Adicionar alimento em Almoço" })
    .waitFor();
  assert.equal(
    await p.getByRole("button", { name: "Editar Refeição anterior" }).count(),
    0,
  );
  state = await p.evaluate(
    (id) => JSON.parse(localStorage.getItem("nutria:account:" + id + ":v2")),
    lib.accountId(bob),
  );
  assert.deepEqual(state.days, {});
  await p.getByRole("tab", { name: /Perfil/ }).click();
  await p.getByRole("button", { name: "Sair desta ativação" }).click();
  await p.getByLabel("E-mail de ativação").fill(alice);
  await p.getByLabel("Código de ativação").fill(aliceCode);
  await p.getByRole("button", { name: "Ativar e entrar" }).click();
  await p.getByRole("button", { name: "Editar Refeição anterior" }).waitFor();
  console.log(
    "PASS separate email accounts and renewal preserve their own data",
  );
  assert.deepEqual(errors, []);
  await browser.close();
  console.log("PASS activation mobile browser flows without runtime errors");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
