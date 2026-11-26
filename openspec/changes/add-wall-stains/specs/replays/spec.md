## MODIFIED Requirements

### Requirement: State hash
Equal states SHALL have equal hashes regardless of property order, and a change to any value, stains included, SHALL change the hash in practice.

#### Scenario: One cell differs
- **WHEN** two states differ in one cell
- **THEN** their hashes differ

#### Scenario: One stain differs
- **WHEN** two states differ only in one cell's stain
- **THEN** their hashes differ

### Requirement: Stored replays
Stored replays SHALL be checked in Node and in Chromium against their expected score and hashes. At least one SHALL contain a chain of 3 or more, and at least one SHALL contain a stain match.

#### Scenario: Rules change
- **WHEN** a code change alters a stored replay's result
- **THEN** `npm test` fails, naming the replay and the first checkpoint that differs

#### Scenario: Intended change
- **WHEN** a developer runs `npm run replays`
- **THEN** expected values are rewritten from the stored inputs

### Requirement: Replays through the view
Stored replays SHALL give the same score and hashes when played in the Match scene with rendering as without it.

#### Scenario: Played with the view
- **WHEN** the browser tests play a stored replay in the Match scene
- **THEN** its result equals the stored expected values, and the drawn board and stains equal the final state's visible rows
