# Spec Delta

## MODIFIED Requirements

### Requirement: Scene flow coverage
Browser tests SHALL cover the boot to title flow, both modes, pause and resume, quitting, the result screen, window scaling, the version label, the placeholder fallback, the board view, every control, the debug keys, and the loop from a top-out to the result and a new match. The flow from the title to the result and a new match SHALL be covered at 375×667, 390×844, 844×390 and 960×540, and rotation SHALL be covered in menus and mid-match. Every gesture SHALL be covered with touch events sent through the browser, in both orientations. Every match button, multi-touch, mode switching, cancelled touches and the flow by touch alone SHALL be covered the same way.

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
