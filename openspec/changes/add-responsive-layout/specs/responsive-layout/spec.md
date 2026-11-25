# responsive-layout Specification Delta

## Purpose
Defines how the game chooses a portrait or landscape screen, places every scene in it, and changes it while running.

## ADDED Requirements

### Requirement: Screen shape
The game SHALL be 960×540 when the window is at least as wide as tall. Otherwise it SHALL be 360 wide and as tall as fits the window's shape, between 640 and 780.

#### Scenario: Desktop or landscape phone
- **WHEN** the window is 960×540 or 844×390
- **THEN** the game is 960×540

#### Scenario: Upright phone
- **WHEN** the window is 375×667
- **THEN** the game is 360×640

#### Scenario: Very tall window
- **WHEN** the window is 360×1000
- **THEN** the game is 360×780, centered

### Requirement: Layout configuration
Every scene SHALL take its positions from a layout configuration, and everything a scene shows SHALL be inside the screen in both orientations.

#### Scenario: Landscape is unchanged
- **WHEN** any scene is shown at 960×540
- **THEN** every object is where it was before this capability

#### Scenario: Portrait menu
- **WHEN** Title, mode select, Pause or Result is shown in portrait
- **THEN** all of its text and buttons are inside the screen and its buttons work

### Requirement: Portrait match
A portrait match SHALL show the player's board at 1× with the next pairs beside it. The layout SHALL reserve separate areas for pending gunk, the meter, a pause button and at least 120 px of touch controls below the board. These areas, the boards, the next pairs and the HUD SHALL NOT overlap at any portrait height.

#### Scenario: Ladder
- **WHEN** a Ladder match is shown in portrait
- **THEN** the rival's board is also shown, at half size

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
