import { Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Screen, AppHeader, s } from "../components/ui";
import { reportNames } from "../data/overview";
export default function Reports() {
  return (
    <Screen>
      <AppHeader
        title="Reports"
        subtitle="From daily activity to the bigger picture"
        back
      />
      {reportNames.map((name, index) => (
        <Pressable
          accessibilityRole="button"
          key={name}
          style={[s.card, s.between, { minHeight: 72 }]}
          onPress={() =>
            router.push({
              pathname: "/report/[id]",
              params: { id: String(index) },
            })
          }
        >
          <Text style={[s.heading, { flex: 1 }]}>{name}</Text>
          <Text style={s.muted}>›</Text>
        </Pressable>
      ))}
    </Screen>
  );
}
