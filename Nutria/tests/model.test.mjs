import test from "node:test";
import assert from "node:assert/strict";
import {
  dateKey,
  shiftDate,
  scaleFood,
  weeklyStats,
  streaks,
  migrateLegacy,
  emptyDay,
  validateData,
  initialData,
  numberValue,
} from "../src/domain/model.mjs";
test("datas locais preservam viradas de mês e ano", () => {
  assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDate("2024-03-01", -1), "2024-02-29");
  assert.equal(dateKey(new Date(2026, 10, 1, 0, 1)), "2026-11-01");
});
test("porções escalam nutrientes e rejeitam quantidades inválidas", () => {
  assert.deepEqual(
    scaleFood(
      { name: "Arroz", kcal: 124, protein: 2.6, carbs: 25.8, fat: 1 },
      "150",
    ),
    {
      name: "Arroz",
      kcal: 186,
      protein: 3.9,
      carbs: 38.7,
      fat: 1.5,
      grams: 150,
    },
  );
  for (const g of ["0", "-1", "abc", "3001"])
    assert.throws(() => scaleFood({ name: "X" }, g));
});
test("migração preserva registros da primeira versão e normaliza suas datas", () => {
  const old = {
    water: 750,
    meals: [
      { id: "old", name: "Almoço", kcal: 500, protein: 30, carbs: 50, fat: 20 },
    ],
  };
  const d = migrateLegacy([["nutria:day:2026-10-9", JSON.stringify(old)]]);
  assert.equal(d.days["2026-10-09"].water, 750);
  assert.deepEqual(d.days["2026-10-09"].meals, [
    { ...old.meals[0], group: "Almoço" },
  ]);
  assert.equal(d.onboarded, false);
  assert.throws(() => migrateLegacy([["nutria:day:2026-10-9", "{invalid"]]));
});
test("semana conta dias vazios sem inventar consumo e inclui o dia final", () => {
  const days = {
    "2026-11-01": {
      ...emptyDay(),
      meals: [{ kcal: 420 }],
      water: 750,
      activities: [{ minutes: 30 }],
    },
  };
  const stats = weeklyStats(days, "2026-11-01");
  assert.equal(stats.length, 7);
  assert.equal(stats[0].date, "2026-10-26");
  assert.equal(stats[0].kcal, 0);
  assert.equal(stats[6].kcal, 420);
  assert.equal(stats[6].minutes, 30);
});
test("sequências interrompidas não geram progresso fictício", () => {
  const meal = { meals: [{ kcal: 100 }] };
  const days = {
    "2026-10-28": meal,
    "2026-10-29": meal,
    "2026-10-31": meal,
    "2026-11-01": emptyDay(),
  };
  assert.deepEqual(streaks(days, "2026-11-01"), { current: 1, best: 2 });
  assert.deepEqual(streaks(days, "2026-11-03"), { current: 0, best: 2 });
});
test("entradas vazias e arquivos de estado incompatíveis são rejeitados", () => {
  for (const v of ["", " ", "Infinity", "-1"])
    assert.throws(() => numberValue(v, 1, 100, "Valor"));
  assert.equal(numberValue("72,5", 20, 500, "Peso"), 72.5);
  assert.throws(() => validateData({ version: 99 }));
  assert.equal(validateData(initialData()).version, 2);
});
