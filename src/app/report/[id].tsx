import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { Screen, AppHeader, ListCard, s } from "../../components/ui";
import { reportNames } from "../../data/overview";
export default function Report() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen>
      <AppHeader
        title={reportNames[Number(id)] ?? "Report"}
        subtitle="September 2026"
        back
      />
      <ListCard>
        <Text style={{ fontSize: 48, color: "#F57C00" }}>▥</Text>
        <Text style={s.heading}>Your reports start here</Text>
        <Text style={s.muted}>
          This is a static report placeholder. Date ranges, detailed summaries
          and export will be introduced in a future milestone.
        </Text>
        <Text style={s.muted}>
          No report calculations or accounting engine are connected.
        </Text>
      </ListCard>
    </Screen>
  );
}
