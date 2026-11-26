# Spec Delta

## MODIFIED Requirements

### Requirement: Events
Each tick SHALL report what happened: lock, settle, splat, gunk hit, attack, gunk drop, meter fill, Rinse, Bomb, chain end and match over. Events SHALL be enough to draw every removal, fall, stain, gunk crack and gunk clear, including a Bomb's, and SHALL NOT be part of the match state.

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

#### Scenario: Meter event
- **WHEN** a chain step fills the meter
- **THEN** one event gives the fill added and the meter after

#### Scenario: Rinse event
- **WHEN** a board fires Rinse
- **THEN** one event gives how much pending gunk was removed

#### Scenario: Bomb event
- **WHEN** a Bomb goes off
- **THEN** one event gives the target, the cleared cells with what was in each, and the stain color, followed by a settle event with the falls

#### Scenario: Reconstruction
- **WHEN** a viewer applies every event to an empty board with clean stains
- **THEN** its board, gunk and stains match the engine's after every tick, Bombs included

#### Scenario: Ignored events
- **WHEN** the caller ignores or changes the returned events
- **THEN** the match is unaffected
