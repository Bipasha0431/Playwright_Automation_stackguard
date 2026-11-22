# Test Plan: Sauce Demo Checkout Flow

**Application:** https://www.saucedemo.com
**Scope:** Checkout flow: cart, customer information, order overview and order confirmation.  
**Test account:** `standard_user` / `secret_sauce`. Everything below was observed on the live site with this account.

## 1. How the flow behaves

| Step             | URL                       | What the user sees and can do                                                                                 |
| ---------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Inventory        | `/inventory.html`         | Product list, **Add to cart** turns into **Remove**; the cart icon shows an item-count badge.                 |
| Cart             | `/cart.html`              | Items with name, price and quantity. Buttons: **Remove**, **Continue Shopping**, **Checkout**.                |
| Your Information | `/checkout-step-one.html` | First Name, Last Name, Zip/Postal Code. Buttons: **Continue**, **Cancel**.                                    |
| Overview         | `/checkout-step-two.html` | Items, Payment and Shipping Information, **Item total**, **Tax**, **Total**. Buttons: **Cancel**, **Finish**. |
| Complete         | `/checkout-complete.html` | "Thank you for your order!" and a **Back Home** button.                                                       |

**Order total:** item total is the sum of the item prices, tax is 8% rounded to the cent, and total = item total+tax.  
Examples: $7.99 + tax $0.64 → $8.63; $55.97 + tax $4.48 → $60.45

**Form validation:**

| Input | Result |
|-------|--------|
| First name, last name or postal code empty | Stays on the page with `Error: First Name is required`, `Error: Last Name is required` or `Error: Postal Code is required`. Only the first missing field (in that order) is reported. |
| Whitespace only, letters or symbols in the postal code, special characters, 300-character values | Accepted |

**Navigation and state:**

- Cancel on "Your Information" goes to the cart. Cancel on the overview goes to the inventory. Items are kept in both cases.
- Removing an item updates the badge and the overview totals.
- Finishing shows the confirmation and clears the badge. Back then returns to the overview with no items.
- An empty cart can be checked out all the way to the confirmation.
- The cart survives logout and re-login.

**Without a session:** opening a cart or checkout URL while logged out gives a 404, then the login page with `Epic sadface: You can only access '/cart.html' when you are logged in.`

## 2. Main risks

| # | Risk | Why it matters | Impact | Status on the live site | Covered by |
|---|------|----------------|--------|-------------------------|------------|
| R1 | Wrong item total, tax or grand total | The customer is charged the wrong amount. | High | Holds (8% tax correct on 6 carts) | TC02 |
| R2 | An order can be placed with an empty cart | Invalid order. | High | **Confirmed bug (BUG-01)** | TC03, TC10 |
| R3 | Weak form validation (whitespace-only, odd or non-numeric postal code, no length limit) | Orders that cannot be shipped. | Medium | **Whitespace confirmed (BUG-02)** | TC04, TC05 |
| R4 | Cart contents or badge out of sync with what was added or removed | The user buys the wrong things. | High | Holds | TC06, TC07 |
| R5 | Checkout reachable without a session | Access-control gap. | High | Holds | TC09 |
| R6 | Cancel or back navigation loses cart items or sends the user to the wrong place | Abandoned purchases. | Medium | Items kept; destinations inconsistent | TC08 |
| R7 | The order does not finish cleanly (no confirmation, cart not cleared, repeatable via Back) | Duplicate orders. | Medium | **Partly confirmed** (repeatable via Back) | TC01, TC10 |

### Risk details

**R1: Wrong item total, tax or grand total**

- **What can go wrong:** the order summary shows an amount that does not match the products in the cart, or the tax is calculated or rounded wrongly.
- **Observed:** tax is exactly 8%, rounded to the cent. Checked on six carts, for example $29.99 → $2.40 → $32.39, $55.97 → $4.48 → $60.45, and all six items $129.94 → $10.40 → $140.34. The risk currently holds, so the test guards against regressions.
- **How we test it:** add different product combinations, read the item total, tax and total, and assert each value against the prices.

**R2: An order can be placed with an empty cart**

- **What can go wrong:** the system lets a user check out with nothing in the cart. Payment, fulfilment and reporting would receive an empty order.
- **Observed:** **confirmed.** With zero items, Checkout, Continue and Finish all work. The overview shows Item total $0 and Total $0.00, and the flow ends with "Thank you for your order!".
- **How we test it:** open the cart with no items, click Checkout, and assert that the user is blocked or warned. The test is marked as an expected failure until the bug is fixed.

**R3: Weak form validation**

- **What can go wrong:** the customer form accepts data that cannot be used, such as whitespace-only names, letters or symbols in the postal code, or inputs with no length limit. Unbounded input can also cause display or storage problems.
- **Observed:** empty fields are rejected with exact messages (`Error: First Name is required`, `Error: Last Name is required`, `Error: Postal Code is required`). Whitespace-only names are accepted. Letters or symbols in the postal code and 300-character inputs are also accepted.
- **How we test it:** empty fields one at a time and all together, then whitespace-only values. Postal-code format and length are logged as observations and do not fail the suite.

