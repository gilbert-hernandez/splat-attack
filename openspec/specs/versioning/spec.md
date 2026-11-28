# versioning Specification

## Purpose
Defines where the game version comes from, how it is shown, and how it stays in step with the changelog.

## Requirements

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

### Requirement: Release archive
The project SHALL provide a command that builds the current release and writes `release/splat-attack-<version>.tar.gz` and its SHA-256 checksum file, using the same repeatable packaging as the release workflow: the archive's root holds the contents of the build output, and building the same commit with the same tools again gives an archive with the same SHA-256.

#### Scenario: Ready
- **WHEN** the command runs on a commit that is ready to tag, or is already tagged with its version
- **THEN** it writes the archive and a checksum file that verifies it

#### Scenario: Same commit, same hash
- **WHEN** the command runs twice on the same commit
- **THEN** both runs print the same SHA-256

#### Scenario: Not ready
- **WHEN** the tree is dirty, the branch isn't `master`, the changelog doesn't match, or the version's tag points at another commit
- **THEN** it exits with an error and writes nothing
