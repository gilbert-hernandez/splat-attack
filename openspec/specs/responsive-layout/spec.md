# responsive-layout Specification

## Purpose
Defines how the game chooses a portrait or landscape screen, places every scene in it, and changes it while running.

## Requirements

### Requirement: Screen shape
The game SHALL be 960×540 when the space inside the safe areas is at least as wide as tall. Otherwise it SHALL be 360 wide and as tall as fits that space's shape, between 640 and 780.

#### Scenario: Desktop or landscape phone
- **WHEN** the window is 960×540 or 844×390
- **THEN** the game is 960×540

#### Scenario: Upright phone
- **WHEN** the window is 375×667
- **THEN** the game is 360×640

#### Scenario: Very tall window
- **WHEN** the window is 360×1000
- **THEN** the game is 360×780, centered

#### Scenario: Insets change the shape
- **WHEN** the window is 390×844 with 47 px top and 34 px bottom insets
- **THEN** the game's shape is chosen from 390×763

### Requirement: Layout configuration
Every scene SHALL take its positions from a layout configuration, and everything a scene shows SHALL be inside the screen in both orientations.

#### Scenario: Landscape is unchanged
- **WHEN** any scene is shown at 960×540 in keyboard mode
- **THEN** every object is where it was before this capability

#### Scenario: Portrait menu
- **WHEN** Title, mode select, Pause or Result is shown in portrait
- **THEN** all of its text and buttons are inside the screen and its buttons work

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

### Requirement: Changing shape while running
When the window's shape changes, the current scenes SHALL move to the new layout without restarting. A button press in progress SHALL be cancelled.

#### Scenario: Rotate in a menu
- **WHEN** the window is rotated on the title, mode select or result
- **THEN** the same scene is shown in the new layout, with the same content

#### Scenario: Press held through a rotation
- **WHEN** a button is held while the window rotates and is then released
- **THEN** the button doesn't act

### Requirement: Rotating mid-match
Rotating during a match SHALL keep the match state, its seed and its replay, and SHALL pause the match.

#### Scenario: Rotate during play
- **WHEN** the window is rotated during play
- **THEN** Pause opens over the match in the new layout, no keys stay held, and resuming continues from the same tick

#### Scenario: Rotate while paused
- **WHEN** the window is rotated while Pause is open
- **THEN** Pause stays open, and it and the match under it are in the new layout

#### Scenario: Browser bar hides
- **WHEN** the window's height changes and the orientation doesn't
- **THEN** the match re-lays out and keeps playing

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

### Requirement: Landscape pending gunk
A landscape Ladder match SHALL show each board's pending gunk directly above that board, in keyboard and touch layouts, without overlapping the HUD, the touch buttons or either board.

#### Scenario: Keyboard and touch
- **WHEN** a landscape Ladder match is shown in either input mode
- **THEN** each pending display sits above its own board and overlaps nothing

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

### Requirement: Rival label place
Every Ladder match layout SHALL place the rival label next to the rival's board, in portrait at every supported height and in landscape in both input modes. The label SHALL NOT overlap the boards, the next pairs, the HUD, the pending gunk, the meters, the touch buttons or the debug hint. Endless layouts SHALL have no rival label.

#### Scenario: Landscape
- **WHEN** a landscape Ladder match is shown in either input mode
- **THEN** the rival label is next to the rival's board and overlaps nothing

#### Scenario: Portrait at any height
- **WHEN** a portrait Ladder match is shown at any supported height
- **THEN** the rival label is shown, inside the screen, and overlaps nothing

#### Scenario: Longest name
- **WHEN** the label shows the longest rival number and style name
- **THEN** it still fits its place in every layout
