# Spec Delta

## MODIFIED Requirements

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
