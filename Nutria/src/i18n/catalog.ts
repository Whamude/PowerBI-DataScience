import { useMemo } from "react";
import {
  foods as originalFoods,
  recipes as originalRecipes,
  plans as originalPlans,
  Recipe,
} from "../data/catalog";
import importedEnglish from "./recipes.en.json";
import { tr, num, getLanguage, nutritionText } from "./core.mjs";
import { useLanguage } from "./LanguageProvider";

type RecipeTranslation = {
  name: string;
  ingredients: string[];
  steps: string[];
  notes?: string[];
  yieldLabel?: string;
  sourceNutrition?: string;
};
const translated = importedEnglish as Record<string, RecipeTranslation>;
export function useCatalog() {
  const { language } = useLanguage();
  return useMemo(
    () => ({
      foods: originalFoods.map((food) => ({
        ...food,
        name: tr(food.name),
        unit: tr(food.unit),
      })),
      recipes: originalRecipes.map((recipe): Recipe => {
        if (language === "pt") return recipe;
        const english = translated[recipe.id];
        return {
          ...recipe,
          name: english?.name ?? tr(recipe.name),
          subtitle: tr(recipe.subtitle),
          ingredients:
            english?.ingredients ?? recipe.ingredients.map((text) => tr(text)),
          steps: english?.steps ?? recipe.steps.map((text) => tr(text)),
          notes: english?.notes ?? recipe.notes?.map((text) => tr(text)),
          yieldLabel:
            english?.yieldLabel ??
            (recipe.yieldLabel ? tr(recipe.yieldLabel) : undefined),
          sourceNutrition:
            english?.sourceNutrition ??
            (recipe.sourceNutrition
              ? nutritionText(recipe.sourceNutrition)
              : undefined),
        };
      }),
      plans: originalPlans.map((plan) => ({
        ...plan,
        name: tr(plan.name),
        tag: tr(plan.tag),
        description: tr(plan.description),
      })),
    }),
    [language],
  );
}
// Legacy entries have no provenance: keep them verbatim rather than guessing
// whether an existing name came from the catalogue or was written by the user.
export function mealName(meal: {
  name: string;
  sourceFoodId?: string;
  sourceRecipeId?: string;
  sourceServings?: number;
  portionNote?: string;
}) {
  if (meal.sourceFoodId) {
    const food = originalFoods.find((item) => item.id === meal.sourceFoodId);
    if (food && food.name === meal.name) return tr(food.name);
  }
  if (meal.sourceRecipeId) {
    const recipe = originalRecipes.find(
      (item) => item.id === meal.sourceRecipeId,
    );
    if (recipe) {
      const name = translated[recipe.id]?.name;
      const title = getLanguage() === "en" && name ? name : tr(recipe.name);
      const prefix = recipe.name;
      // A manual edit clears these fields in FoodScreen. Also guard restored data.
      if (meal.name === prefix || meal.name.startsWith(prefix + " (")) {
        return (
          title +
          (meal.portionNote
            ? ` (${meal.portionNote})`
            : meal.sourceServings && meal.sourceServings !== 1
              ? tr(" ({0} porções)", { 0: num(meal.sourceServings) })
              : "")
        );
      }
    }
  }
  return meal.name;
}
