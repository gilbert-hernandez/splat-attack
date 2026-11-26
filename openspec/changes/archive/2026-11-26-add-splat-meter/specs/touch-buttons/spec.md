# Spec Delta

## MODIFIED Requirements

### Requirement: Match buttons
In touch mode a match SHALL show clockwise, counterclockwise, meter and pause buttons. A rotate button SHALL rotate once, when pressed, through the same input masks as keys. The meter button SHALL open the meter choice when pressed with a full meter, and close it when pressed again. While the choice is open, the counterclockwise button SHALL become Rinse and the clockwise button SHALL become Bomb, each firing once when pressed and never rotating. The pause button SHALL open Pause when a press that began on it lifts on it.

#### Scenario: Rotate
- **WHEN** a finger presses the counterclockwise button and holds it
- **THEN** the pair rotates counterclockwise once, on the next tick

#### Scenario: Pause
- **WHEN** a finger taps the pause button
- **THEN** Pause opens, and resuming returns to the match with no button pressed

#### Scenario: Sliding off pause
- **WHEN** a finger presses the pause button and lifts elsewhere
- **THEN** the match keeps playing

#### Scenario: Meter choice
- **WHEN** the meter is full and a finger taps the meter button
- **THEN** the rotate buttons show Rinse and Bomb until the choice closes, then show rotation again

#### Scenario: Bomb by button
- **WHEN** the choice is open and a finger presses the Bomb button
- **THEN** Bomb fires on the next tick, the pair doesn't rotate, and the choice closes

#### Scenario: Rotate held as the choice opens
- **WHEN** a finger is still holding the clockwise button when the choice opens
- **THEN** Bomb isn't picked until a new press

#### Scenario: Meter not full
- **WHEN** a finger taps the meter button while the meter isn't full
- **THEN** nothing happens

#### Scenario: Replay
- **WHEN** a match using the buttons, the meter button included, is recorded and played back
- **THEN** its final state hash equals the match's

### Requirement: Tap targets
Match buttons, the meter button included, SHALL have tap targets of at least 48×48 CSS px in portrait windows of 375×553 and larger and landscape windows of 568×320 and larger.

#### Scenario: Small phones
- **WHEN** a match is shown at 375×553 or 568×320
- **THEN** every match button's tap target, the meter button's included, is at least 48×48 CSS px
