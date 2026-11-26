# replays Specification

## Purpose
Defines how matches are recorded and played back, so results can be proven the same everywhere.

## Requirements

### Requirement: Recording and playback
A match SHALL be recordable as a seed and its inputs, and playing the recording back SHALL give the same final state. Each side's input SHALL include the Rinse and Bomb bits. A versus match SHALL be recorded with both sides' inputs in versus replay format 3. Solo replays SHALL keep format 1, which SHALL accept the meter bits, so existing solo replays stay valid. Format 2 SHALL be rejected as unknown.

#### Scenario: Round trip
- **WHEN** a match is recorded, saved as JSON and played back
- **THEN** the final state, score and state hash are equal

#### Scenario: Versus round trip
- **WHEN** a versus match is recorded, saved as JSON and played back
- **THEN** both boards, the outcome and the state hash are equal

#### Scenario: Meter round trip
- **WHEN** a match in which both sides fire Rinse and Bomb is recorded and played back
- **THEN** both boards, their meters, the outcome and the state hash are equal

#### Scenario: Invalid replay
- **WHEN** a replay has an unknown format (format 2 included), a bad seed, or an invalid input or tick count
- **THEN** playback throws an error naming the problem

### Requirement: State hash
Equal states SHALL have equal hashes regardless of property order, and a change to any value, stains included, SHALL change the hash in practice.

#### Scenario: One cell differs
- **WHEN** two states differ in one cell
- **THEN** their hashes differ

#### Scenario: One stain differs
- **WHEN** two states differ only in one cell's stain
- **THEN** their hashes differ

### Requirement: Stored replays
Stored replays SHALL be checked in Node and in Chromium against their expected score and hashes. At least one SHALL contain a chain of 3 or more, and at least one SHALL contain a stain match. At least one SHALL be a versus match in which gunk is cracked and cleared and that ends with a win. At least one SHALL fire Rinse and at least one SHALL fire Bomb.

#### Scenario: Rules change
- **WHEN** a code change alters a stored replay's result
- **THEN** `npm test` fails, naming the replay and the first checkpoint that differs

#### Scenario: Intended change
- **WHEN** a developer runs `npm run replays`
- **THEN** expected values are rewritten from the stored inputs

#### Scenario: Meter covered
- **WHEN** the stored replays are checked
- **THEN** their expected results show at least one Rinse and at least one Bomb

### Requirement: Replays through the view
Stored replays SHALL give the same score and hashes when played in the Match scene with rendering as without it.

#### Scenario: Played with the view
- **WHEN** the browser tests play a stored replay in the Match scene
- **THEN** its result equals the stored expected values, and the drawn board and stains equal the final state's visible rows

#### Scenario: Versus played with the view
- **WHEN** the browser tests play the stored versus replay in a Ladder match
- **THEN** its outcome and hashes equal the stored values, and both drawn boards, gunk included, equal the final state's visible rows
