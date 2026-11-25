# assets Specification Delta

## MODIFIED Requirements

### Requirement: Artist-facing specification
ASSETS.md SHALL list every asset by ticket with file name, size, frames and notes, plus export conventions and delivery steps.

#### Scenario: Artist checks a ticket
- **WHEN** david opens ASSETS.md for an Art ticket from SA-19 to SA-25, or for the portrait files of SA-30
- **THEN** they find the exact files, sizes and frame counts for it

## ADDED Requirements

### Requirement: Portrait art
The manifest SHALL declare portrait versions of the five wall backgrounds, the title background, the logo, the result panel and the ladder panel. Scenes SHALL use the version for the current orientation.

#### Scenario: Rotate on the title
- **WHEN** the window rotates to portrait on the title
- **THEN** the portrait logo and background are used, or their fallbacks while the files are missing
