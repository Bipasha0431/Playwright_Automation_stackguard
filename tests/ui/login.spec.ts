// spec: specs/ui/login.md

import { test, expect } from '../../fixtures';
import { MISMATCH_ERROR } from '../../pages/LoginPage';
import { PASSWORD, USERS } from '../../utils/users';

test.describe('Login Page', () => {
  test('SPEC-LOGIN-001 standard_user signs in', async ({ loginPage, inventoryPage }) => {
    // 1. Open the login page
    await loginPage.goto();

    // 2. Enter username standard_user and password secret_sauce
    // 3. Click Login
    await loginPage.login(USERS.standard);

    // Expected: URL is /inventory.html, Products page loads with product items, no error
    await inventoryPage.expectLoaded();
    await expect(inventoryPage.items).not.toHaveCount(0);
    await expect(loginPage.errorBanner).toHaveCount(0);
  });

  test('SPEC-LOGIN-002 locked_out_user is rejected', async ({ loginPage }) => {
    // 1. Open the login page
    await loginPage.goto();

    // 2. Enter username locked_out_user and password secret_sauce
    // 3. Click Login
    await loginPage.login(USERS.lockedOut);

    // Expected: exact error shown, user stays on the login page
    await loginPage.expectError('Epic sadface: Sorry, this user has been locked out.');
    await loginPage.expectOnLoginPage();
  });

  test('SPEC-LOGIN-003 Wrong credentials are rejected', async ({ loginPage }) => {
    const attempts = [
      { label: 'wrong password', username: USERS.standard, password: 'wrong_pass' },
      { label: 'wrong username', username: 'wrong_user', password: PASSWORD },
      { label: 'both wrong', username: 'wrong_user', password: 'wrong_pass' },
    ];

    for (const attempt of attempts) {
      await test.step(attempt.label, async () => {
        // 1. Open the login page (fresh session for each attempt)
        await loginPage.startFreshSession();

        // 2. Enter the credentials and click Login
        await loginPage.login(attempt.username, attempt.password);

        // Expected: same generic error, user stays on the login page
        await loginPage.expectError(MISMATCH_ERROR);
        await loginPage.expectOnLoginPage();
      });
    }
  });

  test('SPEC-LOGIN-004 Required fields are validated in order', async ({ loginPage }) => {
    const attempts = [
      { label: 'empty username', username: '', password: PASSWORD, error: 'Epic sadface: Username is required' },
      { label: 'empty password', username: USERS.standard, password: '', error: 'Epic sadface: Password is required' },
      { label: 'both empty', username: '', password: '', error: 'Epic sadface: Username is required' },
    ];

    for (const attempt of attempts) {
      await test.step(attempt.label, async () => {
        // 1. Open the login page (fresh session for each attempt)
        await loginPage.startFreshSession();

        // 2. Fill only the fields the case needs and click Login
        await loginPage.login(attempt.username, attempt.password);

        // Expected: the matching required-field error, user stays on the login page
        await loginPage.expectError(attempt.error);
        await loginPage.expectOnLoginPage();
      });
    }
  });

  test('SPEC-LOGIN-005 Error banner can be dismissed', async ({ loginPage, inventoryPage }) => {
    // 1. Open the login page
    await loginPage.goto();

    // 2. Click Login with empty fields to show the error
    await loginPage.loginButton.click();
    await expect(loginPage.errorBanner).toBeVisible();
    await loginPage.expectFieldsMarkedInvalid(true);

    // 3. Click the X on the banner
    await loginPage.closeErrorButton.click();

    // Expected: the banner disappears and the error marks on both fields clear
    await expect(loginPage.errorBanner).toHaveCount(0);
    await loginPage.expectFieldsMarkedInvalid(false);

    // 4. Enter standard_user and secret_sauce and click Login
    await loginPage.login(USERS.standard);

    // Expected: the product page loads with no error
    await inventoryPage.expectLoaded();
    await expect(loginPage.errorBanner).toHaveCount(0);
  });

  test('SPEC-LOGIN-006 Password field is masked', async ({ loginPage }) => {
    // 1. Open the login page
    await loginPage.goto();
    await expect(loginPage.password).toHaveAttribute('type', 'password');

    // 2. Type secret_sauce into the password field
    await loginPage.password.fill(PASSWORD);

    // 3. Check how the field shows the text
    // Expected: the field is still of password type, so the characters are hidden
    await expect(loginPage.password).toHaveAttribute('type', 'password');
    await expect(loginPage.password).toHaveValue(PASSWORD);
  });

  test('SPEC-LOGIN-007 Session survives reload and direct URL', async ({ page, loginPage, inventoryPage }) => {
    // 1. Sign in as standard_user
    await loginPage.goto();
    await loginPage.login(USERS.standard);
    await inventoryPage.expectLoaded();

    // 2. Reload the page
    await page.reload();

    // Expected: still on /inventory.html with 6 items
    await inventoryPage.expectLoaded();
    await expect(inventoryPage.items).toHaveCount(6);

    // 3. Enter https://www.saucedemo.com/inventory.html in the address bar
    await inventoryPage.goto();

    // Expected: still on /inventory.html with 6 items, not sent to the login page
    await inventoryPage.expectLoaded();
    await expect(inventoryPage.items).toHaveCount(6);
  });
});
