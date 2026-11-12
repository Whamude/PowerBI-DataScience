import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  recipeMatches,
  hasRecipeNutrition,
  recipeMeta,
} from "../src/domain/recipes.mjs";
const root = new URL("../", import.meta.url);
const imported = JSON.parse(
  readFileSync(new URL("src/data/imported-recipes.json", root)),
);
test("97 receitas dos dois PDFs têm imagens verificadas e referências completas", () => {
  assert.equal(imported.length, 97);
  assert.equal(new Set(imported.map((r) => r.id)).size, 97);
  assert.equal(imported.filter((r) => r.id.startsWith("cafe-")).length, 20);
  assert.equal(imported.filter((r) => r.id.startsWith("iridium-")).length, 77);
  const mapping = readFileSync(
    new URL("src/data/recipe-images.ts", root),
    "utf8",
  );
  for (const r of imported) {
    assert.ok(r.name && r.ingredients.length && r.steps.length);
    assert.ok(r.source.page > 0 && r.source.credit);
    assert.ok(
      ["CAFÉ DA MANHÃ.pdf", "77-receitas-fitness-iridium-labs.pdf"].includes(
        r.source.document,
      ),
    );
    const image = readFileSync(new URL("assets/recipes/" + r.imageFile, root));
    assert.equal(
      createHash("sha256").update(image).digest("hex"),
      r.imageSha256,
    );
    assert.ok(["ffd8", "8950"].includes(image.subarray(0, 2).toString("hex")));
    assert.ok(mapping.includes(`"${r.id}"`) && mapping.includes(r.imageFile));
  }
  assert.equal(readdirSync(new URL("assets/recipes/", root)).length, 97);
});
test("dados nutricionais dos PDFs são transcritos sem inventar valores por porção", () => {
  assert.equal(imported.filter((r) => r.sourceNutrition).length, 24);
  for (const r of imported) {
    assert.equal(hasRecipeNutrition(r), false);
    assert.equal(r.kcal, null);
    assert.ok(!recipeMeta(r).includes("0 kcal"));
  }
  assert.ok(
    imported.find((r) => r.id === "cafe-10").notes[0].includes("21 scoop"),
  );
  assert.equal(
    hasRecipeNutrition({ kcal: 100, protein: 2, carbs: 10, fat: 3 }),
    true,
  );
});
test("busca funciona sem acentos e por ingredientes; categorias incluem almoço e jantar", () => {
  assert.ok(imported.some((r) => recipeMatches(r, { query: "pao" })));
  const chicken = imported.find((r) => r.id === "iridium-59");
  assert.ok(recipeMatches(chicken, { category: "Almoço" }));
  assert.ok(recipeMatches(chicken, { category: "Jantar" }));
  assert.ok(recipeMatches(chicken, { query: "mostarda" }));
  assert.equal(recipeMatches(chicken, { category: "Café da manhã" }), false);
  assert.equal(recipeMatches(chicken, { filter: "Vegetarianas" }), false);
});
test("favoritos e origem filtram sem alterar registros existentes", () => {
  const r = imported[0];
  assert.equal(recipeMatches(r, { filter: "Favoritas", favorites: [] }), false);
  assert.equal(
    recipeMatches(r, { filter: "Favoritas", favorites: [r.id] }),
    true,
  );
  assert.equal(recipeMatches(r, { filter: "Dos PDFs" }), true);
  assert.equal(
    recipeMatches(
      { name: "Original", ingredients: [], category: "Almoço" },
      { filter: "Dos PDFs" },
    ),
    false,
  );
});

// A importação anterior confundia o fundo do PDF com a fotografia nestas páginas.
test("nenhuma receita reutiliza o fundo gráfico do PDF como fotografia", () => {
  const background = "e61f5273748d3d1856998fcf2289679d6ffbffc8e541dc9663641a2fca46f6d2";
  for (const r of imported) assert.notEqual(r.imageSha256, background, r.id);
  const corrected = imported.filter(r => ["iridium-22", "iridium-34", "iridium-64", "iridium-74"].includes(r.id));
  assert.equal(corrected.length, 4);
  assert.equal(new Set(corrected.map(r => r.imageSha256)).size, 4);
});
