# splat-rules Specification

## Purpose
Defines how blobs match and splat, how chains resolve and score, and the events the engine reports.

## Requirements

### Requirement: Matching
When blobs have settled, every group of 4 or more blobs of one color connected horizontally or vertically SHALL splat. Blobs in hidden rows SHALL NOT match or connect a group.

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

### Requirement: Chains
After a splat the remaining blobs SHALL fall, and any new groups SHALL splat as the next chain step, until none remain. Input SHALL be ignored meanwhile, and no pair SHALL spawn until the chain ends.

#### Scenario: Five steps
- **WHEN** a board is set up so each splat completes the next group
- **THEN** it resolves as a chain of 5 or more steps, numbered from 1

#### Scenario: New chain
- **WHEN** a later pair splats after a chain has ended
- **THEN** its first step is numbered 1

### Requirement: Scoring
Each chain step SHALL add points that rise with splat size, number of colors in the step, and chain position. Points SHALL be whole numbers, and their values SHALL be config.

#### Scenario: Known boards
- **WHEN** a known board resolves
- **THEN** the score is the exact expected value

#### Scenario: Chains pay most
- **WHEN** the same number of blobs is cleared as one splat, as several colors at once, or as a chain of fours
- **THEN** the chain scores most and the single splat least

#### Scenario: No splat
- **WHEN** a pair lands without a splat, with or without soft drop
- **THEN** the score doesn't change

### Requirement: Events
Each tick SHALL report what happened: lock, settle, splat, chain end and match over. Events SHALL be enough to draw every removal and fall, and SHALL NOT be part of the match state.

#### Scenario: Splat event
- **WHEN** a chain step splats
- **THEN** one event gives its chain number, each group's color and cells, and its points

#### Scenario: Reconstruction
- **WHEN** a viewer applies every event to an empty board
- **THEN** it matches the engine's board after every tick

#### Scenario: Ignored events
- **WHEN** the caller ignores or changes the returned events
- **THEN** the match is unaffected
