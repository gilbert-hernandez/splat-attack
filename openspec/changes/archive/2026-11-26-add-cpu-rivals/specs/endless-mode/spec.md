# Spec Delta

## MODIFIED Requirements

### Requirement: Result
The result SHALL show the mode, final score, level, pairs played, longest chain and time played. Time SHALL be counted in engine ticks, so pauses don't count. A Ladder result SHALL also show the outcome (WIN, LOSS or DRAW), the gunk the player sent, and the rival played (number and style name).

#### Scenario: Known match
- **WHEN** a match with known inputs ends
- **THEN** the result shows exactly that match's values

#### Scenario: Ladder outcome
- **WHEN** a Ladder match with known inputs ends in a win
- **THEN** the result shows WIN, the player's score, the gunk the player sent and the rival played

### Requirement: Play again
The result SHALL offer playing again in the same mode, by button, Enter or Space, and returning to the title, by button or Esc. In Ladder, playing again SHALL follow the rival climb. Keys and touches SHALL be ignored for a configured time after it opens, and while held from the match.

#### Scenario: Play again
- **WHEN** the player chooses to play again
- **THEN** a match starts in the same mode with a new seed, an empty board, score 0 and level 1

#### Scenario: Play again in Ladder
- **WHEN** the player chooses to play again after a Ladder win
- **THEN** the new match is against the next rival in the climb

#### Scenario: Key held from the match
- **WHEN** a key is still held when the result opens
- **THEN** it doesn't leave the result

#### Scenario: Tapping as the match ends
- **WHEN** a finger taps where a result button appears just after the result opens, or was held there from the match
- **THEN** it doesn't leave the result
