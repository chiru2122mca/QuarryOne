const assert = require("node:assert/strict");
const { expect } = require("@playwright/test");

exports.verifyReviewScenarios = async ({
  page,
  button,
  title,
  saved,
  layout,
  width,
  directory,
}) => {
  const section = (step) =>
    page.getByTestId(`review-${step}`).filter({ visible: true });
  const input = (name) =>
    page
      .getByRole("textbox", { name, exact: true })
      .filter({ visible: true })
      .first();
  const navigate = async (...stages) => {
    for (const stage of stages) {
      await button("Continue").click();
      await title(stage).waitFor();
    }
  };
  const toReview = () =>
    navigate(
      "Quarry Configuration",
      "Materials & Measurements",
      "Users & Roles",
      "Review & Activate",
    );
  const fromQuarry = () =>
    navigate("Materials & Measurements", "Users & Roles", "Review & Activate");
  const fromMaterials = () => navigate("Users & Roles", "Review & Activate");
  const edit = async (name) => {
    await button(`Edit ${name}`).click();
    await title(name).waitFor();
  };
  const stableIds = async () => {
    const result = {};
    for (const prefix of ["review-site-", "review-yard-", "review-invitation-"])
      result[prefix] = await page
        .locator(`[data-testid^="${prefix}"]`)
        .filter({ visible: true })
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-testid")),
        );
    return result;
  };
  await expect(
    page.getByTestId("review-readiness").filter({ visible: true }),
  ).toContainText("Ready for demo preview");
  await expect(section("business")).toContainText("Demo Quarry");
  await expect(section("materials")).toContainText("Black Granite, Tan Brown");
  await expect(section("materials")).toContainText("Metres (M)");
  await expect(section("materials")).toContainText("Cubic Metres (m³)");
  await expect(section("users")).toContainText("Business Owner");
  await expect(section("users")).toContainText("All Quarry Sites");
  assert.equal(await button("Continue").count(), 0);
  const ids = await stableIds();
  assert.equal(ids["review-site-"].length, 2);
  assert.equal(ids["review-yard-"].length, 2);
  assert.equal(ids["review-invitation-"].length, 1);
  const initialQuarryText = await section("quarry").innerText();
  await edit("Business Registration");
  const originalBusiness = {
    name: await input("Business Name").inputValue(),
    address: await input("Business Address").inputValue(),
  };
  await input("Business Name").fill("Review Business Updated");
  await input("Business Address").fill("Updated business office");
  await toReview();
  await expect(section("business")).toContainText("Review Business Updated");
  await expect(section("business")).toContainText("Updated business office");
  assert.equal(
    await section("quarry").innerText(),
    initialQuarryText,
    "Step 1 edits must not overwrite quarry details",
  );
  await edit("Quarry Configuration");
  const primary = page
    .locator('[data-testid^="quarry-site-"]')
    .filter({ visible: true })
    .first();
  const siteField = (name) =>
    primary.getByRole("textbox", { name, exact: true });
  const originalQuarry = {
    name: await siteField("Quarry Name").inputValue(),
    address: await siteField("Address").inputValue(),
  };
  await siteField("Quarry Name").fill("Review Quarry Updated");
  await siteField("Address").fill("Updated quarry yard address");
  await fromQuarry();
  await expect(section("quarry")).toContainText("Review Quarry Updated");
  await expect(section("quarry")).toContainText("Updated quarry yard address");
  await expect(section("business")).toContainText("Updated business office");
  await expect(section("materials")).toContainText("Review Quarry Updated");
  await edit("Materials & Measurements");
  const originalMaterial = {
    grade: await input("Grade C description").inputValue(),
    yard: await input("Stockyard Name").inputValue(),
  };
  await input("Grade C description").fill("Reviewed grade description");
  await input("Stockyard Name").fill("Reviewed Yard");
  await fromMaterials();
  await expect(section("materials")).toContainText(
    "Reviewed grade description",
  );
  await expect(section("materials")).toContainText("Reviewed Yard");
  await edit("Users & Roles");
  const originalUser = {
    name: await input("Team Member Name").inputValue(),
    remarks: await input("Remarks").inputValue(),
  };
  await input("Team Member Name").fill("Reviewed Team Member");
  await input("Remarks").fill("Reviewed shift");
  await navigate("Review & Activate");
  await expect(section("users")).toContainText("Reviewed Team Member");
  await expect(section("users")).toContainText("Reviewed shift");
  assert.deepEqual(await stableIds(), ids);
  await button("Save Draft").click();
  await saved().waitFor();
  for (const step of ["business", "quarry", "materials", "users"]) {
    await section(step).scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `${directory}/review-${step}-${width}.png`,
      fullPage: true,
    });
  }
  await layout();
  for (const box of await page
    .getByRole("button")
    .filter({ visible: true })
    .evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, width: rect.width, height: rect.height };
      }),
    ))
    assert(
      box.height >= 48 && box.x >= 0 && box.x + box.width <= width + 1,
      `${width} review touch targets/bounds`,
    );
  const route = page.url();
  await button("Preview Activation").click();
  const preview = page
    .getByTestId("activation-preview")
    .filter({ visible: true });
  await expect(preview).toContainText(
    "This is a demonstration. No organization has been created or activated in Supabase.",
  );
  for (const text of [
    "Business: Review Business Updated",
    "Quarries: 2",
    "Pits / Benches: 2",
    "Stockyards: 2",
    "Black Granite, Tan Brown",
    "1 Owner · 1 additional team member",
  ])
    await expect(preview).toContainText(text);
  await page.screenshot({
    path: `${directory}/activation-preview-${width}.png`,
    fullPage: true,
    animations: "disabled",
  });
  await button("Return to Review").scrollIntoViewIfNeeded();
  const returnBounds = await button("Return to Review").boundingBox();
  assert(
    returnBounds.height >= 48 &&
      returnBounds.x >= 0 &&
      returnBounds.x + returnBounds.width <= width + 1,
  );
  await button("Return to Review").click();
  await preview.waitFor({ state: "hidden" });
  assert.equal(page.url(), route, "Preview never enters another workspace");
  await expect(section("business")).toContainText("Review Business Updated");
  await saved().waitFor();
  await page.goBack();
  await page.getByRole("button", { name: /Demo Business Setup/ }).click();
  await title("Review & Activate").waitFor();
  await saved().waitFor();
  assert.deepEqual(await stableIds(), ids);
  await expect(section("business")).toContainText("Updated business office");
  assert.equal(
    await preview.count(),
    0,
    "Preview is local presentation, not a saved activation result",
  );
  // Restore regression fixture values after proving each independent Edit destination.
  await edit("Users & Roles");
  await input("Team Member Name").fill(originalUser.name);
  await input("Remarks").fill(originalUser.remarks);
  await navigate("Review & Activate");
  await edit("Materials & Measurements");
  await input("Grade C description").fill(originalMaterial.grade);
  await input("Stockyard Name").fill(originalMaterial.yard);
  await fromMaterials();
  await edit("Quarry Configuration");
  await siteField("Quarry Name").fill(originalQuarry.name);
  await siteField("Address").fill(originalQuarry.address);
  await fromQuarry();
  await edit("Business Registration");
  await input("Business Name").fill(originalBusiness.name);
  await input("Business Address").fill(originalBusiness.address);
  await toReview();
  assert.deepEqual(await stableIds(), ids);
  await button("Save Draft").click();
  await saved().waitFor();
  await title("Review & Activate").scrollIntoViewIfNeeded();
};

