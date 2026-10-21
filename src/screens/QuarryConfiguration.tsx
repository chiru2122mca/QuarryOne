import { useState } from "react";
import { Modal, ScrollView, Text, View, Pressable } from "react-native";
import { FormField, SelectField, PrimaryButton, s } from "../components/ui";
import { OnboardingStepLayout } from "../components/onboarding/OnboardingStepLayout";
import { useOnboardingDraft } from "../features/onboarding/OnboardingProvider";
import { validateQuarrySetup } from "../features/onboarding/quarrySetup";
import type {
  QuarryCommand,
  SiteFields,
} from "../features/onboarding/quarrySetup";
import { colors as c } from "../config/theme";

export default function QuarryConfiguration() {
  const { state, dispatch } = useOnboardingDraft();
  const [attempted, setAttempted] = useState(false);
  const [removal, setRemoval] = useState<{
    name: string;
    command: QuarryCommand;
  } | null>(null);
  const { draft } = state;
  const validation = validateQuarrySetup(draft);
  const send = (command: QuarryCommand) =>
    dispatch({ type: "QUARRY_COMMAND", command });
  const normalize = () => {
    send({ type: "NORMALIZE" });
    return true;
  };
  const sites = [...draft.sites].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary),
  );
  return (
    <OnboardingStepLayout
      step="quarry"
      showPreferences={false}
      beforeContinue={() => {
        setAttempted(true);
        normalize();
        return validation.valid;
      }}
      beforeSave={normalize}
      onReset={() => {
        setAttempted(false);
        setRemoval(null);
      }}
    >
      <Text style={s.muted}>
        Demo only. Quarry details stay in this session and are not saved to
        Supabase.
      </Text>
      <View style={[s.card, { padding: 16, gap: 10 }]}>
        <Text accessibilityRole="header" style={s.heading}>
          Does your business operate multiple quarry sites?
        </Text>
        {[
          { enabled: false, label: "No — Single Quarry" },
          { enabled: true, label: "Yes — Multiple Quarries" },
        ].map((option) => (
          <Pressable
            key={option.label}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{
              checked: draft.multiSiteEnabled === option.enabled,
            }}
            aria-checked={draft.multiSiteEnabled === option.enabled}
            onPress={() => send({ type: "SET_MODE", enabled: option.enabled })}
            style={[
              s.input,
              s.row,
              {
                borderColor:
                  draft.multiSiteEnabled === option.enabled ? c.orange : c.line,
                paddingVertical: 12,
              },
            ]}
          >
            <Text style={[s.text, { flex: 1 }]}>
              {draft.multiSiteEnabled === option.enabled ? "● " : "○ "}
              {option.label}
            </Text>
          </Pressable>
        ))}
        {!!state.quarryIssue && (
          <Text accessibilityRole="alert" style={[s.text, { color: c.error }]}>
            {state.quarryIssue}
          </Text>
        )}
      </View>
      {sites.map((site, index) => {
        const error = attempted ? validation.errors[site.id] : undefined;
        const field = (
          key: keyof SiteFields,
          label: string,
          required = true,
        ) => (
          <FormField
            key={key}
            label={label}
            value={site[key]}
            required={required}
            onChange={(value) =>
              send({
                type: "EDIT_SITE",
                siteId: site.id,
                fields: { [key]: value },
              })
            }
            uppercase={key === "code"}
            multiline={key === "address"}
            error={key === "address" ? undefined : error?.[key]}
          />
        );
        return (
          <View
            key={site.id}
            testID={`quarry-site-${site.id}`}
            style={[s.card, { padding: 16, gap: 12 }]}
          >
            <Text accessibilityRole="header" style={s.heading}>
              {site.isPrimary ? "Primary Quarry" : `Additional Quarry ${index}`}
            </Text>
            {site.isPrimary && (
              <Text style={s.muted}>
                Automatically assigned · Primary quarry cannot be removed.
              </Text>
            )}
            {field("name", "Quarry Name")}
            {field("code", "Quarry Code")}
            {field("stateName", "State")}
            {field("district", "District")}
            {field("address", "Address", false)}
            <Text accessibilityRole="header" style={s.heading}>
              Pits & Benches
            </Text>
            <Text style={s.muted}>
              Add at least one. Names must be unique within this quarry.
            </Text>
            {!!error?.pits && (
              <Text
                accessibilityLiveRegion="polite"
                style={[s.text, { color: c.error }]}
              >
                {error.pits}
              </Text>
            )}
            {site.pits.map((pit, i) => (
              <View
                key={pit.id}
                testID={`quarry-pit-${pit.id}`}
                style={{
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderColor: c.line,
                  gap: 10,
                }}
              >
                <Text style={s.label}>Pit / Bench {i + 1}</Text>
                <FormField
                  label="Pit / Bench Name"
                  required
                  value={pit.name}
                  onChange={(name) =>
                    send({
                      type: "EDIT_PIT",
                      siteId: site.id,
                      pitId: pit.id,
                      fields: { name },
                    })
                  }
                  error={error?.pitErrors[pit.id]?.name}
                />
                <SelectField
                  label="Type"
                  value={pit.kind}
                  options={["PIT", "BENCH"]}
                  onChange={(kind) => {
                    if (kind === "PIT" || kind === "BENCH")
                      send({
                        type: "EDIT_PIT",
                        siteId: site.id,
                        pitId: pit.id,
                        fields: { kind },
                      });
                  }}
                />
                {!!error?.pitErrors[pit.id]?.kind && (
                  <Text style={[s.text, { color: c.error }]}>
                    {error.pitErrors[pit.id].kind}
                  </Text>
                )}
                <PrimaryButton
                  secondary
                  title={`Remove pit / bench ${i + 1}`}
                  onPress={() =>
                    setRemoval({
                      name: pit.name.trim() || `Pit / Bench ${i + 1}`,
                      command: {
                        type: "REMOVE_PIT",
                        siteId: site.id,
                        pitId: pit.id,
                        confirmed: true,
                      },
                    })
                  }
                />
              </View>
            ))}
            <PrimaryButton
              secondary
              title="Add Pit / Bench"
              onPress={() => send({ type: "ADD_PIT", siteId: site.id })}
            />
            {!site.isPrimary && (
              <PrimaryButton
                secondary
                title="Remove Quarry"
                onPress={() =>
                  setRemoval({
                    name: site.name.trim() || "Additional Quarry",
                    command: {
                      type: "REMOVE_SITE",
                      siteId: site.id,
                      confirmed: true,
                    },
                  })
                }
              />
            )}
          </View>
        );
      })}
      {draft.multiSiteEnabled && (
        <PrimaryButton
          secondary
          title="Add Quarry"
          onPress={() => send({ type: "ADD_SITE" })}
        />
      )}
      {attempted && !validation.valid && (
        <Text accessibilityRole="alert" style={[s.text, { color: c.error }]}>
          {validation.issue ||
            "Complete the highlighted quarry and pit details before continuing."}
        </Text>
      )}
      <Text style={s.muted}>
        Save Draft can keep incomplete details for this session. Saving does not
        mean the configuration is ready for activation.
      </Text>
      <Modal
        visible={!!removal}
        transparent
        animationType="fade"
        onRequestClose={() => setRemoval(null)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 24,
            backgroundColor: "#18212699",
          }}
        >
          <ScrollView
            style={{
              maxHeight: "85%",
              width: "100%",
              maxWidth: 480,
              alignSelf: "center",
            }}
            contentContainerStyle={s.card}
            accessibilityViewIsModal
          >
            <Text accessibilityRole="header" style={s.heading}>
              Remove entry?
            </Text>
            <Text style={s.text}>
              Remove {removal?.name} from this demo draft? Referenced entries
              cannot be removed.
            </Text>
            {removal?.command.type === "REMOVE_SITE" && (
              <Text style={s.text}>
                Its pits and benches will also be removed from the draft.
              </Text>
            )}
            <PrimaryButton
              secondary
              title="Cancel"
              onPress={() => setRemoval(null)}
            />
            <PrimaryButton
              title="Confirm removal"
              onPress={() => {
                if (removal) send(removal.command);
                setRemoval(null);
              }}
            />
          </ScrollView>
        </View>
      </Modal>
    </OnboardingStepLayout>
  );
}
