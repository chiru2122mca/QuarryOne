import { View, Text } from "react-native";
import { router } from "expo-router";
import { Screen, Brand, PrimaryButton, s } from "../components/ui";
import { colors as c } from "../config/theme";
export default function Splash() {
  return (
    <Screen>
      <View
        style={{
          minHeight: 640,
          justifyContent: "space-between",
          paddingVertical: 48,
        }}
      >
        <Brand large />
        <View>
          <View
            style={{
              height: 180,
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 8,
              marginBottom: 32,
            }}
          >
            {[70, 120, 160, 100].map((h, i) => (
              <View
                key={i}
                style={{
                  height: h,
                  flex: 1,
                  backgroundColor: i === 2 ? c.orange : c.primary,
                  borderTopLeftRadius: 10,
                  borderTopRightRadius: 10,
                }}
              />
            ))}
          </View>
          <Text style={[s.title, { fontSize: 38, lineHeight: 44 }]}>
            A stronger day.{"\n"}From the ground up.
          </Text>
          <Text style={[s.muted, { marginTop: 16 }]}>
            Your quarry operations, in one place.
          </Text>
        </View>
        <View style={{ gap: 14 }}>
          <PrimaryButton
            title="Get started →"
            onPress={() => router.replace("/login")}
          />
          <Text style={[s.muted, { textAlign: "center" }]}>
            Version 0.1 · Static prototype
          </Text>
        </View>
      </View>
    </Screen>
  );
}
