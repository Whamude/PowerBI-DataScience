import React, { useState } from "react";
import { View, Text } from "react-native";
import { useStore } from "../../../state/store";
import { weeklyStats, streaks, numberValue } from "../../../domain/model.mjs";
import {
  Page,
  Section,
  Icon,
  WeightChart,
  Sheet,
  Field,
  Button,
} from "../../../ui/components";
import { C, s } from "../../../ui/theme";
export default function Progress() {
  const { data, today, selected, mutate } = useStore();
  const stats = weeklyStats(data.days, selected),
    streak = streaks(data.days, today);
  const entries = [...data.weights].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const latest = entries.at(-1);
  const [open, setOpen] = useState(false),
    [weight, setWeight] = useState(latest ? String(latest.value) : ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const avg = Math.round(stats.reduce((n: any, x: any) => n + x.kcal, 0) / 7),
    recorded = stats.filter((x: any) => x.meals > 0).length;
  const max = Math.max(data.profile.calories, ...stats.map((x: any) => x.kcal));
  async function save() {
    try {
      const value = numberValue(weight, 20, 500, "Peso");
      setBusy(true);
      const ok = await mutate((d) => ({
        ...d,
        weights: [
          ...d.weights.filter((x) => x.date !== selected),
          { date: selected, value },
        ],
      }));
      if (ok) setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <Text style={s.eyebrow}>A SUA HISTÓRIA, EM MOVIMENTO</Text>
      <Text style={s.title}>{"Progresso que\nvocê pode sentir."}</Text>
      <View style={[s.card, { backgroundColor: C.green, padding: 24 }]}>
        <View style={s.between}>
          <Text style={{ color: "#CDE0BD", fontSize: 11, letterSpacing: 1.5 }}>
            CONSTÂNCIA, NÃO PERFEIÇÃO
          </Text>
          <Icon name="trending-up" color={C.lime} />
        </View>
        <Text style={{ fontSize: 52, color: "white" }}>
          {streak.current}
          <Text style={{ fontSize: 17 }}>
            {" "}
            {streak.current === 1 ? "dia" : "dias"}
          </Text>
        </Text>
        <Text style={{ color: "#DCE9CE", lineHeight: 22 }}>
          Sua sequência de dias com refeições registradas.
        </Text>
        <View style={{ height: 1, backgroundColor: "#FFFFFF20" }} />
        <Text style={{ color: "white", fontSize: 13 }}>
          Sua maior sequência: {streak.best} dias
        </Text>
      </View>
      <Section
        title="Sua semana à mesa"
        caption={`7 dias até ${new Date(selected + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}`}
      />
      <View style={s.card}>
        <View style={s.between}>
          <View>
            <Text style={s.metric}>
              {avg}
              <Text style={s.small}> kcal / dia</Text>
            </Text>
            <Text style={s.small}>
              Média dos 7 dias, incluindo dias sem registros
            </Text>
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            height: 145,
            alignItems: "flex-end",
            gap: 12,
            paddingTop: 20,
          }}
        >
          {stats.map((d: any) => (
            <View
              key={d.date}
              style={{ flex: 1, alignItems: "center", gap: 9 }}
            >
              <Text style={{ fontSize: 9, color: C.muted }}>
                {d.kcal || "—"}
              </Text>
              <View
                style={{
                  height: Math.max(3, (d.kcal / max) * 92),
                  width: "100%",
                  maxWidth: 32,
                  borderRadius: 8,
                  backgroundColor: d.date === selected ? C.green : "#CFE1AE",
                }}
              />
              <Text style={{ fontSize: 10, color: C.muted }}>
                {new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", {
                  weekday: "narrow",
                })}
              </Text>
            </View>
          ))}
        </View>
        <View style={s.divider} />
        <Text style={s.small}>
          {recorded} de 7 dias com refeições registradas. Dias vazios não
          representam ausência de alimentação.
        </Text>
      </View>
      <View style={s.row}>
        <View style={[s.card, { flex: 1 }]}>
          <Icon name="droplet" color="#62939A" />
          <Text style={s.metric}>
            {(stats.reduce((n: any, x: any) => n + x.water, 0) / 7000)
              .toFixed(1)
              .replace(".", ",")}{" "}
            L
          </Text>
          <Text style={s.small}>Média diária de água registrada</Text>
        </View>
        <View style={[s.card, { flex: 1 }]}>
          <Icon name="activity" color={C.green} />
          <Text style={s.metric}>
            {stats.reduce((n: any, x: any) => n + x.minutes, 0)} min
          </Text>
          <Text style={s.small}>Movimento registrado na semana</Text>
        </View>
      </View>
      <Section
        title="Peso e perspectiva"
        action="Registrar"
        onPress={() => {
          setError("");
          setWeight(
            data.weights.find((x) => x.date === selected)?.value.toString() ||
              "",
          );
          setOpen(true);
        }}
      />
      <View style={s.card}>
        <View style={s.between}>
          <View>
            <Text style={s.eyebrow}>ÚLTIMO REGISTRO</Text>
            <Text style={[s.metric, { marginTop: 7 }]}>
              {latest ? `${latest.value.toLocaleString("pt-BR")} kg` : "—"}
            </Text>
          </View>
          <View>
            <Text style={s.eyebrow}>SUA META</Text>
            <Text style={[s.h3, { marginTop: 10 }]}>
              {data.profile.targetWeight
                ? `${data.profile.targetWeight.toLocaleString("pt-BR")} kg`
                : "Não definida"}
            </Text>
          </View>
        </View>
        <WeightChart entries={entries} />
        <Text style={s.footer}>
          Seu peso pode variar naturalmente. Observe tendências ao longo do
          tempo.
        </Text>
      </View>
      {entries.length > 0 && (
        <View style={s.card}>
          <Text style={s.h3}>Últimos registros</Text>
          {[...entries]
            .reverse()
            .slice(0, 5)
            .map((e) => (
              <View key={e.date} style={s.between}>
                <Text style={s.small}>
                  {new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR")}
                </Text>
                <Text style={s.h3}>{e.value.toLocaleString("pt-BR")} kg</Text>
              </View>
            ))}
        </View>
      )}
      <Sheet
        visible={open}
        title="Registrar peso"
        onClose={() => setOpen(false)}
      >
        <Text style={s.body}>
          Registro de{" "}
          {new Date(selected + "T12:00:00").toLocaleDateString("pt-BR")}. Um
          novo valor substitui o registro deste dia.
        </Text>
        <Field label="Peso (kg)" numeric value={weight} onChange={setWeight} />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Button disabled={busy} onPress={() => void save()}>
          {busy ? "Salvando…" : "Salvar peso"}
        </Button>
      </Sheet>
    </Page>
  );
}
