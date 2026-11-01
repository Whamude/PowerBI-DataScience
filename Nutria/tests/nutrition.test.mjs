import test from "node:test";
import assert from "node:assert/strict";
import { parseMeal, totals } from "../src/domain/nutrition.mjs";
test("registro aceita vírgula decimal e soma nutrientes de múltiplas refeições", () => {
  const a = parseMeal("Almoço", "450", "25,5", "50", "15");
  const b = parseMeal("Lanche", "200", "10", "20", "8");
  assert.deepEqual(totals([a, b]), {
    kcal: 650,
    protein: 35.5,
    carbs: 70,
    fat: 23,
  });
});
test("valores inválidos não entram no diário", () => {
  for (const [name, kcal, p, c, f] of [
    ["", "100", "0", "0", "0"],
    ["X", "-1", "0", "0", "0"],
    ["X", "abc", "0", "0", "0"],
    ["X", "200", "-2", "0", "0"],
    ["X", "Infinity", "0", "0", "0"],
  ])
    assert.throws(() => parseMeal(name, kcal, p, c, f));
});
test("diário vazio inicia sem nutrientes", () =>
  assert.deepEqual(totals([]), { kcal: 0, protein: 0, carbs: 0, fat: 0 }));
