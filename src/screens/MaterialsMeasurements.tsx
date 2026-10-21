import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { FormField, PrimaryButton, SelectField, s } from "../components/ui";
import { OnboardingStepLayout } from "../components/onboarding/OnboardingStepLayout";
import { OnboardingReferenceField } from "../components/onboarding/OnboardingReferenceField";
import { useOnboardingDraft } from "../features/onboarding/OnboardingProvider";
import {
  measurementExample,
  supportedGrades,
  supportedMaterials,
  validateMaterialsSetup,
} from "../features/onboarding/materialsSetup";
import type { MaterialsCommand } from "../features/onboarding/materialsSetup";
import { colors as c } from "../config/theme";

export default function MaterialsMeasurements() {
  const { state, dispatch } = useOnboardingDraft();
  const [attempted, setAttempted] = useState(false);
  const [removalId, setRemovalId] = useState<string | null>(null);
  const draft = state.draft;
  const validation = validateMaterialsSetup(draft);
  const errors = attempted ? validation.errors : undefined;
  const send = (command: MaterialsCommand) =>
    dispatch({ type: "MATERIALS_COMMAND", command });
  const normalize = () => {
    send({ type: "NORMALIZE" });
    return true;
  };
  const single =
    !draft.multiSiteEnabled &&
    draft.sites.length === 1 &&
    draft.sites[0].isPrimary;
  const siteOptions = draft.sites.map((site) => ({
    id: site.id,
    label: `${site.name.trim() || "Unnamed quarry"} · ${site.code || "No code"}`,
  }));
  const errorText = (text?: string) =>
    text ? (
      <Text
        accessibilityLiveRegion="polite"
        style={[s.text, { color: c.error }]}
      >
        {text}
      </Text>
    ) : null;
  return (
    <OnboardingStepLayout
      step="materials"
      showPreferences={false}
      beforeContinue={() => {
        setAttempted(true);
        normalize();
        return validation.valid;
      }}
      beforeSave={normalize}
      onReset={() => {
        setAttempted(false);
        setRemovalId(null);
      }}
    >
      <Text style={s.muted}>
        Demo only. Materials, stockyards and preferences stay in this session,
        without Supabase persistence.
      </Text>
      <View style={[s.card, { padding: 16, gap: 12 }]}>
        <Text accessibilityRole="header" style={s.heading}>
          Materials *
        </Text>
        <Text style={s.muted}>
          Choose one or more supported granite materials.
        </Text>
        {supportedMaterials.map((material) => {
          const checked = draft.materials.some(
            (item) => item.name === material.name,
          );
          return (
            <Pressable
              key={material.id}
              accessibilityRole="checkbox"
              accessibilityLabel={material.name}
              accessibilityState={{ checked }}
              aria-checked={checked}
              onPress={() =>
                send({ type: "TOGGLE_MATERIAL", name: material.name })
              }
              style={[
                s.input,
                s.row,
                {
                  paddingVertical: 12,
                  borderColor: checked ? c.orange : c.line,
                },
              ]}
            >
              <Text style={[s.text, { flex: 1 }]}>
                {checked ? "☑ " : "☐ "}
                {material.name}
              </Text>
            </Pressable>
          );
        })}
        {errorText(errors?.materials)}
      </View>
      <View style={[s.card, { padding: 16, gap: 12 }]}>
        <Text accessibilityRole="header" style={s.heading}>
          Granite Grades
        </Text>
        <Text style={s.muted}>
          Grades A, B and C are fixed. Descriptions are optional.
        </Text>
        {supportedGrades.map((code) => (
          <FormField
            key={code}
            label={`Grade ${code} description`}
            value={
              draft.grades.find((grade) => grade.code === code)?.description ??
              ""
            }
            onChange={(description) =>
              send({ type: "EDIT_GRADE", code, description })
            }
          />
        ))}
        {errorText(errors?.grades)}
      </View>
      <View style={[s.card, { padding: 16, gap: 12 }]}>
        <Text accessibilityRole="header" style={s.heading}>
          Stockyards *
        </Text>
        <Text style={s.muted}>
          Configure at least one stockyard per quarry. Choose Entire quarry for
          a shared yard or select a dedicated pit/bench.
        </Text>
        {errorText(errors?.quarries)}
        {draft.sites.map((site) => (
          <View key={site.id}>
            <Text style={s.text}>
              {site.name.trim() || "Unnamed quarry"} · {site.code || "No code"}
            </Text>
            {errorText(errors?.sites[site.id])}
          </View>
        ))}
        {draft.stockyards.map((yard, index) => {
          const site = draft.sites.find((item) => item.id === yard.siteId);
          const error = errors?.stockyards[yard.id];
          return (
            <View
              key={yard.id}
              testID={`stockyard-${yard.id}`}
              style={{
                gap: 12,
                borderTopWidth: 1,
                borderColor: c.line,
                paddingTop: 12,
              }}
            >
              <Text accessibilityRole="header" style={s.heading}>
                Stockyard {index + 1}
              </Text>
              <FormField
                label="Stockyard Name"
                required
                value={yard.name}
                onChange={(name) =>
                  send({
                    type: "EDIT_STOCKYARD",
                    id: yard.id,
                    fields: { name },
                  })
                }
                error={error?.name}
              />
              {single && site ? (
                <Text style={s.text}>
                  Associated Quarry: {site.name || "Unnamed quarry"} ·{" "}
                  {site.code}
                </Text>
              ) : (
                <OnboardingReferenceField
                  label="Associated Quarry"
                  required
                  value={yard.siteId}
                  options={siteOptions}
                  onChange={(siteId) =>
                    send({
                      type: "EDIT_STOCKYARD",
                      id: yard.id,
                      fields: { siteId },
                    })
                  }
                  error={error?.siteId}
                />
              )}
              {!single && (
                <Text style={s.muted}>
                  Changing quarry resets the pit association to Entire quarry.
                </Text>
              )}
              <OnboardingReferenceField
                label="Associated Pit / Bench"
                value={yard.pitId ?? ""}
                options={[
                  { id: "", label: "Entire quarry (shared)" },
                  ...(site?.pits.map((pit) => ({
                    id: pit.id,
                    label: `${pit.name || "Unnamed pit / bench"} · ${pit.kind}`,
                  })) ?? []),
                ]}
                onChange={(pitId) =>
                  send({
                    type: "EDIT_STOCKYARD",
                    id: yard.id,
                    fields: { pitId: pitId || null },
                  })
                }
                error={error?.pitId}
              />
              <PrimaryButton
                secondary
                title="Remove Stockyard"
                onPress={() => setRemovalId(yard.id)}
              />
            </View>
          );
        })}
        <PrimaryButton
          secondary
          title="Add Stockyard"
          disabled={!draft.sites.length}
          onPress={() => send({ type: "ADD_STOCKYARD" })}
        />
        {errorText(errors?.identity)}
      </View>
      <View
        style={[s.card, { padding: 16, gap: 12 }]}
        testID="measurement-preferences"
      >
        <Text accessibilityRole="header" style={s.heading}>
          Measurement Preferences
        </Text>
        <SelectField
          label="Dimension Entry Unit"
          value={
            draft.preferences.dimensionUnit === "M" ? "Metres (M)" : "Feet (FT)"
          }
          options={["Feet (FT)", "Metres (M)"]}
          onChange={(value) =>
            send({
              type: "SET_PREFERENCES",
              fields: { dimensionUnit: value === "Metres (M)" ? "M" : "FT" },
            })
          }
        />
        <SelectField
          label="Volume Display Unit"
          value={
            draft.preferences.volumeDisplay === "M3"
              ? "Cubic Metres (m³)"
              : "Cubic Feet (CFT)"
          }
          options={["Cubic Feet (CFT)", "Cubic Metres (m³)"]}
          onChange={(value) =>
            send({
              type: "SET_PREFERENCES",
              fields: {
                volumeDisplay: value === "Cubic Metres (m³)" ? "M3" : "CFT",
              },
            })
          }
        />
        <Text style={s.text}>Currency: {draft.preferences.currency}</Text>
        <Text style={s.text}>Timezone: {draft.preferences.timezone}</Text>
        <Text style={s.text}>{measurementExample()}</Text>
        <Text style={s.muted}>
          This fixed FT example illustrates conversion. Canonical volume remains
          m³; changing draft preferences does not change existing Production or
          Inventory records.
        </Text>
        {errorText(errors?.preferences)}
      </View>
      {errorText(state.materialsIssue)}
      {attempted && !validation.valid && (
        <Text accessibilityRole="alert" style={[s.text, { color: c.error }]}>
          Complete the highlighted material, grade, quarry, stockyard and
          preference details before continuing.
        </Text>
      )}
      <Text style={s.muted}>
        Save Draft can retain incomplete setup for this session. Saving does not
        mean the business is ready for activation.
      </Text>
      <Modal
        visible={!!removalId}
        transparent
        animationType="fade"
        onRequestClose={() => setRemovalId(null)}
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
            <Text style={s.heading}>Remove stockyard?</Text>
            <Text style={s.text}>
              Remove{" "}
              {draft.stockyards
                .find((yard) => yard.id === removalId)
                ?.name.trim() || "this stockyard"}{" "}
              from the demo draft? Quarries and pits will be kept.
            </Text>
            <PrimaryButton
              secondary
              title="Cancel"
              onPress={() => setRemovalId(null)}
            />
            <PrimaryButton
              title="Confirm removal"
              onPress={() => {
                if (removalId)
                  send({
                    type: "REMOVE_STOCKYARD",
                    id: removalId,
                    confirmed: true,
                  });
                setRemovalId(null);
              }}
            />
          </ScrollView>
        </View>
      </Modal>
    </OnboardingStepLayout>
  );
}
