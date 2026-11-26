# Spec Delta

## MODIFIED Requirements

### Requirement: Portrait match
A portrait match SHALL show the player's board at 1× with the next pairs beside it. The layout SHALL reserve separate areas for the player's pending gunk, the meter, a pause button and at least 120 px of touch controls below the board. In Ladder the rival's pending gunk SHALL have its own place next to the rival's board. These areas, the boards, the next pairs and the HUD SHALL NOT overlap at any portrait height.

#### Scenario: Ladder
- **WHEN** a Ladder match is shown in portrait
- **THEN** the rival's board is also shown, at half size, with its pending gunk beside it

#### Scenario: Endless
- **WHEN** an Endless match is shown in portrait
- **THEN** the board and next pairs are centered and there is no rival board

#### Scenario: Shortest phone
- **WHEN** the game is 360×640
- **THEN** 120 px of touch control space remains below the board

## ADDED Requirements

### Requirement: Landscape pending gunk
A landscape Ladder match SHALL show each board's pending gunk directly above that board, in keyboard and touch layouts, without overlapping the HUD, the touch buttons or either board.

#### Scenario: Keyboard and touch
- **WHEN** a landscape Ladder match is shown in either input mode
- **THEN** each pending display sits above its own board and overlaps nothing
