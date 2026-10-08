const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  fs.mkdirSync("verification/v021", { recursive: true });
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
    await page.clock.install({ time: new Date("2026-10-08T10:30:00+05:30") });
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
      if (["/", "/login", "/home", "/more", "/settings"].includes(route)) {
        const logo = page
          .getByRole("img", { name: "QuarryOne", exact: true })
          .first();
        const box = await logo.boundingBox();
        assert.ok(
          Math.abs(
            box.width / box.height -
              (["/home", "/more", "/settings"].includes(route)
                ? 224 / 48
                : 1124 / 1070),
          ) < 0.02,
          `${width} ${route} branding aspect ratio`,
        );
      }
      if (route === "/") {
        const transparent = await page.evaluate(() => {
          const img = document.querySelector(
            'img[src*="quarryone-full-transparent"]',
          );
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          return [
            ctx.getImageData(0, 0, 1, 1).data[3],
            ctx.getImageData(canvas.width - 1, 0, 1, 1).data[3],
          ];
        });
        assert.deepEqual(
          transparent,
          [0, 0],
          "Full logo background has real alpha transparency",
        );

        const footer = await page
          .getByText("Version 0.2 · Static prototype", { exact: true })
          .boundingBox();
        assert.ok(
          footer.y + footer.height <= 844,
          `${width} welcome footer fits`,
        );
      }
      if (route === "/home") {
        const header = await page.getByTestId("home-header").boundingBox();
        const logo = await page
          .getByRole("img", { name: "QuarryOne", exact: true })
          .first()
          .boundingBox();
        const avatar = await page
          .getByText("RK", { exact: true })
          .locator("..")
          .boundingBox();
        const greeting = await page
          .getByText("Good Morning,", { exact: true })
          .boundingBox();
        assert.ok(
          header.height >= 64 && header.height <= 76,
          "Compact header height",
        );
        assert.ok(logo.x + logo.width + 8 <= avatar.x, "Brand clears avatar");
        assert.ok(
          Math.abs(avatar.x + avatar.width - header.x - header.width) < 1,
          "Avatar aligned right",
        );
        assert.ok(
          greeting.y >= header.y + header.height &&
            greeting.y - header.y - header.height <= 12,
          "Greeting close to header",
        );

        const label = page
          .getByRole("button", { name: "Production", exact: true })
          .getByText("Production", { exact: true });
        const labelBox = await label.boundingBox();
        assert.ok(
          labelBox.height < 20,
          `${width} Production quick action single line`,
        );
        const date = page.getByLabel("Current device date");
        const expected = await page.evaluate(() =>
          new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        );
        assert.equal(await date.textContent(), expected);
        await page.clock.fastForward(24 * 60 * 60 * 1000);
        const next = await page.evaluate(() =>
          new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        );
        assert.equal(
          await date.textContent(),
          next,
          "Device date refreshes across midnight",
        );
      }
      if (
        [
          "/add-production",
          "/new-sale",
          "/new-dispatch",
          "/add-expense",
        ].includes(route)
      ) {
        const numeric = page.getByRole("textbox", {
          name: route === "/add-expense" ? "Amount (₹)" : "Quantity (Tons)",
          exact: true,
        });
        assert.equal(await numeric.getAttribute("inputmode"), "decimal");
        for (const button of await page.getByRole("button").all()) {
          if (await button.isVisible()) {
            const box = await button.boundingBox();
            assert.ok(
              box.height >= 48,
              `${width} ${route} button height ${box.height}`,
            );
          }
        }
        await page.setViewportSize({ width, height: 520 });
        await numeric.focus();
        const save = page.getByRole("button", {
          name: /^(Save Production|Save Sale|Generate Challan|Save Expense)$/,
        });
        await save.scrollIntoViewIfNeeded();
        const box = await save.boundingBox();
        assert.ok(
          box.y >= 0 && box.y + box.height <= 520,
          "Save reachable in reduced viewport (not a native keyboard test)",
        );
        await page.setViewportSize({ width, height: 844 });
      }
      if (
        [
          "/",
          "/login",
          "/home",
          "/more",
          "/add-production",
          "/new-dispatch",
          "/add-expense",
        ].includes(route)
      ) {
        await page.screenshot({
          path: `verification/v021/${route === "/" ? "welcome" : route.slice(1)}-${width}.png`,
        });
      }
      if (["/home", "/new-sale", "/production"].includes(route))
        await page.screenshot({
          path: `verification/v021/${route.slice(1)}-${width}.png`,
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
  await page.getByText("Good Morning,", { exact: true }).waitFor();
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
  const vehicle = page.getByRole("textbox", {
    name: "Vehicle Number",
    exact: true,
  });
  await vehicle.fill("ts09 ab 1234");
  assert.equal(await vehicle.inputValue(), "TS09 AB 1234");
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
    "verification/v021/results.json",
    JSON.stringify(
      {
        widths: [360, 390, 412],
        routesChecked: routes.length,
        interactions:
          "splash, login, tabs, production validation/save, sale calculation/save, challan, More/reports",
        pageErrors: errors,
        refinementChecks:
          "logo ratio, welcome fit, Production label, live device date/rollover, numeric input modes, 48px button targets, reduced-height scrolling, uppercase vehicle",
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
