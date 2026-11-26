# Spec Delta

## MODIFIED Requirements

### Requirement: Match ending
When the match ends, the final board or boards SHALL stay on screen with a message for a configured number of ticks, then the result SHALL open once. In Endless the match ends when the board tops out and the message is GAME OVER. In Ladder the match ends when either board tops out, and the message is YOU WIN, YOU LOSE or DRAW.

#### Scenario: Top-out
- **WHEN** the board tops out
- **THEN** the game-over message shows, and the result opens after the configured ticks with no input needed

#### Scenario: Rival tops out
- **WHEN** the rival's board tops out in a Ladder match
- **THEN** YOU WIN shows over the player's board, and the result opens after the configured ticks

#### Scenario: Paused during the message
- **WHEN** the player pauses while the message shows
- **THEN** the result doesn't open until the match resumes

#### Scenario: Quit during the message
- **WHEN** the player quits from Pause while the message shows
- **THEN** the title opens and the result never does

### Requirement: Result
The result SHALL show the mode, final score, level, pairs played, longest chain and time played. Time SHALL be counted in engine ticks, so pauses don't count. A Ladder result SHALL also show the outcome (WIN, LOSS or DRAW) and the gunk the player sent.

#### Scenario: Known match
- **WHEN** a match with known inputs ends
- **THEN** the result shows exactly that match's values

#### Scenario: Ladder outcome
- **WHEN** a Ladder match with known inputs ends in a win
- **THEN** the result shows WIN, the player's score and the gunk the player sent
