import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors as c, branding } from "../config/theme";
import { QuarryOneLogo } from "./QuarryOneLogo";
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 16,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: c.text,
    letterSpacing: -0.6,
  },
  heading: { fontSize: 19, fontWeight: "700", color: c.text },
  text: { fontSize: 16, color: c.text },
  muted: { fontSize: 14, color: c.muted, lineHeight: 21 },
  card: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: c.line,
    gap: 10,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  button: {
    minHeight: 54,
    minWidth: 54,
    borderRadius: 12,
    backgroundColor: c.orange,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  buttonText: { fontSize: 16, fontWeight: "800", color: c.dark },
  input: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: "#AAB4B5",
    borderRadius: 10,
    minHeight: 54,
    paddingHorizontal: 14,
    fontSize: 16,
    color: c.text,
  },
  label: { fontSize: 15, fontWeight: "600", color: c.text, marginBottom: 8 },
  icon: { fontSize: 23, color: c.orange, fontWeight: "700" },
});
export function Screen({
  children,
  contentStyle,
  header,
}: {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  header?: React.ReactNode;
}) {
  return (
    <View style={s.screen}>
      {header}
      <SafeAreaView
        style={s.screen}
        edges={
          header
            ? ["left", "right", "bottom"]
            : ["top", "left", "right", "bottom"]
        }
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={[
              s.content,
              !!header && { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
              contentStyle,
            ]}
            testID={header ? "operational-content" : undefined}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
export function Brand({ large = false }: { large?: boolean }) {
  return (
    <View style={{ gap: 8, alignItems: large ? "center" : "flex-start" }}>
      <QuarryOneLogo variant={large ? "login" : "header"} />
      {large && <Text style={s.muted}>{branding.tagline}</Text>}
    </View>
  );
}
export function AppHeader({
  title,
  subtitle,
  back = false,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <View style={s.between}>
      <View style={{ flex: 1 }}>
        {back && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={{ minHeight: 48, justifyContent: "center" }}
          >
            <Text style={s.text}>← Back</Text>
          </Pressable>
        )}
        <Text style={s.title}>{title}</Text>
        {subtitle && (
          <Text style={[s.muted, { marginTop: 5 }]}>{subtitle}</Text>
        )}
      </View>
      {action}
    </View>
  );
}
export function PrimaryButton({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && {
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.line,
        },
        pressed && { opacity: 0.75 },
        disabled && { opacity: 0.6 },
      ]}
    >
      <Text style={s.buttonText}>{title}</Text>
    </Pressable>
  );
}
export function KpiCard({
  label,
  value,
  icon = "▥",
  dark = false,
  compact = false,
}: {
  label: string;
  value: string;
  icon?: string;
  dark?: boolean;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        s.card,
        { width: "47%", flexGrow: 1 },
        compact && { paddingVertical: 13, gap: 6 },
        dark && { backgroundColor: c.primary, borderColor: c.primary },
      ]}
    >
      <View style={s.between}>
        <Text style={[s.muted, { flex: 1 }, dark && { color: "#CFD8DC" }]}>
          {label}
        </Text>
        <Text style={s.icon}>{icon}</Text>
      </View>
      <Text
        numberOfLines={compact ? 1 : undefined}
        adjustsFontSizeToFit={compact}
        minimumFontScale={0.8}
        style={{
          fontSize: compact ? 22 : 25,
          fontWeight: "800",
          color: dark ? "white" : c.text,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
export function SectionHeader({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={s.between}>
      <Text style={s.heading}>{title}</Text>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ minHeight: 48, justifyContent: "center" }}
        >
          <Text style={{ color: "#A34E00", fontSize: 14, fontWeight: "700" }}>
            {action} →
          </Text>
        </Pressable>
      )}
    </View>
  );
}
export function StatusChip({ status }: { status: string }) {
  const good = ["PAID", "DELIVERED", "DISPATCHED", "AVAILABLE"].includes(
    status,
  );
  const rejected = status === "REJECTED";
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: rejected ? "#FBE9E7" : good ? "#E8F3E9" : "#FFF3D8",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "800",
          color: rejected ? c.error : good ? c.success : "#805400",
        }}
      >
        {status}
      </Text>
    </View>
  );
}
export function ListCard({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}
export function QuickActionCard({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={[
        s.card,
        {
          flex: 1,
          minWidth: 0,
          minHeight: 76,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 2,
          paddingVertical: 8,
          gap: 6,
        },
      ]}
    >
      <Text style={s.icon}>{icon}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: c.text,
          textAlign: "center",
          alignSelf: "stretch",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function EmptyState({ message }: { message: string }) {
  return (
    <ListCard>
      <Text style={s.heading}>No records</Text>
      <Text style={s.muted}>{message}</Text>
    </ListCard>
  );
}
export function FormField({
  label,
  value,
  onChange,
  number = false,
  multiline = false,
  secure = false,
  uppercase = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  number?: boolean;
  multiline?: boolean;
  secure?: boolean;
  uppercase?: boolean;
}) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[
          s.input,
          multiline && {
            height: 100,
            textAlignVertical: "top",
            paddingTop: 14,
          },
        ]}
        value={value}
        onChangeText={(text) => onChange(uppercase ? text.toUpperCase() : text)}
        autoCapitalize={
          uppercase ? "characters" : number ? "none" : "sentences"
        }
        autoCorrect={!uppercase && !number && !secure}
        keyboardType={number ? "decimal-pad" : "default"}
        secureTextEntry={secure}
        multiline={multiline}
      />
    </View>
  );
}
export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label + ": " + value}
        onPress={() => setOpen(true)}
        style={[s.input, s.between]}
      >
        <Text style={[s.text, { flex: 1 }]}>{value}</Text>
        <Text style={s.muted}>⌄</Text>
      </Pressable>
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
            backgroundColor: "#18212699",
            padding: 24,
          }}
        >
          <View style={s.card}>
            <Text style={s.heading}>{label}</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {options.map((o) => (
                <Pressable
                  key={o}
                  accessibilityRole="button"
                  onPress={() => {
                    onChange(o);
                    setOpen(false);
                  }}
                  style={{
                    minHeight: 54,
                    justifyContent: "center",
                    borderBottomWidth: 1,
                    borderBottomColor: c.line,
                  }}
                >
                  <Text
                    style={[
                      s.text,
                      o === value && { color: "#A34E00", fontWeight: "700" },
                    ]}
                  >
                    {o}
                    {o === value ? "  ✓" : ""}
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
export function DemoNote() {
  return (
    <Text style={[s.muted, { fontSize: 12 }]}>
      Demo workspace · Local mock data
    </Text>
  );
}
