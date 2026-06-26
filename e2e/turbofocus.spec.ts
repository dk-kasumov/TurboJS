import { test, expect } from "@playwright/test";

const testId = (id: string) => `[test-id="${id}"]`;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("switching mode resets the clock from the store duration", async ({
  page,
}) => {
  await expect(page.locator(testId("clock"))).toHaveText("25:00");

  await page.getByRole("button", { name: "Short Break" }).click();
  await expect(page.locator(testId("clock"))).toHaveText("05:00");

  await page.getByRole("button", { name: "Focus", exact: true }).click();
  await expect(page.locator(testId("clock"))).toHaveText("25:00");
});

test("the active tab reflects the selected mode", async ({ page }) => {
  const shortBreak = page.getByRole("button", { name: "Short Break" });
  await expect(shortBreak).not.toHaveClass(/active/);
  await shortBreak.click();
  await expect(shortBreak).toHaveClass(/active/);
});

test("start toggles to pause and ticks the clock down", async ({ page }) => {
  const toggle = page.locator(testId("toggle"));
  await expect(toggle).toHaveText("Start");

  await toggle.click();
  await expect(toggle).toHaveText("Pause");
  await expect(page.locator(testId("clock"))).not.toHaveText("25:00", {
    timeout: 2000,
  });
});

test("a settings stepper updates the focus duration and the clock", async ({
  page,
}) => {
  const focusRow = page.locator(".stepper", { hasText: "Focus" });
  await focusRow.getByRole("button", { name: "+" }).click();

  await expect(focusRow.locator(".stepper-value")).toHaveText("26");
  await expect(page.locator(testId("clock"))).toHaveText("26:00");
});
