import { useEffect, useState } from "react";
import { AppState, View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import {
  Screen,
  Brand,
  KpiCard,
  SectionHeader,
  QuickActionCard,
  ListCard,
  StatusChip,
  DemoNote,
  s,
} from "../components/ui";
import { workspace, colors as c } from "../config/theme";
import { overview as o, lakh, money } from "../data/overview";
import { mockDispatch } from "../data/mockDispatch";
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
  return (
    <Screen contentStyle={{ gap: 12 }}>
      <View
        testID="home-header"
        style={[s.between, { height: 68, marginBottom: -4 }]}
      >
        <Brand />
        <View
          style={{
            backgroundColor: c.primary,
            borderRadius: 24,
            width: 46,
            height: 46,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>RK</Text>
        </View>
      </View>
      <View style={{ marginVertical: 2 }}>
        <Text style={s.muted}>Good Morning,</Text>
        <Text style={[s.title, { fontSize: 30 }]}>{workspace.user}</Text>
      </View>
      <View
        style={[s.card, { backgroundColor: c.primary, borderColor: c.primary }]}
      >
        <View style={s.between}>
          <Text
            style={{
              color: c.orangeLight,
              fontSize: 12,
              fontWeight: "800",
              letterSpacing: 1.5,
            }}
          >
            QUARRY WORKSPACE
          </Text>
          <Text style={{ color: "#CFD8DC", fontSize: 12 }}>DEMO</Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "white" }}>
          {workspace.name}
        </Text>
        <Text style={{ color: "#CFD8DC", fontSize: 14 }}>
          {workspace.location}
        </Text>
      </View>
      <SectionHeader title="Today's overview" />
      <Text
        accessibilityLabel="Current device date"
        style={[s.muted, { marginTop: -6 }]}
      >
        {today.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </Text>
      <View style={s.grid}>
        <KpiCard compact label="Production" value={`${o.production} Tons`} />
        <KpiCard
          compact
          label="Dispatch"
          value={`${o.dispatch} Tons`}
          icon="⇥"
        />
        <KpiCard compact label="Sales" value={lakh(o.sales)} icon="₹" />
        <KpiCard compact label="Expenses" value={money(o.expenses)} icon="↗" />
      </View>
      <View style={[s.card, s.between]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/customers")}
          style={{ flex: 1, minHeight: 54 }}
        >
          <Text style={s.muted}>Outstanding</Text>
          <Text style={[s.heading, { marginTop: 6, color: "#A34E00" }]}>
            {lakh(o.outstanding)}
          </Text>
        </Pressable>
        <View style={{ height: 45, width: 1, backgroundColor: c.line }} />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/stock")}
          style={{ flex: 1, minHeight: 54, paddingLeft: 12 }}
        >
          <Text style={s.muted}>Stock</Text>
          <Text style={[s.heading, { marginTop: 6 }]}>
            {o.stock.toLocaleString("en-IN")} Tons
          </Text>
        </Pressable>
      </View>
      <SectionHeader title="Quick actions" />
      <View style={[s.row, { gap: 8 }]}>
        <QuickActionCard
          title="Production"
          icon="+"
          onPress={() => router.push("/add-production")}
        />
        <QuickActionCard
          title="Dispatch"
          icon="⇥"
          onPress={() => router.push("/new-dispatch")}
        />
        <QuickActionCard
          title="New Sale"
          icon="₹"
          onPress={() => router.push("/new-sale")}
        />
        <QuickActionCard
          title="Expense"
          icon="↗"
          onPress={() => router.push("/add-expense")}
        />
      </View>
      <SectionHeader
        title="Recent dispatches"
        action="View all"
        onPress={() => router.push("/(tabs)/dispatch")}
      />
      {mockDispatch.slice(0, 2).map((d) => (
        <ListCard key={d.id}>
          <View style={s.between}>
            <Text style={s.heading}>{d.vehicle}</Text>
            <Text style={s.heading}>{d.quantity} T</Text>
          </View>
          <Text style={s.text}>{d.customer}</Text>
          <Text style={s.muted}>
            {d.material} · {money(d.amount)}
          </Text>
          <StatusChip status={d.status} />
        </ListCard>
      ))}
      <DemoNote />
    </Screen>
  );
}
