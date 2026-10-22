import type {
  BusinessDraft,
  OnboardingDraft,
  OnboardingState,
  UserInvitationDraft,
} from "./model";

/** Mirrors the reviewed matrix and deployed role/scope constraint; no authorization is performed. */
export const invitationRoles = [
  {
    id: "ADMIN",
    label: "Admin",
    description:
      "Business configuration and team administration across all quarries; no ownership transfer.",
  },
  {
    id: "QUARRY_MANAGER",
    label: "Quarry Manager",
    description: "Quarry operations and oversight at allowed sites.",
  },
  {
    id: "PRODUCTION_SUPERVISOR",
    label: "Production Supervisor",
    description:
      "Production recording and production reports at allowed sites.",
  },
  {
    id: "SALES_ACCOUNTANT",
    label: "Sales / Accountant",
    description: "Sales, customer and finance work at allowed sites.",
  },
  {
    id: "DISPATCH_GATE_OPERATOR",
    label: "Dispatch / Gate Operator",
    description: "Dispatch and gate work at allowed sites.",
  },
] as const;
export type InvitationRole = UserInvitationDraft["role"];
export function primaryOwnerFromBusiness(
  business: Pick<BusinessDraft, "ownerDisplayName" | "contactPhone">,
): OnboardingDraft["primaryOwner"] {
  return {
    id: "draft-primary-owner",
    role: "OWNER",
    accessScope: "ALL_SITES",
    displayName: business.ownerDisplayName,
    contactPhone: business.contactPhone,
  };
}

/** Same India-first phone formats as Business Registration; +91 and national numbers share one key. */
export function invitationContact(
  channel: UserInvitationDraft["channel"],
  recipient: string,
) {
  if (channel === "PHONE") {
    const phone = recipient.trim().replace(/[\s-]/g, "");
    return /^(?:\+91)?[6-9]\d{9}$/.test(phone)
      ? `+91${phone.slice(-10)}`
      : null;
  }
  if (channel !== "EMAIL") return null;
  const email = recipient.trim().toLowerCase();
  // Format only: no deliverability check or account lookup. Intentionally reject whitespace/multiple @.
  return /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email) ? email : null;
}
export interface InvitationErrors {
  name?: string;
  recipient?: string;
  role?: string;
  sites?: string;
}
export function validateUsersSetup(draft: OnboardingDraft) {
  const errors: Record<string, InvitationErrors> = {};
  const owner = primaryOwnerFromBusiness(draft.business);
  const ownerPhone = invitationContact("PHONE", owner.contactPhone);
  const ownerError =
    !owner.displayName.trim() || !ownerPhone
      ? "Complete the Owner name and valid business contact number in Step 1."
      : undefined;
  let identityError: string | undefined;
  const ids = new Set<string>();
  const contacts = draft.invitations.map((item) =>
    invitationContact(item.channel, item.recipient),
  );
  for (const [index, item] of draft.invitations.entries()) {
    const error: InvitationErrors = {};
    if (!item.id || item.id === owner.id || ids.has(item.id))
      identityError =
        "Team member draft IDs must be unique and separate from the primary Owner.";
    ids.add(item.id);
    if (!item.name.trim()) error.name = "Enter the team member's name.";
    const contact = contacts[index];
    if (!contact)
      error.recipient =
        item.channel === "PHONE"
          ? "Enter a 10-digit Indian mobile, optionally prefixed with +91."
          : "Enter a valid email address.";
    else if (
      contacts.filter((value) => value === contact).length > 1 ||
      contact === ownerPhone
    )
      error.recipient = "This contact is already used in this business draft.";
    if (!invitationRoles.some((role) => role.id === item.role))
      error.role =
        "Choose a supported team role. Owner invitations are unavailable.";
    if (item.role === "ADMIN" && item.accessScope !== "ALL_SITES")
      error.sites = "Admin requires All Sites access.";
    else if (item.accessScope === "ALL_SITES") {
      if (item.siteIds.length)
        error.sites =
          "All Sites must not contain separate quarry assignments. Choose the intended access again.";
    } else if (item.accessScope === "ASSIGNED_SITES") {
      if (
        !item.siteIds.length ||
        new Set(item.siteIds).size !== item.siteIds.length ||
        item.siteIds.some((id) => !draft.sites.some((site) => site.id === id))
      )
        error.sites =
          "Select one or more existing quarries. Resolve any removed quarry references.";
    } else error.sites = "Choose a valid quarry access scope.";
    if (Object.keys(error).length) errors[item.id] = error;
  }
  return {
    errors,
    ownerError,
    identityError,
    valid: !ownerError && !identityError && !Object.keys(errors).length,
  };
}
export function canSkipTeamSetup(draft: OnboardingDraft) {
  return !draft.invitations.length && validateUsersSetup(draft).valid;
}

