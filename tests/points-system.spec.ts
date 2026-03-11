import { test, expect, Page } from '@playwright/test';

import { test } from '@playwright/test';
const httpUrl = 'http://localhost:8080/ket-learning.html';

/**
 * Helper function to get user data from localStorage
 */
async function getUserData(page: Page): Promise<any> {
  return await page.evaluate(() => {
    const saved = localStorage.getItem('ketUserData');
    return saved ? JSON.parse(saved) : null;
  });
}

/**
 * Helper function to set user data in localStorage
 */
async function setUserData(page: Page, data: any): Promise<void> {
  await page.evaluate((userData) => {
    localStorage.setItem('ketUserData', JSON.stringify(userData));
  }, data);
}

/**
 * Get today's date string (YYYY-MM-DD)
 */
function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get yesterday's date string (YYYY-MM-DD)
 */
function getYesterdayString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get date string for N days ago
 */
function getDaysAgoString(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if quiz is complete
 */
async function isQuizComplete(page: Page): Promise<boolean> {
  return await page.locator('#completionPage').isVisible();
}

/**
 * Get the correct answer for current question
 */
async function getCorrectAnswer(page: Page): Promise<string> {
  await page.waitForSelector('#quizQuestion', { state: 'visible', timeout: 10000 });

  const question = await page.locator('#quizQuestion').textContent() || '';

  const correctAnswer = await page.evaluate((questionText) => {
    const levelIdMap = window.eval('levelIdMap');
    const currentLevelId = window.eval('currentLevelId');

    if (!levelIdMap || !currentLevelId) return null;

    const levelInfo = levelIdMap[currentLevelId];
    if (!levelInfo || !levelInfo.words) return null;

    const word = levelInfo.words.find((w: any) =>
      w['单词'] === questionText || w['中文含义'] === questionText
    );

    if (!word) return null;

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
 * Answer a quiz question correctly
 */
async function answerQuestionCorrectly(page: Page): Promise<boolean> {
  const correctAnswer = await getCorrectAnswer(page);
  await page.waitForSelector('.quiz-option', { state: 'visible', timeout: 5000 });

  const optionBtn = page.locator('.quiz-option').filter({ hasText: correctAnswer }).first();
  await optionBtn.waitFor({ state: 'attached', timeout: 5000 });
  await optionBtn.click();

  const complete = await isQuizComplete(page);

  if (!complete) {
    await page.waitForTimeout(500);
    const nextBtnVisible = await page.getByRole('button', { name: '继续' }).isVisible();
    if (nextBtnVisible) {
      await clickNextQuestionButton(page);
    }
  }

  return complete;
}

/**
 * Answer a quiz question incorrectly
 */
async function answerQuestionIncorrectly(page: Page): Promise<boolean> {
  const correctAnswer = await getCorrectAnswer(page);
  const options = await page.locator('.quiz-option').allTextContents();
  const wrongOption = options.find(opt => opt !== correctAnswer);

  if (!wrongOption) throw new Error('No wrong option found');

  // Use .first() to handle strict mode violation when multiple options match
  const optionLocator = page.locator('.quiz-option').filter({ hasText: wrongOption }).first();
  await optionLocator.click();

  return await isQuizComplete(page);
}

/**
 * Click the next question button after wrong answer
 */
async function clickNextQuestionButton(page: Page): Promise<void> {
  const nextBtn = page.getByRole('button', { name: '继续' });
  await nextBtn.click();
  await page.waitForSelector('#feedback.hidden', { state: 'attached', timeout: 5000 });
  await page.waitForSelector('.quiz-option', { state: 'visible', timeout: 5000 });
  await page.waitForTimeout(300);
}

/**
 * Navigate to unit and start first level quiz
 */
async function startFirstLevelQuiz(page: Page): Promise<void> {
  // Navigate to Unit 1 pretest
  const firstPretestBtn = page.locator('.pretest-btn').first();
  await firstPretestBtn.click();
  await page.waitForSelector('#levelSelectPage:not(.hidden)', { state: 'visible', timeout: 10000 });
  await page.waitForSelector('.level-card', { state: 'visible', timeout: 10000 });

  // Start first level quiz
  const firstLevelCard = page.locator('.level-card').first();
  const startQuizBtn = firstLevelCard.locator('button').filter({ hasText: /通关/ });
  await startQuizBtn.click();
  await page.waitForSelector('#quizPage:not(.hidden)', { state: 'visible', timeout: 10000 });
}

test.describe('Points System', () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async ({ page, context }) => {
    // Clear cookies and navigate to blank page first
    await context.clearCookies();
    await page.goto('about:blank');

    // Navigate to the app
    await page.goto(httpUrl);
    await page.waitForLoadState('load', { timeout: 10000 });
    await page.waitForSelector('#homePage:not(.hidden)', { state: 'visible', timeout: 10000 });
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });
  });

  // TC1 and TC2 test the first check-in scenario
  test('TC1: 80% accuracy triggers first check-in (+20 points)', async ({ page }) => {
    console.log('\n=== TC1: 80% accuracy, first check-in ===');

    // Clear and setup fresh data
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    // Setup: 1000 points, not checked in
    await setUserData(page, {
      points: 1000,
      streak: 0,
      lastCheckIn: null,
      unlockedLevels: ['unit1-pretest-1'],
      completedLevels: [],
      currentLevel: null
    });
    await page.reload();
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    const initialData = await getUserData(page);
    console.log('Initial points:', initialData.points);
    console.log('Initial lastCheckIn:', initialData.lastCheckIn);

    // Start quiz and complete with 12/15 correct (80%)
    await startFirstLevelQuiz(page);

    // Answer 3 wrong, then all correct
    let wrongCount = 0;
    let questionCount = 0;

    while (!await isQuizComplete(page)) {
      questionCount++;
      if (wrongCount < 3) {
        await answerQuestionIncorrectly(page);
        wrongCount++;
        if (!await isQuizComplete(page)) {
          await clickNextQuestionButton(page);
        }
      } else {
        await answerQuestionCorrectly(page);
      }
      if (questionCount > 50) throw new Error('Too many questions');
    }

    console.log(`Quiz completed. Questions: ${questionCount}, Wrong: ${wrongCount}`);

    // Verify results
    const finalData = await getUserData(page);
    console.log('Final points:', finalData.points);
    console.log('Final lastCheckIn:', finalData.lastCheckIn);
    console.log('Final streak:', finalData.streak);

    // Points should increase by 20 (check-in bonus)
    expect(finalData.points).toBe(1000 + 20);
    expect(finalData.lastCheckIn).toBe(getTodayString());
    expect(finalData.streak).toBe(1);

    console.log('\n=== TC1 PASSED ===');
  });

  // TC2 tests perfect score with check-in
  test('TC2: 100% accuracy triggers check-in + perfect bonus (+70 points)', async ({ page }) => {
    console.log('\n=== TC2: 100% accuracy, first check-in ===');

    // Clear and setup fresh data
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    // Setup: 1000 points, not checked in
    await setUserData(page, {
      points: 1000,
      streak: 0,
      lastCheckIn: null,
      unlockedLevels: ['unit1-pretest-1'],
      completedLevels: [],
      currentLevel: null
    });
    await page.reload();
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    const initialData = await getUserData(page);
    console.log('Initial points:', initialData.points);

    // Start quiz and complete with all correct
    await startFirstLevelQuiz(page);

    let questionCount = 0;
    while (!await isQuizComplete(page)) {
      questionCount++;
      await answerQuestionCorrectly(page);
      if (questionCount > 50) throw new Error('Too many questions');
    }

    console.log(`Quiz completed with all correct. Questions: ${questionCount}`);

    // Verify results
    const finalData = await getUserData(page);
    console.log('Final points:', finalData.points);
    console.log('Final lastCheckIn:', finalData.lastCheckIn);
    console.log('Final streak:', finalData.streak);

    // Points should increase by 70 (20 check-in + 50 perfect score bonus)
    expect(finalData.points).toBe(1000 + 70);
    expect(finalData.lastCheckIn).toBe(getTodayString());
    expect(finalData.streak).toBe(1);

    console.log('\n=== TC2 PASSED ===');
  });

  // TC3 tests already checked in scenario (perfect score still gets bonus)
  test('TC3: 100% accuracy, already checked in today (+50 points)', async ({ page }) => {
    console.log('\n=== TC3: 100% accuracy, already checked in today ===');

    // Clear and setup with already checked in
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    // Setup: 1000 points, already checked in today
    await setUserData(page, {
      points: 1000,
      streak: 5,
      lastCheckIn: getTodayString(),
      unlockedLevels: ['unit1-pretest-1', 'unit1-pretest-2'],
      completedLevels: [],
      currentLevel: null
    });
    await page.reload();
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    const initialData = await getUserData(page);
    console.log('Initial points:', initialData.points);
    console.log('Initial lastCheckIn:', initialData.lastCheckIn);

    // Start quiz and complete with all correct
    await startFirstLevelQuiz(page);

    let questionCount = 0;
    while (!await isQuizComplete(page)) {
      questionCount++;
      await answerQuestionCorrectly(page);
      if (questionCount > 50) throw new Error('Too many questions');
    }

    console.log(`Quiz completed with all correct. Questions: ${questionCount}`);

    // Verify results
    const finalData = await getUserData(page);
    console.log('Final points:', finalData.points);
    console.log('Final lastCheckIn:', finalData.lastCheckIn);

    // Points should increase by 50 (perfect score bonus only, no check-in)
    expect(finalData.points).toBe(1000 + 50);
    expect(finalData.lastCheckIn).toBe(getTodayString());
    expect(finalData.streak).toBe(5); // Streak unchanged

    console.log('\n=== TC3 PASSED ===');
  });

  // TC4 tests below 80% accuracy (no check-in)
  test('TC4: Below 80% accuracy, no check-in', async ({ page }) => {
    console.log('\n=== TC4: Below 80% accuracy ===');

    // Clear and setup fresh data
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    // Setup: 1000 points, not checked in
    await setUserData(page, {
      points: 1000,
      streak: 0,
      lastCheckIn: null,
      unlockedLevels: ['unit1-pretest-1'],
      completedLevels: [],
      currentLevel: null
    });
    await page.reload();
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    const initialData = await getUserData(page);
    console.log('Initial points:', initialData.points);

    // Start quiz and complete with 10/15 correct (67%)
    await startFirstLevelQuiz(page);

    // Answer 5 wrong
    let wrongCount = 0;
    let questionCount = 0;
    const targetWrong = 5;

    while (!await isQuizComplete(page)) {
      questionCount++;
      if (wrongCount < targetWrong) {
        await answerQuestionIncorrectly(page);
        wrongCount++;
        if (!await isQuizComplete(page)) {
          await clickNextQuestionButton(page);
        }
      } else {
        await answerQuestionCorrectly(page);
      }
      if (questionCount > 50) throw new Error('Too many questions');
    }

    console.log(`Quiz completed. Questions: ${questionCount}, Wrong: ${wrongCount}`);

    // Verify results
    const finalData = await getUserData(page);
    console.log('Final points:', finalData.points);
    console.log('Final lastCheckIn:', finalData.lastCheckIn);

    // Points should NOT change (no check-in, no perfect bonus)
    expect(finalData.points).toBe(1000);
    expect(finalData.lastCheckIn).toBeNull();

    console.log('\n=== TC4 PASSED ===');
  });

  // TC5 tests 7-day streak bonus
  test('TC5: 7-day streak bonus (+40 points)', async ({ page }) => {
    console.log('\n=== TC5: 7-day streak bonus ===');

    // Clear and setup with 6-day streak
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    // Setup: 1000 points, 6 consecutive days, last check-in yesterday
    await setUserData(page, {
      points: 1000,
      streak: 6,
      lastCheckIn: getYesterdayString(),
      unlockedLevels: ['unit1-pretest-1'],
      completedLevels: [],
      currentLevel: null
    });
    await page.reload();
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    const initialData = await getUserData(page);
    console.log('Initial points:', initialData.points);
    console.log('Initial streak:', initialData.streak);

    // Start quiz and complete with 80%+ accuracy
    await startFirstLevelQuiz(page);

    let wrongCount = 0;
    let questionCount = 0;
    const targetWrong = 3;

    while (!await isQuizComplete(page)) {
      questionCount++;
      if (wrongCount < targetWrong) {
        await answerQuestionIncorrectly(page);
        wrongCount++;
        if (!await isQuizComplete(page)) {
          await clickNextQuestionButton(page);
        }
      } else {
        await answerQuestionCorrectly(page);
      }
      if (questionCount > 50) throw new Error('Too many questions');
    }

    console.log(`Quiz completed. Questions: ${questionCount}, Wrong: ${wrongCount}`);

    // Verify results
    const finalData = await getUserData(page);
    console.log('Final points:', finalData.points);
    console.log('Final streak:', finalData.streak);

    // Points should increase by 40 (20 base + 20 streak bonus for 7 days)
    expect(finalData.points).toBe(1000 + 40);
    expect(finalData.streak).toBe(7);

    console.log('\n=== TC5 PASSED ===');
  });

  // TC6 tests streak broken penalty
  test('TC6: Streak broken penalty', async ({ page }) => {
    console.log('\n=== TC6: Streak broken penalty ===');

    // Clear and setup with broken streak
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    // Setup: 100 points, 3 day streak, last check-in 2 days ago (streak broken)
    await setUserData(page, {
      points: 100,
      streak: 3,
      lastCheckIn: getDaysAgoString(2),
      unlockedLevels: ['unit1-pretest-1'],
      completedLevels: [],
      currentLevel: null
    });
    await page.reload();
    await page.waitForSelector('.units-grid', { state: 'visible', timeout: 10000 });

    const initialData = await getUserData(page);
    console.log('Initial points:', initialData.points);
    console.log('Initial streak:', initialData.streak);
    console.log('Initial lastCheckIn:', initialData.lastCheckIn);
    console.log('Today:', getTodayString());
    console.log('Yesterday:', getYesterdayString());

    // Start quiz and complete with 80%+ accuracy
    await startFirstLevelQuiz(page);

    let wrongCount = 0;
    let questionCount = 0;
    const targetWrong = 3;

    while (!await isQuizComplete(page)) {
      questionCount++;
      if (wrongCount < targetWrong) {
        await answerQuestionIncorrectly(page);
        wrongCount++;
        if (!await isQuizComplete(page)) {
          await clickNextQuestionButton(page);
        }
      } else {
        await answerQuestionCorrectly(page);
      }
      if (questionCount > 50) throw new Error('Too many questions');
    }

    console.log(`Quiz completed. Questions: ${questionCount}, Wrong: ${wrongCount}`);

    // Verify results
    const finalData = await getUserData(page);
    console.log('Final points:', finalData.points);
    console.log('Final streak:', finalData.streak);
    console.log('Final lastCheckIn:', finalData.lastCheckIn);

    // Points: 100 - 50 (penalty) + 20 (check-in) = 70
    expect(finalData.points).toBe(100 - 50 + 20);
    expect(finalData.streak).toBe(1);
    expect(finalData.lastCheckIn).toBe(getTodayString());

    console.log('\n=== TC6 PASSED ===');
  });
});
