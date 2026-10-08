import { Text } from "react-native";
import { Screen, AppHeader, ListCard, s } from "../components/ui";
import { workspace } from "../config/theme";
export default function Profile() {
  return (
    <Screen>
      <AppHeader title="Profile" back />
      <ListCard>
        <Text style={s.title}>{workspace.user}</Text>
        <Text style={s.text}>Quarry Manager</Text>
        <Text style={s.muted}>{workspace.name}</Text>
        <Text style={s.muted}>{workspace.location}</Text>
      </ListCard>
      <Text style={s.muted}>Demo profile · Profile editing is deferred.</Text>
    </Screen>
  );
}
