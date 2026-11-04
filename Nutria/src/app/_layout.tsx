import { tr } from "../i18n/core.mjs";
import { LanguageProvider, useLanguage } from "../i18n/LanguageProvider";
import React from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator } from "react-native";
import { ActivationProvider, useActivation } from "../auth/ActivationProvider";
import { C, s } from "../ui/theme";
function Routes() {
  useLanguage();
  const { activation, ready } = useActivation();
  if (!ready)
    return (
      <View
        style={[
          s.page,
          { justifyContent: "center", alignItems: "center", gap: 16 },
        ]}
      >
        <ActivityIndicator color={C.green} />
        <Text style={s.body}>{tr("Verificando seu acesso…")}</Text>
      </View>
    );
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!activation}>
          <Stack.Screen name="activate" />
        </Stack.Protected>
        <Stack.Protected guard={!!activation}>
          <Stack.Screen name="(private)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
export default function Layout() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ActivationProvider>
          <Routes />
        </ActivationProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
