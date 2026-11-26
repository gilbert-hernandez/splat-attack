## MODIFIED Requirements

### Requirement: Debug keys
In development builds a match SHALL have keys to set the next pair, load a prepared board, freeze the clock, step one tick, fast-forward and force the end, and SHALL list them on screen. They SHALL do nothing while paused and in production builds. Prepared boards MAY include stains, and at least one SHALL set up a stain match.

#### Scenario: Set the next pair
- **WHEN** two color keys are pressed
- **THEN** the nearer next pair has those colors, in that order

#### Scenario: Load a board
- **WHEN** the board key is pressed while a match is running
- **THEN** the next prepared board, with its stains, is shown with a pair at the spawn cell, and play continues from it

#### Scenario: Stain board
- **WHEN** the stain board is loaded and its pair is dropped where its comment says
- **THEN** the splat scores a stain match and paints over a stain of another color

#### Scenario: Step
- **WHEN** the step key is pressed
- **THEN** the clock is frozen and the match is exactly one tick further

#### Scenario: Unfreeze
- **WHEN** a frozen match is unfrozen
- **THEN** it continues without catching up on the frozen time

#### Scenario: Force the end
- **WHEN** the end key is pressed
- **THEN** the match ends through the normal game-over and result
