# Spec Delta

## MODIFIED Requirements

### Requirement: Matching
When blobs have settled, every group of 4 or more blobs of one color connected horizontally or vertically SHALL splat. Blobs in hidden rows SHALL NOT match or connect a group. Gunk, whole or cracked, SHALL NOT match or connect a group.

#### Scenario: Four connected
- **WHEN** four blobs of one color settle in a connected shape
- **THEN** all four are removed

#### Scenario: Three connected
- **WHEN** only three are connected
- **THEN** nothing is removed

#### Scenario: Diagonal
- **WHEN** four blobs of one color touch only diagonally
- **THEN** nothing is removed

#### Scenario: Several groups
- **WHEN** several groups exist after one settle, of the same or different colors
- **THEN** all of them splat in the same chain step

#### Scenario: Hidden rows
- **WHEN** a group reaches four only by counting a blob in a hidden row
- **THEN** nothing splats until that blob falls into view

#### Scenario: Gunk between blobs
- **WHEN** four blobs of one color are connected only through a gunk
- **THEN** nothing splats

### Requirement: Events
Each tick SHALL report what happened: lock, settle, splat, gunk hit, attack, gunk drop, chain end and match over. Events SHALL be enough to draw every removal, fall, stain, gunk crack and gunk clear, and SHALL NOT be part of the match state.

#### Scenario: Splat event
- **WHEN** a chain step splats
- **THEN** one event gives its chain number, each group's color, cells and stain-match cells, and its points

#### Scenario: Gunk hit event
- **WHEN** a chain step cracks or clears gunk
- **THEN** one event lists the cracked cells and the cleared cells

#### Scenario: Attack event
- **WHEN** a chain ends with gunk to send
- **THEN** one event gives the gunk sent, how much of it cancelled pending gunk, and the board's pending count after

#### Scenario: Drop event
- **WHEN** pending gunk drops
- **THEN** one event lists each gunk's column and landing row

#### Scenario: Reconstruction
- **WHEN** a viewer applies every event to an empty board with clean stains
- **THEN** its board, gunk and stains match the engine's after every tick

#### Scenario: Ignored events
- **WHEN** the caller ignores or changes the returned events
- **THEN** the match is unaffected
