import { useState } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import {
  Screen,
  AppHeader,
  KpiCard,
  ListCard,
  StatusChip,
  SelectField,
  PrimaryButton,
  EmptyState,
  DemoNote,
  s,
} from "../components/ui";
import { mockProduction } from "../data/mockProduction";
import { mockSales } from "../data/mockSales";
import { mockDispatch } from "../data/mockDispatch";
import { mockExpenses } from "../data/mockExpenses";
import { overview as o, money, lakh } from "../data/overview";
export default function Lists({
  kind,
}: {
  kind: "production" | "sales" | "dispatch" | "expenses";
}) {
  const [date, setDate] = useState("24 September 2026"),
    [filter, setFilter] = useState("All");
  const title = kind[0].toUpperCase() + kind.slice(1);
  const route =
    kind === "production"
      ? "/add-production"
      : kind === "sales"
        ? "/new-sale"
        : kind === "dispatch"
          ? "/new-dispatch"
          : "/add-expense";
  const productions = mockProduction.filter(
    (p) => p.date === date && (filter === "All" || p.pit === filter),
  );
  const expenses = mockExpenses.filter(
    (e) => filter === "All" || e.category === filter,
  );
  return (
    <Screen>
      <AppHeader
        title={title}
        subtitle="September 2026 · Demo records"
        back={kind === "expenses"}
        action={<PrimaryButton title="+" onPress={() => router.push(route)} />}
      />
      <View style={s.grid}>
        <KpiCard
          dark
          label={
            kind === "sales"
              ? "September Sales"
              : kind === "dispatch"
                ? "Total Dispatch"
                : kind === "expenses"
                  ? "Today's expenses"
                  : "Today's production"
          }
          value={
            kind === "sales"
              ? lakh(o.monthSales)
              : kind === "dispatch"
                ? "1,020 Tons"
                : kind === "expenses"
                  ? money(o.expenses)
                  : "125 Tons"
          }
        />
        <KpiCard
          label={
            kind === "production"
              ? "Active pits"
              : kind === "expenses"
                ? "Entries"
                : "Today"
          }
          value={
            kind === "production"
              ? "02"
              : kind === "expenses"
                ? "04"
                : kind === "sales"
                  ? lakh(o.sales)
                  : "92 Tons"
          }
        />
      </View>
      {kind === "production" ? (
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <SelectField
              label="Date"
              value={date}
              options={["24 September 2026", "23 September 2026"]}
              onChange={setDate}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SelectField
              label="Pit"
              value={filter}
              options={["All", "Pit A", "Pit B"]}
              onChange={setFilter}
            />
          </View>
        </View>
      ) : (
        <SelectField
          label="Filter records"
          value={filter}
          options={[
            "All",
            ...(kind === "sales"
              ? ["PAID", "PARTIAL", "CREDIT"]
              : kind === "dispatch"
                ? ["LOADED", "DISPATCHED", "DELIVERED"]
                : [
                    "Diesel",
                    "Labour",
                    "Machinery",
                    "Repairs",
                    "Blasting",
                    "Transport",
                    "Electricity",
                    "Other",
                  ]),
          ]}
          onChange={setFilter}
        />
      )}
      {kind === "production" &&
        (productions.length ? (
          productions.map((p) => (
            <ListCard key={p.id}>
              <View style={s.between}>
                <Text style={s.heading}>
                  {p.pit} · {p.grade}
                </Text>
                <Text style={s.heading}>{p.quantity} Tons</Text>
              </View>
              <Text style={s.text}>{p.material}</Text>
              <Text style={s.muted}>{p.date}</Text>
              <View style={s.between}>
                <Text style={s.muted}>{p.shift} shift</Text>
                <Text style={s.muted}>Supervisor: {p.supervisor}</Text>
              </View>
            </ListCard>
          ))
        ) : (
          <EmptyState message="Try another date or pit." />
        ))}
      {(kind === "sales" || kind === "dispatch") &&
        (kind === "sales" ? mockSales : mockDispatch)
          .filter((d) => filter === "All" || d.status === filter)
          .map((d) => (
            <ListCard key={d.id}>
              <View style={s.between}>
                <Text
                  style={{ fontSize: 13, fontWeight: "700", color: "#66747C" }}
                >
                  {d.id}
                </Text>
                <StatusChip status={d.status} />
              </View>
              <Text style={s.heading}>{d.customer}</Text>
              <Text style={s.muted}>
                {d.material} · {d.quantity} Tons
              </Text>
              {"vehicle" in d && (
                <Text style={s.text}>{String(d.vehicle)}</Text>
              )}
              <Text style={[s.heading, { alignSelf: "flex-end" }]}>
                {money(d.amount)}
              </Text>
            </ListCard>
          ))}
      {kind === "expenses" &&
        (expenses.length ? (
          expenses.map((e) => (
            <ListCard key={e.id}>
              <View style={s.between}>
                <Text style={s.heading}>{e.category}</Text>
                <Text style={s.heading}>{money(e.amount)}</Text>
              </View>
              <Text style={s.text}>
                {e.machine} · {e.vendor}
              </Text>
              <Text style={s.muted}>
                {e.details} · {e.date}
              </Text>
            </ListCard>
          ))
        ) : (
          <EmptyState message="No mock expenses in this category." />
        ))}
      <DemoNote />
    </Screen>
  );
}
