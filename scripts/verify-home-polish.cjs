const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  fs.mkdirSync("verification/dashboard-corrections", { recursive: true });
  try {
    for (const width of [360, 390, 412]) {
      const page = await browser.newPage({
        viewport: { width, height: 844 },
        timezoneId: "Asia/Kolkata",
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("http://127.0.0.1:8082/production");
      await page.waitForLoadState("networkidle");
      await page.clock.install({ time: new Date("2026-10-10T08:30:00+05:30") });
      await page.getByRole("tab", { name: /Home/ }).click();
      await page.getByText("Good Morning,", { exact: true }).waitFor();
      const header = page.getByTestId("home-header");
      assert.equal(
        await header.evaluate(
          (e) => getComputedStyle(e.parentElement).backgroundColor,
        ),
        "rgb(38, 50, 56)",
      );
      const headerBox = await header.boundingBox();
      assert.equal(headerBox.height, 56);
      const avatar = await page
        .getByRole("button", { name: "Open profile", exact: true })
        .filter({ visible: true })
        .boundingBox();
      assert.ok(avatar.height >= 48);
      const grid = page.getByTestId("home-kpis");
      const cards = grid.locator(":scope > div");
      assert.equal(await cards.count(), 4);
      const boxes = [];
      for (let i = 0; i < 4; i++) boxes.push(await cards.nth(i).boundingBox());
      assert.ok(
        Math.abs(boxes[0].y - boxes[1].y) < 1 &&
          Math.abs(boxes[2].y - boxes[3].y) < 1 &&
          boxes[2].y > boxes[0].y,
      );
      assert.ok(boxes[0].x + boxes[0].width <= boxes[1].x);
      for (const value of ["18", "4", "₹4.25 L", "₹68,400"]) {
        const figure = grid.getByText(value, { exact: true });
        await figure.waitFor();
        assert.ok(
          await figure.evaluate(
            (element) => element.scrollWidth <= element.clientWidth + 1,
          ),
          `${width}: ${value} fits without ellipsis`,
        );
      }
      const production = page
        .getByTestId("home-kpi-production")
        .filter({ visible: true });
      await production.getByText("78.729 m³", { exact: true }).waitFor();
      await production.getByText("Blocks · Live", { exact: true }).waitFor();
      assert.equal(
        await page
          .getByTestId("home-dashboard")
          .getByText(/\bTons?\b/i)
          .count(),
        0,
      );
      await page
        .getByTestId("home-kpi-dispatch")
        .getByText("Records · Demo", { exact: true })
        .waitFor();
      const quick = page.getByTestId("home-quick-actions");
      assert.equal(await quick.getByRole("button").count(), 4);
      for (const button of await quick.getByRole("button").all())
        assert.ok((await button.boundingBox()).height >= 48);
      const label = await quick
        .getByText("Production", { exact: true })
        .boundingBox();
      assert.ok(label.height < 20);
      const recent = page.getByTestId("home-recent-dispatches");
      await recent.getByText("TS09 AB 1234", { exact: true }).waitFor();
      assert.equal(await page.getByRole("tab").count(), 5);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.screenshot({
        path: `verification/dashboard-corrections/home-${width}.png`,
      });
      const note = page
        .getByText("Demo workspace · Local mock data", { exact: true })
        .filter({ visible: true })
        .first();
      await note.scrollIntoViewIfNeeded();
      const tab = await page.getByRole("tab", { name: /Home/ }).boundingBox();
      const noteBox = await note.boundingBox();
      assert.ok(noteBox.y + noteBox.height <= tab.y);
      assert.equal(
        (await header.boundingBox()).y,
        headerBox.y,
        "Header stays fixed while content scrolls",
      );
      await page.clock.setSystemTime(new Date("2026-10-10T12:00:00+05:30"));
      await page.clock.fastForward(60000);
      await page.getByText("Good Afternoon,", { exact: true }).waitFor();
      await page.clock.setSystemTime(new Date("2026-10-10T17:00:00+05:30"));
      await page.clock.fastForward(60000);
      await page
        .getByText("Good Evening,", { exact: true })
        .filter({ visible: true })
        .waitFor();
      await quick
        .getByRole("button", { name: "Production", exact: true })
        .click();
      await page
        .getByRole("textbox", { name: "Length (FT)", exact: true })
        .waitFor();
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
        .getByRole("button", { name: "Save Production", exact: true })
        .click();
      await page
        .getByText("Production saved", { exact: true })
        .filter({ visible: true })
        .waitFor();
      await page.waitForTimeout(400);
      await page
        .getByRole("button", { name: "View Production", exact: true })
        .click();
      await page.getByRole("tab", { name: /Home/ }).click();
      await production.getByText("19", { exact: true }).waitFor();
      await production.getByText("84.392 m³", { exact: true }).waitFor();
      await page
        .getByRole("button", { name: "Open Block Inventory", exact: true })
        .filter({ visible: true })
        .getByText("16 available", { exact: true })
        .waitFor();
      await page
        .getByText("Good Evening,", { exact: true })
        .filter({ visible: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `verification/dashboard-corrections/home-updated-${width}.png`,
      });
      await page
        .getByRole("button", { name: "View all dispatches", exact: true })
        .filter({ visible: true })
        .click();
      await page
        .getByText("DC-2026-00124", { exact: true })
        .filter({ visible: true })
        .waitFor();
      await page.getByRole("tab", { name: /Home/ }).click();
      await page
        .getByRole("button", { name: "Open profile", exact: true })
        .filter({ visible: true })
        .click();
      await page.getByText("Profile", { exact: true }).waitFor();
      await page.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      "verification/dashboard-corrections/results.json",
      JSON.stringify(
        {
          widths: [360, 390, 412],
          pageErrors: errors,
          checks:
            "Deep Slate fixed header, 2x2 KPIs, live block count/volume 18→19, available stock 15→16, demo labels, no Home tonnage, no clipping/overflow, compact actions, dispatch cards, fixed navigation, greeting rules, existing routes",
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: Home Stage 1 responsive layouts and existing actions at 360/390/412px.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
