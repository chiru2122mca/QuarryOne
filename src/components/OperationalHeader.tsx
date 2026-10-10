import { useCallback } from "react";
import { Platform, Pressable, StatusBar, Text } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { DarkAppHeader } from "./DarkAppHeader";
import { colors as c } from "../config/theme";

/** Keeps status-bar styling scoped to the focused operational route. */
export function OperationalHeader({
  title,
  back = false,
  fallback = "/more",
  onAdd,
  addLabel,
}: {
  title: string;
  back?: boolean;
  fallback?:
    | "/more"
    | "/more/stock"
    | "/production"
    | "/sales"
    | "/dispatch"
    | "/expenses";
  onAdd?: () => void;
  addLabel?: string;
}) {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === "web") return;
      const entry = StatusBar.pushStackEntry({ barStyle: "light-content" });
      return () => StatusBar.popStackEntry(entry);
    }, []),
  );
  return (
    <DarkAppHeader
      title={title}
      testID="operational-header"
      showProfile={false}
      onBack={
        back
          ? () =>
              router.canGoBack() ? router.back() : router.replace(fallback)
          : undefined
      }
      actions={
        onAdd ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={addLabel ?? `Add ${title}`}
            onPress={onAdd}
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: c.orange,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text style={{ color: c.card, fontSize: 28 }}>+</Text>
          </Pressable>
        ) : (
          <></>
        )
      }
    />
  );
}
