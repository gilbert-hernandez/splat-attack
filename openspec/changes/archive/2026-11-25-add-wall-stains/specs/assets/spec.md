## ADDED Requirements

### Requirement: Distinguishable stain placeholders
Each stain color's placeholder SHALL be a dim full-cell tile marked with its color's blob shape, so stains can be told apart without hue and never look like blobs. ASSETS.md SHALL ask the stain art to keep a cue that works without hue.

#### Scenario: Viewed without color
- **WHEN** the five stain placeholders are viewed in grayscale
- **THEN** they can be told apart by their mark

#### Scenario: Next to a blob
- **WHEN** a stain placeholder and a blob placeholder of the same color are shown side by side
- **THEN** the stain is a dim tile and the blob is a bright shape
