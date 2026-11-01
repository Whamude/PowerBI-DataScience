export function totals(meals) {
  return meals.reduce(
    (sum, meal) => ({
      kcal: sum.kcal + meal.kcal,
      protein: sum.protein + meal.protein,
      carbs: sum.carbs + meal.carbs,
      fat: sum.fat + meal.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
export function parseMeal(name, kcal, protein, carbs, fat) {
  const values = [kcal, protein, carbs, fat].map((v) =>
    Number(String(v).replace(",", ".")),
  );
  if (
    !name.trim() ||
    values.some((v) => !Number.isFinite(v) || v < 0) ||
    values[0] <= 0 ||
    values[0] > 10000 ||
    values.slice(1).some((v) => v > 2000)
  )
    throw new Error("Preencha o nome e valores nutricionais válidos.");
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    name: name.trim(),
    kcal: values[0],
    protein: values[1],
    carbs: values[2],
    fat: values[3],
  };
}
