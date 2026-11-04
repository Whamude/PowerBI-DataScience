import {
  tr,
  num,
  locale,
  inputNumber,
  numberInput,
} from "../../../i18n/core.mjs";
import { useLanguage } from "../../../i18n/LanguageProvider";
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
  useLanguage();
  const { data, today, selected, mutate } = useStore();
  const stats = weeklyStats(data.days, selected),
    streak = streaks(data.days, today);
  const entries = [...data.weights].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const latest = entries.at(-1);
  const [open, setOpen] = useState(false),
    [weight, setWeight] = useState(latest ? numberInput(latest.value) : ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const avg = Math.round(stats.reduce((n: any, x: any) => n + x.kcal, 0) / 7),
    recorded = stats.filter((x: any) => x.meals > 0).length;
  const max = Math.max(data.profile.calories, ...stats.map((x: any) => x.kcal));
  async function save() {
    try {
      const value = numberValue(inputNumber(weight), 20, 500, "Peso");
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
      <Text style={s.eyebrow}>{tr("A SUA HISTÓRIA, EM MOVIMENTO")}</Text>
      <Text style={s.title}>{tr("Progresso que\nvocê pode sentir.")}</Text>
      <View style={[s.card, { backgroundColor: C.green, padding: 24 }]}>
        <View style={s.between}>
          <Text style={{ color: "#CDE0BD", fontSize: 11, letterSpacing: 1.5 }}>
            {tr("CONSTÂNCIA, NÃO PERFEIÇÃO")}
          </Text>
          <Icon name="trending-up" color={C.lime} />
        </View>
        <Text style={{ fontSize: 52, color: "white" }}>
          {num(streak.current)}
          <Text style={{ fontSize: 17 }}>
            {" "}
            {streak.current === 1 ? tr("dia") : tr("dias")}
          </Text>
        </Text>
        <Text style={{ color: "#DCE9CE", lineHeight: 22 }}>
          {tr("Sua sequência de dias com refeições registradas.")}
        </Text>
        <View style={{ height: 1, backgroundColor: "#FFFFFF20" }} />
        <Text style={{ color: "white", fontSize: 13 }}>
          {tr("Sua maior sequência: ")}
          {num(streak.best)}
          {tr(" dias")}
        </Text>
      </View>
      <Section
        title={tr("Sua semana à mesa")}
        caption={tr("7 dias até {0}", {
          0: new Date(selected + "T12:00:00").toLocaleDateString(locale(), {
            day: "numeric",
            month: "short",
          }),
        })}
      />
      <View style={s.card}>
        <View style={s.between}>
          <View>
            <Text style={s.metric}>
              {num(avg)}
              <Text style={s.small}>{tr(" kcal / dia")}</Text>
            </Text>
            <Text style={s.small}>
              {tr("Média dos 7 dias, incluindo dias sem registros")}
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
                {d.kcal ? num(d.kcal) : tr("—")}
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
                {new Date(d.date + "T12:00:00").toLocaleDateString(locale(), {
                  weekday: "narrow",
                })}
              </Text>
            </View>
          ))}
        </View>
        <View style={s.divider} />
        <Text style={s.small}>
          {num(recorded)}
          {tr(
            " de 7 dias com refeições registradas. Dias vazios não representam ausência de alimentação.",
          )}
        </Text>
      </View>
      <View style={s.row}>
        <View style={[s.card, { flex: 1 }]}>
          <Icon name="droplet" color="#62939A" />
          <Text style={s.metric}>
            {num(
              (stats.reduce((n: any, x: any) => n + x.water, 0) / 7000).toFixed(
                1,
              ),
              { minimumFractionDigits: 1, maximumFractionDigits: 1 },
            )}{" "}
            {tr("L")}
          </Text>
          <Text style={s.small}>{tr("Média diária de água registrada")}</Text>
        </View>
        <View style={[s.card, { flex: 1 }]}>
          <Icon name="activity" color={C.green} />
          <Text style={s.metric}>
            {num(stats.reduce((n: any, x: any) => n + x.minutes, 0))}
            {tr(" min")}
          </Text>
          <Text style={s.small}>{tr("Movimento registrado na semana")}</Text>
        </View>
      </View>
      <Section
        title={tr("Peso e perspectiva")}
        action={tr("Registrar")}
        onPress={() => {
          setError("");
          setWeight(
            numberInput(data.weights.find((x) => x.date === selected)?.value),
          );
          setOpen(true);
        }}
      />
      <View style={s.card}>
        <View style={s.between}>
          <View>
            <Text style={s.eyebrow}>{tr("ÚLTIMO REGISTRO")}</Text>
            <Text style={[s.metric, { marginTop: 7 }]}>
              {latest
                ? tr("{0} kg", { 0: latest.value.toLocaleString(locale()) })
                : tr("—")}
            </Text>
          </View>
          <View>
            <Text style={s.eyebrow}>{tr("SUA META")}</Text>
            <Text style={[s.h3, { marginTop: 10 }]}>
              {data.profile.targetWeight
                ? tr("{0} kg", {
                    0: data.profile.targetWeight.toLocaleString(locale()),
                  })
                : tr("Não definida")}
            </Text>
          </View>
        </View>
        <WeightChart entries={entries} />
        <Text style={s.footer}>
          {tr(
            "Seu peso pode variar naturalmente. Observe tendências ao longo do tempo.",
          )}
        </Text>
      </View>
      {entries.length > 0 && (
        <View style={s.card}>
          <Text style={s.h3}>{tr("Últimos registros")}</Text>
          {[...entries]
            .reverse()
            .slice(0, 5)
            .map((e) => (
              <View key={e.date} style={s.between}>
                <Text style={s.small}>
                  {new Date(e.date + "T12:00:00").toLocaleDateString(locale())}
                </Text>
                <Text style={s.h3}>
                  {e.value.toLocaleString(locale())}
                  {tr(" kg")}
                </Text>
              </View>
            ))}
        </View>
      )}
      <Sheet
        visible={open}
        title={tr("Registrar peso")}
        onClose={() => setOpen(false)}
      >
        <Text style={s.body}>
          {tr("Registro de")}{" "}
          {new Date(selected + "T12:00:00").toLocaleDateString(locale())}
          {tr(". Um novo valor substitui o registro deste dia.")}
        </Text>
        <Field
          label={tr("Peso (kg)")}
          numeric
          value={weight}
          onChange={setWeight}
        />
        {error ? <Text style={s.error}>{tr(error)}</Text> : null}
        <Button disabled={busy} onPress={() => void save()}>
          {busy ? tr("Salvando…") : tr("Salvar peso")}
        </Button>
      </Sheet>
    </Page>
  );
}
