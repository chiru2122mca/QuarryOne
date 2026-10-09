const { test } = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { renderToString } = require("react-dom/server");
const { createGraniteBlock } = require("../../src/domain/blocks/block.ts");
const {
  formatVolume,
  cubicMetresToCft,
} = require("../../src/domain/blocks/volume.ts");
const { mockBlocks } = require("../../src/data/blocks/mockBlocks.ts");
const {
  createMockOperationsStore,
} = require("../../src/stores/mockOperationsStore.ts");
const {
  OperationsProvider,
  OperationsContext,
} = require("../../src/stores/OperationsProvider.ts");
const {
  createProductionSubmission,
} = require("../../src/features/production/model.ts");
const {
  clearInventoryFilters,
  inventorySummary,
  inventoryRecords,
  findInventoryBlock,
} = require("../../src/features/inventory/model.ts");
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-10);

// Future statuses are isolated selector-test records, never written into demo history/store.
function example(sequence, status, volume, patch = {}) {
  const base = createGraniteBlock({
    id: `test-${sequence}`,
    blockNumber: `BLK-2026-${String(sequence).padStart(4, "0")}`,
    productionDate: "2026-10-09",
    quarryId: "quarry-deccan",
    pitId: "pit-a",
    material: "Black Granite",
    grade: "A",
    dimensions: { length: volume, width: 1, height: 1, unit: "M" },
    stockyardLocation: "Yard 1",
    supervisor: "Ramesh",
  });
  return Object.freeze({ ...base, status, ...patch });
}
const statuses = Object.freeze([
  example(1, "AVAILABLE", 3),
  example(2, "RESERVED", 4),
  example(3, "DISPATCHED", 5),
  example(4, "REJECTED", 6),
]);

