const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("favicon"))
      errors.push(msg.text());
  });
  const state = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("nutria:state:v2")));
  await page.goto("http://localhost:8081", { waitUntil: "networkidle" });
  await page.getByLabel("Como podemos chamar você?").fill("Teste");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByText("Organizar a alimentação", { exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Vegetariano", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Peso atual (kg, opcional)").fill("80");
  await page.getByLabel("Meta de peso (kg, opcional)").fill("75");
  await page
    .getByRole("button", { name: "Começar minha jornada", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adicionar alimento em Almoço" })
    .waitFor();
  console.log("PASS onboarding");
  await page
    .getByRole("button", { name: "Adicionar alimento em Almoço" })
    .click();
  await page.getByLabel("Buscar alimento").fill("arroz");
  await page
    .getByRole("button", {
      name: "Selecionar Arroz integral cozido",
      exact: true,
    })
    .click();
  await page.getByLabel("Quantidade (g)").fill("150");
  await page
    .getByRole("button", { name: "Adicionar ao diário", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Editar Arroz integral cozido" })
    .waitFor();
  let d = await state();
  let today = Object.keys(d.days)[0];
  assert.equal(d.days[today].meals[0].kcal, 186);
  console.log("PASS food portions");
  await page
    .getByRole("button", { name: "Editar Arroz integral cozido" })
    .click();
  await page.getByLabel("Calorias (kcal)", { exact: true }).fill("200");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await page
    .getByRole("button", { name: "Editar Arroz integral cozido" })
    .waitFor();
  assert.equal((await state()).days[today].meals[0].kcal, 200);
  console.log("PASS edit meal");
  await page
    .getByRole("button", { name: "Adicionar 250 ml de água" })
    .click({ clickCount: 3, delay: 80 });
  await page.waitForTimeout(500);
  assert.equal((await state()).days[today].water, 750);
  await page.getByRole("button", { name: "Dia anterior", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Editar Arroz integral cozido" })
      .count(),
    0,
  );
  await page.getByRole("button", { name: "Dia seguinte", exact: true }).click();
  await page
    .getByRole("button", { name: "Editar Arroz integral cozido" })
    .waitFor();
  console.log("PASS day isolation and queued water");
  await page.reload({ waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "Editar Arroz integral cozido" })
    .waitFor();
  assert.equal((await state()).days[today].water, 750);
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/tmp/nutria-diary.png" });
  console.log("PASS persistence");
  await page.getByRole("tab", { name: /Evolução/ }).click();
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: /Registrar/ }).click();
  await page.getByLabel("Peso (kg)", { exact: true }).fill("79,5");
  await page.getByRole("button", { name: "Salvar peso" }).click();
  await page.waitForTimeout(350);
  assert.equal((await state()).weights.length, 1);
  assert.equal((await state()).weights[0].value, 79.5);
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/tmp/nutria-progress.png" });
  console.log("PASS weight upsert");
  await page.getByRole("tab", { name: /Receitas/ }).click();
  await page.getByRole("textbox", { name: "Buscar receita" }).fill("Bowl da horta");
  await page.getByRole("button", { name: "Ver receita: Bowl da horta" }).click();
  await page.getByRole("button", { name: "Favoritar receita" }).click();
  await page.getByRole("button", { name: "Aumentar porções" }).click();
  await page
    .getByRole("button", { name: "Adicionar ao diário", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Editar Bowl da horta (1.5 porções)" })
    .waitFor();
  d = await state();
  assert.equal(d.days[today].meals[1].kcal, 630);
  assert.ok(d.recipeFavorites.includes("bowl"));
  console.log("PASS recipe portions and favorites");
  await page.getByRole("tab", { name: /Planos/ }).click();
  await page.getByRole("button", { name: /VARIEDADE À MESA/ }).click();
  await page.getByRole("button", { name: "Usar esta inspiração" }).click();
  await page.getByRole("button", { name: "Ver lista de ingredientes" }).click();
  const checkbox = page.getByRole("checkbox").first();
  await checkbox.click();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  assert.equal((await state()).shopping.length, 1);
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/tmp/nutria-plans.png" });
  console.log("PASS plan and shopping");
  await page.getByRole("tab", { name: /Perfil/ }).click();
  await page.getByRole("button", { name: "Editar perfil →" }).click();
  await page.getByLabel("Meta de calorias (kcal)").fill("2200");
  await page
    .getByRole("button", { name: "Salvar minhas preferências" })
    .click();
  await page.waitForTimeout(350);
  assert.equal((await state()).profile.calories, 2200);
  console.log("PASS profile goals");
  await page.getByRole("tab", { name: /Receitas/ }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/tmp/nutria-recipes.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log("PASS no runtime errors, no horizontal overflow");
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
