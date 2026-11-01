import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { StoreProvider } from "../state/store";
export default function Layout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="food" options={{ presentation: "modal" }} />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="recipe" />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
