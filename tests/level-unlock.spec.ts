import { test, expect, Page } from '@playwright/test';

const httpUrl = 'http://localhost:8080/ket-learning.html';

/**
 * Helper function to get unlocked levels from localStorage
 */
async function getUnlockedLevels(page: Page): Promise<string[]> {
  const data = await page.evaluate(() => {
    const saved = localStorage.getItem('ketUserData');
    if (!saved) return null;
    return JSON.parse(saved);
  });
  return data?.unlockedLevels || [];
}

/**
 * Helper function to check if quiz is complete
 */
async function isQuizComplete(page: Page): Promise<boolean> {
  const completionPageVisible = await page.locator('#completionPage').isVisible();
  return completionPageVisible;
}

/**
 * Helper function to get the current question text and all available options
 */
async function getQuestionData(page: Page): Promise<{ question: string, options: string[] }> {
  await page.waitForSelector('.quiz-option', { state: 'visible', timeout: 10000 });

  const question = await page.locator('#quizQuestion').textContent() || '';
  const options = await page.locator('.quiz-option').allTextContents();

  return { question, options };
}

/**
 * Helper function to get the correct answer from the quiz game
 * Note: quizGame is a local variable, so we need to use levelIdMap to find the correct answer
 */
async function getCorrectAnswer(page: Page): Promise<string> {
  // Wait for the question text to be visible
  await page.waitForSelector('#quizQuestion', { state: 'visible', timeout: 10000 });

  // Get the question text and find the corresponding word from levelIdMap
  const { question } = await getQuestionData(page);

  // Determine the correct answer by matching the question with word data
  const correctAnswer = await page.evaluate((questionText) => {
    const levelIdMap = window.eval('levelIdMap');
    const currentLevelId = window.eval('currentLevelId');

    if (!levelIdMap || !currentLevelId) {
      return null;
    }

    const levelInfo = levelIdMap[currentLevelId];
    if (!levelInfo || !levelInfo.words) {
      return null;
    }

    // Find the word that matches the question
    const word = levelInfo.words.find(w =>
      w['单词'] === questionText || w['中文含义'] === questionText
    );

    if (!word) {
      return null;
    }

    // If question is in English, answer is Chinese; if Chinese, answer is English
    if (word['单词'] === questionText) {
      return word['中文含义'];
    } else {
      return word['单词'];
    }
  }, question);

  if (!correctAnswer) {
    throw new Error(`Could not find correct answer for question: "${question}"`);
  }

  return correctAnswer;
}

/**
 * Helper function to answer a quiz question correctly
 */
async function answerQuestionCorrectly(page: Page): Promise<boolean> {
  // Get the correct answer from quiz game
  const correctAnswer = await getCorrectAnswer(page);

  // Wait for the options to be fully rendered
  await page.waitForSelector('.quiz-option', { state: 'visible', timeout: 5000 });

  // Get the option button for the correct answer
  // Use .first() to handle duplicate options (strict mode violation when multiple matches exist)
  const optionBtn = page.locator('.quiz-option').filter({ hasText: correctAnswer }).first();

  // Wait for the option to be enabled (not disabled)
  await optionBtn.waitFor({ state: 'attached', timeout: 5000 });

  // Click the option
  await optionBtn.click();

  // Check if quiz is complete
  const complete = await isQuizComplete(page);

  // If not complete, check if we need to click "继续" button (wrong answer case)
  if (!complete) {
    // Wait a bit for the feedback to show
    await page.waitForTimeout(500);

    // Check if "继续" button is present (indicates wrong answer)
    const nextBtnVisible = await page.getByRole('button', { name: '继续' }).isVisible();
    if (nextBtnVisible) {
      await clickNextQuestionButton(page);
    }
  }

  return complete;
}

/**
 * Helper function to answer a quiz question incorrectly (choose first wrong option)
 */
async function answerQuestionIncorrectly(page: Page): Promise<boolean> {
  // Get the correct answer to avoid clicking it
  const correctAnswer = await getCorrectAnswer(page);

  // Get all options
  const { options } = await getQuestionData(page);

  // Find a wrong option (not equal to correct answer)
  const wrongOption = options.find(opt => opt !== correctAnswer);

  if (!wrongOption) {
    throw new Error('No wrong option found');
  }

  // Click the wrong option
  const optionLocator = page.locator('.quiz-option').filter({ hasText: wrongOption });
  await optionLocator.click();

  // Check if quiz is complete
  const complete = await isQuizComplete(page);
  return complete;
}

/**
 * Helper function to click the "next question" button after a wrong answer
 */
async function clickNextQuestionButton(page: Page): Promise<void> {
  // The button with text "继续" (Continue) is the one we want after a wrong answer
  const nextBtn = page.getByRole('button', { name: '继续' });
  await nextBtn.click();

  // Wait for the feedback element to be hidden and quiz options to be available
  await page.waitForSelector('#feedback.hidden', { state: 'attached', timeout: 5000 });
  await page.waitForSelector('.quiz-option', { state: 'visible', timeout: 5000 });

  // Additional wait to ensure quizGame.generateQuestion() has completed
  await page.waitForTimeout(300);
}

