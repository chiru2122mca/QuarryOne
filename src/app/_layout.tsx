import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { OperationsProvider } from "../stores/OperationsProvider";
import { OnboardingProvider } from "../features/onboarding/OnboardingProvider";
export default function Layout() {
  return (
    <SafeAreaProvider>
      <OperationsProvider>
        <OnboardingProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#F5F6F4" },
            }}
          />
        </OnboardingProvider>
      </OperationsProvider>
    </SafeAreaProvider>
  );
}
