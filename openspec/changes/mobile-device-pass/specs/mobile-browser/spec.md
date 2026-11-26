# Spec Delta

## ADDED Requirements

### Requirement: Page gestures blocked
On the whole page, including the bars around the canvas, the browser SHALL NOT scroll, zoom by pinch or double tap, refresh by pulling down, select text, or open a long-press or context menu.

#### Scenario: Pinch on the letterbox
- **WHEN** two fingers pinch outward on the bar beside the canvas
- **THEN** the page's zoom stays 1

#### Scenario: Drag on the letterbox
- **WHEN** a finger drags down on the bar above the canvas
- **THEN** the page doesn't scroll or refresh

#### Scenario: Long press
- **WHEN** a finger is held on the canvas or a bar
- **THEN** no menu opens and nothing is selected

#### Scenario: Gestures still work
- **WHEN** page gestures are blocked and a finger drags on the board
- **THEN** the pair moves as before

### Requirement: Safe areas
The game SHALL fit inside the device's safe areas and the visible viewport, so notches, home bars and browser bars don't cover any of it.

#### Scenario: Notch and home bar
- **WHEN** a 390×844 window has a 47 px top inset and a 34 px bottom inset
- **THEN** the canvas lies inside the insets, and the screen shape is chosen from 390×763

#### Scenario: Landscape notch
- **WHEN** an 844×390 window has 47 px insets left and right
- **THEN** the canvas lies between them

#### Scenario: No insets
- **WHEN** the device reports no insets
- **THEN** the canvas is placed as before

### Requirement: Pause on focus loss
A match in progress SHALL open Pause when the window loses focus or the page is hidden, and SHALL stay paused when the page comes back.

#### Scenario: App backgrounded
- **WHEN** the page is hidden mid-match and shown again
- **THEN** Pause is open and the match hasn't advanced

#### Scenario: Window blur
- **WHEN** the window loses focus mid-match
- **THEN** Pause opens and every key and touch is released

#### Scenario: Already paused
- **WHEN** the window loses focus while Pause is open
- **THEN** Pause stays open as it was

#### Scenario: Match over
- **WHEN** the page is hidden after the match has finished
- **THEN** the game goes on to the result as usual

#### Scenario: Menus
- **WHEN** the window loses focus on Title, ModeSelect or Result
- **THEN** the scene doesn't change

### Requirement: Readable text
Every player-facing text SHALL be at least 12 CSS px tall on a 375×553 portrait window and a 568×320 landscape window in touch mode. Scene labels and the debug hint are exempt.

#### Scenario: Small landscape phone
- **WHEN** the game runs in touch mode at 568×320
- **THEN** the title hint, version, button labels, HUD and result lines are at least 12 CSS px

#### Scenario: Desktop unchanged
- **WHEN** the game runs in keyboard mode at 960×540
- **THEN** every text has its earlier size
