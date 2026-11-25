# code-quality Specification Delta

## ADDED Requirements

### Requirement: Engine purity
Lint SHALL fail when code in `src/core/` or `src/ai/` imports Phaser or other game code outside the rules, or uses randomness, the clock, browser globals or non-integer math.

#### Scenario: Impure engine code
- **WHEN** a core file imports Phaser or uses `Math.random`, `Date`, `performance`, `setTimeout`, `window`, `Math.sin` or `0.5`
- **THEN** `npm run lint` fails naming the file and the reason

#### Scenario: Rule removed by mistake
- **WHEN** a purity rule stops working
- **THEN** `npm test` fails

### Requirement: Board fixtures
Engine tests SHALL be able to state boards as text, for both starting and expected boards.

#### Scenario: Board differs
- **WHEN** a board doesn't match its expected text
- **THEN** the test failure shows both boards as text

#### Scenario: Bad fixture
- **WHEN** a fixture has an unknown letter, a row that isn't 7 cells wide, or too many rows
- **THEN** it throws an error naming the row
