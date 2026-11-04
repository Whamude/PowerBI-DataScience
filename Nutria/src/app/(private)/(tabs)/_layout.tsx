import { tr } from "../../../i18n/core.mjs";
import { useLanguage } from "../../../i18n/LanguageProvider";
import React from "react";
import { Tabs, Redirect } from "expo-router";
import { ActivityIndicator, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../../../state/store";
import { C, s } from "../../../ui/theme";
import { Icon } from "../../../ui/components";
export default function TabLayout() {
  useLanguage();
  const { ready, data, error, legacyAvailable } = useStore();
  const insets = useSafeAreaInsets();
  if (!ready)
    return (
      <View
        style={[
          s.page,
          {
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            gap: 20,
          },
        ]}
      >
        <ActivityIndicator color={C.green} />
        <Text style={error ? s.error : s.body}>
          {tr(error) || tr("Preparando seu espaço…")}
        </Text>
      </View>
    );
  if (legacyAvailable) return <Redirect href="/restore" />;
  if (!data.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: "#929B8D",
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: "#FFFEFA",
          borderTopColor: C.line,
          paddingTop: 8,
          height: 72 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600", marginTop: 2 },
      }}
    >
      {[
        ["index", "Diário", "book-open"],
        ["progress", "Evolução", "bar-chart-2"],
        ["plans", "Planos", "compass"],
        ["recipes", "Receitas", "coffee"],
        ["profile", "Perfil", "user"],
      ].map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: tr(title),
            tabBarIcon: ({ color, size }) => (
              <Icon
                name={icon as React.ComponentProps<typeof Icon>["name"]}
                color={typeof color === "string" ? color : C.green}
                size={size - 2}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
