// spec: specs/ui/checkout.md

import { test, expect } from '../../fixtures';
import type { CartPage } from '../../pages/CartPage';
import { DISPATCHED, THANK_YOU, type CheckoutPage } from '../../pages/CheckoutPage';
import type { InventoryPage } from '../../pages/InventoryPage';
import { accessError } from '../../pages/LoginPage';
import { CUSTOMER, PRODUCTS, USERS } from '../../utils/users';

const openStepOne = async (
  inventoryPage: InventoryPage,
  cartPage: CartPage,
  checkoutPage: CheckoutPage,
  products: string[],
) => {
  await inventoryPage.addAll(products);
  await inventoryPage.openCart();
  await cartPage.expectOnCartPage();
  await cartPage.checkout.click();
  await checkoutPage.expectStepOne();
};

const openOverview = async (
  inventoryPage: InventoryPage,
  cartPage: CartPage,
  checkoutPage: CheckoutPage,
  products: string[],
) => {
  await openStepOne(inventoryPage, cartPage, checkoutPage, products);
  await checkoutPage.submitInfo(CUSTOMER.firstName, CUSTOMER.lastName, CUSTOMER.postalCode);
  await checkoutPage.expectStepTwo();
};

test.describe('Checkout Flow', () => {
  test('SPEC-CHK-001 Complete an order with valid details', async ({
    signedInInventory: inventoryPage,
    cartPage,
    checkoutPage,
  }) => {
    // 1. Sign in as standard_user, add Backpack and Onesie, open the cart and click Checkout
    await openStepOne(inventoryPage, cartPage, checkoutPage, [PRODUCTS.backpack, PRODUCTS.onesie]);

    // 2. Enter first name Ada, last name Lovelace, postal code 560001 and click Continue
    await checkoutPage.submitInfo(CUSTOMER.firstName, CUSTOMER.lastName, CUSTOMER.postalCode);

    // Expected: overview URL listing Backpack and Onesie
    await checkoutPage.expectStepTwo();
    await expect(checkoutPage.itemNames).toHaveText([PRODUCTS.backpack, PRODUCTS.onesie]);

    // 3. On the overview check the items and click Finish
    await checkoutPage.finishButton.click();

    // Expected: confirmation page with both messages and no cart badge
    await checkoutPage.expectComplete();
    await expect(checkoutPage.thankYou).toHaveText(THANK_YOU);
    await expect(checkoutPage.dispatchedMessage).toHaveText(DISPATCHED);
    await inventoryPage.expectBadge(0);

    // 4. Check the confirmation page and click Back Home
    await checkoutPage.backHome.click();

    // Expected: product list
    await inventoryPage.expectLoaded();
  });

  test('SPEC-CHK-002 Overview content and order maths', async ({
    signedInInventory: inventoryPage,
    cartPage,
    checkoutPage,
  }) => {
    const added = [PRODUCTS.backpack, PRODUCTS.bikeLight, PRODUCTS.onesie];

    // 1. Add Backpack, Bike Light and Onesie and go through step one with valid details
    await inventoryPage.addAll(added);
    const listPrices: string[] = [];
    for (const productName of added) listPrices.push((await inventoryPage.price(productName).textContent()) ?? '');
    await inventoryPage.openCart();
    await cartPage.expectOnCartPage();
    await cartPage.checkout.click();
    await checkoutPage.submitInfo(CUSTOMER.firstName, CUSTOMER.lastName, CUSTOMER.postalCode);
    await checkoutPage.expectStepTwo();

    // 2. Compare the overview rows with the products added
    // Expected: three rows with quantity 1 and the same names and prices as added
    await expect(checkoutPage.itemRows).toHaveCount(3);
    await expect(checkoutPage.itemNames).toHaveText(added);
    await expect(checkoutPage.itemQuantities).toHaveText(['1', '1', '1']);
    await expect(checkoutPage.itemPriceLabels).toHaveText(listPrices);

    // 3. Read the payment, shipping and price lines
    // Expected: payment and shipping lines as documented
    await expect(checkoutPage.paymentLabel).toBeVisible();
    await expect(checkoutPage.paymentValue).toBeVisible();
    await expect(checkoutPage.shippingLabel).toBeVisible();
    await expect(checkoutPage.shippingValue).toBeVisible();

    // Expected: item total is the sum of the prices, tax is 8% rounded, total is item total plus tax
    await checkoutPage.expectTotalsConsistent();
  });

  test('SPEC-CHK-003 Checkout form fields are validated in order', async ({
    signedInInventory: inventoryPage,
    cartPage,
    checkoutPage,
  }) => {
    // 1. Open step one with one item in the cart
    await openStepOne(inventoryPage, cartPage, checkoutPage, [PRODUCTS.backpack]);

    await test.step('all fields empty', async () => {
      // 2. Click Continue with all fields empty
      await checkoutPage.continueButton.click();

      // Expected: first name error, still on step one
      await checkoutPage.expectStepOne();
      await expect(checkoutPage.errorBanner).toHaveText('Error: First Name is required');
    });

    await test.step('first name empty', async () => {
      // 2. Fill only last name and postal code and click Continue
      await checkoutPage.fillInfo('', CUSTOMER.lastName, CUSTOMER.postalCode);
      await checkoutPage.continueButton.click();

      // Expected: first name error, still on step one
      await checkoutPage.expectStepOne();
      await expect(checkoutPage.errorBanner).toHaveText('Error: First Name is required');
    });

    await test.step('last name empty', async () => {
      // 2. Fill only first name and postal code and click Continue
      await checkoutPage.fillInfo(CUSTOMER.firstName, '', CUSTOMER.postalCode);
      await checkoutPage.continueButton.click();

      // Expected: last name error, still on step one
      await checkoutPage.expectStepOne();
      await expect(checkoutPage.errorBanner).toHaveText('Error: Last Name is required');

      // 3. After the last-name error, click the X on the error banner
      await checkoutPage.closeErrorButton.click();

      // Expected: banner removed
      await expect(checkoutPage.errorBanner).toHaveCount(0);

      // 4. Check the fields still hold the typed values
      // Expected: typed first name is kept
      await expect(checkoutPage.firstName).toHaveValue(CUSTOMER.firstName);
    });

    await test.step('postal code empty', async () => {
      // 2. Fill only first name and last name and click Continue
      await checkoutPage.fillInfo(CUSTOMER.firstName, CUSTOMER.lastName, '');
      await checkoutPage.continueButton.click();

      // Expected: postal code error, still on step one
      await checkoutPage.expectStepOne();
      await expect(checkoutPage.errorBanner).toHaveText('Error: Postal Code is required');
    });
  });

  test('SPEC-CHK-004 Whitespace-only names are accepted', async ({
    signedInInventory: inventoryPage,
    cartPage,
    checkoutPage,
  }) => {
    test.fail(true, 'Known bug: whitespace-only names pass validation and the overview opens');

    // 1. Open step one with one item in the cart
    await openStepOne(inventoryPage, cartPage, checkoutPage, [PRODUCTS.backpack]);

    // 2. Enter a single space in first name and last name and 560001 in postal code
    // 3. Click Continue
    await checkoutPage.submitInfo(' ', ' ', CUSTOMER.postalCode);

    // Expected: the form rejects whitespace-only names with a required-field error
    await expect(checkoutPage.errorBanner).toBeVisible();
    await checkoutPage.expectStepOne();
  });

  test('SPEC-CHK-005 Odd input is accepted and not executed', async ({
    page,
    signedInInventory: inventoryPage,
    cartPage,
    checkoutPage,
    loginPage,
  }) => {
    const dialogs: string[] = [];
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });

    const attempts = [
      { label: 'special characters and script text', first: '<script>alert(1)</script>', last: "O'Brien-<b>&\"", postal: 'abc!@#' },
      { label: '300 characters', first: 'a'.repeat(300), last: 'b'.repeat(300), postal: '9'.repeat(300) },
    ];

    for (const [index, attempt] of attempts.entries()) {
      await test.step(attempt.label, async () => {
        // 1. Open step one with one item in the cart (fresh session for the second attempt)
        if (index > 0) {
          await loginPage.startFreshSession();
          await loginPage.login(USERS.standard);
          await inventoryPage.expectLoaded();
        }
        await openStepOne(inventoryPage, cartPage, checkoutPage, [PRODUCTS.backpack]);

        // 2. Enter the values and click Continue
        await checkoutPage.submitInfo(attempt.first, attempt.last, attempt.postal);

        // 4. Look at the overview and for any browser alert
        // Expected: the overview opens, no alert, values not shown
        await checkoutPage.expectStepTwo();
        await expect(checkoutPage.itemNames).toHaveText([PRODUCTS.backpack]);
        await expect(page.getByText(attempt.postal, { exact: true })).toHaveCount(0);
        await expect(page.getByText(attempt.first, { exact: true })).toHaveCount(0);
        expect(dialogs).toEqual([]);
      });
    }
  });

  test('SPEC-CHK-006 Empty cart can be checked out', async ({
    page,
    signedInInventory: inventoryPage,
    cartPage,
    checkoutPage,
  }) => {
    test.fail(true, 'Known bug: checkout is allowed with an empty cart');

    // 1. Sign in with an empty cart and open /cart.html
    await cartPage.goto();
    await cartPage.expectOnCartPage();
    await inventoryPage.expectBadge(0);

    // 2. Click Checkout, enter valid details and click Continue
    await cartPage.checkout.click();

    // Expected: the user is blocked or warned that the cart is empty, so step one is not opened
    await expect(page).not.toHaveURL(/checkout-step-one\.html/);
    await checkoutPage.fillInfo(CUSTOMER.firstName, CUSTOMER.lastName, CUSTOMER.postalCode);
    await checkoutPage.continueButton.click();

    // 3. Read the overview and click Finish
    // Expected: the empty order never reaches the overview or confirmation
    await expect(page).not.toHaveURL(/checkout-step-two\.html/);
  });

  test('SPEC-CHK-007 Back after finishing allows another order', async ({
    page,
    signedInInventory: inventoryPage,
    cartPage,
    checkoutPage,
  }) => {
    test.fail(true, 'Known bug: browser Back after finishing returns to a working overview');

    // 1. Complete an order with one item
    await openOverview(inventoryPage, cartPage, checkoutPage, [PRODUCTS.backpack]);
    await checkoutPage.finishButton.click();
    await checkoutPage.expectComplete();

    // 2. On the confirmation page press browser Back
    await page.goBack();

    // 3. Read the overview and click Finish again
    // Expected: the finished order cannot be placed again, so Finish is not offered
    await expect(checkoutPage.finishButton).toHaveCount(0);
  });

  test('SPEC-CHK-008 Removing an item recalculates the overview', async ({
    signedInInventory: inventoryPage,
    cartPage,
    checkoutPage,
  }) => {
    // 1. Add Backpack and Onesie and open the cart
    await inventoryPage.addAll([PRODUCTS.backpack, PRODUCTS.onesie]);
    const onesieListPrice = (await inventoryPage.price(PRODUCTS.onesie).textContent()) ?? '';
    await inventoryPage.openCart();
    await cartPage.expectOnCartPage();

    // 2. Click Remove on Backpack and click Checkout
    await cartPage.remove(PRODUCTS.backpack);
    await cartPage.checkout.click();
    await checkoutPage.expectStepOne();

    // 3. Enter valid details and click Continue
    await checkoutPage.submitInfo(CUSTOMER.firstName, CUSTOMER.lastName, CUSTOMER.postalCode);

    // Expected: only Onesie is listed with its list price, totals consistent, badge 1
    await checkoutPage.expectStepTwo();
    await expect(checkoutPage.itemNames).toHaveText([PRODUCTS.onesie]);
    await expect(checkoutPage.itemPriceLabels).toHaveText([onesieListPrice]);
    await checkoutPage.expectTotalsConsistent();
    await inventoryPage.expectBadge(1);
  });

  test('SPEC-CHK-009 Cancel on step one and on the overview', async ({
    signedInInventory: inventoryPage,
    cartPage,
    checkoutPage,
  }) => {
    // 1. Add Backpack, open the cart, click Checkout and click Cancel on step one
    await openStepOne(inventoryPage, cartPage, checkoutPage, [PRODUCTS.backpack]);
    await checkoutPage.cancelButton.click();

    // 2. Check the page and badge
    // Expected: cart page with Backpack listed and badge 1
    await cartPage.expectOnCartPage();
    await expect(cartPage.itemNames).toHaveText([PRODUCTS.backpack]);
    await inventoryPage.expectBadge(1);

    // 2. Click Checkout, fill valid details and Continue
    await cartPage.checkout.click();
    await checkoutPage.submitInfo(CUSTOMER.firstName, CUSTOMER.lastName, CUSTOMER.postalCode);
    await checkoutPage.expectStepTwo();

    // 3. Click Cancel on the overview
    await checkoutPage.cancelButton.click();

    // 4. Check the page and open the cart
    // Expected: product list, cart still holds Backpack with badge 1
    await inventoryPage.expectLoaded();
    await inventoryPage.expectBadge(1);
    await inventoryPage.openCart();
    await cartPage.expectOnCartPage();
    await expect(cartPage.itemNames).toHaveText([PRODUCTS.backpack]);
  });

  test('SPEC-CHK-010 Typed values are lost on Cancel and reload', async ({
    page,
    signedInInventory: inventoryPage,
    cartPage,
    checkoutPage,
  }) => {
    // 1. Add Backpack and open step one
    await openStepOne(inventoryPage, cartPage, checkoutPage, [PRODUCTS.backpack]);

    // 2. Type Ada, Lovelace, 560001, click Cancel, then click Checkout again
    await checkoutPage.fillInfo(CUSTOMER.firstName, CUSTOMER.lastName, CUSTOMER.postalCode);
    await checkoutPage.cancelButton.click();
    await cartPage.expectOnCartPage();
    await cartPage.checkout.click();
    await checkoutPage.expectStepOne();

    // Expected: all three fields are empty
    await expect(checkoutPage.firstName).toHaveValue('');
    await expect(checkoutPage.lastName).toHaveValue('');
    await expect(checkoutPage.postalCode).toHaveValue('');

    // 3. Fill the fields and reload step one
    await checkoutPage.fillInfo(CUSTOMER.firstName, CUSTOMER.lastName, CUSTOMER.postalCode);
    await page.reload();

    // Expected: fields empty after reload
    await checkoutPage.expectStepOne();
    await expect(checkoutPage.firstName).toHaveValue('');
    await expect(checkoutPage.lastName).toHaveValue('');
    await expect(checkoutPage.postalCode).toHaveValue('');
  });

  test('SPEC-CHK-011 Reload on the overview and confirmation', async ({
    page,
    signedInInventory: inventoryPage,
    cartPage,
    checkoutPage,
  }) => {
    // 1. Add Backpack and Onesie and reach the overview
    await openOverview(inventoryPage, cartPage, checkoutPage, [PRODUCTS.backpack, PRODUCTS.onesie]);
    const totalBeforeReload = (await checkoutPage.total.textContent()) ?? '';

    // 2. Reload the page
    await page.reload();

    // Expected: still the overview with 2 items and the same total
    await checkoutPage.expectStepTwo();
    await expect(checkoutPage.itemRows).toHaveCount(2);
    await expect(checkoutPage.total).toHaveText(totalBeforeReload);

    // 3. Click Finish, then reload the confirmation page
    await checkoutPage.finishButton.click();
    await checkoutPage.expectComplete();
    await page.reload();

    // Expected: still the confirmation with the thank-you message
    await checkoutPage.expectComplete();
    await expect(checkoutPage.thankYou).toHaveText(THANK_YOU);
  });

  test('SPEC-CHK-012 Direct URL to later steps skips step one', async ({
    page,
    signedInInventory: inventoryPage,
    checkoutPage,
  }) => {
    test.fail(true, 'Known bug: step two and complete open directly without an order');

    // 1. Sign in with an empty cart
    await inventoryPage.expectBadge(0);

    // 2. Open /checkout-step-two.html directly
    await checkoutPage.gotoStepTwo();

    // Expected: redirected back to the cart or step one
    await expect(page).not.toHaveURL(/checkout-step-two\.html/);

    // 3. Open /checkout-complete.html directly
    await checkoutPage.gotoComplete();

    // Expected: redirected back to the cart or step one
    await expect(page).not.toHaveURL(/checkout-complete\.html/);
  });

  test('SPEC-CHK-013 Checkout page blocked when not signed in', async ({ loginPage, checkoutPage }) => {
    // 1. In a fresh session open https://www.saucedemo.com/checkout-step-one.html
    const response = await checkoutPage.gotoStepOne();

    // Expected: first response is a 404, then the login page shows the access error
    expect(response?.status()).toBe(404);
    await loginPage.expectOnLoginPage();
    await loginPage.expectError(accessError('/checkout-step-one.html'));
  });

  test('SPEC-CHK-014 problem_user form values and error_user finish', async ({
    page,
    loginPage,
    inventoryPage,
    cartPage,
    checkoutPage,
  }) => {
    await test.step('problem_user form values', async () => {
      // 1. Sign in as problem_user, add Backpack, open step one
      await loginPage.goto();
      await loginPage.login(USERS.problem);
      await inventoryPage.expectLoaded();
      await openStepOne(inventoryPage, cartPage, checkoutPage, [PRODUCTS.backpack]);

      // 1. Type first name Ada, last name Lovelace, postal code 560001, then read the fields
      await checkoutPage.firstName.pressSequentially(CUSTOMER.firstName);
      await checkoutPage.lastName.pressSequentially(CUSTOMER.lastName);
      await checkoutPage.postalCode.pressSequentially(CUSTOMER.postalCode);

      // Expected: known quirk of the demo account, typed text lands in the wrong field
      await expect(checkoutPage.firstName).toHaveValue('e');
      await expect(checkoutPage.lastName).toHaveValue('');
      await expect(checkoutPage.postalCode).toHaveValue(CUSTOMER.postalCode);

      // 1. Click Continue
      await checkoutPage.continueButton.click();

      // Expected: known quirk of the demo account
      await expect(checkoutPage.errorBanner).toHaveText('Error: Last Name is required');
    });

    await test.step('error_user finish', async () => {
      // 2. Sign in as error_user, add Backpack, open step one, type the same values and click Continue
      await loginPage.startFreshSession();
      await loginPage.login(USERS.error);
      await inventoryPage.expectLoaded();
      await openStepOne(inventoryPage, cartPage, checkoutPage, [PRODUCTS.backpack]);
      await checkoutPage.firstName.pressSequentially(CUSTOMER.firstName);
      await checkoutPage.lastName.pressSequentially(CUSTOMER.lastName);
      await checkoutPage.postalCode.pressSequentially(CUSTOMER.postalCode);
      await expect(checkoutPage.lastName).toHaveValue('');
      await checkoutPage.continueButton.click();

      // Expected: known quirk of the demo account, the empty last name still opens the overview
      await checkoutPage.expectStepTwo();

      // 3. On the overview click Finish
      await checkoutPage.finishButton.click();

      // Expected: known quirk of the demo account, Finish does not reach the confirmation
      await expect(page).toHaveURL('https://www.saucedemo.com/checkout-step-two.html');
      await expect(checkoutPage.thankYou).toHaveCount(0);
    });
  });
});
