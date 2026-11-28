## MODIFIED Requirements

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
