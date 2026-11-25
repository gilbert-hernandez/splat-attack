# Spec Delta

## MODIFIED Requirements

### Requirement: One finger owns the gesture
The first finger down outside the match buttons SHALL own the gesture until it lifts. Other fingers, the mouse, and presses that began outside the running match SHALL NOT make gestures.

#### Scenario: Second finger
- **WHEN** a second finger taps and drags outside the buttons during a drag
- **THEN** only the first finger moves the pair

#### Scenario: Menu press
- **WHEN** a finger pressed in a menu lifts after a match has started or resumed
- **THEN** the pair doesn't rotate

#### Scenario: Finger on a button
- **WHEN** a finger is holding a match button and another presses the board
- **THEN** the second finger owns the gesture
