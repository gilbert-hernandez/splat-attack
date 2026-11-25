# touch-input Specification Delta

## ADDED Requirements

### Requirement: Sideways drag
During a match, a sideways drag SHALL move the pair one column per step of finger travel, at most one column per tick. Steps crossed faster than that SHALL queue up to a configured limit, and a lock SHALL clear the queue.

#### Scenario: Slow drag
- **WHEN** a finger drags right by three steps
- **THEN** the pair moves three columns right

#### Scenario: Fast drag
- **WHEN** a finger crosses three steps between two ticks
- **THEN** the pair moves one column on each of the next three ticks

#### Scenario: Turning back at a wall
- **WHEN** a drag continues past the wall and then goes back by one step
- **THEN** the pair moves one column away from the wall

#### Scenario: Lock with moves queued
- **WHEN** the pair locks while moves are queued
- **THEN** the next pair doesn't move until the finger crosses another step

### Requirement: Tap
A short press that stays in place SHALL rotate the pair clockwise once, on release.

#### Scenario: Tap
- **WHEN** a finger presses and lifts within the configured time and distance
- **THEN** the pair rotates clockwise once

#### Scenario: Long press
- **WHEN** a finger rests longer than the configured time and lifts
- **THEN** the pair doesn't rotate

#### Scenario: Drag and lift
- **WHEN** a finger drags and lifts
- **THEN** the pair doesn't rotate

#### Scenario: Pair locks under a press
- **WHEN** a pair locks between a tap's press and its release
- **THEN** neither pair rotates

### Requirement: Drag-down soft drop
Dragging down SHALL soft drop while the finger is held. A lock SHALL end the drop until the finger lifts and drags down again.

#### Scenario: Holding
- **WHEN** a finger has dragged down and rests
- **THEN** the pair keeps soft dropping until the finger lifts or the pair locks

#### Scenario: Next pair
- **WHEN** a pair locks during a drop and the finger stays down
- **THEN** the next pair falls at its normal speed

### Requirement: One axis per drag
Each drag SHALL keep the axis it started on until the finger lifts, and SHALL drop only when it is clearly more downward than sideways. Distances and times SHALL come from config, with touch thresholds in CSS pixels.

#### Scenario: Sloppy sideways drag
- **WHEN** a sideways drag later drifts down
- **THEN** the pair doesn't soft drop

#### Scenario: Drop that drifts
- **WHEN** a downward drag later drifts sideways
- **THEN** the pair doesn't move sideways

#### Scenario: Upward drag
- **WHEN** a finger drags up and lifts
- **THEN** nothing happens

### Requirement: One finger owns the gesture
The first finger down SHALL own the gesture until it lifts. Other fingers, the mouse, and presses that began outside the running match SHALL NOT act.

#### Scenario: Second finger
- **WHEN** a second finger taps and drags during a drag
- **THEN** only the first finger moves the pair

#### Scenario: Menu press
- **WHEN** a finger pressed in a menu lifts after a match has started or resumed
- **THEN** the pair doesn't rotate

### Requirement: Releasing touch
A pause, a focus loss, a touch cancel or a layout change SHALL end the gesture and drop its queued moves and unused taps.

#### Scenario: Cancelled touch
- **WHEN** the system cancels a touch that would have been a tap
- **THEN** the pair doesn't rotate

#### Scenario: Finger held through a pause
- **WHEN** the match is paused during a drop and resumed with the finger still down
- **THEN** the pair falls at its normal speed

### Requirement: Same input as keys
Gestures SHALL only produce the per-tick input masks that keys produce, SHALL work in both orientations, and SHALL work alongside keys.

#### Scenario: Touch replay
- **WHEN** a match played by touch is recorded and played back without rendering
- **THEN** its final state hash equals the match's
