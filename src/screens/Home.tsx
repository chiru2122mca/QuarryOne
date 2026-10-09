import { useCallback, useEffect, useState } from "react";
import {
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { DarkAppHeader } from "../components/DarkAppHeader";
import { DemoNote, StatusChip, s } from "../components/ui";
import { workspace, colors as c } from "../config/theme";
import { overview as o, lakh, money } from "../data/overview";
import { mockDispatch } from "../data/mockDispatch";

function DashboardIcon({
  kind,
  dark = false,
}: {
  kind: "production" | "dispatch" | "sales" | "expense";
  dark?: boolean;
}) {
  const color = dark ? c.primary : c.orange;
  if (kind === "production")
    return (
      <View
        style={{
          width: 30,
          height: 30,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 23,
            height: 19,
            backgroundColor: c.muted,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: c.primary,
            transform: [{ rotate: "-10deg" }],
          }}
        >
          <View
            style={{
              height: 2,
              backgroundColor: c.line,
              marginTop: 5,
              marginHorizontal: 3,
            }}
          />
        </View>
      </View>
    );
  if (kind === "dispatch")
    return (
      <View style={{ width: 30, height: 30, justifyContent: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
          <View
            style={{
              width: 18,
              height: 15,
              backgroundColor: color,
              borderRadius: 2,
            }}
          />
          <View
            style={{
              width: 10,
              height: 11,
              borderWidth: 2,
              borderColor: color,
              borderTopRightRadius: 4,
            }}
          />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
          {[0, 1].map((i) => (
            <View
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: c.primary,
              }}
            />
          ))}
        </View>
      </View>
    );
  if (kind === "sales")
    return (
      <View
        style={{
          width: 30,
          height: 30,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 3,
          paddingBottom: 4,
        }}
      >
        {[10, 17, 23].map((height) => (
          <View
            key={height}
            style={{
              width: 5,
              height,
              backgroundColor: color,
              borderRadius: 1,
            }}
          />
        ))}
      </View>
    );
  return (
    <View
      style={{
        width: 28,
        height: 28,
        backgroundColor: c.error,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: c.card, fontSize: 21, fontWeight: "700" }}>₹</Text>
    </View>
  );
}
const h = StyleSheet.create({
  body: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  kpi: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: c.card,
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 106,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quick: {
    flex: 1,
    minWidth: 0,
    minHeight: 76,
    paddingHorizontal: 3,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 12,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  section: { fontSize: 17, fontWeight: "700", color: c.text },
});
export default function Home() {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setToday(new Date());
    const timer = setInterval(refresh, 60000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
  const hour = today.getHours();
  const greeting =
    hour >= 5 && hour < 12
      ? "Good Morning"
      : hour >= 12 && hour < 17
        ? "Good Afternoon"
        : "Good Evening";
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === "web") return;
      const entry = StatusBar.pushStackEntry({ barStyle: "light-content" });
      return () => StatusBar.popStackEntry(entry);
    }, []),
  );
  const kpis = [
    {
      label: "Production",
      value: String(o.production),
      caption: "Tons",
      kind: "production" as const,
    },
    {
      label: "Dispatch",
      value: String(o.dispatch),
      caption: "Tons",
      kind: "dispatch" as const,
    },
    {
      label: "Sales",
      value: lakh(o.sales),
      caption: "Today",
      kind: "sales" as const,
    },
    {
      label: "Expenses",
      value: money(o.expenses),
      caption: "Today",
      kind: "expense" as const,
    },
  ];
  const actions = [
    {
      label: "Production",
      kind: "production" as const,
      route: "/add-production" as const,
    },
    {
      label: "Dispatch",
      kind: "dispatch" as const,
      route: "/new-dispatch" as const,
    },
    { label: "New Sale", kind: "sales" as const, route: "/new-sale" as const },
    {
      label: "Expense",
      kind: "expense" as const,
      route: "/add-expense" as const,
    },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <DarkAppHeader onProfilePress={() => router.push("/profile")} />
      <SafeAreaView style={{ flex: 1 }} edges={["left", "right", "bottom"]}>
        <ScrollView
          contentContainerStyle={h.body}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.between}>
            <View style={{ flex: 1 }}>
              <Text style={s.muted}>{greeting},</Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "800",
                  color: c.text,
                  marginTop: 2,
                }}
              >
                {workspace.user}
              </Text>
              <Text
                accessibilityLabel="Current device date"
                style={[s.muted, { fontSize: 13, marginTop: 2 }]}
              >
                {today.toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Production pit filters"
              onPress={() => router.push("/(tabs)/production")}
              style={{
                minHeight: 48,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: c.line,
                borderRadius: 8,
                backgroundColor: c.card,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 14, color: c.text }}>All pits</Text>
              <Text style={s.muted}>⌄</Text>
            </Pressable>
          </View>
          <View testID="home-kpis" style={h.grid}>
            {kpis.map((kpi) => (
              <View key={kpi.label} style={h.kpi}>
                <DashboardIcon kind={kpi.kind} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 14, color: c.muted }}>
                    {kpi.label}
                  </Text>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    style={{
                      fontSize: kpi.kind === "expense" ? 21 : 24,
                      fontWeight: "800",
                      color: c.text,
                      marginTop: 4,
                    }}
                  >
                    {kpi.value}
                  </Text>
                  <Text style={{ fontSize: 14, color: c.muted, marginTop: 2 }}>
                    {kpi.caption}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <Text style={h.section}>Quick Actions</Text>
          <View testID="home-quick-actions" style={[s.row, { gap: 8 }]}>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={() => router.push(action.route)}
                style={({ pressed }) => [h.quick, pressed && { opacity: 0.75 }]}
              >
                <DashboardIcon kind={action.kind} />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: c.text,
                    textAlign: "center",
                    alignSelf: "stretch",
                  }}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={[s.between, { minHeight: 36 }]}>
            <Text style={h.section}>Recent Dispatches</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View all dispatches"
              onPress={() => router.push("/(tabs)/dispatch")}
              style={{ minHeight: 48, justifyContent: "center" }}
            >
              <Text
                style={{ color: "#A34E00", fontSize: 14, fontWeight: "600" }}
              >
                View All
              </Text>
            </Pressable>
          </View>
          <View testID="home-recent-dispatches" style={{ gap: 10 }}>
            {mockDispatch.slice(0, 2).map((d) => (
              <View
                key={d.id}
                style={[
                  s.card,
                  {
                    padding: 12,
                    borderRadius: 12,
                    gap: 10,
                    flexDirection: "row",
                    alignItems: "center",
                  },
                ]}
              >
                <DashboardIcon kind="dispatch" dark />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{ fontSize: 15, fontWeight: "700", color: c.text }}
                  >
                    {d.vehicle}
                  </Text>
                  <Text style={{ fontSize: 14, color: c.text, marginTop: 3 }}>
                    {d.customer}
                  </Text>
                  <Text style={{ fontSize: 13, color: c.muted, marginTop: 3 }}>
                    {d.material} · {d.quantity} Tons
                  </Text>
                </View>
                <View style={{ gap: 8, alignItems: "flex-end" }}>
                  <StatusChip status={d.status} />
                  <Text
                    style={{ fontSize: 15, fontWeight: "700", color: c.text }}
                  >
                    {money(d.amount)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <View style={[s.card, { padding: 12, gap: 12 }]}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.text }}>
              {workspace.name}
            </Text>
            <Text style={[s.muted, { fontSize: 13, marginTop: -6 }]}>
              {workspace.location}
            </Text>
            <View style={s.between}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View customer outstanding"
                onPress={() => router.push("/customers")}
                style={{ flex: 1, minHeight: 48, justifyContent: "center" }}
              >
                <Text style={s.muted}>Outstanding</Text>
                <Text style={s.heading}>{lakh(o.outstanding)}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open Block Inventory"
                onPress={() => router.push("/stock")}
                style={{ flex: 1, minHeight: 48, justifyContent: "center" }}
              >
                <Text style={s.muted}>Stock</Text>
                <Text style={s.heading}>
                  {o.stock.toLocaleString("en-IN")} Tons
                </Text>
              </Pressable>
            </View>
          </View>
          <DemoNote />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
