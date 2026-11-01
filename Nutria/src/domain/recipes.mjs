export function normalizeSearch(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}
/** @param {any} recipe @param {{category?:string,filter?:string,query?:string,favorites?:string[]}} [options] */
export function recipeMatches(
  recipe,
  { category = "Todas", filter = "Todas", query = "", favorites = [] } = {},
) {
  return (
    (category === "Todas" ||
      (recipe.categories || [recipe.category]).includes(category)) &&
    (filter !== "Favoritas" || favorites.includes(recipe.id)) &&
    (filter !== "Vegetarianas" || recipe.vegetarian === true) &&
    (filter !== "Veganas" || recipe.vegan === true) &&
    (filter !== "Dos PDFs" || !!recipe.source) &&
    normalizeSearch([recipe.name, ...recipe.ingredients].join(" ")).includes(
      normalizeSearch(query),
    )
  );
}
export function hasRecipeNutrition(recipe) {
  return ["kcal", "protein", "carbs", "fat"].every(
    (k) => typeof recipe[k] === "number" && Number.isFinite(recipe[k]),
  );
}
export function recipeMeta(recipe) {
  return [
    recipe.kcal === null ? "Nutrição: ver detalhes" : `${recipe.kcal} kcal`,
    recipe.minutes === null ? null : `${recipe.minutes} min`,
  ]
    .filter(Boolean)
    .join(" · ");
}
