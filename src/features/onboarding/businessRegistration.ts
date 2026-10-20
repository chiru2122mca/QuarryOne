import type { BusinessDraft } from "./model";

/** Stable field keys and centralized copy allow future translations without changing draft data. */
export const businessRegistrationCopy = {
  businessSection: "Business Information",
  ownerSection: "Owner Information",
  requiredNote: "* Required fields",
  demoNote:
    "Demo only. Data is not yet saved to Supabase. Entries stay in this app session and are cleared on reload.",
  incompleteNote:
    "Incomplete entries are retained when you go Back. Continue and Save Draft validate required information.",
  errorSummary:
    "Please correct the highlighted fields before continuing or saving.",
  phoneHint:
    "Indian mobile: 10 digits starting with 6–9, or +91 followed by that number. Spaces and hyphens are accepted.",
  gstinHint:
    "Optional. Standard 15-character GSTIN format only; registration is not verified.",
  fields: {
    businessName: {
      label: "Business Name",
      required: true,
      error: "Enter the business name.",
    },
    legalName: { label: "Legal Business Name", required: false },
    contactPhone: {
      label: "Business Contact Number",
      required: true,
      error: "Enter the business contact number.",
    },
    stateName: { label: "State", required: true, error: "Enter the state." },
    district: { label: "District", required: false },
    address: { label: "Business Address", required: false },
    gstin: { label: "GSTIN", required: false },
    ownerDisplayName: {
      label: "Owner Display Name",
      required: true,
      error: "Enter the owner's display name.",
    },
  },
  phoneError:
    "Enter a valid 10-digit Indian mobile number, optionally prefixed with +91.",
  gstinError:
    "Enter a 15-character GSTIN: state code, PAN, entity code, Z and check character.",
} as const;
export type BusinessErrors = Partial<Record<keyof BusinessDraft, string>>;

export function normalizeBusinessDraft(draft: BusinessDraft): BusinessDraft {
  return {
    businessName: draft.businessName.trim(),
    legalName: draft.legalName.trim(),
    contactPhone: draft.contactPhone.trim().replace(/[\s-]/g, ""),
    stateName: draft.stateName.trim(),
    district: draft.district.trim(),
    address: draft.address.trim(),
    gstin: draft.gstin.trim().toUpperCase(),
    ownerDisplayName: draft.ownerDisplayName.trim(),
  };
}

/** Format-only checks, deliberately no Auth, GST service, database or navigation side effects. */
export function validateBusinessRegistration(draft: BusinessDraft) {
  const value = normalizeBusinessDraft(draft);
  const errors: BusinessErrors = {};
  const fields = businessRegistrationCopy.fields;
  for (const key of [
    "businessName",
    "contactPhone",
    "stateName",
    "ownerDisplayName",
  ] as const) {
    if (!value[key]) errors[key] = fields[key].error;
  }
  if (value.contactPhone && !/^(?:\+91)?[6-9]\d{9}$/.test(value.contactPhone)) {
    errors.contactPhone = businessRegistrationCopy.phoneError;
  }
  // Standard PAN-based GSTIN; no checksum, state-directory lookup or registration-status claim.
  if (
    value.gstin &&
    !/^(?!00)\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value.gstin)
  ) {
    errors.gstin = businessRegistrationCopy.gstinError;
  }
  return { value, errors, valid: Object.keys(errors).length === 0 };
}