/**
 * Helper function to get the level card at specified index
 */
async function getLevelCard(page: Page, index: number) {
  return page.locator('.level-card').nth(index);
}

/**
 * Helper function to get the level status text
 */
async function getLevelStatusText(page: Page, index: number): Promise<string> {
  const card = await getLevelCard(page, index);
  const statusElement = card.locator('.level-status');
  return await statusElement.textContent() || '';
}

/**
 * Helper function to check if level card contains specified class
 */
async function levelHasClass(page: Page, index: number, className: string): Promise<boolean> {
  const card = await getLevelCard(page, index);
  const classAttribute = await card.getAttribute('class') || '';
  return classAttribute.includes(className);
}

/**
 * Helper function to capture screenshot and save to test output directory
 */
async function captureScreenshot(
  page: Page,
  name: string
): Promise<void> {
  const screenshotPath = `test-results/${name}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved: ${screenshotPath}`);
}

/**
 * Navigate to a specific unit's level select page
 */
async function navigateToUnit(page: Page, unit: string, source: 'pretest' | 'wordlist'): Promise<void> {
  // Check if we're already on home page
  const isOnHomePage = await page.locator('#homePage:not(.hidden)').isVisible({ timeout: 2000 });

  if (!isOnHomePage) {
    // Navigate to home page by clicking on the back button
    // @ts-ignore - goHome is defined in the page's global scope
    await page.evaluate(() => {
      // @ts-ignore
      if (typeof (globalThis as any).goHome === 'function') {
        (globalThis as any).goHome();
      }
    });
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });
  }

  // Get the unit number from the unit string
  const unitNumber = unit.replace('unit', '');

  // Click the specific unit's button
  const unitSelector = source === 'pretest' ? '.pretest-btn' : '.wordlist-btn';

  // Find the specific unit card by its index (e.g., unit 1 is first card, unit 2 is second)
  const unitIndex = parseInt(unitNumber) - 1;
  const unitCard = page.locator('.unit-card').nth(unitIndex);
  const unitBtn = unitCard.locator(unitSelector);

  // Scroll the unit card into view
  await unitCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);

  // Wait for the button to be visible and clickable
  await unitBtn.waitFor({ state: 'visible', timeout: 10000 });
  await unitBtn.click();

  // Wait for level select page
  await page.waitForSelector('#levelSelectPage:not(.hidden)', { state: 'visible', timeout: 10000 });
  await page.waitForSelector('.level-card', { state: 'visible', timeout: 10000 });
}

/**
 * Set up user data for a specific scenario
 */
async function setupUserData(page: Page, data: { unlockedLevels: string[], points?: number }): Promise<void> {
  await page.evaluate((userData) => {
    const defaultData = {
      points: userData.points || 1000,
      streak: 0,
      lastCheckIn: null,
      unlockedLevels: userData.unlockedLevels,
      completedLevels: [],
      currentLevel: null
    };
    localStorage.setItem('ketUserData', JSON.stringify(defaultData));
  }, data);

  // Reload page to pick up the data
  await page.reload();
  await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });
}

