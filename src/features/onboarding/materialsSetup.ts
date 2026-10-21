import type { GraniteGrade, GraniteMaterial } from "../../domain/blocks/types";
import { calculateCubicMetres, formatVolume } from "../../domain/blocks/volume";
import type {
  MeasurementPreferencesDraft,
  OnboardingDraft,
  OnboardingState,
  StockyardDraft,
} from "./model";
import { validateQuarrySetup } from "./quarrySetup";

export const supportedMaterials: readonly {
  id: string;
  name: GraniteMaterial;
}[] = [
  { id: "draft-material-black", name: "Black Granite" },
  { id: "draft-material-grey", name: "Grey Granite" },
  { id: "draft-material-tan", name: "Tan Brown" },
];
export const supportedGrades = ["A", "B", "C"] as const;
export type MaterialsCommand =
  | { type: "TOGGLE_MATERIAL"; name: GraniteMaterial }
  | { type: "EDIT_GRADE"; code: GraniteGrade; description: string }
  | { type: "ADD_STOCKYARD"; siteId?: string }
  | {
      type: "EDIT_STOCKYARD";
      id: string;
      fields: Partial<Pick<StockyardDraft, "name" | "siteId" | "pitId">>;
    }
  | { type: "REMOVE_STOCKYARD"; id: string; confirmed: boolean }
  | {
      type: "SET_PREFERENCES";
      fields: Partial<
        Pick<MeasurementPreferencesDraft, "dimensionUnit" | "volumeDisplay">
      >;
    }
  | { type: "NORMALIZE" };
export const stockyardNameKey = (name: string) =>
  name.replace(/\s/g, "").toLowerCase();
export function measurementExample() {
  const volume = calculateCubicMetres({
    length: 10,
    width: 5,
    height: 4,
    unit: "FT",
  });
  return `10 × 5 × 4 FT = ${formatVolume(volume, "CFT", 0)} ≈ ${formatVolume(volume, "M3", 2)}`;
}
export interface StockyardErrors {
  name?: string;
  siteId?: string;
  pitId?: string;
}
export function validateMaterialsSetup(draft: OnboardingDraft) {
  const errors: {
    materials?: string;
    grades?: string;
    preferences?: string;
    quarries?: string;
    identity?: string;
    stockyards: Record<string, StockyardErrors>;
    sites: Record<string, string>;
  } = { stockyards: {}, sites: {} };
  if (
    !draft.materials.length ||
    draft.materials.some(
      (item) =>
        !item.id ||
        !supportedMaterials.some((material) => material.name === item.name),
    ) ||
    new Set(draft.materials.map((item) => item.name)).size !==
      draft.materials.length ||
    new Set(draft.materials.map((item) => item.id)).size !==
      draft.materials.length
  )
    errors.materials =
      "Select at least one supported material, without duplicates.";
  if (
    draft.grades.length !== 3 ||
    supportedGrades.some(
      (code) =>
        draft.grades.filter((grade) => grade.code === code).length !== 1,
    )
  )
    errors.grades = "Grades A, B and C must each be configured once.";
  if (!validateQuarrySetup(draft).valid)
    errors.quarries =
      "Complete Quarry Configuration in Step 2 before continuing.";
  const ids = new Set<string>();
  for (const yard of draft.stockyards) {
    const error: StockyardErrors = {};
    if (!yard.id || ids.has(yard.id))
      errors.identity = "Stockyard draft identifiers must be unique.";
    ids.add(yard.id);
    if (!yard.name.trim()) error.name = "Enter the stockyard name.";
    else if (
      draft.stockyards.filter(
        (other) =>
          other.siteId === yard.siteId &&
          stockyardNameKey(other.name) === stockyardNameKey(yard.name),
      ).length > 1
    )
      error.name = "Use a unique stockyard name within this quarry.";
    const site = draft.sites.find((item) => item.id === yard.siteId);
    if (!site)
      error.siteId =
        "Select an existing quarry. This association is no longer valid.";
    if (yard.pitId !== null && !site?.pits.some((pit) => pit.id === yard.pitId))
      error.pitId =
        "Select a pit or bench belonging to this quarry, or choose Entire quarry.";
    if (Object.keys(error).length) errors.stockyards[yard.id] = error;
  }
  for (const site of draft.sites) {
    if (
      !draft.stockyards.some(
        (yard) => yard.siteId === site.id && !errors.stockyards[yard.id],
      )
    )
      errors.sites[site.id] =
        "Add at least one valid stockyard for this quarry.";
  }
  const p = draft.preferences;
  let timezoneValid = true;
  try {
    if (!p.timezone.trim()) timezoneValid = false;
    else new Intl.DateTimeFormat("en-IN", { timeZone: p.timezone });
  } catch {
    timezoneValid = false;
  }
  if (
    !["FT", "M"].includes(p.dimensionUnit) ||
    !["CFT", "M3"].includes(p.volumeDisplay) ||
    p.currency !== "INR" ||
    !timezoneValid ||
    [p.cftDecimals, p.cubicMetreDecimals].some(
      (value) => !Number.isInteger(value) || value < 0 || value > 6,
    )
  )
    errors.preferences =
      "Use valid FT/M dimensions, CFT/m³ display, INR, timezone and display precision.";
  return {
    errors,
    valid:
      !errors.materials &&
      !errors.grades &&
      !errors.quarries &&
      !errors.identity &&
      !errors.preferences &&
      !Object.keys(errors.stockyards).length &&
      !Object.keys(errors.sites).length,
  };
}

