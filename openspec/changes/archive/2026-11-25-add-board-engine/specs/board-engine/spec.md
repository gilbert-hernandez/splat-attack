# board-engine Specification Delta

## ADDED Requirements

### Requirement: Deterministic ticks
The engine SHALL advance in fixed ticks (60 per second of play) using only its state and that tick's input, with every number in its state an integer.

#### Scenario: Same seed and inputs
- **WHEN** two matches run with the same seed and the same inputs
- **THEN** their states are equal after every tick

#### Scenario: State copied mid-match
- **WHEN** a state is serialized to JSON, restored, and both copies get the same inputs
- **THEN** they stay equal

#### Scenario: Invalid seed
- **WHEN** a match is created with a seed that isn't an unsigned 32-bit integer
- **THEN** the engine throws an error naming the seed

### Requirement: Board
The board SHALL be 7 columns by 12 visible rows with 2 hidden rows above, each cell empty or one of 5 colors.

#### Scenario: Blobs in hidden rows
- **WHEN** a pair locks with a half in a hidden row
- **THEN** that blob stays on the board

### Requirement: Pieces
Pairs SHALL be drawn from the seed, each color equally likely, and the next two pairs SHALL be known in advance. Player input SHALL NOT change the sequence.

#### Scenario: Different play, same pieces
- **WHEN** two matches with the same seed are played differently
- **THEN** their nth pairs are the same

#### Scenario: Next pairs
- **WHEN** a pair spawns
- **THEN** it is the first pair of the queue, and the queue holds two pairs again

### Requirement: Moving
A pair SHALL move one column per move input when the target cells are free. Opposite move inputs in one tick SHALL cancel.

#### Scenario: Blocked
- **WHEN** a pair moves into a wall or a blob
- **THEN** it stays where it is

### Requirement: Rotating
A pair SHALL rotate around its pivot in both directions, kicking sideways or up one cell when blocked. When turning sideways is blocked on both sides it SHALL flip vertically. Opposite rotate inputs in one tick SHALL cancel.

#### Scenario: Wall kick
- **WHEN** a vertical pair against a wall turns toward it and the other side is free
- **THEN** the pair moves one column away and ends horizontal

#### Scenario: Floor kick
- **WHEN** a horizontal pair resting on the floor turns its half downward
- **THEN** the pivot moves up one row and the half takes its place

#### Scenario: One-wide well
- **WHEN** a vertical pair with both sides blocked rotates
- **THEN** its two halves swap places vertically

#### Scenario: No room
- **WHEN** neither the rotation, a kick nor a flip fits
- **THEN** the pair is unchanged

### Requirement: Falling and soft drop
A pair SHALL fall at the configured speed, and at the soft-drop speed while soft drop is held.

#### Scenario: Soft drop
- **WHEN** soft drop is held for a falling pair
- **THEN** it reaches the ground sooner than without it

### Requirement: Locking
A grounded pair SHALL lock when its lock budget is spent, or at once on soft drop. Each grounded tick and each floor kick SHALL spend from the budget, which never refills for that pair.

#### Scenario: Time to adjust
- **WHEN** a pair lands and no soft drop is held
- **THEN** it can still move and rotate until the budget runs out

#### Scenario: Stalling
- **WHEN** a player moves and rotates a grounded pair in any pattern
- **THEN** the pair still locks within a fixed number of ticks

### Requirement: Settling
After a lock, each blob SHALL fall until it rests on the floor or another blob, and the next pair SHALL spawn after the settle time. Input SHALL be ignored meanwhile.

#### Scenario: Uneven columns
- **WHEN** a horizontal pair locks over columns of different heights
- **THEN** each half rests on its own column

### Requirement: Top-out
After a settle, if the spawn cell (center column, top visible row) is occupied the match SHALL end, and later ticks SHALL change nothing. Otherwise the next pair SHALL spawn.

#### Scenario: Spawn cell blocked
- **WHEN** blobs settle into the spawn cell
- **THEN** the match is over and no pair spawns

#### Scenario: Other columns full
- **WHEN** another column is full but the spawn cell is free
- **THEN** play continues
