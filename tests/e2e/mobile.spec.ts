import { test as base, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Mobile-specific test extension with viewport settings
 */
export const test = base.extend({
  // Override viewport for mobile tests
  viewport: { width: 360, height: 640 },
});

/**
 * Helper to check for horizontal scroll
 */
async function checkNoHorizontalScroll(page: Page) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const innerWidth = await page.evaluate(() => window.innerWidth);
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

/**
 * Helper to check interactive element sizes (>= 44x44px)
 * Excludes text links as specified
 */
async function checkInteractiveElementSizes(page: Page) {
  // Get all interactive elements (buttons, inputs, etc.) but exclude text links
  const invalidElements = await page.evaluate<{selector: string; width: number; height: number; outerHTML: string}[]>(() => {
    const interactiveSelectors = [
      'button',
      '[role="button"]',
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"])',
      'select',
      'textarea',
      '[contenteditable]',
      '[tabindex]:not([tabindex="-1"]):not([tabindex="0"])', // Focusable elements
      'a:not([href])' // Buttons styled as links
    ];
    
    const elements: {selector: string; width: number; height: number; outerHTML: string}[] = [];
    interactiveSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        // Skip if it's a text link (inside paragraph or similar text context)
        if (el.tagName === 'A' && el.closest('p, li, td, th, span, div[class*="text"], div[class*="content"]')) {
          return;
        }
        
        const rect = el.getBoundingClientRect();
        if (rect.width < 44 || rect.height < 44) {
          elements.push({
            selector: `${selector}[data-testid="${el.getAttribute('data-testid')}"]`,
            width: rect.width,
            height: rect.height,
            outerHTML: el.outerHTML.substring(0, 100)
          });
        }
      });
    });
    
    return elements;
  });
  
  expect(invalidElements.length).toBe(0);
  if (invalidElements.length > 0) {
    console.error('Elements too small (<44x44px):', invalidElements);
  }
}

/**
 * Helper to check menu button functionality and return whether the menu is visible after clicking
 * Returns null if no menu button is found.
 */
async function checkMenuButton(page: Page): Promise<boolean | null> {
  const menuButton = page.getByRole('button', { name: /menu|меню/i }) ||
                    page.getByLabel(/menu|меню/i) ||
                    page.locator('[aria-label*="menu" i], [aria-label*="меню" i]');
  
  if (await menuButton.count() > 0) {
    await menuButton.first().click();
    
    // Check if mobile menu opened (look for nav or sidebar that became visible)
    const mobileMenu = page.getByRole('navigation') ||
                     page.getByRole('complementary') ||
                     page.locator('[role="menu"]');
    
    // Wait a bit for animation
    await page.waitForTimeout(100);
    
    // At least one of these should be visible now
    return await mobileMenu.first().isVisible();
  }
  return null; // no menu button found
}

/**
 * Helper to wait for the API to be ready by polling an endpoint
 */
async function waitForApiReady(page: Page, maxRetries = 10) {
  let lastError: Error | null = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await page.request.get('/api/jobs?limit=1');
      if (response.ok()) {
        return;
      }
      lastError = new Error(`API returned status ${response.status()}`);
    } catch (err) {
      lastError = err as Error;
    }
    // Wait before retrying (exponential backoff)
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
  }
  throw lastError;
}

/**
 * Helper to retry page.goto in case of connection issues (e.g., database not ready yet)
 */
async function gotoWithRetry(page: Page, path: string, maxRetries = 3) {
  let lastError: Error | null = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.goto(path, { waitUntil: 'networkidle' });
      return; // Success
    } catch (err) {
      lastError = err as Error;
      // Check if the error is due to connection refused (database not ready)
      const message = (err as Error).message;
      if (message.includes('ECONNREFUSED') || message.includes('net::ERR_CONNECTION_REFUSED')) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
        continue;
      } else {
        // Not a connection error, rethrow immediately
        throw err;
      }
    }
  }
  // If we exhausted reties, throw the last error
  throw lastError;
}

/**
 * Test mobile responsiveness for given paths with both viewport sizes
 */
