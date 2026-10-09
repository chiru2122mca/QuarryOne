const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  fs.mkdirSync("verification/v033", { recursive: true });
  try {
    for (const width of [360, 390, 412]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      page.on("pageerror", (error) =>
        errors.push({ url: page.url(), message: error.message }),
      );
      const visibleText = (text) =>
        page.getByText(text, { exact: true }).filter({ visible: true }).first();
      const metric = (label) =>
        page
          .getByTestId("inventory-kpis")
          .filter({ visible: true })
          .first()
          .getByText(label, { exact: true })
          .locator("../..");
      const result = () =>
        page
          .getByTestId("inventory-result-count")
          .filter({ visible: true })
          .first();
      const select = async (label, option) => {
        await page
          .getByRole("button", { name: new RegExp(`^${label}:`) })
          .click();
        await page
          .getByRole("button", { name: new RegExp(`^${option}(?:\\s*✓)?$`) })
          .click();
      };
      const checkWidth = async () =>
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `${width} horizontal overflow`,
        );
      await page.goto("http://127.0.0.1:8082/more");
      await page.getByRole("button", { name: /Block Inventory/ }).click();
      await result()
        .getByText("Showing 18 of 18 blocks", { exact: true })
        .waitFor();
      assert.equal(await page.getByRole("tab").count(), 5);
      await metric("Total Blocks").getByText("18", { exact: true }).waitFor();
      await metric("Available Blocks")
        .getByText("15", { exact: true })
        .waitFor();
      await metric("Rejected Blocks").getByText("3", { exact: true }).waitFor();
      await metric("Reserved Blocks").getByText("0", { exact: true }).waitFor();
      await metric("Dispatched Blocks")
        .getByText("0", { exact: true })
        .waitFor();
      const initialAvailable = await metric(
        "Available Volume (CFT)",
      ).textContent();
      await checkWidth();
      await page.screenshot({
        path: `verification/v033/inventory-${width}.png`,
      });
      await page
        .getByRole("textbox", { name: "Search Block Number", exact: true })
        .fill("blk-2026-0001");
      await result()
        .getByText("Showing 1 of 18 blocks", { exact: true })
        .waitFor();
      await metric("Total Blocks").getByText("18", { exact: true }).waitFor();
      await page.getByRole("button", { name: /Show Filters/ }).click();
      await select("Material", "Black Granite");
      await select("Grade", "A");
      await select("Pit", "Pit A");
      await select("Status", "AVAILABLE");
      await result()
        .getByText("Showing 1 of 18 blocks", { exact: true })
        .waitFor();
      await select("Status", "REJECTED");
      await result()
        .getByText("Showing 0 of 18 blocks", { exact: true })
        .waitFor();
      await visibleText("No records").waitFor();
      await checkWidth();
      await page
        .getByRole("button", { name: "Clear Filters", exact: true })
        .click();
      await result()
        .getByText("Showing 18 of 18 blocks", { exact: true })
        .waitFor();
      await page.getByRole("button", { name: /Hide Filters/ }).click();
      await select("Volume display", "m³");
      await visibleText(
        "Historical volume: 78.729 m³ (all statuses)",
      ).waitFor();
      await page
        .getByRole("button", { name: "View block BLK-2026-0018", exact: true })
        .click();
      await visibleText("Block Details").waitFor();
      await visibleText("BLK-2026-0018").waitFor();
      assert.equal(await page.getByRole("tab").count(), 5);
      assert.equal(
        await page
          .getByRole("button", { name: /Reserve|Change Status|Dispatch Block/ })
          .count(),
        0,
      );
      await page
        .getByTestId("block-details-block-2026-0018")
        .getByText("5.174 m³", { exact: true })
        .waitFor();
      await page.waitForTimeout(400); // Finish the reused SelectField/stack transition before visual QA.
      await checkWidth();
      await page.screenshot({ path: `verification/v033/details-${width}.png` });
      await page.getByRole("button", { name: "Go back", exact: true }).click();
      await page.getByRole("tab", { name: /Production/ }).click();
      await page.getByRole("button", { name: "+", exact: true }).click();
      for (const [label, value] of [
        ["Length (FT)", "10"],
        ["Width (FT)", "5"],
        ["Height (FT)", "4"],
      ])
        await page
          .getByRole("textbox", { name: label, exact: true })
          .fill(value);
      await page
        .getByRole("textbox", { name: "Stockyard Location", exact: true })
        .fill("Yard 1");
      await page
        .getByRole("textbox", { name: "Remarks (optional)", exact: true })
        .fill("Inventory check");
      await page
        .getByRole("button", { name: "Save Production", exact: true })
        .click();
      await visibleText("Production saved").waitFor();
      await page.waitForTimeout(400);
      await page
        .getByRole("button", { name: "View Production", exact: true })
        .click();
      await visibleText("BLK-2026-0019").waitFor();
      await page.getByRole("tab", { name: /More/ }).click();
      // More retains its inventory sub-stack when switching tabs.
      if (
        await page
          .getByRole("button", { name: /Block Inventory Granite blocks/ })
          .count()
      )
        await page
          .getByRole("button", { name: /Block Inventory Granite blocks/ })
          .click();
      await page
        .getByRole("button", { name: "Clear Filters", exact: true })
        .click();
      await result()
        .getByText("Showing 19 of 19 blocks", { exact: true })
        .waitFor();
      await metric("Available Blocks")
        .getByText("16", { exact: true })
        .waitFor();
      await select("Volume display", "CFT");
      assert.notEqual(
        await metric("Available Volume (CFT)").textContent(),
        initialAvailable,
      );
      await page
        .getByRole("button", { name: "View block BLK-2026-0019", exact: true })
        .click();
      const details = page.getByTestId("block-details-block-2026-0019");
      await details.getByText("200.00 CFT", { exact: true }).waitFor();
      await details.getByText("5.663 m³", { exact: true }).waitFor();
      await details.getByText("Yard 1", { exact: true }).waitFor();
      await details.getByText("Inventory check", { exact: true }).waitFor();
      await visibleText("AVAILABLE").waitFor();
      await checkWidth();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: `verification/v033/new-block-${width}.png`,
      });
      await details
        .getByText("5.663 m³", { exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `verification/v033/detail-volume-${width}.png`,
      });
      await page.getByRole("button", { name: "Go back", exact: true }).click();
      const note = visibleText("Demo workspace · Local mock data");
      await note.scrollIntoViewIfNeeded();
      const noteBox = await note.boundingBox(),
        tabBox = await page.getByRole("tab", { name: /More/ }).boundingBox();
      assert.ok(noteBox.y + noteBox.height <= tabBox.y);
      for (const tab of ["Home", "Sales", "Dispatch", "Production"])
        await page.getByRole("tab", { name: new RegExp(tab) }).click();
      await page.getByRole("tab", { name: /More/ }).click();
      await result()
        .getByText("Showing 19 of 19 blocks", { exact: true })
        .waitFor();
      await page.goto("http://127.0.0.1:8082/more/block/block-2026-0001");
      await visibleText("160.00 CFT").waitFor();
      await page.goto("http://127.0.0.1:8082/more/block/missing-id");
      await visibleText("Block not found").waitFor();
      await checkWidth();
      await page.screenshot({ path: `verification/v033/missing-${width}.png` });
      await page.goto("http://127.0.0.1:8082/more/block");
      await visibleText("Block not found").waitFor();
      await page
        .getByRole("button", { name: "Open Block Inventory", exact: true })
        .click();
      await result()
        .getByText("Showing 18 of 18 blocks", { exact: true })
        .waitFor();
      await page.goto("http://127.0.0.1:8082/stock");
      await result()
        .getByText("Showing 18 of 18 blocks", { exact: true })
        .waitFor();
      await page.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      "verification/v033/results.json",
      JSON.stringify(
        {
          widths: [360, 390, 412],
          pageErrors: errors,
          checks:
            "KPI totals, combined search/filters, clear/empty results, CFT/m³, read-only details, missing/invalid IDs, Production→Inventory shared state, tab retention, bottom clearance, stock alias",
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: Inventory, Details and Production integration at 360/390/412px.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
