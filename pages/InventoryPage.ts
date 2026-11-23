import { expect, type Locator, type Page } from '@playwright/test';

export type SortOption =
  | 'Name (A to Z)'
  | 'Name (Z to A)'
  | 'Price (low to high)'
  | 'Price (high to low)';

export class InventoryPage {
  readonly title: Locator;
  readonly sortDropdown: Locator;
  readonly cartLink: Locator;
  readonly cartBadge: Locator;
  readonly productNames: Locator;
  readonly productPrices: Locator;
  readonly items: Locator;
  readonly placeholderImages: Locator;
  readonly productDescriptions: Locator;
  readonly addButtons: Locator;
  readonly removeButtons: Locator;
  readonly detailName: Locator;
  readonly detailPrice: Locator;
  readonly detailAddButton: Locator;
  readonly detailRemoveButton: Locator;
  readonly backToProducts: Locator;
  readonly itemNotFoundHeading: Locator;
  readonly itemNotFoundMessage: Locator;

  constructor(private readonly page: Page) {
    this.addButtons = page.getByRole('button', { name: 'Add to cart' });
    this.removeButtons = page.getByRole('button', { name: 'Remove' });
    this.detailAddButton = page.getByRole('button', { name: 'Add to cart' });
    this.detailRemoveButton = page.getByRole('button', { name: 'Remove' });
    this.backToProducts = page.getByRole('button', { name: 'Back to products' });
    this.itemNotFoundHeading = page.getByText('ITEM NOT FOUND', { exact: true });
    this.itemNotFoundMessage = page.getByText("We're sorry, but your call could not be completed as dialled.");
    // The site exposes these only through class names.
    this.productDescriptions = page.locator('.inventory_item_desc');
    this.detailName = page.locator('.inventory_details_name');
    this.detailPrice = page.locator('.inventory_details_price');
    // The placeholder image has no distinguishing role or name, only its file name.
    this.placeholderImages = page.locator('.inventory_item img[src*="sl-404"]');
    this.items = page.locator('.inventory_item');
    this.title = page.getByText('Products', { exact: true });
    this.sortDropdown = page.getByRole('combobox');
    // The cart icon is a link whose only content is the badge, so it has no accessible name.
    this.cartLink = page.locator('a.shopping_cart_link');
    this.cartBadge = page.locator('.shopping_cart_badge');
    this.productNames = page.locator('.inventory_item_name');
    this.productPrices = page.locator('.inventory_item_price');
  }

  async goto() {
    return this.page.goto('/inventory.html');
  }

  async gotoProduct(id: number) {
    return this.page.goto(`/inventory-item.html?id=${id}`);
  }

  price(productName: string): Locator {
    return this.card(productName).locator('.inventory_item_price');
  }

  description(productName: string): Locator {
    return this.card(productName).locator('.inventory_item_desc');
  }

  async toggle(productName: string) {
    await this.card(productName).getByRole('button', { name: /^(Add to cart|Remove)$/ }).click();
  }

  async expectSortSelected(option: SortOption) {
    const values: Record<SortOption, string> = {
      'Name (A to Z)': 'az',
      'Name (Z to A)': 'za',
      'Price (low to high)': 'lohi',
      'Price (high to low)': 'hilo',
    };
    await expect(this.sortDropdown).toHaveValue(values[option]);
  }

  card(productName: string): Locator {
    return this.page.locator('.inventory_item').filter({ hasText: productName });
  }

  addButton(productName: string): Locator {
    return this.card(productName).getByRole('button', { name: 'Add to cart' });
  }

  removeButton(productName: string): Locator {
    return this.card(productName).getByRole('button', { name: 'Remove' });
  }

  async add(productName: string) {
    await this.addButton(productName).click();
  }

  async remove(productName: string) {
    await this.removeButton(productName).click();
  }

  async addAll(productNames: readonly string[]) {
    for (const name of productNames) await this.add(name);
  }

  async openProduct(productName: string) {
    await this.page.getByText(productName, { exact: true }).click();
  }

  async sortBy(option: SortOption) {
    await this.sortDropdown.selectOption({ label: option });
  }

  async openCart() {
    await this.cartLink.click();
  }

  async names(): Promise<string[]> {
    return this.productNames.allTextContents();
  }

  async prices(): Promise<number[]> {
    const texts = await this.productPrices.allTextContents();
    return texts.map((t) => Number(t.replace('$', '')));
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL('https://www.saucedemo.com/inventory.html');
    await expect(this.title).toBeVisible();
  }

  async expectBadge(count: number) {
    if (count === 0) await expect(this.cartBadge).toHaveCount(0);
    else await expect(this.cartBadge).toHaveText(String(count));
  }
}
