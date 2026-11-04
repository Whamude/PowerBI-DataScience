import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import english from "../src/i18n/en.mjs";
import {
  tr,
  locale,
  num,
  inputNumber,
  nutritionText,
  setCurrentLanguage,
  LANGUAGE_KEY,
} from "../src/i18n/core.mjs";
import { createTrial, checkTrial, TRIAL_DURATION } from "../src/auth/trial.mjs";

test("language changes translate app text and interpolate user text verbatim", () => {
  setCurrentLanguage("en");
  assert.equal(tr("Diário"), "Diary");
  assert.equal(
    tr("Editar {0}", { 0: "Mais equilíbrio" }),
    "Edit Mais equilíbrio",
  );
  assert.equal(tr(" g proteína · "), " g protein · ");
  assert.equal(
    tr("Calorias: informe um valor entre 800 e 6000."),
    "Calories: enter a value between 800 and 6,000.",
  );
  setCurrentLanguage("pt");
  assert.equal(tr("Diário"), "Diário");
  assert.equal(
    tr("Editar {0}", { 0: "Mais equilíbrio" }),
    "Editar Mais equilíbrio",
  );
});
test("dates, display numbers and numeric input follow the selected language", () => {
  setCurrentLanguage("pt");
  assert.equal(locale(), "pt-BR");
  assert.equal(num(1234.5), "1.234,5");
  assert.equal(inputNumber("1.234,5"), "1234.5");
  assert.equal(
    new Date(2026, 10, 4, 12).toLocaleDateString(locale()),
    "04/11/2026",
  );
  setCurrentLanguage("en");
  assert.equal(locale(), "en-US");
  assert.equal(num(1234.5), "1,234.5");
  assert.equal(inputNumber("1,234.5"), "1234.5");
  assert.equal(
    new Date(2026, 10, 4, 12).toLocaleDateString(locale()),
    "11/4/2026",
  );
  assert.equal(
    nutritionText(
      "VALOR NUTRICIONAL:\nCalorias: 1.823 calorias\nProteína: 72,5 g",
    ),
    "NUTRITION VALUE:\nCalories: 1,823 calories\nProtein: 72.5 g",
  );
});
test("switching language cannot reset the existing seven-day trial or change its namespace", () => {
  const start = Date.UTC(2026, 10, 4, 12),
    saved = createTrial("pessoa@example.com", start);
  const before = JSON.stringify(saved);
  for (const language of ["en", "pt", "en"]) {
    setCurrentLanguage(language);
    const active = checkTrial(saved, start + TRIAL_DURATION - 1);
    assert.equal(active.activation.issuedAt, start);
    assert.equal(active.activation.expiresAt, start + 168 * 3600000);
    assert.equal(
      active.activation.accountId,
      checkTrial(saved, start).activation.accountId,
    );
    assert.equal(checkTrial(saved, start + TRIAL_DURATION).activation, null);
  }
  assert.equal(JSON.stringify(saved), before);
  assert.equal(LANGUAGE_KEY, "nutria.language.v1");
});
test("all imported recipes have complete English names, ingredients and methods", () => {
  const recipes = JSON.parse(
    readFileSync(new URL("../src/data/imported-recipes.json", import.meta.url)),
  );
  const translations = JSON.parse(
    readFileSync(new URL("../src/i18n/recipes.en.json", import.meta.url)),
  );
  assert.equal(recipes.length, 97);
  assert.deepEqual(
    Object.keys(translations).sort(),
    recipes.map((r) => r.id).sort(),
  );
  for (const recipe of recipes) {
    const en = translations[recipe.id];
    assert.ok(en.name.trim(), recipe.id);
    assert.equal(
      en.ingredients.length,
      recipe.ingredients.length,
      recipe.id + " ingredients",
    );
    assert.equal(en.steps.length, recipe.steps.length, recipe.id + " steps");
    for (const value of [...en.ingredients, ...en.steps])
      assert.ok(value.trim(), recipe.id);
    if (recipe.notes.length)
      assert.equal(en.notes.length, recipe.notes.length, recipe.id + " notes");
  }
  assert.ok(translations["cafe-10"].notes[0].includes("21 scoops of protein"));
});
test("translation placeholders match their Portuguese source", () => {
  for (const [source, translation] of Object.entries(english)) {
    assert.ok(
      typeof translation === "string" && translation.length > 0,
      source,
    );
    const fields = (text) =>
      [...text.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort();
    assert.deepEqual(fields(translation), fields(source), source);
  }
});
