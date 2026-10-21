const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createOnboardingState,
  onboardingReducer,
} = require("../../src/features/onboarding/model.ts");
const {
  suggestQuarryCode,
} = require("../../src/features/onboarding/quarryCode.ts");
const {
  validateQuarrySetup,
} = require("../../src/features/onboarding/quarrySetup.ts");
const {
  createMockOperationsStore,
} = require("../../src/stores/mockOperationsStore.ts");
const run = (state, command) =>
  onboardingReducer(state, { type: "QUARRY_COMMAND", command });
const primary = (state) => state.draft.sites[0];
function businessState() {
  let state = createOnboardingState();
  return onboardingReducer(state, {
    type: "UPDATE_DRAFT",
    section: "business",
    value: {
      ...state.draft.business,
      businessName: " Sri Lakshmi Granites ",
      stateName: " Telangana ",
      district: " Karimnagar ",
      address: " Business Road ",
      ownerDisplayName: "Owner",
      contactPhone: "9876543210",
    },
  });
}
test("first primary initialization copies only business name/location and generates its code", () => {
  const before = businessState();
  const state = run(before, { type: "INITIALIZE_PRIMARY" });
  assert.deepEqual(primary(state), {
    ...primary(before),
    name: "Sri Lakshmi Granites",
    stateName: "Telangana",
    district: "Karimnagar",
    address: "Business Road",
    code: "SLG01",
  });
  assert.equal(state.quarryPrefillInitialized, true);
  assert.equal(state.draft.business, before.draft.business);
  assert.equal(Object.hasOwn(primary(state), "contactPhone"), false);
  assert.equal(Object.hasOwn(primary(state), "ownerDisplayName"), false);
});
test("all four copied quarry fields remain independently editable", () => {
  const initial = run(businessState(), { type: "INITIALIZE_PRIMARY" });
  const original = initial.draft.business;
  const state = run(initial, {
    type: "EDIT_SITE",
    siteId: primary(initial).id,
    fields: {
      name: "Custom Quarry",
      stateName: "Andhra Pradesh",
      district: "Chittoor",
      address: "Quarry Road",
    },
  });
  assert.equal(state.draft.business, original);
  assert.equal(state.draft.business.address, " Business Road ");
  assert.equal(primary(state).address, "Quarry Road");
  assert.equal(primary(state).code, "SLG01");
});
test("code generation matches all requested examples", () => {
  assert.equal(suggestQuarryCode("Sri Lakshmi Granites", []), "SLG01");
  assert.equal(suggestQuarryCode("Deccan Stone Quarry", []), "DSQ01");
  assert.equal(suggestQuarryCode("ABC Granites", []), "ABG01");
});
test("short, single word, punctuation, accents, digits and empty names are deterministic", () => {
  for (const [name, code] of [
    ["Granite", "GRA01"],
    ["A", "A01"],
    ["AB", "AB01"],
    ["A B", "AB01"],
    ["Sri-Lakshmi & Granites!", "SLG01"],
    ["Café", "CAF01"],
    ["123", "12301"],
    ["", "QRY01"],
    [" ! ", "QRY01"],
    ["తెలంగాణ", "QRY01"],
  ]) {
    assert.equal(suggestQuarryCode(name, []), code);
    assert.match(code, /^[A-Z0-9]+$/);
  }
});
test("suggestions find the first free suffix ignoring case and whitespace and expand after 99", () => {
  assert.equal(suggestQuarryCode("Sri Lakshmi Granites", [" slg01 "]), "SLG02");
  assert.equal(
    suggestQuarryCode("Sri Lakshmi Granites", ["SLG01", "SLG03"]),
    "SLG02",
  );
  assert.equal(
    suggestQuarryCode(
      "Sri Lakshmi Granites",
      Array.from(
        { length: 99 },
        (_, i) => `SLG${String(i + 1).padStart(2, "0")}`,
      ),
    ),
    "SLG100",
  );
});
test("manual codes and manual clearing are preserved through name edits and repeated initialization", () => {
  let state = run(businessState(), { type: "INITIALIZE_PRIMARY" });
  const siteId = primary(state).id;
  state = run(state, {
    type: "EDIT_SITE",
    siteId,
    fields: { code: " manual99 ", name: "Different Name" },
  });
  state = run(state, { type: "INITIALIZE_PRIMARY" });
  assert.equal(primary(state).code, "MANUAL99");
  state = run(state, { type: "EDIT_SITE", siteId, fields: { code: "" } });
  state = run(state, { type: "INITIALIZE_PRIMARY" });
  assert.equal(primary(state).code, "");
});
test("regeneration is explicit, uses the current name and excludes the site's own code", () => {
  let state = run(businessState(), { type: "INITIALIZE_PRIMARY" });
  const siteId = primary(state).id;
  state = run(state, {
    type: "EDIT_SITE",
    siteId,
    fields: { code: "MANUAL99", name: "Deccan Stone Quarry" },
  });
  state = run(state, { type: "REGENERATE_CODE", siteId });
  assert.equal(primary(state).code, "DSQ01");
  const savedCode = primary(state).code;
  state = run(state, { type: "REGENERATE_CODE", siteId });
  assert.equal(primary(state).code, savedCode);
});
test("Back/Continue, Save and Resume preserve initialized quarry values and saved state", () => {
  let state = run(businessState(), { type: "INITIALIZE_PRIMARY" });
  state = run(state, {
    type: "EDIT_SITE",
    siteId: primary(state).id,
    fields: { address: "Edited Road" },
  });
  state = onboardingReducer(state, { type: "SAVE_DRAFT" });
  const site = primary(state);
  state = onboardingReducer(state, { type: "NAVIGATE", step: "business" });
  state = onboardingReducer(state, { type: "NAVIGATE", step: "quarry" });
  state = run(state, { type: "INITIALIZE_PRIMARY" });
  assert.equal(primary(state), site);
  assert.equal(state.savedForSession, true);
});
test("later Step 1 changes never silently overwrite initialized Step 2 details", () => {
  let state = run(businessState(), { type: "INITIALIZE_PRIMARY" });
  const site = primary(state);
  state = onboardingReducer(state, {
    type: "UPDATE_DRAFT",
    section: "business",
    value: {
      ...state.draft.business,
      businessName: "Changed Business",
      address: "New Business Road",
    },
  });
  state = run(state, { type: "INITIALIZE_PRIMARY" });
  assert.equal(primary(state), site);
});
test("copy latest business requires confirmation and preserves code, IDs and pit data", () => {
  let state = run(businessState(), { type: "INITIALIZE_PRIMARY" });
  const siteId = primary(state).id;
  state = run(state, { type: "ADD_PIT", siteId });
  state = run(state, {
    type: "EDIT_SITE",
    siteId,
    fields: { name: "Edited", address: "Edited Road", code: "CUSTOM" },
  });
  const before = primary(state);
  assert.equal(
    run(state, { type: "COPY_BUSINESS", siteId, confirmed: false }).draft,
    state.draft,
  );
  state = run(state, { type: "COPY_BUSINESS", siteId, confirmed: true });
  assert.equal(primary(state).name, "Sri Lakshmi Granites");
  assert.equal(primary(state).address, "Business Road");
  assert.equal(primary(state).id, before.id);
  assert.equal(primary(state).pits, before.pits);
  assert.equal(primary(state).code, "CUSTOM");
});
test("reset clears the prefill marker and old values, enabling a fresh one-time initialization", () => {
  let state = run(businessState(), { type: "INITIALIZE_PRIMARY" });
  state = onboardingReducer(state, { type: "RESET_DEMO" });
  assert.equal(state.quarryPrefillInitialized, false);
  assert.equal(state.draft.multiSiteEnabled, false);
  assert.equal(primary(state).name, "");
  assert.equal(primary(state).code, "");
  state = run(state, { type: "INITIALIZE_PRIMARY" });
  assert.equal(primary(state).name, "");
  assert.equal(primary(state).code, "QRY01");
});
test("additional sites get unique fallbacks and regeneration resolves shared name prefixes", () => {
  let state = run(businessState(), { type: "INITIALIZE_PRIMARY" });
  state = run(state, { type: "SET_MODE", enabled: true });
  state = run(state, { type: "ADD_SITE" });
  state = run(state, { type: "ADD_SITE" });
  assert.deepEqual(
    state.draft.sites.map((site) => site.code),
    ["SLG01", "QRY01", "QRY02"],
  );
  const secondId = state.draft.sites[1].id;
  state = run(state, {
    type: "EDIT_SITE",
    siteId: secondId,
    fields: { name: "Sri Lakshmi Granites" },
  });
  assert.equal(state.draft.sites[1].code, "QRY01");
  state = run(state, { type: "REGENERATE_CODE", siteId: secondId });
  assert.equal(state.draft.sites[1].code, "SLG02");
  state = run(state, {
    type: "EDIT_SITE",
    siteId: secondId,
    fields: { code: "slg01" },
  });
  assert.ok(validateQuarrySetup(state.draft).errors[secondId].code);
});
test("first initialization preserves pre-existing quarry edits and empty first visits do not resync later", () => {
  let state = run(businessState(), {
    type: "EDIT_SITE",
    siteId: "draft-primary-site",
    fields: { name: "Existing", address: "Existing Road", code: "OLD01" },
  });
  state = run(state, { type: "INITIALIZE_PRIMARY" });
  assert.equal(primary(state).name, "Existing");
  assert.equal(primary(state).code, "OLD01");
  state = run(createOnboardingState(), { type: "INITIALIZE_PRIMARY" });
  state = onboardingReducer(state, {
    type: "UPDATE_DRAFT",
    section: "business",
    value: businessState().draft.business,
  });
  state = run(state, { type: "INITIALIZE_PRIMARY" });
  assert.equal(primary(state).name, "");
});
test("prefill and code commands do not mutate business, operational stock or network", () => {
  const store = createMockOperationsStore();
  const stock = store.getInventory();
  const initial = businessState();
  const business = initial.draft.business;
  const originalFetch = global.fetch;
  let requests = 0;
  global.fetch = () => {
    requests++;
    throw new Error("Network forbidden");
  };
  try {
    let state = run(initial, { type: "INITIALIZE_PRIMARY" });
    state = run(state, { type: "REGENERATE_CODE", siteId: primary(state).id });
    state = run(state, {
      type: "COPY_BUSINESS",
      siteId: primary(state).id,
      confirmed: true,
    });
    assert.equal(state.draft.business, business);
    assert.equal(store.getInventory(), stock);
    assert.equal(requests, 0);
  } finally {
    global.fetch = originalFetch;
  }
});
