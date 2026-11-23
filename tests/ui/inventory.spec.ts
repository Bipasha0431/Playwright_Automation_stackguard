// spec: specs/ui/inventory.md

import { test, expect } from '../../fixtures';
import { accessError } from '../../pages/LoginPage';
import { PRODUCTS, USERS } from '../../utils/users';

const DEFAULT_ORDER = [
  PRODUCTS.backpack,
  PRODUCTS.bikeLight,
  PRODUCTS.boltTShirt,
  PRODUCTS.fleeceJacket,
  PRODUCTS.onesie,
  PRODUCTS.redTShirt,
];

const ALL_PRODUCTS = Object.values(PRODUCTS);

const isAscending = (values: number[]) => values.every((value, i) => i === 0 || values[i - 1] <= value);
const isDescending = (values: number[]) => values.every((value, i) => i === 0 || values[i - 1] >= value);

const groupNamesByPrice = (names: string[], prices: number[]) => {
  const groups: Record<number, string[]> = {};
  names.forEach((name, i) => (groups[prices[i]] ??= []).push(name));
  return groups;
};

test.describe('Inventory Page', () => {
  test('SPEC-INV-001 Default product list content', async ({ signedInInventory: inventoryPage }) => {
    // 1. Sign in as standard_user (done by the fixture)
    // 2. Look at the product list and the sort dropdown
    // 3. Check each product card
    // Expected: 6 products in the default order, each with image, name, description, price and Add to cart
    await expect(inventoryPage.items).toHaveCount(6);
    await expect(inventoryPage.productNames).toHaveText(DEFAULT_ORDER);
    for (let i = 0; i < 6; i++) {
      const item = inventoryPage.items.nth(i);
      await expect(item.getByRole('img')).toBeVisible();
      await expect(inventoryPage.productDescriptions.nth(i)).not.toBeEmpty();
      await expect(inventoryPage.productPrices.nth(i)).toHaveText(/^\$\d+\.\d{2}$/);
      await expect(item.getByRole('button', { name: 'Add to cart' })).toBeVisible();
    }

    // Expected: sort dropdown shows Name (A to Z), cart badge is not shown
    await inventoryPage.expectSortSelected('Name (A to Z)');
    await inventoryPage.expectBadge(0);
  });

  test('SPEC-INV-002 Add and remove products from the list', async ({ signedInInventory: inventoryPage }) => {
    // 1. Click Add to cart on Backpack
    await inventoryPage.add(PRODUCTS.backpack);

    // Expected: badge 1 and Backpack button reads Remove
    await inventoryPage.expectBadge(1);
    await expect(inventoryPage.removeButton(PRODUCTS.backpack)).toBeVisible();

    // 2. Click Add to cart on Bike Light and Bolt T-Shirt
    await inventoryPage.add(PRODUCTS.bikeLight);
    await inventoryPage.add(PRODUCTS.boltTShirt);

    // Expected: badge 3
    await inventoryPage.expectBadge(3);

    // 3. Click Remove on Bike Light
    await inventoryPage.remove(PRODUCTS.bikeLight);

    // Expected: badge 2, Bike Light back to Add to cart, others still Remove
    await inventoryPage.expectBadge(2);
    await expect(inventoryPage.addButton(PRODUCTS.bikeLight)).toBeVisible();
    await expect(inventoryPage.removeButton(PRODUCTS.backpack)).toBeVisible();
    await expect(inventoryPage.removeButton(PRODUCTS.boltTShirt)).toBeVisible();

    // 4. Click Remove on the remaining two items
    await inventoryPage.remove(PRODUCTS.backpack);
    await inventoryPage.remove(PRODUCTS.boltTShirt);

    // Expected: badge disappears and all six buttons read Add to cart
    await inventoryPage.expectBadge(0);
    await expect(inventoryPage.addButtons).toHaveCount(6);
    await expect(inventoryPage.removeButtons).toHaveCount(0);
  });

  test('SPEC-INV-003 Cart selection survives a page reload', async ({ page, signedInInventory: inventoryPage }) => {
    // 1. Click Add to cart on Backpack and Bolt T-Shirt
    await inventoryPage.add(PRODUCTS.backpack);
    await inventoryPage.add(PRODUCTS.boltTShirt);

    // 2. Reload the page
    await page.reload();

    // Expected: badge still 2, only Backpack and Bolt T-Shirt read Remove
    await inventoryPage.expectBadge(2);
    await expect(inventoryPage.removeButton(PRODUCTS.backpack)).toBeVisible();
    await expect(inventoryPage.removeButton(PRODUCTS.boltTShirt)).toBeVisible();
    await expect(inventoryPage.removeButtons).toHaveCount(2);
    await expect(inventoryPage.addButtons).toHaveCount(4);
  });

  test('SPEC-INV-004 All four sort options order the list correctly', async ({ signedInInventory: inventoryPage }) => {
    // 1. Choose Name (Z to A) and read the order
    await inventoryPage.sortBy('Name (Z to A)');

    // Expected: starts with Test.allTheThings() T-Shirt (Red) and ends with Backpack
    await expect(inventoryPage.productNames).toHaveText([...DEFAULT_ORDER].reverse());

    // 2. Choose Price (low to high) and read the prices
    await inventoryPage.sortBy('Price (low to high)');

    // Expected: prices in ascending order
    await expect.poll(async () => isAscending(await inventoryPage.prices())).toBe(true);
    const lowToHighGroups = groupNamesByPrice(await inventoryPage.names(), await inventoryPage.prices());

    // 3. Choose Price (high to low) and read the prices
    await inventoryPage.sortBy('Price (high to low)');

    // Expected: prices in descending order, same-price products keep the same relative order
    await expect.poll(async () => isDescending(await inventoryPage.prices())).toBe(true);
    const highToLowGroups = groupNamesByPrice(await inventoryPage.names(), await inventoryPage.prices());
    expect(highToLowGroups).toEqual(lowToHighGroups);

    // 4. Choose Name (A to Z) again
    await inventoryPage.sortBy('Name (A to Z)');

    // Expected: back to the default order
    await expect(inventoryPage.productNames).toHaveText(DEFAULT_ORDER);
  });

  test('SPEC-INV-005 Sort choice is lost on reload', async ({ page, signedInInventory: inventoryPage }) => {
    // 1. Choose Price (high to low)
    await inventoryPage.sortBy('Price (high to low)');

    // 2. Confirm the order changed
    // Expected: list ordered by price, highest first
    await expect.poll(async () => isDescending(await inventoryPage.prices())).toBe(true);
    await expect(inventoryPage.productNames).not.toHaveText(DEFAULT_ORDER);

    // 3. Reload the page
    await page.reload();

    // Expected: dropdown shows Name (A to Z) and the list is back to the default order
    await inventoryPage.expectSortSelected('Name (A to Z)');
    await expect(inventoryPage.productNames).toHaveText(DEFAULT_ORDER);
  });

  test('SPEC-INV-006 Reset App State clears the cart badge', async ({ page, signedInInventory: inventoryPage, menu }) => {
    // 1. Add Backpack and Bolt T-Shirt
    await inventoryPage.add(PRODUCTS.backpack);
    await inventoryPage.add(PRODUCTS.boltTShirt);
    await inventoryPage.expectBadge(2);

    // 2. Open the menu and click Reset App State
    await menu.reset();

    // 3. Without reloading, look at the badge and buttons
    // Expected: badge is gone, but Backpack and Bolt T-Shirt buttons still read Remove
    await inventoryPage.expectBadge(0);
    await expect(inventoryPage.removeButton(PRODUCTS.backpack)).toBeVisible();
    await expect(inventoryPage.removeButton(PRODUCTS.boltTShirt)).toBeVisible();

    // 4. Reload the page and check again
    await page.reload();

    // Expected: all six buttons read Add to cart, no badge, sort left at the default
    await expect(inventoryPage.addButtons).toHaveCount(6);
    await expect(inventoryPage.removeButtons).toHaveCount(0);
    await inventoryPage.expectBadge(0);
    await inventoryPage.expectSortSelected('Name (A to Z)');
  });

  test('SPEC-INV-007 Product detail opens the correct product', async ({ page, signedInInventory: inventoryPage }) => {
    const listPrice = await inventoryPage.price(PRODUCTS.fleeceJacket).innerText();

    // 1. Click the name of Sauce Labs Fleece Jacket
    await inventoryPage.openProduct(PRODUCTS.fleeceJacket);

    // 2. Check the detail page
    // Expected: URL has id=5, detail shows the Fleece Jacket with the same price as the list
    await expect(page).toHaveURL(/\/inventory-item\.html\?id=5$/);
    await expect(inventoryPage.detailName).toHaveText(PRODUCTS.fleeceJacket);
    await expect(inventoryPage.detailPrice).toHaveText(listPrice);

    // 3. Click Back to products
    await inventoryPage.backToProducts.click();

    // Expected: back on the product list with all six products
    await inventoryPage.expectLoaded();
    await expect(inventoryPage.items).toHaveCount(6);
  });

  test('SPEC-INV-008 Add and remove on detail page syncs with the list', async ({ signedInInventory: inventoryPage }) => {
    // 1. Open the Fleece Jacket detail page and click Add to cart
    await inventoryPage.openProduct(PRODUCTS.fleeceJacket);
    await expect(inventoryPage.detailName).toHaveText(PRODUCTS.fleeceJacket);
    await inventoryPage.detailAddButton.click();

    // Expected: button reads Remove and badge shows 1
    await expect(inventoryPage.detailRemoveButton).toBeVisible();
    await inventoryPage.expectBadge(1);

    // 2. Click Back to products and check the list
    await inventoryPage.backToProducts.click();

    // Expected: badge 1 and only the Fleece Jacket button reads Remove
    await inventoryPage.expectLoaded();
    await inventoryPage.expectBadge(1);
    await expect(inventoryPage.removeButtons).toHaveCount(1);
    await expect(inventoryPage.removeButton(PRODUCTS.fleeceJacket)).toBeVisible();

    // 3. Open the Fleece Jacket again and click Remove
    await inventoryPage.openProduct(PRODUCTS.fleeceJacket);
    await expect(inventoryPage.detailName).toHaveText(PRODUCTS.fleeceJacket);
    await inventoryPage.detailRemoveButton.click();

    // 4. Click Back to products
    await inventoryPage.backToProducts.click();

    // Expected: no badge and all buttons read Add to cart
    await inventoryPage.expectLoaded();
    await inventoryPage.expectBadge(0);
    await expect(inventoryPage.addButtons).toHaveCount(6);
    await expect(inventoryPage.removeButtons).toHaveCount(0);
  });

  test('SPEC-INV-009 Nonexistent product id', async ({ page, signedInInventory: inventoryPage }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    // 1. Open https://www.saucedemo.com/inventory-item.html?id=999
    await inventoryPage.gotoProduct(999);

    // 2. Read the page content
    // Expected: URL unchanged, ITEM NOT FOUND with the apology text and a Back to products button
    await expect(page).toHaveURL('https://www.saucedemo.com/inventory-item.html?id=999');
    await expect(inventoryPage.itemNotFoundHeading).toBeVisible();
    await expect(inventoryPage.itemNotFoundMessage).toContainText(
      "We're sorry, but your call could not be completed as dialled. Please check your number, and try your call again.",
    );
    await expect(inventoryPage.backToProducts).toBeVisible();

    // Expected: the load logged a console error for the failed item request (Chromium also adds an unrelated permissions-policy error)
    expect(consoleErrors.filter((text) => text.includes('status of 404'))).toHaveLength(1);
  });

  test('SPEC-INV-010 problem_user list quirks', async ({ loginPage, inventoryPage, page }) => {
    // 1. Sign in as problem_user and check the images
    await loginPage.goto();
    await loginPage.login(USERS.problem);
    await inventoryPage.expectLoaded();

    // Expected: known quirk of the demo account, all six images are the same placeholder
    await expect(inventoryPage.placeholderImages).toHaveCount(6);

    // 2. Click Add to cart on all six items, then click all six again
    for (const name of ALL_PRODUCTS) await inventoryPage.toggle(name);
    for (const name of ALL_PRODUCTS) await inventoryPage.toggle(name);

    // Expected: only Backpack, Bike Light and Onesie show Remove, badge 3
    await inventoryPage.expectBadge(3);
    await expect(inventoryPage.removeButtons).toHaveCount(3);
    await expect(inventoryPage.removeButton(PRODUCTS.backpack)).toBeVisible();
    await expect(inventoryPage.removeButton(PRODUCTS.bikeLight)).toBeVisible();
    await expect(inventoryPage.removeButton(PRODUCTS.onesie)).toBeVisible();

    // 3. Choose Name (Z to A), Price (low to high) and Price (high to low)
    // Expected: sorting does not change the order and the dropdown shows Name (A to Z)
    for (const option of ['Name (Z to A)', 'Price (low to high)', 'Price (high to low)'] as const) {
      await inventoryPage.sortBy(option);
      await expect(inventoryPage.productNames).toHaveText(DEFAULT_ORDER);
      await inventoryPage.expectSortSelected('Name (A to Z)');
    }

    // 4. Click the name of the first product
    await inventoryPage.openProduct(PRODUCTS.backpack);

    // Expected: the Fleece Jacket detail page (id=5) opens
    await expect(page).toHaveURL(/\/inventory-item\.html\?id=5$/);
    await expect(inventoryPage.detailName).toHaveText(PRODUCTS.fleeceJacket);
  });

  test('SPEC-INV-011 error_user list quirks', async ({ loginPage, inventoryPage, page }) => {
    // 1. Sign in as error_user and check the images
    await loginPage.goto();
    await loginPage.login(USERS.error);
    await inventoryPage.expectLoaded();

    // Expected: known quirk of the demo account, real product images show
    await expect(inventoryPage.items).toHaveCount(6);
    await expect(inventoryPage.placeholderImages).toHaveCount(0);

    // 2. Click Add to cart on all six items, then click all six again
    for (const name of ALL_PRODUCTS) await inventoryPage.toggle(name);
    for (const name of ALL_PRODUCTS) await inventoryPage.toggle(name);

    // Expected: only Backpack, Bike Light and Onesie show Remove, badge 3
    await inventoryPage.expectBadge(3);
    await expect(inventoryPage.removeButtons).toHaveCount(3);
    await expect(inventoryPage.removeButton(PRODUCTS.backpack)).toBeVisible();
    await expect(inventoryPage.removeButton(PRODUCTS.bikeLight)).toBeVisible();
    await expect(inventoryPage.removeButton(PRODUCTS.onesie)).toBeVisible();

    // 3. Choose Name (Z to A), Price (low to high) and Price (high to low)
    // Expected: sorting does not change the order
    for (const option of ['Name (Z to A)', 'Price (low to high)', 'Price (high to low)'] as const) {
      await inventoryPage.sortBy(option);
      await expect(inventoryPage.productNames).toHaveText(DEFAULT_ORDER);
    }

    // 4. Click the name of the first product
    await inventoryPage.openProduct(PRODUCTS.backpack);

    // Expected: the correct Backpack detail page (id=4) opens
    await expect(page).toHaveURL(/\/inventory-item\.html\?id=4$/);
    await expect(inventoryPage.detailName).toHaveText(PRODUCTS.backpack);
  });

  test('SPEC-INV-012 Product list is blocked when not signed in', async ({ loginPage, inventoryPage }) => {
    // 1. In a fresh session open https://www.saucedemo.com/inventory.html
    const response = await inventoryPage.goto();

    // Expected: first response is a 404, then the login page shows the access error
    expect(response?.status()).toBe(404);
    await loginPage.expectOnLoginPage();
    await loginPage.expectError(accessError('/inventory.html'));
  });
});
