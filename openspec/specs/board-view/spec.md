# board-view Specification

## Purpose
Defines how a match is drawn: pieces, animation, next-pair preview and ghost.

## Requirements

### Requirement: Board drawing
The Match scene SHALL draw the falling pair and every blob in the visible rows. Nothing SHALL be drawn above the board's top edge.

#### Scenario: Match in progress
- **WHEN** no animation is running
- **THEN** each visible cell shows exactly the blob the engine has there

#### Scenario: Pair entering the board
- **WHEN** a pair is partly in the hidden rows
- **THEN** only the part below the top edge is drawn

#### Scenario: Ladder
- **WHEN** a Ladder match starts
- **THEN** the player's board is live and the rival's board is empty

### Requirement: Smooth pair movement
The falling pair SHALL move between rows without visible jumps, and SHALL NOT overlap the floor or the blob it rests on. Moves and rotations SHALL be eased over a configured number of ticks.

#### Scenario: Falling
- **WHEN** a pair falls at normal speed
- **THEN** it is drawn at positions between rows

#### Scenario: Resting
- **WHEN** a pair is grounded
- **THEN** it is drawn exactly on its cells once its easing ends

### Requirement: Event-driven animation
Landing, falling and splatting SHALL be animated from engine events, counted in ticks, so animation stops while the match is paused. Falls SHALL finish within the engine's settle time and splats within its splat time.

#### Scenario: Blobs fall after a lock or splat
- **WHEN** the engine reports falls
- **THEN** each blob falls from its old row to its new one, then plays its landing animation

#### Scenario: Splat
- **WHEN** the engine reports a splat
- **THEN** its blobs play their splat animation and are gone before the next fall begins

#### Scenario: Long chain
- **WHEN** a chain of several steps ends
- **THEN** the drawn board equals the engine's board

#### Scenario: Match over
- **WHEN** the match ends
- **THEN** the final board stays on screen

### Requirement: Bridges
Blobs of one color at rest next to each other in visible rows SHALL be joined by a bridge.

#### Scenario: Neighbor leaves
- **WHEN** a joined blob splats or starts to fall
- **THEN** its bridges disappear at once

### Requirement: Next-pair preview
The two next pairs SHALL be shown beside the player's board in order, the nearer one first.

#### Scenario: Pair spawns
- **WHEN** a pair spawns
- **THEN** the preview moves up and shows the new second pair

### Requirement: Ghost
While a pair is falling, the view SHALL show where each half will come to rest if it locks in its current columns, behind the real blobs and in the half's own shape.

#### Scenario: Uneven columns
- **WHEN** a horizontal pair is above columns of different heights
- **THEN** each half's ghost is on its own column

#### Scenario: Vertical pair
- **WHEN** a pair is vertical
- **THEN** the ghosts are stacked in the pair's order

#### Scenario: Hidden landing
- **WHEN** a half would come to rest in a hidden row
- **THEN** no ghost is drawn for it

### Requirement: View is read-only
Drawing SHALL NOT change the match state, and the linter SHALL reject view code that imports engine functions that change it.

#### Scenario: View tries to change the board
- **WHEN** view code imports a function that changes the state or grid
- **THEN** `npm run lint` fails
