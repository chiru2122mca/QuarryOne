const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  fs.mkdirSync("verification/v032", { recursive: true });
  for (const width of [360, 390, 412]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    page.on("pageerror", (error) => errors.push(error.message));
    const visibleText = (text) =>
      page.getByText(text, { exact: true }).filter({ visible: true }).first();
    const totals = () =>
      page.getByTestId("production-totals").filter({ visible: true }).first();
    const openSelect = async (label, option) => {
      await page
        .getByRole("button", { name: new RegExp(`^${label}:`) })
        .click();
      await page
        .getByRole("button", {
          name: new RegExp(
            `^${option.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s*✓)?$`,
          ),
        })
        .click();
    };
    const checkWidth = async () =>
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${width}: horizontal overflow`,
      );
    await page.goto("http://127.0.0.1:8082/production");
    await page.waitForLoadState("networkidle");
    await totals().getByText("18", { exact: true }).waitFor();
    const initialVolume = await totals().getByText(/m³$/).textContent();
    assert.equal(await page.getByText("125 Tons", { exact: true }).count(), 0);
    await checkWidth();
    await page.screenshot({ path: `verification/v032/list-${width}.png` });
    // Retained list filters must not hide a subsequently added Pit A block.
    await openSelect("Pit", "Pit B");
    await page.getByRole("button", { name: "+", exact: true }).click();
    await page
      .getByRole("button", { name: "Save Production", exact: true })
      .click();
    await visibleText(
      "Enter length as a positive number (for example, 2.5).",
    ).waitFor();
    for (const [label, value] of [
      ["Length (FT)", "10"],
      ["Width (FT)", "5"],
      ["Height (FT)", "4"],
    ]) {
      const input = page.getByRole("textbox", { name: label, exact: true });
      assert.equal(await input.getAttribute("inputmode"), "decimal");
      await input.fill(value);
    }
    const preview = page
      .getByTestId("production-volume-preview")
      .filter({ visible: true })
      .first();
    await preview.getByText("200.00 CFT ≈ 5.66 m³", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "Save Production", exact: true })
      .click();
    await visibleText("Stockyard location is required.").waitFor();
    await page
      .getByRole("textbox", { name: "Stockyard Location", exact: true })
      .fill("Yard A / Row 4");
    // Ensure the save remains reachable in a smaller viewport; this is not a native keyboard test.
    await page.setViewportSize({ width, height: 520 });
    await page
      .getByRole("textbox", { name: "Remarks (optional)", exact: true })
      .focus();
    const save = page.getByRole("button", {
      name: "Save Production",
      exact: true,
    });
    await save.scrollIntoViewIfNeeded();
    const saveBox = await save.boundingBox();
    assert.ok(
      saveBox.height >= 48 &&
        saveBox.y >= 0 &&
        saveBox.y + saveBox.height <= 520,
    );
    await page.setViewportSize({ width, height: 844 });
    await checkWidth();
    await page.screenshot({ path: `verification/v032/form-${width}.png` });
    // Dispatch rapid taps in one event turn; the form guard must create only one record.
    await save.evaluate((element) => {
      element.click();
      element.click();
    });
    await visibleText("Production saved").waitFor();
    await visibleText("BLK-2026-0019").waitFor();
    await page.waitForTimeout(400); // Let the native-style modal fade complete before visual QA.
    await page.screenshot({
      path: `verification/v032/confirmation-${width}.png`,
    });
    await page
      .getByRole("button", { name: "View Production", exact: true })
      .click();
    await totals().getByText("19", { exact: true }).waitFor();
    await visibleText("BLK-2026-0019 added to Production.").waitFor();
    await visibleText("BLK-2026-0019").waitFor();
    assert.notEqual(
      await totals().getByText(/m³$/).textContent(),
      initialVolume,
    );
    await checkWidth();
    await page.screenshot({
      path: `verification/v032/saved-list-${width}.png`,
    });
    for (const tab of ["Home", "Sales", "Dispatch", "More"])
      await page.getByRole("tab", { name: new RegExp(tab) }).click();
    await page.getByRole("tab", { name: /Production/ }).click();
    await totals().getByText("19", { exact: true }).waitFor();
    await visibleText("BLK-2026-0019").waitFor();
    await page.getByRole("button", { name: "+", exact: true }).click();
    await openSelect("Dimension Unit", "M");
    for (const [label, value] of [
      ["Length (M)", "2.5"],
      ["Width (M)", "1.2"],
      ["Height (M)", "0.8"],
    ])
      await page.getByRole("textbox", { name: label, exact: true }).fill(value);
    await page
      .getByTestId("production-volume-preview")
      .getByText("84.76 CFT ≈ 2.40 m³", { exact: true })
      .waitFor();
    await page
      .getByRole("textbox", { name: "Stockyard Location", exact: true })
      .fill("Yard B / Row 2");
    await page
      .getByRole("button", { name: "Save Production", exact: true })
      .click();
    await visibleText("BLK-2026-0020").waitFor();
    await page
      .getByRole("button", { name: "View Production", exact: true })
      .click();
    await totals().getByText("20", { exact: true }).waitFor();
    await visibleText("2.5 × 1.2 × 0.8 M").waitFor();
    const note = visibleText("Demo workspace · Local mock data");
    await note.scrollIntoViewIfNeeded();
    const noteBox = await note.boundingBox();
    const tabBox = await page
      .getByRole("tab", { name: /Production/ })
      .boundingBox();
    assert.ok(
      noteBox.y + noteBox.height <= tabBox.y,
      "Bottom tabs clear final content",
    );
    // A real browser reload starts a fresh app session and restores deterministic fixtures.
    await page.reload();
    await page.waitForLoadState("networkidle");
    await totals().getByText("18", { exact: true }).waitFor();
    assert.equal(
      await page.getByText("BLK-2026-0019", { exact: true }).count(),
      0,
    );
    await page.close();
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "verification/v032/results.json",
    JSON.stringify(
      {
        widths: [360, 390, 412],
        pageErrors: errors,
        checks:
          "FT/M live preview, mandatory validation, rapid double save, generated numbers, count/volume updates, filter reset, tab/session stability, reduced-height scrolling, bottom tab clearance, reload restores seed",
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: Production workflows and responsive checks at 360/390/412px; no runtime errors.",
  );
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
