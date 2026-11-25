# replays Specification

## Purpose
Defines how matches are recorded and played back, so results can be proven the same everywhere.

## Requirements

### Requirement: Recording and playback
A match SHALL be recordable as a seed and its inputs, and playing the recording back SHALL give the same final state.

#### Scenario: Round trip
- **WHEN** a match is recorded, saved as JSON and played back
- **THEN** the final state, score and state hash are equal

#### Scenario: Invalid replay
- **WHEN** a replay has an unknown format, a bad seed, or an invalid input or tick count
- **THEN** playback throws an error naming the problem

### Requirement: State hash
Equal states SHALL have equal hashes regardless of property order, and a change to any value SHALL change the hash in practice.

#### Scenario: One cell differs
- **WHEN** two states differ in one cell
- **THEN** their hashes differ

### Requirement: Stored replays
Stored replays SHALL be checked in Node and in Chromium against their expected score and hashes. At least one SHALL contain a chain of 3 or more.

#### Scenario: Rules change
- **WHEN** a code change alters a stored replay's result
- **THEN** `npm test` fails, naming the replay and the first checkpoint that differs

#### Scenario: Intended change
- **WHEN** a developer runs `npm run replays`
- **THEN** expected values are rewritten from the stored inputs
