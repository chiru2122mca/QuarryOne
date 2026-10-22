const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createOnboardingState,
  onboardingReducer,
} = require("../../src/features/onboarding/model.ts");
const {
  validateBusinessRegistration,
} = require("../../src/features/onboarding/businessRegistration.ts");
const {
  validateQuarrySetup,
} = require("../../src/features/onboarding/quarrySetup.ts");
const {
  validateMaterialsSetup,
} = require("../../src/features/onboarding/materialsSetup.ts");
const {
  validateUsersSetup,
} = require("../../src/features/onboarding/usersSetup.ts");
const {
  validateOnboardingReadiness,
  onboardingReviewSummary,
  buildActivationPreview,
  reviewEditStep,
  reviewStepIds,
  activationPreviewNotice,
} = require("../../src/features/onboarding/reviewSetup.ts");
const {
  createMockOperationsStore,
} = require("../../src/stores/mockOperationsStore.ts");
const command = (state, type, value) =>
  onboardingReducer(state, { type, command: value });
const quarry = (state, value) => command(state, "QUARRY_COMMAND", value);
const material = (state, value) => command(state, "MATERIALS_COMMAND", value);
const users = (state, value) => command(state, "USERS_COMMAND", value);
const update = (state, section, value) =>
  onboardingReducer(state, { type: "UPDATE_DRAFT", section, value });
function complete(multi = false, team = false) {
  let state = createOnboardingState();
  state = update(state, "business", {
    businessName: "Demo Granites",
    legalName: "Demo Legal",
    ownerDisplayName: "Demo Owner",
    contactPhone: "9876543210",
    stateName: "Telangana",
    district: "District",
    address: "Business office",
    gstin: "36ABCDE1234F1Z5",
  });
  state = quarry(state, { type: "INITIALIZE_PRIMARY" });
  if (multi) {
    state = quarry(state, { type: "SET_MODE", enabled: true });
    state = quarry(state, { type: "ADD_SITE" });
  }
  for (const [index, site] of state.draft.sites.entries()) {
    state = quarry(state, {
      type: "EDIT_SITE",
      siteId: site.id,
      fields: {
        name: `Quarry ${index + 1}`,
        code: `Q0${index + 1}`,
        stateName: "Telangana",
        district: "District",
        address: `Site address ${index + 1}`,
      },
    });
    state = quarry(state, { type: "ADD_PIT", siteId: site.id });
    const pit = state.draft.sites.find((value) => value.id === site.id).pits[0];
    state = quarry(state, {
      type: "EDIT_PIT",
      siteId: site.id,
      pitId: pit.id,
      fields: { name: `Face ${index + 1}`, kind: index ? "BENCH" : "PIT" },
    });
    state = material(state, { type: "ADD_STOCKYARD", siteId: site.id });
    state = material(state, {
      type: "EDIT_STOCKYARD",
      id: state.draft.stockyards.at(-1).id,
      fields: { name: `Yard ${index + 1}`, pitId: index ? pit.id : null },
    });
  }
  state = material(state, { type: "TOGGLE_MATERIAL", name: "Black Granite" });
  state = material(state, { type: "TOGGLE_MATERIAL", name: "Tan Brown" });
  state = material(state, {
    type: "EDIT_GRADE",
    code: "A",
    description: "Premium",
  });
  if (team) {
    state = users(state, { type: "ADD_INVITATION" });
    const id = state.draft.invitations[0].id;
    state = users(state, {
      type: "EDIT_INVITATION",
      id,
      fields: {
        name: "Supervisor",
        recipient: "staff@example.invalid",
        remarks: "Day shift",
      },
    });
    if (multi)
      state = users(state, {
        type: "TOGGLE_SITE",
        id,
        siteId: state.draft.sites[1].id,
      });
  }
  return state;
}
function issuesFor(draft, step) {
  return validateOnboardingReadiness(draft).issues.filter(
    (issue) => issue.step === step,
  );
}

