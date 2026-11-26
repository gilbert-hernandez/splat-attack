# Spec Delta

## MODIFIED Requirements

### Requirement: Recording and playback
A match SHALL be recordable as a seed and its inputs, and playing the recording back SHALL give the same final state. A versus match SHALL be recorded with both sides' inputs in a versus replay format, and solo replays SHALL keep their format.

#### Scenario: Round trip
- **WHEN** a match is recorded, saved as JSON and played back
- **THEN** the final state, score and state hash are equal

#### Scenario: Versus round trip
- **WHEN** a versus match is recorded, saved as JSON and played back
- **THEN** both boards, the outcome and the state hash are equal

#### Scenario: Invalid replay
- **WHEN** a replay has an unknown format, a bad seed, or an invalid input or tick count
- **THEN** playback throws an error naming the problem

### Requirement: Stored replays
Stored replays SHALL be checked in Node and in Chromium against their expected score and hashes. At least one SHALL contain a chain of 3 or more, and at least one SHALL contain a stain match. At least one SHALL be a versus match in which gunk is cracked and cleared and that ends with a win.

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

#### Scenario: Versus played with the view
- **WHEN** the browser tests play the stored versus replay in a Ladder match
- **THEN** its outcome and hashes equal the stored values, and both drawn boards, gunk included, equal the final state's visible rows
