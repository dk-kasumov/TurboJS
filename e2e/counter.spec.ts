import { test, expect } from "@playwright/test";

test("nested components render and each instance is independent", async ({
  page,
}) => {
  await page.goto("/");

  // <Header title="..."> received its prop.
  await expect(page.getByTestId("title")).toHaveText("turbo counters");

  // Two independent <Counter /> instances, both starting at 0.
  const counts = page.getByTestId("count");
  await expect(counts).toHaveCount(2);
  await expect(counts.nth(0)).toHaveText("0");
  await expect(counts.nth(1)).toHaveText("0");

  // Clicking the first counter updates only the first (per-instance state),
  // and its derived `double` memo tracks it.
  await page.getByTestId("inc").nth(0).click();
  await page.getByTestId("inc").nth(0).click();
  await expect(counts.nth(0)).toHaveText("2");
  await expect(page.getByTestId("double").nth(0)).toHaveText("4");
  await expect(counts.nth(1)).toHaveText("0");
});
