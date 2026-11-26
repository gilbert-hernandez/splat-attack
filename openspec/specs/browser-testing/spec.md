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
Browser tests SHALL cover the boot to title flow, both modes, pause and resume, quitting, the result screen, window scaling, the version label, the placeholder fallback, the board view, every control, the debug keys, and the loop from a top-out to the result and a new match. The flow from the title to the result and a new match SHALL be covered at 375×667, 390×844, 844×390 and 960×540, and rotation SHALL be covered in menus and mid-match. Every gesture SHALL be covered with touch events sent through the browser, in both orientations. Every match button, multi-touch, mode switching, cancelled touches and the flow by touch alone SHALL be covered the same way. Blocked page gestures, safe-area insets, pausing on blur and on hiding the page, and text sizes SHALL be covered too.

#### Scenario: Flow breaks
- **WHEN** a change stops Pause from resuming the match
- **THEN** `npm run e2e` fails

#### Scenario: Control breaks
- **WHEN** a change stops one of the move, drop or rotate keys from acting
- **THEN** `npm run e2e` fails

#### Scenario: Landscape moves
- **WHEN** a change moves an object in a scene at 960×540 in keyboard mode
- **THEN** `npm run e2e` fails

#### Scenario: Gesture breaks
- **WHEN** a change stops a drag, tap or downward drag from acting
- **THEN** `npm run e2e` fails

#### Scenario: Button breaks
- **WHEN** a change stops a match button from acting during a drag
- **THEN** `npm run e2e` fails

#### Scenario: Page zooms again
- **WHEN** a change lets a pinch on the letterbox zoom the page
- **THEN** `npm run e2e` fails

#### Scenario: Background keeps playing
- **WHEN** a change stops a hidden page from pausing the match
- **THEN** `npm run e2e` fails

### Requirement: Dev-only hooks
The game hook used by tests and the debug shortcuts SHALL exist only in development builds.

#### Scenario: Production build
- **WHEN** the production build runs in a browser
- **THEN** `window.__GAME__` is undefined, the debug keys do nothing, and the title label is the plain version

### Requirement: Gameplay recording
The project SHALL provide a command that plays a whole Endless match, from the title to a top-out, the result and a new match, in a browser and saves a video. With `--touch` it SHALL do so on a portrait phone screen, using touch for the menus and the pause button.

#### Scenario: Record
- **WHEN** a developer runs `npm run record` with the dev server running
- **THEN** a .webm is saved in `videos/`, and an .mp4 too when ffmpeg is installed

#### Scenario: Touch recording
- **WHEN** a developer runs `npm run record -- --touch` with the dev server running
- **THEN** a portrait video is saved the same way, reaching the match, Pause and the result by touch

#### Scenario: Dev server not running
- **WHEN** a developer runs `npm run record` without the dev server
- **THEN** it exits with a message saying to start it

### Requirement: Direct tick control
Browser tests SHALL be able to stop a match's clock, choose its seed and advance an exact number of ticks. Gameplay tests SHALL NOT depend on elapsed time.

#### Scenario: Advance ticks
- **WHEN** a test stops the clock and advances 10 ticks
- **THEN** the match is exactly 10 ticks further, however long that took
