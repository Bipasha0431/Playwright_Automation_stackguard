# Sauce Demo UI and Restful-Booker API automation

Playwright and TypeScript tests for two public demo sites:

- **UI:** https://www.saucedemo.com — the shop's main journey: login, product list, cart, checkout and logout.
- **API:** https://restful-booker.herokuapp.com — booking create, read, update and delete, plus failure cases.

| Suite | Tests | Where        |
| ----- | ----- | ------------ |
| UI    | 50    | `tests/ui/`  |
| API   | 18    | `tests/api/` |

## Setup

**Prerequisites:** Git, npm and Node.js 

1. Clone the repository and open the folder:
   ```bash
         git clone https://github.com/Bipasha0431/Playwright_Automation_stackguard.git
         cd Playwright_Automation_stackguard
   ```
2. Install the dependencies (this uses the exact versions in `package-lock.json`):
   ```bash
         npm ci
   ```
3. Install the browser Playwright uses (Chromium only):
   ```bash
         npx playwright install chromium
   ```

## Run the tests

| Command                   | What it runs                            |
| ------------------------- | --------------------------------------- |
| `npm test`                | Everything: the `ui` and `api` projects |
| `npm run test:ui`         | UI tests only                           |
| `npm run test:api`        | API tests only                          |
| `npm test -- --workers=1` | Everything, one test at a time          |
| `npm run report`          | Open the last HTML report               |

Run one file, or one test by its Spec ID:

```bash
npx playwright test tests/ui/checkout.spec.ts --project=ui
npx playwright test --project=ui -g "SPEC-CHK-006"
```

The HTML report is written to `playwright-report/`.

## GitHub Actions workflow

[.github/workflows/playwright.yml](.github/workflows/playwright.yml) runs on every pull request: install, type check, install Chromium, run all tests, and upload the HTML report as an artifact. It can also be started manually from the **Actions** tab, where you choose `all`, `ui` or `api`. The **Run workflow** button only appears once the workflow file is on the default branch.

## Project layout

```
.
├── tests/
│   ├── ui/                    UI specs, one file per feature
│   │   ├── login.spec.ts
│   │   ├── inventory.spec.ts
│   │   ├── cart.spec.ts
│   │   ├── checkout.spec.ts
│   │   ├── logout.spec.ts
│   │   └── seed.spec.ts       Setup test used by the planner and generator agents
│   └── api/                   API specs
│       ├── booking-crud.spec.ts
│       ├── booking-token.spec.ts
│       └── booking-errors.spec.ts
├── pages/                     UI page objects
│   ├── LoginPage.ts
│   ├── InventoryPage.ts
│   ├── CartPage.ts
│   ├── CheckoutPage.ts
│   └── MenuComponent.ts       Burger menu, shared by all signed-in pages
├── fixtures/
│   ├── index.ts               UI fixtures (page objects, signed-in user)
│   └── api.ts                 API fixtures (client, token, created booking)
├── api/
│   ├── BookingClient.ts       API client for the booking endpoints
│   └── endpoints.ts           Endpoint paths
├── utils/
│   ├── users.ts               Demo users, products and customer details (UI)
│   └── api-data.ts            Booking builder and API credentials
├── specs/
│   ├── ui/                    UI test plans, one per feature
│   └── api/booking.md         API test plan
├── docs/
│   ├── test-plan.md           Checkout test plan: risks and top 10 cases
│   ├── bug-reports.md         Task 4
│   └── ai-notes.md            Task 5
├── .claude/agents/            Planner, generator and healer agents used to write the plans and tests
├── .github/workflows/         CI workflow (playwright.yml)
├── playwright.config.ts       Projects: ui and api
├── package.json
└── tsconfig.json
```

Folders created by test runs (`playwright-report/`, `test-results/`) are not committed.

## How the tests are built

- **Plans first.** Each feature has a plan in `specs/` with a journey table. Every row has a Plan ID and a unique Spec ID such as `SPEC-CHK-006`. The Spec ID is at the start of the matching test title, so a test traces back to its plan row and the other way round.
- **Page objects and fixtures.** Tests never use raw locators. They call methods on page objects (`LoginPage`, `InventoryPage`, `CartPage`, `CheckoutPage`, `MenuComponent`) provided as fixtures. Shared texts, such as error messages, live in the page objects.
- **Locators.** Role, label, placeholder and text first. CSS is used only where the site gives no accessible handle, and only inside page objects. The site marks elements with `data-test`, so `getByTestId` is not used.
- **No fixed waits.** Every assertion auto-waits.
- **Independent tests.** Each test starts from a fresh browser context and signs in or creates its own data. No test depends on another.
- **API data.** Each API test creates its own booking with a unique name. The created-booking fixture deletes it afterwards, and cleans up if a create request fails or times out. API tests are never retried, because a retry could create a second booking.
- **Known bugs.** A test for a bug asserts the *correct* behaviour and is marked `test.fail(true, 'Known bug: ...')`. The suite stays green while the bug exists. When the bug is fixed the test starts to pass, Playwright then reports it as failed (it was expected to fail), and the marker should be removed.

## Bug reports

See [docs/bug-reports.md](docs/bug-reports.md). Four UI bugs are reported: an empty cart can be checked out (BUG-001), a finished order can be placed again with browser Back (BUG-002), checkout pages open by direct URL (BUG-003) and whitespace-only checkout values are accepted (BUG-004). Each links to its automated test.

## AI notes

See [docs/ai-notes.md](docs/ai-notes.md) for the tools used, how the agents were set up, and a case where the AI was wrong.