exports.verifyIncompleteReview = async ({
  page,
  button,
  title,
  saved,
  layout,
  width,
  directory,
  base,
}) => {
  await page.goto(`${base}/onboarding/review`);
  await title("Review & Activate").waitFor();
  const readiness = page
    .getByTestId("review-readiness")
    .filter({ visible: true });
  await expect(readiness).toContainText("Configuration needs attention");
  await button("Save Draft").click();
  await saved().waitFor();
  await button("Preview Activation").click();
  await page.getByRole("alert").filter({ visible: true }).waitFor();
  assert.equal(
    await page
      .getByTestId("activation-preview")
      .filter({ visible: true })
      .count(),
    0,
  );
  await layout();
  await page.screenshot({
    path: `${directory}/review-invalid-action-${width}.png`,
    fullPage: true,
  });
  await button("Correct next issue").click();
  await title("Business Registration").waitFor();
  assert.equal(
    await page
      .getByRole("textbox", { name: "Business Name", exact: true })
      .filter({ visible: true })
      .first()
      .inputValue(),
    "",
  );
  // Fresh direct-entry checks below inspect each allowlisted Fix action independently.
  for (const [name, target] of [
    ["Business Registration", "Business Registration"],
    ["Quarry Configuration", "Quarry Configuration"],
    ["Materials & Measurements", "Materials & Measurements"],
  ]) {
    await page.goto(`${base}/onboarding/review`);
    await button(`Fix ${name}`).click();
    await title(target).waitFor();
  }
  await page.goto(`${base}/onboarding/review`);
  await readiness.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${directory}/review-invalid-summary-${width}.png`,
    fullPage: true,
  });
  await button("Save Draft").click();
  await saved().waitFor();
  await button("Reset demo draft").click();
  await title("Business Registration").waitFor();
  assert.equal(await saved().count(), 0);
};
