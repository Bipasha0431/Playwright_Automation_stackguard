// spec: specs/ui/cart.md

import { test, expect } from '../../fixtures';
import type { CartPage } from '../../pages/CartPage';
import type { InventoryPage } from '../../pages/InventoryPage';
import { accessError } from '../../pages/LoginPage';
import { PRODUCTS } from '../../utils/users';

const ALL_PRODUCTS = Object.values(PRODUCTS);

type ListDetails = { price: string; description: string };

const readListDetails = async (inventoryPage: InventoryPage, productName: string): Promise<ListDetails> => ({
  price: (await inventoryPage.price(productName).textContent()) ?? '',
  description: (await inventoryPage.description(productName).textContent()) ?? '',
});

const expectRowMatchesList = async (cartPage: CartPage, productName: string, listDetails: ListDetails) => {
  await expect(cartPage.quantity(productName)).toHaveText('1');
  await expect(cartPage.price(productName)).toHaveText(listDetails.price);
  await expect(cartPage.description(productName)).toHaveText(listDetails.description);
  await expect(cartPage.row(productName).getByRole('button', { name: 'Remove' })).toBeVisible();
};

const expectEmptyCartLayout = async (cartPage: CartPage, inventoryPage: InventoryPage) => {
  await expect(cartPage.heading).toBeVisible();
  await expect(cartPage.quantityHeader).toBeVisible();
  await expect(cartPage.descriptionHeader).toBeVisible();
  await expect(cartPage.rows).toHaveCount(0);
  await expect(cartPage.continueShopping).toBeVisible();
  await expect(cartPage.checkout).toBeVisible();
  await inventoryPage.expectBadge(0);
};

