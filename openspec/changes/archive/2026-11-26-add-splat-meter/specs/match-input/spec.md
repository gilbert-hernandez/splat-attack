# Spec Delta

## MODIFIED Requirements

### Requirement: Controls
A/D and ←/→ SHALL move, S and ↓ SHALL soft drop while held, E and X SHALL rotate clockwise, Q and Z SHALL rotate counterclockwise, and Space SHALL open and close the meter choice, by key position. While the meter choice is open, A, ←, Q and Z SHALL pick Rinse and D, →, E and X SHALL pick Bomb instead of moving or rotating. Keys SHALL NOT scroll the page.

#### Scenario: Two keys for one action
- **WHEN** A and ← are held and one is released
- **THEN** the pair keeps moving left

#### Scenario: Quick tap
- **WHEN** a move or rotate key is pressed and released between two ticks
- **THEN** it acts once on the next tick

#### Scenario: Picking in the choice
- **WHEN** the meter choice is open and → is pressed
- **THEN** Bomb fires on the next tick and the pair doesn't move

#### Scenario: Held key when the choice opens
- **WHEN** ← is held and Space opens the meter choice
- **THEN** the pair stops moving and nothing is picked until a key is pressed again

#### Scenario: Space with the meter not full
- **WHEN** Space is pressed while the meter isn't full
- **THEN** nothing happens

### Requirement: Pausing releases keys
While paused the match SHALL NOT advance. Pausing SHALL release every key and touch, drop presses and gestures not yet used, and close the meter choice without firing. Losing window focus or hiding the page SHALL pause the match.

#### Scenario: Key released while paused
- **WHEN** a move key is held, the match is paused, the key is released and the match resumes
- **THEN** the pair doesn't move by itself

#### Scenario: Press in the pause menu
- **WHEN** a rotate key is pressed while paused
- **THEN** the pair doesn't rotate on resume

#### Scenario: Key held through a focus loss
- **WHEN** a move key is held, the window loses focus, and the match is resumed
- **THEN** the pair doesn't move by itself

#### Scenario: Choice open through a pause
- **WHEN** the meter choice is open as the match pauses
- **THEN** on resume the choice is closed, nothing has fired and the meter is still full
