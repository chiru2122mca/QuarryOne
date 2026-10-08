import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Screen, AppHeader, Brand, s } from "../components/ui";
import { branding, workspace, colors as c } from "../config/theme";
const items = [
  {
    label: "Stock",
    route: "/stock",
    icon: "▤",
    note: "Materials & available inventory",
  },
  {
    label: "Expenses",
    route: "/expenses",
    icon: "↗",
    note: "Track the cost of operations",
  },
  {
    label: "Customers",
    route: "/customers",
    icon: "♙",
    note: "Sales, collections & outstanding",
  },
  {
    label: "Reports",
    route: "/reports",
    icon: "▥",
    note: "A clear view of your quarry",
  },
  {
    label: "Profile",
    route: "/profile",
    icon: "○",
    note: "Your workspace details",
  },
  {
    label: "Settings",
    route: "/settings",
    icon: "⚙",
    note: "Preferences & app information",
  },
] as const;
export default function More() {
  return (
    <Screen contentStyle={{ gap: 12 }}>
      <AppHeader title="More" subtitle="Everything else, in one place." />
      <View style={[s.card, { backgroundColor: c.primary }]}>
        <Text style={{ color: "white", fontSize: 22, fontWeight: "700" }}>
          {workspace.user}
        </Text>
        <Text style={{ color: "#CFD8DC" }}>
          Quarry Manager · {workspace.name}
        </Text>
      </View>
      {items.map((i) => (
        <Pressable
          key={i.label}
          accessibilityRole="button"
          onPress={() => router.push(i.route)}
          style={[
            s.card,
            s.row,
            { minHeight: 66, paddingVertical: 10, paddingHorizontal: 16 },
          ]}
        >
          <Text style={s.icon}>{i.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.heading}>{i.label}</Text>
            <Text style={s.muted}>{i.note}</Text>
          </View>
          <Text style={s.muted}>›</Text>
        </Pressable>
      ))}
      <View style={{ alignItems: "center", padding: 20, gap: 8 }}>
        <Brand />
        <Text style={s.muted}>Version {branding.version}</Text>
        <Text style={s.muted}>{branding.tagline}</Text>
      </View>
    </Screen>
  );
}
