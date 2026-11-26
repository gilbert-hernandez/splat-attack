# Spec Delta

## Purpose

Defines a versus match: two boards in one deterministic match that attack each other with gunk, the gunk's rules on the board, and how a match is won, lost or drawn.

## ADDED Requirements

### Requirement: Two boards in one match
A versus match SHALL run two boards from one seed, both advanced on every tick with the same rules, each by its own per-tick input. Both boards SHALL get the same pair sequence. The same seed and inputs SHALL give the same match in browsers and Node.

#### Scenario: Same pieces
- **WHEN** a versus match starts
- **THEN** both boards' current and next pairs are equal, and the nth pair each board spawns is the same pair

#### Scenario: Same seed and inputs
- **WHEN** a versus match is played twice with the same seed and both sides' inputs
- **THEN** both final states and their hashes are equal

#### Scenario: Neither side moves first
- **WHEN** both boards send gunk on the same tick
- **THEN** each board's attack offsets its own pending gunk from before that tick, and the rest goes to the other board

### Requirement: Attack power
Each chain step SHALL add attack power that rises with its blobs, its stain matches and its chain position. When the chain ends, the power SHALL become whole gunk, and any remainder SHALL be dropped. Power SHALL be whole numbers, and all its values SHALL be config.

#### Scenario: Single small splat
- **WHEN** a single group of four blobs splats with no stain matches and the chain ends
- **THEN** no gunk is sent

#### Scenario: Chains pay most
- **WHEN** the same number of blobs is cleared as one splat or as a chain of fours
- **THEN** the chain sends more gunk

#### Scenario: Stain matches
- **WHEN** the same chain is played with and without stain matches
- **THEN** the one with stain matches sends at least as much gunk, and more on a known board

#### Scenario: Known boards
- **WHEN** a known board resolves a chain
- **THEN** the gunk sent is the exact expected amount

### Requirement: Pending gunk and offsetting
Gunk sent to a board SHALL wait in that board's pending count. When a board's chain ends with gunk to send, the gunk SHALL first cancel that board's own pending gunk, and only the rest SHALL be added to the other board's pending count.

#### Scenario: Cancel incoming
- **WHEN** a board with 10 pending gunk ends a chain worth 6
- **THEN** its pending count becomes 4 and the other board receives nothing

#### Scenario: Attack through
- **WHEN** a board with 3 pending gunk ends a chain worth 10
- **THEN** its pending count becomes 0 and the other board's rises by 7

### Requirement: Gunk drops
A board's pending gunk SHALL drop after its current pair has locked and any chain has ended, before its next pair spawns. One drop SHALL hold at most a configured amount, and the rest SHALL stay pending. Full rows SHALL land first, then each remaining gunk in a different column chosen by the board's seeded random stream. Gunk SHALL land on top of each column's blobs, and gunk that doesn't fit on the board SHALL be lost. After the drop settles, the top-out rule SHALL apply before the next pair spawns.

#### Scenario: Drop between pairs
- **WHEN** gunk arrives while a board's pair is falling
- **THEN** it doesn't drop until that pair has locked and its chain has ended

#### Scenario: Rows then columns
- **WHEN** 10 gunk drops on a 7-column board
- **THEN** one full row lands, and 3 more gunk land in 3 different columns

#### Scenario: Capped drop
- **WHEN** more gunk is pending than one drop holds
- **THEN** exactly the cap drops and the rest stays pending for the next drop

#### Scenario: Seeded columns
- **WHEN** the same match is played twice
- **THEN** partial rows land in the same columns

#### Scenario: Buried
- **WHEN** a drop fills the spawn cell
- **THEN** that board tops out

### Requirement: Gunk on the board
Gunk SHALL never match or join a group, and SHALL fall like a blob. A splat SHALL crack each whole gunk orthogonally next to one of its blobs, and clear each cracked gunk next to one. A gunk SHALL take at most one hit per chain step. Gunk in the hidden rows SHALL NOT be hit. Cleared gunk SHALL leave no stain and change no stain.

#### Scenario: Crack
- **WHEN** a group splats next to a whole gunk
- **THEN** the gunk becomes cracked and stays in place

#### Scenario: Clear
- **WHEN** a group splats next to a cracked gunk
- **THEN** the gunk is removed, the blobs above it fall, and the stain under it is unchanged

#### Scenario: One hit per step
- **WHEN** a whole gunk touches two splatting groups in the same chain step
- **THEN** it is cracked, not cleared

#### Scenario: Two steps
- **WHEN** a whole gunk is next to a splat in chain step 1 and another in step 2
- **THEN** it is cracked in step 1 and cleared in step 2

#### Scenario: Never matches
- **WHEN** four or more gunk are connected
- **THEN** nothing splats

### Requirement: Win, loss and draw
A board that tops out SHALL lose and the other SHALL win. If both boards top out on the same tick, the match SHALL be a draw. Once the match has an outcome, neither board SHALL change.

#### Scenario: Rival tops out
- **WHEN** the rival's board tops out and the player's doesn't
- **THEN** the player wins and both boards stop

#### Scenario: Same tick
- **WHEN** both boards top out on the same tick
- **THEN** the match is a draw

#### Scenario: After the end
- **WHEN** more ticks run after the outcome
- **THEN** both boards, their pending gunk and the outcome stay the same

### Requirement: Sparring rival
Until the CPU rivals arrive, the Ladder rival's board SHALL be played by a sparring rival that chooses moves only from the match state, with no randomness from outside the match and no clock, and gives its moves as the same per-tick input as a player. It SHALL act no faster than a configured pace.

#### Scenario: Reproducible
- **WHEN** the sparring rival plays the same match state twice
- **THEN** it gives the same inputs

#### Scenario: Paced
- **WHEN** the sparring rival plays a pair
- **THEN** it moves or rotates at most once per configured number of ticks, and soft-drops only once the pair is in place and a configured delay has passed

#### Scenario: Plays to the end
- **WHEN** the sparring rival plays a whole match against a slower-paced copy of itself
- **THEN** it splats, sends gunk, and the match ends with an outcome
