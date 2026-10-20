import { Redirect } from "expo-router";
import { useOnboardingDraft } from "../../features/onboarding/OnboardingProvider";
import { getOnboardingStep } from "../../features/onboarding/model";

export default function OnboardingEntry() {
  const { state } = useOnboardingDraft();
  return (
    <Redirect
      href={
        getOnboardingStep(state.currentStep)?.route ?? "/onboarding/business"
      }
    />
  );
}
