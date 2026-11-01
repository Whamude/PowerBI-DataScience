const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  let c = await b.newContext({ viewport: { width: 360, height: 800 } });
  await c.addInitScript(() => {
    localStorage.setItem(
      "nutria:day:2026-10-9",
      JSON.stringify({
        water: 500,
        meals: [
          {
            id: "legacy",
            name: "Registro anterior",
            kcal: 400,
            protein: 25,
            carbs: 40,
            fat: 15,
          },
        ],
      }),
    );
  });
  let p = await c.newPage();
  await p.goto("http://localhost:8081", { waitUntil: "networkidle" });
  await p.getByLabel("Como podemos chamar você?").fill("Migração");
  for (let i = 0; i < 3; i++)
    await p.getByRole("button", { name: "Continuar", exact: true }).click();
  await p.getByRole("button", { name: "Começar minha jornada" }).click();
  await p
    .getByRole("button", { name: "Adicionar alimento em Almoço" })
    .waitFor();
  const d = await p.evaluate(() =>
    JSON.parse(localStorage.getItem("nutria:state:v2")),
  );
  assert.equal(d.days["2026-10-09"].meals[0].name, "Registro anterior");
  assert.equal(d.days["2026-10-09"].water, 500);
  assert.ok(
    await p.evaluate(() => localStorage.getItem("nutria:day:2026-10-9")),
  );
  console.log("PASS migration preserves v1 data and backup");
  await c.close();
  c = await b.newContext();
  await c.addInitScript(() =>
    localStorage.setItem("nutria:state:v2", "{invalid"),
  );
  p = await c.newPage();
  await p.goto("http://localhost:8081", { waitUntil: "networkidle" });
  await p.getByText(/Não foi possível ler os dados locais/).waitFor();
  assert.equal(
    await p.evaluate(() => localStorage.getItem("nutria:state:v2")),
    "{invalid",
  );
  console.log("PASS corrupted storage is not overwritten");
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
