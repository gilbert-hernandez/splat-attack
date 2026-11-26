# Spec Delta

## MODIFIED Requirements

### Requirement: Screen shape
The game SHALL be 960×540 when the space inside the safe areas is at least as wide as tall. Otherwise it SHALL be 360 wide and as tall as fits that space's shape, between 640 and 780.

#### Scenario: Desktop or landscape phone
- **WHEN** the window is 960×540 or 844×390
- **THEN** the game is 960×540

#### Scenario: Upright phone
- **WHEN** the window is 375×667
- **THEN** the game is 360×640

#### Scenario: Very tall window
- **WHEN** the window is 360×1000
- **THEN** the game is 360×780, centered

#### Scenario: Insets change the shape
- **WHEN** the window is 390×844 with 47 px top and 34 px bottom insets
- **THEN** the game's shape is chosen from 390×763
