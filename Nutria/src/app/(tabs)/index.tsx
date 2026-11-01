import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useStore } from "../../state/store";
import {
  emptyDay,
  GROUPS,
  shiftDate,
  numberValue,
  uniqueId,
} from "../../domain/model.mjs";
import { totals } from "../../domain/nutrition.mjs";
import { C, s } from "../../ui/theme";
import {
  Page,
  Icon,
  IconButton,
  Ring,
  Section,
  Button,
  Field,
  Sheet,
} from "../../ui/components";
export default function Diary() {
  const { data, selected, setSelected, today, updateDay } = useStore();
  const day = data.days[selected] || emptyDay();
  const total = totals(day.meals),
    p = data.profile;
  const [activity, setActivity] = useState(false),
    [form, setForm] = useState(["Caminhada", "30", ""]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const dates = Array.from({ length: 7 }, (_, i) => shiftDate(selected, i - 3));
  const kcalLeft = p.calories - total.kcal;
  async function saveActivity() {
    try {
      const minutes = numberValue(form[1], 1, 1440, "Minutos"),
        kcal = form[2] ? numberValue(form[2], 0, 10000, "Calorias") : 0;
      if (!form[0].trim()) throw new Error("Informe o nome da atividade.");
      setBusy(true);
      const ok = await updateDay((d) => ({
        ...d,
        activities: [
          ...d.activities,
          { id: uniqueId(), name: form[0].trim(), minutes, kcal },
        ],
      }));
      if (ok) {
        setActivity(false);
        setForm(["Caminhada", "30", ""]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <View style={s.between}>
        <View>
          <Text style={s.eyebrow}>BOM TE VER POR AQUI</Text>
          <Text style={s.title}>
            {p.name === "Você" ? "Seu dia" : p.name.split(" ")[0]}, no seu
            ritmo.
          </Text>
        </View>
      </View>
      <View style={s.between}>
        <IconButton
          name="chevron-left"
          label="Dia anterior"
          onPress={() => setSelected(shiftDate(selected, -1))}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setSelected(today)}
        >
          <Text style={s.h3}>
            {selected === today ? "Hoje · " : ""}
            {new Date(selected + "T12:00:00").toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "long",
            })}
          </Text>
          <Text style={[s.small, { textAlign: "center" }]}>
            Toque para voltar a hoje
          </Text>
        </Pressable>
        <IconButton
          name="chevron-right"
          label="Dia seguinte"
          onPress={() => setSelected(shiftDate(selected, 1))}
        />
      </View>
      <View style={[s.row, { justifyContent: "space-between", gap: 4 }]}>
        {dates.map((date) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${date}`}
            accessibilityState={{ selected: date === selected }}
            key={date}
            onPress={() => setSelected(date)}
            style={{
              alignItems: "center",
              paddingVertical: 10,
              flex: 1,
              borderRadius: 18,
              backgroundColor: date === selected ? C.green : "transparent",
              gap: 7,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                color: date === selected ? "#DCE8C8" : C.muted,
              }}
            >
              {new Date(date + "T12:00:00")
                .toLocaleDateString("pt-BR", { weekday: "narrow" })
                .toUpperCase()}
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: date === selected ? "white" : C.ink,
              }}
            >
              {+date.slice(-2)}
            </Text>
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: data.days[date]?.meals.length
                  ? C.lime
                  : "transparent",
              }}
            />
          </Pressable>
        ))}
      </View>
      <LinearGradient
        colors={["#244F3E", "#123D31"]}
        style={{ borderRadius: 30, padding: 22, gap: 16 }}
      >
        <View style={s.between}>
          <Text style={{ fontSize: 10, letterSpacing: 1.7, color: "#C7D6BD" }}>
            SEU EQUILÍBRIO DIÁRIO
          </Text>
          <Icon name="sun" color={C.lime} />
        </View>
        <View style={[s.row, { justifyContent: "space-between", gap: 0 }]}>
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={{ color: "white", fontSize: 21 }}>
              {Math.round(total.kcal)}
            </Text>
            <Text style={{ fontSize: 10, color: "#C7D6BD", marginTop: 5 }}>
              consumidas
            </Text>
          </View>
          <Ring
            value={total.kcal}
            max={p.calories}
            label={String(Math.round(Math.abs(kcalLeft)))}
            sub={kcalLeft < 0 ? "ACIMA DA META" : "RESTANTES"}
            size={180}
          />
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={{ color: "white", fontSize: 21 }}>{p.calories}</Text>
            <Text style={{ fontSize: 10, color: "#C7D6BD", marginTop: 5 }}>
              meta diária
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 11, color: "#C7D6BD", textAlign: "center" }}>
          Uma refeição de cada vez. Sem pressa.
        </Text>
      </LinearGradient>
      <View style={[s.row, { gap: 9 }]}>
        {[
          ["Carboidratos", total.carbs, p.carbs, C.blue],
          ["Proteínas", total.protein, p.protein, C.pink],
          ["Gorduras", total.fat, p.fat, C.orange],
        ].map(([label, value, max, color]) => (
          <View
            key={label}
            style={[s.card, { flex: 1, padding: 12, borderRadius: 18, gap: 9 }]}
          >
            <Text style={{ fontSize: 10, fontWeight: "600", color: C.ink }}>
              {label}
            </Text>
            <Text style={s.small}>
              <Text style={{ color: C.ink, fontSize: 18 }}>
                {Math.round(Number(value))}
              </Text>{" "}
              / {max} g
            </Text>
            <View
              style={{
                height: 4,
                borderRadius: 3,
                backgroundColor: "#F0F0E9",
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 4,
                  width: `${Math.min(100, (Number(value) / Number(max)) * 100)}%`,
                  backgroundColor: String(color),
                }}
              />
            </View>
          </View>
        ))}
      </View>
      <Section title="À sua mesa" caption="Seu diário, refeição por refeição" />
      {GROUPS.map((group: string, i: number) => {
        const meals = day.meals.filter((m: any) => m.group === group);
        return (
          <View style={[s.card, { padding: 17, gap: 14 }]} key={group}>
            <View style={s.between}>
              <View style={s.row}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    backgroundColor: [
                      "#F4E7CB",
                      "#E8EDD9",
                      "#E5EBE7",
                      "#F3E4DB",
                    ][i],
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon
                    name={(["coffee", "sun", "moon", "sun"] as const)[i]}
                    size={19}
                  />
                </View>
                <View>
                  <Text style={s.h3}>{group}</Text>
                  <Text style={s.small}>
                    {meals.length
                      ? `${Math.round(totals(meals).kcal)} kcal registradas`
                      : "Ainda sem registros"}
                  </Text>
                </View>
              </View>
              <IconButton
                name="plus"
                label={`Adicionar alimento em ${group}`}
                onPress={() =>
                  router.push({
                    pathname: "/food",
                    params: { group, date: selected },
                  })
                }
              />
            </View>
            {meals.map((m: any) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Editar ${m.name}`}
                key={m.id}
                onPress={() =>
                  router.push({
                    pathname: "/food",
                    params: { group, date: selected, edit: m.id },
                  })
                }
                style={[
                  s.between,
                  { borderTopWidth: 1, borderColor: C.line, paddingTop: 12 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, color: C.ink }}>{m.name}</Text>
                  <Text style={s.small}>
                    {m.grams ? `${m.grams} g · ` : ""}
                    {Math.round(m.kcal)} kcal
                  </Text>
                </View>
                <Icon name="chevron-right" size={16} color={C.muted} />
              </Pressable>
            ))}
          </View>
        );
      })}
      <Section
        title="Pequenos hábitos"
        caption="Cultive o que faz você se sentir bem"
      />
      <View
        style={[s.card, { backgroundColor: "#E9F1F0", borderColor: "#E2ECE9" }]}
      >
        <View style={s.between}>
          <View style={s.row}>
            <Icon name="droplet" color="#52858E" />
            <Text style={s.h3}>Um gole de cuidado</Text>
          </View>
          <Text style={s.small}>
            {day.water} / {p.water} ml
          </Text>
        </View>
        <View
          style={{
            height: 7,
            borderRadius: 6,
            backgroundColor: "#D2E1E0",
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: 7,
              width: `${Math.min(100, (day.water / p.water) * 100)}%`,
              backgroundColor: "#6B9AA0",
            }}
          />
        </View>
        <View style={s.between}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retirar 250 ml de água"
            onPress={() =>
              void updateDay((d) => ({
                ...d,
                water: Math.max(0, d.water - 250),
              }))
            }
            style={s.iconButton}
          >
            <Icon name="minus" size={16} />
          </Pressable>
          <View style={s.row}>
            {Array.from(
              { length: Math.min(8, Math.ceil(p.water / 250)) },
              (_, i) => (
                <Icon
                  key={i}
                  name="droplet"
                  size={20}
                  color={day.water > i * 250 ? "#54878D" : "#BFCFCB"}
                />
              ),
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Adicionar 250 ml de água"
            onPress={() =>
              void updateDay((d) => ({
                ...d,
                water: Math.min(20000, d.water + 250),
              }))
            }
            style={s.iconButton}
          >
            <Icon name="plus" size={16} />
          </Pressable>
        </View>
        <Text style={s.small}>Cada toque adiciona ou retira 250 ml.</Text>
      </View>
      <View style={s.row}>
        {[
          ["Frutas", "fruit", "#F3E4DC"],
          ["Vegetais", "vegetables", "#E7EDD9"],
        ].map(([label, key, color]) => (
          <View
            key={key}
            style={[s.card, { flex: 1, padding: 16, backgroundColor: color }]}
          >
            <Icon name={key === "fruit" ? "sun" : "feather"} />
            <Text style={s.h3}>{label}</Text>
            <View style={s.between}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Retirar porção de ${label}`}
                onPress={() =>
                  void updateDay((d) => ({
                    ...d,
                    [key]: Math.max(0, (d[key as "fruit"] || 0) - 1),
                  }))
                }
              >
                <Icon name="minus" />
              </Pressable>
              <Text style={s.metric}>{day[key as "fruit"] || 0}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Adicionar porção de ${label}`}
                onPress={() =>
                  void updateDay((d) => ({
                    ...d,
                    [key]: Math.min(30, (d[key as "fruit"] || 0) + 1),
                  }))
                }
              >
                <Icon name="plus" />
              </Pressable>
            </View>
            <Text style={s.small}>porções no dia</Text>
          </View>
        ))}
      </View>
      <Section
        title="Corpo em movimento"
        action="Registrar"
        onPress={() => {
          setError("");
          setActivity(true);
        }}
      />
      <View style={s.card}>
        {day.activities.length ? (
          day.activities.map((a: any) => (
            <View style={s.between} key={a.id}>
              <View style={{ flex: 1 }}>
                <Text style={s.h3}>{a.name}</Text>
                <Text style={s.small}>
                  {a.minutes} min{a.kcal ? ` · ${a.kcal} kcal informadas` : ""}
                </Text>
              </View>
              <IconButton
                name="trash-2"
                label={`Excluir ${a.name}`}
                onPress={() =>
                  void updateDay((d) => ({
                    ...d,
                    activities: d.activities.filter((x) => x.id !== a.id),
                  }))
                }
              />
            </View>
          ))
        ) : (
          <View style={s.row}>
            <Icon name="activity" color={C.muted} />
            <Text style={[s.body, { flex: 1 }]}>
              Uma caminhada, uma dança, uma pausa ativa. Registre seu movimento.
            </Text>
          </View>
        )}
        <Text style={s.footer}>
          Calorias de atividade são informadas por você e não alteram sua meta
          alimentar.
        </Text>
      </View>
      <Sheet
        visible={activity}
        title="Registrar movimento"
        onClose={() => setActivity(false)}
      >
        {["Atividade", "Duração (min)", "Calorias gastas (opcional)"].map(
          (label, i) => (
            <Field
              key={label}
              label={label}
              value={form[i]}
              onChange={(v) =>
                setForm((f) => f.map((x, j) => (i === j ? v : x)))
              }
              numeric={i > 0}
            />
          ),
        )}
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Button disabled={busy} onPress={() => void saveActivity()}>
          {busy ? "Salvando…" : "Salvar atividade"}
        </Button>
      </Sheet>
    </Page>
  );
}
