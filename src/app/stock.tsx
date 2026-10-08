import { View, Text } from "react-native";
import { Screen, AppHeader, ListCard, DemoNote, s } from "../components/ui";
import { mockStock } from "../data/mockStock";
import { colors as c } from "../config/theme";
export default function Stock() {
  const total = mockStock.reduce((n, x) => n + x.quantity, 0);
  return (
    <Screen>
      <AppHeader
        title="Stock"
        subtitle="Available material at the quarry"
        back
      />
      <View style={[s.card, { backgroundColor: c.primary }]}>
        <Text style={{ color: "#CFD8DC", fontSize: 16 }}>Total Stock</Text>
        <Text style={{ color: "white", fontSize: 36, fontWeight: "800" }}>
          {total.toLocaleString("en-IN")}{" "}
          <Text style={{ fontSize: 18 }}>Tons</Text>
        </Text>
      </View>
      {mockStock.map((x) => (
        <ListCard key={x.material + x.grade}>
          <View style={s.between}>
            <View style={{ flex: 1 }}>
              <Text style={s.heading}>{x.material}</Text>
              <Text style={s.muted}>{x.grade}</Text>
            </View>
            <Text style={s.heading}>{x.quantity} T</Text>
          </View>
          <View
            accessibilityLabel={`${x.quantity} tons, ${Math.round((x.quantity / total) * 100)} percent of stock`}
            style={{
              height: 9,
              backgroundColor: c.line,
              borderRadius: 5,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 9,
                width: `${(x.quantity / total) * 100}%`,
                backgroundColor: c.orange,
                borderRadius: 5,
              }}
            />
          </View>
          <Text style={s.muted}>
            {Math.round((x.quantity / total) * 100)}% of total inventory
          </Text>
        </ListCard>
      ))}
      <DemoNote />
    </Screen>
  );
}
