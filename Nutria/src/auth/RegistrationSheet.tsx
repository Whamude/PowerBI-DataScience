import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, s } from "../ui/theme";
import { tr } from "../i18n/core.mjs";
import { useLanguage } from "../i18n/LanguageProvider";

export function RegistrationSheet({
  visible,
  purchase,
  error,
  onClose,
  onRegister,
}: {
  visible: boolean;
  purchase: boolean;
  error: string;
  onClose: () => void;
  onRegister: (email: string, name: string) => Promise<boolean>;
}) {
  useLanguage();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");
  function close() {
    if (busy) return;
    setForm(false);
    setLocalError("");
    onClose();
  }
  async function submit() {
    if (!name.trim()) {
      setLocalError("Como podemos chamar você?");
      return;
    }
    setBusy(true);
    setLocalError("");
    try {
      if (await onRegister(email, name.trim())) setForm(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          backgroundColor: "#173E3288",
          justifyContent: "center",
          padding: 20,
          paddingTop: Math.max(20, insets.top),
          paddingBottom: Math.max(20, insets.bottom),
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: "#FFFEFA",
            borderRadius: 28,
            padding: 24,
            maxWidth: 460,
            width: "100%",
            alignSelf: "center",
            maxHeight: "100%",
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 18 }}
          >
            <Text accessibilityRole="header" style={s.h2}>
              {tr(
                form
                  ? "Vamos criar seu cadastro?"
                  : purchase
                    ? "Seu próximo passo"
                    : "Sua evolução merece um lugar especial",
              )}
            </Text>
            <View
              style={{
                backgroundColor: "#E8EEDB",
                width: 68,
                height: 68,
                borderRadius: 24,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather
                name={purchase ? "user" : "trending-up"}
                size={30}
                color={C.green}
              />
            </View>
            <Text style={s.body}>
              {tr(
                purchase
                  ? "Para comprar seu acesso, primeiro crie seu cadastro."
                  : "Que bom acompanhar seus passos! Para salvar sua evolução e consultar seu histórico depois, você precisa criar um cadastro. É rapidinho.",
              )}
            </Text>
            {form ? (
              <>
                <View>
                  <Text style={s.label}>{tr("Seu nome")}</Text>
                  <TextInput
                    accessibilityLabel={tr("Seu nome")}
                    style={s.input}
                    value={name}
                    onChangeText={setName}
                    autoComplete="name"
                  />
                </View>
                <View>
                  <Text style={s.label}>{tr("Seu e-mail")}</Text>
                  <TextInput
                    accessibilityLabel={tr("E-mail do cadastro")}
                    style={s.input}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="emailAddress"
                  />
                </View>
                <Text style={s.small}>
                  {tr(
                    "Seu cadastro e histórico ficam neste aparelho. Não há backup na nuvem. O cadastro não reinicia os sete dias de teste.",
                  )}
                </Text>
                {localError || error ? (
                  <Text accessibilityRole="alert" style={s.error}>
                    {tr(localError || error)}
                  </Text>
                ) : null}
                <Button disabled={busy} onPress={() => void submit()}>
                  {busy ? tr("Salvando…") : tr("Concluir cadastro")}
                </Button>
              </>
            ) : (
              <Button onPress={() => setForm(true)}>
                {tr("Criar cadastro")}
              </Button>
            )}
            <Button light disabled={busy} onPress={close}>
              {tr("Agora não")}
            </Button>
            {!purchase && (
              <Text style={s.small}>
                {tr(
                  "Você pode continuar explorando sem cadastro. Nenhum registro de evolução será salvo até você concluir o cadastro.",
                )}
              </Text>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Button({
  children,
  light,
  disabled,
  onPress,
}: {
  children: React.ReactNode;
  light?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        s.button,
        light && { backgroundColor: "#E8EEDB" },
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[s.buttonText, light && { color: C.ink }]}>{children}</Text>
    </Pressable>
  );
}
