# Spec Delta

## MODIFIED Requirements

### Requirement: Portrait match
A portrait match SHALL show the player's board at 1× with the next pairs beside it. The layout SHALL reserve separate areas for the player's pending gunk, the meter, a pause button and at least 120 px of touch controls below the board. In Ladder the rival's pending gunk and the rival's meter SHALL each have their own place next to the rival's board. These areas, the boards, the next pairs and the HUD SHALL NOT overlap at any portrait height.

#### Scenario: Ladder
- **WHEN** a Ladder match is shown in portrait
- **THEN** the rival's board is also shown, at half size, with its pending gunk and meter beside it

#### Scenario: Endless
- **WHEN** an Endless match is shown in portrait
- **THEN** the board and next pairs are centered and there is no rival board

#### Scenario: Shortest phone
- **WHEN** the game is 360×640
- **THEN** 120 px of touch control space remains below the board

### Requirement: Touch layouts
The layout SHALL place the match buttons, the meter button included: the rotate and meter buttons below the board in portrait, and all of them beside the boards in landscape. In landscape touch mode the Ladder boards SHALL move inward to make room. No tap target SHALL overlap another, a board, the next pairs, the HUD, or an area reserved for something else.

#### Scenario: Landscape Ladder in touch mode
- **WHEN** a Ladder match is shown in landscape in touch mode
- **THEN** the buttons are at the sides, outside both boards

#### Scenario: Mode switch in landscape Ladder
- **WHEN** the mode switches during a landscape Ladder match
- **THEN** the boards move and the match, its seed and its replay go on

#### Scenario: Tall phone
- **WHEN** a match is shown at any portrait height
- **THEN** the rotate and meter buttons are inside the touch area below the board

## ADDED Requirements

### Requirement: Meter places
Every match layout SHALL place each board's meter: in portrait the player's in the reserved meter area and the rival's next to the rival's board, and in landscape each directly below its own board, in Ladder and Endless and in both input modes. The meter choice panel SHALL have a place over the player's board in every layout. Meters SHALL NOT overlap the boards, the next pairs, the HUD, the pending gunk, the touch buttons or the debug hint.

#### Scenario: Landscape
- **WHEN** a landscape Ladder or Endless match is shown in either input mode
- **THEN** each meter sits below its own board and overlaps nothing

#### Scenario: Portrait at any height
- **WHEN** a portrait Ladder match is shown at any supported height
- **THEN** both meters are shown and overlap nothing

#### Scenario: Choice panel
- **WHEN** the meter choice is open in any layout
- **THEN** its panel is over the player's board and inside the screen
