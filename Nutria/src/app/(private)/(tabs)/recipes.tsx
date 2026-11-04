import { tr, num } from "../../../i18n/core.mjs";
import { useLanguage } from "../../../i18n/LanguageProvider";
import { useCatalog } from "../../../i18n/catalog";
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useStore } from "../../../state/store";
import type { Recipe } from "../../../data/catalog";
import { recipeMatches, recipeMeta } from "../../../domain/recipes.mjs";
import { C, s } from "../../../ui/theme";
import { Header, Icon, Chip, Section } from "../../../ui/components";
import { RecipePhoto } from "../../../ui/RecipePhoto";
export default function Recipes() {
  useLanguage();
  const { recipes } = useCatalog();
  const { data, error } = useStore();
  const [category, setCategory] = useState("Todas"),
    [filter, setFilter] = useState("Todas"),
    [query, setQuery] = useState("");
  const list = useMemo(
    () =>
      recipes.filter((r) =>
        recipeMatches(r, {
          category,
          filter,
          query,
          favorites: data.recipeFavorites,
        }),
      ),
    [category, filter, query, data.recipeFavorites, recipes],
  );
  const featured = recipes.find((r) => r.id === "cafe-15")!;
  const header = (
    <View style={{ gap: 20 }}>
      {error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {tr(error)}
        </Text>
      ) : null}
      <Text style={s.eyebrow}>{tr("SABOR PARA A SUA ROTINA")}</Text>
      <Text style={s.title}>{tr("Cozinhar pode\nser simples.")}</Text>
      <View
        style={[
          s.card,
          {
            backgroundColor: "#E4ECD6",
            flexDirection: "row",
            alignItems: "center",
            padding: 15,
          },
        ]}
      >
        <View style={{ flex: 1, gap: 10 }}>
          <Text style={s.eyebrow}>{tr("RECEITA DA VEZ")}</Text>
          <Text style={s.h2}>{featured.name}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: "/recipe", params: { id: featured.id } })
            }
          >
            <Text style={s.link}>{tr("Descobrir receita →")}</Text>
          </Pressable>
        </View>
        <RecipePhoto recipe={featured} compact />
      </View>
      <Text style={s.small}>
        {tr(
          "97 receitas dos seus PDFs + 8 receitas Nutria. Fotos incluídas no aplicativo, disponíveis sem internet.",
        )}
      </Text>
      <View style={[s.row, s.input]}>
        <Icon name="search" color={C.muted} />
        <TextInput
          accessibilityLabel={tr("Buscar receita")}
          placeholder={tr("Busque por receita ou ingrediente")}
          value={query}
          onChangeText={setQuery}
          style={{ flex: 1, fontSize: 14, color: C.ink }}
        />
        {query.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("Limpar busca")}
            onPress={() => setQuery("")}
          >
            <Icon name="x" size={17} />
          </Pressable>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {[
          "Todas",
          "Café da manhã",
          "Almoço",
          "Jantar",
          "Lanche",
          "Sobremesa",
        ].map((c) => (
          <Chip
            key={c}
            label={tr(c)}
            active={category === c}
            onPress={() => setCategory(c)}
          />
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {["Todas", "Dos PDFs", "Favoritas", "Vegetarianas", "Veganas"].map(
          (f) => (
            <Chip
              key={f}
              label={f === "Todas" ? tr("Todos os estilos") : tr(f)}
              active={filter === f}
              onPress={() => setFilter(f)}
            />
          ),
        )}
      </ScrollView>
      <Section
        title={tr("Encontre seu sabor")}
        caption={tr("{0} receitas nesta seleção", { 0: num(list.length) })}
      />
    </View>
  );
  const render = ({ item: r, index }: { item: Recipe; index: number }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tr("Ver receita: {0}", { 0: r.name })}
      onPress={() => router.push({ pathname: "/recipe", params: { id: r.id } })}
      style={{
        flex: 1,
        maxWidth: "49%",
        backgroundColor: "white",
        borderRadius: 22,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: C.line,
      }}
    >
      <View
        style={{
          backgroundColor: ["#EBE9DC", "#DFE8D8", "#F0E1D5"][index % 3],
          alignItems: "center",
        }}
      >
        <RecipePhoto recipe={r} />
        {data.recipeFavorites.includes(r.id) && (
          <View
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              backgroundColor: "white",
              borderRadius: 20,
              padding: 6,
            }}
          >
            <Icon name="heart" size={16} color="#AE655F" />
          </View>
        )}
      </View>
      <View style={{ padding: 14, gap: 8 }}>
        <Text style={[s.eyebrow, { fontSize: 8, letterSpacing: 1 }]}>
          {tr(r.category).toUpperCase()}
        </Text>
        <Text style={[s.h3, { lineHeight: 21 }]}>{r.name}</Text>
        <Text style={s.small}>{tr(recipeMeta(r))}</Text>
        {r.source && (
          <Text style={[s.small, { fontSize: 10 }]}>
            {r.id.startsWith("cafe")
              ? tr("Café da manhã · PDF")
              : tr("Iridium Labs · PDF")}
          </Text>
        )}
      </View>
    </Pressable>
  );
  return (
    <SafeAreaView edges={["top"]} style={s.page}>
      <Header />
      <FlatList
        data={list}
        numColumns={2}
        keyExtractor={(r) => r.id}
        renderItem={render}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={s.card}>
            <Text style={s.body}>
              {tr(
                "Nenhuma receita nesta seleção. Ajuste os filtros ou favorite uma receita.",
              )}
            </Text>
          </View>
        }
        ListFooterComponent={
          <Text style={s.footer}>
            {tr(
              "As receitas dos PDFs preservam ingredientes, preparo, fotos e autoria. Valores nutricionais só são exibidos quando informados na fonte; rendimentos e porções devem ser conferidos. As receitas Nutria usam estimativas demonstrativas.",
            )}
          </Text>
        }
        contentContainerStyle={[s.container, { gap: 16 }]}
        columnWrapperStyle={{ gap: 12 }}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}
