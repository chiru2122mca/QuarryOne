const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createMockOperationsStore,
} = require("../../src/stores/mockOperationsStore.ts");
const { mockBlocks } = require("../../src/data/blocks/mockBlocks.ts");
const {
  mockQuarries,
  mockPits,
  blockCustomers,
} = require("../../src/data/blocks/referenceData.ts");
const { calculateCubicMetres } = require("../../src/domain/blocks/volume.ts");
const {
  createOperationsState,
  operationsReducer,
} = require("../../src/domain/blocks/operationsReducer.ts");
const input = () => ({
  productionDate: "2026-09-25",
  quarryId: "quarry-deccan",
  pitId: "pit-a",
  material: "Black Granite",
  grade: "A",
  dimensions: { length: 8.25, width: 4.5, height: 3.25, unit: "FT" },
  stockyardLocation: "Yard A / Row 4",
  supervisor: "Ramesh",
  remarks: "Foundation test",
});

test("deterministic seed has 18 blocks, one quarry, two pits, three grades and four customers", () => {
  assert.equal(mockBlocks.length, 18);
  assert.equal(mockQuarries.length, 1);
  assert.equal(mockPits.length, 2);
  assert.equal(blockCustomers.length, 4);
  assert.equal(mockQuarries[0].name, "Deccan Stone Quarry");
  assert.deepEqual([...new Set(mockBlocks.map((b) => b.grade))].sort(), [
    "A",
    "B",
    "C",
  ]);
  assert.deepEqual([...new Set(mockBlocks.map((b) => b.status))].sort(), [
    "AVAILABLE",
    "REJECTED",
  ]);
  assert.equal(new Set(mockBlocks.map((b) => b.id)).size, 18);
  assert.equal(new Set(mockBlocks.map((b) => b.blockNumber)).size, 18);
  for (const block of mockBlocks) {
    assert.match(block.blockNumber, /^BLK-2026-\d{4}$/);
    assert.equal(block.volumeM3, calculateCubicMetres(block.dimensions));
  }
});
test("add and retrieve preserve entry values while calculating canonical volume", () => {
  const store = createMockOperationsStore(),
    entry = input();
  const added = store.addBlock(entry);
  assert.equal(added.blockNumber, "BLK-2026-0019");
  assert.equal(added.id, "block-2026-0019");
  assert.equal(added.status, "AVAILABLE");
  assert.equal(store.getInventory().length, 19);
  assert.equal(store.getBlockById(added.id), added);
  assert.equal(store.getBlockById("missing"), undefined);
  assert.deepEqual(added.dimensions, entry.dimensions);
  assert.equal(added.volumeM3, calculateCubicMetres(entry.dimensions));
  entry.dimensions.length = 99;
  assert.equal(added.dimensions.length, 8.25);
});
test("metric entry, explicit identity and rejected blocks are supported", () => {
  const block = createMockOperationsStore().addBlock({
    ...input(),
    id: "manual-record",
    blockNumber: "BLK-2026-0025",
    status: "REJECTED",
    dimensions: { length: 2.4, width: 1.8, height: 1.2, unit: "M" },
  });
  assert.equal(block.status, "REJECTED");
  assert.equal(block.id, "manual-record");
  assert.equal(block.dimensions.unit, "M");
  assert.equal(block.volumeM3, 2.4 * 1.8 * 1.2);
});
test("duplicate IDs and numbers are rejected atomically (including trimmed values)", () => {
  const store = createMockOperationsStore(),
    before = store.getInventory();
  assert.throws(
    () => store.addBlock({ ...input(), id: ` ${mockBlocks[0].id} ` }),
    /Duplicate block ID/,
  );
  assert.throws(
    () =>
      store.addBlock({
        ...input(),
        blockNumber: ` ${mockBlocks[0].blockNumber} `,
      }),
    /Duplicate block number/,
  );
  assert.equal(store.getInventory(), before);
  assert.equal(store.addBlock(input()).blockNumber, "BLK-2026-0019");
});
test("invalid dimensions leave the inventory and generator unchanged", () => {
  const store = createMockOperationsStore(),
    before = store.getInventory();
  for (const value of [0, -2, NaN, Infinity])
    assert.throws(
      () =>
        store.addBlock({
          ...input(),
          dimensions: { ...input().dimensions, length: value },
        }),
      /finite and positive/,
    );
  assert.equal(store.getInventory(), before);
  assert.equal(store.addBlock(input()).blockNumber, "BLK-2026-0019");
});
test("invalid catalog/date/grade/status/number and required fields are rejected", () => {
  const store = createMockOperationsStore();
  for (const patch of [
    { quarryId: "unknown" },
    { pitId: "unknown" },
    { productionDate: "2026-02-30" },
    { productionDate: "09/25/2026" },
    { grade: "D" },
    { material: "Unknown" },
    { status: "RESERVED" },
    { status: "DISPATCHED" },
    { blockNumber: "BLK-2026-0000" },
    { blockNumber: "BLK-2025-0019" },
    { id: " " },
    { supervisor: "" },
    { stockyardLocation: "" },
  ])
    assert.throws(() => store.addBlock({ ...input(), ...patch }));
  assert.equal(store.getInventory().length, 18);
});
test("reset restores deterministic seed but does not recycle issued identities", () => {
  const store = createMockOperationsStore(),
    seed = store.getInventory();
  const first = store.addBlock(input());
  store.resetDemoData();
  assert.deepEqual(store.getInventory(), seed);
  assert.equal(store.getBlockById(first.id), undefined);
  const second = store.addBlock(input());
  assert.equal(second.blockNumber, "BLK-2026-0020");
  assert.notEqual(second.id, first.id);
  store.resetDemoData();
  store.resetDemoData();
  assert.throws(
    () => store.addBlock({ ...input(), id: first.id }),
    /Duplicate block ID/,
  );
  assert.throws(
    () => store.addBlock({ ...input(), blockNumber: first.blockNumber }),
    /Duplicate block number/,
  );
  const third = store.addBlock(input());
  assert.equal(third.blockNumber, "BLK-2026-0021");
});
test("generator skips an explicitly issued future ID, even after reset", () => {
  const store = createMockOperationsStore();
  store.addBlock({ ...input(), id: "block-2026-0020" });
  store.resetDemoData();
  assert.equal(store.addBlock(input()).blockNumber, "BLK-2026-0021");
});
test("manual higher numbers advance generation and production year is respected", () => {
  const store = createMockOperationsStore();
  store.addBlock({ ...input(), blockNumber: "BLK-2026-0080" });
  assert.equal(
    store.addBlock({ ...input(), productionDate: "2027-01-01" }).blockNumber,
    "BLK-2027-0081",
  );
});
test("read snapshots and nested records are immutable and stable until a transition", () => {
  const store = createMockOperationsStore(),
    before = store.getInventory();
  assert.equal(store.getInventory(), before);
  assert.ok(Object.isFrozen(before));
  assert.ok(Object.isFrozen(before[0]));
  assert.ok(Object.isFrozen(before[0].dimensions));
  assert.throws(() => before.push(before[0]), TypeError);
  store.addBlock(input());
  assert.notEqual(store.getInventory(), before);
  assert.equal(before.length, 18);
});
test("subscriptions notify only successful changes and unsubscribe works", () => {
  const store = createMockOperationsStore();
  let calls = 0;
  const stop = store.subscribe(() => calls++);
  store.addBlock(input());
  assert.equal(calls, 1);
  assert.throws(() => store.addBlock({ ...input(), id: mockBlocks[0].id }));
  assert.equal(calls, 1);
  store.resetDemoData();
  assert.equal(calls, 2);
  stop();
  store.addBlock(input());
  assert.equal(calls, 2);
});
test("store instances and pure reducer do not mutate each other or the seed", () => {
  const first = createMockOperationsStore(),
    second = createMockOperationsStore();
  first.addBlock(input());
  assert.equal(second.getInventory().length, 18);
  assert.equal(mockBlocks.length, 18);
  const state = createOperationsState(mockBlocks, {
    quarries: mockQuarries,
    pits: mockPits,
  });
  const a = operationsReducer(state, { type: "ADD_BLOCK", input: input() });
  const b = operationsReducer(state, { type: "ADD_BLOCK", input: input() });
  assert.deepEqual(a, b);
  assert.equal(state.inventory.length, 18);
});
test("invalid or duplicate seed inventory is rejected", () => {
  assert.throws(
    () => createMockOperationsStore([mockBlocks[0], mockBlocks[0]]),
    /Duplicate/,
  );
  assert.throws(
    () => createMockOperationsStore([{ ...mockBlocks[0], status: "RESERVED" }]),
    /history/,
  );
});
test("canonical volume is derived rather than trusted from an input payload", () => {
  const block = createMockOperationsStore().addBlock({
    ...input(),
    volumeM3: 999,
  });
  assert.equal(block.volumeM3, calculateCubicMetres(input().dimensions));
});

test("an observer's subsequent add cannot change the block returned by the original command", () => {
  const store = createMockOperationsStore();
  let handled = false;
  store.subscribe(() => {
    if (!handled) {
      handled = true;
      store.addBlock(input());
    }
  });
  const block = store.addBlock(input());
  assert.equal(block.blockNumber, "BLK-2026-0019");
  assert.equal(store.getInventory().length, 20);
  assert.equal(store.getInventory()[19].blockNumber, "BLK-2026-0020");
});

test("four-digit numbering fails safely at capacity without collisions or state changes", () => {
  const store = createMockOperationsStore();
  store.addBlock({ ...input(), blockNumber: "BLK-2026-9999" });
  const before = store.getInventory();
  assert.throws(() => store.addBlock(input()), /four-digit format/);
  assert.equal(store.getInventory(), before);
});
