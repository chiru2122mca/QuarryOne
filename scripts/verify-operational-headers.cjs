const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const output = "verification/stage2";
const screens = [
  ["production", "Production", false, "Add Production", "add-production"],
  ["add-production", "Add Production", true],
  ["more/stock", "Block Inventory", true],
  ["more/block/block-2026-0001", "Block Details", true],
  ["sales", "Sales", false, "Add Sales", "new-sale"],
  ["new-sale", "New Sale", true],
  ["dispatch", "Dispatch", false, "Add Dispatch", "new-dispatch"],
  ["new-dispatch", "New Dispatch", true],
  ["expenses", "Expenses", true, "Add Expenses", "add-expense"],
  ["add-expense", "Add Expense", true],
  ["customers", "Customers", true],
  ["reports", "Reports", true],
  ["more", "More", false],
];
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  const results = [];
  try {
    for (const width of [360, 390, 412]) {
      for (const [route, title, back, add, destination] of screens) {
        const page = await browser.newPage({
          viewport: { width, height: 844 },
        });
        page.on("pageerror", (e) =>
          errors.push({ route, width, message: e.message }),
        );
        await page.goto(`http://127.0.0.1:8082/${route}`);
        await page.waitForLoadState("networkidle");
        const header = page
          .getByTestId("operational-header")
          .filter({ visible: true });
        assert.equal(await header.count(), 1);
        const box = await header.boundingBox();
        assert.equal(box.height, 56);
        assert.equal(
          await header.evaluate(
            (e) => getComputedStyle(e.parentElement).backgroundColor,
          ),
          "rgb(38, 50, 56)",
        );
        const heading = header.getByText(title, { exact: true });
        assert.equal(
          await heading.evaluate((e) => getComputedStyle(e).color),
          "rgb(255, 255, 255)",
        );
        assert.ok(
          await heading.evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
          `${title} title fits ${width}`,
        );
        assert.equal(
          await header
            .getByRole("button", { name: "Go back", exact: true })
            .count(),
          back ? 1 : 0,
        );
        for (const button of await header.getByRole("button").all()) {
          const target = await button.boundingBox();
          assert.ok(target.height >= 48 && target.width >= 48);
        }
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        const content = page
          .getByTestId("operational-content")
          .filter({ visible: true });
        const contentBox = await content.boundingBox();
        assert.ok(contentBox.y >= box.y + box.height);
        const scroll = await content.evaluate((e) => {
          e.scrollTop = e.scrollHeight;
          return e.scrollTop;
        });
        assert.equal((await header.boundingBox()).y, box.y);
        if (
          [
            "add-production",
            "new-sale",
            "new-dispatch",
            "add-expense",
          ].includes(route)
        ) {
          if (route === "new-sale" || route === "new-dispatch") {
            await page
              .getByRole("textbox", { name: "Quantity (Tons)", exact: true })
              .fill("");
          }
          const submit = page
            .getByRole("button", {
              name: /Save Production|Save Sale|Generate Challan|Save Expense/,
            })
            .filter({ visible: true });
          await submit.scrollIntoViewIfNeeded();
          const target = await submit.boundingBox();
          assert.ok(target.height >= 48 && target.y + target.height <= 844);
          await submit.click();
          // Empty forms preserve their existing explicit validation behavior.
          await page
            .getByText(/Enter a valid|Enter .*positive/)
            .filter({ visible: true })
            .first()
            .waitFor();
        }
        await content.evaluate((e) => {
          e.scrollTop = 0;
        });
        await page.screenshot({
          path: `${output}/${route.replaceAll("/", "-")}-${width}.png`,
        });
        if (add) {
          const button = header.getByRole("button", { name: add, exact: true });
          assert.equal(
            await button.evaluate((e) => getComputedStyle(e).backgroundColor),
            "rgb(245, 124, 0)",
          );
          await button.click();
          await page.waitForURL(`**/${destination}`);
          await page
            .getByTestId("operational-header")
            .filter({ visible: true })
            .getByRole("button", { name: "Go back", exact: true })
            .click();
          await page.waitForURL(`**/${route}`);
        }
        results.push({ width, route, title, scroll, passed: true });
        await page.close();
      }
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      `${output}/results.json`,
      JSON.stringify(
        {
          results,
          pageErrors: errors,
          physicalAndroid: "pending manual Expo Go verification",
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: 13 operational screens at 360/390/412px; headers, targets, scroll, validation, add/back actions and no overflow.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
