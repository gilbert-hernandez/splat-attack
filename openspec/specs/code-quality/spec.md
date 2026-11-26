# code-quality Specification

## Purpose
Defines the automated checks that keep the code consistent and catch likely bugs, locally and in CI.

## Requirements

### Requirement: Combined check
The project SHALL provide one command that runs the format check, lint, type-check and unit tests in order, stopping at the first failure.

#### Scenario: All checks pass
- **WHEN** a developer runs `npm run check` on a clean checkout
- **THEN** every step passes and the command exits successfully

#### Scenario: A check fails
- **WHEN** a source file has an undefined variable, a wrong JSDoc type, or off-style formatting
- **THEN** `npm run check` exits with an error naming the file

### Requirement: Individual checks
The project SHALL provide separate commands to format, check formatting, lint, type-check and report unit-test coverage.

#### Scenario: Coverage includes untested files
- **WHEN** a developer runs `npm run coverage`
- **THEN** a table and an HTML report list every file in `src/`, including those no test loads

### Requirement: Continuous integration
Every push and pull request SHALL run the combined check, the production build and the browser tests.

#### Scenario: Failing browser test
- **WHEN** a browser test fails in CI
- **THEN** the run fails and its report and videos can be downloaded

### Requirement: Engine purity
Lint SHALL fail when code in `src/core/` or `src/ai/` imports Phaser or other game code outside the rules, or uses randomness, the clock, browser globals or non-integer math.

#### Scenario: Impure engine code
- **WHEN** a core file imports Phaser or uses `Math.random`, `Date`, `performance`, `setTimeout`, `window`, `Math.sin` or `0.5`
- **THEN** `npm run lint` fails naming the file and the reason

#### Scenario: Rule removed by mistake
- **WHEN** a purity rule stops working
- **THEN** `npm test` fails

### Requirement: Board fixtures
Engine tests SHALL be able to state boards as text, for both starting and expected boards, including whole and cracked gunk.

#### Scenario: Board differs
- **WHEN** a board doesn't match its expected text
- **THEN** the test failure shows both boards as text

#### Scenario: Gunk round trip
- **WHEN** a board with whole and cracked gunk is parsed and rendered
- **THEN** the text is unchanged

#### Scenario: Bad fixture
- **WHEN** a fixture has an unknown letter, a row that isn't 7 cells wide, or too many rows
- **THEN** it throws an error naming the row
