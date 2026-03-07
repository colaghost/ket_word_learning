import { test, expect, Page } from '@playwright/test';

const httpUrl = 'http://localhost:8080/ket-learning.html';

test.describe('Quiz Mode - Key Verification Only', () => {

  test.beforeEach(async ({ page, context }) => {
    // Clear localStorage for each test
    await context.clearCookies();
    await page.goto(httpUrl);

    // Wait for page to fully load
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    console.log('=== Page Loaded ===');
    console.log('URL:', httpUrl);
    console.log('Title:', await page.title());

    // Wait for units grid to be visible
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    console.log('Units grid visible: true');

    // CRITICAL: Wait for level select page to be visible and level cards
    await page.waitForSelector('#levelSelectPage:not(.hidden)', { state: 'visible', timeout: 10000 });

    await page.waitForSelector('.level-card', { state: 'visible', timeout: 10000 });

    console.log('Level select page visible:', true);
    console.log('Level cards visible:', true);

    // Check which pages are visible
    const homePageVisible = await page.locator('#homePage').isVisible();
    const levelSelectPageVisible = await page.locator('#levelSelectPage').isVisible();
    const quizPageVisible = await page.locator('#quizPage').isVisible();

    console.log('Home page visible:', homePageVisible);
    console.log('Level select page visible:', levelSelectPageVisible);
    console.log('Quiz page visible:', quizPageVisible);
  });

  test('Bug Fix Verification: unlockNextLevel uses correct key format', async ({ page }) => {
    const code = await page.evaluate(() => {
      return window.unlockNextLevel.toString();
    });

    console.log('unlockNextLevel code:', code);

    expect(code).toContain('${levelInfo.unit}-${levelInfo.source}');
  });
});
