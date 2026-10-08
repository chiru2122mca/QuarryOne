import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Screen, Brand, FormField, PrimaryButton, s } from "../components/ui";
export default function Login() {
  const [identity, setIdentity] = useState(""),
    [password, setPassword] = useState(""),
    [notice, setNotice] = useState("");
  return (
    <Screen>
      <View style={{ paddingTop: 12, paddingBottom: 8 }}>
        <Brand large />
      </View>
      <Text style={s.title}>Welcome back</Text>
      <Text style={s.muted}>Sign in to your quarry workspace.</Text>
      <View style={[s.card, { marginTop: 16, gap: 22 }]}>
        <FormField
          label="Mobile Number / Email"
          value={identity}
          onChange={setIdentity}
        />
        <FormField
          label="Password"
          value={password}
          onChange={setPassword}
          secure
        />
        <Pressable
          accessibilityRole="button"
          style={{ minHeight: 48, justifyContent: "center" }}
          onPress={() =>
            setNotice(
              "Password recovery will be available when authentication is connected.",
            )
          }
        >
          <Text style={s.text}>Forgot Password?</Text>
        </Pressable>
        <PrimaryButton
          title="Login"
          onPress={() => router.replace("/(tabs)/home")}
        />
        <PrimaryButton
          title="Login with OTP"
          secondary
          onPress={() =>
            setNotice(
              "OTP is a prototype placeholder. Use Login to explore the app.",
            )
          }
        />
        {!!notice && (
          <Text accessibilityLiveRegion="polite" style={s.muted}>
            {notice}
          </Text>
        )}
      </View>
      <Text style={s.muted}>
        Prototype access · No account or password required.
      </Text>
    </Screen>
  );
}
