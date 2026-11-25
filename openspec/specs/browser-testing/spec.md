# browser-testing Specification

## Purpose
Defines how the game is tested and recorded in a real browser, and the hooks that make it possible.

## Requirements

### Requirement: Browser tests with video
The project SHALL provide a command that starts this project's own server, runs browser tests, and records a video of each test.

#### Scenario: Run the browser tests
- **WHEN** a developer runs `npm run e2e`
- **THEN** the tests run against a server started from this project and each leaves a video

#### Scenario: Another game's dev server is running
- **WHEN** the Gun Hands dev server is running during `npm run e2e`
- **THEN** the tests still run against Splat Attack

### Requirement: Scene flow coverage
Browser tests SHALL cover the boot to title flow, both modes, pause and resume, quitting, the result screen, window scaling, the version label, the placeholder fallback, the board view and every control.

#### Scenario: Flow breaks
- **WHEN** a change stops Pause from resuming the match
- **THEN** `npm run e2e` fails

#### Scenario: Control breaks
- **WHEN** a change stops one of the move, drop or rotate keys from acting
- **THEN** `npm run e2e` fails

### Requirement: Dev-only hooks
The game hook used by tests and the debug shortcuts SHALL exist only in development builds.

#### Scenario: Production build
- **WHEN** the production build runs in a browser
- **THEN** `window.__GAME__` is undefined, the debug keys do nothing, and the title label is the plain version

### Requirement: Gameplay recording
The project SHALL provide a command that plays a scripted route in a browser and saves a video.

#### Scenario: Record
- **WHEN** a developer runs `npm run record` with the dev server running
- **THEN** a .webm is saved in `videos/`, and an .mp4 too when ffmpeg is installed

#### Scenario: Dev server not running
- **WHEN** a developer runs `npm run record` without the dev server
- **THEN** it exits with a message saying to start it

### Requirement: Direct tick control
Browser tests SHALL be able to stop a match's clock, choose its seed and advance an exact number of ticks. Gameplay tests SHALL NOT depend on elapsed time.

#### Scenario: Advance ticks
- **WHEN** a test stops the clock and advances 10 ticks
- **THEN** the match is exactly 10 ticks further, however long that took
