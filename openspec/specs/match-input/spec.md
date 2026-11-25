# match-input Specification

## Purpose
Defines the match controls and how real time and key presses become engine ticks.

## Requirements

### Requirement: Controls
A/D and ←/→ SHALL move, S and ↓ SHALL soft drop while held, E and X SHALL rotate clockwise, and Q and Z SHALL rotate counterclockwise, by key position. Keys SHALL NOT scroll the page.

#### Scenario: Two keys for one action
- **WHEN** A and ← are held and one is released
- **THEN** the pair keeps moving left

#### Scenario: Quick tap
- **WHEN** a move or rotate key is pressed and released between two ticks
- **THEN** it acts once on the next tick

### Requirement: Held-key repeat
A move key SHALL act on press, then repeat after a configured delay at a configured interval, in ticks. Rotation SHALL act once per press. The operating system's key repeat SHALL be ignored.

#### Scenario: Holding a move key
- **WHEN** a move key is held
- **THEN** the pair moves once, waits the delay, then moves once per interval

#### Scenario: Holding through a spawn
- **WHEN** a move key has been held past its delay when a new pair spawns
- **THEN** the new pair starts repeating without another delay

#### Scenario: Both directions held
- **WHEN** left and right are both held
- **THEN** the one pressed last acts, and releasing it returns to the other with a new delay

### Requirement: Fixed tick rate
The match SHALL advance 60 ticks per second of real time at any display rate. After a stall it SHALL run at most a configured number of ticks per frame and drop the rest.

#### Scenario: Different displays
- **WHEN** the same second passes at 30, 60 or 144 frames per second
- **THEN** the match advances 60 ticks

#### Scenario: Long stall
- **WHEN** the browser stalls for several seconds
- **THEN** the match doesn't skip ahead by that time

### Requirement: Pausing releases keys
While paused the match SHALL NOT advance. Pausing or losing window focus SHALL release every key and drop presses not yet used.

#### Scenario: Key released while paused
- **WHEN** a move key is held, the match is paused, the key is released and the match resumes
- **THEN** the pair doesn't move by itself

#### Scenario: Press in the pause menu
- **WHEN** a rotate key is pressed while paused
- **THEN** the pair doesn't rotate on resume

### Requirement: New seed per match
Each match SHALL start from a fresh seed, and its inputs SHALL be recorded as a replay.

#### Scenario: Two matches
- **WHEN** two matches are started
- **THEN** their seeds are drawn independently

#### Scenario: Recorded match
- **WHEN** a match's recording is played back
- **THEN** its final state hash equals the match's
