const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createOnboardingState,
  onboardingReducer,
} = require("../../src/features/onboarding/model.ts");
const {
  validateQuarrySetup,
} = require("../../src/features/onboarding/quarrySetup.ts");
const {
  createMockOperationsStore,
} = require("../../src/stores/mockOperationsStore.ts");
const run = (state, command) =>
  onboardingReducer(state, { type: "QUARRY_COMMAND", command });
function completeSite(state, siteId = state.draft.sites[0].id, code = "DSQ01") {
  state = run(state, {
    type: "EDIT_SITE",
    siteId,
    fields: {
      name: " Demo Quarry ",
      code,
      stateName: " Telangana ",
      district: " Karimnagar ",
      address: " Yard ",
    },
  });
  state = run(state, { type: "ADD_PIT", siteId });
  const pitId = state.draft.sites.find((s) => s.id === siteId).pits.at(-1).id;
  return run(state, {
    type: "EDIT_PIT",
    siteId,
    pitId,
    fields: { name: " Pit A " },
  });
}
test("quarry defaults have one blank primary site and single-quarry mode", () => {
  const state = createOnboardingState();
  assert.equal(state.draft.multiSiteEnabled, false);
  assert.equal(state.draft.sites.length, 1);
  assert.equal(state.draft.sites[0].isPrimary, true);
  assert.equal(state.draft.sites[0].name, "");
  assert.equal(state.draft.sites[0].code, "");
});
test("primary quarry and every required field/pit are validated", () => {
  let state = createOnboardingState();
  const error = validateQuarrySetup(state.draft).errors[
    state.draft.sites[0].id
  ];
  for (const key of ["name", "code", "stateName", "district", "pits"])
    assert.ok(error[key]);
  state = completeSite(state);
  assert.equal(validateQuarrySetup(state.draft).valid, true);
  for (const key of ["name", "code", "stateName", "district"]) {
    const changed = run(state, {
      type: "EDIT_SITE",
      siteId: state.draft.sites[0].id,
      fields: { [key]: "  " },
    });
    assert.ok(
      validateQuarrySetup(changed.draft).errors[state.draft.sites[0].id][key],
    );
  }
});
test("quarry codes are uppercase/trimmed and duplicate codes reject continuation", () => {
  let state = completeSite(createOnboardingState(), undefined, " dsq01 ");
  assert.equal(state.draft.sites[0].code, "DSQ01");
  state = run(state, { type: "SET_MODE", enabled: true });
  state = run(state, { type: "ADD_SITE" });
  state = completeSite(state, state.draft.sites[1].id, " dSq01 ");
  const result = validateQuarrySetup(state.draft);
  assert.equal(result.valid, false);
  assert.ok(result.errors[state.draft.sites[0].id].code);
  assert.ok(result.errors[state.draft.sites[1].id].code);
});
test("pits and benches can be added/edited with stable identities", () => {
  let state = completeSite(createOnboardingState());
  const siteId = state.draft.sites[0].id;
  state = run(state, { type: "ADD_PIT", siteId });
  const id = state.draft.sites[0].pits[1].id;
  state = run(state, {
    type: "EDIT_PIT",
    siteId,
    pitId: id,
    fields: { name: " Bench 1 ", kind: "BENCH" },
  });
  state = run(state, { type: "NORMALIZE" });
  assert.deepEqual(state.draft.sites[0].pits[1], {
    id,
    name: "Bench 1",
    kind: "BENCH",
  });
  assert.equal(validateQuarrySetup(state.draft).valid, true);
});
test("pit names ignore whitespace/case within a quarry but may repeat across sites", () => {
  let state = completeSite(createOnboardingState());
  const siteId = state.draft.sites[0].id;
  state = run(state, { type: "ADD_PIT", siteId });
  state = run(state, {
    type: "EDIT_PIT",
    siteId,
    pitId: state.draft.sites[0].pits[1].id,
    fields: { name: " pIT a  " },
  });
  assert.equal(validateQuarrySetup(state.draft).valid, false);
  state = run(state, {
    type: "REMOVE_PIT",
    siteId,
    pitId: state.draft.sites[0].pits[1].id,
    confirmed: true,
  });
  state = run(state, { type: "SET_MODE", enabled: true });
  state = run(state, { type: "ADD_SITE" });
  state = completeSite(state, state.draft.sites[1].id, "Q2");
  assert.equal(validateQuarrySetup(state.draft).valid, true);
});
test("pit removal requires confirmation; primary site removal is always blocked", () => {
  const state = completeSite(createOnboardingState());
  const siteId = state.draft.sites[0].id;
  const pitId = state.draft.sites[0].pits[0].id;
  assert.equal(
    run(state, { type: "REMOVE_PIT", siteId, pitId, confirmed: false }).draft,
    state.draft,
  );
  assert.equal(
    run(state, { type: "REMOVE_SITE", siteId, confirmed: true }).draft,
    state.draft,
  );
  const removed = run(state, {
    type: "REMOVE_PIT",
    siteId,
    pitId,
    confirmed: true,
  });
  assert.equal(removed.draft.sites[0].pits.length, 0);
  assert.equal(validateQuarrySetup(removed.draft).valid, false);
});
test("multi-quarry must be enabled before adding sites; new site is not primary", () => {
  const single = createOnboardingState();
  assert.equal(run(single, { type: "ADD_SITE" }).draft, single.draft);
  let state = run(single, { type: "SET_MODE", enabled: true });
  state = run(state, { type: "ADD_SITE" });
  assert.equal(state.draft.sites.length, 2);
  assert.equal(state.draft.sites[0].isPrimary, true);
  assert.equal(state.draft.sites[1].isPrimary, false);
  assert.notEqual(state.draft.sites[0].id, state.draft.sites[1].id);
});
test("disabling multi-quarry with extras is atomic and preserves all entered values", () => {
  let state = completeSite(createOnboardingState());
  state = run(state, { type: "SET_MODE", enabled: true });
  state = run(state, { type: "ADD_SITE" });
  state = completeSite(state, state.draft.sites[1].id, "Q2");
  const blocked = run(state, { type: "SET_MODE", enabled: false });
  assert.equal(blocked.draft, state.draft);
  assert.ok(blocked.quarryIssue);
  assert.equal(blocked.draft.multiSiteEnabled, true);
  assert.equal(
    run(state, {
      type: "REMOVE_SITE",
      siteId: state.draft.sites[1].id,
      confirmed: false,
    }).draft,
    state.draft,
  );
  state = run(state, {
    type: "REMOVE_SITE",
    siteId: state.draft.sites[1].id,
    confirmed: true,
  });
  state = run(state, { type: "SET_MODE", enabled: false });
  assert.equal(state.draft.multiSiteEnabled, false);
  assert.equal(state.draft.sites[0].name, " Demo Quarry ");
});
test("every configured quarry needs a valid pit or bench and all site fields", () => {
  let state = completeSite(createOnboardingState());
  state = run(state, { type: "SET_MODE", enabled: true });
  state = run(state, { type: "ADD_SITE" });
  assert.equal(validateQuarrySetup(state.draft).valid, false);
  const siteId = state.draft.sites[1].id;
  state = run(state, {
    type: "EDIT_SITE",
    siteId,
    fields: {
      name: "Second",
      code: "Q2",
      stateName: "State",
      district: "District",
    },
  });
  assert.ok(validateQuarrySetup(state.draft).errors[siteId].pits);
  state = run(state, { type: "ADD_PIT", siteId });
  const pitId = state.draft.sites[1].pits[0].id;
  assert.ok(
    validateQuarrySetup(state.draft).errors[siteId].pitErrors[pitId].name,
  );
  state = run(state, {
    type: "EDIT_PIT",
    siteId,
    pitId,
    fields: { name: "Bench", kind: "BENCH" },
  });
  assert.equal(validateQuarrySetup(state.draft).valid, true);
});
test("dependent stockyards prevent pit removal; stockyards/invitations prevent site removal", () => {
  let state = completeSite(createOnboardingState());
  state = run(state, { type: "SET_MODE", enabled: true });
  state = run(state, { type: "ADD_SITE" });
  state = completeSite(state, state.draft.sites[1].id, "Q2");
  const siteId = state.draft.sites[1].id;
  const pitId = state.draft.sites[1].pits[0].id;
  state = onboardingReducer(state, {
    type: "UPDATE_DRAFT",
    section: "stockyards",
    value: [{ id: "yard", siteId, pitId, name: "Yard" }],
  });
  assert.equal(
    run(state, { type: "REMOVE_PIT", siteId, pitId, confirmed: true }).draft,
    state.draft,
  );
  assert.equal(
    run(state, { type: "REMOVE_SITE", siteId, confirmed: true }).draft,
    state.draft,
  );
  state = onboardingReducer(state, {
    type: "UPDATE_DRAFT",
    section: "stockyards",
    value: [],
  });
  state = onboardingReducer(state, {
    type: "UPDATE_DRAFT",
    section: "invitations",
    value: [
      {
        id: "invite",
        recipient: "test@example.invalid",
        role: "PRODUCTION_SUPERVISOR",
        channel: "EMAIL",
        accessScope: "ASSIGNED_SITES",
        siteIds: [siteId],
      },
    ],
  });
  assert.equal(
    run(state, { type: "REMOVE_SITE", siteId, confirmed: true }).draft,
    state.draft,
  );
});
test("Save and navigation retain incomplete drafts without claiming readiness", () => {
  let state = run(createOnboardingState(), {
    type: "EDIT_SITE",
    siteId: "draft-primary-site",
    fields: { name: " Partial " },
  });
  state = run(state, { type: "NORMALIZE" });
  state = onboardingReducer(state, { type: "SAVE_DRAFT" });
  state = onboardingReducer(state, { type: "NAVIGATE", step: "business" });
  state = onboardingReducer(state, { type: "NAVIGATE", step: "quarry" });
  assert.equal(state.draft.sites[0].name, "Partial");
  assert.equal(state.savedForSession, true);
  assert.equal(validateQuarrySetup(state.draft).valid, false);
});
test("normalization preserves IDs, trims values and a valid draft can proceed to Step 3", () => {
  let state = completeSite(createOnboardingState());
  const before = state.draft.sites[0];
  state = run(state, { type: "NORMALIZE" });
  assert.equal(state.draft.sites[0].id, before.id);
  assert.equal(state.draft.sites[0].pits[0].id, before.pits[0].id);
  assert.equal(state.draft.sites[0].name, "Demo Quarry");
  assert.equal(state.draft.sites[0].address, "Yard");
  assert.equal(validateQuarrySetup(state.draft).valid, true);
  state = onboardingReducer(state, { type: "NAVIGATE", step: "materials" });
  assert.equal(state.currentStep, "materials");
});
test("reset clears quarry content/mode but does not reuse issued additional IDs", () => {
  let state = completeSite(createOnboardingState());
  const oldPitId = state.draft.sites[0].pits[0].id;
  state = onboardingReducer(state, { type: "RESET_DEMO" });
  assert.equal(state.draft.multiSiteEnabled, false);
  assert.equal(state.draft.sites.length, 1);
  assert.equal(state.draft.sites[0].name, "");
  assert.deepEqual(state.draft.sites[0].pits, []);
  state = run(state, { type: "ADD_PIT", siteId: state.draft.sites[0].id });
  assert.notEqual(state.draft.sites[0].pits[0].id, oldPitId);
});
test("queued commands get unique IDs and removed IDs are never recycled", () => {
  let state = createOnboardingState();
  const siteId = state.draft.sites[0].id;
  state = run(state, { type: "ADD_PIT", siteId });
  state = run(state, { type: "ADD_PIT", siteId });
  const old = state.draft.sites[0].pits.map((pit) => pit.id);
  assert.notEqual(old[0], old[1]);
  state = run(state, {
    type: "REMOVE_PIT",
    siteId,
    pitId: old[0],
    confirmed: true,
  });
  state = run(state, { type: "ADD_PIT", siteId });
  assert.ok(!old.includes(state.draft.sites[0].pits.at(-1).id));
});
test("validation rejects missing/duplicate primary, unresolved single mode and malformed identities", () => {
  const state = completeSite(createOnboardingState());
  const site = state.draft.sites[0];
  for (const sites of [
    [],
    [{ ...site, isPrimary: false }],
    [site, { ...site, id: "second" }],
    [{ ...site, pits: [{ ...site.pits[0], id: site.id }] }],
  ]) {
    assert.equal(validateQuarrySetup({ ...state.draft, sites }).valid, false);
  }
  const duplicate = {
    ...site,
    id: "second",
    isPrimary: false,
    code: "Q2",
    pits: [{ ...site.pits[0], id: "other-pit" }],
  };
  assert.equal(
    validateQuarrySetup({ ...state.draft, sites: [site, duplicate] }).valid,
    false,
  );
});
test("quarry commands preserve Business Registration and operational inventory with no network", () => {
  const store = createMockOperationsStore();
  const inventory = store.getInventory();
  let notifications = 0;
  const stop = store.subscribe(() => notifications++);
  const original = global.fetch;
  let requests = 0;
  global.fetch = () => {
    requests++;
    throw new Error("Network forbidden");
  };
  try {
    const initial = createOnboardingState();
    const business = initial.draft.business;
    let state = completeSite(initial);
    state = run(state, { type: "SET_MODE", enabled: true });
    state = run(state, { type: "ADD_SITE" });
    state = onboardingReducer(state, { type: "SAVE_DRAFT" });
    assert.equal(state.draft.business, business);
    assert.equal(store.getInventory(), inventory);
    assert.equal(notifications, 0);
    assert.equal(requests, 0);
  } finally {
    global.fetch = original;
    stop();
  }
});
