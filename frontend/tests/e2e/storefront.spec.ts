import { test, expect } from '@playwright/test';

// Simple smoke test that intercepts API responses so it does not require backend
test('storefront shows products and initiates checkout', async ({ page }) => {
  await page.route('**/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'p1', name: 'Test Prod', price: 3.5, description: 'd', license: true },
      ]),
    });
  });

  await page.route('**/checkout/create-session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      // don't return a redirect URL in test to avoid real navigation
      body: JSON.stringify({}),
    });
  });

  await page.goto('http://localhost:5173');
  page.on('console', (m) => console.log('PAGE:', m.text()));
  page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
  page.on('request', (r) => console.log('REQ:', r.method(), r.url()));
  page.on('response', (r) => console.log('RES:', r.status(), r.url()));
  await page.waitForRequest('**/products');
  await expect(page.getByText('Test Prod', { timeout: 10000 })).toBeVisible();
  // prepare to capture the checkout response, then click
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes('/checkout/create-session') && response.request().method() === 'POST',
    { timeout: 5000 }
  );
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /Buy/.test(b.textContent || ''));
    if (btn) btn.click();
  });
  const res = await responsePromise;
  expect(res.ok()).toBeTruthy();
});
