import { Image, View } from "react-native";
import { branding } from "../config/theme";

const sizes = {
  welcome: 180,
  login: 156,
  full: 180,
  header: 224,
  compact: 224,
  emblem: 44,
};

/** All variants use crops of the approved master, never a second text wordmark. */
export function QuarryOneLogo({
  variant = "header",
  size,
}: {
  variant?: keyof typeof sizes;
  size?: number;
}) {
  const width = size ?? sizes[variant];
  const compact = variant === "header" || variant === "compact";
  const asset = branding.assets[variant === "emblem" ? "emblem" : "full"];
  if (compact) {
    return (
      <View
        accessibilityLabel={branding.name}
        accessibilityRole="image"
        style={{
          width,
          maxWidth: "100%",
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          height: 48,
        }}
      >
        <View
          style={{ width: 44, aspectRatio: branding.assets.emblem.aspectRatio }}
        >
          <Image
            source={branding.assets.emblem.source}
            resizeMode="contain"
            accessible={false}
            style={{ width: "100%", height: "100%" }}
          />
        </View>
        <View
          style={{ flex: 1, aspectRatio: branding.assets.wordmark.aspectRatio }}
        >
          <Image
            source={branding.assets.wordmark.source}
            resizeMode="contain"
            accessible={false}
            style={{ width: "100%", height: "100%" }}
          />
        </View>
      </View>
    );
  }
  return (
    <View style={{ maxWidth: "100%", width, aspectRatio: asset.aspectRatio }}>
      <Image
        source={asset.source}
        accessibilityLabel={branding.name}
        accessibilityRole="image"
        resizeMode="contain"
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  );
}
