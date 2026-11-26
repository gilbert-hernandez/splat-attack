# debug-tools Specification

## Purpose
Defines the developer keys that set up, slow down and end a match while testing, in development builds only.

## Requirements

### Requirement: Debug keys
In development builds a match SHALL have keys to set the next pair, load a prepared board, freeze the clock, step one tick, fast-forward, send a row of gunk to the player's or the rival's board, force a win and force the end, and SHALL list them on screen. They SHALL do nothing while paused and in production builds. Prepared boards MAY include stains and gunk. At least one SHALL set up a stain match, and at least one SHALL set up a gunk crack and a gunk clear.

#### Scenario: Set the next pair
- **WHEN** two color keys are pressed
- **THEN** the nearer next pair has those colors, in that order

#### Scenario: Load a board
- **WHEN** the board key is pressed while a match is running
- **THEN** the next prepared board, with its stains and gunk, is shown on the player's board with a pair at the spawn cell, and play continues from it

#### Scenario: Stain board
- **WHEN** the stain board is loaded and its pair is dropped where its comment says
- **THEN** the splat scores a stain match and paints over a stain of another color

#### Scenario: Gunk board
- **WHEN** the gunk board is loaded and its pair is dropped where its comment says
- **THEN** the splat cracks a whole gunk and clears a cracked one

#### Scenario: Send gunk
- **WHEN** the send-gunk key for a board is pressed
- **THEN** that board's pending count rises by one row of gunk, which drops by the normal rules; in Endless only the player's key acts

#### Scenario: Step
- **WHEN** the step key is pressed
- **THEN** the clock is frozen and the match is exactly one tick further

#### Scenario: Unfreeze
- **WHEN** a frozen match is unfrozen
- **THEN** it continues without catching up on the frozen time

#### Scenario: Force a win
- **WHEN** the win key is pressed in a Ladder match
- **THEN** the rival's board tops out and the match ends through the normal game-over and a WIN result

#### Scenario: Force the end
- **WHEN** the end key is pressed
- **THEN** the player's board tops out and the match ends through the normal game-over and result

### Requirement: Edited matches leave no replay
A match whose state was changed by a debug key, including sending gunk and forcing a win, SHALL have no replay. Freezing, stepping and fast-forwarding SHALL keep it.

#### Scenario: Board loaded
- **WHEN** a board is loaded during a match
- **THEN** the match has no replay

#### Scenario: Gunk sent by key
- **WHEN** gunk is sent by debug key during a match
- **THEN** the match has no replay

#### Scenario: Fast-forwarded
- **WHEN** a match is fast-forwarded and its recording is played back
- **THEN** the final state hashes are equal
