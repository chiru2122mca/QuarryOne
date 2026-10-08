import type { BlockDimensions, VolumeUnit } from "./types";

/** One international foot is exactly 0.3048 metres. */
export const CUBIC_METRES_PER_CUBIC_FOOT = 0.028316846592;

function validateVolume(value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError("Volume must be finite and non-negative.");
  }
}
function representable(value: number, positiveInput: boolean): number {
  if (!Number.isFinite(value) || (positiveInput && value <= 0)) {
    throw new RangeError("Volume is outside the representable numeric range.");
  }
  return value;
}
export function validateDimensions(dimensions: BlockDimensions): void {
  if (dimensions.unit !== "FT" && dimensions.unit !== "M") {
    throw new RangeError("Dimension unit must be FT or M.");
  }
  for (const value of [
    dimensions.length,
    dimensions.width,
    dimensions.height,
  ]) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(
        "Length, width and height must be finite and positive.",
      );
    }
  }
}
export function cftToCubicMetres(cft: number): number {
  validateVolume(cft);
  return representable(cft * CUBIC_METRES_PER_CUBIC_FOOT, cft > 0);
}
export function cubicMetresToCft(m3: number): number {
  validateVolume(m3);
  return representable(m3 / CUBIC_METRES_PER_CUBIC_FOOT, m3 > 0);
}
function enteredVolume(dimensions: BlockDimensions): number {
  validateDimensions(dimensions);
  return representable(
    dimensions.length * dimensions.width * dimensions.height,
    true,
  );
}
export function calculateCubicMetres(dimensions: BlockDimensions): number {
  const volume = enteredVolume(dimensions);
  return dimensions.unit === "FT" ? cftToCubicMetres(volume) : volume;
}
export function calculateCubicFeet(dimensions: BlockDimensions): number {
  const volume = enteredVolume(dimensions);
  return dimensions.unit === "M" ? cubicMetresToCft(volume) : volume;
}
/** Round only at display time; inventory always retains the full numeric value. */
export function formatVolume(
  volumeM3: number,
  unit: VolumeUnit = "M3",
  decimals?: number,
): string {
  validateVolume(volumeM3);
  if (unit !== "M3" && unit !== "CFT")
    throw new RangeError("Display unit must be M3 or CFT.");
  const digits = decimals ?? (unit === "CFT" ? 2 : 3);
  if (!Number.isInteger(digits) || digits < 0 || digits > 6) {
    throw new RangeError("Display precision must be an integer from 0 to 6.");
  }
  const value = unit === "CFT" ? cubicMetresToCft(volumeM3) : volumeM3;
  return `${new Intl.NumberFormat("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)} ${unit === "CFT" ? "CFT" : "m³"}`;
}
