const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateCubicFeet,
  calculateCubicMetres,
  cftToCubicMetres,
  cubicMetresToCft,
  formatVolume,
} = require("../../src/domain/blocks/volume.ts");
const near = (actual, expected) =>
  assert.ok(
    Math.abs(actual - expected) <= 1e-12 * Math.max(1, Math.abs(expected)),
    `${actual} != ${expected}`,
  );

test("feet entry produces CFT and canonical unrounded m³", () => {
  const dimensions = { length: 8, width: 5, height: 4, unit: "FT" };
  assert.equal(calculateCubicFeet(dimensions), 160);
  near(calculateCubicMetres(dimensions), 4.53069545472);
  assert.deepEqual(dimensions, { length: 8, width: 5, height: 4, unit: "FT" });
});
test("metre entry supports both outputs", () => {
  const dimensions = { length: 2, width: 1, height: 0.5, unit: "M" };
  assert.equal(calculateCubicMetres(dimensions), 1);
  near(calculateCubicFeet(dimensions), 35.31466672148859);
});
test("known international-foot conversions and zero totals", () => {
  assert.equal(cftToCubicMetres(1), 0.028316846592);
  near(cubicMetresToCft(1), 35.31466672148859);
  assert.equal(cftToCubicMetres(0), 0);
  assert.equal(cubicMetresToCft(0), 0);
});
test("fractional measurements retain decimal precision and conversion round trips", () => {
  near(
    calculateCubicMetres({ length: 0.1, width: 0.2, height: 0.3, unit: "M" }),
    0.006,
  );
  near(
    calculateCubicFeet({ length: 7.25, width: 4.5, height: 3.125, unit: "FT" }),
    101.953125,
  );
  for (const value of [0.00001, 0.123456789, 1, 12345.6789])
    near(cubicMetresToCft(cftToCubicMetres(value)), value);
});
test("formatting rounds only display and supports both volume units", () => {
  const volume = 1.23456789;
  assert.equal(formatVolume(volume), "1.235 m³");
  assert.equal(formatVolume(1, "CFT"), "35.31 CFT");
  assert.equal(formatVolume(volume, "M3", 6), "1.234568 m³");
  assert.equal(volume, 1.23456789);
});
for (const field of ["length", "width", "height"]) {
  test(`rejects invalid ${field}`, () => {
    for (const value of [
      0,
      -1,
      NaN,
      Infinity,
      -Infinity,
      "2",
      null,
      undefined,
    ]) {
      const dimensions = {
        length: 1,
        width: 1,
        height: 1,
        unit: "FT",
        [field]: value,
      };
      assert.throws(
        () => calculateCubicFeet(dimensions),
        /finite and positive/,
      );
      assert.throws(
        () => calculateCubicMetres(dimensions),
        /finite and positive/,
      );
    }
  });
}
test("rejects unsupported units and display precision", () => {
  assert.throws(
    () => calculateCubicMetres({ length: 1, width: 1, height: 1, unit: "CM" }),
    /unit/,
  );
  assert.throws(() => formatVolume(1, "TON"), /unit/);
  for (const digits of [-1, 7, 1.5, NaN])
    assert.throws(() => formatVolume(1, "M3", digits), /precision/);
});
test("rejects invalid conversions, overflow and underflow", () => {
  for (const value of [-1, NaN, Infinity]) {
    assert.throws(() => cftToCubicMetres(value), /finite and non-negative/);
    assert.throws(() => cubicMetresToCft(value), /finite and non-negative/);
  }
  assert.throws(
    () =>
      calculateCubicMetres({
        length: 1e200,
        width: 1e200,
        height: 1,
        unit: "M",
      }),
    /representable/,
  );
  assert.throws(
    () =>
      calculateCubicFeet({
        length: 1e-200,
        width: 1e-200,
        height: 1,
        unit: "FT",
      }),
    /representable/,
  );
  assert.throws(() => cubicMetresToCft(Number.MAX_VALUE), /representable/);
  assert.throws(() => cftToCubicMetres(Number.MIN_VALUE), /representable/);
});
