# Spec Delta

## ADDED Requirements

### Requirement: Release check
The project SHALL provide a command that reports whether the current commit is ready to tag, changing nothing.

#### Scenario: Ready
- **WHEN** `npm run release:check` runs on a clean `master` whose version is new, above the newest tag, and matches the changelog
- **THEN** it exits successfully and prints the tag to create

#### Scenario: Not ready
- **WHEN** the tree is dirty, the branch isn't `master`, the version is already tagged locally or on origin or isn't above the newest tag, or the changelog doesn't match
- **THEN** it exits with an error listing every problem found

#### Scenario: Origin unreachable
- **WHEN** the tags on origin can't be read
- **THEN** it exits with an error saying so