test("inventory KPIs derive all seed counts and available-only volume", () => {
  const summary = inventorySummary(mockBlocks);
  assert.equal(summary.totalBlocks, 18);
  assert.deepEqual(summary.counts, {
    AVAILABLE: 15,
    RESERVED: 0,
    DISPATCHED: 0,
    REJECTED: 3,
  });
  near(
    summary.availableVolumeM3,
    mockBlocks
      .filter((b) => b.status === "AVAILABLE")
      .reduce((n, b) => n + b.volumeM3, 0),
  );
  near(
    summary.historicalVolumeM3,
    mockBlocks.reduce((n, b) => n + b.volumeM3, 0),
  );
  assert.ok(summary.availableVolumeM3 < summary.historicalVolumeM3);
});
test("all four statuses count consistently; held, dispatched and rejected are not saleable", () => {
  const summary = inventorySummary(statuses);
  assert.equal(summary.totalBlocks, 4);
  assert.deepEqual(summary.counts, {
    AVAILABLE: 1,
    RESERVED: 1,
    DISPATCHED: 1,
    REJECTED: 1,
  });
  assert.equal(summary.availableVolumeM3, 3);
  assert.equal(summary.historicalVolumeM3, 18);
});
test("dispatched history and rejected records are excluded from usable on-hand stock", () => {
  const summary = inventorySummary(statuses);
  assert.equal(summary.onHandBlocks, 2);
  assert.equal(summary.onHandVolumeM3, 7);
  assert.equal(inventoryRecords(statuses, clearInventoryFilters()).length, 4);
});
test("block-number search is trimmed, case-insensitive and supports partial numbers", () => {
  const filters = { ...clearInventoryFilters(), search: " blk-2026-0001 " };
  assert.deepEqual(
    inventoryRecords(mockBlocks, filters).map((b) => b.blockNumber),
    ["BLK-2026-0001"],
  );
  assert.equal(
    inventoryRecords(mockBlocks, { ...filters, search: "001" }).length,
    10,
  );
});
test("search, material, grade, pit and status filters intersect", () => {
  const filters = {
    search: "2026",
    material: "Black Granite",
    grade: "A",
    pitId: "pit-a",
    status: "AVAILABLE",
  };
  const rows = inventoryRecords(mockBlocks, filters);
  assert.deepEqual(
    rows.map((b) => b.blockNumber),
    ["BLK-2026-0001"],
  );
  assert.equal(
    inventoryRecords(mockBlocks, { ...filters, status: "REJECTED" }).length,
    0,
  );
});
test("individual status and material filters preserve traceability", () => {
  for (const status of ["AVAILABLE", "RESERVED", "DISPATCHED", "REJECTED"]) {
    assert.equal(
      inventoryRecords(statuses, { ...clearInventoryFilters(), status }).length,
      1,
    );
  }
  assert.equal(
    inventoryRecords(mockBlocks, {
      ...clearInventoryFilters(),
      material: "Grey Granite",
    }).length,
    6,
  );
});
test("filters do not alter inventory or whole-inventory KPIs", () => {
  const before = inventorySummary(mockBlocks),
    first = mockBlocks[0];
  const rows = inventoryRecords(mockBlocks, {
    ...clearInventoryFilters(),
    grade: "C",
    status: "REJECTED",
  });
  assert.equal(rows.length, 3);
  assert.deepEqual(inventorySummary(mockBlocks), before);
  assert.equal(mockBlocks[0], first);
});
test("sort is newest production date, then block number descending and ID ascending", () => {
  const records = [
    example(1, "AVAILABLE", 1, { productionDate: "2026-10-08" }),
    example(2, "AVAILABLE", 1),
    example(3, "AVAILABLE", 1),
    example(3, "AVAILABLE", 1, { id: "a-tie" }),
  ];
  assert.deepEqual(
    inventoryRecords(records, clearInventoryFilters()).map((b) => b.id),
    ["a-tie", "test-3", "test-2", "test-1"],
  );
});
test("inventory units use canonical volume and existing display formatting", () => {
  const volume = 5.6633693184;
  near(cubicMetresToCft(volume), 200);
  assert.equal(formatVolume(volume, "CFT"), "200.00 CFT");
  assert.equal(formatVolume(volume, "M3"), "5.663 m³");
});
test("a newly produced block immediately increases available inventory and detail lookup", () => {
  const store = createMockOperationsStore(),
    before = inventorySummary(store.getInventory());
  const block = createProductionSubmission(store.addBlock).save({
    productionDate: "2026-10-09",
    quarryId: "quarry-deccan",
    pitId: "pit-b",
    material: "Black Granite",
    grade: "A",
    length: "10",
    width: "5",
    height: "4",
    unit: "FT",
    stockyardLocation: "Yard 1",
    supervisor: "Ramesh",
    remarks: "Inventory integration",
  });
  const after = inventorySummary(store.getInventory());
  assert.equal(after.totalBlocks, 19);
  assert.equal(after.counts.AVAILABLE, 16);
  near(after.availableVolumeM3 - before.availableVolumeM3, 5.6633693184);
  assert.equal(
    inventoryRecords(store.getInventory(), clearInventoryFilters())[0].id,
    block.id,
  );
  assert.equal(
    findInventoryBlock(store.getInventory(), block.id),
    store.getBlockById(block.id),
  );
});
test("block details preserve all record values and resolve opaque IDs", () => {
  const found = findInventoryBlock(mockBlocks, ` ${mockBlocks[0].id} `);
  assert.equal(found, mockBlocks[0]);
  assert.equal(found.dimensions.unit, "FT");
  assert.ok(found.stockyardLocation);
  assert.ok(found.supervisor);
  assert.ok(found.remarks);
});
test("invalid, missing and array IDs resolve gracefully", () => {
  for (const id of [
    undefined,
    null,
    "",
    " ",
    "missing",
    123,
    [mockBlocks[0].id],
  ])
    assert.equal(findInventoryBlock(mockBlocks, id), undefined);
});
test("empty inventory and empty-result searches have valid zero summaries", () => {
  const summary = inventorySummary([]);
  assert.equal(summary.totalBlocks, 0);
  assert.equal(summary.availableVolumeM3, 0);
  assert.equal(summary.historicalVolumeM3, 0);
  assert.equal(summary.onHandVolumeM3, 0);
  assert.deepEqual(
    inventoryRecords(mockBlocks, {
      ...clearInventoryFilters(),
      search: "NO-SUCH-BLOCK",
    }),
    [],
  );
});
test("Clear Filters creates a fresh default and restores every record", () => {
  const restrictive = {
    search: "no",
    material: "Black Granite",
    grade: "C",
    pitId: "pit-b",
    status: "RESERVED",
  };
  assert.equal(inventoryRecords(mockBlocks, restrictive).length, 0);
  const cleared = clearInventoryFilters();
  assert.equal(inventoryRecords(mockBlocks, cleared).length, 18);
  assert.notEqual(cleared, clearInventoryFilters());
  assert.equal(restrictive.search, "no");
});
test("inventory and details consumers remount without recreating the shared session store", () => {
  const store = createMockOperationsStore();
  let first;
  function Consumer() {
    const current = React.useContext(OperationsContext);
    if (!first) first = current;
    assert.equal(current, first);
    return React.createElement(
      "span",
      null,
      inventorySummary(current.getInventory()).totalBlocks,
    );
  }
  const visit = () =>
    renderToString(
      React.createElement(
        OperationsProvider,
        { store },
        React.createElement(Consumer),
      ),
    );
  assert.match(visit(), />18</);
  store.addBlock({
    productionDate: "2026-10-09",
    quarryId: "quarry-deccan",
    pitId: "pit-a",
    material: "Grey Granite",
    grade: "B",
    dimensions: { length: 2, width: 1, height: 1, unit: "M" },
    stockyardLocation: "Yard A",
    supervisor: "Suresh",
  });
  assert.match(visit(), />19</);
  assert.match(visit(), />19</);
});
