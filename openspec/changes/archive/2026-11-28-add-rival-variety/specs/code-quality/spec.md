## MODIFIED Requirements

### Requirement: Continuous integration
Every push and pull request SHALL run the combined check, the quick rival sim, the quick variety run, the production build and the browser tests.

#### Scenario: Failing browser test
- **WHEN** a browser test fails in CI
- **THEN** the run fails and its report and videos can be downloaded

#### Scenario: Strength order broken
- **WHEN** a change breaks the quick sim's strength order
- **THEN** the CI run fails at the sim step

#### Scenario: Rivals repeat themselves
- **WHEN** a change makes a rival fail the quick variety run's opening targets
- **THEN** the CI run fails at the variety step
