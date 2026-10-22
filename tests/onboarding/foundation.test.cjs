const { test } = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { renderToString } = require("react-dom/server");
const {
  onboardingSteps,
  getOnboardingStep,
  adjacentOnboardingStep,
  createOnboardingState,
  onboardingReducer,
  demoDraftSavedMessage,
} = require("../../src/features/onboarding/model.ts");
const {
  OnboardingProvider,
  useOnboardingDraft,
} = require("../../src/features/onboarding/OnboardingProvider.ts");
const {
  createMockOperationsStore,
} = require("../../src/stores/mockOperationsStore.ts");

test("five stages have explicit unique routes in the approved order", () => {
  assert.deepEqual(
    onboardingSteps.map((s) => s.title),
    [
      "Business Registration",
      "Quarry Configuration",
      "Materials & Measurements",
      "Users & Roles",
      "Review & Activate",
    ],
  );
  assert.deepEqual(
    onboardingSteps.map((s) => s.route),
    [
      "/onboarding/business",
      "/onboarding/quarry",
      "/onboarding/materials",
      "/onboarding/users",
      "/onboarding/review",
    ],
  );
});
test("forward and back follow the allowlist with bounded endpoints", () => {
  onboardingSteps.forEach((step, i) => {
    assert.equal(
      adjacentOnboardingStep(step.id, "back"),
      onboardingSteps[i - 1],
    );
    assert.equal(
      adjacentOnboardingStep(step.id, "forward"),
      onboardingSteps[i + 1],
    );
  });
});
test("arbitrary routes and malformed step identifiers cannot resolve destinations", () => {
  for (const value of [
    "/sales",
    "../../login",
    "__proto__",
    "constructor",
    null,
    [],
    { id: "business" },
    1,
  ]) {
    assert.equal(getOnboardingStep(value), undefined);
    assert.equal(adjacentOnboardingStep(value, "forward"), undefined);
    const state = createOnboardingState();
    assert.equal(
      onboardingReducer(state, { type: "NAVIGATE", step: value }),
      state,
    );
  }
});
test("defaults are one incomplete primary quarry, FT/CFT, INR and Asia/Kolkata", () => {
  const { draft, currentStep, savedForSession } = createOnboardingState();
  assert.equal(currentStep, "business");
  assert.equal(savedForSession, false);
  assert.equal(draft.multiSiteEnabled, false);
  assert.equal(draft.sites.length, 1);
  assert.equal(draft.sites[0].isPrimary, true);
  assert.deepEqual(draft.sites[0].pits, []);
  assert.deepEqual(draft.preferences, {
    dimensionUnit: "FT",
    volumeDisplay: "CFT",
    cftDecimals: 2,
    cubicMetreDecimals: 3,
    currency: "INR",
    timezone: "Asia/Kolkata",
  });
  assert.deepEqual(
    draft.grades.map((g) => g.code),
    ["A", "B", "C"],
  );
  assert.deepEqual(draft.invitations, []);
});
test("every typed draft section is retained across all forward/back transitions", () => {
  let state = createOnboardingState();
  const sections = {
    business: { ...state.draft.business, businessName: "Synthetic Quarry" },
    multiSiteEnabled: true,
    sites: [
      {
        ...state.draft.sites[0],
        name: "Primary",
        pits: [{ id: "pit", name: "Pit A", kind: "PIT" }],
      },
    ],
    materials: [{ id: "black", name: "Black Granite" }],
    grades: [{ code: "A", description: "Grade A" }],
    stockyards: [
      { id: "yard", siteId: "draft-primary-site", pitId: null, name: "Yard 1" },
    ],
    preferences: {
      ...state.draft.preferences,
      dimensionUnit: "M",
      volumeDisplay: "M3",
    },
    invitations: [
      {
        id: "invite",
        recipient: "test@example.invalid",
        channel: "EMAIL",
        role: "PRODUCTION_SUPERVISOR",
        accessScope: "ASSIGNED_SITES",
        siteIds: ["draft-primary-site"],
      },
    ],
  };
  for (const [section, value] of Object.entries(sections))
    state = onboardingReducer(state, { type: "UPDATE_DRAFT", section, value });
  for (const step of [...onboardingSteps, ...onboardingSteps.toReversed()]) {
    state = onboardingReducer(state, { type: "NAVIGATE", step: step.id });
    assert.deepEqual(state.draft, {
      ...sections,
      primaryOwner: {
        id: "draft-primary-owner",
        role: "OWNER",
        accessScope: "ALL_SITES",
        displayName: sections.business.ownerDisplayName,
        contactPhone: sections.business.contactPhone,
      },
    });
  }
});
test("Save Draft keeps entered values and reports only current-session retention", () => {
  let state = createOnboardingState();
  state = onboardingReducer(state, {
    type: "UPDATE_DRAFT",
    section: "business",
    value: { ...state.draft.business, businessName: "Demo" },
  });
  const draft = state.draft;
  state = onboardingReducer(state, { type: "SAVE_DRAFT" });
  assert.equal(state.draft, draft);
  assert.equal(state.savedForSession, true);
  assert.equal(demoDraftSavedMessage, "Demo draft saved for this session.");
  state = onboardingReducer(state, { type: "NAVIGATE", step: "quarry" });
  assert.equal(state.savedForSession, true);
  state = onboardingReducer(state, {
    type: "UPDATE_DRAFT",
    section: "multiSiteEnabled",
    value: true,
  });
  assert.equal(state.savedForSession, false);
});
test("reset restores all defaults, clears save acknowledgement and resumes stage one", () => {
  let state = createOnboardingState();
  state = onboardingReducer(state, {
    type: "UPDATE_DRAFT",
    section: "multiSiteEnabled",
    value: true,
  });
  state = onboardingReducer(state, { type: "NAVIGATE", step: "review" });
  state = onboardingReducer(state, { type: "SAVE_DRAFT" });
  assert.deepEqual(
    onboardingReducer(state, { type: "RESET_DEMO" }),
    createOnboardingState(),
  );
});
test("fresh draft instances have independent nested arrays and objects", () => {
  const a = createOnboardingState();
  const b = createOnboardingState();
  a.draft.sites[0].pits.push({ id: "pit", name: "Example", kind: "PIT" });
  a.draft.preferences.dimensionUnit = "M";
  assert.equal(b.draft.sites[0].pits.length, 0);
  assert.equal(b.draft.preferences.dimensionUnit, "FT");
});
test("onboarding updates, saves and resets never alter or notify block inventory", () => {
  const store = createMockOperationsStore();
  const inventory = store.getInventory();
  let notifications = 0;
  const unsubscribe = store.subscribe(() => notifications++);
  let state = onboardingReducer(createOnboardingState(), {
    type: "UPDATE_DRAFT",
    section: "multiSiteEnabled",
    value: true,
  });
  state = onboardingReducer(state, { type: "SAVE_DRAFT" });
  onboardingReducer(state, { type: "RESET_DEMO" });
  assert.equal(store.getInventory(), inventory);
  assert.equal(notifications, 0);
  store.resetDemoData();
  assert.equal(state.draft.multiSiteEnabled, true);
  unsubscribe();
});
test("provider exposes the reducer draft without network, authentication or database mutations", () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = () => {
    calls++;
    throw new Error("Network mutation forbidden");
  };
  try {
    function Consumer() {
      const { state } = useOnboardingDraft();
      const saved = onboardingReducer(state, { type: "SAVE_DRAFT" });
      return React.createElement(
        "span",
        null,
        saved.draft.preferences.timezone,
      );
    }
    assert.match(
      renderToString(
        React.createElement(
          OnboardingProvider,
          null,
          React.createElement(Consumer),
        ),
      ),
      /Asia\/Kolkata/,
    );
    assert.equal(calls, 0);
  } finally {
    global.fetch = originalFetch;
  }
});