test.describe('Cart Page', () => {
  test('SPEC-CART-001 Cart page with one item', async ({ page, signedInInventory: inventoryPage, cartPage }) => {
    // 1. Sign in as standard_user (done by the fixture)
    // 2. Click Add to cart on Sauce Labs Backpack
    await inventoryPage.add(PRODUCTS.backpack);
    const backpackListDetails = await readListDetails(inventoryPage, PRODUCTS.backpack);

    // 3. Click the cart icon
    await inventoryPage.openCart();

    // 4. Read the cart page
    // Expected: cart URL and title, heading with QTY and Description headers
    await cartPage.expectOnCartPage();
    await expect(page).toHaveTitle('Swag Labs');
    await expect(cartPage.quantityHeader).toBeVisible();
    await expect(cartPage.descriptionHeader).toBeVisible();

    // Expected: one Backpack row with quantity, description, price and Remove, same as the list
    await expect(cartPage.rows).toHaveCount(1);
    await expect(cartPage.itemNames).toHaveText([PRODUCTS.backpack]);
    await expect(cartPage.description(PRODUCTS.backpack)).not.toBeEmpty();
    await expectRowMatchesList(cartPage, PRODUCTS.backpack, backpackListDetails);

    // Expected: Continue Shopping and Checkout shown, badge 1
    await expect(cartPage.continueShopping).toBeVisible();
    await expect(cartPage.checkout).toBeVisible();
    await inventoryPage.expectBadge(1);
  });

  test('SPEC-CART-002 Cart page with several items', async ({ signedInInventory: inventoryPage, cartPage }) => {
    const added = [PRODUCTS.backpack, PRODUCTS.bikeLight, PRODUCTS.onesie];

    // 1. Add Backpack, Bike Light and Onesie from the product list
    await inventoryPage.addAll(added);
    const listDetails = new Map<string, ListDetails>();
    for (const productName of added) listDetails.set(productName, await readListDetails(inventoryPage, productName));

    // 2. Open the cart
    await inventoryPage.openCart();

    // 3. Compare each row with the product list
    // Expected: badge 3 and three rows in the order added
    await cartPage.expectOnCartPage();
    await inventoryPage.expectBadge(3);
    await expect(cartPage.rows).toHaveCount(3);
    await expect(cartPage.itemNames).toHaveText(added);

    // Expected: each row has quantity 1, the list price, its description and Remove
    for (const productName of added) {
      await expectRowMatchesList(cartPage, productName, listDetails.get(productName)!);
    }

    // Expected: items not added are not listed
    await expect(cartPage.row(PRODUCTS.boltTShirt)).toHaveCount(0);
    await expect(cartPage.row(PRODUCTS.fleeceJacket)).toHaveCount(0);
    await expect(cartPage.row(PRODUCTS.redTShirt)).toHaveCount(0);
  });

  test('SPEC-CART-003 Cart with all six products', async ({ signedInInventory: inventoryPage, cartPage }) => {
    // 1. Click Add to cart on all six products
    await inventoryPage.addAll(ALL_PRODUCTS);
    const listDetails = new Map<string, ListDetails>();
    for (const productName of ALL_PRODUCTS) listDetails.set(productName, await readListDetails(inventoryPage, productName));

    // 2. Open the cart
    await inventoryPage.openCart();

    // 3. Read the rows and the badge
    // Expected: badge 6 and six rows in list order
    await cartPage.expectOnCartPage();
    await inventoryPage.expectBadge(6);
    await expect(cartPage.rows).toHaveCount(6);
    await expect(cartPage.itemNames).toHaveText(ALL_PRODUCTS);

    // Expected: each row has quantity 1 and the same price as on the list
    for (const productName of ALL_PRODUCTS) {
      await expectRowMatchesList(cartPage, productName, listDetails.get(productName)!);
    }

    // Expected: Continue Shopping and Checkout still shown
    await expect(cartPage.continueShopping).toBeVisible();
    await expect(cartPage.checkout).toBeVisible();
  });

  test('SPEC-CART-004 Remove one item on the cart page', async ({ signedInInventory: inventoryPage, cartPage }) => {
    // 1. Add Backpack, Bike Light and Onesie
    await inventoryPage.addAll([PRODUCTS.backpack, PRODUCTS.bikeLight, PRODUCTS.onesie]);

    // 2. Open the cart
    await inventoryPage.openCart();
    await cartPage.expectOnCartPage();
    await inventoryPage.expectBadge(3);

    // 3. Click Remove on Sauce Labs Backpack
    await cartPage.remove(PRODUCTS.backpack);

    // Expected: Backpack row disappears, the other two remain with Remove, badge 2
    await expect(cartPage.row(PRODUCTS.backpack)).toHaveCount(0);
    await expect(cartPage.itemNames).toHaveText([PRODUCTS.bikeLight, PRODUCTS.onesie]);
    await expect(cartPage.row(PRODUCTS.bikeLight).getByRole('button', { name: 'Remove' })).toBeVisible();
    await expect(cartPage.row(PRODUCTS.onesie).getByRole('button', { name: 'Remove' })).toBeVisible();
    await inventoryPage.expectBadge(2);
  });

  test('SPEC-CART-005 Remove the last item shows empty cart', async ({
    page,
    signedInInventory: inventoryPage,
    cartPage,
  }) => {
    // 1. Add Backpack
    await inventoryPage.add(PRODUCTS.backpack);

    // 2. Open the cart
    await inventoryPage.openCart();
    await cartPage.expectOnCartPage();

    // 3. Click Remove on Backpack
    await cartPage.remove(PRODUCTS.backpack);

    // 4. Look at the page and the cart icon
    // Expected: no rows, headings and buttons still shown, no "cart is empty" message, no badge
    await expectEmptyCartLayout(cartPage, inventoryPage);
    await expect(page.getByText(/empty/i)).toHaveCount(0);
  });

  test('SPEC-CART-006 Open the cart with no items', async ({ signedInInventory: inventoryPage, cartPage }) => {
    // 1. Sign in as standard_user (done by the fixture)
    // 2. Click the cart icon
    await inventoryPage.openCart();

    // 3. Read the page
    // Expected: cart URL and the same empty layout as CART-005
    await cartPage.expectOnCartPage();
    await expectEmptyCartLayout(cartPage, inventoryPage);
  });

  test('SPEC-CART-007 Continue Shopping keeps the cart', async ({ signedInInventory: inventoryPage, cartPage }) => {
    // 1. Add Backpack and open the cart
    await inventoryPage.add(PRODUCTS.backpack);
    await inventoryPage.openCart();
    await cartPage.expectOnCartPage();

    // 2. Click Continue Shopping
    await cartPage.continueShopping.click();

    // 3. Check the list
    // Expected: back on the product list, Backpack shows Remove, badge 1
    await inventoryPage.expectLoaded();
    await expect(inventoryPage.removeButton(PRODUCTS.backpack)).toBeVisible();
    await inventoryPage.expectBadge(1);

    // 4. Open the cart again
    await inventoryPage.openCart();

    // Expected: cart lists Backpack with its Remove button
    await cartPage.expectOnCartPage();
    await expect(cartPage.itemNames).toHaveText([PRODUCTS.backpack]);
    await expect(cartPage.row(PRODUCTS.backpack).getByRole('button', { name: 'Remove' })).toBeVisible();
  });

  test('SPEC-CART-008 Cart icon from list, detail page and cart page', async ({
    signedInInventory: inventoryPage,
    cartPage,
  }) => {
    // 1. Add Bike Light on the list and click the cart icon
    await inventoryPage.add(PRODUCTS.bikeLight);
    await inventoryPage.openCart();

    // Expected: cart page with the Bike Light row
    await cartPage.expectOnCartPage();
    await expect(cartPage.itemNames).toHaveText([PRODUCTS.bikeLight]);

    // 2. Go back to the list and open the Bike Light detail page
    await cartPage.continueShopping.click();
    await inventoryPage.expectLoaded();
    await inventoryPage.openProduct(PRODUCTS.bikeLight);
    await expect(inventoryPage.detailName).toHaveText(PRODUCTS.bikeLight);

    // 3. Click the cart icon on the detail page
    await inventoryPage.openCart();

    // Expected: cart page with the Bike Light row
    await cartPage.expectOnCartPage();
    await expect(cartPage.itemNames).toHaveText([PRODUCTS.bikeLight]);

    // 4. Click the cart icon on the cart page
    await inventoryPage.openCart();

    // Expected: still on the cart page, row unchanged
    await cartPage.expectOnCartPage();
    await expect(cartPage.itemNames).toHaveText([PRODUCTS.bikeLight]);
  });

  test('SPEC-CART-009 Cart survives detail page round trip', async ({
    page,
    signedInInventory: inventoryPage,
    cartPage,
  }) => {
    // 1. Add Backpack and Bike Light and open the cart
    await inventoryPage.addAll([PRODUCTS.backpack, PRODUCTS.bikeLight]);
    await inventoryPage.openCart();
    await cartPage.expectOnCartPage();

    // 2. Click the name of Sauce Labs Bike Light
    await cartPage.openProduct(PRODUCTS.bikeLight);

    // Expected: the Bike Light detail page opens
    await expect(page).toHaveURL('https://www.saucedemo.com/inventory-item.html?id=0');
    await expect(inventoryPage.detailName).toHaveText(PRODUCTS.bikeLight);

    // 3. Use the browser Back button
    await page.goBack();

    // Expected: back on the cart page with both items still listed
    await cartPage.expectOnCartPage();
    await expect(cartPage.itemNames).toHaveText([PRODUCTS.backpack, PRODUCTS.bikeLight]);
  });

  test('SPEC-CART-010 Checkout button goes to step one', async ({
    signedInInventory: inventoryPage,
    cartPage,
    checkoutPage,
  }) => {
    // 1. Add Backpack and open the cart
    await inventoryPage.add(PRODUCTS.backpack);
    await inventoryPage.openCart();
    await cartPage.expectOnCartPage();

    // 2. Click Checkout
    await cartPage.checkout.click();

    // 3. Read the URL
    // Expected: checkout step one
    await checkoutPage.expectStepOne();
  });

  test('SPEC-CART-011 Same product cannot be added twice', async ({ signedInInventory: inventoryPage, cartPage }) => {
    // 1. On the list click Add to cart on Backpack
    await inventoryPage.add(PRODUCTS.backpack);

    // 2. Look at the Backpack button
    // Expected: the button reads Remove, so a second Add is not offered
    await expect(inventoryPage.removeButton(PRODUCTS.backpack)).toBeVisible();
    await expect(inventoryPage.addButton(PRODUCTS.backpack)).toHaveCount(0);

    // 3. Open the cart
    await inventoryPage.openCart();

    // Expected: one Backpack row with quantity 1 and badge 1
    await cartPage.expectOnCartPage();
    await expect(cartPage.rows).toHaveCount(1);
    await expect(cartPage.quantity(PRODUCTS.backpack)).toHaveText('1');
    await inventoryPage.expectBadge(1);
  });

  test('SPEC-CART-012 Cart page is blocked when not signed in', async ({ loginPage, cartPage }) => {
    // 1. In a fresh session open https://www.saucedemo.com/cart.html
    const response = await cartPage.goto();

    // Expected: first response is a 404, then the login page shows the access error
    expect(response?.status()).toBe(404);
    await loginPage.expectOnLoginPage();
    await loginPage.expectError(accessError('/cart.html'));
  });
});
