import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { recipeMeta } from "../../../domain/recipes.mjs";
import { plans, recipes } from "../../../data/catalog";
import { useStore } from "../../../state/store";
import { C, s } from "../../../ui/theme";
import {
  Page,
  Section,
  Icon,
  FoodArt,
  Sheet,
  Button,
} from "../../../ui/components";
export default function Plans() {
  const { data, mutate } = useStore();
  const [detail, setDetail] = useState<string | null>(null),
    [shopping, setShopping] = useState(false),
    [busy, setBusy] = useState(false);
  const active = plans.find((p) => p.id === data.plan) || plans[0],
    chosen = plans.find((p) => p.id === detail);
  const list = Array.from(
    new Set(
      active.recipeIds.flatMap(
        (id) => recipes.find((r) => r.id === id)?.ingredients || [],
      ),
    ),
  );
  return (
    <Page>
      <Text style={s.eyebrow}>INSPIRAÇÃO PARA COMER BEM</Text>
      <Text style={s.title}>{"Uma rotina\ncom mais sabor."}</Text>
      <View style={[s.card, { backgroundColor: C.green }]}>
        <View style={s.between}>
          <View style={{ flex: 1, gap: 10 }}>
            <Text style={{ fontSize: 10, letterSpacing: 1.5, color: C.lime }}>
              SUA INSPIRAÇÃO ATIVA
            </Text>
            <Text style={[s.h2, { color: "white" }]}>{active.name}</Text>
            <Text style={{ fontSize: 12, lineHeight: 19, color: "#DDE8D2" }}>
              Ideias para montar seu dia, com flexibilidade.
            </Text>
          </View>
          <FoodArt kind={active.kind} size={125} />
        </View>
        <Button light onPress={() => setShopping(true)}>
          Ver lista de ingredientes
        </Button>
      </View>
      <Section
        title="Seu dia, com ideias"
        caption="Toque para ver o preparo e registrar uma receita"
      />
      {active.recipeIds.map((id) => {
        const r = recipes.find((r) => r.id === id)!;
        return (
          <Pressable
            accessibilityRole="button"
            key={id}
            onPress={() => router.push({ pathname: "/recipe", params: { id } })}
            style={[s.card, s.row, { padding: 13 }]}
          >
            <FoodArt kind={r.kind} size={70} />
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.eyebrow}>{r.category.toUpperCase()}</Text>
              <Text style={s.h3}>{r.name}</Text>
              <Text style={s.small}>{recipeMeta(r)}</Text>
            </View>
            <Icon name="chevron-right" size={18} />
          </Pressable>
        );
      })}
      <Section title="Explore outros caminhos" />
      {plans.map((plan) => (
        <Pressable
          accessibilityRole="button"
          key={plan.id}
          onPress={() => setDetail(plan.id)}
          style={[s.card, { backgroundColor: plan.color, padding: 24 }]}
        >
          <View style={s.between}>
            <Text style={s.eyebrow}>{plan.tag}</Text>
            {data.plan === plan.id && (
              <Icon name="check-circle" color={C.green} />
            )}
          </View>
          <View style={s.row}>
            <View style={{ flex: 1, gap: 12 }}>
              <Text style={s.h2}>{plan.name}</Text>
              <Text style={s.body}>{plan.description}</Text>
            </View>
            <FoodArt kind={plan.kind} size={110} />
          </View>
          <Text style={s.link}>Explorar inspiração →</Text>
        </Pressable>
      ))}
      <Text style={s.footer}>
        Estas coleções são sugestões culinárias, não dietas individualizadas ou
        planos prescritos. Porções e necessidades variam. Não há promessa de
        perda de peso.
      </Text>
      <Sheet
        visible={!!chosen}
        title={chosen?.name || ""}
        onClose={() => setDetail(null)}
      >
        {chosen && (
          <>
            <View style={{ alignItems: "center" }}>
              <FoodArt kind={chosen.kind} size={190} />
            </View>
            <Text style={s.body}>{chosen.description}</Text>
            <Text style={s.small}>
              Inclui quatro ideias de refeições e uma lista de ingredientes.
              Nenhuma receita será adicionada automaticamente ao seu diário.
            </Text>
            <Button
              disabled={busy}
              onPress={() => {
                setBusy(true);
                void mutate((d) => ({
                  ...d,
                  plan: chosen.id,
                  shopping: [],
                })).then((ok) => {
                  setBusy(false);
                  if (ok) setDetail(null);
                });
              }}
            >
              {busy ? "Salvando…" : "Usar esta inspiração"}
            </Button>
          </>
        )}
      </Sheet>
      <Sheet
        visible={shopping}
        title="Sua lista de ingredientes"
        onClose={() => setShopping(false)}
      >
        <Text style={s.body}>
          Ingredientes das quatro receitas de {active.name.toLowerCase()}. As
          quantidades são por receita; some itens repetidos conforme o preparo.
        </Text>
        {list.map((item) => (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: data.shopping.includes(item) }}
            key={item}
            onPress={() =>
              void mutate((d) => ({
                ...d,
                shopping: d.shopping.includes(item)
                  ? d.shopping.filter((x) => x !== item)
                  : [...d.shopping, item],
              }))
            }
            style={[
              s.row,
              {
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: C.line,
              },
            ]}
          >
            <Icon
              name={data.shopping.includes(item) ? "check-square" : "square"}
              color={C.green}
            />
            <Text
              style={[
                s.body,
                { flex: 1 },
                data.shopping.includes(item) && {
                  textDecorationLine: "line-through",
                  color: C.muted,
                },
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
        <Text style={s.small}>Seu checklist é salvo neste aparelho.</Text>
      </Sheet>
    </Page>
  );
}
