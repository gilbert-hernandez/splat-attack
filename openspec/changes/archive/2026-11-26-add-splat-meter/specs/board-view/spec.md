# Spec Delta

## MODIFIED Requirements

### Requirement: Event-driven animation
Landing, falling, splatting, gunk drops, cracks, clears and Bomb clears SHALL be animated from engine events, counted in ticks, so animation stops while the match is paused. Falls and gunk drops SHALL finish within the engine's settle time, and splats and gunk clears within its splat time. Falls after a Bomb SHALL finish within the settle time while the pair keeps falling.

#### Scenario: Blobs fall after a lock or splat
- **WHEN** the engine reports falls
- **THEN** each blob or gunk falls from its old row to its new one, then plays its landing animation

#### Scenario: Splat
- **WHEN** the engine reports a splat
- **THEN** its blobs play their splat animation and are gone before the next fall begins

#### Scenario: Gunk drop
- **WHEN** the engine reports a gunk drop
- **THEN** each gunk falls into the board from above its top edge to its landing row

#### Scenario: Crack and clear
- **WHEN** the engine reports a gunk hit
- **THEN** cracked gunk switches to the cracked look at once, and cleared gunk plays its break animation and is gone before the next fall begins

#### Scenario: Bomb
- **WHEN** the engine reports a Bomb
- **THEN** the cleared blobs and gunk are gone, the area shows its new stain, and the blobs above fall to their new rows

#### Scenario: Long chain
- **WHEN** a chain of several steps ends
- **THEN** the drawn board equals the engine's board

#### Scenario: Match over
- **WHEN** the match ends
- **THEN** both final boards stay on screen until the result opens

### Requirement: View is read-only
Drawing SHALL NOT change the match state, and the linter SHALL reject view code that imports engine functions that change it.

#### Scenario: Bomb target
- **WHEN** the view outlines the Bomb target
- **THEN** it reads the target from the engine without changing the state

#### Scenario: View tries to change the board
- **WHEN** view code imports a function that changes the state or grid
- **THEN** `npm run lint` fails
