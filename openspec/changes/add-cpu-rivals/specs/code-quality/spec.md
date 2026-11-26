# Spec Delta

## MODIFIED Requirements

### Requirement: Continuous integration
Every push and pull request SHALL run the combined check, the quick rival sim, the production build and the browser tests.

#### Scenario: Failing browser test
- **WHEN** a browser test fails in CI
- **THEN** the run fails and its report and videos can be downloaded

#### Scenario: Strength order broken
- **WHEN** a change breaks the quick sim's strength order
- **THEN** the CI run fails at the sim step

### Requirement: Engine purity
Lint SHALL fail when code in `src/core/` or `src/ai/` imports Phaser or other game code outside the rules and the rival profiles, or uses randomness, the clock, browser globals or non-integer math. The rules config and the rival profiles SHALL follow the same purity rules.

#### Scenario: Impure engine code
- **WHEN** a core file imports Phaser or uses `Math.random`, `Date`, `performance`, `setTimeout`, `window`, `Math.sin` or `0.5`
- **THEN** `npm run lint` fails naming the file and the reason

#### Scenario: Impure rival profile
- **WHEN** the rival profiles config contains `0.5` or imports another config file
- **THEN** `npm run lint` fails naming the file and the reason

#### Scenario: Rule removed by mistake
- **WHEN** a purity rule stops working
- **THEN** `npm test` fails
