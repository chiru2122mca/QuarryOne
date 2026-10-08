import { useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  AppHeader,
  DemoNote,
  EmptyState,
  KpiCard,
  ListCard,
  PrimaryButton,
  Screen,
  SelectField,
  StatusChip,
  s,
} from "../components/ui";
import { useMockOperations } from "../stores/useMockOperations";
import { mockPits, mockQuarries } from "../data/blocks/referenceData";
import { formatVolume } from "../domain/blocks/volume";
import {
  productionRecords,
  productionTotals,
} from "../features/production/model";
import type { VolumeUnit } from "../domain/blocks/types";

export default function ProductionList() {
  const { inventory, getBlockById } = useMockOperations();
  const { created } = useLocalSearchParams<{ created?: string }>();
  const createdId = typeof created === "string" ? created : undefined;
  const [dateSelection, setDateSelection] = useState({
    createdId,
    value: "All dates",
  });
  const [pitSelection, setPitSelection] = useState({
    createdId,
    value: "All pits",
  });
  const date =
    dateSelection.createdId === createdId ? dateSelection.value : "All dates";
  const pit =
    pitSelection.createdId === createdId ? pitSelection.value : "All pits";
  const setDate = (value: string) => setDateSelection({ createdId, value });
  const setPit = (value: string) => setPitSelection({ createdId, value });
  const [unit, setUnit] = useState<VolumeUnit>("M3");
  const totals = productionTotals(inventory);
  const records = productionRecords(
    inventory,
    date,
    mockPits.find((p) => p.name === pit)?.id ?? "All pits",
    createdId,
  );
  const added = createdId ? getBlockById(createdId) : undefined;
  const dates = [
    "All dates",
    ...new Set(
      inventory
        .map((block) => block.productionDate)
        .sort()
        .reverse(),
    ),
  ];
  return (
    <Screen contentStyle={{ gap: 12 }}>
      <AppHeader
        title="Production"
        subtitle="Individual granite blocks · Session data"
        action={
          <PrimaryButton
            title="+"
            onPress={() => router.push("/add-production")}
          />
        }
      />
      <View testID="production-totals" style={s.grid}>
        <KpiCard dark label="Produced blocks" value={String(totals.blocks)} />
        <KpiCard
          label="Produced volume"
          value={formatVolume(totals.volumeM3, unit)}
        />
      </View>
      <Text style={s.muted}>
        Totals include all produced blocks, including rejected blocks.
      </Text>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <SelectField
            label="Date"
            value={date}
            options={dates}
            onChange={setDate}
          />
        </View>
        <View style={{ flex: 1 }}>
          <SelectField
            label="Pit"
            value={pit}
            options={["All pits", ...mockPits.map((p) => p.name)]}
            onChange={setPit}
          />
        </View>
      </View>
      <SelectField
        label="Volume display"
        value={unit === "M3" ? "m³" : "CFT"}
        options={["m³", "CFT"]}
        onChange={(value) => setUnit(value === "CFT" ? "CFT" : "M3")}
      />
      {added && (
        <Text accessibilityLiveRegion="polite" style={s.text}>
          {added.blockNumber} added to Production.
        </Text>
      )}
      <Text style={s.muted}>
        Showing {records.length} of {inventory.length} blocks
      </Text>
      {records.length ? (
        records.map((block) => (
          <ListCard key={block.id}>
            <Text style={s.heading}>{block.blockNumber}</Text>
            <View style={s.between}>
              <Text style={s.muted}>{block.productionDate}</Text>
              <StatusChip status={block.status} />
            </View>
            <Text style={s.text}>
              {mockQuarries.find((q) => q.id === block.quarryId)?.name} /{" "}
              {mockPits.find((p) => p.id === block.pitId)?.name}
            </Text>
            <Text style={s.text}>
              {block.material} · Grade {block.grade}
            </Text>
            <Text style={s.muted}>
              {block.dimensions.length} × {block.dimensions.width} ×{" "}
              {block.dimensions.height} {block.dimensions.unit}
            </Text>
            <Text style={s.heading}>{formatVolume(block.volumeM3, unit)}</Text>
            <Text style={s.muted}>Supervisor: {block.supervisor}</Text>
          </ListCard>
        ))
      ) : (
        <EmptyState message="No blocks match this date and pit." />
      )}
      <DemoNote />
    </Screen>
  );
}
