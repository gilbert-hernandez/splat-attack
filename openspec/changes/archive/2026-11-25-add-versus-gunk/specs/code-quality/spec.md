# Spec Delta

## MODIFIED Requirements

### Requirement: Board fixtures
Engine tests SHALL be able to state boards as text, for both starting and expected boards, including whole and cracked gunk.

#### Scenario: Board differs
- **WHEN** a board doesn't match its expected text
- **THEN** the test failure shows both boards as text

#### Scenario: Gunk round trip
- **WHEN** a board with whole and cracked gunk is parsed and rendered
- **THEN** the text is unchanged

#### Scenario: Bad fixture
- **WHEN** a fixture has an unknown letter, a row that isn't 7 cells wide, or too many rows
- **THEN** it throws an error naming the row
