/**
 * E2E Tests for Telegram Mini App
 * Tests mini app user flows in simulated Telegram environment
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

test.describe('Telegram Mini App E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Telegram WebApp environment
    await page.addInitScript(() => {
      (window as any).Telegram = {
        WebApp: {
          initData: 'query_id=123&user=%7B%22id%22%3A123456%2C%22first_name%22%3A%22Test%22%7D',
          initDataUnsafe: {
            user: { id: 123456, first_name: 'Test', username: 'testuser' }
          },
          ready: () => {},
          expand: () => {},
          close: () => {},
          BackButton: {
            show: () => {},
            hide: () => {},
            onClick: (cb: Function) => {}
          },
          MainButton: {
            show: () => {},
            hide: () => {},
            setText: (text: string) => {},
            onClick: (cb: Function) => {},
            enable: () => {},
            disable: () => {}
          },
          HapticFeedback: {
            impactOccurred: (style: string) => {},
            notificationOccurred: (type: string) => {}
          }
        }
      };
    });
  });

  test('should load Telegram dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/telegram`);
    
    // Check welcome message
    await expect(page.locator('text=Welcome')).toBeVisible();
    await expect(page.locator('text=Your Celora Wallet')).toBeVisible();
  });

  test('should display total balance card', async ({ page }) => {
    await page.goto(`${BASE_URL}/telegram`);
    
    const balanceCard = page.locator('text=Total Balance').locator('..');
    await expect(balanceCard).toBeVisible();
  });

  test('should navigate to wallet overview', async ({ page }) => {
    await page.goto(`${BASE_URL}/telegram`);
    
    // Click View Details
    await page.click('text=View Details');
    
    // Should navigate to wallet page
    await expect(page).toHaveURL(`${BASE_URL}/telegram/wallet`);
    await expect(page.locator('h1', { hasText: 'Wallets' })).toBeVisible();
  });

  test('should navigate to send page', async ({ page }) => {
    await page.goto(`${BASE_URL}/telegram`);
    
    // Click Send button
    await page.click('text=/Send/i');
    
    // Should navigate to send page
    await expect(page).toHaveURL(/\/telegram\/wallet\/send/);
    await expect(page.locator('h1', { hasText: 'Send' })).toBeVisible();
  });

  test('should display send form', async ({ page }) => {
    await page.goto(`${BASE_URL}/telegram/wallet/send`);
    await page.waitForSelector('h1:has-text("Send")');
    
    // Check form fields
    await expect(page.locator('input[placeholder*="bruker" i], input[placeholder*="adresse" i]')).toBeVisible();
    await expect(page.locator('input[type="number"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Send$/i })).toBeVisible();
  });

  test('should validate send form', async ({ page }) => {
    await page.goto(`${BASE_URL}/telegram/wallet/send`);
    
    // Try to send without data
    await page.click('text=Send');
    
    // Should show error
    await expect(page.locator('text=/mottaker.*beløp/i')).toBeVisible({ timeout: 2000 });
  });

  test('should fill and attempt to send', async ({ page }) => {
    await page.goto(`${BASE_URL}/telegram/wallet/send`);
    
    // Fill form
    await page.fill('input[placeholder*="bruker" i], input[placeholder*="adresse" i]', '@testuser');
    await page.fill('input[type="number"]', '0.5');
    
    // Click send
    await page.click('text=Send');
    
    // Should stay on send page (shows status or error asynchronously)
    await expect(page).toHaveURL(/\/telegram\/wallet\/send/);
  });

  test('should navigate to receive page', async ({ page }) => {
    await page.goto(`${BASE_URL}/telegram`);
    
    // Click Receive button
    await page.click('text=Receive');
    
    // Should navigate to receive page
    await expect(page).toHaveURL(/\/telegram\/wallet\/receive/);
    await expect(page.locator('h1', { hasText: 'Receive' })).toBeVisible();
  });

  test('should display QR code on receive page', async ({ page }) => {
    await page.goto(`${BASE_URL}/telegram/wallet/receive`);
    await page.waitForSelector('h1:has-text("Receive")');
    
    // Either QR is present or empty state shown
    const qrCode = page.locator('div.bg-slate-800 svg').first();
    const emptyState = page.locator('text=/Ingen wallet/i');
    if (await qrCode.count()) {
      await expect(qrCode).toBeVisible();
      await expect(page.locator('text=/[1-9A-HJ-NP-Za-km-z]{32,44}/')).toBeVisible();
    } else {
      await expect(emptyState).toBeVisible();
    }
  });

  test('should copy address on receive page', async ({ page }) => {
    await page.goto(`${BASE_URL}/telegram/wallet/receive`);
    
    // Click copy button
    await page.click('text=Kopier');
    
    // Should trigger haptic (can't test clipboard in headless)
    // Just verify button click works
    await expect(page.locator('text=Kopier')).toBeVisible();
  });

  test('should navigate to cards page', async ({ page }) => {
    await page.goto(`${BASE_URL}/telegram`);
    
    // Click Cards button
    await page.click('text=Cards');
    
    // Should navigate to cards page
    await expect(page).toHaveURL(`${BASE_URL}/telegram/cards`);
  });

  test('should navigate to settings', async ({ page }) => {
    await page.goto(`${BASE_URL}/telegram`);
    
    // Click Settings button
    await page.click('text=Settings');
    
    // Should navigate to settings
    await expect(page).toHaveURL(`${BASE_URL}/telegram/settings`);
  });

  test('should show holdings list', async ({ page }) => {
    await page.goto(`${BASE_URL}/telegram/wallet`);
    
    // Should display wallet list or empty state
    const walletsHeading = page.getByRole('heading', { name: /Wallets/i });
    await expect(walletsHeading).toBeVisible();
  });

  test('should refresh balance', async ({ page }) => {
    await page.goto(`${BASE_URL}/telegram/wallet`);
    
    // Click refresh button
    await page.click('text=🔄 Refresh');
    
    // Should trigger refresh (loading state)
    // Just verify button is clickable
    await expect(page.locator('text=Refresh')).toBeVisible();
  });

  test('should handle back navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/telegram`);
    await page.click('text=/Send/i');
    await expect(page).toHaveURL(/\/telegram\/wallet\/send/);

    // Back should return to dashboard
    await page.goBack();
    await expect(page).toHaveURL(/\/telegram$/);
  });

  test('should display empty wallet state', async ({ page }) => {
    // Mock API to return empty holdings
    await page.route('**/api/wallet/summary', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalBalance: 0,
          holdings: [],
          currency: 'USD'
        })
      });
    });
    
    await page.goto(`${BASE_URL}/telegram/wallet`);
    
    // Should show empty state
    await expect(page.locator('text=/No wallets found|Ingen wallet/i')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/wallet/summary', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    await page.goto(`${BASE_URL}/telegram`);
    
    // Should handle error (might show 0 balance or error message)
    // Just verify page loads
    await expect(page.getByRole('heading', { name: /Celora Wallet|Wallet/i })).toBeVisible();
  });
});
