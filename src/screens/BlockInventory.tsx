import { OperationalHeader } from "../components/OperationalHeader";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import {
  DemoNote,
  EmptyState,
  FormField,
  KpiCard,
  PrimaryButton,
  Screen,
  SelectField,
  StatusChip,
  s,
} from "../components/ui";
import { useMockOperations } from "../stores/useMockOperations";
import { mockPits, mockQuarries } from "../data/blocks/referenceData";
import { formatVolume } from "../domain/blocks/volume";
import type {
  BlockStatus,
  GraniteGrade,
  GraniteMaterial,
  VolumeUnit,
} from "../domain/blocks/types";
import {
  clearInventoryFilters,
  inventoryRecords,
  inventorySummary,
} from "../features/inventory/model";
import type { InventoryFilters } from "../features/inventory/model";

export default function BlockInventory() {
  const { inventory } = useMockOperations();
  const [filters, setFilters] = useState(clearInventoryFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [unit, setUnit] = useState<VolumeUnit>("CFT");
  const summary = inventorySummary(inventory);
  const records = inventoryRecords(inventory, filters);
  const change = <K extends keyof InventoryFilters>(
    key: K,
    value: InventoryFilters[K],
  ) => setFilters((current) => ({ ...current, [key]: value }));
  const activeFilters = [
    filters.material,
    filters.grade,
    filters.pitId,
    filters.status,
  ].filter((value) => value !== "ALL").length;
  return (
    <Screen
      contentStyle={{ gap: 12 }}
      header={<OperationalHeader title="Block Inventory" back />}
    >
      <Text style={s.muted}>Historical records & saleable stock</Text>
      <View testID="inventory-kpis" style={s.grid}>
        <KpiCard
          compact
          icon=""
          dark
          label="Total Blocks"
          value={String(summary.totalBlocks)}
        />
        <KpiCard
          compact
          icon=""
          label="Available Blocks"
          value={String(summary.counts.AVAILABLE)}
        />
        <KpiCard
          compact
          icon=""
          label={`Available Volume (${unit === "CFT" ? "CFT" : "m³"})`}
          value={formatVolume(summary.availableVolumeM3, unit).replace(
            / (?:CFT|m³)$/,
            "",
          )}
        />
        <KpiCard
          compact
          icon=""
          label="Reserved Blocks"
          value={String(summary.counts.RESERVED)}
        />
        <KpiCard
          compact
          icon=""
          label="Dispatched Blocks"
          value={String(summary.counts.DISPATCHED)}
        />
        <KpiCard
          compact
          icon=""
          label="Rejected Blocks"
          value={String(summary.counts.REJECTED)}
        />
      </View>
      <Text style={s.muted}>
        Historical volume: {formatVolume(summary.historicalVolumeM3, unit)} (all
        statuses)
      </Text>
      <Text style={s.muted}>
        KPIs cover all records. Available volume includes AVAILABLE only.
      </Text>
      <FormField
        label="Search Block Number"
        value={filters.search}
        onChange={(value) => change("search", value)}
        uppercase
      />
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            secondary
            title={`${showFilters ? "Hide" : "Show"} Filters${activeFilters ? ` (${activeFilters})` : ""}`}
            onPress={() => setShowFilters((value) => !value)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            secondary
            title="Clear Filters"
            onPress={() => setFilters(clearInventoryFilters())}
          />
        </View>
      </View>
      {showFilters && (
        <View style={[s.card, { padding: 14, gap: 12 }]}>
          <SelectField
            label="Material"
            value={
              filters.material === "ALL" ? "All materials" : filters.material
            }
            options={[
              "All materials",
              "Black Granite",
              "Grey Granite",
              "Tan Brown",
            ]}
            onChange={(value) =>
              change(
                "material",
                value === "All materials" ? "ALL" : (value as GraniteMaterial),
              )
            }
          />
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <SelectField
                label="Grade"
                value={filters.grade === "ALL" ? "All grades" : filters.grade}
                options={["All grades", "A", "B", "C"]}
                onChange={(value) =>
                  change(
                    "grade",
                    value === "All grades" ? "ALL" : (value as GraniteGrade),
                  )
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <SelectField
                label="Pit"
                value={
                  filters.pitId === "ALL"
                    ? "All pits"
                    : (mockPits.find((p) => p.id === filters.pitId)?.name ?? "")
                }
                options={["All pits", ...mockPits.map((p) => p.name)]}
                onChange={(value) =>
                  change(
                    "pitId",
                    value === "All pits"
                      ? "ALL"
                      : mockPits.find((p) => p.name === value)!.id,
                  )
                }
              />
            </View>
          </View>
          <SelectField
            label="Status"
            value={filters.status === "ALL" ? "All statuses" : filters.status}
            options={[
              "All statuses",
              "AVAILABLE",
              "RESERVED",
              "DISPATCHED",
              "REJECTED",
            ]}
            onChange={(value) =>
              change(
                "status",
                value === "All statuses" ? "ALL" : (value as BlockStatus),
              )
            }
          />
        </View>
      )}
      <SelectField
        label="Volume display"
        value={unit === "CFT" ? "CFT" : "m³"}
        options={["CFT", "m³"]}
        onChange={(value) => setUnit(value === "CFT" ? "CFT" : "M3")}
      />
      <Text
        testID="inventory-result-count"
        accessibilityLiveRegion="polite"
        style={s.muted}
      >
        Showing {records.length} of {inventory.length} blocks
      </Text>
      {records.length ? (
        records.map((block) => (
          <Pressable
            key={block.id}
            accessibilityRole="button"
            accessibilityLabel={`View block ${block.blockNumber}`}
            onPress={() =>
              router.push({
                pathname: "/more/block/[id]",
                params: { id: block.id },
              })
            }
            style={({ pressed }) => [
              s.card,
              { padding: 16, gap: 8 },
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text style={s.heading}>{block.blockNumber}</Text>
            <Text style={s.text}>
              {block.material} · Grade {block.grade}
            </Text>
            <Text style={s.muted}>
              {mockQuarries.find((q) => q.id === block.quarryId)?.name} /{" "}
              {mockPits.find((p) => p.id === block.pitId)?.name}
            </Text>
            <Text style={s.muted}>{block.stockyardLocation}</Text>
            <Text style={s.text}>
              {block.dimensions.length} × {block.dimensions.width} ×{" "}
              {block.dimensions.height} {block.dimensions.unit}
            </Text>
            <View style={s.between}>
              <Text style={[s.heading, { flex: 1 }]}>
                {formatVolume(block.volumeM3, unit)}
              </Text>
              <StatusChip status={block.status} />
            </View>
          </Pressable>
        ))
      ) : (
        <EmptyState message="No blocks match your search and filters. Use Clear Filters to see the full inventory." />
      )}
      <DemoNote />
    </Screen>
  );
}
