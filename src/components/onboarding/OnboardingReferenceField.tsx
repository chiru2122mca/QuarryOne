import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { PrimaryButton, s } from "../ui";
import { colors as c } from "../../config/theme";

/** Option labels may change or repeat. Selection always returns the stable option ID. */
export function OnboardingReferenceField({
  label,
  value,
  options,
  onChange,
  required,
  error,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
  required?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>
        {label}
        {required ? " *" : ""}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? "Choose an option"}`}
        accessibilityHint={
          error ?? (required ? "Required selection" : undefined)
        }
        aria-invalid={!!error || undefined}
        onPress={() => setOpen(true)}
        style={[
          s.input,
          s.between,
          { paddingVertical: 12 },
          !!error && { borderColor: c.error },
        ]}
      >
        <Text style={[s.text, { flex: 1 }]}>
          {selected?.label ?? "Choose an option"}
        </Text>
        <Text style={s.muted}>⌄</Text>
      </Pressable>
      {!!error && (
        <Text
          accessibilityLiveRegion="polite"
          style={[s.text, { color: c.error }]}
        >
          {error}
        </Text>
      )}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 24,
            backgroundColor: "#18212699",
          }}
        >
          <View
            style={[
              s.card,
              {
                width: "100%",
                maxWidth: 480,
                alignSelf: "center",
                maxHeight: "85%",
              },
            ]}
            accessibilityViewIsModal
          >
            <Text style={s.heading}>{label}</Text>
            <ScrollView
              style={{ flexGrow: 0 }}
              keyboardShouldPersistTaps="handled"
            >
              {options.map((option) => (
                <Pressable
                  key={option.id}
                  testID={`reference-option-${option.id || "shared"}`}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  onPress={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                  style={{
                    minHeight: 54,
                    justifyContent: "center",
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderColor: c.line,
                  }}
                >
                  <Text style={s.text}>
                    {option.label}
                    {value === option.id ? "  ✓" : ""}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <PrimaryButton
              title="Cancel"
              secondary
              onPress={() => setOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
