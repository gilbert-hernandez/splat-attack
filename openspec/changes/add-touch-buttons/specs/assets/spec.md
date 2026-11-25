# Spec Delta

## ADDED Requirements

### Requirement: Touch art
The manifest and ASSETS.md SHALL declare the touch button (normal and pressed) and the clockwise, counterclockwise, pause and meter icons. While an icon's file is missing, its button SHALL show a readable symbol instead.

#### Scenario: Icons not delivered
- **WHEN** a match is shown in touch mode without the icon files
- **THEN** each button shows a symbol that tells it apart

#### Scenario: Icon delivered
- **WHEN** the correctly named icon is added and the game reloads
- **THEN** the button shows the icon and no symbol