/** Local-only commands; rejected edits retain every draft value. */
export function reduceMaterialsCommand(
  state: OnboardingState,
  command: MaterialsCommand,
): OnboardingState {
  const draft = state.draft;
  const fail = (materialsIssue: string) => ({ ...state, materialsIssue });
  let updated = draft;
  let nextStockyardDraftId = state.nextStockyardDraftId;
  if (command.type === "TOGGLE_MATERIAL") {
    const material = supportedMaterials.find(
      (item) => item.name === command.name,
    );
    if (!material) return fail("Choose a supported granite material.");
    updated = {
      ...draft,
      materials: draft.materials.some((item) => item.name === material.name)
        ? draft.materials.filter((item) => item.name !== material.name)
        : [...draft.materials, { ...material }],
    };
  } else if (command.type === "EDIT_GRADE") {
    if (
      !supportedGrades.includes(command.code) ||
      !draft.grades.some((grade) => grade.code === command.code)
    )
      return fail("Only existing grades A, B and C can be edited.");
    updated = {
      ...draft,
      grades: draft.grades.map((grade) =>
        grade.code === command.code
          ? { ...grade, description: command.description }
          : grade,
      ),
    };
  } else if (command.type === "ADD_STOCKYARD") {
    const siteId =
      command.siteId ?? draft.sites.find((site) => site.isPrimary)?.id;
    if (!siteId || !draft.sites.some((site) => site.id === siteId))
      return fail("Configure a quarry in Step 2 before adding its stockyard.");
    let id: string;
    do {
      id = `draft-stockyard-${nextStockyardDraftId++}`;
    } while (draft.stockyards.some((yard) => yard.id === id));
    updated = {
      ...draft,
      stockyards: [...draft.stockyards, { id, siteId, pitId: null, name: "" }],
    };
  } else if (command.type === "SET_PREFERENCES") {
    const p = { ...draft.preferences, ...command.fields };
    if (
      !["FT", "M"].includes(p.dimensionUnit) ||
      !["CFT", "M3"].includes(p.volumeDisplay)
    )
      return fail("Choose FT/M and CFT/m³ preferences.");
    updated = {
      ...draft,
      preferences: {
        ...draft.preferences,
        dimensionUnit: p.dimensionUnit,
        volumeDisplay: p.volumeDisplay,
      },
    };
  } else if (command.type === "NORMALIZE") {
    const grades = draft.grades.map((grade) => ({
      ...grade,
      description: grade.description.trim(),
    }));
    const stockyards = draft.stockyards.map((yard) => ({
      ...yard,
      name: yard.name.trim(),
    }));
    if (
      JSON.stringify({ grades, stockyards }) ===
      JSON.stringify({ grades: draft.grades, stockyards: draft.stockyards })
    )
      return { ...state, materialsIssue: "" };
    updated = { ...draft, grades, stockyards };
  } else {
    const yard = draft.stockyards.find((item) => item.id === command.id);
    if (!yard) return fail("This stockyard is no longer in the draft.");
    if (command.type === "REMOVE_STOCKYARD") {
      if (!command.confirmed) return fail("Confirm stockyard removal first.");
      updated = {
        ...draft,
        stockyards: draft.stockyards.filter((item) => item.id !== yard.id),
      };
    } else {
      const siteId = command.fields.siteId ?? yard.siteId;
      const site = draft.sites.find((item) => item.id === siteId);
      if (!site && command.fields.siteId !== undefined)
        return fail("Select an existing quarry.");
      const pitId =
        command.fields.pitId !== undefined
          ? command.fields.pitId
          : siteId !== yard.siteId
            ? null
            : yard.pitId;
      if (
        command.fields.pitId !== undefined &&
        pitId !== null &&
        !site?.pits.some((pit) => pit.id === pitId)
      )
        return fail(
          "The selected pit or bench does not belong to this quarry.",
        );
      updated = {
        ...draft,
        stockyards: draft.stockyards.map((item) =>
          item.id === yard.id
            ? { ...yard, name: command.fields.name ?? yard.name, siteId, pitId }
            : item,
        ),
      };
    }
  }
  return {
    ...state,
    draft: updated,
    nextStockyardDraftId,
    materialsIssue: "",
    savedForSession: false,
  };
}
