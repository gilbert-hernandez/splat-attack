# wall-stains Specification

## Purpose
Defines the Wall: the stain layer, how splats stain and paint over cells, stain matches, and how stains are shown.

## Requirements

### Requirement: Stain layer
The match state SHALL hold a stain for every board cell: clean, or one blob color. A new match SHALL start with every cell clean. Stains SHALL NOT move when blobs fall, and hidden rows SHALL never be stained.

#### Scenario: New match
- **WHEN** a match starts
- **THEN** every cell is clean

#### Scenario: Blobs fall past a stain
- **WHEN** blobs fall through or come to rest on stained cells
- **THEN** every stain stays in its cell with its color

#### Scenario: Copied state
- **WHEN** a state with stains is copied mid-match and both copies get the same inputs
- **THEN** both end with the same stains, score and hash

### Requirement: Staining and painting over
Each blob that splats SHALL leave its color as the stain of its cell. A cell stained with a different color SHALL take the new color.

#### Scenario: Clean cell
- **WHEN** a red group splats on clean cells
- **THEN** those cells are stained red

#### Scenario: Different color
- **WHEN** a blue group splats where some cells are stained red
- **THEN** those cells are stained blue

#### Scenario: Chain
- **WHEN** a chain's later step splats on cells stained by an earlier step
- **THEN** each cell ends with the color of the last splat there

### Requirement: Stain matches
A blob that splats on a stain of its own color SHALL be a stain match, and the stain SHALL stay. Each stain match SHALL add points to its chain step, with the value in config.

#### Scenario: Matching stain
- **WHEN** a red group of four splats with two of its cells stained red
- **THEN** the step has two stain matches, the cells stay red, and the score is the exact expected value

#### Scenario: Same place, same color, twice
- **WHEN** a second red group splats on the cells a first red group stained
- **THEN** every blob in it is a stain match

#### Scenario: No stains under the splat
- **WHEN** a group splats on clean or differently stained cells
- **THEN** its points equal those of the same splat with no stain layer

### Requirement: Stains on screen
Stains in visible rows SHALL be drawn under the ghost and the blobs, at low contrast, with no animation or bridges, and SHALL appear on the tick their splat starts. A stain SHALL show its color in a way that works without hue and that can't be mistaken for a blob.

#### Scenario: Splat leaves a stain
- **WHEN** a group splats
- **THEN** its stains are drawn under the splat animation from its first frame

#### Scenario: Blob on a stain
- **WHEN** a blob rests on a stained cell
- **THEN** the blob is fully readable and the stain shows only around it

#### Scenario: Drawn equals engine
- **WHEN** a long chain ends
- **THEN** the drawn stains equal the engine's stains in the visible rows

#### Scenario: Paused
- **WHEN** the match is paused
- **THEN** the stains stay on screen unchanged
