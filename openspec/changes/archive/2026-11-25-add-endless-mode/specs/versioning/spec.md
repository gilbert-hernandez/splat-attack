# Spec Delta

## ADDED Requirements

### Requirement: Release archive
The project SHALL provide a command that builds the current release and writes a versioned archive of the build and its SHA-256 checksum.

#### Scenario: Ready
- **WHEN** the command runs on a commit that is ready to tag, or is already tagged with its version
- **THEN** it writes the archive and a checksum file that verifies it

#### Scenario: Not ready
- **WHEN** the tree is dirty, the branch isn't `master`, the changelog doesn't match, or the version's tag points at another commit
- **THEN** it exits with an error and writes nothing
