# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
