# touch-buttons Specification

## Purpose
Defines the on-screen match buttons, how the game switches between touch and keyboard modes, and how buttons respond to touch.

## Requirements

### Requirement: Match buttons
In touch mode a match SHALL show clockwise, counterclockwise and pause buttons. A rotate button SHALL rotate once, when pressed, through the same input masks as keys. The pause button SHALL open Pause when a press that began on it lifts on it.

#### Scenario: Rotate
- **WHEN** a finger presses the counterclockwise button and holds it
- **THEN** the pair rotates counterclockwise once, on the next tick

#### Scenario: Pause
- **WHEN** a finger taps the pause button
- **THEN** Pause opens, and resuming returns to the match with no button pressed

#### Scenario: Sliding off pause
- **WHEN** a finger presses the pause button and lifts elsewhere
- **THEN** the match keeps playing

#### Scenario: Replay
- **WHEN** a match using the buttons is recorded and played back
- **THEN** its final state hash equals the match's

### Requirement: Tap targets
Match buttons SHALL have tap targets of at least 48×48 CSS px in portrait windows of 375×553 and larger and landscape windows of 568×320 and larger.

#### Scenario: Small phones
- **WHEN** a match is shown at 375×553 or 568×320
- **THEN** every match button's tap target, and the meter slot, is at least 48×48 CSS px

### Requirement: Several fingers
Buttons SHALL work while other fingers drag or press other buttons. A finger that presses a button SHALL NOT start or affect a gesture, also after sliding off it.

#### Scenario: Rotate during a drag
- **WHEN** one finger drags sideways and another presses a rotate button
- **THEN** the pair moves and rotates, and the drag continues

#### Scenario: Button first
- **WHEN** a finger holds a rotate button and another finger drags
- **THEN** the drag moves the pair

#### Scenario: Sliding off a button
- **WHEN** a finger presses a rotate button and slides across the board
- **THEN** the pair rotates once and doesn't move or drop

### Requirement: Automatic mode
The game SHALL start in touch mode on devices whose main pointer is a finger, and in keyboard mode otherwise. A touch SHALL switch to touch mode. A mouse press or a key the game uses SHALL switch to keyboard mode, unless a finger is down. A switch SHALL NOT pause or otherwise change a match. Match buttons and hints SHALL match the mode.

#### Scenario: First touch in a match
- **WHEN** the board is touched in keyboard mode
- **THEN** the buttons appear, and that touch works as a gesture

#### Scenario: First touch where a button appears
- **WHEN** the first touch lands where a hidden button is about to appear
- **THEN** it doesn't press the button

#### Scenario: Key
- **WHEN** a game key is pressed with no finger down
- **THEN** the buttons hide, and the key acts

#### Scenario: Key during a drag
- **WHEN** a game key is pressed while a finger drags
- **THEN** both act and the mode stays touch

#### Scenario: Title hint
- **WHEN** the mode switches on the title
- **THEN** the hint shows that mode's controls

### Requirement: Touch on any button
Buttons that act on release SHALL act only for the finger that pressed them. A cancelled touch SHALL NOT activate a button. After a touch ends, its button SHALL look normal, without hover.

#### Scenario: Cancelled touch
- **WHEN** the system cancels a touch on a menu button or the pause button
- **THEN** the button doesn't act and looks normal

#### Scenario: Two fingers
- **WHEN** one finger holds a menu button and another lifts on it after pressing elsewhere
- **THEN** the button doesn't act

#### Scenario: After a tap
- **WHEN** a button has been tapped and is still shown, or is shown again
- **THEN** it looks normal

### Requirement: Touch-only flow
A player SHALL be able to go from the title through mode select, a match, pause, the result and a new match by touch alone, in both modes and orientations.

#### Scenario: Whole loop
- **WHEN** a player uses only touch on a phone
- **THEN** they can start either mode, play, pause, resume, reach the result, play again and return to the title
