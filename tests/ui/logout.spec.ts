// spec: specs/ui/logout.md

import { test, expect } from '../../fixtures';
import { accessError, type LoginPage } from '../../pages/LoginPage';
import { CUSTOMER, PRODUCTS, USERS } from '../../utils/users';

const expectCleanLoginPage = async (loginPage: LoginPage) => {
  await loginPage.expectOnLoginPage();
  await expect(loginPage.username).toHaveValue('');
  await expect(loginPage.password).toHaveValue('');
  await expect(loginPage.errorBanner).toHaveCount(0);
};

test.describe('Logout Flow', () => {
  test('SPEC-OUT-001 Burger menu shows its items and Close Menu hides it', async ({
    signedInInventory: inventoryPage,
    menu,
  }) => {
    // 1. Sign in as standard_user (done by the fixture)
    // 2. Click Open Menu
    await menu.open();

    // 3. Read the menu items
    // Expected: All Items, Dynamic Catalog, About, Logout, Reset App State and Close Menu are listed
    await expect(menu.allItems).toBeVisible();
    await expect(menu.dynamicCatalog).toBeVisible();
    await expect(menu.about).toBeVisible();
    await expect(menu.logout).toBeVisible();
    await expect(menu.resetAppState).toBeVisible();
    await expect(menu.closeButton).toBeVisible();

    // 4. Click Close Menu (X)
    await menu.close();

    // Expected: the menu is hidden
    await menu.expectClosed();

    // 5. Click Add to cart on the first product
    await inventoryPage.addButtons.first().click();

    // Expected: the page is clickable again, cart badge shows 1
    await inventoryPage.expectBadge(1);
  });

  test('SPEC-OUT-002 Logout from the product list returns to a clean login page', async ({
    signedInInventory: _inventoryPage,
    menu,
    loginPage,
  }) => {
    // 1. Sign in as standard_user (done by the fixture)
    // 2. Click Open Menu
    // 3. Click Logout
    await menu.logoutUser();

    // Expected: root address, empty username and password fields, no error banner
    await expectCleanLoginPage(loginPage);
  });

  test('SPEC-OUT-003 Logout works the same from cart, product detail and both checkout steps', async ({
    signedInInventory: inventoryPage,
    cartPage,
    checkoutPage,
    menu,
    loginPage,
  }) => {
    // 1. Sign in as standard_user and add one item
    await inventoryPage.add(PRODUCTS.backpack);
    await inventoryPage.expectBadge(1);

    await test.step('logout from the cart page', async () => {
      // 2. Open the cart page, open the menu and click Logout
      await inventoryPage.openCart();
      await cartPage.expectOnCartPage();
      await menu.logoutUser();

      // Expected: login page at the root address, empty fields, no error banner
      await expectCleanLoginPage(loginPage);
    });

    await test.step('logout from a product detail page', async () => {
      // 3. Sign in again and open a product detail page
      await loginPage.login(USERS.standard);
      await inventoryPage.expectLoaded();
      await inventoryPage.openProduct(PRODUCTS.backpack);
      await expect(inventoryPage.detailName).toHaveText(PRODUCTS.backpack);
      await menu.logoutUser();

      // Expected: login page at the root address, empty fields, no error banner
      await expectCleanLoginPage(loginPage);
    });

    await test.step('logout from checkout step one', async () => {
      await loginPage.login(USERS.standard);
      await inventoryPage.expectLoaded();
      await inventoryPage.openCart();
      await cartPage.checkout.click();
      await checkoutPage.expectStepOne();
      await menu.logoutUser();

      // Expected: login page at the root address, empty fields, no error banner
      await expectCleanLoginPage(loginPage);
    });

    await test.step('logout from checkout step two', async () => {
      await loginPage.login(USERS.standard);
      await inventoryPage.expectLoaded();
      await inventoryPage.openCart();
      await cartPage.checkout.click();
      await checkoutPage.submitInfo(CUSTOMER.firstName, CUSTOMER.lastName, CUSTOMER.postalCode);
      await checkoutPage.expectStepTwo();
      await menu.logoutUser();

      // Expected: login page at the root address, empty fields, no error banner
      await expectCleanLoginPage(loginPage);
    });
  });

  test('SPEC-OUT-004 Browser Back after logout does not reveal the product list', async ({
    page,
    signedInInventory: inventoryPage,
    menu,
    loginPage,
  }) => {
    const inventoryAccessError = accessError('/inventory.html');

    // 1. Sign in as standard_user (done by the fixture)
    // 2. Log out from the burger menu
    await menu.logoutUser();
    await loginPage.expectOnLoginPage();

    // 3. Press browser Back
    await page.goBack();

    // Expected: login page at the root address with the access error, no products
    await loginPage.expectOnLoginPage();
    await loginPage.expectError(inventoryAccessError);
    await expect(inventoryPage.items).toHaveCount(0);

    // 4. Reload the page
    await page.reload();

    // Expected: still the login page with the access error, no products
    await loginPage.expectOnLoginPage();
    await loginPage.expectError(inventoryAccessError);
    await expect(inventoryPage.items).toHaveCount(0);
  });

  test('SPEC-OUT-005 Same user signing in again keeps the cart', async ({
    signedInInventory: inventoryPage,
    cartPage,
    menu,
    loginPage,
  }) => {
    const added = [PRODUCTS.backpack, PRODUCTS.bikeLight];
    const notAdded = [PRODUCTS.boltTShirt, PRODUCTS.fleeceJacket, PRODUCTS.onesie, PRODUCTS.redTShirt];

    // 1. Sign in as standard_user (done by the fixture)
    // 2. Add Sauce Labs Backpack and Sauce Labs Bike Light
    await inventoryPage.addAll(added);
    await inventoryPage.expectBadge(2);

    // 3. Log out
    await menu.logoutUser();
    await loginPage.expectOnLoginPage();

    // 4. Sign in again as standard_user
    await loginPage.login(USERS.standard);
    await inventoryPage.expectLoaded();

    // 5. Check the badge, the product buttons and the cart page
    // Expected: badge 2, Remove on Backpack and Bike Light, Add to cart on the other four
    await inventoryPage.expectBadge(2);
    for (const productName of added) await expect(inventoryPage.removeButton(productName)).toBeVisible();
    for (const productName of notAdded) await expect(inventoryPage.addButton(productName)).toBeVisible();

    // Expected: the cart page lists Backpack and Bike Light
    await inventoryPage.openCart();
    await cartPage.expectOnCartPage();
    await expect(cartPage.itemNames).toHaveText(added);
  });
});
