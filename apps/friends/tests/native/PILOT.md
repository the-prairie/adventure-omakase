# Operator-mediated pilot

`pilot-completed.spec.mjs` replays independent fictional actor decisions through four isolated browser accounts. It skips ordinary suites unless `TRIP_RECORDING_DIR` is set. The operator writes each actor's observed state there and waits for explicit decision JSON; it does not manufacture actor responses.

From `apps/friends`, run:

```sh
TRIP_RECORDING_DIR=/absolute/private/pilot-decisions RECORD_TRIP=0 pnpm exec playwright test --config playwright.config.mjs tests/native/pilot-completed.spec.mjs --project chromium
```

The input directory requires `ariel`, `claire`, `avery`, and `brooke` `-initial-decision.json` and `-response-decision.json`, plus `claire`, `avery` and `brooke` `-dinner-decision.json`. See the harness handshake and form callers for fields. Prefer `planTitle` for replay responses: IDs belong to one isolated run. Dinner responses resolve the newly created dinner by title. Missing decisions fail after the bounded operator wait. Keep prompts and raw state private; publish only sanitized evidence.

Set `RECORD_TRIP=1` for normal-speed scene recording with deliberate reading pauses. Scene assembly omits setup and actor waiting; it must not be described as an uninterrupted recording. The September 11 retained replay passed in 47 seconds with saved decisions. Root `pnpm check` passed after formatting, removing unused variables, gating ordinary suites and resolving replay dinner IDs.

The run demonstrated four afternoon ideas, three sitting-out comments and three explicit dinner RSVPs. No changed-plan reconfirmation, real visit, purchase, enforced numeric budget or live provider check occurred. Characters were separate AI decision makers; Playwright operated their browsers. The separate Extra Stop publication contains the story, selected letters, film and independent review. No application runtime behavior changes in this harness addition.
