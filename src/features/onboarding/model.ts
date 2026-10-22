import { reduceQuarryCommand } from "./quarrySetup";
import type { QuarryCommand } from "./quarrySetup";
import { reduceMaterialsCommand } from "./materialsSetup";
import type { MaterialsCommand } from "./materialsSetup";
import { primaryOwnerFromBusiness, reduceUsersCommand } from "./usersSetup";
import type { UsersCommand } from "./usersSetup";
/** Explicit destinations: never treat a supplied step identifier as a route. */
export const onboardingSteps = [
  {
    id: "business",
    title: "Business Registration",
    route: "/onboarding/business",
    purpose: "Prepare business and owner contact details.",
  },
  {
    id: "quarry",
    title: "Quarry Configuration",
    route: "/onboarding/quarry",
    purpose: "Configure quarry sites and their pits or benches.",
  },
  {
    id: "materials",
    title: "Materials & Measurements",
    route: "/onboarding/materials",
    purpose:
      "Choose materials, grades, stockyards and measurement preferences.",
  },
  {
    id: "users",
    title: "Users & Roles",
    route: "/onboarding/users",
    purpose: "Prepare invitation drafts and intended site access.",
  },
  {
    id: "review",
    title: "Review & Activate",
    route: "/onboarding/review",
    purpose: "Review the configuration before a future activation workflow.",
  },
] as const;
export type OnboardingStepId = (typeof onboardingSteps)[number]["id"];

export function getOnboardingStep(id: unknown) {
  return onboardingSteps.find((step) => step.id === id);
}
export function adjacentOnboardingStep(
  id: unknown,
  direction: "back" | "forward",
) {
  const index = onboardingSteps.findIndex((step) => step.id === id);
  if (index < 0) return undefined;
  return onboardingSteps[index + (direction === "forward" ? 1 : -1)];
}

export interface BusinessDraft {
  businessName: string;
  legalName: string;
  ownerDisplayName: string;
  contactPhone: string;
  stateName: string;
  district: string;
  address: string;
  gstin: string;
}
export interface PitDraft {
  id: string;
  name: string;
  kind: "PIT" | "BENCH";
}
export interface QuarrySiteDraft {
  id: string;
  code: string;
  name: string;
  stateName: string;
  district: string;
  address: string;
  isPrimary: boolean;
  pits: PitDraft[];
}
export interface StockyardDraft {
  id: string;
  siteId: string;
  pitId: string | null;
  name: string;
}
export interface MeasurementPreferencesDraft {
  dimensionUnit: "FT" | "M";
  volumeDisplay: "CFT" | "M3";
  cftDecimals: number;
  cubicMetreDecimals: number;
  currency: "INR";
  timezone: string;
}
export interface UserInvitationDraft {
  id: string;
  name: string;
  remarks: string;
  recipient: string;
  channel: "EMAIL" | "PHONE";
  role:
    | "ADMIN"
    | "QUARRY_MANAGER"
    | "PRODUCTION_SUPERVISOR"
    | "SALES_ACCOUNTANT"
    | "DISPATCH_GATE_OPERATOR";
  accessScope: "ALL_SITES" | "ASSIGNED_SITES";
  siteIds: string[];
}
/** Incomplete, request-local drafts; none of these identifiers convey authorization. */
export interface OnboardingDraft {
  primaryOwner: {
    readonly id: "draft-primary-owner";
    readonly role: "OWNER";
    readonly accessScope: "ALL_SITES";
    readonly displayName: string;
    readonly contactPhone: string;
  };
  business: BusinessDraft;
  multiSiteEnabled: boolean;
  sites: QuarrySiteDraft[];
  materials: { id: string; name: string }[];
  grades: { code: "A" | "B" | "C"; description: string }[];
  stockyards: StockyardDraft[];
  preferences: MeasurementPreferencesDraft;
  invitations: UserInvitationDraft[];
}
export interface OnboardingState {
  nextInvitationDraftId: number;
  usersIssue: string;
  nextStockyardDraftId: number;
  materialsIssue: string;
  quarryPrefillInitialized: boolean;
  nextQuarryEntityId: number;
  quarryIssue: string;
  draft: OnboardingDraft;
  currentStep: OnboardingStepId;
  savedForSession: boolean;
}
export const demoDraftSavedMessage = "Demo draft saved for this session.";
export function createOnboardingState(): OnboardingState {
  return {
    nextInvitationDraftId: 1,
    usersIssue: "",
    nextStockyardDraftId: 1,
    materialsIssue: "",
    quarryPrefillInitialized: false,
    nextQuarryEntityId: 1,
    quarryIssue: "",
    currentStep: "business",
    savedForSession: false,
    draft: {
      primaryOwner: primaryOwnerFromBusiness({
        ownerDisplayName: "",
        contactPhone: "",
      }),
      business: {
        businessName: "",
        legalName: "",
        ownerDisplayName: "",
        contactPhone: "",
        stateName: "",
        district: "",
        address: "",
        gstin: "",
      },
      multiSiteEnabled: false,
      sites: [
        {
          id: "draft-primary-site",
          code: "",
          name: "",
          stateName: "",
          district: "",
          address: "",
          isPrimary: true,
          pits: [],
        },
      ],
      materials: [],
      grades: ["A", "B", "C"].map((code) => ({
        code: code as "A" | "B" | "C",
        description: "",
      })),
      stockyards: [],
      preferences: {
        dimensionUnit: "FT",
        volumeDisplay: "CFT",
        cftDecimals: 2,
        cubicMetreDecimals: 3,
        currency: "INR",
        timezone: "Asia/Kolkata",
      },
      invitations: [],
    },
  };
}
type EditableSection = Exclude<keyof OnboardingDraft, "primaryOwner">;
type UpdateAction = {
  [K in EditableSection]: {
    type: "UPDATE_DRAFT";
    section: K;
    value: OnboardingDraft[K];
  };
}[EditableSection];
export type OnboardingAction =
  | UpdateAction
  | { type: "QUARRY_COMMAND"; command: QuarryCommand }
  | { type: "MATERIALS_COMMAND"; command: MaterialsCommand }
  | { type: "USERS_COMMAND"; command: UsersCommand }
  | { type: "NAVIGATE"; step: OnboardingStepId }
  | { type: "SAVE_DRAFT" }
  | { type: "RESET_DEMO" };

export function onboardingReducer(
  state: OnboardingState,
  action: OnboardingAction,
): OnboardingState {
  switch (action.type) {
    case "USERS_COMMAND":
      return reduceUsersCommand(state, action.command);
    case "MATERIALS_COMMAND":
      return reduceMaterialsCommand(state, action.command);
    case "QUARRY_COMMAND":
      return reduceQuarryCommand(state, action.command);
    case "UPDATE_DRAFT":
      // The primary owner is always derived from Step 1, never an editable membership.
      if ((action.section as string) === "primaryOwner") return state;
      return {
        ...state,
        draft: {
          ...state.draft,
          [action.section]: action.value,
          ...(action.section === "business"
            ? { primaryOwner: primaryOwnerFromBusiness(action.value) }
            : {}),
        },
        savedForSession: false,
      };
    case "NAVIGATE":
      return getOnboardingStep(action.step)
        ? { ...state, currentStep: action.step }
        : state;
    case "SAVE_DRAFT":
      return { ...state, savedForSession: true };
    case "RESET_DEMO":
      return {
        ...createOnboardingState(),
        nextQuarryEntityId: state.nextQuarryEntityId,
        nextStockyardDraftId: state.nextStockyardDraftId,
        nextInvitationDraftId: state.nextInvitationDraftId,
      };
  }
}
