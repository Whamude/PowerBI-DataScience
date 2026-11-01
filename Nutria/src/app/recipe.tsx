import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { recipes } from "../data/catalog";
import { useStore } from "../state/store";
import { emptyDay, GROUPS, uniqueId, numberValue } from "../domain/model.mjs";
import { hasRecipeNutrition } from "../domain/recipes.mjs";
import { C, s } from "../ui/theme";
import { Page, Icon, Button, Chip, Section, Field } from "../ui/components";
import { RecipePhoto } from "../ui/RecipePhoto";
export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = recipes.find((r) => r.id === id);
  const { data, selected, mutate } = useStore();
  const [group, setGroup] = useState(
      r && GROUPS.includes(r.category) ? r.category : "Lanche",
    ),
    [servings, setServings] = useState(1),
    [busy, setBusy] = useState(false),
    [manual, setManual] = useState(false),
    [values, setValues] = useState(["", "", "", "", ""]),
    [error, setError] = useState("");
  if (!r)
    return (
      <Page title="Receita" back>
        <Text style={s.body}>Receita não encontrada.</Text>
      </Page>
    );
  const favorite = data.recipeFavorites.includes(r.id),
    known = hasRecipeNutrition(r);
  async function add() {
    if (!r) return;
    try {
      let entry;
      if (known)
        entry = {
          name: `${r.name}${servings !== 1 ? ` (${servings} porções)` : ""}`,
          kcal: Math.round(r.kcal! * servings),
          protein: +(r.protein! * servings).toFixed(1),
          carbs: +(r.carbs! * servings).toFixed(1),
          fat: +(r.fat! * servings).toFixed(1),
        };
      else {
        if (!values[0].trim())
          throw new Error("Descreva a porção que você consumiu.");
        entry = {
          name: `${r.name} (${values[0].trim()})`,
          kcal: numberValue(values[1], 1, 10000, "Calorias da porção"),
          protein: numberValue(values[2], 0, 2000, "Proteínas da porção"),
          carbs: numberValue(values[3], 0, 2000, "Carboidratos da porção"),
          fat: numberValue(values[4], 0, 2000, "Gorduras da porção"),
        };
      }
      setBusy(true);
      const ok = await mutate((d) => {
        const day = d.days[selected] || emptyDay();
        return {
          ...d,
          days: {
            ...d.days,
            [selected]: {
              ...day,
              meals: [...day.meals, { ...entry, id: uniqueId(), group }],
            },
          },
        };
      });
      if (ok) router.replace("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="Na sua cozinha" back>
      <View
        style={[
          s.card,
          { backgroundColor: "#E6ECD9", padding: 15, overflow: "hidden" },
        ]}
      >
        <View style={s.between}>
          <Text style={s.eyebrow}>{r.category.toUpperCase()}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              favorite ? "Remover receita dos favoritos" : "Favoritar receita"
            }
            onPress={() =>
              void mutate((d) => ({
                ...d,
                recipeFavorites: d.recipeFavorites.includes(r.id)
                  ? d.recipeFavorites.filter((x) => x !== r.id)
                  : [...d.recipeFavorites, r.id],
              }))
            }
            style={s.iconButton}
          >
            <Icon name="heart" color={favorite ? "#B56860" : C.green} />
          </Pressable>
        </View>
        <RecipePhoto recipe={r} detail />
        {r.source && (
          <Text style={[s.footer, { textAlign: "center" }]}>
            Imagem extraída do PDF · ilustração da receita
          </Text>
        )}
      </View>
      <Text style={s.title}>{r.name}</Text>
      <Text style={s.body}>{r.subtitle}</Text>
      <View style={[s.row, { flexWrap: "wrap" }]}>
        {r.minutes !== null && (
          <View style={[s.chip, s.row, { gap: 7 }]}>
            <Icon name="clock" size={15} />
            <Text style={s.small}>{r.minutes} min</Text>
          </View>
        )}
        {(r.vegetarian !== null || r.vegan !== null) && (
          <View style={[s.chip, s.row, { gap: 7 }]}>
            <Icon name="feather" size={15} />
            <Text style={s.small}>
              {r.vegan
                ? "Vegana"
                : r.vegetarian
                  ? "Vegetariana"
                  : "Tradicional"}
            </Text>
          </View>
        )}
      </View>
      {r.notes?.map((note) => (
        <Text key={note} accessibilityRole="alert" style={s.error}>
          {note}
        </Text>
      ))}
      {known ? (
        <View style={s.card}>
          <View style={s.between}>
            <Text style={s.h3}>Porções</Text>
            <View style={s.row}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Diminuir porções"
                style={s.iconButton}
                onPress={() => setServings(Math.max(0.5, servings - 0.5))}
              >
                <Icon name="minus" size={16} />
              </Pressable>
              <Text style={s.h3}>{servings}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Aumentar porções"
                style={s.iconButton}
                onPress={() => setServings(Math.min(10, servings + 0.5))}
              >
                <Icon name="plus" size={16} />
              </Pressable>
            </View>
          </View>
          <Text style={s.metric}>
            {Math.round(r.kcal! * servings)} <Text style={s.small}>kcal</Text>
          </Text>
          <Text style={s.small}>
            {(r.protein! * servings).toFixed(1)} g proteínas ·{" "}
            {(r.carbs! * servings).toFixed(1)} g carboidratos ·{" "}
            {(r.fat! * servings).toFixed(1)} g gorduras
          </Text>
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.h3}>
            {r.sourceNutrition
              ? "Informação nutricional da fonte"
              : "Nutrição não informada no PDF"}
          </Text>
          {r.sourceNutrition && <Text style={s.body}>{r.sourceNutrition}</Text>}
          <Text style={s.small}>
            {r.sourceNutrition
              ? "Valores transcritos do PDF. A base de cálculo deve ser conferida na fonte; não são aplicados automaticamente à porção consumida."
              : "Não atribuímos calorias ou macronutrientes a esta receita. Para registrar no diário, informe os valores da porção consumida."}
          </Text>
        </View>
      )}
      <Section
        title="O que você vai precisar"
        caption={
          r.yieldLabel ||
          "Ingredientes para 1 porção. Ajuste proporcionalmente."
        }
      />
      <View style={s.card}>
        {r.ingredients.map((ingredient, i) => (
          <View style={s.row} key={`${i}-${ingredient}`}>
            <Icon name="check" size={16} color={C.green} />
            <Text style={[s.body, { flex: 1 }]}>{ingredient}</Text>
          </View>
        ))}
      </View>
      <Section title="Mãos à obra" />
      {r.steps.map((step, i) => (
        <View style={[s.card, s.row]} key={i}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "#E8EFDA",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={s.h3}>{i + 1}</Text>
          </View>
          <Text style={[s.body, { flex: 1 }]}>{step}</Text>
        </View>
      ))}
      {r.source && (
        <View style={s.card}>
          <Text style={s.h3}>Origem da receita e da imagem</Text>
          <Text style={s.body}>{r.source.credit}</Text>
          <Text style={s.small}>
            {r.source.document} · página {r.source.page}
          </Text>
          <Text style={s.footer}>
            Ingredientes e preparo transcritos do material fornecido. Confira
            quantidades, alergênicos e orientações de preparo na fonte.
          </Text>
        </View>
      )}
      <Section
        title="Levar para o diário"
        caption={`Dia ${new Date(selected + "T12:00:00").toLocaleDateString("pt-BR")}`}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {GROUPS.map((g: string) => (
          <Chip
            key={g}
            label={g}
            active={g === group}
            onPress={() => setGroup(g)}
          />
        ))}
      </ScrollView>
      {!known && !manual ? (
        <Button light onPress={() => setManual(true)}>
          Informar minha porção e nutrientes
        </Button>
      ) : (
        <>
          {!known && (
            <>
              <Text style={s.body}>
                Informe os nutrientes apenas da quantidade consumida. Estes
                campos não serão preenchidos com estimativas automáticas.
              </Text>
              {[
                "Porção consumida (ex.: 1 fatia)",
                "Calorias da porção (kcal)",
                "Proteínas da porção (g)",
                "Carboidratos da porção (g)",
                "Gorduras da porção (g)",
              ].map((label, i) => (
                <Field
                  key={label}
                  label={label}
                  value={values[i]}
                  onChange={(v) =>
                    setValues((f) => f.map((x, j) => (i === j ? v : x)))
                  }
                  numeric={i > 0}
                />
              ))}
            </>
          )}
          {error ? (
            <Text style={s.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <Button disabled={busy} onPress={() => void add()}>
            {busy ? "Salvando…" : "Adicionar ao diário"}
          </Button>
        </>
      )}
      <Text style={s.footer}>
        {r.source
          ? "Os valores e o rendimento variam conforme marcas, preparo e quantidade consumida."
          : "Informações nutricionais estimadas. O preparo e as marcas utilizadas podem alterar os valores."}
      </Text>
    </Page>
  );
}
