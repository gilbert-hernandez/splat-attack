## Purpose

Turns a version tag into a GitHub release that carries an installable, checksummed archive of the production build, so a Splat Attack release can go to Arcade with only its download URL and hash.

## ADDED Requirements

### Requirement: Release on version tag
Pushing a tag of the form `v<major>.<minor>.<patch>` SHALL start an automated release for that version. Before building, the release SHALL stop with a failure and change nothing on GitHub when the tag's version differs from the `version` in `package.json` at the tagged commit, or when `CHANGELOG.md` at that commit has no section for that version. Otherwise it SHALL run the format, lint, typecheck and unit-test checks and a production build, and SHALL stop with a failure without touching the release if any of them fails.

#### Scenario: Matching tag
- **WHEN** `package.json` says `0.1.10`, `CHANGELOG.md` has a `## [0.1.10]` section, and tag `v0.1.10` is pushed
- **THEN** the checks and build run and the release for v0.1.10 receives the archive

#### Scenario: Tag doesn't match package.json
- **WHEN** tag `v0.1.11` is pushed on a commit whose `package.json` says `0.1.10`
- **THEN** the release fails with a message naming both versions, and no release or asset is created

#### Scenario: Missing changelog section
- **WHEN** a matching tag is pushed but `CHANGELOG.md` has no section for that version
- **THEN** the release fails with a message saying the section is missing, and no release or asset is created

#### Scenario: Failing checks
- **WHEN** a matching tag is pushed on a commit where a unit test fails
- **THEN** the release fails and no release or asset is created

#### Scenario: Non-version tags
- **WHEN** a tag that isn't `v<major>.<minor>.<patch>` is pushed (for example `demo-test`)
- **THEN** no release runs

### Requirement: Game archive and checksum
The release SHALL package the production build as `splat-attack-<version>.tar.gz`, a gzip-compressed tar whose root holds the contents of the build output (`index.html` and `assets/` at the top level, not inside a folder), containing only build output. It SHALL also produce `splat-attack-<version>.tar.gz.sha256` containing the archive's SHA-256 as 64 lowercase hex digits, two spaces and the archive file name, so `sha256sum -c` can verify it. Packaging the same commit again with the same tools SHALL give the same bytes.

#### Scenario: Archive layout
- **WHEN** the archive for 0.1.10 is listed
- **THEN** it contains `./index.html` and files under `./assets/`, and no top-level folder wraps them

#### Scenario: Checksum verifies
- **WHEN** the archive and its `.sha256` file are downloaded into one folder and `sha256sum -c splat-attack-0.1.10.tar.gz.sha256` is run
- **THEN** it reports the archive as OK

#### Scenario: Archive runs from a sub-path
- **WHEN** the archive is extracted into any folder of a web server and its `index.html` is opened
- **THEN** the game loads, shows `v0.1.10` (no `-dev`) on the title screen, and a match plays

### Requirement: GitHub release contents
If no GitHub release exists for the tag, the release SHALL create one titled `v<version>`, marked as a pre-release while the major version is 0, with the version's `CHANGELOG.md` section as its notes. If a release already exists for the tag, it SHALL keep that release's title, notes and pre-release flag. In both cases it SHALL attach the archive and checksum file, and SHALL make sure the notes end with an "Install on Arcade" block giving the exact `version`, `download_url` (the archive's public download URL) and `sha256` values for Arcade's `config/games.php`, without repeating the block when it is already present.

#### Scenario: New release
- **WHEN** tag `v0.1.10` is pushed and no release exists for it
- **THEN** a pre-release titled `v0.1.10` appears with the 0.1.10 CHANGELOG notes, the archive, the checksum file, and an Install on Arcade block whose `download_url` downloads that archive and whose `sha256` matches it

#### Scenario: Release made by hand first
- **WHEN** a release for the tag was already created by hand, for example titled `v0.2.0: M2 Versus`
- **THEN** its title and notes are kept, the archive and checksum are attached, and the Install on Arcade block is added once at the end

### Requirement: Published archives are never replaced
A release SHALL NOT replace an archive already attached to the release under the same name with different contents. If an attached archive of that name exists and its SHA-256 differs from the new build's, the release SHALL fail with a message saying so and leave the attached files and notes unchanged. If the attached archive has the same SHA-256, the release SHALL succeed without re-uploading it.

#### Scenario: Re-running with a different build
- **WHEN** the release for a tag runs again after its archive was attached, and the new archive has a different hash
- **THEN** the run fails, and the attached archive, checksum and notes are unchanged, so the hash already in `config/games.php` still verifies

#### Scenario: Re-running with the same build
- **WHEN** the release for a tag runs again and the new archive has the same hash as the attached one
- **THEN** the run succeeds without re-uploading the archive, and the notes still hold one Install on Arcade block

### Requirement: Dry run
The release workflow SHALL be startable by hand on any branch as a dry run that runs the same checks, build and packaging, keeps the archive and checksum file as downloadable workflow artifacts, and does not create, change or attach anything to a GitHub release.

#### Scenario: Dry run on a branch
- **WHEN** a developer starts the workflow by hand on a branch
- **THEN** the run's artifacts contain `splat-attack-<version>.tar.gz` and its `.sha256` file for the version in that branch's `package.json`, and the repository's releases are unchanged

### Requirement: Local packaging
`npm run package` SHALL build the game for production and write `release/splat-attack-<version>.tar.gz` and its `.sha256` file with the same packaging as the release workflow, without the readiness checks, and print the archive path and its SHA-256. The `release/` folder SHALL be ignored by git.

#### Scenario: Package locally
- **WHEN** a developer runs `npm run package` on any branch
- **THEN** `release/` holds the archive and checksum for the `package.json` version, the command prints the hash, and `git status` doesn't list them
