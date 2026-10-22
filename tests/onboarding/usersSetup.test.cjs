const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createOnboardingState,
  onboardingReducer,
  adjacentOnboardingStep,
} = require("../../src/features/onboarding/model.ts");
const {
  invitationRoles,
  invitationContact,
  validateUsersSetup,
  canSkipTeamSetup,
} = require("../../src/features/onboarding/usersSetup.ts");
const {
  createMockOperationsStore,
} = require("../../src/stores/mockOperationsStore.ts");
const run = (state, command) =>
  onboardingReducer(state, { type: "USERS_COMMAND", command });
const update = (state, section, value) =>
  onboardingReducer(state, { type: "UPDATE_DRAFT", section, value });
function setup(multi = false) {
  let state = createOnboardingState();
  state = update(state, "business", {
    ...state.draft.business,
    ownerDisplayName: "Demo Owner",
    contactPhone: "+91 98765-43210",
  });
  if (multi) {
    state = onboardingReducer(state, {
      type: "QUARRY_COMMAND",
      command: { type: "SET_MODE", enabled: true },
    });
    state = onboardingReducer(state, {
      type: "QUARRY_COMMAND",
      command: { type: "ADD_SITE" },
    });
  }
  return state;
}
function member(state, fields = {}) {
  state = run(state, { type: "ADD_INVITATION" });
  const id = state.draft.invitations.at(-1).id;
  return run(state, {
    type: "EDIT_INVITATION",
    id,
    fields: {
      name: " Team Member ",
      recipient: " Team@Example.invalid ",
      ...fields,
    },
  });
}
const first = (state) => state.draft.invitations[0].id;

