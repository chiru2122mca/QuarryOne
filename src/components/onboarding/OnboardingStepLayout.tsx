import { useEffect } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Screen, PrimaryButton, s } from "../ui";
import { OnboardingHeader } from "./OnboardingHeader";
import { OnboardingProgress } from "./OnboardingProgress";
import { OnboardingNavigationActions } from "./OnboardingNavigationActions";
import { useOnboardingDraft } from "../../features/onboarding/OnboardingProvider";
import {
  adjacentOnboardingStep,
  demoDraftSavedMessage,
  getOnboardingStep,
} from "../../features/onboarding/model";
import type { OnboardingStepId } from "../../features/onboarding/model";

export function OnboardingStepLayout({ step }: { step: OnboardingStepId }) {
  const { state, dispatch } = useOnboardingDraft();
  const current = getOnboardingStep(step)!;
  const previous = adjacentOnboardingStep(step, "back");
  const next = adjacentOnboardingStep(step, "forward");
  useEffect(() => {
    dispatch({ type: "NAVIGATE", step });
  }, [dispatch, step]);
  const back = () => router.replace(previous?.route ?? "/more");
  return (
    <Screen header={<OnboardingHeader onBack={back} />}>
      <OnboardingProgress step={step} />
      <Text accessibilityRole="header" style={s.title}>
        {current.title}
      </Text>
      <View style={s.card}>
        <Text style={s.heading}>Prototype · Navigation foundation</Text>
        <Text style={s.text}>{current.purpose}</Text>
        <Text style={s.muted}>
          Forms will be added in a later milestone. This demo does not create a
          business, send invitations or activate an organization.
        </Text>
      </View>
      <View style={s.card} testID="onboarding-defaults">
        <Text style={s.heading}>Draft preferences</Text>
        <Text style={s.text}>
          {state.draft.multiSiteEnabled ? "Multiple quarries" : "Single quarry"}{" "}
          · {state.draft.preferences.dimensionUnit} /{" "}
          {state.draft.preferences.volumeDisplay === "M3" ? "m³" : "CFT"}
        </Text>
        <Text style={s.text}>
          {state.draft.preferences.currency} ·{" "}
          {state.draft.preferences.timezone}
        </Text>
      </View>
      <Text style={s.muted}>
        Drafts stay in memory during this app session. Reloading or restarting
        the app clears them.
      </Text>
      {state.savedForSession && (
        <Text accessibilityLiveRegion="polite" style={s.text}>
          {demoDraftSavedMessage}
        </Text>
      )}
      {!next && (
        <Text style={s.text}>
          Activation is unavailable in this prototype. Use Back to review
          earlier steps.
        </Text>
      )}
      <OnboardingNavigationActions
        onBack={back}
        onContinue={next ? () => router.replace(next.route) : undefined}
        onSave={() => dispatch({ type: "SAVE_DRAFT" })}
      />
      <PrimaryButton
        title="Reset demo draft"
        secondary
        onPress={() => {
          dispatch({ type: "RESET_DEMO" });
          router.replace("/onboarding/business");
        }}
      />
    </Screen>
  );
}
