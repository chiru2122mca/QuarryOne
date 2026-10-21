import type {
  OnboardingDraft,
  OnboardingState,
  QuarrySiteDraft,
  PitDraft,
} from "./model";
import { suggestQuarryCode } from "./quarryCode";

export type SiteFields = Pick<
  QuarrySiteDraft,
  "name" | "code" | "stateName" | "district" | "address"
>;
export type QuarryCommand =
  | { type: "INITIALIZE_PRIMARY" }
  | { type: "COPY_BUSINESS"; siteId: string; confirmed: boolean }
  | { type: "REGENERATE_CODE"; siteId: string }
  | { type: "SET_MODE"; enabled: boolean }
  | { type: "ADD_SITE" }
  | { type: "EDIT_SITE"; siteId: string; fields: Partial<SiteFields> }
  | { type: "REMOVE_SITE"; siteId: string; confirmed: boolean }
  | { type: "ADD_PIT"; siteId: string }
  | {
      type: "EDIT_PIT";
      siteId: string;
      pitId: string;
      fields: Partial<Pick<PitDraft, "name" | "kind">>;
    }
  | { type: "REMOVE_PIT"; siteId: string; pitId: string; confirmed: boolean }
  | { type: "NORMALIZE" };

export interface SiteErrors {
  name?: string;
  code?: string;
  stateName?: string;
  district?: string;
  pits?: string;
  pitErrors: Record<string, { name?: string; kind?: string }>;
}
export function normalizeQuarrySites(
  sites: QuarrySiteDraft[],
): QuarrySiteDraft[] {
  return sites.map((site) => ({
    ...site,
    name: site.name.trim(),
    code: site.code.trim().toUpperCase(),
    stateName: site.stateName.trim(),
    district: site.district.trim(),
    address: site.address.trim(),
    pits: site.pits.map((pit) => ({ ...pit, name: pit.name.trim() })),
  }));
}
export function validateQuarrySetup(draft: OnboardingDraft) {
  const sites = normalizeQuarrySites(draft.sites);
  const errors: Record<string, SiteErrors> = {};
  let issue = "";
  if (sites.filter((site) => site.isPrimary).length !== 1)
    issue = "Exactly one primary quarry is required.";
  else if (!draft.multiSiteEnabled && sites.length !== 1)
    issue = "Resolve additional quarries before using Single Quarry mode.";
  const codes = sites.map((site) => site.code);
  const ids = new Set<string>();
  for (const site of sites) {
    const error: SiteErrors = { pitErrors: {} };
    for (const key of ["name", "code", "stateName", "district"] as const) {
      if (!site[key])
        error[key] = {
          name: "Enter the quarry name.",
          code: "Enter the quarry code.",
          stateName: "Enter the state.",
          district: "Enter the district.",
        }[key];
    }
    if (site.code && codes.filter((code) => code === site.code).length > 1)
      error.code = "Use a unique quarry code for each site.";
    if (!site.id || ids.has(site.id))
      issue = "Quarry and pit draft identifiers must be unique.";
    ids.add(site.id);
    if (!site.pits.length)
      error.pits = "Add at least one pit or bench for this quarry.";
    const names = site.pits.map((pit) => pit.name.toLowerCase());
    for (const pit of site.pits) {
      const pitError: { name?: string; kind?: string } = {};
      if (!pit.name) pitError.name = "Enter the pit or bench name.";
      else if (
        names.filter((name) => name === pit.name.toLowerCase()).length > 1
      )
        pitError.name = "Use a unique pit or bench name within this quarry.";
      if (pit.kind !== "PIT" && pit.kind !== "BENCH")
        pitError.kind = "Choose PIT or BENCH.";
      if (!pit.id || ids.has(pit.id))
        issue = "Quarry and pit draft identifiers must be unique.";
      ids.add(pit.id);
      if (Object.keys(pitError).length) error.pitErrors[pit.id] = pitError;
    }
    if (Object.keys(error).length > 1 || Object.keys(error.pitErrors).length)
      errors[site.id] = error;
  }
  return {
    sites,
    errors,
    issue,
    valid: !issue && Object.keys(errors).length === 0,
  };
}

