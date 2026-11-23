# AI notes

## Tools used and what for

| Tool                                        | Used for                                                                                                                                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code (VS Code extension, Sonnet 5.5) | Project setup, page objects and fixtures, editing the agent files, running the suite                                                                                                            |
| Playwright MCP (`playwright-test` server)   | Let the agents drive a real browser to look at the shop before anything was written.                                                                                                            |
| Playwright planner agent                    | Walked the live app and wrote the test plans in `specs/ui/` (login, inventory, cart, checkout, logout).                                                                                         |
| Playwright generator agent                  | Turned each plan row into a test in `tests/ui/<feature>.spec.ts` using the page objects.                                                                                                        |
| API planner agent                     | Probed the live booking API with curl and wrote the plan `specs/api/booking.md` (18 rows).                                                                                                      |
| API generator agent                   | Turned the API plan into three spec files in `tests/api/` grouped by purpose (`booking-crud`, `booking-token`, `booking-errors`), with the clients, `api/endpoints.ts`, test data and fixtures. |
| Playwright test runner                      | Ran every generated test, several times, to check they pass and are stable. The API tests run with the `api` project.                                                                           |

I wrote the instructions for the agents (locator order, test naming, no exact prices, one spec file per feature) and reviewed what they produced. Decisions about scope and what counts as a bug were mine.

## One case where the AI was wrong

**What happened.** The checkout plan said that after filling step one, clicking Continue and pressing the browser Back button, all three fields are empty (CHK-010). The generated test failed: Back returned to step one with the first name still filled in ("Ada"), three runs in a row. The AI decided the plan was wrong. It wrote "the browser restores typed values on Back" into the plan notes, removed the Back step from the test and the plan, and presented that as the explanation.

**What was wrong.** The explanation was a guess, stated as a fact, and it was never tested. I had checked the Back button manually and the fields were empty, exactly as the plan said, so the plan was right and the AI's conclusion was wrong. The AI had also removed a valid check.

**How it was noticed.** I tested it manually and told the AI its explanation did not match what I saw. It then ran probes: with a headed browser the fields are empty after Back (with `fill`, with real typing, and with an earlier Cancel round trip), but in headless Chromium they come back as "Ada" every time (6 of 6 runs). So the app behaves as the plan says in a real browser, and only headless Chromium differs.

**Fix.** The Back step is back in the test and the plan. The test checks Back only when the browser is headed and always runs the Cancel and reload checks. The plan notes now describe the headed and headless difference. The cost is that CI, which runs headless, does not cover Back.

## Other things the AI got wrong, and how they were caught

- **Planner stalled on the login page.** It kept using `getByTestId`, but Sauce Demo marks its elements with `data-test`, not `data-testid`, so none of its locators matched and it never got past the login page. It stalled several times before the cause was clear. The fix was to set a locator order in the planner's instructions (role, label, placeholder, text, test id, CSS last). The generator got the same order plus a note about `data-test`. Some later stalls came from briefs that were too large, so I gave the planner one narrow checklist per flow.
- **Wrong import path in the generator instructions.** When asked for one spec file per feature, the AI wrote `../fixtures` into the agent instructions. The spec sits in `tests/ui/`, so it needs `../../fixtures`. The generator failed with "Cannot find module" and I corrected the instructions.

## How the agents were improved

The planner and generator that `init-agents` installed were generic, and their first results were not good enough, so I rewrote their instructions in `.claude/agents/` as I went.

**Planner (test plans)**

- **Fixed plan format:** every plan has a feature summary, URL and environment, credentials used, one journey table (Plan ID, Spec ID, Automation Title, Journey, Steps, Expected) and open questions. Plans are saved as `specs/ui/<feature>.md`.
- **Unique Spec IDs:** it must read the existing plans first, so no ID repeats. The Spec ID later appears in each test title.
- **One module at a time:** it works from a short checklist per flow, stops when the checklist is done, and saves early. Large briefs made it stall, and narrow ones did not.
- **Locator order and failure rules:** role, label, placeholder, text, test id, CSS last. If a tool fails twice, it reports the error instead of looping.
- **No invented behaviour:** it records only what it saw, and marks anything odd as a "suspected bug" with the observed and the expected result side by side.

**Generator (test code)**

- **Page objects:** it reuses `pages/`, `fixtures/` and `utils/`, and only adds missing members, which it must list in its report.
- **One spec file per feature:** `tests/ui/<feature>.spec.ts`, with the Spec ID at the start of every test title so each test traces back to its plan row.
- **Known bugs:** tests for suspected bugs assert the correct behaviour and are marked `test.fail`, so the suite stays green while the bug exists.
- **Fail loudly:** it runs each test and may retry at most three times. If it still fails, it reports the failure and does not weaken the assertion.
- **No fixed waits and no exact prices.**

## API automation (booking API)

I asked for a second pair of agents for the booking API at https://restful-booker.herokuapp.com. The API planner probed the live API with curl and saved `specs/api/booking.md`. The API generator turned it into 18 tests, grouped by purpose into three files in `tests/api/` (`booking-crud`, `booking-token`, `booking-errors`): create, read, list, full and partial update, delete, and failure cases (missing or invalid token, wrong id, bad create bodies).

**How the API agents were improved**

- **No fixed API:** the agents are not tied to one service. The base URL is given when the agent is called, and the planner stops and asks if it is missing.
- **Endpoint paths in one place:** the plan has an Endpoints table with a name for each endpoint, and the generator builds `api/endpoints.ts` from it. Clients import their paths from there, and no path is repeated in a client, fixture or test.
- **No unneeded clients or fixtures:** one client per meaningful group of endpoints, and a fixture only where tests use it. A single simple endpoint does not get its own client.
- **Plans and tests trace to each other:** Spec IDs in the form `SPEC-API-<PREFIX>-nnn` appear in the plan rows and in the test titles.

## Limit worth knowing

For the known-bug tests, `test.fail` passes as soon as any assertion fails. In CHK-006 and CHK-012 the first failing assertion ends the test, so the later steps are never reached while the bug exists. They would only be checked once the bug is fixed and the marker is removed. The five API bug tests have the same limit: each one stops at its first failing check (the status code).

## How the AI output was checked

- The full suite was run repeatedly (twice per feature file and twice for the whole suite) to catch flaky tests.
- The four tests that document real bugs were run with their `test.fail` markers switched off to confirm each fails on the bug itself and not on a bad locator.
- No test asserts an exact price. Prices and totals are compared with values read from the page.
- I ran the five API bug tests on a copy with `test.fail` removed. Each one failed on its status-code assertion (405 vs 404, 500 vs 400, 200 vs 400), and the other 16 tests passed. That confirms the five fail on the API defect itself and not on a bad assertion.
