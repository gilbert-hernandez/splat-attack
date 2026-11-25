# Spec Delta

## MODIFIED Requirements

### Requirement: Event-driven animation
Landing, falling and splatting SHALL be animated from engine events, counted in ticks, so animation stops while the match is paused. Falls SHALL finish within the engine's settle time and splats within its splat time.

#### Scenario: Blobs fall after a lock or splat
- **WHEN** the engine reports falls
- **THEN** each blob falls from its old row to its new one, then plays its landing animation

#### Scenario: Splat
- **WHEN** the engine reports a splat
- **THEN** its blobs play their splat animation and are gone before the next fall begins

#### Scenario: Long chain
- **WHEN** a chain of several steps ends
- **THEN** the drawn board equals the engine's board

#### Scenario: Match over
- **WHEN** the match ends
- **THEN** the final board stays on screen until the result opens
