const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createOnboardingState,
  onboardingReducer,
} = require("../../src/features/onboarding/model.ts");
const {
  supportedMaterials,
  validateMaterialsSetup,
  measurementExample,
} = require("../../src/features/onboarding/materialsSetup.ts");
const { calculateCubicMetres } = require("../../src/domain/blocks/volume.ts");
const {
  createMockOperationsStore,
} = require("../../src/stores/mockOperationsStore.ts");
const run = (state, command) =>
  onboardingReducer(state, { type: "MATERIALS_COMMAND", command });
const quarry = (state, command) =>
  onboardingReducer(state, { type: "QUARRY_COMMAND", command });
function configuredQuarries(multi = false) {
  let state = createOnboardingState();
  if (multi) {
    state = quarry(state, { type: "SET_MODE", enabled: true });
    state = quarry(state, { type: "ADD_SITE" });
  }
  for (const site of state.draft.sites) {
    state = quarry(state, {
      type: "EDIT_SITE",
      siteId: site.id,
      fields: {
        name: "Quarry",
        code: site.id,
        stateName: "Telangana",
        district: "District",
      },
    });
    state = quarry(state, { type: "ADD_PIT", siteId: site.id });
    const pit = state.draft.sites.find((item) => item.id === site.id).pits[0];
    state = quarry(state, {
      type: "EDIT_PIT",
      siteId: site.id,
      pitId: pit.id,
      fields: { name: "Pit A" },
    });
  }
  return state;
}
function complete(multi = false) {
  let state = run(configuredQuarries(multi), {
    type: "TOGGLE_MATERIAL",
    name: "Black Granite",
  });
  for (const site of state.draft.sites) {
    state = run(state, { type: "ADD_STOCKYARD", siteId: site.id });
    state = run(state, {
      type: "EDIT_STOCKYARD",
      id: state.draft.stockyards.at(-1).id,
      fields: { name: "Yard 1" },
    });
  }
  return state;
}
test("only the three supported materials can be selected, independently and without duplicates", () => {
  assert.deepEqual(
    supportedMaterials.map((item) => item.name),
    ["Black Granite", "Grey Granite", "Tan Brown"],
  );
  let state = configuredQuarries();
  assert.ok(validateMaterialsSetup(state.draft).errors.materials);
  for (const material of supportedMaterials)
    state = run(state, { type: "TOGGLE_MATERIAL", name: material.name });
  assert.equal(state.draft.materials.length, 3);
  const before = state.draft;
  assert.equal(
    run(state, { type: "TOGGLE_MATERIAL", name: "Custom Stone" }).draft,
    before,
  );
  state = run(state, { type: "TOGGLE_MATERIAL", name: "Grey Granite" });
  assert.deepEqual(
    state.draft.materials.map((item) => item.name),
    ["Black Granite", "Tan Brown"],
  );
});
test("default grades are fixed A/B/C with optional descriptions; custom/missing grades fail validation", () => {
  let state = complete();
  assert.deepEqual(
    state.draft.grades.map((grade) => grade.code),
    ["A", "B", "C"],
  );
  assert.equal(validateMaterialsSetup(state.draft).valid, true);
  state = run(state, {
    type: "EDIT_GRADE",
    code: "A",
    description: " Premium stone ",
  });
  state = run(state, { type: "NORMALIZE" });
  assert.equal(state.draft.grades[0].description, "Premium stone");
  assert.equal(
    run(state, { type: "EDIT_GRADE", code: "D", description: "Custom" }).draft,
    state.draft,
  );
  for (const grades of [
    [],
    [state.draft.grades[0]],
    [...state.draft.grades, state.draft.grades[0]],
  ])
    assert.ok(validateMaterialsSetup({ ...state.draft, grades }).errors.grades);
});
test("single-quarry stockyards automatically reference the primary with no dedicated pit", () => {
  let state = configuredQuarries();
  state = run(state, { type: "ADD_STOCKYARD" });
  assert.equal(state.draft.stockyards[0].siteId, state.draft.sites[0].id);
  assert.equal(state.draft.stockyards[0].pitId, null);
  assert.ok(
    validateMaterialsSetup(state.draft).errors.stockyards[
      state.draft.stockyards[0].id
    ].name,
  );
});
test("stockyard name edits retain stable identity and are trimmed on Save preparation", () => {
  let state = complete();
  const id = state.draft.stockyards[0].id;
  state = run(state, {
    type: "EDIT_STOCKYARD",
    id,
    fields: { name: "  Shared Yard  " },
  });
  state = run(state, { type: "NORMALIZE" });
  assert.equal(state.draft.stockyards[0].id, id);
  assert.equal(state.draft.stockyards[0].name, "Shared Yard");
  assert.equal(validateMaterialsSetup(state.draft).valid, true);
});
test("stockyard duplicates ignore case and all whitespace within a quarry", () => {
  let state = complete();
  state = run(state, { type: "ADD_STOCKYARD" });
  const id = state.draft.stockyards[1].id;
  state = run(state, {
    type: "EDIT_STOCKYARD",
    id,
    fields: { name: " yARD\t1 " },
  });
  assert.equal(validateMaterialsSetup(state.draft).valid, false);
  assert.ok(validateMaterialsSetup(state.draft).errors.stockyards[id].name);
  assert.ok(
    validateMaterialsSetup(state.draft).errors.stockyards[
      state.draft.stockyards[0].id
    ].name,
  );
});
test("each configured quarry requires a valid stockyard; names may repeat across quarries", () => {
  let state = complete(true);
  assert.equal(validateMaterialsSetup(state.draft).valid, true);
  const id = state.draft.stockyards[1].id;
  state = run(state, { type: "REMOVE_STOCKYARD", id, confirmed: true });
  assert.ok(
    validateMaterialsSetup(state.draft).errors.sites[state.draft.sites[1].id],
  );
  assert.equal(validateMaterialsSetup(state.draft).valid, false);
});
test("dedicated pits use stable IDs, must belong to the quarry, and entire-quarry yards use null", () => {
  let state = complete(true);
  const yard = state.draft.stockyards[0];
  const site = state.draft.sites[0];
  assert.equal(
    run(state, {
      type: "EDIT_STOCKYARD",
      id: yard.id,
      fields: { pitId: state.draft.sites[1].pits[0].id },
    }).draft,
    state.draft,
  );
  state = run(state, {
    type: "EDIT_STOCKYARD",
    id: yard.id,
    fields: { pitId: site.pits[0].id },
  });
  assert.equal(state.draft.stockyards[0].pitId, site.pits[0].id);
  assert.equal(validateMaterialsSetup(state.draft).valid, true);
  state = run(state, {
    type: "EDIT_STOCKYARD",
    id: yard.id,
    fields: { pitId: null },
  });
  assert.equal(state.draft.stockyards[0].pitId, null);
});
test("moving a yard to another quarry clears the former dedicated pit atomically", () => {
  let state = complete(true);
  const yard = state.draft.stockyards[0];
  state = run(state, {
    type: "EDIT_STOCKYARD",
    id: yard.id,
    fields: { pitId: state.draft.sites[0].pits[0].id },
  });
  state = run(state, {
    type: "EDIT_STOCKYARD",
    id: yard.id,
    fields: { siteId: state.draft.sites[1].id },
  });
  assert.equal(state.draft.stockyards[0].siteId, state.draft.sites[1].id);
  assert.equal(state.draft.stockyards[0].pitId, null);
  assert.equal(state.draft.stockyards[0].id, yard.id);
});
test("stale/missing site or pit references are retained and reported, never silently reassigned", () => {
  const state = complete();
  const yard = state.draft.stockyards[0];
  assert.equal(
    run(state, {
      type: "EDIT_STOCKYARD",
      id: yard.id,
      fields: { siteId: "missing" },
    }).draft,
    state.draft,
  );
  for (const stockyards of [
    [{ ...yard, siteId: "missing" }],
    [{ ...yard, pitId: "missing" }],
  ]) {
    const result = validateMaterialsSetup({ ...state.draft, stockyards });
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.stockyards[yard.id].siteId ||
        result.errors.stockyards[yard.id].pitId,
    );
  }
});
test("renaming quarry/pit display text does not change associations or identity", () => {
  let state = complete();
  const site = state.draft.sites[0];
  const pit = site.pits[0];
  const yard = state.draft.stockyards[0];
  state = run(state, {
    type: "EDIT_STOCKYARD",
    id: yard.id,
    fields: { pitId: pit.id },
  });
  state = quarry(state, {
    type: "EDIT_SITE",
    siteId: site.id,
    fields: { name: "Renamed Quarry" },
  });
  state = quarry(state, {
    type: "EDIT_PIT",
    siteId: site.id,
    pitId: pit.id,
    fields: { name: "Renamed Bench", kind: "BENCH" },
  });
  assert.equal(state.draft.stockyards[0].siteId, site.id);
  assert.equal(state.draft.stockyards[0].pitId, pit.id);
  assert.equal(validateMaterialsSetup(state.draft).valid, true);
});
test("stockyards preserve existing reference guards against removing their quarry or dedicated pit", () => {
  let state = complete(true);
  const site = state.draft.sites[1];
  const yard = state.draft.stockyards[1];
  state = run(state, {
    type: "EDIT_STOCKYARD",
    id: yard.id,
    fields: { pitId: site.pits[0].id },
  });
  assert.equal(
    quarry(state, { type: "REMOVE_SITE", siteId: site.id, confirmed: true })
      .draft,
    state.draft,
  );
  assert.equal(
    quarry(state, {
      type: "REMOVE_PIT",
      siteId: site.id,
      pitId: site.pits[0].id,
      confirmed: true,
    }).draft,
    state.draft,
  );
});
test("removal requires confirmation and never removes quarry/pit data", () => {
  const state = complete();
  const yard = state.draft.stockyards[0];
  assert.equal(
    run(state, { type: "REMOVE_STOCKYARD", id: yard.id, confirmed: false })
      .draft,
    state.draft,
  );
  const removed = run(state, {
    type: "REMOVE_STOCKYARD",
    id: yard.id,
    confirmed: true,
  });
  assert.equal(removed.draft.stockyards.length, 0);
  assert.equal(removed.draft.sites, state.draft.sites);
  assert.equal(validateMaterialsSetup(removed.draft).valid, false);
});
test("FT/M and CFT/m³ choices are independent and use canonical volume utilities unchanged", () => {
  const defaults = createOnboardingState().draft.preferences;
  assert.equal(defaults.dimensionUnit, "FT");
  assert.equal(defaults.volumeDisplay, "CFT");
  assert.equal(defaults.currency, "INR");
  assert.equal(defaults.timezone, "Asia/Kolkata");
  for (const dimensionUnit of ["FT", "M"])
    for (const volumeDisplay of ["CFT", "M3"]) {
      const state = run(complete(), {
        type: "SET_PREFERENCES",
        fields: { dimensionUnit, volumeDisplay },
      });
      assert.equal(validateMaterialsSetup(state.draft).valid, true);
    }
  assert.equal(measurementExample(), "10 × 5 × 4 FT = 200 CFT ≈ 5.66 m³");
  assert.ok(
    Math.abs(
      calculateCubicMetres({ length: 10, width: 5, height: 4, unit: "FT" }) -
        5.6633693184,
    ) < 1e-12,
  );
});
test("invalid preferences, unsupported selections and malformed identifiers block Step 4", () => {
  const state = complete();
  for (const fields of [
    { dimensionUnit: "TONS" },
    { volumeDisplay: "INVALID" },
  ])
    assert.equal(
      run(state, { type: "SET_PREFERENCES", fields }).draft,
      state.draft,
    );
  for (const fields of [
    { timezone: "Invalid/Zone" },
    { currency: "USD" },
    { cftDecimals: 7 },
    { cubicMetreDecimals: -1 },
  ])
    assert.ok(
      validateMaterialsSetup({
        ...state.draft,
        preferences: { ...state.draft.preferences, ...fields },
      }).errors.preferences,
    );
  assert.ok(
    validateMaterialsSetup({
      ...state.draft,
      materials: [{ id: "other", name: "Other Stone" }],
    }).errors.materials,
  );
  assert.ok(
    validateMaterialsSetup({
      ...state.draft,
      stockyards: [state.draft.stockyards[0], state.draft.stockyards[0]],
    }).errors.identity,
  );
});
test("Save/Resume and Back/Continue preserve partial state, grades and measurement choices", () => {
  let state = run(configuredQuarries(), {
    type: "TOGGLE_MATERIAL",
    name: "Tan Brown",
  });
  state = run(state, {
    type: "EDIT_GRADE",
    code: "B",
    description: " Draft description ",
  });
  state = run(state, {
    type: "SET_PREFERENCES",
    fields: { dimensionUnit: "M", volumeDisplay: "M3" },
  });
  state = run(state, { type: "NORMALIZE" });
  state = onboardingReducer(state, { type: "SAVE_DRAFT" });
  const draft = state.draft;
  for (const step of ["quarry", "materials"])
    state = onboardingReducer(state, { type: "NAVIGATE", step });
  assert.equal(state.draft, draft);
  assert.equal(state.savedForSession, true);
  assert.equal(state.draft.grades[1].description, "Draft description");
  assert.equal(validateMaterialsSetup(state.draft).valid, false);
});
test("reset restores selection/grade/preference defaults without recycling stockyard IDs", () => {
  let state = complete();
  const old = state.draft.stockyards[0].id;
  state = onboardingReducer(state, { type: "RESET_DEMO" });
  assert.deepEqual(state.draft.materials, []);
  assert.deepEqual(state.draft.stockyards, []);
  assert.ok(state.draft.grades.every((grade) => grade.description === ""));
  assert.equal(state.draft.preferences.dimensionUnit, "FT");
  assert.equal(state.draft.preferences.volumeDisplay, "CFT");
  state = run(state, { type: "ADD_STOCKYARD" });
  assert.notEqual(state.draft.stockyards[0].id, old);
});
test("rapid additions/removals preserve unique stable stockyard IDs and accept Unicode names", () => {
  let state = complete();
  const first = state.draft.stockyards[0].id;
  state = run(state, { type: "ADD_STOCKYARD" });
  const second = state.draft.stockyards[1].id;
  state = run(state, {
    type: "EDIT_STOCKYARD",
    id: second,
    fields: { name: "  నిల్వ యార్డ్  " },
  });
  state = run(state, { type: "NORMALIZE" });
  assert.equal(state.draft.stockyards[1].name, "నిల్వ యార్డ్");
  state = run(state, { type: "REMOVE_STOCKYARD", id: first, confirmed: true });
  state = run(state, { type: "ADD_STOCKYARD" });
  assert.notEqual(state.draft.stockyards.at(-1).id, first);
  assert.notEqual(state.draft.stockyards.at(-1).id, second);
});
test("material/yard commands never mutate Business Registration, quarry data, operational inventory or network", () => {
  const store = createMockOperationsStore();
  const stock = store.getInventory();
  const initial = configuredQuarries();
  const business = initial.draft.business;
  const sites = initial.draft.sites;
  const originalFetch = global.fetch;
  let requests = 0;
  global.fetch = () => {
    requests++;
    throw new Error("No backend");
  };
  try {
    let state = run(initial, { type: "TOGGLE_MATERIAL", name: "Grey Granite" });
    state = run(state, { type: "ADD_STOCKYARD" });
    state = run(state, {
      type: "EDIT_STOCKYARD",
      id: state.draft.stockyards[0].id,
      fields: { name: "Yard" },
    });
    state = run(state, {
      type: "SET_PREFERENCES",
      fields: { dimensionUnit: "M", volumeDisplay: "M3" },
    });
    assert.equal(state.draft.business, business);
    assert.equal(state.draft.sites, sites);
    assert.equal(store.getInventory(), stock);
    assert.equal(requests, 0);
  } finally {
    global.fetch = originalFetch;
  }
});
