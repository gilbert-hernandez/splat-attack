# browser-testing Specification Delta

## MODIFIED Requirements

### Requirement: Scene flow coverage
Browser tests SHALL cover the boot to title flow, both modes, pause and resume, quitting, the result screen, window scaling, the version label, the placeholder fallback, the board view and every control.

#### Scenario: Flow breaks
- **WHEN** a change stops Pause from resuming the match
- **THEN** `npm run e2e` fails

#### Scenario: Control breaks
- **WHEN** a change stops one of the move, drop or rotate keys from acting
- **THEN** `npm run e2e` fails

## ADDED Requirements

### Requirement: Direct tick control
Browser tests SHALL be able to stop a match's clock, choose its seed and advance an exact number of ticks. Gameplay tests SHALL NOT depend on elapsed time.

#### Scenario: Advance ticks
- **WHEN** a test stops the clock and advances 10 ticks
- **THEN** the match is exactly 10 ticks further, however long that took
