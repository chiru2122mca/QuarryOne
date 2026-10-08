import { productionYear } from "../../domain/blocks/block";
import {
  calculateCubicFeet,
  calculateCubicMetres,
} from "../../domain/blocks/volume";
import type {
  AddBlockInput,
  BlockDimensions,
  DimensionUnit,
  GraniteBlock,
  GraniteGrade,
  GraniteMaterial,
} from "../../domain/blocks/types";
import type { BlockOperationsStore } from "../../stores/mockOperationsStore";

/** Text-entry boundary only; GraniteBlock remains the sole persisted-in-memory model. */
export interface ProductionDraft {
  productionDate: string;
  quarryId: string;
  pitId: string;
  material: GraniteMaterial;
  grade: GraniteGrade;
  length: string;
  width: string;
  height: string;
  unit: DimensionUnit;
  stockyardLocation: string;
  supervisor: string;
  remarks: string;
}
export function localProductionDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function dimension(text: string, name: string): number {
  const value = text.trim();
  if (
    !/^(?:\d+\.?\d*|\.\d+)$/.test(value) ||
    !Number.isFinite(Number(value)) ||
    Number(value) <= 0
  ) {
    throw new Error(
      `Enter ${name.toLowerCase()} as a positive number (for example, 2.5).`,
    );
  }
  return Number(value);
}
export function productionDimensions(
  draft: Pick<ProductionDraft, "length" | "width" | "height" | "unit">,
): BlockDimensions {
  return {
    length: dimension(draft.length, "Length"),
    width: dimension(draft.width, "Width"),
    height: dimension(draft.height, "Height"),
    unit: draft.unit,
  };
}
export function previewProductionVolume(
  draft: Pick<ProductionDraft, "length" | "width" | "height" | "unit">,
):
  | { valid: true; volumeM3: number; cft: number }
  | { valid: false; error: string } {
  try {
    const dimensions = productionDimensions(draft);
    return {
      valid: true,
      volumeM3: calculateCubicMetres(dimensions),
      cft: calculateCubicFeet(dimensions),
    };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error
          ? error.message
          : "Enter valid positive dimensions.",
    };
  }
}
export function buildProductionInput(draft: ProductionDraft): AddBlockInput {
  productionYear(draft.productionDate);
  return {
    productionDate: draft.productionDate,
    quarryId: draft.quarryId,
    pitId: draft.pitId,
    material: draft.material,
    grade: draft.grade,
    dimensions: productionDimensions(draft),
    stockyardLocation: draft.stockyardLocation,
    supervisor: draft.supervisor,
    remarks: draft.remarks,
    status: "AVAILABLE",
  };
}
/** One controller per mounted form: successful saves are idempotent; failures are retryable. */
export function createProductionSubmission(
  addBlock: BlockOperationsStore["addBlock"],
) {
  let completed: GraniteBlock | undefined;
  let inProgress = false;
  return {
    save(draft: ProductionDraft): GraniteBlock {
      if (completed) return completed;
      if (inProgress)
        throw new Error("Production save is already in progress.");
      inProgress = true;
      try {
        completed = addBlock(buildProductionInput(draft));
        return completed;
      } finally {
        inProgress = false;
      }
    },
  };
}
/** Production totals count every produced block, including rejected blocks. */
export function productionTotals(inventory: readonly GraniteBlock[]) {
  return {
    blocks: inventory.length,
    volumeM3: inventory.reduce((sum, block) => sum + block.volumeM3, 0),
  };
}
export function productionRecords(
  inventory: readonly GraniteBlock[],
  date: string,
  pitId: string,
  createdId?: string,
): GraniteBlock[] {
  return inventory
    .filter(
      (block) =>
        (date === "All dates" || block.productionDate === date) &&
        (pitId === "All pits" || block.pitId === pitId),
    )
    .sort((a, b) => {
      if (a.id === b.id) return 0;
      if (a.id === createdId) return -1;
      if (b.id === createdId) return 1;
      return (
        b.productionDate.localeCompare(a.productionDate) ||
        b.blockNumber.localeCompare(a.blockNumber)
      );
    });
}
