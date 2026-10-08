import { useState } from "react";
import { Modal, Text, View } from "react-native";
import { router } from "expo-router";
import {
  AppHeader,
  DemoNote,
  FormField,
  PrimaryButton,
  Screen,
  SelectField,
  s,
} from "../components/ui";
import { mockPits, mockQuarries } from "../data/blocks/referenceData";
import { useMockOperations } from "../stores/useMockOperations";
import { colors as c } from "../config/theme";
import { formatVolume } from "../domain/blocks/volume";
import {
  createProductionSubmission,
  localProductionDate,
  previewProductionVolume,
} from "../features/production/model";
import type { ProductionDraft } from "../features/production/model";
import type {
  DimensionUnit,
  GraniteBlock,
  GraniteGrade,
  GraniteMaterial,
} from "../domain/blocks/types";

export default function AddBlockProduction() {
  const { addBlock } = useMockOperations();
  const [draft, setDraft] = useState<ProductionDraft>(() => ({
    productionDate: localProductionDate(),
    quarryId: mockQuarries[0].id,
    pitId: mockPits[0].id,
    material: "Black Granite",
    grade: "A",
    length: "",
    width: "",
    height: "",
    unit: "FT",
    stockyardLocation: "",
    supervisor: "Ramesh",
    remarks: "",
  }));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<GraniteBlock | null>(null);
  const [submission] = useState(() => createProductionSubmission(addBlock));
  const preview = previewProductionVolume(draft);
  const change = <K extends keyof ProductionDraft>(
    key: K,
    value: ProductionDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));
  function save() {
    try {
      const block = submission.save(draft);
      setError("");
      setSaved(block);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not save Production. Please try again.",
      );
    }
  }
  function finish() {
    if (saved) {
      setSaved(null);
      router.replace({
        pathname: "/(tabs)/production",
        params: { created: saved.id },
      });
    }
  }
  return (
    <Screen contentStyle={{ gap: 12 }}>
      <AppHeader
        title="Add Production"
        subtitle="Measure and record one granite block."
        back
      />
      <View style={[s.card, { padding: 16, gap: 14 }]}>
        <FormField
          label="Production Date (YYYY-MM-DD)"
          value={draft.productionDate}
          onChange={(value) => change("productionDate", value)}
        />
        <SelectField
          label="Quarry"
          value={mockQuarries.find((q) => q.id === draft.quarryId)?.name ?? ""}
          options={mockQuarries.map((q) => q.name)}
          onChange={(name) => {
            const quarry = mockQuarries.find((q) => q.name === name)!;
            setDraft((current) => ({
              ...current,
              quarryId: quarry.id,
              pitId: mockPits.find((p) => p.quarryId === quarry.id)!.id,
            }));
          }}
        />
        <SelectField
          label="Pit"
          value={mockPits.find((p) => p.id === draft.pitId)?.name ?? ""}
          options={mockPits
            .filter((p) => p.quarryId === draft.quarryId)
            .map((p) => p.name)}
          onChange={(name) =>
            change(
              "pitId",
              mockPits.find(
                (p) => p.name === name && p.quarryId === draft.quarryId,
              )!.id,
            )
          }
        />
        <SelectField
          label="Granite Material"
          value={draft.material}
          options={["Black Granite", "Grey Granite", "Tan Brown"]}
          onChange={(value) => change("material", value as GraniteMaterial)}
        />
        <SelectField
          label="Grade"
          value={draft.grade}
          options={["A", "B", "C"]}
          onChange={(value) => change("grade", value as GraniteGrade)}
        />
        <SelectField
          label="Dimension Unit"
          value={draft.unit}
          options={["FT", "M"]}
          onChange={(value) => change("unit", value as DimensionUnit)}
        />
        <FormField
          label={`Length (${draft.unit})`}
          value={draft.length}
          number
          onChange={(value) => change("length", value)}
        />
        <FormField
          label={`Width (${draft.unit})`}
          value={draft.width}
          number
          onChange={(value) => change("width", value)}
        />
        <FormField
          label={`Height (${draft.unit})`}
          value={draft.height}
          number
          onChange={(value) => change("height", value)}
        />
        <View testID="production-volume-preview" style={s.card}>
          <Text style={s.label}>Calculated volume</Text>
          {preview.valid ? (
            <>
              <Text style={s.heading}>
                {formatVolume(preview.volumeM3, "CFT", 2)} ≈{" "}
                {formatVolume(preview.volumeM3, "M3", 2)}
              </Text>
              <Text style={s.muted}>
                Measurements stay in the unit you enter.
              </Text>
            </>
          ) : (
            <Text
              style={[
                s.muted,
                !!(draft.length || draft.width || draft.height) && {
                  color: c.error,
                },
              ]}
            >
              {preview.error}
            </Text>
          )}
        </View>
        <FormField
          label="Stockyard Location"
          value={draft.stockyardLocation}
          onChange={(value) => change("stockyardLocation", value)}
        />
        <SelectField
          label="Supervisor"
          value={draft.supervisor}
          options={["Ramesh", "Suresh", "Venkat"]}
          onChange={(value) => change("supervisor", value)}
        />
        <FormField
          label="Remarks (optional)"
          value={draft.remarks}
          multiline
          onChange={(value) => change("remarks", value)}
        />
        {!!error && (
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: c.error, fontSize: 15 }}
          >
            {error}
          </Text>
        )}
        <PrimaryButton
          title="Save Production"
          disabled={!!saved}
          onPress={save}
        />
      </View>
      <DemoNote />
      <Modal
        visible={!!saved}
        transparent
        animationType="fade"
        onRequestClose={finish}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            backgroundColor: "#18212699",
            padding: 24,
          }}
        >
          <View style={[s.card, { gap: 16 }]}>
            <Text style={{ color: c.success, fontSize: 36 }}>✓</Text>
            <Text style={s.title}>Production saved</Text>
            <Text style={s.heading}>{saved?.blockNumber}</Text>
            <Text style={s.muted}>
              Block is AVAILABLE in this app session. Nothing is stored after an
              app reload.
            </Text>
            <PrimaryButton title="View Production" onPress={finish} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
