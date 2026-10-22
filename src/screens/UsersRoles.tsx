import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { FormField, PrimaryButton, SelectField, s } from "../components/ui";
import { OnboardingStepLayout } from "../components/onboarding/OnboardingStepLayout";
import { OnboardingReferenceField } from "../components/onboarding/OnboardingReferenceField";
import { useOnboardingDraft } from "../features/onboarding/OnboardingProvider";
import { getOnboardingStep } from "../features/onboarding/model";
import {
  canSkipTeamSetup,
  invitationRoles,
  validateUsersSetup,
} from "../features/onboarding/usersSetup";
import type {
  InvitationRole,
  UsersCommand,
} from "../features/onboarding/usersSetup";
import { colors as c } from "../config/theme";

export default function UsersRoles() {
  const { state, dispatch } = useOnboardingDraft();
  const [attempted, setAttempted] = useState(false);
  const [removalId, setRemovalId] = useState<string | null>(null);
  const draft = state.draft;
  const owner = draft.primaryOwner;
  const validation = validateUsersSetup(draft);
  const send = (command: UsersCommand) =>
    dispatch({ type: "USERS_COMMAND", command });
  const normalize = () => {
    send({ type: "NORMALIZE" });
    return true;
  };
  const errorText = (message?: string) =>
    message ? (
      <Text
        accessibilityLiveRegion="polite"
        style={[s.text, { color: c.error }]}
      >
        {message}
      </Text>
    ) : null;
  const single =
    !draft.multiSiteEnabled &&
    draft.sites.length === 1 &&
    draft.sites[0].isPrimary;
  return (
    <OnboardingStepLayout
      step="users"
      showPreferences={false}
      beforeContinue={() => {
        setAttempted(true);
        normalize();
        return validation.valid;
      }}
      beforeSave={normalize}
      onReset={() => {
        setAttempted(false);
        setRemovalId(null);
      }}
    >
      <Text style={s.heading}>Demo Invitation Setup</Text>
      <Text style={s.muted}>
        Prepare intended roles and quarry access for this session. No
        invitations are sent, accounts created or permissions granted.
      </Text>
      <View style={[s.card, { padding: 16, gap: 10 }]} testID="primary-owner">
        <Text accessibilityRole="header" style={s.heading}>
          Primary Business Owner
        </Text>
        <Text style={s.label}>Owner Display Name</Text>
        <Text style={s.text}>
          {owner.displayName.trim() || "Not provided — complete Step 1"}
        </Text>
        <Text style={s.label}>Business Contact Number</Text>
        <Text style={s.text}>
          {owner.contactPhone || "Not provided — complete Step 1"}
        </Text>
        <Text style={s.text}>Role: Owner · OWNER</Text>
        <Text style={s.text}>Access: All Sites · ALL_SITES</Text>
        <Text style={s.muted}>
          Automatically follows Business Registration. This primary Owner cannot
          be removed or assigned another role here.
        </Text>
        {attempted && errorText(validation.ownerError)}
      </View>
      <Text style={s.muted}>
        Additional team members are optional. Each added draft needs a name,
        supported contact and valid role/access before Continue. Save Draft can
        retain incomplete entries.
      </Text>
      {draft.invitations.map((item, index) => {
        const error = attempted ? validation.errors[item.id] : undefined;
        const role = invitationRoles.find((value) => value.id === item.role);
        const validSingleAssignment =
          single &&
          item.siteIds.length === 1 &&
          item.siteIds[0] === draft.sites[0].id;
        const siteChoice = (id: string, label: string) => (
          <Pressable
            key={id}
            accessibilityRole="checkbox"
            accessibilityLabel={`Quarry access: ${label}`}
            accessibilityState={{ checked: item.siteIds.includes(id) }}
            aria-checked={item.siteIds.includes(id)}
            onPress={() =>
              send({ type: "TOGGLE_SITE", id: item.id, siteId: id })
            }
            style={[
              s.input,
              {
                minHeight: 54,
                paddingVertical: 12,
                borderColor: item.siteIds.includes(id) ? c.orange : c.line,
              },
            ]}
          >
            <Text style={s.text}>
              {item.siteIds.includes(id) ? "☑ " : "☐ "}
              {label}
            </Text>
          </Pressable>
        );
        return (
          <View
            key={item.id}
            testID={`invitation-${item.id}`}
            style={[s.card, { padding: 16, gap: 12 }]}
          >
            <Text accessibilityRole="header" style={s.heading}>
              Team Member {index + 1}
            </Text>
            <Text style={s.muted}>Session draft only</Text>
            <FormField
              label="Team Member Name"
              required
              value={item.name}
              onChange={(name) =>
                send({ type: "EDIT_INVITATION", id: item.id, fields: { name } })
              }
              error={error?.name}
            />
            <SelectField
              label="Contact Method"
              value={item.channel === "PHONE" ? "Mobile number" : "Email"}
              options={["Email", "Mobile number"]}
              onChange={(value) =>
                send({
                  type: "EDIT_INVITATION",
                  id: item.id,
                  fields: { channel: value === "Email" ? "EMAIL" : "PHONE" },
                })
              }
            />
            <FormField
              label={
                item.channel === "PHONE" ? "Mobile Number" : "Email Address"
              }
              required
              value={item.recipient}
              onChange={(recipient) =>
                send({
                  type: "EDIT_INVITATION",
                  id: item.id,
                  fields: { recipient },
                })
              }
              keyboardType={
                item.channel === "PHONE" ? "phone-pad" : "email-address"
              }
              autoCapitalize="none"
              autoCorrect={false}
              hint={
                item.channel === "PHONE"
                  ? "Indian mobile: 10 digits starting with 6–9, or +91. Spaces and hyphens accepted."
                  : "Format only; email ownership and delivery are not verified."
              }
              error={error?.recipient}
            />
            <OnboardingReferenceField
              label="Intended Role"
              required
              value={item.role}
              options={invitationRoles.map((value) => ({
                id: value.id,
                label: value.label,
              }))}
              onChange={(value) =>
                send({
                  type: "SET_ROLE",
                  id: item.id,
                  role: value as InvitationRole,
                })
              }
              error={error?.role}
            />
            {role && (
              <Text style={s.muted}>
                {role.description} These are intended future capabilities.
              </Text>
            )}
            {item.role === "ADMIN" ? (
              <Text style={s.text}>
                Quarry Access: All Sites (required for Admin)
              </Text>
            ) : (
              <OnboardingReferenceField
                label="Quarry Access"
                value={item.accessScope}
                options={[
                  { id: "ASSIGNED_SITES", label: "Assigned Quarries" },
                  { id: "ALL_SITES", label: "All Sites" },
                ]}
                onChange={(scope) =>
                  send({
                    type: "SET_ACCESS",
                    id: item.id,
                    scope: scope as "ALL_SITES" | "ASSIGNED_SITES",
                  })
                }
                error={error?.sites}
              />
            )}
            {item.accessScope === "ALL_SITES" && (
              <Text style={s.muted}>
                Explicitly includes every configured quarry and future quarries.
                The intended role still limits capabilities.
              </Text>
            )}
            {item.accessScope === "ASSIGNED_SITES" &&
              (validSingleAssignment ? (
                <Text style={s.text}>
                  Assigned Quarry: {draft.sites[0].name || "Primary Quarry"} ·{" "}
                  {draft.sites[0].code}
                </Text>
              ) : (
                <View style={{ gap: 10 }}>
                  <Text style={s.label}>Select one or more quarries *</Text>
                  {draft.sites.map((site) =>
                    siteChoice(
                      site.id,
                      `${site.name || "Unnamed quarry"} · ${site.code}`,
                    ),
                  )}
                  {item.siteIds
                    .filter((id) => !draft.sites.some((site) => site.id === id))
                    .map((id) =>
                      siteChoice(
                        id,
                        `Removed quarry (${id}) — uncheck to correct`,
                      ),
                    )}
                </View>
              ))}
            {errorText(error?.sites)}
            <FormField
              label="Remarks"
              multiline
              value={item.remarks}
              onChange={(remarks) =>
                send({
                  type: "EDIT_INVITATION",
                  id: item.id,
                  fields: { remarks },
                })
              }
            />
            <PrimaryButton
              secondary
              title="Remove Team Member"
              onPress={() => setRemovalId(item.id)}
            />
          </View>
        );
      })}
      <PrimaryButton
        secondary
        title="Add Team Member"
        onPress={() => send({ type: "ADD_INVITATION" })}
      />
      {errorText(state.usersIssue)}
      {attempted && errorText(validation.identityError)}
      {attempted && !validation.valid && (
        <Text accessibilityRole="alert" style={[s.text, { color: c.error }]}>
          Correct the highlighted Owner or team member details before
          continuing.
        </Text>
      )}
      <PrimaryButton
        secondary
        title="Skip for Now — I'll add team members later."
        disabled={draft.invitations.length > 0}
        onPress={() => {
          setAttempted(true);
          if (canSkipTeamSetup(draft))
            router.replace(getOnboardingStep("review")!.route);
        }}
      />
      {draft.invitations.length > 0 && (
        <Text style={s.muted}>
          To continue with Owner only, remove additional drafts using their
          confirmation controls. Skip never discards entered data.
        </Text>
      )}
      <Modal
        visible={!!removalId}
        transparent
        animationType="fade"
        onRequestClose={() => setRemovalId(null)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 24,
            backgroundColor: "#18212699",
          }}
        >
          <ScrollView
            style={{
              maxHeight: "85%",
              width: "100%",
              maxWidth: 480,
              alignSelf: "center",
            }}
            contentContainerStyle={s.card}
            accessibilityViewIsModal
          >
            <Text style={s.heading}>Remove team member draft?</Text>
            <Text style={s.text}>
              Remove{" "}
              {draft.invitations
                .find((item) => item.id === removalId)
                ?.name.trim() || "this team member"}{" "}
              from this session draft? The primary Owner will remain.
            </Text>
            <PrimaryButton
              secondary
              title="Cancel"
              onPress={() => setRemovalId(null)}
            />
            <PrimaryButton
              title="Confirm removal"
              onPress={() => {
                if (removalId)
                  send({
                    type: "REMOVE_INVITATION",
                    id: removalId,
                    confirmed: true,
                  });
                setRemovalId(null);
              }}
            />
          </ScrollView>
        </View>
      </Modal>
    </OnboardingStepLayout>
  );
}
