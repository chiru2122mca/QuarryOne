import {
  createGraniteBlock,
  formatBlockNumber,
} from "../../domain/blocks/block";
import type {
  BlockDimensions,
  GraniteBlock,
  GraniteGrade,
  GraniteMaterial,
} from "../../domain/blocks/types";

// This table is the sole initial source of individual block inventory, not a ledger.
const dimensions: readonly BlockDimensions[] = [
  { length: 8, width: 5, height: 4, unit: "FT" },
  { length: 2.4, width: 1.6, height: 1.2, unit: "M" },
  { length: 7.5, width: 4.5, height: 3.8, unit: "FT" },
  { length: 2.15, width: 1.45, height: 1.1, unit: "M" },
  { length: 9, width: 5.5, height: 4.2, unit: "FT" },
  { length: 2.6, width: 1.8, height: 1.35, unit: "M" },
  { length: 6.8, width: 4.2, height: 3.5, unit: "FT" },
  { length: 1.95, width: 1.4, height: 1.05, unit: "M" },
  { length: 8.2, width: 5.1, height: 4.1, unit: "FT" },
  { length: 2.35, width: 1.7, height: 1.3, unit: "M" },
  { length: 7.2, width: 4.6, height: 3.6, unit: "FT" },
  { length: 2.1, width: 1.5, height: 1.15, unit: "M" },
  { length: 8.5, width: 5.2, height: 4.3, unit: "FT" },
  { length: 2.5, width: 1.75, height: 1.4, unit: "M" },
  { length: 6.5, width: 4.1, height: 3.2, unit: "FT" },
  { length: 2.2, width: 1.55, height: 1.25, unit: "M" },
  { length: 7.8, width: 4.9, height: 3.9, unit: "FT" },
  { length: 2.45, width: 1.65, height: 1.28, unit: "M" },
];
const grades: readonly GraniteGrade[] = ["A", "B", "C"];
const materials: readonly GraniteMaterial[] = [
  "Black Granite",
  "Grey Granite",
  "Tan Brown",
];
const supervisors = ["Ramesh", "Suresh", "Venkat"];

export const mockBlocks: readonly GraniteBlock[] = Object.freeze(
  dimensions.map((entry, index) => {
    const sequence = index + 1;
    const rejected = [5, 11, 17].includes(index);
    return createGraniteBlock({
      id: `block-2026-${String(sequence).padStart(4, "0")}`,
      blockNumber: formatBlockNumber(2026, sequence),
      productionDate: `2026-09-${String(19 + Math.floor(index / 3)).padStart(2, "0")}`,
      quarryId: "quarry-deccan",
      pitId: index % 2 === 0 ? "pit-a" : "pit-b",
      material: materials[Math.floor(index / 6)],
      grade: grades[index % 3],
      dimensions: entry,
      stockyardLocation: `Yard ${index % 2 === 0 ? "A" : "B"} / Row ${1 + Math.floor(index / 6)}`,
      status: rejected ? "REJECTED" : "AVAILABLE",
      supervisor: supervisors[index % 3],
      remarks: rejected
        ? "Visible fracture; rejected after supervisor inspection."
        : "Measured at stockyard.",
    });
  }),
);
