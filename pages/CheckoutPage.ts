import { expect, type Locator, type Page } from '@playwright/test';

export const THANK_YOU = 'Thank you for your order!';
export const DISPATCHED =
  'Your order has been dispatched, and will arrive just as fast as the pony can get there!';

/** The three checkout pages: step one (info), step two (overview), complete. */
export class CheckoutPage {
  // Step one
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly postalCode: Locator;
  readonly continueButton: Locator;
  readonly cancelButton: Locator;
  readonly errorBanner: Locator;
  readonly closeErrorButton: Locator;

  // Step two
  readonly itemRows: Locator;
  readonly itemTotal: Locator;
  readonly tax: Locator;
  readonly total: Locator;
  readonly finishButton: Locator;
  readonly itemNames: Locator;
  readonly itemQuantities: Locator;
  readonly itemPriceLabels: Locator;
  readonly paymentLabel: Locator;
  readonly paymentValue: Locator;
  readonly shippingLabel: Locator;
  readonly shippingValue: Locator;

  // Complete
  readonly thankYou: Locator;
  readonly dispatchedMessage: Locator;
  readonly backHome: Locator;

  constructor(private readonly page: Page) {
    this.firstName = page.getByPlaceholder('First Name');
    this.lastName = page.getByPlaceholder('Last Name');
    this.postalCode = page.getByPlaceholder('Zip/Postal Code');
    this.continueButton = page.getByRole('button', { name: 'Continue' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.errorBanner = page.locator('[data-test="error"]');
    this.closeErrorButton = this.errorBanner.getByRole('button');

    this.itemRows = page.locator('.cart_item');
    this.itemTotal = page.getByText(/^Item total:/);
    this.tax = page.getByText(/^Tax:/);
    this.total = page.getByText(/^Total:/);
    this.finishButton = page.getByRole('button', { name: 'Finish' });
    // The site exposes item details only through class names.
    this.itemNames = page.locator('.inventory_item_name');
    this.itemQuantities = page.locator('.cart_quantity');
    this.itemPriceLabels = page.locator('.inventory_item_price');
    this.paymentLabel = page.getByText('Payment Information:', { exact: true });
    this.paymentValue = page.getByText('SauceCard #31337', { exact: true });
    this.shippingLabel = page.getByText('Shipping Information:', { exact: true });
    this.shippingValue = page.getByText('Free Pony Express Delivery!', { exact: true });

    this.thankYou = page.getByText(THANK_YOU);
    this.dispatchedMessage = page.getByText(DISPATCHED);
    this.backHome = page.getByRole('button', { name: 'Back Home' });
  }

  async gotoStepOne() {
    return this.page.goto('/checkout-step-one.html');
  }

  async gotoStepTwo() {
    await this.page.goto('/checkout-step-two.html');
  }

  async gotoComplete() {
    await this.page.goto('/checkout-complete.html');
  }

  async fillInfo(firstName: string, lastName: string, postalCode: string) {
    await this.firstName.fill(firstName);
    await this.lastName.fill(lastName);
    await this.postalCode.fill(postalCode);
  }

  async submitInfo(firstName: string, lastName: string, postalCode: string) {
    await this.fillInfo(firstName, lastName, postalCode);
    await this.continueButton.click();
  }

  /** Parses a money line such as "Tax: $2.40" into a number. */
  async amount(line: Locator): Promise<number> {
    const text = (await line.textContent()) ?? '';
    return Number(text.replace(/[^0-9.]/g, ''));
  }

  async itemPrices(): Promise<number[]> {
    const texts = await this.page.locator('.inventory_item_price').allTextContents();
    return texts.map((t) => Number(t.replace('$', '')));
  }

  /** Checks the overview maths without asserting any fixed price. */
  async expectTotalsConsistent() {
    const prices = await this.itemPrices();
    const sum = Math.round(prices.reduce((a, b) => a + b, 0) * 100) / 100;
    const itemTotal = await this.amount(this.itemTotal);
    const tax = await this.amount(this.tax);
    const total = await this.amount(this.total);
    expect(itemTotal).toBeCloseTo(sum, 2);
    expect(tax).toBeCloseTo(Math.round(sum * 8) / 100, 2);
    expect(total).toBeCloseTo(itemTotal + tax, 2);
  }

  async expectStepOne() {
    await expect(this.page).toHaveURL('https://www.saucedemo.com/checkout-step-one.html');
  }

  async expectStepTwo() {
    await expect(this.page).toHaveURL('https://www.saucedemo.com/checkout-step-two.html');
  }

  async expectComplete() {
    await expect(this.page).toHaveURL('https://www.saucedemo.com/checkout-complete.html');
    await expect(this.thankYou).toBeVisible();
  }
}
