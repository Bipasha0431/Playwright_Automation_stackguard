import { expect, type Locator, type Page } from '@playwright/test';
import { PASSWORD } from '../utils/users';

export const MISMATCH_ERROR =
  'Epic sadface: Username and password do not match any user in this service';

export const accessError = (path: string) =>
  `Epic sadface: You can only access '${path}' when you are logged in.`;

export class LoginPage {
  readonly username: Locator;
  readonly password: Locator;
  readonly loginButton: Locator;
  readonly errorBanner: Locator;
  readonly closeErrorButton: Locator;

  constructor(private readonly page: Page) {
    this.username = page.getByPlaceholder('Username');
    this.password = page.getByPlaceholder('Password');
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.errorBanner = page.locator('[data-test="error"]');
    this.closeErrorButton = this.errorBanner.getByRole('button');
  }

  async goto() {
    await this.page.goto('/');
  }

  async startFreshSession() {
    await this.page.context().clearCookies();
    await this.goto();
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await this.page.reload();
  }

  async expectFieldsMarkedInvalid(invalid: boolean) {
    const marker = /(^|\s)error(\s|$)/;
    if (invalid) {
      await expect(this.username).toHaveClass(marker);
      await expect(this.password).toHaveClass(marker);
    } else {
      await expect(this.username).not.toHaveClass(marker);
      await expect(this.password).not.toHaveClass(marker);
    }
  }

  async login(username: string, password: string = PASSWORD) {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.loginButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorBanner).toHaveText(message);
  }

  async expectOnLoginPage() {
    await expect(this.page).toHaveURL('https://www.saucedemo.com/');
    await expect(this.loginButton).toBeVisible();
  }
}
