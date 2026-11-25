# Spec Delta

## MODIFIED Requirements

### Requirement: Scene flow coverage
Browser tests SHALL cover the boot to title flow, both modes, pause and resume, quitting, the result screen, window scaling, the version label, the placeholder fallback, the board view, every control, the debug keys, and the loop from a top-out to the result and a new match.

#### Scenario: Flow breaks
- **WHEN** a change stops Pause from resuming the match
- **THEN** `npm run e2e` fails

#### Scenario: Control breaks
- **WHEN** a change stops one of the move, drop or rotate keys from acting
- **THEN** `npm run e2e` fails

### Requirement: Gameplay recording
The project SHALL provide a command that plays a whole Endless match, from the title to a top-out, the result and a new match, in a browser and saves a video.

#### Scenario: Record
- **WHEN** a developer runs `npm run record` with the dev server running
- **THEN** a .webm is saved in `videos/`, and an .mp4 too when ffmpeg is installed

#### Scenario: Dev server not running
- **WHEN** a developer runs `npm run record` without the dev server
- **THEN** it exits with a message saying to start it
