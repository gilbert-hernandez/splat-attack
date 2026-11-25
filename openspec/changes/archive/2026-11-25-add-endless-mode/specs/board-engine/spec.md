# Spec Delta

## ADDED Requirements

### Requirement: Speed ramp
The level SHALL start at 1 and rise by one each time a configured number of pairs has been played. The fall speed SHALL rise with each level up to a configured maximum, which SHALL NOT exceed the soft-drop speed. Only the number of pairs played SHALL affect the level.

#### Scenario: Next level
- **WHEN** the first pair of a level spawns
- **THEN** it falls at that level's speed

#### Scenario: Maximum
- **WHEN** the level is past the one that reaches the maximum speed
- **THEN** pairs fall at the maximum speed

#### Scenario: Long chain
- **WHEN** a long chain resolves
- **THEN** the level doesn't rise until enough pairs have spawned

## MODIFIED Requirements

### Requirement: Falling and soft drop
A pair SHALL fall at its level's speed, and at the soft-drop speed while soft drop is held.

#### Scenario: Soft drop
- **WHEN** soft drop is held for a falling pair
- **THEN** it reaches the ground sooner than without it, or at the same time at the maximum speed