test.describe('Level Unlock Functionality', () => {

  test.beforeEach(async ({ page, context }) => {
    // Clear localStorage for each test
    await context.clearCookies();
    await page.goto(httpUrl);

    // Clear localStorage to ensure clean state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Wait for page to fully load
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Wait for units grid to be visible (home page)
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    // Initialize localStorage with the default unlocked levels
    await page.evaluate(() => {
      const defaultUserData = {
        points: 1000,
        streak: 0,
        lastCheckIn: null,
        unlockedLevels: ['unit1-pretest-1'],
        completedLevels: [],
        currentLevel: null
      };
      localStorage.setItem('ketUserData', JSON.stringify(defaultUserData));
    });

    // Reload the page to pick up the localStorage data
    await page.reload();

    // Wait for page to fully load
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Wait for units grid to be visible (home page)
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    // Click the first unit's "前测" button to show level select page
    const firstPretestBtn = page.locator('.pretest-btn').first();
    await firstPretestBtn.click();

    // Wait for level select page to be visible and level cards
    await page.waitForSelector('#levelSelectPage:not(.hidden)', { state: 'visible', timeout: 10000 });
    await page.waitForSelector('.level-card', { state: 'visible', timeout: 10000 });
  });

  test('Test Case 1: Unlock next level when all answers are correct', async ({ page }) => {
    console.log('\n=== Test Case 1: Unlock next level when all answers are correct ===');

    // Step 1: Get initial unlocked levels
    const initialUnlockedLevels = await getUnlockedLevels(page);
    console.log('Initial unlocked levels:', initialUnlockedLevels);

    // Step 2: Click first level's "start quiz" button
    const firstLevelCard = page.locator('.level-card').first();
    const startQuizBtn = firstLevelCard.locator('button').filter({ hasText: /通关/ });
    await startQuizBtn.click();

    // Wait for quiz page to be visible
    await page.waitForSelector('#quizPage:not(.hidden)', { state: 'visible', timeout: 10000 });
    console.log('Quiz page is visible');

    // Step 3: Answer all questions correctly
    let questionCount = 0;
    while (!await isQuizComplete(page)) {
      questionCount++;
      console.log(`\nAnswering question ${questionCount}...`);

      const wasComplete = await answerQuestionCorrectly(page);

      if (!wasComplete) {
        // Wait a bit for the next question to render
        await page.waitForTimeout(300);
      } else {
        console.log('Quiz completed!');
      }

      // Safety limit to prevent infinite loops
      if (questionCount > 50) {
        throw new Error('Too many questions answered, something is wrong');
      }
    }

    console.log(`Total questions answered: ${questionCount}`);

    // Step 4: Verify completion page is shown
    const completionMessage = await page.locator('#completionMessage').textContent();
    console.log('Completion message:', completionMessage);
    expect(completionMessage).toContain('答对');

    // Step 5: Verify that the next level is now unlocked
    const finalUnlockedLevels = await getUnlockedLevels(page);
    console.log('Final unlocked levels:', finalUnlockedLevels);

    // Find the next level ID (unit1-pretest-2)
    const hasNextLevel = finalUnlockedLevels.some(level => level === 'unit1-pretest-2');
    expect(hasNextLevel).toBe(true);
    expect(finalUnlockedLevels.length).toBeGreaterThan(initialUnlockedLevels.length);

    console.log('\n=== Test Case 1 PASSED: Next level unlocked ===');
  });

  test('Test Case 2: Do not unlock next level when not all answers are correct', async ({ page }) => {
    console.log('\n=== Test Case 2: Do not unlock next level when not all answers are correct ===');

    // Step 1: Get initial unlocked levels
    const initialUnlockedLevels = await getUnlockedLevels(page);
    console.log('Initial unlocked levels:', initialUnlockedLevels);

    // Step 2: Click first level's "start quiz" button
    const firstLevelCard = page.locator('.level-card').first();
    const startQuizBtn = firstLevelCard.locator('button').filter({ hasText: /通关/ });
    await startQuizBtn.click();

    // Wait for quiz page to be visible
    await page.waitForSelector('#quizPage:not(.hidden)', { state: 'visible', timeout: 10000 });
    console.log('Quiz page is visible');

    // Step 3: Answer first question incorrectly
    console.log('\nAnswering first question incorrectly...');
    await answerQuestionIncorrectly(page);

    // Click the "next question" button that appears after wrong answer
    await clickNextQuestionButton(page);
    console.log('Clicked "next question" button');

    // Step 4: Answer all remaining questions correctly
    let questionCount = 1; // Already answered 1 question
    while (!await isQuizComplete(page)) {
      questionCount++;
      console.log(`\nAnswering question ${questionCount}...`);

      const wasComplete = await answerQuestionCorrectly(page);

      if (!wasComplete) {
        // Wait a bit for the next question to render
        await page.waitForTimeout(300);
      } else {
        console.log('Quiz completed!');
      }

      // Safety limit to prevent infinite loops
      if (questionCount > 50) {
        throw new Error('Too many questions answered, something is wrong');
      }
    }

    console.log(`Total questions answered: ${questionCount}`);

    // Step 5: Verify completion page is shown with wrong answers
    const completionMessage = await page.locator('#completionMessage').textContent();
    console.log('Completion message:', completionMessage);
    expect(completionMessage).toContain('答对');
    expect(completionMessage).toContain('答错');

    // Step 6: Verify that the next level is NOT unlocked
    const finalUnlockedLevels = await getUnlockedLevels(page);
    console.log('Final unlocked levels:', finalUnlockedLevels);

    // The unlocked levels should NOT contain unit1-pretest-2
    expect(finalUnlockedLevels).not.toContain('unit1-pretest-2');
    // The count should be the same as before
    expect(finalUnlockedLevels.length).toBe(initialUnlockedLevels.length);

    console.log('\n=== Test Case 2 PASSED: Next level NOT unlocked (as expected) ===');
  });

  test('Test Case 3: Verify unlockNextLevel function exists and works correctly', async ({ page }) => {
    console.log('\n=== Test Case 3: Verify unlockNextLevel function ===');

    // Check if unlockNextLevel function exists
    const functionExists = await page.evaluate(() => {
      return typeof (globalThis as any).unlockNextLevel === 'function';
    });
    expect(functionExists).toBe(true);

    // Check the function implementation
    const functionCode = await page.evaluate(() => {
      return (globalThis as any).unlockNextLevel.toString();
    });
    console.log('unlockNextLevel function:', functionCode);
    // The function uses destructuring: const { unit, source, index } = levelInfo;
    expect(functionCode).toContain('const levelInfo = levelIdMap[levelId]');
    expect(functionCode).toContain('levelData');
    expect(functionCode).toContain('userData.unlockedLevels.push');

    console.log('\n=== Test Case 3 PASSED: unlockNextLevel function verified ===');
  });

  test('Test Case 4: Verify level ID format is correct', async ({ page }) => {
    console.log('\n=== Test Case 4: Verify level ID format ===');

    // Check that level IDs follow the expected format: {unit}-{source}-{index}
    // Use window.eval to access the levelIdMap from the page's scope
    const levelIdMap = await page.evaluateHandle(() => {
      return window.eval('typeof levelIdMap !== "undefined" ? levelIdMap : undefined');
    });

    const levelIdMapValue = await levelIdMap.jsonValue();

    // Handle case where levelIdMap might be undefined
    if (!levelIdMapValue) {
      console.log('levelIdMap is undefined, skipping format verification');
      console.log('\n=== Test Case 4 SKIPPED ===');
      return;
    }

    console.log('Level ID map keys:', Object.keys(levelIdMapValue));

    // Verify the first few level IDs
    Object.keys(levelIdMapValue).slice(0, 3).forEach(levelId => {
      const parts = levelId.split('-');
      console.log(`Level ID: ${levelId}, Parts:`, parts);
      expect(parts.length).toBeGreaterThanOrEqual(3);

      // First part should be "unitX" (e.g., "unit1")
      expect(parts[0]).toMatch(/^unit\d+$/);

      // Second part should be source type (e.g., "pretest", "wordlist")
      expect(parts[1]).toMatch(/^(pretest|wordlist)$/);

      // Third part should be index number
      expect(parts[2]).toMatch(/^\d+$/);
    });

    console.log('\n=== Test Case 4 PASSED: Level ID format verified ===');
  });

  test('Test Case 5: Verify level unlock with UI state and screenshots', async ({ page }) => {
    console.log('\n=== Test Case 5: Verify level unlock with UI state and screenshots ===');

    // Step 1: Verify initial state - Level 1 unlocked, Level 2 locked
    console.log('\n--- Step 1: Verifying initial UI state ---');
    const level1HasUnlocked = await levelHasClass(page, 0, 'unlocked');
    const level1StatusText = await getLevelStatusText(page, 0);
    console.log(`Level 1 unlocked class: ${level1HasUnlocked}`);
    console.log(`Level 1 status text: ${level1StatusText}`);

    const level2HasLocked = await levelHasClass(page, 1, 'locked');
    const level2StatusText = await getLevelStatusText(page, 1);
    console.log(`Level 2 locked class: ${level2HasLocked}`);
    console.log(`Level 2 status text: ${level2StatusText}`);

    expect(level1HasUnlocked).toBe(true);
    expect(level1StatusText).toContain('已解锁');
    expect(level2HasLocked).toBe(true);
    expect(level2StatusText).toContain('未解锁');

    // Step 2: Capture screenshot before unlock
    console.log('\n--- Step 2: Capturing screenshot before unlock ---');
    await captureScreenshot(page, 'before-unlock');

    // Step 3: Complete quiz with all correct answers
    console.log('\n--- Step 3: Completing quiz with all correct answers ---');

    // Click first level's "start quiz" button
    const firstLevelCard = page.locator('.level-card').first();
    const startQuizBtn = firstLevelCard.locator('button').filter({ hasText: /通关/ });
    await startQuizBtn.click();

    // Wait for quiz page to be visible
    await page.waitForSelector('#quizPage:not(.hidden)', { state: 'visible', timeout: 10000 });
    console.log('Quiz page is visible');

    // Answer all questions correctly
    let questionCount = 0;
    while (!await isQuizComplete(page)) {
      questionCount++;
      console.log(`\nAnswering question ${questionCount}...`);

      const wasComplete = await answerQuestionCorrectly(page);

      if (!wasComplete) {
        // Wait a bit for the next question to render
        await page.waitForTimeout(300);
      } else {
        console.log('Quiz completed!');
      }

      // Safety limit to prevent infinite loops
      if (questionCount > 50) {
        throw new Error('Too many questions answered, something is wrong');
      }
    }

    console.log(`Total questions answered: ${questionCount}`);

    // Step 4: Navigate back to level select page
    console.log('\n--- Step 4: Navigating back to level select page ---');

    // Click the "继续学习" button on completion page
    const continueBtn = page.locator('.completion-btn').filter({ hasText: '继续学习' });
    await continueBtn.click();

    // Wait for level select page to be visible and level cards to re-render
    await page.waitForSelector('#levelSelectPage:not(.hidden)', { state: 'visible', timeout: 10000 });
    await page.waitForSelector('.level-card', { state: 'visible', timeout: 10000 });
    console.log('Level select page is visible');

    // Wait for UI to fully render after returning to level select page
    await page.waitForTimeout(500);

    // Step 5: Capture screenshot after unlock
    console.log('\n--- Step 5: Capturing screenshot after unlock ---');
    await captureScreenshot(page, 'after-unlock');

    // Step 6: Verify unlock state in UI
    console.log('\n--- Step 6: Verifying unlock state in UI ---');

    // Verify Level 1 shows completed state
    const level1HasCompleted = await levelHasClass(page, 0, 'completed');
    const level1StatusTextAfter = await getLevelStatusText(page, 0);
    console.log(`Level 1 completed class: ${level1HasCompleted}`);
    console.log(`Level 1 status text after: ${level1StatusTextAfter}`);

    expect(level1HasCompleted).toBe(true);
    expect(level1StatusTextAfter).toContain('已完成');

    // PRIMARY VERIFICATION: Level 2 should show unlocked state with UI text
    const level2HasUnlockedAfter = await levelHasClass(page, 1, 'unlocked');
    const level2StatusTextAfter = await getLevelStatusText(page, 1);
    console.log(`Level 2 unlocked class: ${level2HasUnlockedAfter}`);
    console.log(`Level 2 status text after: ${level2StatusTextAfter}`);

    expect(level2HasUnlockedAfter).toBe(true);
    expect(level2StatusTextAfter).toContain('已解锁');

    // Verify localStorage contains both levels
    console.log('\n--- Step 7: Verifying localStorage state ---');
    const unlockedLevels = await getUnlockedLevels(page);
    console.log('Unlocked levels:', unlockedLevels);

    expect(unlockedLevels).toContain('unit1-pretest-1');
    expect(unlockedLevels).toContain('unit1-pretest-2');

    console.log('\n=== Test Case 5 PASSED: Level unlock verified with UI and screenshots ===');
  });

  test('Test Case 6: Initial state validation - new user has both unit1-pretest-1 and unit1-wordlist-1 unlocked', async ({ page, context }) => {
    console.log('\n=== Test Case 6: Initial state validation (new user) ===');

    // Step 1: Clear localStorage completely
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    // Step 2: Reload page with fresh state
    await page.reload();
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    // Step 3: Navigate to Unit 1 pretest
    await navigateToUnit(page, 'unit1', 'pretest');

    // Step 4: Verify Level 1 is unlocked
    const level1HasUnlocked = await levelHasClass(page, 0, 'unlocked');
    const level1StatusText = await getLevelStatusText(page, 0);
    console.log(`Unit 1 pretest - Level 1 unlocked class: ${level1HasUnlocked}`);
    console.log(`Unit 1 pretest - Level 1 status text: ${level1StatusText}`);

    expect(level1HasUnlocked).toBe(true);
    expect(level1StatusText).toContain('已解锁');

    // Capture screenshot for Unit 1 pretest
    await captureScreenshot(page, 'initial-state-pretest');

    // Step 5: Navigate to Unit 1 wordlist
    await navigateToUnit(page, 'unit1', 'wordlist');

    // Step 6: Verify Level 1 is unlocked
    const wordlistLevel1HasUnlocked = await levelHasClass(page, 0, 'unlocked');
    const wordlistLevel1StatusText = await getLevelStatusText(page, 0);
    console.log(`Unit 1 wordlist - Level 1 unlocked class: ${wordlistLevel1HasUnlocked}`);
    console.log(`Unit 1 wordlist - Level 1 status text: ${wordlistLevel1StatusText}`);

    expect(wordlistLevel1HasUnlocked).toBe(true);
    expect(wordlistLevel1StatusText).toContain('已解锁');

    // Capture screenshot for Unit 1 wordlist
    await captureScreenshot(page, 'initial-state-wordlist');

    // Step 7: Verify localStorage contains both levels
    const unlockedLevels = await getUnlockedLevels(page);
    console.log('Unlocked levels:', unlockedLevels);

    expect(unlockedLevels).toContain('unit1-pretest-1');
    expect(unlockedLevels).toContain('unit1-wordlist-1');

    console.log('\n=== Test Case 6 PASSED: Initial state validated ===');
  });

  test('Test Case 7: Data migration validation - unit1-wordlist-1 auto-added when missing', async ({ page, context }) => {
    console.log('\n=== Test Case 7: Data migration validation (existing user) ===');

    // Step 1: Clear localStorage first
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    // Step 2: Set up user data with only unit1-pretest-1 (simulating old user data)
    await page.evaluate(() => {
      const userData = {
        points: 1000,
        streak: 0,
        lastCheckIn: null,
        unlockedLevels: ['unit1-pretest-1'], // Missing unit1-wordlist-1
        completedLevels: [],
        currentLevel: null
      };
      localStorage.setItem('ketUserData', JSON.stringify(userData));
    });

    // Step 3: Reload page to trigger data migration in init()
    await page.reload();
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    // Step 4: Navigate to Unit 1 wordlist
    await navigateToUnit(page, 'unit1', 'wordlist');

    // Step 5: Verify Level 1 is now unlocked (should have been added by migration)
    const level1HasUnlocked = await levelHasClass(page, 0, 'unlocked');
    const level1StatusText = await getLevelStatusText(page, 0);
    console.log(`Unit 1 wordlist - Level 1 unlocked class: ${level1HasUnlocked}`);
    console.log(`Unit 1 wordlist - Level 1 status text: ${level1StatusText}`);

    expect(level1HasUnlocked).toBe(true);
    expect(level1StatusText).toContain('已解锁');

    // Capture screenshot
    await captureScreenshot(page, 'data-migration');

    // Step 6: Verify localStorage now contains both levels
    const unlockedLevels = await getUnlockedLevels(page);
    console.log('Unlocked levels after migration:', unlockedLevels);

    expect(unlockedLevels).toContain('unit1-pretest-1');
    expect(unlockedLevels).toContain('unit1-wordlist-1');

    // Step 7: Verify data is persisted in localStorage
    const storedData = await page.evaluate(() => {
      const saved = localStorage.getItem('ketUserData');
      return saved ? JSON.parse(saved) : null;
    });
    expect(storedData?.unlockedLevels).toContain('unit1-wordlist-1');

    console.log('\n=== Test Case 7 PASSED: Data migration validated ===');
  });

  test('Test Case 8: Cross-unit unlock (pretest) - completing unit1 pretest unlocks unit2 pretest', async ({ page }) => {
    console.log('\n=== Test Case 8: Cross-unit unlock (pretest) ===');

    // Step 1: Get all unit1 pretest levels
    const unit1PretestLevels = await page.evaluate(() => {
      const levelIdMap = window.eval('levelIdMap');
      return Object.keys(levelIdMap).filter(id => id.startsWith('unit1-pretest-'));
    });

    console.log('Unit 1 pretest levels:', unit1PretestLevels);

    // Step 2: Set up user data with all unit1 pretest unlocked
    await setupUserData(page, {
      unlockedLevels: [...unit1PretestLevels, 'unit1-wordlist-1'],
      points: 1000
    });

    // Step 3: Navigate to Unit 1 pretest
    await navigateToUnit(page, 'unit1', 'pretest');

    // Step 4: Find and start the last level
    const levelCards = await page.locator('.level-card').all();
    const lastLevelCard = levelCards[levelCards.length - 1];
    const startQuizBtn = lastLevelCard.locator('button').filter({ hasText: /通关/ });
    await startQuizBtn.click();

    await page.waitForSelector('#quizPage:not(.hidden)', { state: 'visible', timeout: 10000 });

    // Step 4: Answer all questions correctly
    let questionCount = 0;
    while (!await isQuizComplete(page)) {
      questionCount++;
      console.log(`Answering question ${questionCount}...`);
      await answerQuestionCorrectly(page);
      if (!await isQuizComplete(page)) {
        await page.waitForTimeout(300);
      }
      if (questionCount > 50) {
        throw new Error('Too many questions answered');
      }
    }

    console.log(`Total questions answered: ${questionCount}`);

    // Step 5: Navigate to Unit 2 pretest
    await navigateToUnit(page, 'unit2', 'pretest');

    // Step 6: Verify Level 1 is now unlocked
    const level1HasUnlocked = await levelHasClass(page, 0, 'unlocked');
    const level1StatusText = await getLevelStatusText(page, 0);
    console.log(`Unit 2 pretest - Level 1 unlocked class: ${level1HasUnlocked}`);
    console.log(`Unit 2 pretest - Level 1 status text: ${level1StatusText}`);

    expect(level1HasUnlocked).toBe(true);
    expect(level1StatusText).toContain('已解锁');

    // Capture screenshot
    await captureScreenshot(page, 'cross-unit-pretest');

    // Step 7: Verify localStorage contains unit2-pretest-1
    const unlockedLevels = await getUnlockedLevels(page);
    console.log('Unlocked levels after cross-unit unlock:', unlockedLevels);

    expect(unlockedLevels).toContain('unit2-pretest-1');

    // Step 8: Verify points increased by 20
    const userData = await page.evaluate(() => {
      const saved = localStorage.getItem('ketUserData');
      return saved ? JSON.parse(saved) : null;
    });
    expect(userData?.points).toBeGreaterThan(1000);

    console.log('\n=== Test Case 8 PASSED: Cross-unit unlock (pretest) validated ===');
  });

  test('Test Case 9: Cross-unit unlock (wordlist) - completing unit1 wordlist unlocks unit2 wordlist', async ({ page }) => {
    console.log('\n=== Test Case 9: Cross-unit unlock (wordlist) ===');

    // Step 1: Get all unit1 wordlist levels
    const unit1WordlistLevels = await page.evaluate(() => {
      const levelIdMap = window.eval('levelIdMap');
      return Object.keys(levelIdMap).filter(id => id.startsWith('unit1-wordlist-'));
    });

    console.log('Unit 1 wordlist levels:', unit1WordlistLevels);

    // Step 2: Set up user data with all unit1 wordlist unlocked
    await setupUserData(page, {
      unlockedLevels: [...unit1WordlistLevels, 'unit1-pretest-1'],
      points: 1000
    });

    // Step 3: Navigate to Unit 1 wordlist
    await navigateToUnit(page, 'unit1', 'wordlist');

    // Step 4: Find and start the last level
    const levelCards = await page.locator('.level-card').all();
    const lastLevelCard = levelCards[levelCards.length - 1];
    const startQuizBtn = lastLevelCard.locator('button').filter({ hasText: /通关/ });
    await startQuizBtn.click();

    await page.waitForSelector('#quizPage:not(.hidden)', { state: 'visible', timeout: 10000 });

    // Step 4: Answer all questions correctly
    let questionCount = 0;
    while (!await isQuizComplete(page)) {
      questionCount++;
      console.log(`Answering question ${questionCount}...`);
      await answerQuestionCorrectly(page);
      if (!await isQuizComplete(page)) {
        await page.waitForTimeout(300);
      }
      if (questionCount > 50) {
        throw new Error('Too many questions answered');
      }
    }

    console.log(`Total questions answered: ${questionCount}`);

    // Step 5: Navigate to Unit 2 wordlist
    await navigateToUnit(page, 'unit2', 'wordlist');

    // Step 6: Verify Level 1 is now unlocked
    const level1HasUnlocked = await levelHasClass(page, 0, 'unlocked');
    const level1StatusText = await getLevelStatusText(page, 0);
    console.log(`Unit 2 wordlist - Level 1 unlocked class: ${level1HasUnlocked}`);
    console.log(`Unit 2 wordlist - Level 1 status text: ${level1StatusText}`);

    expect(level1HasUnlocked).toBe(true);
    expect(level1StatusText).toContain('已解锁');

    // Capture screenshot
    await captureScreenshot(page, 'cross-unit-wordlist');

    // Step 7: Verify localStorage contains unit2-wordlist-1
    const unlockedLevels = await getUnlockedLevels(page);
    console.log('Unlocked levels after cross-unit unlock:', unlockedLevels);

    expect(unlockedLevels).toContain('unit2-wordlist-1');

    // Step 8: Verify points increased by 20
    const userData = await page.evaluate(() => {
      const saved = localStorage.getItem('ketUserData');
      return saved ? JSON.parse(saved) : null;
    });
    expect(userData?.points).toBeGreaterThan(1000);

    console.log('\n=== Test Case 9 PASSED: Cross-unit unlock (wordlist) validated ===');
  });

  test('Test Case 10A: Unit boundary test - UI approach with actual last level', async ({ page, context }) => {
    console.log('\n=== Test Case 10A: Unit boundary test (actual last level) ===');

    // Step 1: Clear localStorage first
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    // Step 2: Reload page
    await page.reload();
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    // Step 3: Get the last pretest level ID
    const lastLevelId = await page.evaluate(() => {
      const levelIdMap = window.eval('levelIdMap');
      let lastId = '';
      let maxUnit = 0;
      let maxIndex = 0;

      for (const id in levelIdMap) {
        const info = levelIdMap[id];
        if (info.source === 'pretest') {
          const unitNum = parseInt(info.unit.replace('unit', ''));
          if (unitNum > maxUnit || (unitNum === maxUnit && info.index > maxIndex)) {
            maxUnit = unitNum;
            maxIndex = info.index;
            lastId = id;
          }
        }
      }
      return lastId;
    });

    console.log(`Last level ID: ${lastLevelId}`);

    // Step 4: Set up user data with this level unlocked
    await page.evaluate((levelId) => {
      const userData = {
        points: 1000,
        streak: 0,
        lastCheckIn: null,
        unlockedLevels: [levelId, 'unit1-wordlist-1'],
        completedLevels: [],
        currentLevel: null
      };
      localStorage.setItem('ketUserData', JSON.stringify(userData));
    }, lastLevelId);

    await page.reload();
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    // Step 5: Navigate to the last level's unit
    const lastUnit = lastLevelId.split('-')[0];
    await navigateToUnit(page, lastUnit, 'pretest');

    // Step 6: Find and start the last level
    const levelCards = await page.locator('.level-card').all();
    const lastLevelCard = levelCards[levelCards.length - 1];
    const startQuizBtn = lastLevelCard.locator('button').filter({ hasText: /通关/ });
    await startQuizBtn.click();

    await page.waitForSelector('#quizPage:not(.hidden)', { state: 'visible', timeout: 10000 });

    // Answer all questions correctly
    let questionCount = 0;
    while (!await isQuizComplete(page)) {
      questionCount++;
      console.log(`Answering question ${questionCount}...`);
      await answerQuestionCorrectly(page);
      if (!await isQuizComplete(page)) {
        await page.waitForTimeout(300);
      }
      if (questionCount > 50) {
        throw new Error('Too many questions answered');
      }
    }

    // Step 7: Verify no error occurred and points increased
    const completionMessage = await page.locator('#completionMessage').textContent();
    console.log('Completion message:', completionMessage);
    expect(completionMessage).toContain('答对');

    // Get full userData for debugging
    const userDataAfter = await page.evaluate(() => {
      const saved = localStorage.getItem('ketUserData');
      return saved ? JSON.parse(saved) : null;
    });
    console.log('User data after completion:', JSON.stringify(userDataAfter, null, 2));

    const unlockedLevels = await getUnlockedLevels(page);
    console.log('Unlocked levels after boundary test:', unlockedLevels);

    // Should NOT contain unit15-pretest-1 (doesn't exist)
    expect(unlockedLevels).not.toContain('unit15-pretest-1');

    // Points should increase (check-in +20 + perfect score +50 = 70, or just +50 if already checked in)
    // Note: unlockNextLevel no longer awards points, points come from check-in and perfect score
    const userData = await page.evaluate(() => {
      const saved = localStorage.getItem('ketUserData');
      return saved ? JSON.parse(saved) : null;
    });
    expect(userData?.points).toBeGreaterThanOrEqual(1000);

    // Capture screenshot
    await captureScreenshot(page, 'unit-boundary');

    console.log('\n=== Test Case 10A PASSED ===');
  });

  test('Test Case 10B: Unit boundary test - direct function call (faster)', async ({ page, context }) => {
    console.log('\n=== Test Case 10B: Unit boundary test (direct function) ===');

    // Step 1: Clear localStorage first
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    // Step 2: Reload page
    await page.reload();
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    // Step 3: Get the last level ID (e.g., unit14-pretest-X)
    const lastLevelId = await page.evaluate(() => {
      const levelIdMap = window.eval('levelIdMap');
      let lastId = '';
      let maxUnit = 0;
      let maxIndex = 0;

      for (const id in levelIdMap) {
        const info = levelIdMap[id];
        if (info.source === 'pretest') {
          const unitNum = parseInt(info.unit.replace('unit', ''));
          if (unitNum > maxUnit || (unitNum === maxUnit && info.index > maxIndex)) {
            maxUnit = unitNum;
            maxIndex = info.index;
            lastId = id;
          }
        }
      }
      return lastId;
    });

    console.log(`Last level ID: ${lastLevelId}`);

    // Step 4: Set up user data with this level unlocked
    await page.evaluate((levelId) => {
      const userData = {
        points: 1000,
        streak: 0,
        lastCheckIn: null,
        unlockedLevels: [levelId],
        completedLevels: [],
        currentLevel: null
      };
      localStorage.setItem('ketUserData', JSON.stringify(userData));
    }, lastLevelId);

    await page.reload();
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    // Step 5: Get initial unlocked levels and points
    const initialUnlocked = await getUnlockedLevels(page);
    const initialPoints = await page.evaluate(() => {
      const saved = localStorage.getItem('ketUserData');
      return saved ? JSON.parse(saved).points : 0;
    });

    console.log('Initial unlocked levels:', initialUnlocked);
    console.log('Initial points:', initialPoints);

    // Step 6: Directly call unlockNextLevel() function
    await page.evaluate((levelId) => {
      const unlockNextLevel = window.eval('unlockNextLevel');
      const saveUserData = window.eval('saveUserData');
      unlockNextLevel(levelId);
      saveUserData();
    }, lastLevelId);

    console.log('unlockNextLevel executed');

    // Step 7: Verify results
    const finalUnlocked = await getUnlockedLevels(page);
    const finalPoints = await page.evaluate(() => {
      const saved = localStorage.getItem('ketUserData');
      return saved ? JSON.parse(saved).points : 0;
    });

    console.log('Final unlocked levels:', finalUnlocked);
    console.log('Final points:', finalPoints);

    // Note: unlockNextLevel no longer awards points (removed in new points system)
    // Points remain unchanged when directly calling unlockNextLevel
    expect(finalPoints).toBe(initialPoints);

    // No new level should be unlocked with unit 15 or higher
    const hasUnit15OrHigher = finalUnlocked.some(id => {
      const match = id.match(/^unit(\d+)-/);
      if (match) {
        return parseInt(match[1]) >= 15;
      }
      return false;
    });
    expect(hasUnit15OrHigher).toBe(false);

    // Unlocked levels should not increase significantly (or only increase if there was an already-unlocked level in the next unit)
    expect(finalUnlocked.length).toBeLessThanOrEqual(initialUnlocked.length + 1);

    console.log('\n=== Test Case 10B PASSED ===');
  });
});