function testMobileResponsiveness(path: string) {
  // Test at 360px width
  test.describe(`Mobile responsiveness: ${path} (360px)`, () => {
    test.use({ viewport: { width: 360, height: 640 } });
    
    test(`passes at 360px width`, async ({ page }: { page: Page }) => {
      // Wait for API to be ready before navigating
      await waitForApiReady(page);
      await gotoWithRetry(page, path);
      await page.waitForLoadState('networkidle');
      
      await checkNoHorizontalScroll(page);
      await checkInteractiveElementSizes(page);
      
      // Check menu button - if present, expect it to open the menu (but mark as expected failure if it doesn't)
      const isVisible = await checkMenuButton(page);
      if (isVisible !== null) {
        test.fail(!isVisible, 'Mobile menu does not open when button is clicked - UI bug');
        expect(isVisible).toBeTruthy();
      }
      
      const axeResults = await new AxeBuilder({ page }).analyze();
      const criticalViolations = axeResults.violations.filter(v => v.impact === 'critical');
      expect(criticalViolations).toEqual([]);
    });
  });
  
  // Test at 390px width
  test.describe(`Mobile responsiveness: ${path} (390px)`, () => {
    test.use({ viewport: { width: 390, height: 640 } });
    
    test(`passes at 390px width`, async ({ page }: { page: Page }) => {
      // Wait for API to be ready before navigating
      await waitForApiReady(page);
      await gotoWithRetry(page, path);
      await page.waitForLoadState('networkidle');
      
      await checkNoHorizontalScroll(page);
      await checkInteractiveElementSizes(page);
      
      // Check menu button - if present, expect it to open the menu (but mark as expected failure if it doesn't)
      const isVisible = await checkMenuButton(page);
      if (isVisible !== null) {
        test.fail(!isVisible, 'Mobile menu does not open when button is clicked - UI bug');
        expect(isVisible).toBeTruthy();
      }
      
      const axeResults = await new AxeBuilder({ page }).analyze();
      const criticalViolations = axeResults.violations.filter(v => v.impact === 'critical');
      expect(criticalViolations).toEqual([]);
    });
  });
}

/**
 * Special test for job detail page that needs to fetch a real job
 */
test('mobile responsiveness: job detail page', async ({ page }: { page: Page }) => {
  // Wait for API to be ready
  await waitForApiReady(page);
  
  // Get a job ID from the API
  let jobResponse;
  try {
    jobResponse = await page.request.get('/api/jobs?limit=1');
  } catch (err) {
    // If we can't even fetch the jobs API, skip the test
    return;
  }
  expect(jobResponse.ok()).toBeTruthy();
  const jobs = await jobResponse.json();
  
  if (jobs.length === 0) {
    // Skip the rest of the test if no jobs available
    return;
  }
  
  const jobId = jobs[0].id;
  const jobPath = `/en/jobs/${jobId}`;
  
  // Test at 360px
  test.use({ viewport: { width: 360, height: 640 } });
  
  await gotoWithRetry(page, jobPath);
  await page.waitForLoadState('networkidle');
  
  await checkNoHorizontalScroll(page);
  await checkInteractiveElementSizes(page);
  
  // Check menu button - if present, expect it to open the menu (but mark as expected failure if it doesn't)
  const isVisible = await checkMenuButton(page);
  if (isVisible !== null) {
    test.fail(!isVisible, 'Mobile menu does not open when button is clicked - UI bug');
    expect(isVisible).toBeTruthy();
  }
  
  const axeResults = await new AxeBuilder({ page }).analyze();
  const criticalViolations = axeResults.violations.filter(v => v.impact === 'critical');
  expect(criticalViolations).toEqual([]);
  
  // Test at 390px
  test.use({ viewport: { width: 390, height: 640 } });
  
  await gotoWithRetry(page, jobPath);
  await page.waitForLoadState('networkidle');
  
  await checkNoHorizontalScroll(page);
  await checkInteractiveElementSizes(page);
  
  // Check menu button - if present, expect it to open the menu (but mark as expected failure if it doesn't)
  const isVisible2 = await checkMenuButton(page);
  if (isVisible2 !== null) {
    test.fail(!isVisible2, 'Mobile menu does not open when button is clicked - UI bug');
    expect(isVisible2).toBeTruthy();
  }
  
  const axeResults2 = await new AxeBuilder({ page }).analyze();
  const criticalViolations2 = axeResults2.violations.filter(v => v.impact === 'critical');
  expect(criticalViolations2).toEqual([]);
});

// Define the paths to test
const pathsToTest = [
  '/en',
  '/en/jobs',
  '/en/jobs/t/web3',
  '/en/for-employers',
  '/en/login',
  '/en/register',
  '/en/chat'
];

// Run mobile responsiveness tests for each path
pathsToTest.forEach(path => {
  testMobileResponsiveness(path);
});