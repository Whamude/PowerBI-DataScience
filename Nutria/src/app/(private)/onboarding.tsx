import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "../../state/store";
import { C, s } from "../../ui/theme";
import { Button, Chip, Field, FoodArt, Icon } from "../../ui/components";
import { numberValue, dateKey } from "../../domain/model.mjs";
export default function Onboarding() {
  const { data, ready, error, mutate } = useStore();
  const [step, setStep] = useState(0),
    [name, setName] = useState(data.profile.name),
    [goal, setGoal] = useState(data.profile.goal),
    [style, setStyle] = useState(data.profile.style),
    [kcal, setKcal] = useState("2000"),
    [water, setWater] = useState("2000"),
    [weight, setWeight] = useState(""),
    [target, setTarget] = useState(""),
    [localError, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (!ready)
    return (
      <SafeAreaView style={[s.page, { justifyContent: "center" }]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  if (data.onboarded) return <Redirect href="/" />;
  async function finish() {
    try {
      const calories = numberValue(kcal, 800, 6000, "Meta de calorias"),
        waterGoal = numberValue(water, 250, 8000, "Meta de água");
      const w = weight ? numberValue(weight, 20, 500, "Peso atual") : 0,
        t = target ? numberValue(target, 20, 500, "Meta de peso") : 0;
      setBusy(true);
      const ok = await mutate((d) => ({
        ...d,
        onboarded: true,
        profile: {
          ...d.profile,
          name: name.trim() || "Você",
          goal,
          style,
          calories,
          water: waterGoal,
          targetWeight: t,
        },
        weights: w
          ? [
              ...d.weights.filter((x) => x.date !== dateKey()),
              { date: dateKey(), value: w },
            ]
          : d.weights,
      }));
      if (ok) router.replace("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={s.page}>
      <ScrollView
        contentContainerStyle={[s.container, { flexGrow: 1 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.between}>
          <Text style={[s.h2, { fontSize: 32 }]}>nutria.</Text>
          <Text style={s.eyebrow}>SEU NOVO COMEÇO</Text>
        </View>
        <View style={s.row}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: i <= step ? C.green : C.line,
              }}
            />
          ))}
        </View>
        {step === 0 ? (
          <>
            <View
              style={{
                alignItems: "center",
                backgroundColor: "#E4ECD4",
                borderRadius: 38,
                padding: 24,
                marginVertical: 10,
              }}
            >
              <FoodArt size={230} />
              <View
                style={[
                  s.card,
                  {
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  },
                ]}
              >
                <Icon name="sun" color={C.green} />
                <Text style={s.small}>Mais presença em cada refeição.</Text>
              </View>
            </View>
            <Text style={s.title}>{"Comer bem.\nViver no seu ritmo."}</Text>
            <Text style={s.body}>
              Um espaço para entender suas escolhas, cultivar hábitos e
              acompanhar sua evolução. Comece com o que faz sentido para você.
            </Text>
            <Field
              label="Como podemos chamar você?"
              value={name}
              onChange={setName}
              placeholder="Seu nome"
            />
          </>
        ) : step === 1 ? (
          <>
            <Text style={s.eyebrow}>01 / SUA DIREÇÃO</Text>
            <Text style={s.title}>{"O que te trouxe\naté aqui?"}</Text>
            <Text style={s.body}>
              Seu objetivo ajuda a organizar sua experiência. Você pode mudar
              depois.
            </Text>
            {[
              "Mais equilíbrio",
              "Organizar a alimentação",
              "Acompanhar meu peso",
              "Apoiar minha rotina de treinos",
            ].map((g, i) => (
              <Pressable
                key={g}
                accessibilityRole="button"
                onPress={() => setGoal(g)}
                style={[
                  s.card,
                  s.between,
                  goal === g && {
                    borderColor: C.green,
                    backgroundColor: "#EAF0DF",
                  },
                ]}
              >
                <View style={s.row}>
                  <Icon
                    name={
                      (["sun", "calendar", "trending-up", "activity"] as const)[
                        i
                      ]
                    }
                  />
                  <Text style={[s.h3, { flexShrink: 1 }]}>{g}</Text>
                </View>
                <Icon
                  name={goal === g ? "check-circle" : "circle"}
                  color={goal === g ? C.green : "#CBD1C5"}
                />
              </Pressable>
            ))}
          </>
        ) : step === 2 ? (
          <>
            <Text style={s.eyebrow}>02 / SEU JEITO DE COMER</Text>
            <Text style={s.title}>{"Preferências\nque importam."}</Text>
            <Text style={s.body}>
              Use suas preferências para explorar receitas. Confira os
              ingredientes se tiver alergias.
            </Text>
            <FoodArt kind="green" size={150} />
            {["Sem restrições", "Vegetariano", "Vegano", "Pescetariano"].map(
              (g) => (
                <Chip
                  key={g}
                  label={g}
                  active={style === g}
                  onPress={() => setStyle(g)}
                />
              ),
            )}
          </>
        ) : (
          <>
            <Text style={s.eyebrow}>03 / SEU PONTO DE PARTIDA</Text>
            <Text style={s.title}>{"Metas claras.\nPassos possíveis."}</Text>
            <Text style={s.body}>
              Estes são valores iniciais editáveis, não uma prescrição. Use as
              metas orientadas pelo seu profissional de saúde.
            </Text>
            <Field
              label="Meta diária de calorias (kcal)"
              value={kcal}
              onChange={setKcal}
              numeric
            />
            <Field
              label="Meta diária de água (ml)"
              value={water}
              onChange={setWater}
              numeric
            />
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Peso atual (kg, opcional)"
                  value={weight}
                  onChange={setWeight}
                  numeric
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Meta de peso (kg, opcional)"
                  value={target}
                  onChange={setTarget}
                  numeric
                />
              </View>
            </View>
            <Text style={s.footer}>
              Seus dados ficam neste dispositivo. A versão atual funciona sem
              cadastro e não sincroniza com outros aparelhos.
            </Text>
          </>
        )}
        {localError || error ? (
          <Text accessibilityRole="alert" style={s.error}>
            {localError || error}
          </Text>
        ) : null}
        <View style={{ flex: 1 }} />
        <Button
          disabled={busy}
          onPress={() => {
            setError("");
            if (step < 3) setStep(step + 1);
            else void finish();
          }}
        >
          {busy
            ? "Salvando…"
            : step === 3
              ? "Começar minha jornada"
              : "Continuar"}
        </Button>
        {step > 0 && (
          <Button
            light
            onPress={() => {
              setError("");
              setStep(step - 1);
            }}
          >
            Voltar
          </Button>
        )}
        <Text style={[s.footer, { textAlign: "center" }]}>
          Pequenas escolhas, todos os dias.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
