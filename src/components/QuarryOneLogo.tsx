import { Image, View } from "react-native";
import { branding } from "../config/theme";

const sizes = { welcome: 180, login: 156, header: 96 };

/** The approved artwork includes its wordmark; never add a second wordmark. */
export function QuarryOneLogo({
  variant = "header",
  size,
}: {
  variant?: keyof typeof sizes;
  size?: number;
}) {
  const width = size ?? sizes[variant];
  return (
    <View
      style={{ maxWidth: "100%", width, aspectRatio: branding.logoAspectRatio }}
    >
      <Image
        source={branding.logo}
        accessibilityLabel={branding.name}
        accessibilityRole="image"
        resizeMode="contain"
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  );
}
