import { useState } from "react";
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { PrimaryButton, s } from "../components/ui";
import { OnboardingStepLayout } from "../components/onboarding/OnboardingStepLayout";
import { useOnboardingDraft } from "../features/onboarding/OnboardingProvider";
import type { OnboardingDraft } from "../features/onboarding/model";
import {
  activationPreviewNotice,
  buildActivationPreview,
  onboardingReviewSummary,
  reviewEditStep,
  validateOnboardingReadiness,
} from "../features/onboarding/reviewSetup";
import type { ReviewStepId } from "../features/onboarding/reviewSetup";
import { colors as c } from "../config/theme";

function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <Text style={s.text}>
      <Text style={s.label}>{label}: </Text>
      {value.trim() || "Not provided"}
    </Text>
  );
}
function ReviewSection({
  step,
  children,
}: {
  step: ReviewStepId;
  children: ReactNode;
}) {
  const destination = reviewEditStep(step)!;
  return (
    <View testID={`review-${step}`} style={[s.card, { padding: 16, gap: 10 }]}>
      <View style={[s.between, { gap: 8 }]}>
        <Text accessibilityRole="header" style={[s.heading, { flex: 1 }]}>
          {destination.title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${destination.title}`}
          onPress={() => router.replace(destination.route)}
          style={{
            minWidth: 56,
            minHeight: 48,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={[s.label, { color: c.primary }]}>Edit →</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}
export default function ReviewActivate() {
  const { state } = useOnboardingDraft();
  const draft = state.draft;
  const summary = onboardingReviewSummary(draft);
  const readiness = validateOnboardingReadiness(draft);
  const [attempted, setAttempted] = useState(false);
  // Local modal visibility only. Any changed/reset draft invalidates this view immediately.
  const [previewDraft, setPreviewDraft] = useState<OnboardingDraft | null>(
    null,
  );
  const preview = previewDraft === draft ? buildActivationPreview(draft) : null;
  const business = summary.business;
  return (
    <OnboardingStepLayout
      step="review"
      showPreferences={false}
      onReset={() => {
        setPreviewDraft(null);
        setAttempted(false);
      }}
      finalAction={{
        title: "Preview Activation",
        feedback:
          attempted && !readiness.ready ? (
            <View style={{ gap: 10 }}>
              <Text
                accessibilityRole="alert"
                style={[s.text, { color: c.error }]}
              >
                Preview unavailable. Correct the affected steps listed above and
                return to Review.
              </Text>
              <PrimaryButton
                secondary
                title="Correct next issue"
                onPress={() => {
                  const nextIssue = readiness.steps.find((step) => !step.valid);
                  if (nextIssue) router.replace(nextIssue.route);
                }}
              />
            </View>
          ) : undefined,
        onPress: () => {
          setAttempted(true);
          const result = buildActivationPreview(draft);
          setPreviewDraft(result.allowed ? draft : null);
        },
      }}
    >
      <Text style={s.muted}>
        Review the current session configuration. Progress shows navigation
        only. These client-side checks do not replace future server validation
        or authorize activation.
      </Text>
      <View
        style={[s.card, { padding: 16, gap: 10 }]}
        testID="review-readiness"
      >
        <Text accessibilityRole="header" style={s.heading}>
          {readiness.ready
            ? "Ready for demo preview"
            : "Configuration needs attention"}
        </Text>
        <Text style={s.muted}>
          {readiness.ready
            ? "The current draft passes the checks from Steps 1–4. No business has been activated."
            : "Correct the following details. Incomplete drafts can still be saved for this session."}
        </Text>
        {readiness.steps
          .filter((step) => !step.valid)
          .map((step) => (
            <View key={step.id} style={{ gap: 8 }}>
              <Text style={s.label}>{step.title}</Text>
              {step.issues.map((issue, index) => (
                <Text
                  key={`${issue.entityId ?? "step"}-${issue.field}-${index}`}
                  style={[s.text, { color: c.error }]}
                >
                  • {issue.message}
                </Text>
              ))}
              <PrimaryButton
                secondary
                title={`Fix ${step.title}`}
                onPress={() => router.replace(step.route)}
              />
            </View>
          ))}
      </View>
      <ReviewSection step="business">
        <SummaryValue label="Business Name" value={business.businessName} />
        {!!business.legalName.trim() && (
          <SummaryValue label="Legal Name" value={business.legalName} />
        )}
        <SummaryValue label="Owner" value={business.ownerDisplayName} />
        <SummaryValue label="Contact Number" value={business.contactPhone} />
        <SummaryValue label="State" value={business.stateName} />
        <SummaryValue label="District" value={business.district} />
        <SummaryValue label="Business Address" value={business.address} />
        {!!business.gstin.trim() && (
          <SummaryValue label="GSTIN" value={business.gstin} />
        )}
      </ReviewSection>
      <ReviewSection step="quarry">
        <SummaryValue label="Configuration" value={summary.quarryMode} />
        {!summary.quarries.length && (
          <Text style={s.text}>No quarries configured.</Text>
        )}
        {summary.quarries.map((site) => (
          <View
            key={site.id}
            testID={`review-site-${site.id}`}
            style={{
              gap: 6,
              paddingTop: 8,
              borderTopWidth: 1,
              borderColor: c.line,
            }}
          >
            <Text style={s.heading}>
              {site.isPrimary ? "Primary Quarry" : "Additional Quarry"}
            </Text>
            <SummaryValue label="Quarry Name" value={site.name} />
            <SummaryValue label="Quarry Code" value={site.code} />
            <SummaryValue label="State" value={site.stateName} />
            <SummaryValue label="District" value={site.district} />
            <SummaryValue label="Quarry Address" value={site.address} />
            <Text style={s.label}>Pits / Benches ({site.pits.length})</Text>
            {!site.pits.length && <Text style={s.text}>None configured.</Text>}
            {site.pits.map((pit) => (
              <SummaryValue
                key={pit.id}
                label={pit.kindLabel}
                value={pit.name}
              />
            ))}
          </View>
        ))}
      </ReviewSection>
      <ReviewSection step="materials">
        <SummaryValue
          label="Selected Materials"
          value={
            summary.materials.map((item) => item.name).join(", ") ||
            "None selected"
          }
        />
        {summary.grades.map((grade) => (
          <SummaryValue
            key={grade.code}
            label={`Grade ${grade.code}`}
            value={
              !grade.configured
                ? "Not configured"
                : grade.description.trim() || "No description"
            }
          />
        ))}
        <Text style={s.label}>Stockyards ({summary.stockyards.length})</Text>
        {!summary.stockyards.length && (
          <Text style={s.text}>None configured.</Text>
        )}
        {summary.stockyards.map((yard) => (
          <View
            key={yard.id}
            testID={`review-yard-${yard.id}`}
            style={{
              gap: 6,
              paddingTop: 8,
              borderTopWidth: 1,
              borderColor: c.line,
            }}
          >
            <SummaryValue label="Stockyard" value={yard.name} />
            <SummaryValue label="Quarry" value={yard.quarryLabel} />
            <SummaryValue label="Pit / Bench" value={yard.pitLabel} />
          </View>
        ))}
        <SummaryValue
          label="Dimension Entry"
          value={summary.preferences.dimensionLabel}
        />
        <SummaryValue
          label="Volume Display"
          value={summary.preferences.volumeLabel}
        />
        <SummaryValue label="Currency" value={summary.preferences.currency} />
        <SummaryValue label="Timezone" value={summary.preferences.timezone} />
      </ReviewSection>
      <ReviewSection step="users">
        <SummaryValue label="Primary Owner" value={summary.owner.displayName} />
        <SummaryValue
          label="Owner Contact"
          value={summary.owner.contactPhone}
        />
        <SummaryValue label="Role" value={summary.owner.roleLabel} />
        <SummaryValue label="Access" value={summary.owner.accessLabel} />
        <Text style={s.label}>
          Additional Team Members ({summary.invitations.length})
        </Text>
        {!summary.invitations.length && (
          <Text style={s.text}>
            Owner-only setup. No additional team member drafts.
          </Text>
        )}
        {summary.invitations.map((item) => (
          <View
            key={item.id}
            testID={`review-invitation-${item.id}`}
            style={{
              gap: 6,
              paddingTop: 8,
              borderTopWidth: 1,
              borderColor: c.line,
            }}
          >
            <SummaryValue label="Name" value={item.name} />
            <SummaryValue
              label={item.channel === "PHONE" ? "Mobile" : "Email"}
              value={item.recipient}
            />
            <SummaryValue label="Intended Role" value={item.roleLabel} />
            <SummaryValue label="Quarry Access" value={item.accessLabel} />
            {!!item.remarks.trim() && (
              <SummaryValue label="Remarks" value={item.remarks} />
            )}
          </View>
        ))}
        <Text style={s.muted}>
          Team members are session drafts. No invitations or permissions have
          been created.
        </Text>
      </ReviewSection>
      <Modal
        visible={!!preview?.allowed}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewDraft(null)}
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
            testID="activation-preview"
            style={{
              maxHeight: "85%",
              width: "100%",
              maxWidth: 480,
              alignSelf: "center",
            }}
            contentContainerStyle={[s.card, { padding: 16, gap: 12 }]}
            accessibilityViewIsModal
          >
            <Text accessibilityRole="header" style={s.heading}>
              Demo Activation Preview
            </Text>
            <Text style={s.text}>{activationPreviewNotice}</Text>
            {preview?.allowed && (
              <>
                <SummaryValue
                  label="Business"
                  value={preview.summary.businessName}
                />
                <SummaryValue
                  label="Quarries"
                  value={String(preview.summary.quarryCount)}
                />
                <SummaryValue
                  label="Pits / Benches"
                  value={String(preview.summary.pitBenchCount)}
                />
                <SummaryValue
                  label="Stockyards"
                  value={String(preview.summary.stockyardCount)}
                />
                <SummaryValue
                  label="Materials"
                  value={preview.summary.materials.join(", ")}
                />
                <SummaryValue
                  label="Business Owner"
                  value={preview.summary.ownerName}
                />
                <Text style={s.text}>
                  1 Owner · {preview.summary.additionalTeamMemberCount}{" "}
                  additional team member
                  {preview.summary.additionalTeamMemberCount === 1 ? "" : "s"}
                </Text>
              </>
            )}
            <Text style={s.muted}>
              No lifecycle state or permissions changed. Server validation and
              real activation are future work.
            </Text>
            <PrimaryButton
              title="Return to Review"
              onPress={() => setPreviewDraft(null)}
            />
          </ScrollView>
        </View>
      </Modal>
    </OnboardingStepLayout>
  );
}
