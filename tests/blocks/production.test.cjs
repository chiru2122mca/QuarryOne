const { test } = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { renderToString } = require("react-dom/server");
const {
  createMockOperationsStore,
  mockOperationsStore,
} = require("../../src/stores/mockOperationsStore.ts");
const {
  OperationsProvider,
  OperationsContext,
} = require("../../src/stores/OperationsProvider.ts");
const { useMockOperations } = require("../../src/stores/useMockOperations.ts");
const {
  previewProductionVolume,
  buildProductionInput,
  createProductionSubmission,
  productionTotals,
  productionRecords,
  localProductionDate,
} = require("../../src/features/production/model.ts");
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
const draft = (patch = {}) => ({
  productionDate: "2026-10-08",
  quarryId: "quarry-deccan",
  pitId: "pit-a",
  material: "Black Granite",
  grade: "A",
  length: "10",
  width: "5",
  height: "4",
  unit: "FT",
  stockyardLocation: "Yard A / Row 4",
  supervisor: "Ramesh",
  remarks: "Measured",
  ...patch,
});

test("live preview reuses CFT/m³ domain calculations and updates with dimensions/unit", () => {
  const first = previewProductionVolume(draft());
  assert.equal(first.valid, true);
  assert.equal(first.cft, 200);
  near(first.volumeM3, 5.6633693184);
  const changed = previewProductionVolume(
    draft({ length: "2.5", width: "1.2", height: "0.8", unit: "M" }),
  );
  assert.equal(changed.valid, true);
  near(changed.volumeM3, 2.4);
  near(changed.cft, 84.75520013157262);
  const fractional = previewProductionVolume(
    draft({ length: ".5", width: "1.25", height: "2." }),
  );
  assert.equal(fractional.valid, true);
  assert.equal(fractional.cft, 1.25);
});
test("empty, negative, zero, nondecimal and nonfinite dimensions produce clear errors", () => {
  for (const key of ["length", "width", "height"]) {
    for (const invalid of [
      "",
      " ",
      "0",
      "-1",
      "2x",
      "Infinity",
      "1e5",
      "0x10",
    ]) {
      const preview = previewProductionVolume(draft({ [key]: invalid }));
      assert.equal(preview.valid, false);
      assert.match(preview.error, /positive number/);
      assert.throws(
        () => buildProductionInput(draft({ [key]: invalid })),
        /positive number/,
      );
    }
  }
});
test("production saves assign AVAILABLE, generate identity, preserve dimensions and update totals", () => {
  const store = createMockOperationsStore(),
    before = productionTotals(store.getInventory());
  const block = createProductionSubmission(store.addBlock).save(draft());
  assert.equal(block.blockNumber, "BLK-2026-0019");
  assert.equal(block.status, "AVAILABLE");
  assert.equal(block.dimensions.length, 10);
  assert.equal(block.dimensions.unit, "FT");
  const after = productionTotals(store.getInventory());
  assert.equal(after.blocks, before.blocks + 1);
  near(after.volumeM3 - before.volumeM3, 5.6633693184);
});
test("rapid repeated saves on the same form add only one block", () => {
  const store = createMockOperationsStore(),
    submission = createProductionSubmission(store.addBlock);
  const first = submission.save(draft());
  for (let i = 0; i < 10; i++)
    assert.equal(submission.save(draft({ length: "20" })), first);
  assert.equal(store.getInventory().length, 19);
});
test("a new form gets the next unique block number, including identical dimensions", () => {
  const store = createMockOperationsStore();
  const a = createProductionSubmission(store.addBlock).save(draft());
  const b = createProductionSubmission(store.addBlock).save(draft());
  assert.notEqual(a.id, b.id);
  assert.equal(b.blockNumber, "BLK-2026-0020");
});
test("invalid mandatory data does not lock the form and can be corrected", () => {
  const store = createMockOperationsStore(),
    submission = createProductionSubmission(store.addBlock);
  for (const patch of [
    { stockyardLocation: " " },
    { supervisor: "" },
    { productionDate: "2026-02-30" },
    { quarryId: "unknown" },
  ])
    assert.throws(() => submission.save(draft(patch)));
  assert.equal(store.getInventory().length, 18);
  assert.equal(submission.save(draft()).blockNumber, "BLK-2026-0019");
});
test("store errors propagate and a later retry can succeed", () => {
  const store = createMockOperationsStore();
  let fail = true;
  const submission = createProductionSubmission((value) => {
    if (fail) throw new Error("Demo store unavailable");
    return store.addBlock(value);
  });
  assert.throws(() => submission.save(draft()), /Demo store unavailable/);
  assert.equal(store.getInventory().length, 18);
  fail = false;
  assert.equal(submission.save(draft()).blockNumber, "BLK-2026-0019");
});
test("reentrant saves cannot create a duplicate while the first command is active", () => {
  const store = createMockOperationsStore();
  let submission;
  submission = createProductionSubmission((value) => {
    assert.throws(() => submission.save(draft()), /already in progress/);
    return store.addBlock(value);
  });
  submission.save(draft());
  assert.equal(store.getInventory().length, 19);
});
test("totals count all produced blocks including rejected and filtering does not mutate inventory", () => {
  const store = createMockOperationsStore(),
    inventory = store.getInventory();
  const total = productionTotals(inventory);
  assert.equal(total.blocks, 18);
  near(
    total.volumeM3,
    inventory.reduce((n, b) => n + b.volumeM3, 0),
  );
  const rows = productionRecords(inventory, "2026-09-24", "pit-b");
  assert.equal(rows.length, 2);
  assert.equal(inventory[0].blockNumber, "BLK-2026-0001");
  assert.deepEqual(productionTotals([]), { blocks: 0, volumeM3: 0 });
});
test("a newly created backdated block can be placed first for immediate confirmation", () => {
  const store = createMockOperationsStore(),
    block = createProductionSubmission(store.addBlock).save(
      draft({ productionDate: "2025-01-01" }),
    );
  assert.equal(
    productionRecords(
      store.getInventory(),
      "All dates",
      "All pits",
      block.id,
    )[0].id,
    block.id,
  );
});
test("root provider and hook keep the same store across route-consumer remounts", () => {
  const store = createMockOperationsStore();
  let observed;
  function RouteConsumer() {
    observed = React.useContext(OperationsContext);
    const operations = useMockOperations();
    assert.equal(operations.addBlock, store.addBlock);
    return React.createElement("span", null, observed.getInventory().length);
  }
  const renderRoute = () =>
    renderToString(
      React.createElement(
        OperationsProvider,
        { store },
        React.createElement(RouteConsumer),
      ),
    );
  assert.match(renderRoute(), />18</);
  createProductionSubmission(store.addBlock).save(draft());
  assert.match(renderRoute(), />19</);
  assert.equal(observed, store);
  function DefaultConsumer() {
    assert.equal(React.useContext(OperationsContext), mockOperationsStore);
    return null;
  }
  renderToString(
    React.createElement(
      OperationsProvider,
      null,
      React.createElement(DefaultConsumer),
    ),
  );
});
test("production date uses local calendar fields", () => {
  assert.equal(localProductionDate(new Date(2026, 0, 2, 23, 59)), "2026-01-02");
});
