import { View, Text } from "react-native";
import { Screen, AppHeader, ListCard, DemoNote, s } from "../components/ui";
import { mockCustomers } from "../data/mockCustomers";
import { money, lakh } from "../data/overview";
export default function Customers() {
  return (
    <Screen>
      <AppHeader
        title="Customers"
        subtitle="04 customers · Demo accounts"
        back
      />
      <ListCard>
        <Text style={s.muted}>Total outstanding</Text>
        <Text style={s.title}>
          {lakh(mockCustomers.reduce((sum, c) => sum + c.outstanding, 0))}
        </Text>
      </ListCard>
      {mockCustomers.map((c) => (
        <ListCard key={c.name}>
          <Text style={s.heading}>{c.name}</Text>
          <View style={s.between}>
            <Text style={s.muted}>Total Sales</Text>
            <Text style={s.text}>{money(c.sales)}</Text>
          </View>
          <View style={s.between}>
            <Text style={s.muted}>Payments Received</Text>
            <Text style={s.text}>{money(c.received)}</Text>
          </View>
          <View style={s.between}>
            <Text style={s.text}>Outstanding</Text>
            <Text style={[s.heading, { color: "#A34E00" }]}>
              {money(c.outstanding)}
            </Text>
          </View>
        </ListCard>
      ))}
      <DemoNote />
    </Screen>
  );
}
