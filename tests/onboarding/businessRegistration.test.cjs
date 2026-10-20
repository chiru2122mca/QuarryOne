const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  validateBusinessRegistration,
  normalizeBusinessDraft,
} = require("../../src/features/onboarding/businessRegistration.ts");
const {
  createOnboardingState,
  onboardingReducer,
} = require("../../src/features/onboarding/model.ts");
const {
  createMockOperationsStore,
} = require("../../src/stores/mockOperationsStore.ts");
const valid = () => ({
  ...createOnboardingState().draft.business,
  businessName: "Demo Quarry",
  contactPhone: "9876543210",
  stateName: "Telangana",
  ownerDisplayName: "Demo Owner",
});

test("business requires business name, phone, state and owner only", () => {
  const empty = validateBusinessRegistration(
    createOnboardingState().draft.business,
  );
  assert.equal(empty.valid, false);
  assert.deepEqual(Object.keys(empty.errors).sort(), [
    "businessName",
    "contactPhone",
    "ownerDisplayName",
    "stateName",
  ]);
  assert.equal(validateBusinessRegistration(valid()).valid, true);
  for (const field of Object.keys(empty.errors)) {
    const result = validateBusinessRegistration({
      ...valid(),
      [field]: " \t\n ",
    });
    assert.equal(result.valid, false);
    assert.deepEqual(Object.keys(result.errors), [field]);
  }
});
test("supported phone formats accept Indian mobile numbers with optional +91 and separators", () => {
  for (const phone of [
    "9876543210",
    "8765432109",
    "7654321098",
    "6543210987",
    "+919876543210",
    " +91 98765-43210 ",
    "98765 43210",
  ]) {
    assert.equal(
      validateBusinessRegistration({ ...valid(), contactPhone: phone }).valid,
      true,
      phone,
    );
  }
  assert.equal(
    normalizeBusinessDraft({ ...valid(), contactPhone: " +91 98765-43210 " })
      .contactPhone,
    "+919876543210",
  );
});
test("unsupported lengths, prefixes, landlines, letters and punctuation are rejected", () => {
  for (const phone of [
    "1234567890",
    "5876543210",
    "987654321",
    "98765432100",
    "919876543210",
    "09876543210",
    "+449876543210",
    "++919876543210",
    "98765abc10",
    "(98765)43210",
    "04012345678",
    "9876543210.0",
  ]) {
    const result = validateBusinessRegistration({
      ...valid(),
      contactPhone: phone,
    });
    assert.equal(result.valid, false, phone);
    assert.ok(result.errors.contactPhone);
  }
});
test("GSTIN is optional, normalized uppercase and checked for standard structure only", () => {
  for (const gstin of [
    "",
    "  ",
    "36ABCDE1234F1Z5",
    " 36abcde1234f1z5 ",
    "29ABCDE1234FAZ5",
  ]) {
    assert.equal(
      validateBusinessRegistration({ ...valid(), gstin }).valid,
      true,
      gstin,
    );
  }
  assert.equal(
    validateBusinessRegistration({ ...valid(), gstin: " 36abcde1234f1z5 " })
      .value.gstin,
    "36ABCDE1234F1Z5",
  );
});
test("invalid supplied GSTIN cannot continue or report a successful save", () => {
  for (const gstin of [
    "123",
    "00ABCDE1234F1Z5",
    "36ABCD11234F1Z5",
    "36ABCDE1234F0Z5",
    "36ABCDE1234F1X5",
    "36ABCDE1234F1Z55",
    "36ABCDE 234F1Z5",
  ]) {
    const result = validateBusinessRegistration({ ...valid(), gstin });
    assert.equal(result.valid, false, gstin);
    assert.ok(result.errors.gstin);
  }
});
test("trims every field, preserves internal whitespace/newlines and permits Telugu text", () => {
  const draft = {
    businessName: "  దక్కన్ స్టోన్  క్వారీ  ",
    legalName: " Legal Name ",
    contactPhone: " 98765 43210 ",
    stateName: " తెలంగాణ ",
    district: " కరీంనగర్ ",
    address: " Yard 1\n Road 2 ",
    gstin: " 36abcde1234f1z5 ",
    ownerDisplayName: " రమేష్ కుమార్ ",
  };
  const original = structuredClone(draft);
  const { value, valid: passed } = validateBusinessRegistration(draft);
  assert.equal(passed, true);
  assert.equal(value.businessName, "దక్కన్ స్టోన్  క్వారీ");
  assert.equal(value.district, "కరీంనగర్");
  assert.equal(value.address, "Yard 1\n Road 2");
  assert.equal(value.ownerDisplayName, "రమేష్ కుమార్");
  assert.equal(value.legalName, "Legal Name");
  assert.deepEqual(draft, original);
});
test("valid result can save normalized values and preserves them through navigation", () => {
  const result = validateBusinessRegistration({
    ...valid(),
    businessName: " Demo Quarry ",
    district: " District ",
    address: " Yard ",
  });
  assert.equal(result.valid, true);
  let state = onboardingReducer(createOnboardingState(), {
    type: "UPDATE_DRAFT",
    section: "business",
    value: result.value,
  });
  state = onboardingReducer(state, { type: "SAVE_DRAFT" });
  state = onboardingReducer(state, { type: "NAVIGATE", step: "quarry" });
  state = onboardingReducer(state, { type: "NAVIGATE", step: "business" });
  assert.equal(state.savedForSession, true);
  assert.equal(state.draft.business.businessName, "Demo Quarry");
  assert.equal(state.draft.business.district, "District");
  assert.equal(state.draft.business.address, "Yard");
});
test("partial draft is retained on Back and reset clears every business field", () => {
  let state = createOnboardingState();
  const value = {
    ...state.draft.business,
    businessName: "Incomplete",
    district: "District",
    address: "Address",
  };
  state = onboardingReducer(state, {
    type: "UPDATE_DRAFT",
    section: "business",
    value,
  });
  state = onboardingReducer(state, { type: "NAVIGATE", step: "business" });
  assert.deepEqual(state.draft.business, value);
  assert.equal(state.savedForSession, false);
  state = onboardingReducer(state, { type: "RESET_DEMO" });
  assert.ok(Object.values(state.draft.business).every((v) => v === ""));
});
test("validation, saving and reset are independent of operational inventory and network", () => {
  const store = createMockOperationsStore();
  const snapshot = store.getInventory();
  let notifications = 0;
  const unsubscribe = store.subscribe(() => notifications++);
  const original = global.fetch;
  let calls = 0;
  global.fetch = () => {
    calls++;
    throw new Error("Network forbidden");
  };
  try {
    let state = onboardingReducer(createOnboardingState(), {
      type: "UPDATE_DRAFT",
      section: "business",
      value: validateBusinessRegistration(valid()).value,
    });
    state = onboardingReducer(state, { type: "SAVE_DRAFT" });
    onboardingReducer(state, { type: "RESET_DEMO" });
    assert.equal(store.getInventory(), snapshot);
    assert.equal(notifications, 0);
    assert.equal(calls, 0);
  } finally {
    global.fetch = original;
    unsubscribe();
  }
});