test("primary Owner is represented automatically and tracks only Step 1 owner/contact fields", () => {
  let state = setup();
  assert.deepEqual(state.draft.primaryOwner, {
    id: "draft-primary-owner",
    role: "OWNER",
    accessScope: "ALL_SITES",
    displayName: "Demo Owner",
    contactPhone: "+91 98765-43210",
  });
  state = update(state, "business", {
    ...state.draft.business,
    ownerDisplayName: "Updated Owner",
    contactPhone: "9123456780",
  });
  assert.equal(state.draft.primaryOwner.displayName, "Updated Owner");
  assert.equal(state.draft.primaryOwner.contactPhone, "9123456780");
  assert.equal(state.draft.invitations.length, 0);
});
test("primary Owner cannot be removed, demoted or replaced by team or generic draft commands", () => {
  const state = setup();
  for (const command of [
    { type: "REMOVE_INVITATION", confirmed: true },
    { type: "SET_ROLE", role: "ADMIN" },
    { type: "SET_ACCESS", scope: "ASSIGNED_SITES" },
    { type: "EDIT_INVITATION", fields: { name: "Other" } },
  ])
    assert.equal(
      run(state, { ...command, id: "draft-primary-owner" }).draft,
      state.draft,
    );
  assert.equal(update(state, "primaryOwner", { role: "ADMIN" }), state);
});
test("owner-only setup permits Skip and Continue, without fabricating an invitation", () => {
  const { draft } = setup();
  assert.equal(canSkipTeamSetup(draft), true);
  assert.equal(validateUsersSetup(draft).valid, true);
  assert.equal(adjacentOnboardingStep("users", "forward").id, "review");
  assert.equal(canSkipTeamSetup(createOnboardingState().draft), false);
});
test("adding a team draft generates identity, conservative role and automatic primary single-site assignment", () => {
  const state = member(setup());
  const item = state.draft.invitations[0];
  assert.match(item.id, /^draft-invitation-\d+$/);
  assert.equal(item.role, "PRODUCTION_SUPERVISOR");
  assert.equal(item.accessScope, "ASSIGNED_SITES");
  assert.deepEqual(item.siteIds, [state.draft.sites[0].id]);
  assert.equal(item.remarks, "");
  assert.equal(validateUsersSetup(state.draft).valid, true);
  assert.equal(canSkipTeamSetup(state.draft), false);
});
test("all required invitation fields and unsupported contact channels fail clearly", () => {
  let state = run(setup(), { type: "ADD_INVITATION" });
  assert.equal(validateUsersSetup(state.draft).valid, false);
  assert.ok(validateUsersSetup(state.draft).errors[first(state)].name);
  assert.ok(validateUsersSetup(state.draft).errors[first(state)].recipient);
  const draft = structuredClone(member(setup()).draft);
  draft.invitations[0].role = "OWNER";
  assert.ok(validateUsersSetup(draft).errors[draft.invitations[0].id].role);
  assert.equal(invitationContact("FAX", "test@example.invalid"), null);
  assert.equal(
    run(state, {
      type: "EDIT_INVITATION",
      id: first(state),
      fields: { channel: "FAX" },
    }).draft,
    state.draft,
  );
});
test("contact normalization accepts reviewed Indian phone forms and email case, rejecting unsupported forms", () => {
  for (const value of [
    "9123456780",
    "+919123456780",
    "+91 91234-56780",
    " 91234 56780 ",
  ])
    assert.equal(invitationContact("PHONE", value), "+919123456780");
  for (const value of [
    "5123456780",
    "919123456780",
    "+19123456780",
    "(912)3456780",
    "912345678",
    "abc",
    "",
  ])
    assert.equal(invitationContact("PHONE", value), null);
  assert.equal(
    invitationContact("EMAIL", " TEAM@Example.Invalid "),
    "team@example.invalid",
  );
  for (const value of [
    "",
    "test",
    "a@@b.com",
    "a b@c.com",
    "a@.com",
    "a@b",
    "a@b..com",
  ])
    assert.equal(invitationContact("EMAIL", value), null);
});
test("case-insensitive duplicate email identities block both entries", () => {
  const state = member(member(setup()), { recipient: "team@example.INVALID" });
  const result = validateUsersSetup(state.draft);
  assert.equal(result.valid, false);
  for (const item of state.draft.invitations)
    assert.match(result.errors[item.id].recipient, /already used/);
});
test("normalized duplicate phones and reuse of the Owner business phone are blocked", () => {
  let state = member(
    member(setup(), { channel: "PHONE", recipient: "9123456780" }),
    { channel: "PHONE", recipient: "+91 91234-56780" },
  );
  for (const item of state.draft.invitations)
    assert.ok(validateUsersSetup(state.draft).errors[item.id].recipient);
  state = member(setup(), { channel: "PHONE", recipient: "9876543210" });
  assert.match(
    validateUsersSetup(state.draft).errors[first(state)].recipient,
    /already used/,
  );
});
test("editing preserves draft identity, other records and all unrelated draft fields", () => {
  let state = member(setup());
  const before = state.draft;
  const id = first(state);
  state = run(state, {
    type: "EDIT_INVITATION",
    id,
    fields: {
      name: "కొత్త పేరు",
      remarks: "Shift A",
      recipient: "9123456780",
      channel: "PHONE",
    },
  });
  assert.equal(first(state), id);
  assert.equal(state.draft.invitations[0].name, "కొత్త పేరు");
  assert.equal(state.draft.invitations[0].remarks, "Shift A");
  for (const section of [
    "primaryOwner",
    "business",
    "sites",
    "materials",
    "stockyards",
    "preferences",
  ])
    assert.equal(state.draft[section], before[section]);
});
test("confirmed team removal retains Owner and unconfirmed removal is atomic", () => {
  const state = member(setup());
  assert.equal(
    run(state, {
      type: "REMOVE_INVITATION",
      id: first(state),
      confirmed: false,
    }).draft,
    state.draft,
  );
  const removed = run(state, {
    type: "REMOVE_INVITATION",
    id: first(state),
    confirmed: true,
  });
  assert.deepEqual(removed.draft.invitations, []);
  assert.equal(removed.draft.primaryOwner, state.draft.primaryOwner);
  assert.equal(canSkipTeamSetup(removed.draft), true);
});
test("role list exactly matches additional deployed roles and Owner invitations are rejected", () => {
  assert.deepEqual(
    invitationRoles.map((role) => role.id),
    [
      "ADMIN",
      "QUARRY_MANAGER",
      "PRODUCTION_SUPERVISOR",
      "SALES_ACCOUNTANT",
      "DISPATCH_GATE_OPERATOR",
    ],
  );
  const state = member(setup());
  for (const role of ["OWNER", "UNKNOWN", ""])
    assert.equal(
      run(state, { type: "SET_ROLE", id: first(state), role }).draft,
      state.draft,
    );
});
test("Admin is All Sites and cannot be assigned separate quarries", () => {
  let state = member(setup(true));
  state = run(state, { type: "SET_ROLE", id: first(state), role: "ADMIN" });
  assert.equal(state.draft.invitations[0].accessScope, "ALL_SITES");
  assert.deepEqual(state.draft.invitations[0].siteIds, []);
  assert.equal(validateUsersSetup(state.draft).valid, true);
  assert.equal(
    run(state, {
      type: "SET_ACCESS",
      id: first(state),
      scope: "ASSIGNED_SITES",
    }).draft,
    state.draft,
  );
  assert.equal(
    run(state, {
      type: "TOGGLE_SITE",
      id: first(state),
      siteId: state.draft.sites[0].id,
    }).draft,
    state.draft,
  );
});
test("all operational roles default to assignments and permit explicit All Sites per matrix", () => {
  for (const role of invitationRoles.slice(1)) {
    let state = member(setup(true));
    state = run(state, { type: "SET_ROLE", id: first(state), role: role.id });
    assert.equal(state.draft.invitations[0].accessScope, "ASSIGNED_SITES");
    assert.equal(validateUsersSetup(state.draft).valid, false);
    state = run(state, {
      type: "SET_ACCESS",
      id: first(state),
      scope: "ALL_SITES",
    });
    assert.equal(validateUsersSetup(state.draft).valid, true);
    state = run(state, {
      type: "SET_ACCESS",
      id: first(state),
      scope: "ASSIGNED_SITES",
    });
    assert.deepEqual(state.draft.invitations[0].siteIds, []);
  }
});
test("changing away from Admin restores restrictive assignment without retaining All Sites", () => {
  let state = member(setup());
  state = run(state, { type: "SET_ROLE", id: first(state), role: "ADMIN" });
  state = run(state, {
    type: "SET_ROLE",
    id: first(state),
    role: "QUARRY_MANAGER",
  });
  assert.equal(state.draft.invitations[0].accessScope, "ASSIGNED_SITES");
  assert.deepEqual(state.draft.invitations[0].siteIds, [
    state.draft.sites[0].id,
  ]);
});
test("multi-quarry IDs support one/many selections and preserve them across renames/reordering", () => {
  let state = member(setup(true));
  for (const site of state.draft.sites)
    state = run(state, {
      type: "TOGGLE_SITE",
      id: first(state),
      siteId: site.id,
    });
  const ids = state.draft.invitations[0].siteIds;
  state = update(
    state,
    "sites",
    [...state.draft.sites]
      .reverse()
      .map((site) => ({ ...site, name: "Same display name" })),
  );
  assert.deepEqual(state.draft.invitations[0].siteIds, ids);
  assert.equal(validateUsersSetup(state.draft).valid, true);
  state = run(state, { type: "TOGGLE_SITE", id: first(state), siteId: ids[0] });
  assert.deepEqual(state.draft.invitations[0].siteIds, [ids[1]]);
});
test("removed site IDs fail without reassignment; explicit stale removal and new selection repairs draft", () => {
  let state = member(setup(true));
  const id = first(state),
    removed = state.draft.sites[1].id;
  state = run(state, { type: "TOGGLE_SITE", id, siteId: removed });
  const sites = state.draft.sites.slice(0, 1);
  state = update(state, "sites", sites);
  state = update(state, "multiSiteEnabled", false);
  assert.deepEqual(state.draft.invitations[0].siteIds, [removed]);
  assert.ok(validateUsersSetup(state.draft).errors[id].sites);
  state = run(state, { type: "TOGGLE_SITE", id, siteId: removed });
  assert.equal(
    run(state, { type: "TOGGLE_SITE", id, siteId: removed }).draft,
    state.draft,
  );
  state = run(state, { type: "TOGGLE_SITE", id, siteId: sites[0].id });
  assert.equal(validateUsersSetup(state.draft).valid, true);
});
test("existing quarry removal protection sees real invitation assignments", () => {
  let state = member(setup(true));
  const siteId = state.draft.sites[1].id;
  state = run(state, { type: "TOGGLE_SITE", id: first(state), siteId });
  const blocked = onboardingReducer(state, {
    type: "QUARRY_COMMAND",
    command: { type: "REMOVE_SITE", siteId, confirmed: true },
  });
  assert.equal(blocked.draft, state.draft);
  assert.match(blocked.quarryIssue, /invitation/);
});
test("malformed role/scope pairs, duplicate IDs and empty or duplicate site assignments fail closed", () => {
  for (const fields of [
    { role: "ADMIN", accessScope: "ASSIGNED_SITES" },
    { accessScope: "OTHER" },
    { accessScope: "ALL_SITES", siteIds: ["draft-primary-site"] },
    { siteIds: [] },
    { siteIds: ["draft-primary-site", "draft-primary-site"] },
  ]) {
    const draft = structuredClone(member(setup()).draft);
    Object.assign(draft.invitations[0], fields);
    assert.equal(validateUsersSetup(draft).valid, false);
  }
  const draft = member(member(setup()), {
    recipient: "second@example.invalid",
  }).draft;
  draft.invitations[1].id = draft.invitations[0].id;
  assert.ok(validateUsersSetup(draft).identityError);
});
test("Save/Resume and forward/back retain incomplete values without claiming readiness", () => {
  let state = run(setup(), { type: "ADD_INVITATION" });
  state = run(state, {
    type: "EDIT_INVITATION",
    id: first(state),
    fields: { remarks: "Partial" },
  });
  state = onboardingReducer(state, { type: "SAVE_DRAFT" });
  const draft = state.draft;
  for (const step of ["users", "materials", "users", "review", "users"]) {
    state = onboardingReducer(state, { type: "NAVIGATE", step });
    assert.equal(state.draft, draft);
    assert.equal(state.savedForSession, true);
  }
  assert.equal(validateUsersSetup(state.draft).valid, false);
});
test("normalization trims names/remarks and canonicalizes contacts only on explicit Save/Continue", () => {
  let state = member(setup(), { remarks: " Shift A " });
  assert.equal(state.draft.invitations[0].recipient, " Team@Example.invalid ");
  state = run(state, { type: "NORMALIZE" });
  assert.equal(state.draft.invitations[0].recipient, "team@example.invalid");
  assert.equal(state.draft.invitations[0].name, "Team Member");
  assert.equal(state.draft.invitations[0].remarks, "Shift A");
  state = onboardingReducer(state, { type: "SAVE_DRAFT" });
  assert.equal(run(state, { type: "NORMALIZE" }).savedForSession, true);
});
test("reset clears invitations and derived Owner values without recycling issued IDs", () => {
  const before = member(setup());
  let state = onboardingReducer(before, { type: "RESET_DEMO" });
  assert.deepEqual(state.draft.invitations, []);
  assert.equal(state.draft.primaryOwner.displayName, "");
  assert.equal(state.draft.primaryOwner.role, "OWNER");
  state = run(state, { type: "ADD_INVITATION" });
  assert.notEqual(first(state), first(before));
  state = run(state, {
    type: "REMOVE_INVITATION",
    id: first(state),
    confirmed: true,
  });
  const next = run(state, { type: "ADD_INVITATION" });
  assert.notEqual(first(next), first(before));
});
test("rapid add and pre-existing explicit IDs never collide", () => {
  let state = run(setup(), { type: "ADD_INVITATION" });
  state = update(state, "invitations", [
    { ...state.draft.invitations[0], id: "draft-invitation-2" },
  ]);
  for (let i = 0; i < 20; i++) state = run(state, { type: "ADD_INVITATION" });
  assert.equal(
    new Set(state.draft.invitations.map((item) => item.id)).size,
    21,
  );
});
test("team commands, validation, Save and reset do not call network/Auth or change operational inventory", () => {
  const store = createMockOperationsStore();
  const inventory = store.getInventory();
  let notifications = 0;
  store.subscribe(() => notifications++);
  const oldFetch = global.fetch;
  global.fetch = () => {
    throw new Error("No backend calls allowed");
  };
  try {
    let state = member(setup());
    validateUsersSetup(state.draft);
    state = onboardingReducer(state, { type: "SAVE_DRAFT" });
    onboardingReducer(state, { type: "RESET_DEMO" });
    assert.equal(store.getInventory(), inventory);
    assert.equal(notifications, 0);
  } finally {
    global.fetch = oldFetch;
  }
});
