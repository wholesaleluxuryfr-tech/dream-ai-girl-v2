/**
 * End-to-End User Journey Tests
 *
 * Full user flow from signup to premium features
 */

import { test, expect } from '@playwright/test';

test.describe('Complete User Journey', () => {
  test('new user full flow: signup → match → chat → upgrade', async ({ page }) => {
    // 1. Landing page
    await page.goto('/');
    await expect(page).toHaveTitle(/Dream AI Girl/);

    // 2. Sign up
    await page.click('text=Créer un compte');
    await page.fill('input[name="username"]', `testuser_${Date.now()}`);
    await page.fill('input[name="email"]', `test_${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.fill('input[name="age"]', '25');
    await page.click('button[type="submit"]');

    // Should redirect to matches page
    await expect(page).toHaveURL(/\/matches/);

    // 3. Swipe and match
    await page.waitForSelector('[data-testid="swipe-card"]');
    await page.click('[data-testid="like-button"]');

    // Match modal should appear
    await expect(page.locator('text=C\'est un match!')).toBeVisible();
    await page.click('text=Envoyer un message');

    // 4. Chat
    await expect(page).toHaveURL(/\/chat\//);
    await page.fill('textarea[name="message"]', 'Salut ! Comment ça va ?');
    await page.click('[data-testid="send-button"]');

    // Message should appear
    await expect(page.locator('text=Salut ! Comment ça va ?')).toBeVisible();

    // AI response should appear
    await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ timeout: 5000 });

    // 5. Navigate to profile
    await page.click('[data-testid="nav-profile"]');
    await expect(page).toHaveURL(/\/profile/);

    // 6. View subscription page
    await page.click('text=Abonnement');
    await expect(page).toHaveURL(/\/subscription/);

    // Premium plan should be visible
    await expect(page.locator('text=Premium')).toBeVisible();
    await expect(page.locator('text=9,99€')).toBeVisible();
  });

  test('free user limitations', async ({ page }) => {
    // Login as free user
    await page.goto('/login');
    await page.fill('input[name="username"]', 'freeuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // Try to access Elite feature
    await page.goto('/create-girlfriend');

    // Should be redirected or see paywall
    await expect(page.locator('text=Fonctionnalité Elite')).toBeVisible();
  });
});

test.describe('Premium Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login as premium user
    await page.goto('/login');
    await page.fill('input[name="username"]', 'premiumuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
  });

  test('premium user can access premium features', async ({ page }) => {
    // Navigate to profile
    await page.goto('/profile');

    // Should see Premium badge
    await expect(page.locator('text=Premium')).toBeVisible();

    // Should have more tokens
    await expect(page.locator('text=/\\d+\\s+tokens/')).toBeVisible();
  });

  test('unlimited messages for premium', async ({ page }) => {
    await page.goto('/matches');

    // Send many messages (free users are limited to 50/day)
    for (let i = 0; i < 60; i++) {
      await page.fill('textarea[name="message"]', `Message ${i}`);
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(100);
    }

    // Should not see rate limit message
    await expect(page.locator('text=limite de messages')).not.toBeVisible();
  });
});

test.describe('Elite Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login as elite user
    await page.goto('/login');
    await page.fill('input[name="username"]', 'eliteuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
  });

  test('elite user can create custom girlfriend', async ({ page }) => {
    await page.goto('/create-girlfriend');

    // Step 1: Basic info
    await page.fill('input[name="name"]', 'Ma Girlfriend');
    await page.fill('input[type="range"]', '25');
    await page.click('text=Suivant');

    // Step 2: Appearance
    await page.click('[data-testid="ethnicity-french"]');
    await page.click('[data-testid="body-athletic"]');
    await page.click('text=Suivant');

    // Step 3: Personality
    await page.click('[data-testid="archetype-romantique"]');
    await page.click('text=Suivant');

    // Step 4: Preview & Create
    await expect(page.locator('text=Ma Girlfriend')).toBeVisible();
    await page.click('text=Créer ma girlfriend');

    // Should redirect to chat with new girlfriend
    await expect(page).toHaveURL(/\/chat\//);
  });
});

test.describe('Gamification', () => {
  test('user earns XP for actions', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // Get initial XP
    await page.goto('/profile');
    const initialXP = await page.locator('[data-testid="xp-value"]').textContent();

    // Perform action (send message)
    await page.goto('/chat/sophie_25');
    await page.fill('textarea[name="message"]', 'Test message for XP');
    await page.click('[data-testid="send-button"]');

    // Check XP increased
    await page.goto('/profile');
    const newXP = await page.locator('[data-testid="xp-value"]').textContent();
    expect(parseInt(newXP!)).toBeGreaterThan(parseInt(initialXP!));
  });

  test('daily reward streak', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/profile');

    // Daily reward modal should appear
    await expect(page.locator('text=Récompense quotidienne')).toBeVisible({ timeout: 3000 });
    await page.click('text=Récupérer');

    // Should receive tokens
    await expect(page.locator('text=tokens reçus')).toBeVisible();
  });
});

test.describe('PWA Features', () => {
  test('app can be installed as PWA', async ({ page }) => {
    await page.goto('/');

    // Install prompt should appear
    await expect(page.locator('[data-testid="install-prompt"]')).toBeVisible({ timeout: 5000 });
  });

  test('app works offline', async ({ context, page }) => {
    await page.goto('/matches');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Navigate to cached page
    await page.goto('/offline');

    // Should show offline page
    await expect(page.locator('text=Mode Hors Ligne')).toBeVisible();
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('mobile navigation works', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // Bottom nav should be visible
    await expect(page.locator('[data-testid="bottom-nav"]')).toBeVisible();

    // Navigate between tabs
    await page.click('[data-testid="nav-messages"]');
    await expect(page).toHaveURL(/\/conversations/);

    await page.click('[data-testid="nav-gallery"]');
    await expect(page).toHaveURL(/\/gallery/);

    await page.click('[data-testid="nav-profile"]');
    await expect(page).toHaveURL(/\/profile/);
  });

  test('swipe gestures work on mobile', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/matches');

    const card = page.locator('[data-testid="swipe-card"]');

    // Swipe right
    await card.dragTo(page.locator('body'), {
      sourcePosition: { x: 50, y: 50 },
      targetPosition: { x: 300, y: 50 },
    });

    // Match modal should appear
    await expect(page.locator('text=C\'est un match!')).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('page load time is under 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
  });

  test('chat messages load quickly', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    const startTime = Date.now();
    await page.goto('/chat/sophie_25');
    await page.waitForSelector('[data-testid="message"]');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(1000);
  });
});

test.describe('Security', () => {
  test('cannot access protected routes without auth', async ({ page }) => {
    await page.goto('/profile');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('XSS protection works', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.goto('/chat/sophie_25');

    // Try to inject script
    await page.fill('textarea[name="message"]', '<script>alert("XSS")</script>');
    await page.click('[data-testid="send-button"]');

    // Script should be escaped
    const message = await page.locator('[data-testid="user-message"]').last().textContent();
    expect(message).toContain('<script>');
    expect(message).not.toContain('alert');
  });
});
