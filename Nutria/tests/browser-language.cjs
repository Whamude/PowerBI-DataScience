const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { mkdirSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

(async () => {
  const lib = await import("../src/auth/license.mjs");
  const { initialData, dateKey } = await import("../src/domain/model.mjs");
  const { ed25519 } = await import("@noble/curves/ed25519.js");
  const dictionary = (await import("../src/i18n/en.mjs")).default;
  const email = "languages@example.com",
    account = lib.accountId(email),
    key = `nutria:account:${account}:v2`,
    today = dateKey();
  const data = initialData();
  data.days[today] = {
    meals: [
      {
        id: "user-meal",
        name: "Mais equilíbrio",
        kcal: 100,
        protein: 1,
        carbs: 5,
        fat: 2,
        group: "Almoço",
      },
    ],
    water: 750,
    fruit: 1,
    vegetables: 2,
    activities: [
      { id: "user-activity", name: "Caminhada", minutes: 20, kcal: 0 },
    ],
  };
  const legacy = JSON.stringify(initialData());
  const output =
    process.env.NUTRIA_TEST_ARTIFACTS || join(tmpdir(), "nutria-language");
  mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath:
      process.env.NUTRIA_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.addInitScript(
      ({ key, data, legacy }) => {
        if (!localStorage.getItem(key))
          localStorage.setItem(key, JSON.stringify(data));
        if (!localStorage.getItem("nutria:state:v2"))
          localStorage.setItem("nutria:state:v2", legacy);
      },
      { key, data, legacy },
    );
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.setDefaultTimeout(20000);
    const state = () =>
      page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
    const trial = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("nutria.trial.v1")));
    const tab = async (name) => {
      await page.getByRole("tab", { name: new RegExp(name) }).click();
    };
    async function auditEnglish() {
      let body = await page.locator("body").innerText();
      for (const own of [
        "Mais equilíbrio",
        "Perfil",
        "Caminhada",
        "Café da manhã",
      ])
        body = body.replaceAll(own, "");
      const leaked = Object.entries(dictionary)
        .filter(
          ([source, en]) =>
            source.length > 10 &&
            source !== en &&
            !source.includes("{") &&
            !source.includes("\n") &&
            body.includes(source),
        )
        .map(([source]) => source);
      assert.deepEqual(leaked, [], "Portuguese app text in English interface");
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "horizontal overflow",
      );
    }
    await page.goto(process.env.NUTRIA_TEST_URL || "http://localhost:8082", {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    await page.getByRole("radio", { name: "English", exact: true }).focus();
    await page
      .getByRole("radio", { name: "English", exact: true })
      .press("Space");
    await page.getByLabel("Activation email", { exact: true }).waitFor();
    await page.getByLabel("Activation email", { exact: true }).fill("invalid");
    await page
      .getByRole("button", { name: "Start or resume 7-day trial", exact: true })
      .click();
    await page.getByText("Enter a valid email.", { exact: true }).waitFor();
    await auditEnglish();
    await page.getByLabel("Activation email", { exact: true }).fill(email);
    await page
      .getByRole("button", { name: "Start or resume 7-day trial", exact: true })
      .click();
    await page.getByLabel("What should we call you?").fill("Perfil");
    for (let i = 0; i < 3; i++)
      await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByLabel("Current weight (kg, optional)", { exact: true })
      .fill("72.5");
    await page
      .getByRole("button", { name: "Start my journey", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Add food to Lunch", exact: true })
      .waitFor();
    const originalStart = (await trial()).startedAt;
    assert.equal((await trial()).ended, false);
    await auditEnglish();
    await page
      .getByRole("button", { name: "Add food to Lunch", exact: true })
      .click();
    await page.getByLabel("Search food", { exact: true }).fill("brown rice");
    await page
      .getByRole("button", { name: "Select Cooked brown rice", exact: true })
      .click();
    await page.getByLabel("Quantity (g)", { exact: true }).fill("150.5");
    await page
      .getByRole("button", { name: "Add to diary", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Edit Cooked brown rice", exact: true })
      .waitFor();
    assert.equal(
      (await state()).days[today].meals.find(
        (row) => row.sourceFoodId === "arroz",
      ).grams,
      150.5,
    );
    assert.equal((await state()).days[today].meals[0].name, "Mais equilíbrio");
    assert.equal((await state()).days[today].activities[0].name, "Caminhada");
    await tab("Progress");
    await page.getByText("72.5 kg", { exact: true }).first().waitFor();
    await auditEnglish();
    await tab("Profile");
    await page
      .getByRole("button", { name: "Edit profile →", exact: true })
      .click();
    await page.getByLabel("Water target (ml)", { exact: true }).fill("2,500");
    await page
      .getByRole("button", { name: "Save my preferences", exact: true })
      .click();
    assert.equal((await state()).profile.water, 2500);
    await page.getByText("2,500 ml", { exact: true }).waitFor();
    await auditEnglish();
    await page.screenshot({
      path: join(output, "profile-en.png"),
      fullPage: true,
    });
    const beforeLanguage = await state();
    await page.getByRole("radio", { name: "Português", exact: true }).click();
    await page.getByRole("tab", { name: /Diário/ }).waitFor();
    await page.getByText("2.500 ml", { exact: true }).waitFor();
    assert.deepEqual(await state(), beforeLanguage);
    assert.equal((await trial()).startedAt, originalStart);
    assert.equal(
      await page.evaluate(() => localStorage.getItem("nutria.language.v1")),
      "pt",
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("radio", { name: "Português", exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole("radio", { name: "Português", exact: true })
        .getAttribute("aria-checked"),
      "true",
    );
    await page.getByRole("radio", { name: "English", exact: true }).click();
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /Profile/ }).waitFor();
    assert.equal(
      await page
        .getByRole("radio", { name: "English", exact: true })
        .getAttribute("aria-checked"),
      "true",
    );
    assert.deepEqual(await state(), beforeLanguage);
    console.log(
      "PASS initial language choice, English validation/onboarding, number formats, stored language, verbatim user text and unchanged seven-day start",
    );
    await tab("Recipes");
    await page
      .getByLabel("Search recipes", { exact: true })
      .fill("cauliflower");
    await page
      .getByRole("button", {
        name: "View recipe: Cauliflower pie",
        exact: true,
      })
      .click();
    await page.getByText("500 g cauliflower", { exact: true }).waitFor();
    await page.getByText("Let's cook", { exact: true }).waitFor();
    await auditEnglish();
    await page.screenshot({
      path: join(output, "recipe-en.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await tab("Plans");
    await page
      .getByRole("button", { name: "View ingredient list", exact: true })
      .click();
    await page.getByRole("checkbox").first().click();
    const shopping = [...(await state()).shopping];
    assert.equal(shopping.length, 1);
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await tab("Profile");
    await page.getByRole("radio", { name: "Português", exact: true }).click();
    await tab("Planos");
    await page
      .getByRole("button", { name: "Ver lista de ingredientes", exact: true })
      .click();
    assert.equal(
      await page.getByRole("checkbox").first().getAttribute("aria-checked"),
      "true",
    );
    assert.deepEqual((await state()).shopping, shopping);
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    await tab("Perfil");
    await page.getByRole("radio", { name: "English", exact: true }).click();
    await tab("Recipes");
    await page
      .getByLabel("Search recipes", { exact: true })
      .fill("garden bowl");
    await page
      .getByRole("button", { name: "View recipe: Garden bowl", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Increase servings", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Add to diary", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Edit Garden bowl (1.5 servings)",
        exact: true,
      })
      .waitFor();
    await tab("Profile");
    await page.getByRole("radio", { name: "Português", exact: true }).click();
    await tab("Diário");
    await page
      .getByRole("button", {
        name: "Editar Bowl da horta (1,5 porções)",
        exact: true,
      })
      .waitFor();
    await page
      .getByRole("button", {
        name: "Editar Arroz integral cozido",
        exact: true,
      })
      .waitFor();
    await page
      .getByRole("button", { name: "Editar Mais equilíbrio", exact: true })
      .waitFor();
    await page.screenshot({
      path: join(output, "diary-pt.png"),
      fullPage: true,
    });
    console.log(
      "PASS all five tabs, translated recipe ingredients/methods, stable checklist keys and locale-aware catalogue/recipe records",
    );
    await tab("Perfil");
    await page.getByRole("radio", { name: "English", exact: true }).click();
    await page
      .getByRole("button", { name: "Leave trial / enter code", exact: true })
      .click();
    await page.getByLabel("Activation email", { exact: true }).fill(email);
    await page.getByLabel("Activation code", { exact: true }).fill("invalid");
    await page
      .getByRole("button", { name: "Activate and sign in", exact: true })
      .click();
    await page
      .getByText(
        "Invalid activation code or code not issued for this Nutria app.",
        { exact: true },
      )
      .waitFor();
    const secret = Uint8Array.from({ length: 32 }, (_, i) => i + 1),
      pub = lib.toBase64Url(ed25519.getPublicKey(secret));
    const now = Date.now(),
      payload = JSON.stringify({
        v: 1,
        app: "app.nutria.mobile",
        kid: lib.keyId(pub),
        email,
        iat: now - 1000,
        exp: now + 86400000,
        id: "a".repeat(32),
      });
    const code = `NTR1.${lib.toBase64Url(lib.asciiBytes(payload))}.${lib.toBase64Url(ed25519.sign(lib.signingMessage(payload), secret))}`;
    await page.getByLabel("Activation code", { exact: true }).fill(code);
    const beforeActivation = await state();
    await page
      .getByRole("button", { name: "Activate and sign in", exact: true })
      .click();
    await page.getByRole("tab", { name: /Diary/ }).waitFor();
    assert.deepEqual(await state(), beforeActivation);
    assert.equal((await trial()).startedAt, originalStart);
    assert.equal((await trial()).ended, true);
    assert.equal(
      await page.evaluate(() => localStorage.getItem("nutria:state:v2")),
      legacy,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS English invalid-code message, compatible signed activation, original records/backup and trial start preserved; no browser errors",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
