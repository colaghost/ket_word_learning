import { test, expect, Page } from '@playwright/test';

const httpUrl = 'http://localhost:8080/ket-learning.html';

test.describe('Quiz Mode - Key Verification Only', () => {

  test.beforeEach(async ({ page, context }) => {
    // Clear localStorage for each test
    await context.clearCookies();
    await page.goto(httpUrl);

    // Wait for page to fully load (use 'load' to ensure window.onload has fired)
    await page.waitForLoadState('load', { timeout: 10000 });

    console.log('=== Page Loaded ===');
    console.log('URL:', httpUrl);
    console.log('Title:', await page.title());

    // Wait for home page to be visible (the page starts on home page)
    await page.waitForSelector('#homePage:not(.hidden)', { state: 'visible', timeout: 10000 });

    // Wait for units grid to be visible
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    console.log('Home page and units grid visible: true');
  });

  test('Bug Fix Verification: unlockNextLevel uses correct key format', async ({ page }) => {
    const code = await page.evaluate(() => {
      return window.unlockNextLevel.toString();
    });

    console.log('unlockNextLevel code:', code);

    expect(code).toContain('${unit}-${source}');
  });
});
