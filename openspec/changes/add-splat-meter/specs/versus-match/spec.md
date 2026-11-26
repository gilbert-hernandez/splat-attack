# Spec Delta

## MODIFIED Requirements

### Requirement: Sparring rival
Until the CPU rivals arrive, the Ladder rival's board SHALL be played by a sparring rival that chooses moves only from the match state, with no randomness from outside the match and no clock, and gives its moves as the same per-tick input as a player. It SHALL act no faster than a configured pace, and MAY fire the meter by the sparring rival's meter rules.

#### Scenario: Reproducible
- **WHEN** the sparring rival plays the same match state twice
- **THEN** it gives the same inputs

#### Scenario: Paced
- **WHEN** the sparring rival plays a pair
- **THEN** it moves or rotates at most once per configured number of ticks, and soft-drops only once the pair is in place and a configured delay has passed

#### Scenario: Plays to the end
- **WHEN** the sparring rival plays a whole match against a slower-paced copy of itself
- **THEN** it splats, sends gunk, fires the meter, and the match ends with an outcome
