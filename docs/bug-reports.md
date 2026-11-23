# Bug reports: Sauce Demo (https://www.saucedemo.com)

All four bugs were found in the checkout flow with `standard_user` / `secret_sauce` on the public demo. Each was reproduced manually in the browser. Each is covered by an automated test in [tests/ui/checkout.spec.ts](../tests/ui/checkout.spec.ts) that asserts the correct behaviour and is marked `test.fail(true, 'Known bug: ...')`, so the suite stays green while the bug exists. The marker must be removed once the bug is fixed.

| ID | Title | Severity | Test |
|---|---|---|---|
| BUG-001 | An empty cart can be checked out and "ordered" | High | SPEC-CHK-006 |
| BUG-002 | The same order can be placed again with browser Back | High | SPEC-CHK-007 |
| BUG-003 | Checkout pages open by direct URL without going through the steps | Medium | SPEC-CHK-012 |
| BUG-004 | Whitespace-only values pass checkout validation | Medium | SPEC-CHK-004 |

---

## BUG-001: An empty cart can be checked out and "ordered"

**Severity: High.** A customer can complete a purchase that contains nothing, and the shop shows a success message for it. This hurts the order data and the customer's trust.

**Steps**

1. Sign in as `standard_user` with an empty cart.
2. Open https://www.saucedemo.com/cart.html.
3. Click **Checkout**.
4. Enter first name `Ada`, last name `Lovelace`, postal code `560001` and click **Continue**.
5. On the overview, click **Finish**.

**Expected:** The user is blocked or warned that the cart is empty, for example Checkout is disabled or step one is not reached.

**Actual:** Step one (`/checkout-step-one.html`) opens. The overview shows no items and "Item total: $0". **Finish** works and the page shows "Thank you for your order!".

---

## BUG-002: The same order can be placed again with browser Back

**Severity: High.** After an order is finished, a second order can be placed from the browser history, so a finished order is not final.

**Steps**

1. Sign in as `standard_user`, add Sauce Labs Backpack, and complete checkout until "Thank you for your order!" is shown.
2. Press the browser **Back** button.
3. On the page that opens, click **Finish** again.

**Expected:** A finished order cannot be placed again. The user is sent back to the cart or the product list, or Finish is unavailable.

**Actual:** Back returns to the overview (`/checkout-step-two.html`) with no items and no cart badge. **Finish** is still enabled, and clicking it shows "Thank you for your order!" a second time.

---

## BUG-003: Checkout pages open by direct URL without going through the steps

**Severity: Medium** — the checkout steps can be skipped and the confirmation page shows for an order that was never placed, but no real data is changed.

**Steps**

1. Sign in as `standard_user` with an empty cart.
2. Open https://www.saucedemo.com/checkout-step-two.html directly.
3. Open https://www.saucedemo.com/checkout-complete.html directly.

**Expected:** Both pages redirect back, to the cart or to checkout step one, because no checkout was started.

**Actual:** Both pages load with no redirect. The overview shows "Item total: $0" and a working **Finish** button, and the confirmation page shows "Thank you for your order!" without any order.

---

## BUG-004: Whitespace-only values pass checkout validation

**Severity: Medium** — an order can be placed with a blank name and postal code, so it has no usable delivery details, although nothing else breaks.

**Steps**

1. Sign in as `standard_user`, add Sauce Labs Backpack and open checkout step one.
2. Enter a single space in **First Name**, in **Last Name** and in **Postal Code**.
3. Click **Continue**.

**Expected:** The form rejects the values, starting with "Error: First Name is required", because a value made only of spaces is empty.

**Actual:** No error is shown and the overview (`/checkout-step-two.html`) opens. The same happens with a space in only one of the fields: a space in both names with a real postal code, or real names with a space as the postal code. Only completely empty fields are rejected.

---
