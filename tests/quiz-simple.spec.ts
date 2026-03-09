import { test, expect } from '@playwright/test';

const httpUrl = 'http://localhost:8080/ket-learning.html';

test('Simple navigation test', async ({ page }) => {
  console.log('Loading page:', httpUrl);
  await page.goto(httpUrl);

  console.log('Page title:', await page.title());

  // Try to find home page elements
  const homePageExists = await page.locator('#homePage').count();
  console.log('Home page exists:', homePageExists);

  const levelSelectPageExists = await page.locator('#levelSelectPage').count();
  console.log('Level select page exists:', levelSelectPageExists);

  // Wait for page to load
  await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

  // Check what's on the page
  const bodyText = await page.locator('body').textContent();
  console.log('Page body length:', bodyText.length);
  console.log('Page contains "Unit":', bodyText.includes('Unit'));
  console.log('Page contains "关卡":', bodyText.includes('关卡'));

  expect(homePageExists).toBeGreaterThan(0);
});
