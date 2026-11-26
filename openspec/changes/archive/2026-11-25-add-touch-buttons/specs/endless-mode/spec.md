# Spec Delta

## MODIFIED Requirements

### Requirement: Play again
The result SHALL offer playing again in the same mode, by button, Enter or Space, and returning to the title, by button or Esc. Keys and touches SHALL be ignored for a configured time after it opens, and while held from the match.

#### Scenario: Play again
- **WHEN** the player chooses to play again
- **THEN** a match starts in the same mode with a new seed, an empty board, score 0 and level 1

#### Scenario: Key held from the match
- **WHEN** a key is still held when the result opens
- **THEN** it doesn't leave the result

#### Scenario: Tapping as the match ends
- **WHEN** a finger taps where a result button appears just after the result opens, or was held there from the match
- **THEN** it doesn't leave the result
