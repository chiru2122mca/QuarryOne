import { OperationalHeader } from "../components/OperationalHeader";
import { useState } from "react";
import { View, Text, Modal } from "react-native";
import { router } from "expo-router";
import {
  Screen,
  FormField,
  SelectField,
  PrimaryButton,
  DemoNote,
  s,
} from "../components/ui";
import { forms } from "../data/forms";
import { money } from "../data/overview";
import { colors as c } from "../config/theme";
export default function EntryForm({
  kind,
}: {
  kind: "production" | "sale" | "dispatch" | "expense";
}) {
  const config = forms[kind];
  const [values, setValues] = useState<Record<string, string>>(() =>
      Object.fromEntries(
        config.fields.map((f) => [f.key, f.initial ?? f.options?.[0] ?? ""]),
      ),
    ),
    [remarks, setRemarks] = useState(""),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const total = Number(values.quantity) * Number(values.rate);
  function save() {
    const invalid = config.fields.find(
      (f) =>
        !values[f.key]?.trim() ||
        (f.number &&
          (!Number.isFinite(Number(values[f.key])) ||
            Number(values[f.key]) <= 0)),
    );
    if (invalid) {
      setError("Enter a valid " + invalid.label.toLowerCase() + ".");
      return;
    }
    setError("");
    setSaved(true);
  }
  function finish() {
    setSaved(false);
    router.replace(
      kind === "production"
        ? "/(tabs)/production"
        : kind === "sale"
          ? "/(tabs)/sales"
          : kind === "dispatch"
            ? "/(tabs)/dispatch"
            : "/expenses",
    );
  }
  return (
    <Screen
      contentStyle={{ gap: 12 }}
      header={
        <OperationalHeader
          title={config.title}
          back
          fallback={
            kind === "sale"
              ? "/sales"
              : kind === "dispatch"
                ? "/dispatch"
                : kind === "expense"
                  ? "/expenses"
                  : "/production"
          }
        />
      }
    >
      <Text style={s.muted}>{"Keep your day's operations on track."}</Text>
      <View style={[s.card, { gap: 14, padding: 16 }]}>
        {config.fields.map((f) => (
          <View key={f.key}>
            {f.options ? (
              <SelectField
                label={f.label}
                value={values[f.key]}
                options={f.options}
                onChange={(v) => setValues({ ...values, [f.key]: v })}
              />
            ) : (
              <FormField
                label={f.label}
                value={values[f.key]}
                onChange={(v) => setValues({ ...values, [f.key]: v })}
                number={f.number}
                uppercase={f.key === "vehicle"}
              />
            )}
          </View>
        ))}
        {kind === "sale" && (
          <View style={[s.card, { backgroundColor: "#FFF3E4" }]}>
            <Text style={s.muted}>Total Amount</Text>
            <Text style={s.title}>
              {money(Number.isFinite(total) ? total : 0)}
            </Text>
            <Text style={s.muted}>
              {values.quantity || "0"} Tons × {money(Number(values.rate) || 0)}
            </Text>
          </View>
        )}
        <FormField
          label="Remarks (optional)"
          value={remarks}
          onChange={setRemarks}
          multiline
        />
        {kind === "expense" && (
          <View
            style={[s.card, { borderStyle: "dashed", alignItems: "center" }]}
          >
            <Text style={s.heading}>＋ Upload Bill / Add Photo</Text>
            <Text style={s.muted}>
              Visual placeholder · Available in a later phase
            </Text>
          </View>
        )}
        {!!error && (
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: c.error, fontSize: 15 }}
          >
            {error}
          </Text>
        )}
        <PrimaryButton title={config.button} onPress={save} />
      </View>
      <DemoNote />
      <Modal
        visible={saved}
        transparent
        animationType="fade"
        onRequestClose={finish}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#18212699",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View style={[s.card, { gap: 20 }]}>
            <Text style={{ color: c.success, fontSize: 40 }}>✓</Text>
            <Text style={s.title}>
              {kind === "dispatch" ? "Challan generated" : "Saved successfully"}
            </Text>
            {kind === "dispatch" && (
              <Text style={s.heading}>DC-2026-00124</Text>
            )}
            <Text style={s.muted}>
              Saved for this demonstration. No data is persisted.
            </Text>
            <PrimaryButton title="Done" onPress={finish} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
