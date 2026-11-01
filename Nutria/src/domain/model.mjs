export const GROUPS = ["Café da manhã", "Almoço", "Jantar", "Lanche"];
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function shiftDate(key, delta) {
  const [y, m, d] = key.split("-").map(Number);
  return dateKey(new Date(y, m - 1, d + delta, 12));
}
export const emptyDay = () => ({
  meals: [],
  water: 0,
  fruit: 0,
  vegetables: 0,
  activities: [],
});
export const initialData = () => ({
  version: 2,
  onboarded: false,
  profile: {
    name: "",
    goal: "Mais equilíbrio",
    style: "Sem restrições",
    calories: 2000,
    protein: 100,
    carbs: 250,
    fat: 67,
    water: 2000,
    targetWeight: 0,
  },
  days: {},
  weights: [],
  favorites: [],
  recipeFavorites: [],
  plan: "equilibrio",
  shopping: [],
});
export function numberValue(value, min, max, label) {
  const n = Number(String(value).trim().replace(",", "."));
  if (String(value).trim() === "" || !Number.isFinite(n) || n < min || n > max)
    throw new Error(`${label}: informe um valor entre ${min} e ${max}.`);
  return n;
}
export function scaleFood(food, grams) {
  const g = numberValue(grams, 1, 3000, "Quantidade em gramas");
  return {
    name: food.name,
    kcal: Math.round((food.kcal * g) / 100),
    protein: +((food.protein * g) / 100).toFixed(1),
    carbs: +((food.carbs * g) / 100).toFixed(1),
    fat: +((food.fat * g) / 100).toFixed(1),
    grams: g,
  };
}
export function weeklyStats(days, end) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = shiftDate(end, i - 6);
    const d = days[date] || emptyDay();
    return {
      date,
      kcal: d.meals.reduce((n, m) => n + m.kcal, 0),
      water: d.water,
      meals: d.meals.length,
      minutes: d.activities.reduce((n, a) => n + a.minutes, 0),
    };
  });
}
export function streaks(days, today) {
  const active = Object.keys(days)
    .filter((k) => days[k].meals.length > 0)
    .sort();
  let best = 0,
    run = 0,
    prev = "";
  for (const k of active) {
    run = prev && shiftDate(prev, 1) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  let cursor = days[today]?.meals.length ? today : shiftDate(today, -1),
    current = 0;
  while (days[cursor]?.meals.length) {
    current++;
    cursor = shiftDate(cursor, -1);
  }
  return { current, best };
}
export function migrateLegacy(entries) {
  const data = initialData();
  for (const [key, raw] of entries) {
    if (!raw) continue;
    const match = key.match(/^nutria:day:(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) continue;
    const old = JSON.parse(raw);
    if (
      !Array.isArray(old.meals) ||
      !Number.isFinite(old.water) ||
      old.water < 0
    )
      throw new Error("Registro anterior inválido.");
    const date = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
    data.days[date] = {
      ...emptyDay(),
      water: old.water,
      meals: old.meals.map((m) => ({ ...m, group: m.group || "Almoço" })),
    };
  }
  return data;
}
export function validateData(d) {
  if (
    d?.version !== 2 ||
    !d.profile ||
    !d.days ||
    !Array.isArray(d.weights) ||
    !Array.isArray(d.favorites) ||
    !Array.isArray(d.recipeFavorites) ||
    !Array.isArray(d.shopping)
  )
    throw new Error("Dados locais incompatíveis.");
  for (const day of Object.values(d.days)) {
    if (
      !Array.isArray(day.meals) ||
      !Array.isArray(day.activities) ||
      !Number.isFinite(day.water)
    )
      throw new Error("Diário inválido.");
  }
  return d;
}
export function uniqueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
