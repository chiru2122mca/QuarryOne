const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  fs.mkdirSync("verification", { recursive: true });
  const errors = [];
  const routes = [
    "/",
    "/login",
    "/home",
    "/production",
    "/dispatch",
    "/sales",
    "/more",
    "/add-production",
    "/new-sale",
    "/new-dispatch",
    "/expenses",
    "/add-expense",
    "/stock",
    "/customers",
    "/reports",
    "/profile",
    "/settings",
  ];
  for (const width of [360, 390, 412]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    page.on("pageerror", (e) => errors.push(e.message));
    for (const route of routes) {
      await page.goto("http://127.0.0.1:8082" + route);
      await page.waitForLoadState("networkidle");
      assert.equal(
        await page.getByText("Unmatched Route", { exact: true }).count(),
        0,
        `${width} ${route} resolved`,
      );
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      assert.equal(overflow, false, `${width} ${route} horizontal overflow`);
      if (["/home", "/new-sale", "/production"].includes(route))
        await page.screenshot({
          path: `verification/${route.slice(1)}-${width}.png`,
        });
      if (["/home", "/production", "/dispatch", "/sales"].includes(route)) {
        const note = page.getByText("Demo workspace · Local mock data", {
          exact: true,
        });
        await note.scrollIntoViewIfNeeded();
        const content = await note.boundingBox();
        const tab = await page.getByRole("tab", { name: /Home/ }).boundingBox();
        assert.ok(
          content.y + content.height <= tab.y,
          `${width} ${route} bottom content clear of tabs`,
        );
      }
    }
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:8082/");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page
    .getByText(/^Good (Morning|Afternoon|Evening),$/, { exact: true })
    .waitFor();
  await page.getByRole("tab", { name: /Production/ }).click();
  await page.getByRole("button", { name: "+", exact: true }).click();
  await page
    .getByRole("button", { name: "Save Production", exact: true })
    .click();
  await page
    .getByText("Enter a valid quantity (tons).", { exact: true })
    .waitFor();
  await page
    .getByRole("textbox", { name: "Quantity (Tons)", exact: true })
    .fill("42");
  await page
    .getByRole("button", { name: "Save Production", exact: true })
    .click();
  await page.getByText("Saved successfully", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("tab", { name: /Sales/ }).click();
  await page.getByRole("button", { name: "+", exact: true }).click();
  await page.getByText("₹84,000", { exact: true }).last().waitFor();
  await page
    .getByRole("textbox", { name: "Quantity (Tons)", exact: true })
    .fill("30");
  await page.getByText("₹1,26,000", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Save Sale", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("tab", { name: /Dispatch/ }).click();
  await page.getByRole("button", { name: "+", exact: true }).click();
  await page
    .getByRole("button", { name: "Generate Challan", exact: true })
    .click();
  await page.getByText("Challan generated", { exact: true }).waitFor();
  await page.getByText("DC-2026-00124", { exact: true }).last().waitFor();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("tab", { name: /More/ }).click();
  await page.getByRole("button", { name: /Reports A clear/ }).click();
  await page.getByRole("button", { name: /Production Report/ }).click();
  await page.getByText("Your reports start here", { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "verification/results.json",
    JSON.stringify(
      {
        widths: [360, 390, 412],
        routesChecked: routes.length,
        interactions:
          "splash, login, tabs, production validation/save, sale calculation/save, challan, More/reports",
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: 51 route/width checks and key form/navigation flows; no runtime errors.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
