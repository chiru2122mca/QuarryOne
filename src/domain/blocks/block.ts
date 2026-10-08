import type { AddBlockInput, BlockNumber, GraniteBlock } from "./types";
import { calculateCubicMetres } from "./volume";

export function requiredText(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${field} is required.`);
  return value.trim();
}
export function productionYear(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error("Production date must be YYYY-MM-DD.");
  const [year, month, day] = date.split("-").map(Number);
  if (year < 1000 || year > 9999)
    throw new Error("Production year must have four digits.");
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error("Production date is not a valid calendar date.");
  }
  return year;
}
export function blockSequence(number: string): number {
  const match = /^BLK-\d{4}-(\d{4})$/.exec(number);
  if (!match || Number(match[1]) < 1)
    throw new Error(
      "Block number must be BLK-YYYY-NNNN with a positive sequence.",
    );
  return Number(match[1]);
}
export function formatBlockNumber(year: number, sequence: number): BlockNumber {
  if (
    !Number.isInteger(year) ||
    year < 1000 ||
    year > 9999 ||
    !Number.isInteger(sequence) ||
    sequence < 1 ||
    sequence > 9999
  ) {
    throw new RangeError(
      "Block year/sequence is outside the four-digit format.",
    );
  }
  return `BLK-${year}-${String(sequence).padStart(4, "0")}`;
}
/** Constructs an immutable domain record and ignores any caller-supplied volume. */
export function createGraniteBlock(
  input: AddBlockInput & { id: string; blockNumber: string },
): GraniteBlock {
  const year = productionYear(input.productionDate);
  const number = requiredText(input.blockNumber, "Block number");
  blockSequence(number);
  if (Number(number.split("-")[1]) !== year)
    throw new Error("Block number year must match production date.");
  if (!["A", "B", "C"].includes(input.grade))
    throw new Error("Grade must be A, B or C.");
  if (!["Black Granite", "Grey Granite", "Tan Brown"].includes(input.material))
    throw new Error("Unknown granite material.");
  const status = input.status ?? "AVAILABLE";
  if (status !== "AVAILABLE" && status !== "REJECTED")
    throw new Error("New demo blocks must be AVAILABLE or REJECTED.");
  if (input.remarks !== undefined && typeof input.remarks !== "string")
    throw new Error("Remarks must be text.");
  const dimensions = Object.freeze({ ...input.dimensions });
  return Object.freeze({
    id: requiredText(input.id, "Block ID"),
    blockNumber: number as BlockNumber,
    productionDate: input.productionDate,
    quarryId: requiredText(input.quarryId, "Quarry"),
    pitId: requiredText(input.pitId, "Pit"),
    material: input.material,
    grade: input.grade,
    dimensions,
    volumeM3: calculateCubicMetres(dimensions),
    stockyardLocation: requiredText(
      input.stockyardLocation,
      "Stockyard location",
    ),
    status,
    supervisor: requiredText(input.supervisor, "Supervisor"),
    remarks: input.remarks ?? "",
  });
}
