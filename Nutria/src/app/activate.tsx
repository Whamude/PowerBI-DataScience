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
  const { activate, error, configured } = useActivation();
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
              nutria.
            </Text>
            <View style={s.row}>
              <Icon name="shield" size={16} color={C.green} />
              <Text style={s.eyebrow}>ACESSO INDIVIDUAL</Text>
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
              {"Seu cuidado tem\num espaço aqui."}
            </Text>
            <Text style={[s.body, { textAlign: "center" }]}>
              Entre com seu e-mail e o código de ativação individual fornecido
              pelo responsável pelo Nutria.
            </Text>
          </View>
          <Text style={s.title}>Ative seu acesso.</Text>
          <View>
            <Text style={s.label}>Seu e-mail</Text>
            <TextInput
              accessibilityLabel="E-mail de ativação"
              style={s.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              placeholder="voce@exemplo.com"
            />
          </View>
          <View>
            <View style={s.between}>
              <Text style={s.label}>Código de ativação</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShow((v) => !v)}
              >
                <Text style={s.link}>
                  {show ? "Ocultar código" : "Mostrar código"}
                </Text>
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel="Código de ativação"
              style={[s.input, { minHeight: 90, fontSize: 13 }]}
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              autoCorrect={false}
              multiline={show}
              secureTextEntry={!show}
              placeholder="Cole o código completo NTR1…"
            />
          </View>
          {!configured && (
            <Text style={s.error}>
              A chave pública do administrador ainda não foi configurada nesta
              versão. Solicite ao responsável a versão configurada do
              aplicativo.
            </Text>
          )}
          {error ? (
            <Text style={s.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <Button disabled={busy || !configured} onPress={() => void submit()}>
            {busy ? "Conferindo código…" : "Ativar e entrar"}
          </Button>
          <Text style={s.small}>
            O código deve ter sido emitido para o mesmo e-mail. Você pode
            colá-lo completo, mesmo que tenha quebras de linha.
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={[s.footer, { textAlign: "center" }]}>
            A validação funciona sem internet. Precisa de um código ou de
            renovação? Fale com o administrador do Nutria.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
