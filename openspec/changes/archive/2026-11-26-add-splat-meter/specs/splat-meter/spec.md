# Spec Delta

## ADDED Requirements

### Requirement: Meter fill
Each board SHALL have a paint meter in its match state, from empty to a configured maximum. Each chain step SHALL add to it from its splatted blobs and stain matches, multiplied by the step's chain number, with every value in the rules config. The meter SHALL NOT pass its maximum, and fill past it SHALL be lost. Only splats SHALL fill the meter: gunk drops, gunk hits, Rinse and Bomb SHALL NOT.

#### Scenario: One splat
- **WHEN** a board splats one group of four blobs with no stain matches as chain step 1
- **THEN** its meter rises by four times the configured fill per blob

#### Scenario: Chain step
- **WHEN** the same group splats as chain step 3
- **THEN** its meter rises by three times as much as at step 1

#### Scenario: Stain matches
- **WHEN** a splatted group has stain matches
- **THEN** each one adds the configured stain fill on top of the blob fill

#### Scenario: Full
- **WHEN** a splat would take the meter past its maximum
- **THEN** the meter equals its maximum

### Requirement: Firing the meter
A board SHALL fire its meter only through its per-tick input: one bit for Rinse and one for Bomb. Firing SHALL need a full meter and a live board, and SHALL empty the meter. An input with both bits SHALL fire nothing. Firing SHALL NOT need the meter's choice: any player of the board, including a CPU rival, MAY send the bits.

#### Scenario: Meter not full
- **WHEN** a board sends Rinse or Bomb with its meter below the maximum
- **THEN** nothing happens and the meter keeps its fill

#### Scenario: Both bits
- **WHEN** a board with a full meter sends Rinse and Bomb in one tick
- **THEN** nothing fires and the meter stays full

#### Scenario: Match over
- **WHEN** a board that is over sends Rinse or Bomb
- **THEN** nothing happens

#### Scenario: Same on both boards
- **WHEN** the rival's board fires the meter in a versus match
- **THEN** it follows the same rules as the player's board

### Requirement: Refill limit
After firing, a board's meter SHALL NOT fill again until a configured number of pairs has spawned on that board. The limit SHALL count pairs, not ticks.

#### Scenario: Splat right after firing
- **WHEN** a board fires its meter and its next pair splats before the limit has passed
- **THEN** the meter stays empty

#### Scenario: Waiting
- **WHEN** a board holds its pair in place after firing
- **THEN** the limit doesn't pass, however many ticks go by

#### Scenario: Limit passed
- **WHEN** the configured number of pairs has spawned since firing
- **THEN** splats fill the meter again

### Requirement: Rinse
Rinse SHALL remove all of the board's pending gunk on the tick it fires, in any phase of a live board. Rinsed gunk SHALL NOT be sent anywhere or count as an attack. Rinse SHALL be refused while the board has no pending gunk, and the meter SHALL stay full.

#### Scenario: Gunk pending
- **WHEN** a board with 10 pending gunk and a full meter fires Rinse
- **THEN** its pending count is 0, its meter is empty, and the other board's pending count is unchanged

#### Scenario: During a chain
- **WHEN** a board fires Rinse while its chain is splatting
- **THEN** the pending gunk is removed at once and the chain continues

#### Scenario: Nothing pending
- **WHEN** a board with no pending gunk fires Rinse
- **THEN** nothing happens and the meter stays full

#### Scenario: Endless
- **WHEN** a player fires Rinse in Endless
- **THEN** nothing happens, because Endless never has pending gunk

### Requirement: Bomb
Bomb SHALL clear the 3×3 area centered on its target. The target SHALL be the top filled visible cell in the falling pair's pivot column, or that column's bottom row if the column has no visible cells filled. Every blob, whole gunk and cracked gunk in the area SHALL be cleared. Every visible cell in the area SHALL be stained with the pivot's color, including cells that were already empty. Cells outside the board and in the hidden rows SHALL be left alone. Gravity SHALL follow at once, and the falling pair SHALL keep falling.

#### Scenario: Middle of a stack
- **WHEN** a board fires Bomb with its pair above column 3, whose top filled cell is in the middle of the board
- **THEN** the 3×3 cells around that cell are empty and stained with the pivot's color, and the blobs above them have fallen

#### Scenario: Edge of the board
- **WHEN** the target is in column 0
- **THEN** only the 2×3 area inside the board is cleared and stained

#### Scenario: Empty column
- **WHEN** the pivot's column is empty
- **THEN** the area is centered on that column's bottom row, so only two rows are cleared

#### Scenario: Gunk in the area
- **WHEN** whole and cracked gunk are inside the area
- **THEN** both are cleared at once

#### Scenario: Hidden rows
- **WHEN** the target is in the top visible row
- **THEN** no cell in the hidden rows is cleared or stained

### Requirement: Armed Bomb
A Bomb fired while no pair is falling SHALL empty the meter at once and go off on the first tick a pair is falling, aimed at that pair. A Rinse SHALL never wait.

