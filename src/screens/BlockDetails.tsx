import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  AppHeader,
  DemoNote,
  ListCard,
  PrimaryButton,
  Screen,
  StatusChip,
  s,
} from "../components/ui";
import { useMockOperations } from "../stores/useMockOperations";
import { mockPits, mockQuarries } from "../data/blocks/referenceData";
import { formatVolume } from "../domain/blocks/volume";
import { findInventoryBlock } from "../features/inventory/model";

export default function BlockDetails() {
  const { inventory } = useMockOperations();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const block = findInventoryBlock(inventory, id);
  if (!block)
    return (
      <Screen>
        <AppHeader title="Block Details" back />
        <ListCard>
          <Text style={s.heading}>Block not found</Text>
          <Text style={s.muted}>
            The block ID is missing or unavailable in this app session.
            Reloading restores the demo inventory.
          </Text>
          <PrimaryButton
            title="Open Block Inventory"
            onPress={() => router.replace("/more/stock")}
          />
        </ListCard>
      </Screen>
    );
  const rows = [
    ["Production Date", block.productionDate],
    [
      "Quarry",
      mockQuarries.find((q) => q.id === block.quarryId)?.name ?? block.quarryId,
    ],
    ["Pit", mockPits.find((p) => p.id === block.pitId)?.name ?? block.pitId],
    ["Material", block.material],
    ["Grade", block.grade],
    ["Length", String(block.dimensions.length)],
    ["Width", String(block.dimensions.width)],
    ["Height", String(block.dimensions.height)],
    ["Original Measurement Unit", block.dimensions.unit],
    ["Volume (CFT)", formatVolume(block.volumeM3, "CFT")],
    ["Volume (m³)", formatVolume(block.volumeM3, "M3")],
    ["Stockyard Location", block.stockyardLocation],
    ["Supervisor", block.supervisor],
    ["Remarks", block.remarks || "No remarks"],
  ];
  return (
    <Screen contentStyle={{ gap: 12 }}>
      <AppHeader title="Block Details" subtitle={block.blockNumber} back />
      <ListCard>
        <Text style={s.label}>Current Block Status</Text>
        <StatusChip status={block.status} />
      </ListCard>
      <View testID={`block-details-${block.id}`}>
        <ListCard>
          {rows.map(([label, value]) => (
            <View key={label} style={{ paddingVertical: 4, gap: 4 }}>
              <Text style={s.muted}>{label}</Text>
              <Text style={s.text}>{value}</Text>
            </View>
          ))}
        </ListCard>
      </View>
      <Text style={s.muted}>
        Read-only record. Status changes are not available here.
      </Text>
      <DemoNote />
    </Screen>
  );
}
