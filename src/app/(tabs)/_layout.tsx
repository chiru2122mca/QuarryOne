import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors as c } from "../../config/theme";
const tabs = [
  { name: "home", label: "Home", icon: "⌂" },
  { name: "production", label: "Production", icon: "▥" },
  { name: "dispatch", label: "Dispatch", icon: "⇥" },
  { name: "sales", label: "Sales", icon: "₹" },
  { name: "more", label: "More", icon: "☰" },
];
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.orange,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          height: 68 + insets.bottom,
          paddingBottom: Math.max(8, insets.bottom),
          paddingTop: 8,
          backgroundColor: "white",
          borderTopColor: c.line,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.label,
            tabBarIcon: ({ focused }) => (
              <Text
                style={{ fontSize: 25, color: focused ? c.orange : c.muted }}
              >
                {t.icon}
              </Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
