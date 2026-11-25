# Spec Delta

## Purpose
Defines how Splat Attack is run and built, how it fills the window, and its scene flow skeleton.

## ADDED Requirements

### Requirement: Local development and production build
The project SHALL provide npm scripts for a hot-reload dev server, a static production build, a preview of that build, and unit tests.

#### Scenario: Dev server
- **WHEN** a developer runs `npm install` and then `npm run dev`
- **THEN** the printed URL shows the game with no console errors

#### Scenario: Static build
- **WHEN** a developer runs `npm run build`
- **THEN** `dist/` runs from any static web server and any sub-path, with no backend

### Requirement: Fixed base resolution with crisp scaling
The game SHALL render at 960×540 and scale to fit the window, centered, keeping its aspect ratio, without smoothing.

#### Scenario: Window is resized
- **WHEN** the window is resized
- **THEN** the canvas is the largest centered 16:9 size that fits and pixel art is not blurred

### Requirement: Scene flow skeleton
The game SHALL go from loading to title to mode select to a match with a UI overlay, and SHALL have Pause and Result screens.

#### Scenario: Start a match
- **WHEN** the player leaves the title screen and picks Ladder or Endless
- **THEN** the Match scene starts in that mode with the UI overlay on top

#### Scenario: Pause and resume
- **WHEN** the player presses Esc in a match and then resumes
- **THEN** the Pause screen opens over a stopped match and the match continues afterwards

#### Scenario: Reach the result screen during development
- **WHEN** debug mode is on and the developer presses the result key in a match
- **THEN** the Result screen opens and can return to the title

### Requirement: Centralized configuration
Display and gameplay tunables SHALL live in configuration modules outside scene code.

#### Scenario: Change a setting
- **WHEN** a developer changes the background color in config
- **THEN** the game uses it on reload with no scene edits
