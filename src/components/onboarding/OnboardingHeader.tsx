import { useCallback } from "react";
import { Platform, StatusBar } from "react-native";
import { useFocusEffect } from "expo-router";
import { DarkAppHeader } from "../DarkAppHeader";

export function OnboardingHeader({ onBack }: { onBack: () => void }) {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === "web") return;
      const entry = StatusBar.pushStackEntry({ barStyle: "light-content" });
      return () => StatusBar.popStackEntry(entry);
    }, []),
  );
  return (
    <DarkAppHeader
      onBack={onBack}
      showProfile={false}
      actions={<></>}
      testID="onboarding-header"
    />
  );
}
