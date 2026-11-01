import React from "react";
import { Image, View } from "react-native";
import type { Recipe } from "../data/catalog";
import { recipeImages } from "../data/recipe-images";
import { FoodArt } from "./components";
export function RecipePhoto({
  recipe,
  detail = false,
  compact = false,
}: {
  recipe: Recipe;
  detail?: boolean;
  compact?: boolean;
}) {
  const source = recipeImages[recipe.id];
  if (!source)
    return (
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          height: detail ? 230 : compact ? 120 : 145,
        }}
      >
        <FoodArt kind={recipe.kind} size={detail ? 220 : compact ? 120 : 140} />
      </View>
    );
  return (
    <Image
      source={source}
      accessibilityLabel={`Foto da receita ${recipe.name}`}
      resizeMode={detail ? "contain" : "cover"}
      style={
        compact
          ? { width: 120, height: 120, borderRadius: 18 }
          : { width: "100%", height: detail ? 320 : 160 }
      }
    />
  );
}