#### Scenario: Fired during a chain
- **WHEN** a board fires Bomb while it is splatting
- **THEN** the meter empties, the chain finishes normally, and the Bomb goes off on the next pair's first falling tick, aimed at its pivot column

#### Scenario: Topped out first
- **WHEN** a board with an armed Bomb tops out before its next pair spawns
- **THEN** the Bomb never goes off

### Requirement: Score effects
Firing the meter SHALL add no points and cost none. Cells cleared by a Bomb SHALL NOT be a splat: they SHALL score no points, add no attack power, make no stain matches and fill no meter. Groups that form after a Bomb SHALL splat when the board's next pair locks, as part of that pair's chain, and score by the normal rules. Rinse SHALL leave the score, the chain and the attack power as they were.

#### Scenario: Bomb clears blobs
- **WHEN** a Bomb clears eight blobs
- **THEN** the score, the attack power and the meter don't change

#### Scenario: Fallout chain
- **WHEN** a Bomb's gravity leaves four connected blobs of one color, and the next pair then locks
- **THEN** those blobs splat as chain step 1 of that pair's chain and score normally, while the refill limit still keeps the meter empty

#### Scenario: Rinse during an attack
- **WHEN** a board fires Rinse while its chain is still building attack power
- **THEN** the chain's attack power is unchanged, and when it ends there is no pending gunk to cancel

### Requirement: Meter choice
A match SHALL open a quick choice when the player asks for it with a full meter: Space on a keyboard, or the meter button by touch. The choice SHALL offer Rinse on the left and Bomb on the right. It SHALL show Rinse as unavailable while nothing is pending. Picking an option SHALL send its bit on the next tick and close the choice. While the choice is open, the match SHALL keep running at its normal speed, the pair SHALL keep falling and locking, and soft drop SHALL still work. Moves and rotations from keys, gestures and buttons SHALL be held back so that picking never moves or turns the pair. The choice SHALL close without firing when asked again, after a configured number of ticks, on pause, on rotation, and when the meter is no longer full.

#### Scenario: Keyboard Bomb
- **WHEN** the meter is full, the player presses Space, then D
- **THEN** Bomb fires on the next tick and the pair doesn't move

#### Scenario: Keyboard Rinse
- **WHEN** gunk is pending, the meter is full, and the player presses Space, then Q
- **THEN** Rinse fires on the next tick and the pair doesn't rotate

#### Scenario: Touch choice
- **WHEN** a finger taps the meter button with a full meter, then taps the button on the right
- **THEN** Bomb fires and the pair doesn't rotate, in portrait and landscape

#### Scenario: Meter not full
- **WHEN** the player presses Space or taps the meter button with the meter not full
- **THEN** no choice opens and the input does nothing else

#### Scenario: Time keeps running
- **WHEN** the choice stays open
- **THEN** the match tick advances every tick, the pair keeps falling and locks as usual, and the choice closes by itself after the configured time

#### Scenario: Pause closes it
- **WHEN** the match pauses with the choice open
- **THEN** the choice is closed on resume and nothing has fired

#### Scenario: Drag during the choice
- **WHEN** one finger is dragging when the choice opens
- **THEN** the pair stops following it until the choice closes

#### Scenario: Replay
- **WHEN** a match that fired the meter by choice is recorded and played back
- **THEN** its final state hash equals the match's

### Requirement: Meter display
Each board SHALL show its meter's fill, in portrait and landscape and in both input modes, matching the engine's meter in the next drawn frame. A full meter SHALL look different from one that isn't full. In touch mode the meter button SHALL show whether the meter is full. While the choice is open, a panel SHALL name the options, and the Bomb target SHALL be outlined on the player's board. While the meter art is missing, placeholders of the declared sizes SHALL stand in.

#### Scenario: Filling
- **WHEN** the player's splat fills the meter
- **THEN** the player's meter shows the new fill in the next drawn frame

#### Scenario: Rival meter
- **WHEN** the rival fires its meter in a Ladder match
- **THEN** the rival's meter shows empty in the next drawn frame

#### Scenario: Target outline
- **WHEN** the choice is open and the player moves the pair
- **THEN** the outlined 3×3 area follows the pivot's column and matches where the Bomb would go off

### Requirement: Sparring rival meter use
The sparring rival SHALL fire the meter by fixed rules from its board alone: Rinse when its pending gunk reaches a configured amount, and otherwise Bomb when its highest filled cell is within a configured number of rows of the top. Its meter use SHALL count toward its pace, and SHALL be reproducible.

#### Scenario: Gunk pending
- **WHEN** the sparring rival's meter is full and its pending gunk reaches the configured amount
- **THEN** it fires Rinse

#### Scenario: High stack
- **WHEN** its meter is full, little gunk is pending, and its stack nears the top
- **THEN** it fires Bomb

#### Scenario: Reproducible
- **WHEN** the sparring rival plays the same match state twice
- **THEN** it fires the meter on the same ticks