test("review summarizes actual business fields including optional legal name, GSTIN and address", () => {
  const { draft } = complete();
  const summary = onboardingReviewSummary(draft);
  assert.deepEqual(summary.business, draft.business);
  assert.notEqual(summary.business, draft.business);
  assert.equal(summary.business.businessName, "Demo Granites");
  assert.equal(summary.business.legalName, "Demo Legal");
  assert.equal(summary.business.gstin, "36ABCDE1234F1Z5");
});
test("business and quarry addresses remain independent before and after editing", () => {
  let state = complete();
  state = quarry(state, {
    type: "EDIT_SITE",
    siteId: state.draft.sites[0].id,
    fields: { address: "Edited quarry address" },
  });
  let summary = onboardingReviewSummary(state.draft);
  assert.equal(summary.business.address, "Business office");
  assert.equal(summary.quarries[0].address, "Edited quarry address");
  state = update(state, "business", {
    ...state.draft.business,
    address: "Edited office",
  });
  summary = onboardingReviewSummary(state.draft);
  assert.equal(summary.business.address, "Edited office");
  assert.equal(summary.quarries[0].address, "Edited quarry address");
});
test("single and multiple quarry summaries preserve primary, codes, pits and benches", () => {
  const single = onboardingReviewSummary(complete().draft);
  assert.equal(single.quarryMode, "Single Quarry");
  assert.equal(single.quarries.length, 1);
  assert.equal(single.quarries[0].isPrimary, true);
  assert.equal(single.quarries[0].code, "Q01");
  const multi = onboardingReviewSummary(complete(true).draft);
  assert.equal(multi.quarryMode, "Multiple Quarries");
  assert.equal(multi.quarries.length, 2);
  assert.equal(multi.quarries[1].isPrimary, false);
  assert.equal(multi.quarries[0].pits[0].kindLabel, "Pit");
  assert.equal(multi.quarries[1].pits[0].kindLabel, "Bench");
});
test("materials, fixed grades and every measurement preference summarize the shared draft", () => {
  let state = complete();
  state = material(state, {
    type: "SET_PREFERENCES",
    fields: { dimensionUnit: "M", volumeDisplay: "M3" },
  });
  const summary = onboardingReviewSummary(state.draft);
  assert.deepEqual(
    summary.materials.map((item) => item.name),
    ["Black Granite", "Tan Brown"],
  );
  assert.deepEqual(
    summary.grades.map((item) => item.code),
    ["A", "B", "C"],
  );
  assert.equal(summary.grades[0].description, "Premium");
  assert.equal(summary.grades[1].description, "");
  assert.equal(summary.preferences.dimensionLabel, "Metres (M)");
  assert.equal(summary.preferences.volumeLabel, "Cubic Metres (m³)");
  assert.equal(summary.preferences.currency, "INR");
  assert.equal(summary.preferences.timezone, "Asia/Kolkata");
});
test("stockyard associations resolve stable quarry/pit IDs and preserve whole-quarry yards", () => {
  const state = complete(true);
  const summary = onboardingReviewSummary(state.draft);
  assert.equal(summary.stockyards[0].pitLabel, "Entire quarry (shared)");
  assert.equal(summary.stockyards[1].quarryLabel, "Quarry 2 · Q02");
  assert.equal(summary.stockyards[1].pitLabel, "Face 2");
  assert.equal(summary.stockyards[1].pitId, state.draft.sites[1].pits[0].id);
});
test("missing quarry and cross-quarry pit references are visible rather than guessed", () => {
  const { draft } = complete(true);
  draft.stockyards[0].pitId = draft.sites[1].pits[0].id;
  draft.stockyards[1].siteId = "removed";
  const summary = onboardingReviewSummary(draft);
  assert.match(summary.stockyards[0].pitLabel, /Missing pit/);
  assert.equal(summary.stockyards[1].quarryLabel, "Missing quarry (removed)");
  assert.ok(
    issuesFor(draft, "materials").some(
      (issue) => issue.entityId === draft.stockyards[0].id,
    ),
  );
});
test("Owner and invitation summaries use friendly labels while retaining internal enums and IDs", () => {
  const { draft } = complete(true, true);
  const summary = onboardingReviewSummary(draft);
  assert.equal(summary.owner.role, "OWNER");
  assert.equal(summary.owner.accessScope, "ALL_SITES");
  assert.equal(summary.owner.roleLabel, "Business Owner");
  assert.equal(summary.owner.accessLabel, "All Quarry Sites");
  assert.equal(summary.invitations[0].roleLabel, "Production Supervisor");
  assert.equal(summary.invitations[0].accessLabel, "Quarry 2 · Q02");
  assert.equal(summary.invitations[0].remarks, "Day shift");
  assert.deepEqual(
    summary.invitations[0].siteIds,
    draft.invitations[0].siteIds,
  );
});
test("owner-only readiness succeeds without any additional invitations", () => {
  const { draft } = complete();
  const result = validateOnboardingReadiness(draft);
  assert.equal(result.ready, true);
  assert.deepEqual(result.issues, []);
  assert.equal(onboardingReviewSummary(draft).invitations.length, 0);
  assert.ok(result.steps.every((step) => step.valid));
});
test("readiness is the conjunction of existing Step 1–4 validation and never wizard position", () => {
  let state = createOnboardingState();
  state = onboardingReducer(state, { type: "NAVIGATE", step: "review" });
  assert.equal(validateOnboardingReadiness(state.draft).ready, false);
  for (const draft of [
    state.draft,
    complete().draft,
    complete(true, true).draft,
  ]) {
    assert.equal(
      validateOnboardingReadiness(draft).ready,
      validateBusinessRegistration(draft.business).valid &&
        validateQuarrySetup(draft).valid &&
        validateMaterialsSetup(draft).valid &&
        validateUsersSetup(draft).valid,
    );
  }
});
test("invalid business fields and optional GSTIN errors route to Business Registration", () => {
  const { draft } = complete();
  draft.business.businessName = " ";
  draft.business.contactPhone = "123";
  draft.business.gstin = "wrong";
  const fields = issuesFor(draft, "business").map((issue) => issue.field);
  assert.ok(fields.includes("businessName"));
  assert.ok(fields.includes("contactPhone"));
  assert.ok(fields.includes("gstin"));
  assert.equal(
    validateOnboardingReadiness(draft).steps[0].route,
    "/onboarding/business",
  );
});
test("missing primary quarry, pit and stockyard requirements identify affected steps/entities", () => {
  const { draft } = complete();
  draft.sites[0].isPrimary = false;
  draft.sites[0].pits = [];
  draft.stockyards = [];
  assert.ok(
    issuesFor(draft, "quarry").some((issue) => issue.field === "configuration"),
  );
  assert.ok(
    issuesFor(draft, "quarry").some(
      (issue) => issue.field === "pits" && issue.entityId === draft.sites[0].id,
    ),
  );
  assert.ok(
    issuesFor(draft, "materials").some(
      (issue) => issue.field === "stockyardCoverage",
    ),
  );
  draft.sites = [];
  assert.equal(validateOnboardingReadiness(draft).ready, false);
});
test("duplicate codes, pit names, invalid pit type and multi-quarry inconsistency reuse quarry rules", () => {
  const { draft } = complete(true);
  draft.multiSiteEnabled = false;
  draft.sites[1].code = draft.sites[0].code;
  draft.sites[0].pits.push({
    ...draft.sites[0].pits[0],
    id: "another-pit",
    kind: "OTHER",
  });
  const issues = issuesFor(draft, "quarry");
  for (const field of ["configuration", "code", "name", "kind"])
    assert.ok(issues.some((issue) => issue.field === field));
});
test("missing material, grade, duplicate yard and invalid preferences block preview", () => {
  const { draft } = complete();
  draft.materials = [];
  draft.grades = draft.grades.slice(0, 2);
  draft.stockyards.push({ ...draft.stockyards[0], id: "second-yard" });
  draft.preferences.dimensionUnit = "OTHER";
  const issues = issuesFor(draft, "materials");
  for (const field of ["materials", "grades", "name", "preferences"])
    assert.ok(issues.some((issue) => issue.field === field));
  assert.equal(buildActivationPreview(draft).allowed, false);
});
test("invalid invitation contact, role/scope and removed-site references route to Users & Roles", () => {
  const { draft } = complete(true, true);
  const item = draft.invitations[0];
  item.recipient = "not-email";
  item.role = "OWNER";
  item.siteIds = ["removed-site"];
  const issues = issuesFor(draft, "users");
  for (const field of ["recipient", "role", "sites"])
    assert.ok(
      issues.some(
        (issue) => issue.field === field && issue.entityId === item.id,
      ),
    );
  assert.match(
    onboardingReviewSummary(draft).invitations[0].accessLabel,
    /Missing quarry/,
  );
  assert.equal(
    onboardingReviewSummary(draft).invitations[0].roleLabel,
    "Invalid role",
  );
});
test("Edit navigation allows exactly the four known form destinations", () => {
  assert.deepEqual(reviewStepIds, ["business", "quarry", "materials", "users"]);
  for (const id of reviewStepIds)
    assert.equal(reviewEditStep(id).route, `/onboarding/${id}`);
  for (const invalid of [
    "review",
    "/sales",
    "../business",
    "business?next=/sales",
    "constructor",
    "__proto__",
    null,
    undefined,
    {},
    [],
  ])
    assert.equal(reviewEditStep(invalid), undefined);
});
test("returning after edits recomputes summary and preserves all stable entity IDs", () => {
  let state = complete(true, true);
  const ids = JSON.stringify([
    state.draft.sites.map((site) => [site.id, site.pits.map((pit) => pit.id)]),
    state.draft.stockyards.map((yard) => yard.id),
    state.draft.invitations.map((item) => item.id),
  ]);
  state = update(state, "business", {
    ...state.draft.business,
    businessName: "Updated Business",
    ownerDisplayName: "Updated Owner",
  });
  state = quarry(state, {
    type: "EDIT_SITE",
    siteId: state.draft.sites[1].id,
    fields: { name: "Renamed Quarry" },
  });
  state = material(state, {
    type: "EDIT_GRADE",
    code: "B",
    description: "Updated grade",
  });
  state = users(state, {
    type: "EDIT_INVITATION",
    id: state.draft.invitations[0].id,
    fields: { remarks: "Updated shift" },
  });
  const summary = onboardingReviewSummary(state.draft);
  assert.equal(summary.business.businessName, "Updated Business");
  assert.equal(summary.owner.displayName, "Updated Owner");
  assert.match(summary.stockyards[1].quarryLabel, /Renamed Quarry/);
  assert.match(summary.invitations[0].accessLabel, /Renamed Quarry/);
  assert.equal(summary.grades[1].description, "Updated grade");
  assert.equal(summary.invitations[0].remarks, "Updated shift");
  assert.equal(
    JSON.stringify([
      state.draft.sites.map((site) => [
        site.id,
        site.pits.map((pit) => pit.id),
      ]),
      state.draft.stockyards.map((yard) => yard.id),
      state.draft.invitations.map((item) => item.id),
    ]),
    ids,
  );
});
test("Save/Resume/Back preserve complete and incomplete review drafts; reset removes all entered content", () => {
  for (let state of [complete(true, true), createOnboardingState()]) {
    const draft = state.draft;
    state = onboardingReducer(state, { type: "SAVE_DRAFT" });
    for (const step of ["review", "users", "review", "business", "review"])
      state = onboardingReducer(state, { type: "NAVIGATE", step });
    assert.equal(state.draft, draft);
    assert.equal(state.savedForSession, true);
    const reset = onboardingReducer(state, { type: "RESET_DEMO" });
    assert.equal(reset.currentStep, "business");
    assert.equal(reset.draft.business.businessName, "");
    assert.deepEqual(reset.draft.invitations, []);
    assert.deepEqual(reset.draft.stockyards, []);
    assert.equal(validateOnboardingReadiness(reset.draft).ready, false);
  }
});
test("invalid preview returns structured errors and never a confirmation payload", () => {
  const result = buildActivationPreview(createOnboardingState().draft);
  assert.equal(result.allowed, false);
  assert.equal(result.summary, null);
  assert.ok(result.readiness.issues.length);
  assert.ok(
    result.readiness.issues.every(
      (issue) =>
        reviewStepIds.includes(issue.step) && issue.field && issue.message,
    ),
  );
});
test("valid demo preview derives counts/materials/Owner and leaves no activation receipt or lifecycle state", () => {
  const state = complete(true, true);
  const before = structuredClone(state);
  const result = buildActivationPreview(state.draft);
  assert.equal(result.allowed, true);
  assert.deepEqual(result.summary, {
    businessName: "Demo Granites",
    quarryCount: 2,
    pitBenchCount: 2,
    stockyardCount: 2,
    materials: ["Black Granite", "Tan Brown"],
    ownerName: "Demo Owner",
    ownerCount: 1,
    additionalTeamMemberCount: 1,
  });
  assert.equal(
    activationPreviewNotice,
    "This is a demonstration. No organization has been created or activated in Supabase.",
  );
  assert.deepEqual(state, before);
  assert.equal("status" in result, false);
  assert.equal("organizationId" in result, false);
  assert.equal("activatedAt" in result, false);
});
test("preview revalidates every invocation and rejects a draft changed after a valid preview", () => {
  const { draft } = complete();
  assert.equal(buildActivationPreview(draft).allowed, true);
  draft.stockyards = [];
  assert.equal(buildActivationPreview(draft).allowed, false);
  assert.equal(buildActivationPreview(draft).summary, null);
});
test("summary and readiness are pure, and returned summary records do not mutate source draft", () => {
  const { draft } = complete(true, true);
  const before = structuredClone(draft);
  const summary = onboardingReviewSummary(draft);
  summary.business.address = "Other";
  summary.quarries[0].pits[0].name = "Other";
  summary.invitations[0].siteIds.push("Other");
  summary.materials[0].name = "Other";
  summary.stockyards[0].name = "Other";
  summary.preferences.dimensionUnit = "M";
  validateOnboardingReadiness(draft);
  assert.deepEqual(draft, before);
});
test("summary and demo preview perform no network/Auth/org/membership writes and preserve block store", () => {
  const store = createMockOperationsStore();
  const blocks = store.getInventory();
  let changes = 0;
  store.subscribe(() => changes++);
  const originalFetch = global.fetch;
  global.fetch = () => {
    throw new Error("No network mutations allowed");
  };
  try {
    const state = complete(true, true);
    const before = structuredClone(state);
    for (let i = 0; i < 3; i++) {
      onboardingReviewSummary(state.draft);
      assert.equal(buildActivationPreview(state.draft).allowed, true);
    }
    assert.equal(
      buildActivationPreview(createOnboardingState().draft).allowed,
      false,
    );
    assert.deepEqual(state, before);
    assert.equal(store.getInventory(), blocks);
    assert.equal(changes, 0);
  } finally {
    global.fetch = originalFetch;
  }
});
