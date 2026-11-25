# assets Specification

## Purpose
Defines how graphics are declared and loaded by key, and how placeholders replace missing art.

## Requirements

### Requirement: Single asset manifest
Every graphic the game loads SHALL be declared once with its key, file name, type, frame size and frame count, and game code SHALL use only manifest keys.

#### Scenario: Manifest matches the art spec
- **WHEN** the unit tests compare the manifest with ASSETS.md
- **THEN** they fail unless file names, frame sizes and frame counts all agree

#### Scenario: Invalid entries are rejected
- **WHEN** the manifest has a duplicate key, a file name not starting with `sa_`, or a non-positive size
- **THEN** validation fails and names the entry

### Requirement: Placeholder fallback
When a declared file is missing, the game SHALL generate a placeholder of the declared size and frame count under the same key.

#### Scenario: Art not delivered
- **WHEN** the game loads without `sa_blob_red_idle.png`
- **THEN** a 32×32 placeholder with 4 frames is available under its key and development logs one warning listing all placeholder keys

#### Scenario: Art delivered
- **WHEN** the correctly named PNG is added and the game reloads
- **THEN** the real image is used and the key leaves the warning

### Requirement: Distinguishable blob placeholders
Each blob color's placeholder SHALL have a different shape as well as a different color.

#### Scenario: Viewed without color
- **WHEN** the five blob placeholders are viewed in grayscale
- **THEN** they can be told apart by shape

### Requirement: Artist-facing specification
ASSETS.md SHALL list every asset by ticket with file name, size, frames and notes, plus export conventions and delivery steps.

#### Scenario: Artist checks a ticket
- **WHEN** david opens ASSETS.md for an Art ticket from SA-19 to SA-25, or for the portrait files of SA-30
- **THEN** they find the exact files, sizes and frame counts for it

### Requirement: Portrait art
The manifest SHALL declare portrait versions of the five wall backgrounds, the title background, the logo, the result panel and the ladder panel. Scenes SHALL use the version for the current orientation.

#### Scenario: Rotate on the title
- **WHEN** the window rotates to portrait on the title
- **THEN** the portrait logo and background are used, or their fallbacks while the files are missing
