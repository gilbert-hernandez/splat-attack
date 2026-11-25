# project-setup Specification Delta

## RENAMED Requirements

- FROM: `### Requirement: Fixed base resolution with crisp scaling`
- TO: `### Requirement: Crisp scaling`

## MODIFIED Requirements

### Requirement: Crisp scaling
The game SHALL scale its current screen to fit the window, centered, keeping its aspect ratio, without smoothing.

#### Scenario: Window is resized
- **WHEN** the window is resized
- **THEN** the canvas is the largest centered size of the current screen's shape that fits, and pixel art is not blurred
