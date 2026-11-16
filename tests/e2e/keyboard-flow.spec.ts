import { expect, test, type Page } from "@playwright/test";

/** Presses Tab until the focused element matches, using the keyboard only. */
async function tabTo(page: Page, matches: (el: Element) => boolean, max = 30): Promise<void> {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(`(${matches.toString()})(document.activeElement)`)) return;
  }
  throw new Error("Tab never reached the target");
}

const status = (page: Page) => page.locator('[role="status"]');

test("keyboard-only flow: example, overview, tree, run, error, jump, edit", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome to Sonic Debugger" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await tabTo(page, (el) => el.textContent === "Load an example with a bug");
  await page.keyboard.press("Enter");
  await expect(status(page)).toHaveText(/Example loaded: \d+ lines\. Press Run to try it\./);
  await expect(page.getByLabel("Python code")).toHaveValue(/def average/);

  await tabTo(page, (el) => el.getAttribute("role") === "treeitem");
  await page.keyboard.press("KeyP");
  await expect(status(page)).toHaveText(/Overview: \d+ constructs/);
  await expect(page.getByText(/Last sound: (?!none yet)/)).toBeVisible();

  await page.keyboard.press("ArrowDown");
  const focused = page.locator('[role="treeitem"]:focus');
  await expect(focused).toHaveAttribute("aria-label", /item 1 of/);
  await page.keyboard.press("KeyF");
  await page.keyboard.press("KeyS");
  await expect(status(page)).toHaveText("Sound stopped");

  await page.keyboard.press("KeyR");
  await expect(page.getByText("Run status:").locator("strong")).toHaveText("Error", { timeout: 100_000 });
  await expect(page.getByRole("alert")).toContainText("Press E to go to the failing construct.");
  await expect(page.getByText("Why", { exact: true })).toBeVisible();
  await expect(page.locator('[role="treeitem"]:focus')).toBeVisible();

  await page.keyboard.press("KeyE");
  await expect(page.locator('[role="treeitem"]:focus')).toContainText("Error here");
  await expect(page.getByText(/Last sound: .*sound/)).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Python code")).toBeFocused();
  await expect(status(page)).toHaveText(/Editing line \d+/);
  const caretLine = await page.getByLabel("Python code").evaluate((t: HTMLTextAreaElement) =>
    t.value.slice(0, t.selectionStart).split("\n").length);
  expect(caretLine).toBeGreaterThan(1);
});

test("Ctrl+Enter runs from the editor and letter keys type there", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("sonic-debugger.settings", JSON.stringify({ dontShowWelcome: true })));
  await page.goto("/");
  await page.getByLabel("Python code").focus();
  await page.keyboard.type("print(40 + 2)");
  await page.keyboard.press("Control+Enter");
  await expect(page.getByText("Run status:").locator("strong")).toHaveText("Finished, no errors", { timeout: 100_000 });
  await expect(page.getByLabel("Program output")).toHaveText("42\n");
  await expect(status(page)).toHaveText("Finished. No errors. 1 line of output.");
});
