import { View, Text } from "react-native";
import { router } from "expo-router";
import { Screen, PrimaryButton, s } from "../components/ui";
import { QuarryOneLogo } from "../components/QuarryOneLogo";
import { colors as c, branding } from "../config/theme";
export default function Splash() {
  return (
    <Screen contentStyle={{ flexGrow: 1, paddingBottom: 20 }}>
      <View
        style={{
          flexGrow: 1,
          justifyContent: "space-between",
          paddingVertical: 12,
          gap: 20,
        }}
      >
        <View style={{ alignItems: "center", gap: 8 }}>
          <QuarryOneLogo variant="welcome" />
          <Text style={s.muted}>{branding.tagline}</Text>
        </View>
        <View>
          <View
            style={{
              height: 80,
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {[35, 60, 80, 50].map((h, i) => (
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
          <Text style={[s.title, { fontSize: 30, lineHeight: 36 }]}>
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
            Version 0.2 · Static prototype
          </Text>
        </View>
      </View>
    </Screen>
  );
}
