import { View } from "react-native";
import { PrimaryButton } from "../ui";

export function OnboardingNavigationActions({
  onBack,
  onContinue,
  onSave,
}: {
  onBack: () => void;
  onContinue?: () => void;
  onSave: () => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <PrimaryButton
        title="Continue"
        onPress={() => onContinue?.()}
        disabled={!onContinue}
      />
      <PrimaryButton title="Save Draft" secondary onPress={onSave} />
      <PrimaryButton title="Back" secondary onPress={onBack} />
    </View>
  );
}
