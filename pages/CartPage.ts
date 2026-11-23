import { expect, type Locator, type Page } from '@playwright/test';

export class CartPage {
  readonly heading: Locator;
  readonly rows: Locator;
  readonly continueShopping: Locator;
  readonly checkout: Locator;
  readonly cartBadge: Locator;

  readonly quantityHeader: Locator;
  readonly descriptionHeader: Locator;
  readonly itemNames: Locator;

  constructor(private readonly page: Page) {
    this.quantityHeader = page.getByText('QTY', { exact: true });
    this.descriptionHeader = page.getByText('Description', { exact: true });
    // The site exposes item names only through class names.
    this.itemNames = page.locator('.inventory_item_name');
    this.heading = page.getByText('Your Cart', { exact: true });
    this.rows = page.locator('.cart_item');
    this.continueShopping = page.getByRole('button', { name: 'Continue Shopping' });
    this.checkout = page.getByRole('button', { name: 'Checkout' });
    this.cartBadge = page.locator('.shopping_cart_badge');
  }

  async goto() {
    return this.page.goto('/cart.html');
  }

  row(productName: string): Locator {
    return this.rows.filter({ hasText: productName });
  }

  price(productName: string): Locator {
    // Price and description have no role or label, only class names.
    return this.row(productName).locator('.inventory_item_price');
  }

  description(productName: string): Locator {
    return this.row(productName).locator('.inventory_item_desc');
  }

  quantity(productName: string): Locator {
    return this.row(productName).locator('.cart_quantity');
  }

  async remove(productName: string) {
    await this.row(productName).getByRole('button', { name: 'Remove' }).click();
  }

  async names(): Promise<string[]> {
    return this.page.locator('.inventory_item_name').allTextContents();
  }

  async openProduct(productName: string) {
    await this.page.getByText(productName, { exact: true }).click();
  }

  async expectOnCartPage() {
    await expect(this.page).toHaveURL('https://www.saucedemo.com/cart.html');
    await expect(this.heading).toBeVisible();
  }
}
