import React, { useState } from "react";
import { Text, View, Pressable, ScrollView, TextInput } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useStore, Meal } from "../../state/store";
import { foods, Food } from "../../data/catalog";
import { emptyDay, GROUPS, scaleFood, uniqueId } from "../../domain/model.mjs";
import { parseMeal } from "../../domain/nutrition.mjs";
import { C, s } from "../../ui/theme";
import {
  Page,
  Icon,
  Button,
  Field,
  Chip,
  FoodArt,
  Section,
} from "../../ui/components";
const normalize = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export default function FoodScreen() {
  const params = useLocalSearchParams<{
    date: string;
    group: string;
    edit: string;
  }>();
  const { data, selected, mutate } = useStore();
  const date = params.date || selected,
    original = data.days[date]?.meals.find((m) => m.id === params.edit);
  const [group, setGroup] = useState(
      original?.group || params.group || "Almoço",
    ),
    [mode, setMode] = useState(original ? "Manual" : "Catálogo"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("Todos"),
    [chosen, setChosen] = useState<Food | null>(null),
    [grams, setGrams] = useState("100"),
    [form, setForm] = useState(
      original
        ? [
            original.name,
            String(original.kcal),
            String(original.protein),
            String(original.carbs),
            String(original.fat),
          ]
        : ["", "", "", "", ""],
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const recent = Object.entries(data.days)
    .sort(([a], [b]) => b.localeCompare(a))
    .flatMap(([, d]) => [...d.meals].reverse())
    .filter((m, i, all) => all.findIndex((x) => x.name === m.name) === i)
    .slice(0, 15);
  async function save() {
    try {
      let meal: Meal;
      if (chosen && mode === "Catálogo")
        meal = { ...scaleFood(chosen, grams), id: uniqueId(), group };
      else
        meal = {
          ...parseMeal(...(form as [string, string, string, string, string])),
          group,
          ...(original?.grams ? { grams: original.grams } : {}),
        };
      if (original) meal.id = original.id;
      setBusy(true);
      const ok = await mutate((d) => {
        const day = d.days[date] || emptyDay();
        return {
          ...d,
          days: {
            ...d.days,
            [date]: {
              ...day,
              meals: original
                ? day.meals.map((m) => (m.id === original.id ? meal : m))
                : [...day.meals, meal],
            },
          },
        };
      });
      if (ok) router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!original) return;
    setBusy(true);
    const ok = await mutate((d) => ({
      ...d,
      days: {
        ...d.days,
        [date]: {
          ...d.days[date],
          meals: d.days[date].meals.filter((m) => m.id !== original.id),
        },
      },
    }));
    if (ok) router.back();
    else setBusy(false);
  }
  let preview;
  try {
    if (chosen) preview = scaleFood(chosen, grams);
  } catch {}
  return (
    <Page title={original ? "Editar refeição" : "Adicionar alimento"} back>
      <Text style={s.eyebrow}>
        {new Date(date + "T12:00:00")
          .toLocaleDateString("pt-BR", { day: "numeric", month: "long" })
          .toUpperCase()}
      </Text>
      <Text style={s.title}>
        {original ? "Ajuste seu registro." : "O que vai no\nseu prato?"}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {GROUPS.map((g: string) => (
          <Chip
            key={g}
            label={g}
            active={group === g}
            onPress={() => setGroup(g)}
          />
        ))}
      </ScrollView>
      {!original && (
        <View style={s.row}>
          {["Catálogo", "Recentes", "Manual"].map((m) => (
            <View key={m} style={{ flex: 1 }}>
              <Chip
                label={m}
                active={mode === m}
                onPress={() => {
                  setMode(m);
                  setChosen(null);
                  setError("");
                }}
              />
            </View>
          ))}
        </View>
      )}
      {mode === "Catálogo" ? (
        chosen ? (
          <>
            <View
              style={[
                s.card,
                { alignItems: "center", backgroundColor: "#E8EEDB" },
              ]}
            >
              <FoodArt kind={chosen.kind} size={140} />
              <Text style={s.h2}>{chosen.name}</Text>
              <Text style={s.small}>
                {chosen.portion} g ≈ {chosen.unit}
              </Text>
            </View>
            <Field
              label="Quantidade (g)"
              numeric
              value={grams}
              onChange={setGrams}
            />
            {preview ? (
              <View style={s.card}>
                <Text style={s.h3}>{preview.kcal} kcal nesta porção</Text>
                <Text style={s.body}>
                  {preview.protein} g proteína · {preview.carbs} g carboidratos
                  · {preview.fat} g gorduras
                </Text>
              </View>
            ) : (
              <Text style={s.error}>
                Informe uma quantidade entre 1 e 3.000 g.
              </Text>
            )}
            <Button light onPress={() => setChosen(null)}>
              Escolher outro alimento
            </Button>
          </>
        ) : (
          <>
            <View style={[s.row, s.input]}>
              <Icon name="search" color={C.muted} />
              <TextInput
                accessibilityLabel="Buscar alimento"
                placeholder="Busque banana, arroz, frango…"
                value={query}
                onChangeText={setQuery}
                style={{ flex: 1, fontSize: 14, color: C.ink }}
              />
            </View>
            <View style={s.row}>
              {["Todos", "Favoritos"].map((f) => (
                <Chip
                  key={f}
                  label={f}
                  active={filter === f}
                  onPress={() => setFilter(f)}
                />
              ))}
            </View>
            <Section
              title={
                filter === "Favoritos"
                  ? "Seus favoritos"
                  : "Alimentos do dia a dia"
              }
              caption="24 alimentos · valores indicativos por 100 g"
            />
            {foods
              .filter(
                (f) =>
                  (filter !== "Favoritos" || data.favorites.includes(f.id)) &&
                  normalize(f.name).includes(normalize(query)),
              )
              .map((f) => (
                <View
                  key={f.id}
                  style={[
                    s.card,
                    {
                      padding: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    },
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Selecionar ${f.name}`}
                    onPress={() => {
                      setChosen(f);
                      setGrams(String(f.portion));
                    }}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <FoodArt kind={f.kind} size={58} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.h3}>{f.name}</Text>
                      <Text style={s.small}>{f.kcal} kcal / 100 g</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${data.favorites.includes(f.id) ? "Remover" : "Salvar"} favorito ${f.name}`}
                    onPress={() =>
                      void mutate((d) => ({
                        ...d,
                        favorites: d.favorites.includes(f.id)
                          ? d.favorites.filter((x) => x !== f.id)
                          : [...d.favorites, f.id],
                      }))
                    }
                    style={{ padding: 10 }}
                  >
                    <Icon
                      name="heart"
                      color={
                        data.favorites.includes(f.id) ? "#B66C65" : C.muted
                      }
                    />
                  </Pressable>
                </View>
              ))}
            {!foods.some(
              (f) =>
                (filter !== "Favoritos" || data.favorites.includes(f.id)) &&
                normalize(f.name).includes(normalize(query)),
            ) && (
              <View style={s.card}>
                <Text style={s.body}>
                  Nenhum alimento encontrado. Você pode cadastrar os valores no
                  modo Manual.
                </Text>
                <Button light onPress={() => setMode("Manual")}>
                  Registrar manualmente
                </Button>
              </View>
            )}
          </>
        )
      ) : mode === "Recentes" ? (
        <>
          {recent.length ? (
            recent.map((m) => (
              <Pressable
                accessibilityRole="button"
                key={m.id}
                style={s.card}
                onPress={() => {
                  setForm([
                    m.name,
                    String(m.kcal),
                    String(m.protein),
                    String(m.carbs),
                    String(m.fat),
                  ]);
                  setMode("Manual");
                }}
              >
                <Text style={s.h3}>{m.name}</Text>
                <Text style={s.small}>
                  {m.kcal} kcal · Usar os mesmos valores →
                </Text>
              </Pressable>
            ))
          ) : (
            <View style={s.empty}>
              <Icon name="clock" size={30} color={C.muted} />
              <Text style={s.body}>
                Os alimentos registrados aparecerão aqui.
              </Text>
            </View>
          )}
        </>
      ) : (
        <>
          {[
            "Nome do alimento ou refeição",
            "Calorias (kcal)",
            "Proteínas (g)",
            "Carboidratos (g)",
            "Gorduras (g)",
          ].map((label, i) => (
            <Field
              key={label}
              label={label}
              value={form[i]}
              onChange={(v) =>
                setForm((old) => old.map((x, j) => (j === i ? v : x)))
              }
              numeric={i > 0}
            />
          ))}
          <Text style={s.small}>
            Informe os valores da porção consumida, conforme rótulo ou
            orientação profissional.
          </Text>
        </>
      )}
      {error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      ) : null}
      {(mode === "Manual" || chosen) && (
        <Button disabled={busy} onPress={() => void save()}>
          {busy
            ? "Salvando…"
            : original
              ? "Salvar alterações"
              : "Adicionar ao diário"}
        </Button>
      )}
      {original && (
        <Button light disabled={busy} onPress={() => void remove()}>
          Excluir este registro
        </Button>
      )}
      <Text style={s.footer}>
        O catálogo local usa valores aproximados para alimentos genéricos.
        Marcas, preparo e porções variam. Prefira os valores do rótulo quando
        disponíveis.
      </Text>
    </Page>
  );
}