export type UsersCommand =
  | { type: "ADD_INVITATION" }
  | {
      type: "EDIT_INVITATION";
      id: string;
      fields: Partial<
        Pick<UserInvitationDraft, "name" | "recipient" | "remarks" | "channel">
      >;
    }
  | { type: "SET_ROLE"; id: string; role: InvitationRole }
  | {
      type: "SET_ACCESS";
      id: string;
      scope: UserInvitationDraft["accessScope"];
    }
  | { type: "TOGGLE_SITE"; id: string; siteId: string }
  | { type: "REMOVE_INVITATION"; id: string; confirmed: boolean }
  | { type: "NORMALIZE" };

export function reduceUsersCommand(
  state: OnboardingState,
  command: UsersCommand,
): OnboardingState {
  const draft = state.draft;
  let invitations = draft.invitations;
  let nextInvitationDraftId = state.nextInvitationDraftId;
  const fail = (usersIssue: string) => ({ ...state, usersIssue });
  const singleSite =
    !draft.multiSiteEnabled &&
    draft.sites.length === 1 &&
    draft.sites[0].isPrimary
      ? [draft.sites[0].id]
      : [];
  if (command.type === "ADD_INVITATION") {
    let id: string;
    do {
      id = `draft-invitation-${nextInvitationDraftId++}`;
    } while (invitations.some((item) => item.id === id));
    invitations = [
      ...invitations,
      {
        id,
        name: "",
        remarks: "",
        recipient: "",
        channel: "EMAIL",
        role: "PRODUCTION_SUPERVISOR",
        accessScope: "ASSIGNED_SITES",
        siteIds: singleSite,
      },
    ];
  } else if (command.type === "NORMALIZE") {
    invitations = invitations.map((item) => ({
      ...item,
      name: item.name.trim(),
      remarks: item.remarks.trim(),
      recipient:
        invitationContact(item.channel, item.recipient) ??
        item.recipient.trim(),
    }));
    if (JSON.stringify(invitations) === JSON.stringify(draft.invitations))
      return { ...state, usersIssue: "" };
  } else {
    const item = invitations.find((value) => value.id === command.id);
    if (!item || command.id === "draft-primary-owner")
      return fail(
        "Only additional team member drafts can be changed. The primary Owner is fixed.",
      );
    let updated = item;
    if (command.type === "REMOVE_INVITATION") {
      if (!command.confirmed)
        return fail("Confirm removal of this team member draft first.");
      invitations = invitations.filter((value) => value.id !== item.id);
    } else {
      if (command.type === "EDIT_INVITATION") {
        const channel = command.fields.channel ?? item.channel;
        if (channel !== "EMAIL" && channel !== "PHONE")
          return fail("Choose Email or Mobile number.");
        updated = {
          ...item,
          name: command.fields.name ?? item.name,
          remarks: command.fields.remarks ?? item.remarks,
          recipient: command.fields.recipient ?? item.recipient,
          channel,
        };
      } else if (command.type === "SET_ROLE") {
        if (!invitationRoles.some((role) => role.id === command.role))
          return fail(
            "Choose a supported team role; the primary Owner cannot be replaced.",
          );
        if (command.role === item.role) return { ...state, usersIssue: "" };
        // Role changes are explicit. Admin is ALL_SITES; moving away resets to restrictive assignments.
        updated = {
          ...item,
          role: command.role,
          accessScope:
            command.role === "ADMIN" ? "ALL_SITES" : "ASSIGNED_SITES",
          siteIds:
            command.role === "ADMIN"
              ? []
              : item.accessScope === "ASSIGNED_SITES"
                ? item.siteIds
                : singleSite,
        };
      } else if (command.type === "SET_ACCESS") {
        if (
          !["ALL_SITES", "ASSIGNED_SITES"].includes(command.scope) ||
          (item.role === "ADMIN" && command.scope !== "ALL_SITES")
        )
          return fail(
            "Admin requires All Sites. Choose an allowed access scope.",
          );
        if (command.scope === item.accessScope)
          return { ...state, usersIssue: "" };
        updated = {
          ...item,
          accessScope: command.scope,
          siteIds: command.scope === "ALL_SITES" ? [] : singleSite,
        };
      } else if (command.type === "TOGGLE_SITE") {
        if (item.role === "ADMIN" || item.accessScope !== "ASSIGNED_SITES")
          return fail(
            "Separate quarry assignments require Assigned Quarries access.",
          );
        // A stale reference may be removed explicitly; an unknown reference may never be added.
        if (
          !item.siteIds.includes(command.siteId) &&
          !draft.sites.some((site) => site.id === command.siteId)
        )
          return fail("This quarry is no longer configured.");
        updated = {
          ...item,
          siteIds: item.siteIds.includes(command.siteId)
            ? item.siteIds.filter((id) => id !== command.siteId)
            : [...item.siteIds, command.siteId],
        };
      }
      invitations = invitations.map((value) =>
        value.id === item.id ? updated : value,
      );
    }
  }
  return {
    ...state,
    draft: { ...draft, invitations },
    nextInvitationDraftId,
    usersIssue: "",
    savedForSession: false,
  };
}
