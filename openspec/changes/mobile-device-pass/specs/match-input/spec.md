# Spec Delta

## MODIFIED Requirements

### Requirement: Pausing releases keys
While paused the match SHALL NOT advance. Pausing SHALL release every key and touch, and drop presses and gestures not yet used. Losing window focus or hiding the page SHALL pause the match.

#### Scenario: Key released while paused
- **WHEN** a move key is held, the match is paused, the key is released and the match resumes
- **THEN** the pair doesn't move by itself

#### Scenario: Press in the pause menu
- **WHEN** a rotate key is pressed while paused
- **THEN** the pair doesn't rotate on resume

#### Scenario: Key held through a focus loss
- **WHEN** a move key is held, the window loses focus, and the match is resumed
- **THEN** the pair doesn't move by itself
