import { Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { QuarryOneLogo } from "./QuarryOneLogo";
import { branding, colors as c } from "../config/theme";

/** Opt-in Deep Slate header. Existing operational headers remain unchanged. */
export function DarkAppHeader({
  title,
  onBack,
  onProfilePress,
  actions,
  initials = "RK",
}: {
  title?: string;
  onBack?: () => void;
  onProfilePress?: () => void;
  actions?: ReactNode;
  initials?: string;
}) {
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ backgroundColor: c.primary }}
    >
      <View
        testID="home-header"
        style={{
          height: 56,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          width: "100%",
          maxWidth: 640,
          alignSelf: "center",
        }}
      >
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={{
              width: 48,
              height: 48,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: c.card, fontSize: 28 }}>‹</Text>
          </Pressable>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          {title ? (
            <Text
              numberOfLines={1}
              style={{ color: c.card, fontSize: 20, fontWeight: "700" }}
            >
              {title}
            </Text>
          ) : (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View
                importantForAccessibility="no-hide-descendants"
                accessibilityElementsHidden
              >
                <QuarryOneLogo variant="emblem" size={32} />
              </View>
              <Text
                accessibilityLabel={branding.name}
                style={{
                  color: c.card,
                  fontSize: 20,
                  fontWeight: "800",
                  letterSpacing: -0.5,
                }}
              >
                Quarry<Text style={{ color: c.orange }}>One</Text>
              </Text>
            </View>
          )}
        </View>
        {actions ?? (
          <View
            accessibilityRole="image"
            accessibilityLabel="Notification icon, visual placeholder"
            style={{
              width: 36,
              height: 48,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 14,
                height: 16,
                borderWidth: 1.5,
                borderColor: c.card,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
              }}
            />
            <View
              style={{
                width: 18,
                height: 1.5,
                backgroundColor: c.card,
                marginTop: -1,
              }}
            />
            <View
              style={{
                width: 4,
                height: 3,
                backgroundColor: c.card,
                borderBottomLeftRadius: 3,
                borderBottomRightRadius: 3,
                marginTop: 2,
              }}
            />
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          disabled={!onProfilePress}
          onPress={onProfilePress}
          style={{
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: c.card,
              backgroundColor: c.dark,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: c.card, fontWeight: "700", fontSize: 12 }}>
              {initials}
            </Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
