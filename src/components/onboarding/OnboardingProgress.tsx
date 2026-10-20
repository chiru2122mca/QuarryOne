import { Text, View } from "react-native";
import { colors as c } from "../../config/theme";
import { s } from "../ui";
import { onboardingSteps } from "../../features/onboarding/model";
import type { OnboardingStepId } from "../../features/onboarding/model";

export function OnboardingProgress({ step }: { step: OnboardingStepId }) {
  const current = onboardingSteps.findIndex((entry) => entry.id === step) + 1;
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.muted}>
        Step {current} of {onboardingSteps.length} · Demo Business Setup
      </Text>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Onboarding navigation progress"
        accessibilityValue={{ min: 1, max: 5, now: current }}
        aria-valuemin={1}
        aria-valuemax={onboardingSteps.length}
        aria-valuenow={current}
        style={{
          height: 6,
          backgroundColor: c.line,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${(current / onboardingSteps.length) * 100}%`,
            backgroundColor: c.orange,
          }}
        />
      </View>
      <Text style={s.muted}>
        Progress shows your current step, not business readiness.
      </Text>
    </View>
  );
}
