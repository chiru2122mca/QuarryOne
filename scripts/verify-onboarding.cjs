const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

// Serve the existing static web export on an ephemeral loopback port.
async function localPreview() {
  const root = path.resolve("dist");
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    let file = path.resolve(
      root,
      "." + (pathname === "/" ? "/index.html" : pathname),
    );
    if (!file.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, "index.html");
    if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file += ".html";
    if (!fs.existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    const types = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".png": "image/png",
      ".ttf": "font/ttf",
      ".ico": "image/x-icon",
    };
    response.setHeader(
      "Content-Type",
      types[path.extname(file)] || "application/octet-stream",
    );
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

// Run after Expo web export; optionally target an existing QUARRYONE_PREVIEW_URL.
(async () => {
  const preview = process.env.QUARRYONE_PREVIEW_URL
    ? null
    : await localPreview();
  const base = process.env.QUARRYONE_PREVIEW_URL || preview.url;
  const directory = "verification/v043a3";
  fs.mkdirSync(directory, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  const requests = [];
  const results = [];
  try {
    for (const width of [360, 390, 412]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (
          request.method() !== "GET" ||
          /supabase|\/auth\/v1|\/rest\/v1/.test(request.url())
        ) {
          requests.push({ method: request.method(), url: request.url() });
        }
      });
      const button = (name) =>
        page
          .getByRole("button", { name, exact: true })
          .filter({ visible: true })
          .first();
      const title = (name) =>
        page
          .getByRole("heading", { name, exact: true })
          .filter({ visible: true })
          .first();
      const saved = () =>
        page
          .getByText("Demo draft saved for this session.", { exact: true })
          .filter({ visible: true });
      const input = (name) =>
        page
          .getByRole("textbox", { name, exact: true })
          .filter({ visible: true })
          .first();
      const names = [
        "Business Name",
        "Legal Business Name",
        "Business Contact Number",
        "State",
        "District",
        "Business Address",
        "GSTIN",
        "Owner Display Name",
      ];
      const values = [
        "Demo Quarry",
        "Demo Legal",
        "+919876543210",
        "తెలంగాణ",
        "కరీంనగర్",
        "Yard 1\nRoad 2",
        "36ABCDE1234F1Z5",
        "రమేష్ కుమార్",
      ];
      const assertValues = async (expected) => {
        for (let i = 0; i < names.length; i++)
          assert.equal(await input(names[i]).inputValue(), expected[i]);
      };
      const layout = async () => {
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `${width}: horizontal overflow`,
        );
        const header = await page
          .getByTestId("onboarding-header")
          .filter({ visible: true })
          .boundingBox();
        assert(header && header.x >= 0 && header.x + header.width <= width + 1);
        assert.equal(header.height, 56);
        for (const name of [
          "Continue",
          "Save Draft",
          "Back",
          "Reset demo draft",
          "Go back",
        ]) {
          const bounds = await button(name).boundingBox();
          assert(
            bounds && bounds.height >= 48,
            `${width}: ${name} touch target`,
          );
        }
      };
      await page.goto(`${base}/more`);
      assert.equal(await page.getByRole("tab").count(), 5);
      await page.getByRole("button", { name: /Demo Business Setup/ }).click();
      await title("Business Registration").waitFor();
      await assertValues(names.map(() => ""));
      for (const name of names) {
        const bounds = await input(name).boundingBox();
        assert(
          bounds &&
            bounds.height >= 48 &&
            bounds.x >= 0 &&
            bounds.x + bounds.width <= width + 1,
        );
      }
      assert.equal(
        await input("Business Contact Number").getAttribute("type"),
        "tel",
      );
      for (const name of [
        "Business Name",
        "Business Contact Number",
        "State",
        "Owner Display Name",
      ]) {
        assert.equal(await input(name).getAttribute("aria-required"), "true");
      }
      await layout();
      await button("Continue").click();
      await title("Business Registration").waitFor();
      assert.equal(
        await page
          .getByRole("textbox")
          .filter({ visible: true })
          .evaluateAll(
            (inputs) =>
              inputs.filter(
                (input) => input.getAttribute("aria-invalid") === "true",
              ).length,
          ),
        4,
      );
      await button("Save Draft").click();
      assert.equal(
        await saved().count(),
        0,
        "Invalid Save Draft must not report success",
      );
      await button("Reset demo draft").click();
      assert.equal(
        await page.getByRole("alert").filter({ visible: true }).count(),
        0,
        "Reset also clears validation errors",
      );
      await input("Business Name").fill("  Incomplete demo  ");
      await input("District").fill("  Draft district  ");
      await button("Back").click();
      await page.getByRole("button", { name: /Demo Business Setup/ }).click();
      await title("Business Registration").waitFor();
      assert.equal(
        await input("Business Name").inputValue(),
        "  Incomplete demo  ",
      );
      assert.equal(await input("District").inputValue(), "  Draft district  ");
      for (let i = 0; i < names.length; i++)
        await input(names[i]).fill(`  ${values[i]}  `);
      await input("Business Contact Number").fill("123");
      await input("GSTIN").fill("wrong");
      await button("Continue").click();
      await title("Business Registration").waitFor();
      assert.equal(
        await input("Business Contact Number").getAttribute("aria-invalid"),
        "true",
      );
      assert.equal(await input("GSTIN").getAttribute("aria-invalid"), "true");
      assert.equal(await saved().count(), 0);
      await input("Business Contact Number").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `${directory}/validation-${width}.png`,
        fullPage: true,
      });
      await input("Business Contact Number").fill(" +91 98765-43210 ");
      await input("GSTIN").fill(" 36abcde1234f1z5 ");
      await button("Save Draft").click();
      await saved().waitFor();
      await assertValues(values);
      await title("Business Registration").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `${directory}/business-${width}.png`,
        fullPage: true,
      });
      await input("Owner Display Name").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `${directory}/owner-actions-${width}.png`,
        fullPage: true,
      });
      const stages = [
        "Quarry Configuration",
        "Materials & Measurements",
        "Users & Roles",
        "Review & Activate",
      ];
      for (let i = 0; i < stages.length; i++) {
        await button("Continue").click();
        await title(stages[i]).waitFor();
        if (i === 0) {
          const siteCards = () =>
            page
              .locator('[data-testid^="quarry-site-"]')
              .filter({ visible: true });
          const primary = () => siteCards().first();
          const siteInput = (site, label) =>
            site.getByRole("textbox", { name: label, exact: true });
          const siteButton = (site, name) =>
            site.getByRole("button", { name, exact: true });
          const pits = (site) => site.locator('[data-testid^="quarry-pit-"]');
          const no = () =>
            page.getByRole("radio", {
              name: "No — Single Quarry",
              exact: true,
            });
          const yes = () =>
            page.getByRole("radio", {
              name: "Yes — Multiple Quarries",
              exact: true,
            });
          const confirm = async (name) => {
            for (const label of ["Cancel", "Confirm removal"]) {
              const box = await button(label).boundingBox();
              assert(
                box &&
                  box.height >= 48 &&
                  box.x >= 0 &&
                  box.x + box.width <= width + 1,
                "Removal dialog touch targets and bounds",
              );
            }
            await button(name).click();
            await button("Confirm removal").waitFor({ state: "hidden" });
          };
          const fillSite = async (site, code, name) => {
            for (const [label, value] of [
              ["Quarry Name", name],
              ["Quarry Code", code],
              ["State", " Telangana "],
              ["District", " Karimnagar "],
              ["Address", " Yard 1 "],
            ])
              await siteInput(site, label).fill(value);
          };
          const checkQuarryLayout = async () => {
            await layout();
            for (const role of ["textbox", "radio", "button"]) {
              const controls = page.getByRole(role).filter({ visible: true });
              for (const control of await controls.all()) {
                const box = await control.boundingBox();
                assert(
                  box &&
                    box.height >= 48 &&
                    box.x >= 0 &&
                    box.x + box.width <= width + 1,
                  `Quarry ${role} touch target/bounds at ${width}`,
                );
              }
            }
          };
          assert.equal(await no().getAttribute("aria-checked"), "true");
          assert.equal(await siteCards().count(), 1);
          assert.equal(await button("Add Quarry").count(), 0);
          assert.equal(await button("Remove Quarry").count(), 0);
          await checkQuarryLayout();
          await button("Continue").click();
          await title("Quarry Configuration").waitFor();
          for (const label of [
            "Quarry Name",
            "Quarry Code",
            "State",
            "District",
          ])
            assert.equal(
              await siteInput(primary(), label).getAttribute("aria-invalid"),
              "true",
            );
          await page
            .getByText("Add at least one pit or bench for this quarry.", {
              exact: true,
            })
            .waitFor();
          await button("Save Draft").click();
          await saved().waitFor();
          await siteInput(primary(), "Quarry Name").fill(" Partial quarry ");
          await button("Back").click();
          await title("Business Registration").waitFor();
          await assertValues(values);
          await button("Continue").click();
          await title("Quarry Configuration").waitFor();
          assert.equal(
            await siteInput(primary(), "Quarry Name").inputValue(),
            " Partial quarry ",
          );
          await fillSite(primary(), " dsq01 ", " Demo Quarry ");
          await siteButton(primary(), "Add Pit / Bench").click();
          const firstPitId = await pits(primary())
            .first()
            .getAttribute("data-testid");
          await siteInput(pits(primary()).first(), "Pit / Bench Name").fill(
            " Pit A ",
          );
          await siteButton(primary(), "Add Pit / Bench").click();
          await siteInput(pits(primary()).nth(1), "Pit / Bench Name").fill(
            " pit a ",
          );
          await button("Continue").click();
          assert.equal(
            await siteInput(
              pits(primary()).nth(1),
              "Pit / Bench Name",
            ).getAttribute("aria-invalid"),
            "true",
          );
          await siteInput(pits(primary()).nth(1), "Pit / Bench Name").fill(
            " Bench 1 ",
          );
          await pits(primary())
            .nth(1)
            .getByRole("button", { name: /^Type:/ })
            .click();
          await page.getByRole("button", { name: /^BENCH/ }).click();
          await siteButton(primary(), "Remove pit / bench 2").click();
          await confirm("Cancel");
          assert.equal(await pits(primary()).count(), 2);
          await siteButton(primary(), "Remove pit / bench 2").click();
          await confirm("Confirm removal");
          assert.equal(await pits(primary()).count(), 1);
          assert.equal(
            await pits(primary()).first().getAttribute("data-testid"),
            firstPitId,
          );
          await yes().click();
          await button("Add Quarry").click();
          const second = () => siteCards().nth(1);
          await button("Continue").click();
          await title("Quarry Configuration").waitFor();
          assert.equal(
            await siteInput(second(), "Quarry Name").getAttribute(
              "aria-invalid",
            ),
            "true",
          );
          await fillSite(second(), " dsq01 ", " Second Quarry ");
          await siteButton(second(), "Add Pit / Bench").click();
          await siteInput(pits(second()).first(), "Pit / Bench Name").fill(
            "Pit A",
          );
          await button("Continue").click();
          assert.equal(
            await siteInput(second(), "Quarry Code").getAttribute(
              "aria-invalid",
            ),
            "true",
          );
          await siteInput(second(), "Quarry Code").fill(" q2 ");
          await checkQuarryLayout();
          await button("Save Draft").click();
          await saved().waitFor();
          await button("Back").click();
          await title("Business Registration").waitFor();
          await assertValues(values);
          await button("Continue").click();
          await title("Quarry Configuration").waitFor();
          assert.equal(await siteCards().count(), 2);
          assert.equal(
            await siteInput(second(), "Quarry Name").inputValue(),
            "Second Quarry",
          );
          await no().click();
          assert.equal(await yes().getAttribute("aria-checked"), "true");
          assert.equal(await siteCards().count(), 2);
          await page
            .getByText(/No entries were deleted/)
            .scrollIntoViewIfNeeded();
          await page.screenshot({
            path: `${directory}/multi-mode-blocked-${width}.png`,
            fullPage: true,
          });
          await second()
            .getByRole("heading", { name: "Additional Quarry 1" })
            .scrollIntoViewIfNeeded();
          await page.screenshot({
            path: `${directory}/second-quarry-${width}.png`,
            fullPage: true,
          });
          await siteButton(second(), "Remove Quarry").click();
          await confirm("Cancel");
          assert.equal(await siteCards().count(), 2);
          await siteButton(second(), "Remove Quarry").click();
          await confirm("Confirm removal");
          assert.equal(await siteCards().count(), 1);
          await no().click();
          assert.equal(await no().getAttribute("aria-checked"), "true");
          assert.equal(await button("Add Quarry").count(), 0);
          assert.equal(
            await siteInput(primary(), "Quarry Name").inputValue(),
            "Demo Quarry",
          );
          await siteButton(primary(), "Remove pit / bench 1").click();
          await confirm("Confirm removal");
          await button("Continue").click();
          await title("Quarry Configuration").waitFor();
          await page
            .getByText("Add at least one pit or bench for this quarry.", {
              exact: true,
            })
            .waitFor();
          await siteButton(primary(), "Add Pit / Bench").click();
          assert.notEqual(
            await pits(primary()).first().getAttribute("data-testid"),
            firstPitId,
          );
          await siteInput(pits(primary()).first(), "Pit / Bench Name").fill(
            " Pit A ",
          );
          await button("Save Draft").click();
          await saved().waitFor();
          await title("Quarry Configuration").scrollIntoViewIfNeeded();
          await page.screenshot({
            path: `${directory}/quarry-${width}.png`,
            fullPage: true,
          });
          await pits(primary()).first().scrollIntoViewIfNeeded();
          await page.screenshot({
            path: `${directory}/pits-actions-${width}.png`,
            fullPage: true,
          });
        }
        await saved().waitFor();
        const progress = page
          .getByRole("progressbar")
          .filter({ visible: true });
        assert.equal(
          await progress.getAttribute("aria-valuenow"),
          String(i + 2),
        );
        await layout();
        if (i === 1)
          await page
            .getByText("Single quarry · FT / CFT", { exact: true })
            .waitFor();
      }
      assert.equal(await button("Continue").isDisabled(), true);
      await page.screenshot({
        path: `${directory}/review-${width}.png`,
        fullPage: true,
      });
      for (const stage of [
        "Users & Roles",
        "Materials & Measurements",
        "Quarry Configuration",
        "Business Registration",
      ]) {
        await button("Back").click();
        await title(stage).waitFor();
      }
      await assertValues(values);
      await button("Continue").click();
      await title("Quarry Configuration").waitFor();
      // Browser history changes the root route without reloading the React provider.
      await page.goBack();
      await page.getByRole("button", { name: /Demo Business Setup/ }).waitFor();
      await page.getByRole("button", { name: /Demo Business Setup/ }).click();
      await title("Quarry Configuration").waitFor();
      await saved().waitFor();
      await button("Reset demo draft").click();
      await title("Business Registration").waitFor();
      assert.equal(await saved().count(), 0);
      await assertValues(names.map(() => ""));
      await button("Go back").click();
      await page.getByRole("button", { name: /Demo Business Setup/ }).waitFor();
      assert.equal(await page.getByRole("tab").count(), 5);
      // Query parameters are not navigation destinations.
      await page.goto(`${base}/onboarding?step=/sales`);
      await title("Business Registration").waitFor();
      await input("Business Name").fill("Demo");
      await input("Business Contact Number").fill("9876543210");
      await input("State").fill("Telangana");
      await input("Owner Display Name").fill("Demo Owner");
      await button("Save Draft").click();
      await saved().waitFor();
      await page.reload();
      await title("Business Registration").waitFor();
      await assertValues(names.map(() => ""));
      assert.equal(
        await saved().count(),
        0,
        "Reload starts a fresh session draft",
      );
      // Saving from a future placeholder cannot imply that invalid Business Registration succeeded.
      await page.goto(`${base}/onboarding/quarry`);
      await title("Quarry Configuration").waitFor();
      await button("Save Draft").click();
      await saved().waitFor();
      await button("Back").click();
      await title("Business Registration").waitFor();
      assert.equal(
        await saved().count(),
        0,
        "Invalid business hides a confirmation from another stage",
      );
      results.push({
        width,
        result: "PASS",
        forward_back: true,
        session_save_resume_reset: true,
        route_allowlist: true,
        no_horizontal_overflow: true,
        minimum_touch_targets: 48,
        registration_validation: true,
        invalid_continue_and_save_blocked: true,
        partial_back_retention: true,
        normalized_field_restore: true,
        telugu_input_preserved: true,
        quarry_validation_and_step3_gate: true,
        multi_mode_resolution_without_data_loss: true,
        pit_bench_edit_remove_confirmation: true,
        stable_site_and_pit_ids: true,
      });
      await page.close();
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(
      requests,
      [],
      "No mutation/Auth/database network requests from wizard",
    );
    fs.writeFileSync(
      `${directory}/responsive-results.json`,
      JSON.stringify(
        {
          results,
          page_errors: errors,
          mutation_or_backend_requests: requests,
          physical_android: "PENDING MANUAL CHECK",
        },
        null,
        2,
      ) + "\n",
    );
    console.log(JSON.stringify(results));
  } finally {
    await browser.close();
    if (preview) await new Promise((resolve) => preview.server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
