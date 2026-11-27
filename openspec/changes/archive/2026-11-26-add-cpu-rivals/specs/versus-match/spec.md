# Spec Delta

## ADDED Requirements

### Requirement: Rival input sees both boards
The rival's input for each tick SHALL be chosen with both the rival's board and the player's board available, before the tick steps. Neither board SHALL change while it is chosen.

#### Scenario: Opponent available
- **WHEN** a versus match asks for the rival's input
- **THEN** the input source receives the rival's board and the player's board, both as they are before the tick

## MODIFIED Requirements

### Requirement: Sparring rival
The sparring rival SHALL choose moves only from the match state, with no randomness from outside the match and no clock, and SHALL give its moves as the same per-tick input as a player. It SHALL act no faster than a configured pace, and MAY fire the meter by the sparring rival's meter rules. It SHALL NOT play Ladder matches. It SHALL remain the rival sim's fixed baseline and the generator of the stored versus replay.

#### Scenario: Reproducible
- **WHEN** the sparring rival plays the same match state twice
- **THEN** it gives the same inputs

#### Scenario: Paced
- **WHEN** the sparring rival plays a pair
- **THEN** it moves or rotates at most once per configured number of ticks, and soft-drops only once the pair is in place and a configured delay has passed

#### Scenario: Plays to the end
- **WHEN** the sparring rival plays a whole match against a slower-paced copy of itself
- **THEN** it splats, sends gunk, fires the meter, and the match ends with an outcome

#### Scenario: Not in Ladder
- **WHEN** a Ladder match starts
- **THEN** the rival's board is played by a CPU rival, not the sparring rival
