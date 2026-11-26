# board-view Specification

## Purpose
Defines how a match is drawn: pieces, animation, next-pair preview and ghost.

## Requirements

### Requirement: Board drawing
The Match scene SHALL draw the falling pair and every blob and gunk in the visible rows, with whole and cracked gunk drawn differently from each other and from every blob. Nothing SHALL be drawn above the board's top edge.

#### Scenario: Match in progress
- **WHEN** no animation is running
- **THEN** each visible cell shows exactly the blob or gunk the engine has there

#### Scenario: Pair entering the board
- **WHEN** a pair is partly in the hidden rows
- **THEN** only the part below the top edge is drawn

#### Scenario: Ladder
- **WHEN** a Ladder match is running
- **THEN** both the player's and the rival's boards are live and show their engine boards

#### Scenario: Gunk placeholders
- **WHEN** gunk art is missing
- **THEN** whole and cracked gunk placeholders differ from each other and from every blob placeholder, also in grayscale

### Requirement: Smooth pair movement
The falling pair SHALL move between rows without visible jumps, and SHALL NOT overlap the floor or the blob it rests on. Moves and rotations SHALL be eased over a configured number of ticks.

#### Scenario: Falling
- **WHEN** a pair falls at normal speed
- **THEN** it is drawn at positions between rows

#### Scenario: Resting
- **WHEN** a pair is grounded
- **THEN** it is drawn exactly on its cells once its easing ends

### Requirement: Event-driven animation
Landing, falling, splatting, gunk drops, cracks and clears SHALL be animated from engine events, counted in ticks, so animation stops while the match is paused. Falls and gunk drops SHALL finish within the engine's settle time, and splats and gunk clears within its splat time.

#### Scenario: Blobs fall after a lock or splat
- **WHEN** the engine reports falls
- **THEN** each blob or gunk falls from its old row to its new one, then plays its landing animation

#### Scenario: Splat
- **WHEN** the engine reports a splat
- **THEN** its blobs play their splat animation and are gone before the next fall begins

#### Scenario: Gunk drop
- **WHEN** the engine reports a gunk drop
- **THEN** each gunk falls into the board from above its top edge to its landing row

#### Scenario: Crack and clear
- **WHEN** the engine reports a gunk hit
- **THEN** cracked gunk switches to the cracked look at once, and cleared gunk plays its break animation and is gone before the next fall begins

#### Scenario: Long chain
- **WHEN** a chain of several steps ends
- **THEN** the drawn board equals the engine's board

#### Scenario: Match over
- **WHEN** the match ends
- **THEN** both final boards stay on screen until the result opens

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

### Requirement: Pending gunk display
In Ladder, each board SHALL show its pending gunk count, using icons for single gunk and for larger amounts, and SHALL show nothing when none is pending. It SHALL equal the engine's pending count in the next drawn frame.

#### Scenario: Gunk sent
- **WHEN** the rival's chain sends gunk to the player
- **THEN** the player's pending display shows the new count in the next drawn frame

#### Scenario: Cancelled
- **WHEN** the player's chain cancels all pending gunk
- **THEN** the player's pending display is empty

#### Scenario: Endless
- **WHEN** an Endless match is running
- **THEN** no pending display is shown
