# Spec Delta

## Purpose
Defines where the game version comes from, how it is shown, and how it stays in step with the changelog.

## ADDED Requirements

### Requirement: Single version source
The version SHALL be defined only in `package.json` and shown on the title screen.

#### Scenario: Production build
- **WHEN** the production build of version 0.0.1 shows the title
- **THEN** the label reads `v0.0.1`

#### Scenario: Development build
- **WHEN** the dev server shows the title
- **THEN** the label reads `v0.0.1-dev (<commit>)`, or `v0.0.1-dev` when no commit is available

### Requirement: Changelog agreement
The newest dated version in CHANGELOG.md SHALL equal the `package.json` version.

#### Scenario: Forgotten changelog entry
- **WHEN** `package.json` is bumped without a matching changelog section
- **THEN** `npm test` fails and shows both versions