/** Commands are applied against the latest reducer state; errors preserve the entire draft. */
export function reduceQuarryCommand(
  state: OnboardingState,
  command: QuarryCommand,
): OnboardingState {
  const { draft } = state;
  const fail = (quarryIssue: string) => ({ ...state, quarryIssue });
  let sites = draft.sites;
  let multiSiteEnabled = draft.multiSiteEnabled;
  let nextQuarryEntityId = state.nextQuarryEntityId;
  let quarryPrefillInitialized = state.quarryPrefillInitialized;
  const codeFor = (name: string, siteId?: string) =>
    suggestQuarryCode(
      name,
      sites.filter((site) => site.id !== siteId).map((site) => site.code),
    );
  const allocate = (kind: "site" | "pit") => {
    const existing = new Set(
      draft.sites.flatMap((site) => [
        site.id,
        ...site.pits.map((pit) => pit.id),
      ]),
    );
    let id: string;
    do {
      id = `draft-${kind}-${nextQuarryEntityId++}`;
    } while (existing.has(id));
    return id;
  };
  if (command.type === "INITIALIZE_PRIMARY") {
    if (quarryPrefillInitialized) return state;
    const primary = sites.find((site) => site.isPrimary);
    if (!primary)
      return fail(
        "A primary quarry is required before copying business details.",
      );
    const business = draft.business;
    // Preserve any existing nonempty draft values; never continuously synchronize fields.
    const updated = {
      ...primary,
      name: primary.name || business.businessName.trim(),
      stateName: primary.stateName || business.stateName.trim(),
      district: primary.district || business.district.trim(),
      address: primary.address || business.address.trim(),
    };
    updated.code = primary.code || codeFor(updated.name, primary.id);
    sites = sites.map((site) => (site.id === primary.id ? updated : site));
    quarryPrefillInitialized = true;
  } else if (command.type === "SET_MODE") {
    if (!command.enabled && sites.length > 1)
      return fail(
        "Remove additional quarries explicitly before switching to Single Quarry. No entries were deleted.",
      );
    multiSiteEnabled = command.enabled;
  } else if (command.type === "ADD_SITE") {
    if (!multiSiteEnabled)
      return fail("Enable Multiple Quarries before adding another site.");
    sites = [
      ...sites,
      {
        id: allocate("site"),
        name: "",
        code: codeFor(""),
        stateName: "",
        district: "",
        address: "",
        isPrimary: false,
        pits: [],
      },
    ];
  } else if (command.type === "NORMALIZE") {
    sites = normalizeQuarrySites(sites);
    if (JSON.stringify(sites) === JSON.stringify(draft.sites))
      return { ...state, quarryIssue: "" };
  } else {
    const site = sites.find((item) => item.id === command.siteId);
    if (!site) return fail("This quarry is no longer in the draft.");
    let updated = site;
    if (command.type === "COPY_BUSINESS") {
      if (!site.isPrimary)
        return fail(
          "Business details can only be copied to the primary quarry.",
        );
      if (!command.confirmed)
        return fail(
          "Confirm replacing quarry details with the latest business details first.",
        );
      updated = {
        ...site,
        name: draft.business.businessName.trim(),
        stateName: draft.business.stateName.trim(),
        district: draft.business.district.trim(),
        address: draft.business.address.trim(),
      };
      quarryPrefillInitialized = true;
    } else if (command.type === "REGENERATE_CODE") {
      updated = { ...site, code: codeFor(site.name, site.id) };
    } else if (command.type === "EDIT_SITE") {
      const f = command.fields;
      updated = {
        ...site,
        name: f.name ?? site.name,
        code: (f.code ?? site.code).trim().toUpperCase(),
        stateName: f.stateName ?? site.stateName,
        district: f.district ?? site.district,
        address: f.address ?? site.address,
      };
    } else if (command.type === "REMOVE_SITE") {
      if (site.isPrimary)
        return fail("The primary quarry cannot be removed in this demo.");
      if (!command.confirmed) return fail("Confirm quarry removal first.");
      if (
        draft.stockyards.some(
          (yard) =>
            yard.siteId === site.id ||
            site.pits.some((pit) => pit.id === yard.pitId),
        ) ||
        draft.invitations.some((invitation) =>
          invitation.siteIds.includes(site.id),
        )
      )
        return fail(
          "This quarry is referenced by a stockyard or invitation draft. Resolve those references before removing it.",
        );
      sites = sites.filter((item) => item.id !== site.id);
    } else if (command.type === "ADD_PIT") {
      updated = {
        ...site,
        pits: [...site.pits, { id: allocate("pit"), name: "", kind: "PIT" }],
      };
    } else {
      const pit = site.pits.find((item) => item.id === command.pitId);
      if (!pit) return fail("This pit or bench is no longer in the draft.");
      if (command.type === "REMOVE_PIT") {
        if (!command.confirmed)
          return fail("Confirm pit or bench removal first.");
        if (draft.stockyards.some((yard) => yard.pitId === pit.id))
          return fail(
            "This pit or bench is assigned to a stockyard draft. Resolve that assignment before removing it.",
          );
        updated = {
          ...site,
          pits: site.pits.filter((item) => item.id !== pit.id),
        };
      } else {
        updated = {
          ...site,
          pits: site.pits.map((item) =>
            item.id === pit.id
              ? {
                  ...pit,
                  name: command.fields.name ?? pit.name,
                  kind: command.fields.kind ?? pit.kind,
                }
              : item,
          ),
        };
      }
    }
    if (command.type !== "REMOVE_SITE")
      sites = sites.map((item) => (item.id === site.id ? updated : item));
  }
  return {
    ...state,
    quarryPrefillInitialized,
    nextQuarryEntityId,
    quarryIssue: "",
    savedForSession: false,
    draft: { ...draft, sites, multiSiteEnabled },
  };
}
