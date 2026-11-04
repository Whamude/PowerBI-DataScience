import {
  tr,
  num,
  locale,
  inputNumber,
  numberInput,
} from "../../../i18n/core.mjs";
import { LanguagePicker, useLanguage } from "../../../i18n/LanguageProvider";
import { useActivation } from "../../../auth/ActivationProvider";
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Share,
  Platform,
  findNodeHandle,
} from "react-native";
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
function ProfileItem({
  title,
  caption,
  icon,
  onPress,
  anchorRef,
}: {
  title: string;
  caption: string;
  icon: React.ComponentProps<typeof Icon>["name"];
  onPress: () => void;
  anchorRef?: React.Ref<React.ElementRef<typeof Pressable>>;
}) {
  return (
    <Pressable
      ref={anchorRef}
      accessibilityRole="button"
      onPress={onPress}
      style={[s.card, s.between, { padding: 19 }]}
    >
      <View style={[s.row, { flex: 1 }]}>
        <Icon name={icon} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.h3}>{tr(title)}</Text>
          <Text style={s.small}>{tr(caption)}</Text>
        </View>
      </View>
      <Icon name="chevron-right" size={17} color={C.muted} />
    </Pressable>
  );
}
export default function ProfileScreen() {
  useLanguage();
  const { data, mutate } = useStore();
  const { activation, signOut, error: activationError } = useActivation();
  const exportAnchor = useRef<React.ElementRef<typeof Pressable>>(null);
  const [edit, setEdit] = useState(false),
    [info, setInfo] = useState(false),
    [form, setForm] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  function open() {
    setForm(
      Object.fromEntries(
        Object.entries(data.profile).map(([k, v]) => [
          k,
          typeof v === "number" ? numberInput(v) : String(v),
        ]),
      ),
    );
    setError("");
    setEdit(true);
  }
  async function save() {
    try {
      const profile: Profile = {
        name: form.name.trim(),
        goal: form.goal,
        style: form.style,
        calories: numberValue(
          inputNumber(form.calories),
          800,
          6000,
          "Calorias",
        ),
        protein: numberValue(inputNumber(form.protein), 1, 500, "Proteínas"),
        carbs: numberValue(inputNumber(form.carbs), 1, 1000, "Carboidratos"),
        fat: numberValue(inputNumber(form.fat), 1, 300, "Gorduras"),
        water: numberValue(inputNumber(form.water), 250, 8000, "Água"),
        targetWeight:
          form.targetWeight && form.targetWeight !== "0"
            ? numberValue(
                inputNumber(form.targetWeight),
                20,
                500,
                "Meta de peso",
              )
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
      const anchor =
        Platform.OS === "ios" ? findNodeHandle(exportAnchor.current) : null;
      await Share.share(
        {
          title: tr("Meus dados Nutria"),
          message: JSON.stringify(data, null, 2),
        },
        Platform.OS === "ios"
          ? {
              subject: tr("Meus dados Nutria"),
              ...(anchor !== null ? { anchor } : {}),
            }
          : undefined,
      );
    } catch {
      setNotice("Não foi possível abrir o compartilhamento. Tente novamente.");
    }
  }
  return (
    <Page>
      <Text style={s.eyebrow}>{tr("SEU ESPAÇO")}</Text>
      <Text style={s.title}>{tr("Cuidar começa\npor você.")}</Text>
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
              {(data.profile.name || tr("Você")).charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={s.h2}>{data.profile.name || tr("Você")}</Text>
            <Text style={s.body}>{tr(data.profile.goal)}</Text>
          </View>
        </View>
        <View style={s.divider} />
        <View style={s.between}>
          <Text style={s.small}>{tr(data.profile.style)}</Text>
          <Pressable accessibilityRole="button" onPress={open}>
            <Text style={s.link}>{tr("Editar perfil →")}</Text>
          </Pressable>
        </View>
      </View>
      {notice ? (
        <Text accessibilityRole="alert" style={[s.body, { color: C.green }]}>
          {tr(notice)}
        </Text>
      ) : null}
      <Section
        title={tr("Metas no seu ritmo")}
        action={tr("Ajustar")}
        onPress={open}
      />
      <View style={s.card}>
        {[
          ["Calorias", `${num(data.profile.calories)} kcal`, "sun"],
          ["Água", `${num(data.profile.water)} ml`, "droplet"],
          ["Proteínas", `${num(data.profile.protein)} g`, "circle"],
          ["Carboidratos", `${num(data.profile.carbs)} g`, "circle"],
          ["Gorduras", `${num(data.profile.fat)} g`, "circle"],
          [
            "Meta de peso",
            data.profile.targetWeight
              ? `${num(data.profile.targetWeight)} kg`
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
              <Text style={s.body}>{tr(label)}</Text>
            </View>
            <Text style={s.h3}>{tr(value)}</Text>
          </View>
        ))}
        <Text style={s.footer}>
          {tr(
            "Metas definidas por você. Calorias e nutrientes podem ser ajustados de forma independente conforme sua orientação profissional.",
          )}
        </Text>
      </View>
      <Section title={tr("Seu acesso")} />
      {activationError ? (
        <Text accessibilityRole="alert" style={s.error}>
          {tr(activationError)}
        </Text>
      ) : null}
      <View style={s.card}>
        <Text style={s.h3}>
          {activation?.trial
            ? tr("Teste experimental de 7 dias")
            : tr("Ativação individual")}
        </Text>
        <Text style={s.body}>{activation?.email}</Text>
        <Text style={s.small}>
          {activation?.expiresAt
            ? tr("{0} {1}", {
                0: activation.trial ? tr("Teste até") : tr("Válida até"),
                1: new Date(activation.expiresAt).toLocaleString(locale()),
              })
            : tr("Sem vencimento")}
        </Text>
        <Button
          light
          onPress={() => {
            void signOut();
          }}
        >
          {activation?.trial
            ? tr("Sair do teste / inserir código")
            : tr("Sair desta ativação")}
        </Button>
        <Text style={s.footer}>
          {activation?.trial
            ? tr(
                "Seus registros serão preservados. Você pode ativar com este mesmo e-mail a qualquer momento ou retomar o teste dentro do prazo original.",
              )
            : tr(
                "Seus registros deste e-mail serão preservados neste aparelho. Será necessário informar o código para entrar novamente.",
              )}
        </Text>
      </View>
      <Section title={tr("Seu aplicativo")} />
      <LanguagePicker />
      <ProfileItem
        title="Editar preferências"
        caption="Nome, estilo alimentar e objetivos"
        icon="sliders"
        onPress={open}
      />
      <ProfileItem
        title="Exportar meus registros"
        caption="Compartilhar uma cópia dos dados"
        icon="download"
        onPress={() => void exportData()}
        anchorRef={exportAnchor}
      />
      <ProfileItem
        title="Sobre seus dados"
        caption="Privacidade e recursos desta versão"
        icon="shield"
        onPress={() => setInfo(true)}
      />
      <View style={[s.card, { backgroundColor: "#ECE9DE" }]}>
        <Icon name="feather" />
        <Text style={s.h2}>{tr("Sem pressa. Sem comparação.")}</Text>
        <Text style={s.body}>
          {tr(
            "Seu progresso é seu. O Nutria ajuda a registrar escolhas e enxergar sua rotina com mais clareza.",
          )}
        </Text>
      </View>
      <Text style={[s.footer, { textAlign: "center" }]}>
        {tr("nutria · versão 0.7.0 · feito para o seu cotidiano")}
      </Text>
      <Sheet
        visible={edit}
        title={tr("Seu perfil e suas metas")}
        onClose={() => setEdit(false)}
      >
        <Field
          label={tr("Seu nome")}
          value={form.name || ""}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
        />
        <Text style={s.label}>{tr("Seu objetivo")}</Text>
        {[
          "Mais equilíbrio",
          "Organizar a alimentação",
          "Acompanhar meu peso",
          "Apoiar minha rotina de treinos",
        ].map((goal) => (
          <Chip
            key={goal}
            label={tr(goal)}
            active={form.goal === goal}
            onPress={() => setForm((f) => ({ ...f, goal }))}
          />
        ))}
        <Text style={s.label}>{tr("Estilo alimentar")}</Text>
        <View style={[s.row, { flexWrap: "wrap" }]}>
          {["Sem restrições", "Vegetariano", "Vegano", "Pescetariano"].map(
            (style) => (
              <Chip
                key={style}
                label={tr(style)}
                active={form.style === style}
                onPress={() => setForm((f) => ({ ...f, style }))}
              />
            ),
          )}
        </View>
        <Text style={s.body}>
          {tr(
            "Use metas orientadas por um profissional. Os limites abaixo são validações de entrada, não recomendações individuais.",
          )}
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
            label={tr(label)}
            value={form[key] || ""}
            onChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
            numeric
          />
        ))}
        {error ? <Text style={s.error}>{tr(error)}</Text> : null}
        <Button disabled={busy} onPress={() => void save()}>
          {busy ? tr("Salvando…") : tr("Salvar minhas preferências")}
        </Button>
      </Sheet>
      <Sheet
        visible={info}
        title={tr("Seus dados, com clareza")}
        onClose={() => setInfo(false)}
      >
        <Icon name="shield" size={35} />
        <Text style={s.h3}>{tr("Salvos neste aparelho")}</Text>
        <Text style={s.body}>
          {tr(
            "Seus registros ficam localmente. A versão atual não possui conta, cópia na nuvem ou sincronização. Desinstalar o aplicativo pode apagar esses dados. Use a exportação para guardar uma cópia.",
          )}
        </Text>
        <Text style={s.h3}>{tr("O que já funciona")}</Text>
        <Text style={s.body}>
          {tr(
            "Diário por data, catálogo local, porções, edição, água, hábitos, atividades, peso, gráficos, favoritos, receitas, coleções e lista de ingredientes.",
          )}
        </Text>
        <Text style={s.h3}>{tr("Próximas integrações")}</Text>
        <Text style={s.body}>
          {tr(
            "Reconhecimento de refeições por IA, código de barras, sincronização e conexões de saúde ainda não estão disponíveis. Nenhuma assinatura é cobrada nesta versão.",
          )}
        </Text>
        <Text style={s.h3}>{tr("Informações nutricionais")}</Text>
        <Text style={s.body}>
          {tr(
            "Valores do catálogo e receitas são aproximados e demonstrativos. O aplicativo não diagnostica condições nem substitui acompanhamento profissional.",
          )}
        </Text>
      </Sheet>
    </Page>
  );
}
