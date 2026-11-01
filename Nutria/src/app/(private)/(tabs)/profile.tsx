import { useActivation } from "../../../auth/ActivationProvider";
import React, { useState } from "react";
import { View, Text, Pressable, Share } from "react-native";
import { useStore, Profile } from "../../../state/store";
import { numberValue } from "../../../domain/model.mjs";
import { C, s, serif } from "../../../ui/theme";
import {
  Page,
  Section,
  Icon,
  Sheet,
  Field,
  Chip,
  Button,
} from "../../../ui/components";
export default function ProfileScreen() {
  const { data, mutate } = useStore();
  const { activation, signOut, error: activationError } = useActivation();
  const [edit, setEdit] = useState(false),
    [info, setInfo] = useState(false),
    [form, setForm] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  function open() {
    setForm(
      Object.fromEntries(
        Object.entries(data.profile).map(([k, v]) => [k, String(v)]),
      ),
    );
    setError("");
    setEdit(true);
  }
  async function save() {
    try {
      const profile: Profile = {
        name: form.name.trim() || "Você",
        goal: form.goal,
        style: form.style,
        calories: numberValue(form.calories, 800, 6000, "Calorias"),
        protein: numberValue(form.protein, 1, 500, "Proteínas"),
        carbs: numberValue(form.carbs, 1, 1000, "Carboidratos"),
        fat: numberValue(form.fat, 1, 300, "Gorduras"),
        water: numberValue(form.water, 250, 8000, "Água"),
        targetWeight:
          form.targetWeight && form.targetWeight !== "0"
            ? numberValue(form.targetWeight, 20, 500, "Meta de peso")
            : 0,
      };
      setBusy(true);
      const ok = await mutate((d) => ({ ...d, profile }));
      if (ok) {
        setEdit(false);
        setNotice("Seu perfil foi atualizado.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function exportData() {
    try {
      await Share.share({
        title: "Meus dados Nutria",
        message: JSON.stringify(data, null, 2),
      });
    } catch {
      setNotice("Não foi possível abrir o compartilhamento. Tente novamente.");
    }
  }
  const item = (
    title: string,
    caption: string,
    icon: React.ComponentProps<typeof Icon>["name"],
    action: () => void,
  ) => (
    <Pressable
      accessibilityRole="button"
      onPress={action}
      style={[s.card, s.between, { padding: 19 }]}
    >
      <View style={[s.row, { flex: 1 }]}>
        <Icon name={icon} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.h3}>{title}</Text>
          <Text style={s.small}>{caption}</Text>
        </View>
      </View>
      <Icon name="chevron-right" size={17} color={C.muted} />
    </Pressable>
  );
  return (
    <Page>
      <Text style={s.eyebrow}>SEU ESPAÇO</Text>
      <Text style={s.title}>{"Cuidar começa\npor você."}</Text>
      <View style={[s.card, { backgroundColor: "#E8EEDB" }]}>
        <View style={s.row}>
          <View
            style={{
              width: 65,
              height: 65,
              borderRadius: 23,
              backgroundColor: C.green,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: C.lime, fontFamily: serif, fontSize: 30 }}>
              {data.profile.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={s.h2}>{data.profile.name}</Text>
            <Text style={s.body}>{data.profile.goal}</Text>
          </View>
        </View>
        <View style={s.divider} />
        <View style={s.between}>
          <Text style={s.small}>{data.profile.style}</Text>
          <Pressable accessibilityRole="button" onPress={open}>
            <Text style={s.link}>Editar perfil →</Text>
          </Pressable>
        </View>
      </View>
      {notice ? (
        <Text accessibilityRole="alert" style={[s.body, { color: C.green }]}>
          {notice}
        </Text>
      ) : null}
      <Section title="Metas no seu ritmo" action="Ajustar" onPress={open} />
      <View style={s.card}>
        {[
          ["Calorias", `${data.profile.calories} kcal`, "sun"],
          ["Água", `${data.profile.water} ml`, "droplet"],
          ["Proteínas", `${data.profile.protein} g`, "circle"],
          ["Carboidratos", `${data.profile.carbs} g`, "circle"],
          ["Gorduras", `${data.profile.fat} g`, "circle"],
          [
            "Meta de peso",
            data.profile.targetWeight
              ? `${data.profile.targetWeight} kg`
              : "Não definida",
            "trending-up",
          ],
        ].map(([label, value, icon]) => (
          <View style={s.between} key={label}>
            <View style={s.row}>
              <Icon
                name={icon as React.ComponentProps<typeof Icon>["name"]}
                size={16}
                color={C.muted}
              />
              <Text style={s.body}>{label}</Text>
            </View>
            <Text style={s.h3}>{value}</Text>
          </View>
        ))}
        <Text style={s.footer}>
          Metas definidas por você. Calorias e nutrientes podem ser ajustados de
          forma independente conforme sua orientação profissional.
        </Text>
      </View>
      <Section title="Seu acesso" />
      {activationError ? (
        <Text accessibilityRole="alert" style={s.error}>
          {activationError}
        </Text>
      ) : null}
      <View style={s.card}>
        <Text style={s.h3}>Ativação individual</Text>
        <Text style={s.body}>{activation?.email}</Text>
        <Text style={s.small}>
          {activation?.expiresAt
            ? `Válida até ${new Date(activation.expiresAt).toLocaleDateString("pt-BR")}`
            : "Sem vencimento"}
        </Text>
        <Button
          light
          onPress={() => {
            void signOut();
          }}
        >
          Sair desta ativação
        </Button>
        <Text style={s.footer}>
          Seus registros deste e-mail serão preservados neste aparelho. Será
          necessário informar o código para entrar novamente.
        </Text>
      </View>
      <Section title="Seu aplicativo" />
      {item(
        "Editar preferências",
        "Nome, estilo alimentar e objetivos",
        "sliders",
        open,
      )}
      {item(
        "Exportar meus registros",
        "Compartilhar uma cópia dos dados",
        "download",
        () => void exportData(),
      )}
      {item(
        "Sobre seus dados",
        "Privacidade e recursos desta versão",
        "shield",
        () => setInfo(true),
      )}
      <View style={[s.card, { backgroundColor: "#ECE9DE" }]}>
        <Icon name="feather" />
        <Text style={s.h2}>Sem pressa. Sem comparação.</Text>
        <Text style={s.body}>
          Seu progresso é seu. O Nutria ajuda a registrar escolhas e enxergar
          sua rotina com mais clareza.
        </Text>
      </View>
      <Text style={[s.footer, { textAlign: "center" }]}>
        nutria · versão 0.4.0 · feito para o seu cotidiano
      </Text>
      <Sheet
        visible={edit}
        title="Seu perfil e suas metas"
        onClose={() => setEdit(false)}
      >
        <Field
          label="Seu nome"
          value={form.name || ""}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
        />
        <Text style={s.label}>Seu objetivo</Text>
        {[
          "Mais equilíbrio",
          "Organizar a alimentação",
          "Acompanhar meu peso",
          "Apoiar minha rotina de treinos",
        ].map((goal) => (
          <Chip
            key={goal}
            label={goal}
            active={form.goal === goal}
            onPress={() => setForm((f) => ({ ...f, goal }))}
          />
        ))}
        <Text style={s.label}>Estilo alimentar</Text>
        <View style={[s.row, { flexWrap: "wrap" }]}>
          {["Sem restrições", "Vegetariano", "Vegano", "Pescetariano"].map(
            (style) => (
              <Chip
                key={style}
                label={style}
                active={form.style === style}
                onPress={() => setForm((f) => ({ ...f, style }))}
              />
            ),
          )}
        </View>
        <Text style={s.body}>
          Use metas orientadas por um profissional. Os limites abaixo são
          validações de entrada, não recomendações individuais.
        </Text>
        {[
          ["calories", "Meta de calorias (kcal)"],
          ["water", "Meta de água (ml)"],
          ["protein", "Proteínas (g)"],
          ["carbs", "Carboidratos (g)"],
          ["fat", "Gorduras (g)"],
          ["targetWeight", "Meta de peso (kg, opcional; 0 para remover)"],
        ].map(([key, label]) => (
          <Field
            key={key}
            label={label}
            value={form[key] || ""}
            onChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
            numeric
          />
        ))}
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Button disabled={busy} onPress={() => void save()}>
          {busy ? "Salvando…" : "Salvar minhas preferências"}
        </Button>
      </Sheet>
      <Sheet
        visible={info}
        title="Seus dados, com clareza"
        onClose={() => setInfo(false)}
      >
        <Icon name="shield" size={35} />
        <Text style={s.h3}>Salvos neste aparelho</Text>
        <Text style={s.body}>
          Seus registros ficam localmente. A versão atual não possui conta,
          cópia na nuvem ou sincronização. Desinstalar o aplicativo pode apagar
          esses dados. Use a exportação para guardar uma cópia.
        </Text>
        <Text style={s.h3}>O que já funciona</Text>
        <Text style={s.body}>
          Diário por data, catálogo local, porções, edição, água, hábitos,
          atividades, peso, gráficos, favoritos, receitas, coleções e lista de
          ingredientes.
        </Text>
        <Text style={s.h3}>Próximas integrações</Text>
        <Text style={s.body}>
          Reconhecimento de refeições por IA, código de barras, sincronização e
          conexões de saúde ainda não estão disponíveis. Nenhuma assinatura é
          cobrada nesta versão.
        </Text>
        <Text style={s.h3}>Informações nutricionais</Text>
        <Text style={s.body}>
          Valores do catálogo e receitas são aproximados e demonstrativos. O
          aplicativo não diagnostica condições nem substitui acompanhamento
          profissional.
        </Text>
      </Sheet>
    </Page>
  );
}
