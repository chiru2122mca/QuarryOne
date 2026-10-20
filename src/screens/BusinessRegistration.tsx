import { useState } from "react";
import { Text, View } from "react-native";
import { FormField, s } from "../components/ui";
import { OnboardingStepLayout } from "../components/onboarding/OnboardingStepLayout";
import { useOnboardingDraft } from "../features/onboarding/OnboardingProvider";
import type { BusinessDraft } from "../features/onboarding/model";
import {
  businessRegistrationCopy as copy,
  validateBusinessRegistration,
} from "../features/onboarding/businessRegistration";
import type { BusinessErrors } from "../features/onboarding/businessRegistration";
import { colors as c } from "../config/theme";

export default function BusinessRegistration() {
  const { state, dispatch } = useOnboardingDraft();
  const [errors, setErrors] = useState<BusinessErrors>({});
  const business = state.draft.business;
  function change(key: keyof BusinessDraft, text: string) {
    const value = { ...business, [key]: text };
    dispatch({ type: "UPDATE_DRAFT", section: "business", value });
    if (errors[key]) {
      setErrors((current) => ({
        ...current,
        [key]: validateBusinessRegistration(value).errors[key],
      }));
    }
  }
  function validate() {
    const result = validateBusinessRegistration(business);
    if (
      (Object.keys(business) as (keyof BusinessDraft)[]).some(
        (key) => business[key] !== result.value[key],
      )
    ) {
      dispatch({
        type: "UPDATE_DRAFT",
        section: "business",
        value: result.value,
      });
    }
    setErrors(result.errors);
    return result.valid;
  }
  const field = (key: keyof BusinessDraft) => (
    <FormField
      key={key}
      label={copy.fields[key].label}
      required={copy.fields[key].required}
      value={business[key]}
      onChange={(text) => change(key, text)}
      error={errors[key]}
      multiline={key === "address"}
      uppercase={key === "gstin"}
      keyboardType={key === "contactPhone" ? "phone-pad" : "default"}
      hint={
        key === "contactPhone"
          ? copy.phoneHint
          : key === "gstin"
            ? copy.gstinHint
            : undefined
      }
    />
  );
  return (
    <OnboardingStepLayout
      step="business"
      showPreferences={false}
      showSaveConfirmation={validateBusinessRegistration(business).valid}
      beforeContinue={validate}
      beforeSave={validate}
      onReset={() => setErrors({})}
    >
      <Text style={s.muted}>{copy.demoNote}</Text>
      <Text style={s.muted}>{copy.requiredNote}</Text>
      <View style={[s.card, { padding: 16, gap: 12 }]}>
        <Text accessibilityRole="header" style={s.heading}>
          {copy.businessSection}
        </Text>
        {(
          [
            "businessName",
            "legalName",
            "contactPhone",
            "stateName",
            "district",
            "address",
            "gstin",
          ] as const
        ).map(field)}
      </View>
      <View style={[s.card, { padding: 16, gap: 12 }]}>
        <Text accessibilityRole="header" style={s.heading}>
          {copy.ownerSection}
        </Text>
        {field("ownerDisplayName")}
      </View>
      <Text style={s.muted}>{copy.incompleteNote}</Text>
      {Object.values(errors).some(Boolean) && (
        <Text accessibilityRole="alert" style={[s.text, { color: c.error }]}>
          {copy.errorSummary}
        </Text>
      )}
    </OnboardingStepLayout>
  );
}
