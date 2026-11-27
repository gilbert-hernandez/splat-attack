# Spec Delta

## ADDED Requirements

### Requirement: Rival label place
Every Ladder match layout SHALL place the rival label next to the rival's board, in portrait at every supported height and in landscape in both input modes. The label SHALL NOT overlap the boards, the next pairs, the HUD, the pending gunk, the meters, the touch buttons or the debug hint. Endless layouts SHALL have no rival label.

#### Scenario: Landscape
- **WHEN** a landscape Ladder match is shown in either input mode
- **THEN** the rival label is next to the rival's board and overlaps nothing

#### Scenario: Portrait at any height
- **WHEN** a portrait Ladder match is shown at any supported height
- **THEN** the rival label is shown, inside the screen, and overlaps nothing

#### Scenario: Longest name
- **WHEN** the label shows the longest rival number and style name
- **THEN** it still fits its place in every layout
