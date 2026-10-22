import { getOnboardingStep } from "./model";
import type { OnboardingDraft } from "./model";
import { validateBusinessRegistration } from "./businessRegistration";
import { validateQuarrySetup } from "./quarrySetup";
import { supportedGrades, validateMaterialsSetup } from "./materialsSetup";
import {
  invitationRoles,
  primaryOwnerFromBusiness,
  validateUsersSetup,
} from "./usersSetup";

export const reviewStepIds = [
  "business",
  "quarry",
  "materials",
  "users",
] as const;
export type ReviewStepId = (typeof reviewStepIds)[number];
/** Fixed destinations only: identifiers, query strings and draft values never become routes. */
export function reviewEditStep(id: unknown) {
  return reviewStepIds.some((step) => step === id)
    ? getOnboardingStep(id)
    : undefined;
}
export interface ReadinessIssue {
  step: ReviewStepId;
  field: string;
  message: string;
  entityId?: string;
}
/** Client-side preview checks only. No lifecycle, identity or server authorization decision. */
export function validateOnboardingReadiness(draft: OnboardingDraft) {
  const issues: ReadinessIssue[] = [];
  const add = (
    step: ReviewStepId,
    field: string,
    message?: string,
    entityId?: string,
  ) => {
    if (message)
      issues.push({ step, field, message, ...(entityId ? { entityId } : {}) });
  };
  const business = validateBusinessRegistration(draft.business);
  for (const [field, message] of Object.entries(business.errors))
    add("business", field, message);
  const quarry = validateQuarrySetup(draft);
  add("quarry", "configuration", quarry.issue);
  for (const [id, error] of Object.entries(quarry.errors)) {
    const site = draft.sites.find((item) => item.id === id);
    const label = site?.name.trim() || "Unnamed quarry";
    for (const field of [
      "name",
      "code",
      "stateName",
      "district",
      "pits",
    ] as const)
      if (error[field]) add("quarry", field, `${label}: ${error[field]}`, id);
    for (const [pitId, pitError] of Object.entries(error.pitErrors)) {
      const pit = site?.pits.find((item) => item.id === pitId);
      for (const [field, message] of Object.entries(pitError))
        add(
          "quarry",
          field,
          `${label} / ${pit?.name.trim() || "Unnamed pit / bench"}: ${message}`,
          pitId,
        );
    }
  }
  const materials = validateMaterialsSetup(draft);
  for (const field of [
    "materials",
    "grades",
    "identity",
    "preferences",
  ] as const)
    add("materials", field, materials.errors[field]);
  // Step 2's detailed errors above own the quarry prerequisite, avoiding duplicate reports.
  for (const [id, message] of Object.entries(materials.errors.sites))
    add(
      "materials",
      "stockyardCoverage",
      `${draft.sites.find((site) => site.id === id)?.name.trim() || "Unnamed quarry"}: ${message}`,
      id,
    );
  for (const [id, error] of Object.entries(materials.errors.stockyards))
    for (const [field, message] of Object.entries(error))
      add(
        "materials",
        field,
        `${draft.stockyards.find((yard) => yard.id === id)?.name.trim() || "Unnamed stockyard"}: ${message}`,
        id,
      );
  const users = validateUsersSetup(draft);
  // Owner name/phone errors are already reported by the Business Registration validator.
  if (users.ownerError && business.valid)
    add("business", "owner", users.ownerError);
  add("users", "identity", users.identityError);
  for (const [id, error] of Object.entries(users.errors))
    for (const [field, message] of Object.entries(error))
      add(
        "users",
        field,
        `${draft.invitations.find((item) => item.id === id)?.name.trim() || "Unnamed team member"}: ${message}`,
        id,
      );
  return {
    ready: business.valid && quarry.valid && materials.valid && users.valid,
    issues,
    steps: reviewStepIds.map((id) => ({
      ...reviewEditStep(id)!,
      valid: !issues.some((issue) => issue.step === id),
      issues: issues.filter((issue) => issue.step === id),
    })),
  };
}
const display = (value: string) => value.trim() || "Not provided";
/** Resolve every relationship by stable draft ID. Unknown references are visible, never guessed. */
export function onboardingReviewSummary(draft: OnboardingDraft) {
  const siteLabel = (id: string) => {
    const site = draft.sites.find((item) => item.id === id);
    return site
      ? `${display(site.name)} · ${display(site.code)}`
      : `Missing quarry (${id})`;
  };
  const owner = primaryOwnerFromBusiness(draft.business);
  return {
    business: { ...draft.business },
    quarryMode: draft.multiSiteEnabled ? "Multiple Quarries" : "Single Quarry",
    quarries: draft.sites.map((site) => ({
      ...site,
      pits: site.pits.map((pit) => ({
        ...pit,
        kindLabel:
          pit.kind === "PIT"
            ? "Pit"
            : pit.kind === "BENCH"
              ? "Bench"
              : "Invalid type",
      })),
    })),
    materials: draft.materials.map((material) => ({ ...material })),
    grades: supportedGrades.map((code) => ({
      code,
      configured: draft.grades.some((grade) => grade.code === code),
      description:
        draft.grades.find((grade) => grade.code === code)?.description ?? "",
    })),
    stockyards: draft.stockyards.map((yard) => ({
      ...yard,
      quarryLabel: siteLabel(yard.siteId),
      pitLabel:
        yard.pitId === null
          ? "Entire quarry (shared)"
          : draft.sites
              .find((site) => site.id === yard.siteId)
              ?.pits.find((pit) => pit.id === yard.pitId)
              ?.name.trim() || `Missing pit / bench (${yard.pitId})`,
    })),
    preferences: {
      ...draft.preferences,
      dimensionLabel:
        draft.preferences.dimensionUnit === "FT"
          ? "Feet (FT)"
          : draft.preferences.dimensionUnit === "M"
            ? "Metres (M)"
            : "Invalid dimension preference",
      volumeLabel:
        draft.preferences.volumeDisplay === "CFT"
          ? "Cubic Feet (CFT)"
          : draft.preferences.volumeDisplay === "M3"
            ? "Cubic Metres (m³)"
            : "Invalid volume preference",
    },
    owner: {
      ...owner,
      roleLabel: "Business Owner",
      accessLabel: "All Quarry Sites",
    },
    invitations: draft.invitations.map((item) => ({
      ...item,
      siteIds: [...item.siteIds],
      roleLabel:
        invitationRoles.find((role) => role.id === item.role)?.label ??
        "Invalid role",
      accessLabel:
        item.accessScope === "ALL_SITES"
          ? "All Quarry Sites"
          : item.accessScope === "ASSIGNED_SITES"
            ? item.siteIds.length
              ? item.siteIds.map(siteLabel).join("; ")
              : "No quarries assigned"
            : "Invalid access scope",
    })),
  };
}
export const activationPreviewNotice =
  "This is a demonstration. No organization has been created or activated in Supabase.";
/** Revalidate the current draft for every click; return no confirmation payload for invalid drafts. */
export function buildActivationPreview(draft: OnboardingDraft) {
  const readiness = validateOnboardingReadiness(draft);
  if (!readiness.ready)
    return { allowed: false as const, readiness, summary: null };
  return {
    allowed: true as const,
    readiness,
    summary: {
      businessName: draft.business.businessName.trim(),
      quarryCount: draft.sites.length,
      pitBenchCount: draft.sites.reduce(
        (sum, site) => sum + site.pits.length,
        0,
      ),
      stockyardCount: draft.stockyards.length,
      materials: draft.materials.map((material) => material.name),
      ownerName: draft.business.ownerDisplayName.trim(),
      ownerCount: 1,
      additionalTeamMemberCount: draft.invitations.length,
    },
  };
}
