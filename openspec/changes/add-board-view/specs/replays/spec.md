# replays Specification Delta

## ADDED Requirements

### Requirement: Replays through the view
Stored replays SHALL give the same score and hashes when played in the Match scene with rendering as without it.

#### Scenario: Played with the view
- **WHEN** the browser tests play a stored replay in the Match scene
- **THEN** its result equals the stored expected values, and the drawn board equals the final grid's visible rows
