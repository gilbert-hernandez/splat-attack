# endless-mode Specification

## Purpose
Defines the Endless loop: playing to a top-out with a live score, the result, and playing again.

## Requirements

### Requirement: Live score and level
During a match the score and level SHALL be on screen and equal the engine's values.

#### Scenario: Splat
- **WHEN** a splat scores points
- **THEN** the shown score includes them in the next drawn frame

#### Scenario: Level change
- **WHEN** a pair that starts a new level spawns
- **THEN** the new level is shown

### Requirement: Match ending
When the match ends, the final board SHALL stay on screen with a game-over message for a configured number of ticks, then the result SHALL open once.

#### Scenario: Top-out
- **WHEN** the board tops out
- **THEN** the game-over message shows, and the result opens after the configured ticks with no input needed

#### Scenario: Paused during the message
- **WHEN** the player pauses while the message shows
- **THEN** the result doesn't open until the match resumes

#### Scenario: Quit during the message
- **WHEN** the player quits from Pause while the message shows
- **THEN** the title opens and the result never does

### Requirement: Result
The result SHALL show the mode, final score, level, pairs played, longest chain and time played. Time SHALL be counted in engine ticks, so pauses don't count.

#### Scenario: Known match
- **WHEN** a match with known inputs ends
- **THEN** the result shows exactly that match's values

### Requirement: Play again
The result SHALL offer playing again in the same mode, by button, Enter or Space, and returning to the title, by button or Esc. Keys SHALL be ignored for a configured time after it opens, and while held from the match.

#### Scenario: Play again
- **WHEN** the player chooses to play again
- **THEN** a match starts in the same mode with a new seed, an empty board, score 0 and level 1

#### Scenario: Key held from the match
- **WHEN** a key is still held when the result opens
- **THEN** it doesn't leave the result
