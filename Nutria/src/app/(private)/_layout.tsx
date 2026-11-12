import { tr } from "../../i18n/core.mjs";
import { useLanguage } from "../../i18n/LanguageProvider";
import React from "react";
import { Stack } from "expo-router";
import { View, Text, ActivityIndicator } from "react-native";
import { StoreProvider, useStore } from "../../state/store";
import { useActivation } from "../../auth/ActivationProvider";
import { s, C } from "../../ui/theme";
function PrivateRoutes() {
  useLanguage();
  const { ready, error } = useStore();
  if (!ready)
    return (
      <View
        style={[
          s.page,
          {
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            gap: 18,
          },
        ]}
      >
        <ActivityIndicator color={C.green} />
        <Text style={error ? s.error : s.body}>
          {tr(error) || tr("Preparando seus registros…")}
        </Text>
      </View>
    );
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="food" options={{ presentation: "modal" }} />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="recipe" />
      <Stack.Screen name="restore" />
      <Stack.Screen name="purchase" />
    </Stack>
  );
}
export default function PrivateLayout() {
  useLanguage();
  const { activation } = useActivation();
  if (!activation) return null;
  return (
    <StoreProvider key={activation.accountId} accountId={activation.accountId}>
      <PrivateRoutes />
    </StoreProvider>
  );
}