**R4: Cart contents or badge out of sync**

- **What can go wrong:** the cart page, the overview or the badge number does not match what the user added or removed.
- **Observed:** this held. Names, prices and the badge count matched across inventory, cart and overview, and removing an item updated both the badge and the overview total.
- **How we test it:** add and remove items, then compare names, prices and counts on every page.

**R5: Checkout reachable without a session**

- **What can go wrong:** someone who is not logged in opens a cart or checkout URL directly and gets in.
- **Observed:** handled. The server answers 404, then the app shows the login page with `Epic sadface: You can only access '/cart.html' when you are logged in.` The checkout step pages behave the same way.
- **How we test it:** open each protected URL in a fresh, logged-out browser context and assert the login page and the exact message.

**R6: Cancel or back navigation loses items or misroutes the user**

- **What can go wrong:** pressing Cancel or Back drops the cart or sends the user somewhere unexpected, and they may abandon the purchase.
- **Observed:** items were kept in every case. Cancel on step one goes to the cart, and Cancel on the overview goes to the inventory. I treat that as a minor inconsistency, not a defect.
- **How we test it:** cancel on step one and on the overview, then assert the URL and that the items and badge are unchanged.

**R7: The order does not finish cleanly**

- **What can go wrong:** no confirmation appears, the cart is not cleared afterwards, or the order can be repeated, which can cause duplicates.
- **Observed:** the confirmation and the cleared badge both work. Pressing Back after finishing returns to the overview with 0 items and a working Finish button, so another empty order can be placed. This ties back to R2.
- **How we test it:** finish an order and assert the confirmation text and the cleared badge, then press Back and assert the state.

## 3. Top 10 test cases (priority order)

| Pri | ID   | Test case                                                                                                 | Type                | Expected result                                                                                                                                         | Automate?   | Why                                                                         |
| --- | ---- | --------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------- |
| 1   | TC01 | **Happy path.** Log in, add 2 products, checkout with valid details, finish.                              | Positive            | Overview lists both items; confirmation "Thank you for your order!"; cart badge gone.                                                                   | **Yes**     | The core revenue path. Must pass on every build.                            |
| 2   | TC02 | **Order maths.** Add 3 products with different prices and open the overview.                              | Positive            | Item total = sum of prices; tax = 8% rounded to cents; total = item total + tax.                                                                        | **Yes**     | Money-critical and pure calculation, so automation is cheap and reliable.   |
| 3   | TC03 | **Empty cart checkout.** With no items, open the cart and click Checkout.                                 | Negative / edge     | Checkout is blocked or the user is warned. **Actual: it completes with a $0.00 order (BUG-01).**                                                        | **Yes**     | High-impact defect.                                                         |
| 4   | TC04 | **Required fields in user information** Leave each field empty in turn, then all empty.                   | Negative            | The exact error per field (see section 1); the user stays on step one.                                                                                  | **Yes**     | Data-driven and fast. Validation regressions are common.                    |
| 5   | TC05 | **Whitespace-only input.** Submit `" "` in the name fields.                                               | Negative / edge     | The form rejects it. **Actual: it is accepted (BUG-02).**                                                                                               | **Yes**     | Confirmed validation gap. Cheap to automate.                                |
| 6   | TC06 | **Cart integrity.** Add items; compare names, prices and badge count across inventory, cart and overview. | Positive            | Names, prices and the count match exactly what was added.                                                                                               | **Yes**     | Catches state bugs between pages (R4).                                      |
| 7   | TC07 | **Remove an item in the cart, then checkout.**                                                            | Positive / edge     | The badge drops, the item disappears, and the overview totals recalculate.                                                                              | **Yes**     | Combines cart changes with the totals (R1 and R4).                          |
| 8   | TC08 | **Cancel and navigation.** Cancel on step one and on the overview.                                        | Edge                | Step one goes to the cart; overview goes to the inventory; items kept.                                                                                  | **Yes**     | Cheap navigation checks that guard against cart loss (R6).                  |
| 9   | TC09 | **Unauthenticated access.** Open `/checkout-step-one.html` and `/cart.html` without logging in.           | Negative / security | Login page with `You can only access '<path>' when you are logged in.`                                                                                  | **Yes**     | Quick access-control check (R5).                                            |
| 10  | TC10 | **Finish, then Back.** Complete an order, press Back, and try to finish again.                            | Edge                | The cart is empty and a second order cannot be placed. **Actual: Back returns to the overview, with 0 items and a working Finish button (see BUG-01).** | **Partial** | Automate the Back and empty-cart check. Judging the browser Back behaviour. |
