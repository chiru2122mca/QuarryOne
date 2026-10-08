import { Text } from "react-native";
import { Screen, AppHeader, ListCard, Brand, s } from "../components/ui";
import { branding } from "../config/theme";
export default function Settings() {
  return (
    <Screen>
      <AppHeader title="Settings" back />
      <ListCard>
        <Text style={s.heading}>Language</Text>
        <Text style={s.text}>English</Text>
        <Text style={s.muted}>
          Telugu support is planned for a future milestone.
        </Text>
      </ListCard>
      <ListCard>
        <Text style={s.heading}>Connection status</Text>
        <Text style={s.muted}>
          Local demonstration data. Synced, Waiting to Sync and Offline
          indicators will be connected in a future milestone.
        </Text>
      </ListCard>
      <ListCard>
        <Brand />
        <Text style={s.muted}>Version {branding.version}</Text>
      </ListCard>
    </Screen>
  );
}
