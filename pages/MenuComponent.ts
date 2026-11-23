import { expect, type Locator, type Page } from '@playwright/test';

/** Burger menu, present on every signed-in page. */
export class MenuComponent {
  readonly openButton: Locator;
  readonly closeButton: Locator;
  readonly allItems: Locator;
  readonly about: Locator;
  readonly logout: Locator;
  readonly resetAppState: Locator;
  readonly dynamicCatalog: Locator;
  readonly logoutAccessible: Locator;

  constructor(page: Page) {
    this.dynamicCatalog = page.getByText('Dynamic Catalog', { exact: true });
    // The closed menu is marked aria-hidden, so a role query only finds Logout while the menu is open.
    this.logoutAccessible = page.getByRole('button', { name: 'Logout' });
    this.openButton = page.getByRole('button', { name: 'Open Menu' });
    this.closeButton = page.getByRole('button', { name: 'Close Menu' });
    // Menu entries are not exposed as link roles, so they are found by text.
    this.allItems = page.getByText('All Items', { exact: true });
    this.about = page.getByText('About', { exact: true });
    this.logout = page.getByText('Logout', { exact: true });
    this.resetAppState = page.getByText('Reset App State', { exact: true });
  }

  async open() {
    await this.openButton.click();
    await expect(this.closeButton).toBeVisible();
  }

  async close() {
    await this.closeButton.click();
  }

  async expectClosed() {
    await expect(this.logoutAccessible).toHaveCount(0);
  }

  async logoutUser() {
    await this.open();
    await this.logout.click();
  }

  async reset() {
    await this.open();
    await this.resetAppState.click();
  }
}
