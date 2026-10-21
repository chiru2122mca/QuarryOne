const assert = require("node:assert/strict");
const { expect } = require("@playwright/test");

exports.verifyMaterialsScenarios = async function ({
  page,
  button,
  title,
  saved,
  layout,
  width,
  directory,
}) {
  const yards = () =>
    page.locator('[data-testid^="stockyard-"]').filter({ visible: true });
  const yardInput = (yard) =>
    yard.getByRole("textbox", { name: "Stockyard Name", exact: true });
  const textInput = (name) =>
    page
      .getByRole("textbox", { name, exact: true })
      .filter({ visible: true })
      .first();
  const checkbox = (name) => page.getByRole("checkbox", { name, exact: true });
  const sites = () =>
    page.locator('[data-testid^="quarry-site-"]').filter({ visible: true });
  const chooseReference = async (yard, label, id) => {
    await yard.getByRole("button", { name: new RegExp(`^${label}:`) }).click();
    await page
      .getByTestId(`reference-option-${id || "shared"}`)
      .filter({ visible: true })
      .click();
    await button("Cancel").waitFor({ state: "hidden" });
  };
  const choose = async (label, value) => {
    await page
      .getByRole("button", { name: new RegExp(`^${label}:`) })
      .filter({ visible: true })
      .first()
      .click();
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await page
      .getByRole("button", { name: new RegExp(`^${escaped}(?:\\s*✓)?$`) })
      .filter({ visible: true })
      .first()
      .click();
    await button("Cancel").waitFor({ state: "hidden" });
  };
  const confirm = async (name) => {
    await button(name).click();
    await button("Confirm removal").waitFor({ state: "hidden" });
  };
  const checkLayout = async () => {
    await layout();
    for (const role of ["textbox", "checkbox", "button"])
      for (const box of await page
        .getByRole(role)
        .filter({ visible: true })
        .evaluateAll((elements) =>
          elements.map((element) => {
            const rect = element.getBoundingClientRect();
            return { x: rect.x, width: rect.width, height: rect.height };
          }),
        )) {
        assert(
          box &&
            box.height >= 48 &&
            box.x >= 0 &&
            box.x + box.width <= width + 1,
          `${width} Step 3 ${role} bounds/touch target`,
        );
      }
  };
  for (const name of ["Black Granite", "Grey Granite", "Tan Brown"])
    assert.equal(await checkbox(name).getAttribute("aria-checked"), "false");
  for (const grade of ["A", "B", "C"])
    assert.equal(
      await textInput(`Grade ${grade} description`).inputValue(),
      "",
    );
  await page
    .getByRole("button", {
      name: "Dimension Entry Unit: Feet (FT)",
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("button", {
      name: "Volume Display Unit: Cubic Feet (CFT)",
      exact: true,
    })
    .waitFor();
  await page
    .getByText("10 × 5 × 4 FT = 200 CFT ≈ 5.66 m³", { exact: true })
    .waitFor();
  await button("Continue").click();
  await title("Materials & Measurements").waitFor();
  await page
    .getByText("Select at least one supported material, without duplicates.", {
      exact: true,
    })
    .waitFor();
  await button("Save Draft").click();
  await saved().waitFor();
  await checkbox("Black Granite").click();
  await checkbox("Grey Granite").click();
  await checkbox("Grey Granite").click();
  await checkbox("Tan Brown").click();
  await textInput("Grade A description").fill(" Premium ");
  await textInput("Grade B description").fill(" Standard ");
  await button("Add Stockyard").click();
  const firstYardId = await yards().first().getAttribute("data-testid");
  assert.equal(
    await page.getByRole("button", { name: /^Associated Quarry:/ }).count(),
    0,
    "Single quarry picker is hidden",
  );
  await button("Continue").click();
  assert.equal(
    await yardInput(yards().first()).getAttribute("aria-invalid"),
    "true",
  );
  await yardInput(yards().first()).fill(" Yard A ");
  // Read actual stable site/pit IDs from Step 2, then select by ID instead of display names.
  await button("Back").click();
  await title("Quarry Configuration").waitFor();
  const primarySite = sites().first();
  const primaryId = (await primarySite.getAttribute("data-testid")).slice(
    "quarry-site-".length,
  );
  const primaryPit = primarySite
    .locator('[data-testid^="quarry-pit-"]')
    .first();
  const primaryPitId = (await primaryPit.getAttribute("data-testid")).slice(
    "quarry-pit-".length,
  );
  await button("Continue").click();
  await title("Materials & Measurements").waitFor();
  await chooseReference(
    yards().first(),
    "Associated Pit / Bench",
    primaryPitId,
  );
  await button("Back").click();
  await title("Quarry Configuration").waitFor();
  await primarySite
    .getByRole("button", { name: "Remove pit / bench 1", exact: true })
    .click();
  await confirm("Confirm removal");
  await page
    .getByText(/assigned to a stockyard draft/)
    .filter({ visible: true })
    .waitFor();
  assert.equal(
    await primarySite.locator('[data-testid^="quarry-pit-"]').count(),
    1,
  );
  await button("Continue").click();
  await title("Materials & Measurements").waitFor();
  await button("Add Stockyard").click();
  await yardInput(yards().nth(1)).fill("yard a");
  await button("Continue").click();
  await title("Materials & Measurements").waitFor();
  assert.equal(
    await yardInput(yards().first()).getAttribute("aria-invalid"),
    "true",
  );
  assert.equal(
    await yardInput(yards().nth(1)).getAttribute("aria-invalid"),
    "true",
  );
  await yardInput(yards().nth(1)).fill("Yard B");
  await yards()
    .nth(1)
    .getByRole("button", { name: "Remove Stockyard", exact: true })
    .click();
  await confirm("Cancel");
  assert.equal(await yards().count(), 2);
  await yards()
    .nth(1)
    .getByRole("button", { name: "Remove Stockyard", exact: true })
    .click();
  await confirm("Confirm removal");
  assert.equal(await yards().count(), 1);
  assert.equal(await yards().first().getAttribute("data-testid"), firstYardId);
  await choose("Dimension Entry Unit", "Metres (M)");
  await choose("Volume Display Unit", "Cubic Metres (m³)");
  await button("Save Draft").click();
  await saved().waitFor();
  assert.equal(await textInput("Grade A description").inputValue(), "Premium");
  assert.equal(await yardInput(yards().first()).inputValue(), "Yard A");
  await checkLayout();
  await title("Materials & Measurements").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${directory}/materials-${width}.png`,
    fullPage: true,
  });
  await button("Back").click();
  await title("Quarry Configuration").waitFor();
  await primaryPit
    .getByRole("textbox", { name: "Pit / Bench Name", exact: true })
    .fill("Renamed Bench");
  await primaryPit.getByRole("button", { name: /^Type:/ }).click();
  await page.getByRole("button", { name: /^BENCH/ }).click();
  await page
    .getByRole("radio", { name: "Yes — Multiple Quarries", exact: true })
    .click();
  await button("Add Quarry").click();
  const secondSite = sites().nth(1);
  const secondId = (await secondSite.getAttribute("data-testid")).slice(
    "quarry-site-".length,
  );
  for (const [label, value] of [
    ["Quarry Name", "Second Quarry"],
    ["State", "Telangana"],
    ["District", "District"],
  ])
    await secondSite
      .getByRole("textbox", { name: label, exact: true })
      .fill(value);
  await secondSite
    .getByRole("button", { name: "Add Pit / Bench", exact: true })
    .click();
  const secondPit = secondSite.locator('[data-testid^="quarry-pit-"]').first();
  await secondPit
    .getByRole("textbox", { name: "Pit / Bench Name", exact: true })
    .fill("Pit A");
  const secondPitId = (await secondPit.getAttribute("data-testid")).slice(
    "quarry-pit-".length,
  );
  await button("Continue").click();
  await title("Materials & Measurements").waitFor();
  await yards()
    .first()
    .getByRole("button", {
      name: "Associated Pit / Bench: Renamed Bench · BENCH",
      exact: true,
    })
    .waitFor();
  await button("Continue").click();
  await title("Materials & Measurements").waitFor();
  await page
    .getByText("Add at least one valid stockyard for this quarry.", {
      exact: true,
    })
    .waitFor();
  await button("Add Stockyard").click();
  const secondYardId = await yards().nth(1).getAttribute("data-testid");
  await yardInput(yards().nth(1)).fill("Yard A");
  await chooseReference(yards().nth(1), "Associated Quarry", secondId);
  await chooseReference(yards().nth(1), "Associated Pit / Bench", secondPitId);
  await chooseReference(yards().nth(1), "Associated Quarry", primaryId);
  await yards()
    .nth(1)
    .getByRole("button", {
      name: "Associated Pit / Bench: Entire quarry (shared)",
      exact: true,
    })
    .waitFor();
  await button("Continue").click();
  await title("Materials & Measurements").waitFor();
  assert.equal(
    await yardInput(yards().nth(1)).getAttribute("aria-invalid"),
    "true",
    "Moving back to the first quarry exposes the duplicate",
  );
  await yardInput(yards().nth(1)).fill("Transfer Yard");
  await chooseReference(yards().nth(1), "Associated Quarry", secondId);
  await chooseReference(yards().nth(1), "Associated Pit / Bench", secondPitId);
  assert.equal(await yards().nth(1).getAttribute("data-testid"), secondYardId);
  await button("Back").click();
  await title("Quarry Configuration").waitFor();
  await secondSite
    .getByRole("button", { name: "Remove Quarry", exact: true })
    .click();
  await confirm("Confirm removal");
  await page
    .getByText(/referenced by a stockyard or invitation draft/)
    .filter({ visible: true })
    .waitFor();
  assert.equal(await sites().count(), 2);
  await button("Continue").click();
  await title("Materials & Measurements").waitFor();
  await button("Save Draft").click();
  await saved().waitFor();
  await checkLayout();
  await yards().first().scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${directory}/stockyards-primary-${width}.png`,
    fullPage: true,
  });
  await yards().nth(1).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${directory}/stockyards-second-${width}.png`,
    fullPage: true,
  });
  await page.getByTestId("measurement-preferences").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${directory}/measurements-${width}.png`,
    fullPage: true,
  });
  // Exit to More without reloading, then resume the same Step 3 draft.
  await page.goBack();
  await page.getByRole("button", { name: /Demo Business Setup/ }).click();
  await title("Materials & Measurements").waitFor();
  await saved().waitFor();
  assert.equal(await yards().first().getAttribute("data-testid"), firstYardId);
  assert.equal(await yards().nth(1).getAttribute("data-testid"), secondYardId);
  assert.equal(
    await checkbox("Black Granite").getAttribute("aria-checked"),
    "true",
  );
  assert.equal(
    await checkbox("Tan Brown").getAttribute("aria-checked"),
    "true",
  );
  assert.equal(await textInput("Grade A description").inputValue(), "Premium");
  await page
    .getByRole("button", {
      name: "Dimension Entry Unit: Metres (M)",
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("button", {
      name: "Volume Display Unit: Cubic Metres (m³)",
      exact: true,
    })
    .waitFor();
  // A valid Step 3 now permits the caller's normal Continue to Users & Roles.
  await expect(yardInput(yards().nth(1))).toHaveValue("Transfer Yard");
};
