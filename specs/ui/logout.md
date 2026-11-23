# uespenLogout Test Plan

## Feature summary

Signed-in users end their session from the burger menu with the Logout item. This plan covers the burger menu (open, close, items), logging out from the main pages, the login page afterwards, browser Back, reload and direct visits after logout, and the cart when the same user signs back in. Sign-in and sign-in errors are covered in login.md, and signed-out visits to the product list and cart are covered in inventory.md and cart.md; they are not repeated here.

## Application URL / environment

- URL under test: https://www.saucedemo.com (root address is the login page)
- Environment: public production demo. A fresh browser context is used per scenario.

## Credentials used

- standard_user (main scenarios)
- All accounts share the password secret_sauce.

## Journey table

| Plan ID | Spec ID | Automation Title | Journey | Steps | Expected |
|---|---|---|---|---|---|
| OUT-001 | SPEC-OUT-001 | Burger menu shows its items and Close Menu hides it | Open and close the burger menu | 1. Sign in as standard_user. 2. Click Open Menu. 3. Read the menu items. 4. Click Close Menu (X). 5. Click Add to cart on the first product. | Menu lists All Items, Dynamic Catalog, About, Logout and Reset App State, plus Close Menu. After Close Menu the menu is hidden and the page is clickable again (cart badge shows 1). |
| OUT-002 | SPEC-OUT-002 | Logout from the product list returns to a clean login page | Log out from the product list | 1. Sign in as standard_user. 2. Click Open Menu. 3. Click Logout. | URL is the root address https://www.saucedemo.com/. The username and password fields are empty and no error banner is shown. |
| OUT-003 | SPEC-OUT-003 | Logout works the same from cart, product detail and both checkout steps | Log out from every other signed-in page | 1. Sign in as standard_user and add one item. 2. Open the cart page, open the menu and click Logout. 3. Repeat from a product detail page, checkout step one, and checkout step two (reached with first name, last name and postal code filled). | Each time the user lands on the login page at the root address with empty fields and no error banner. |
| OUT-004 | SPEC-OUT-004 | Browser Back after logout does not reveal the product list | Press Back after logout | 1. Sign in as standard_user. 2. Log out from the burger menu. 3. Press browser Back. 4. Reload the page. | After Back and after reload the login page is shown at the root address with "Epic sadface: You can only access '/inventory.html' when you are logged in." No products are visible. |
| OUT-005 | SPEC-OUT-005 | Same user signing in again keeps the cart | Cart after sign-in again as the same user | 1. Sign in as standard_user. 2. Add Sauce Labs Backpack and Sauce Labs Bike Light. 3. Log out. 4. Sign in again as standard_user. 5. Check the badge, the product buttons and the cart page. | Badge shows 2. Backpack and Bike Light show Remove and the other four show Add to cart. The cart page lists Sauce Labs Backpack and Sauce Labs Bike Light. |

## Open questions / notes

- No open questions/notes
