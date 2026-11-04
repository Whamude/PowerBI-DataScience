import { tr } from "../i18n/core.mjs";
import { LanguagePicker, useLanguage } from "../i18n/LanguageProvider";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useActivation } from "../auth/ActivationProvider";
import { C, s, serif } from "../ui/theme";
import { Icon, Button } from "../ui/components";
export default function Activate() {
  useLanguage();
  const { activate, startTrial, error, configured } = useActivation();
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  async function submit() {
    setBusy(true);
    const ok = await activate(email, code);
    setBusy(false);
    if (ok) router.replace("/");
  }
  async function tryTrial() {
    setBusy(true);
    const ok = await startTrial(email);
    setBusy(false);
    if (ok) router.replace("/");
  }
  return (
    <SafeAreaView style={s.page}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[s.container, { flexGrow: 1, paddingTop: 30 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.between}>
            <Text style={{ fontFamily: serif, fontSize: 36, color: C.ink }}>
              {tr("nutria.")}
            </Text>
            <View style={s.row}>
              <Icon name="shield" size={16} color={C.green} />
              <Text style={s.eyebrow}>{tr("ACESSO INDIVIDUAL")}</Text>
            </View>
          </View>
          <View
            style={[
              s.card,
              {
                backgroundColor: "#E4EDD5",
                padding: 30,
                alignItems: "center",
                gap: 18,
                marginVertical: 12,
              },
            ]}
          >
            <View
              style={{
                width: 74,
                height: 74,
                borderRadius: 25,
                backgroundColor: C.green,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="key" color={C.lime} size={33} />
            </View>
            <Text style={[s.h2, { textAlign: "center" }]}>
              {tr("Seu cuidado tem\num espaço aqui.")}
            </Text>
            <Text style={[s.body, { textAlign: "center" }]}>
              {tr(
                "Experimente o Nutria por 7 dias com seu e-mail, sem código. Se já tem um código de ativação, informe-o abaixo.",
              )}
            </Text>
          </View>
          <LanguagePicker />
          <Text style={s.title}>{tr("Ative seu acesso.")}</Text>
          <View>
            <Text style={s.label}>{tr("Seu e-mail")}</Text>
            <TextInput
              accessibilityLabel={tr("E-mail de ativação")}
              style={s.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              placeholder={tr("voce@exemplo.com")}
            />
          </View>
          <View style={s.card}>
            <Text style={s.h3}>{tr("Experimente grátis por 7 dias")}</Text>
            <Text style={s.body}>
              {tr(
                "Informe seu e-mail acima e comece sem código de ativação. O prazo começa agora e continua contando mesmo com o app fechado.",
              )}
            </Text>
            <Button light disabled={busy} onPress={() => void tryTrial()}>
              {busy ? tr("Aguarde…") : tr("Começar ou retomar teste de 7 dias")}
            </Button>
            <Text style={s.small}>
              {tr(
                "Ao terminar, será necessário ativar. Use o mesmo e-mail para manter seus registros. Retomar um teste não reinicia o prazo.",
              )}
            </Text>
          </View>
          <View>
            <View style={s.between}>
              <Text style={s.label}>{tr("Código de ativação")}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShow((v) => !v)}
              >
                <Text style={s.link}>
                  {show ? tr("Ocultar código") : tr("Mostrar código")}
                </Text>
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel={tr("Código de ativação")}
              style={[s.input, { minHeight: 90, fontSize: 13 }]}
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              autoCorrect={false}
              multiline={show}
              secureTextEntry={!show}
              placeholder={tr("Cole o código completo NTR1…")}
            />
          </View>
          {!configured && (
            <Text style={s.error}>
              {tr(
                "A chave pública do administrador ainda não foi configurada nesta versão. Solicite ao responsável a versão configurada do aplicativo.",
              )}
            </Text>
          )}
          {error ? (
            <Text style={s.error} accessibilityRole="alert">
              {tr(error)}
            </Text>
          ) : null}
          <Button disabled={busy || !configured} onPress={() => void submit()}>
            {busy ? tr("Conferindo código…") : tr("Ativar e entrar")}
          </Button>
          <Text style={s.small}>
            {tr(
              "O código deve ter sido emitido para o mesmo e-mail. Você pode colá-lo completo, mesmo que tenha quebras de linha.",
            )}
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={[s.footer, { textAlign: "center" }]}>
            {tr(
              "A validação funciona sem internet. Precisa de um código ou de renovação? Fale com o administrador do Nutria.",
            )}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
