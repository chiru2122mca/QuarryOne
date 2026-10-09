import type {
  BlockStatus,
  GraniteBlock,
  GraniteGrade,
  GraniteMaterial,
} from "../../domain/blocks/types";

export interface InventoryFilters {
  readonly search: string;
  readonly material: GraniteMaterial | "ALL";
  readonly grade: GraniteGrade | "ALL";
  readonly pitId: string;
  readonly status: BlockStatus | "ALL";
}
export function clearInventoryFilters(): InventoryFilters {
  return {
    search: "",
    material: "ALL",
    grade: "ALL",
    pitId: "ALL",
    status: "ALL",
  };
}
/** Full historical totals; saleable volume counts only AVAILABLE records. */
export function inventorySummary(inventory: readonly GraniteBlock[]) {
  const counts: Record<BlockStatus, number> = {
    AVAILABLE: 0,
    RESERVED: 0,
    DISPATCHED: 0,
    REJECTED: 0,
  };
  let historicalVolumeM3 = 0,
    availableVolumeM3 = 0,
    onHandVolumeM3 = 0,
    onHandBlocks = 0;
  for (const block of inventory) {
    counts[block.status] += 1;
    historicalVolumeM3 += block.volumeM3;
    if (block.status === "AVAILABLE") availableVolumeM3 += block.volumeM3;
    // Usable on-hand stock includes held/reserved blocks, not dispatched/rejected blocks.
    if (block.status === "AVAILABLE" || block.status === "RESERVED") {
      onHandBlocks += 1;
      onHandVolumeM3 += block.volumeM3;
    }
  }
  return {
    totalBlocks: inventory.length,
    counts: Object.freeze(counts),
    historicalVolumeM3,
    availableVolumeM3,
    onHandBlocks,
    onHandVolumeM3,
  };
}
export function inventoryRecords(
  inventory: readonly GraniteBlock[],
  filters: InventoryFilters,
): GraniteBlock[] {
  const search = filters.search.trim().toUpperCase();
  return inventory
    .filter(
      (block) =>
        block.blockNumber.toUpperCase().includes(search) &&
        (filters.material === "ALL" || block.material === filters.material) &&
        (filters.grade === "ALL" || block.grade === filters.grade) &&
        (filters.pitId === "ALL" || block.pitId === filters.pitId) &&
        (filters.status === "ALL" || block.status === filters.status),
    )
    .sort(
      (a, b) =>
        b.productionDate.localeCompare(a.productionDate) ||
        b.blockNumber.localeCompare(a.blockNumber) ||
        a.id.localeCompare(b.id),
    );
}
/** IDs are opaque strings. Invalid/missing/array route parameters resolve to no record. */
export function findInventoryBlock(
  inventory: readonly GraniteBlock[],
  id: unknown,
): GraniteBlock | undefined {
  if (typeof id !== "string" || !id.trim()) return undefined;
  return inventory.find((block) => block.id === id.trim());
}
