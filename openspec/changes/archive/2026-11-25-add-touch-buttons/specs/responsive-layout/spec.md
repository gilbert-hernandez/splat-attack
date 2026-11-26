# Spec Delta

## MODIFIED Requirements

### Requirement: Layout configuration
Every scene SHALL take its positions from a layout configuration, and everything a scene shows SHALL be inside the screen in both orientations.

#### Scenario: Landscape is unchanged
- **WHEN** any scene is shown at 960×540 in keyboard mode
- **THEN** every object is where it was before this capability

#### Scenario: Portrait menu
- **WHEN** Title, mode select, Pause or Result is shown in portrait
- **THEN** all of its text and buttons are inside the screen and its buttons work

## ADDED Requirements

### Requirement: Touch layouts
The layout SHALL place the match buttons and reserve a slot for the meter button: the rotate buttons and the slot below the board in portrait, and all of them beside the boards in landscape. In landscape touch mode the Ladder boards SHALL move inward to make room. No tap target SHALL overlap another, a board, the next pairs, the HUD, or an area reserved for something else.

#### Scenario: Landscape Ladder in touch mode
- **WHEN** a Ladder match is shown in landscape in touch mode
- **THEN** the buttons are at the sides, outside both boards

#### Scenario: Mode switch in landscape Ladder
- **WHEN** the mode switches during a landscape Ladder match
- **THEN** the boards move and the match, its seed and its replay go on

#### Scenario: Tall phone
- **WHEN** a match is shown at any portrait height
- **THEN** the rotate buttons and meter slot are inside the touch area below the board
