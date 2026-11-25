# Spec Delta

## MODIFIED Requirements

### Requirement: Scene flow skeleton
The game SHALL go from loading to title to mode select to a match with a UI overlay, and SHALL have Pause and Result screens.

#### Scenario: Start a match
- **WHEN** the player leaves the title screen and picks Ladder or Endless
- **THEN** the Match scene starts in that mode with the UI overlay on top

#### Scenario: Pause and resume
- **WHEN** the player presses Esc in a match and then resumes
- **THEN** the Pause screen opens over a stopped match and the match continues afterwards

#### Scenario: Reach the result screen during development
- **WHEN** debug mode is on and the developer presses the result key in a match
- **THEN** the match ends, and the Result screen opens and can return to the title
