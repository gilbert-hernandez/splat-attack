# board-engine Specification Delta

## MODIFIED Requirements

### Requirement: Settling
After a lock or a splat, each blob SHALL fall until it rests on the floor or another blob. After the settle time, matching groups SHALL splat; if there are none, the next pair SHALL spawn. Input SHALL be ignored meanwhile.

#### Scenario: Uneven columns
- **WHEN** a horizontal pair locks over columns of different heights
- **THEN** each half rests on its own column

#### Scenario: Nothing matches
- **WHEN** the settle time ends with no matching group
- **THEN** the next pair spawns

### Requirement: Top-out
After a settle that splats nothing, if the spawn cell (center column, top visible row) is occupied the match SHALL end, and later ticks SHALL change nothing. Otherwise the next pair SHALL spawn.

#### Scenario: Spawn cell blocked
- **WHEN** blobs settle into the spawn cell and nothing splats
- **THEN** the match is over and no pair spawns

#### Scenario: Saved by a splat
- **WHEN** blobs settle into the spawn cell but a splat or chain frees it
- **THEN** play continues

#### Scenario: Other columns full
- **WHEN** another column is full but the spawn cell is free
- **THEN** play continues
