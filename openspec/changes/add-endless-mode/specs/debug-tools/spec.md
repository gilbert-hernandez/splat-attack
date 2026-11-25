# Spec Delta

## Purpose
Defines the developer keys that set up, slow down and end a match while testing, in development builds only.

## ADDED Requirements

### Requirement: Debug keys
In development builds a match SHALL have keys to set the next pair, load a prepared board, freeze the clock, step one tick, fast-forward and force the end, and SHALL list them on screen. They SHALL do nothing while paused and in production builds.

#### Scenario: Set the next pair
- **WHEN** two color keys are pressed
- **THEN** the nearer next pair has those colors, in that order

#### Scenario: Load a board
- **WHEN** the board key is pressed while a match is running
- **THEN** the next prepared board is shown with a pair at the spawn cell, and play continues from it

#### Scenario: Step
- **WHEN** the step key is pressed
- **THEN** the clock is frozen and the match is exactly one tick further

#### Scenario: Unfreeze
- **WHEN** a frozen match is unfrozen
- **THEN** it continues without catching up on the frozen time

#### Scenario: Force the end
- **WHEN** the end key is pressed
- **THEN** the match ends through the normal game-over and result

### Requirement: Edited matches leave no replay
A match whose state was changed by a debug key SHALL have no replay. Freezing, stepping and fast-forwarding SHALL keep it.

#### Scenario: Board loaded
- **WHEN** a board is loaded during a match
- **THEN** the match has no replay

#### Scenario: Fast-forwarded
- **WHEN** a match is fast-forwarded and its recording is played back
- **THEN** the final state hashes are equal
