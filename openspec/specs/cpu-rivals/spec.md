# cpu-rivals Specification

## Purpose
Defines the five CPU rivals that play the rival's board in Ladder: how they choose moves, what they may see, how fast they think and act, how they stay reproducible, and the order in which Ladder meets them.

## Requirements

### Requirement: Five rival profiles
There SHALL be five CPU rivals, `rival1` to `rival5`, each with a style name and a profile in configuration. A profile SHALL set its pace, its lookahead in visible pairs, its work budget per tick, its evaluation weights, how often it settles for a weaker move, and its meter habits. No rival SHALL have a scripted move list.

#### Scenario: Distinct styles
- **WHEN** each rival plays the same 20 seeded matches against the sparring rival
- **THEN** the rivals differ in a way the sim reports. The Rusher sends gunk in more, smaller attacks than the Builder, the Builder's average longest chain is longer than the Rusher's, and the Painter makes more stain matches per splat than the Rookie

#### Scenario: Lookahead limit
- **WHEN** a profile's lookahead is larger than the number of preview pairs
- **THEN** loading the profiles fails with an error naming the rival

### Requirement: Board evaluation and lookahead
A rival SHALL choose each move by trying placements of its falling pair and of up to its lookahead in preview pairs, and simulating each with the game's own gravity, splat, stain and gunk rules. It SHALL rate each result with its profile's weights. While its meter is full, it SHALL also rate firing Rinse and firing Bomb from each column it could aim at. It SHALL then make a seeded weighted choice among its highest-rated moves and steer the pair there with per-tick inputs.

#### Scenario: Takes a splat
- **WHEN** a rival with lookahead 1 has a board where one placement splats four blobs and no other placement splats
- **THEN** it places the pair to make that splat, unless its settle-for-weaker roll picks another move

#### Scenario: Looks ahead
- **WHEN** a rival with lookahead 2 has a board where the best two-pair sequence needs the first pair placed somewhere that scores nothing by itself
- **THEN** it places the first pair there, and a lookahead-1 rival given the same board doesn't

#### Scenario: Uses the meter
- **WHEN** a rival's meter is full and its pending gunk would bring its stack to the spawn row
- **THEN** it fires Rinse within its pace

#### Scenario: Aims a Bomb
- **WHEN** a rival chooses Bomb
- **THEN** the pair is moved to the column it chose before Bomb fires, and the Bomb goes off where the rival planned

### Requirement: Same input as a player
A rival SHALL play only by giving one input mask per tick, through the same input bits a player uses. It SHALL NOT change any board, the match or the random streams.

#### Scenario: Read-only
- **WHEN** a rival chooses its input for a tick
- **THEN** both boards and the match are unchanged until the tick steps

### Requirement: No hidden information
A rival SHALL choose moves only from what a player could see: both grids and stains, its falling pair, the preview pairs, both boards' pending gunk, meters and scores, and the match tick. It SHALL NOT use the piece stream, the gunk stream or any pair beyond the preview.

#### Scenario: Unseen pieces changed
- **WHEN** two matches have identical visible state but different pairs after the preview, or a different gunk stream
- **THEN** the rival gives the same inputs in both until the hidden difference becomes visible

### Requirement: Reproducible rivals
A rival's random choices SHALL come only from a stream seeded from the match seed and the rival's id. It SHALL use no clock and no outside randomness, so the same match seed and the same player inputs give the same rival inputs in Node and in browsers.

#### Scenario: Same match twice
- **WHEN** the same rival plays the same seed against the same player inputs twice
- **THEN** every tick's rival input is the same both times

#### Scenario: Different rivals, same seed
- **WHEN** two different rivals play the same seed against the same player inputs
- **THEN** their inputs differ

### Requirement: Work budget per tick
A rival's planning SHALL be split into steps that cost work units, and in one tick a rival SHALL spend no more than its profile's budget. If its pair is grounded before planning is done, it SHALL play the best move found so far. The unit budget SHALL be the guarantee on per-tick work; tick times depend on the machine and its load, so the sim reports them as information and doesn't check them. The budgets SHALL be confirmed by play on the Android phone against the strongest rival without stutter.

#### Scenario: Budget held
- **WHEN** any rival plays a whole match
- **THEN** no tick spends more work units than its budget

#### Scenario: Planning not done in time
- **WHEN** a pair lands before the rival has finished planning
- **THEN** the rival places it at the best move found so far, and the match continues normally

### Requirement: Rival pace
A rival SHALL move or rotate at most once per its profile's action interval, and SHALL soft-drop only once the pair is in place and its profile's drop delay has passed. A meter fire SHALL count as an action.

#### Scenario: Paced
- **WHEN** a rival plays a pair
- **THEN** its moves and rotations are at least its action interval apart, and it soft-drops only after its drop delay with the pair in place

### Requirement: Rising strength
Rivals SHALL get stronger from `rival1` to `rival5`, as the rival sim's pass checks define.

#### Scenario: Neighbor beats neighbor
- **WHEN** `npm run sim` runs with its default match count
- **THEN** every pass check holds

### Requirement: Ladder rival climb
Choosing Ladder SHALL start against `rival1`. After a win, the next Ladder match SHALL be against the next rival, and after `rival5` against `rival1` again. After a loss or draw, the next match SHALL be against the same rival. Returning to the title SHALL reset the climb to `rival1`. The rival's board SHALL be played by that rival.

#### Scenario: Win moves up
- **WHEN** the player wins a Ladder match against `rival2` and plays again
- **THEN** the next match is against `rival3`

#### Scenario: Wrap around
- **WHEN** the player beats `rival5` and plays again
- **THEN** the next match is against `rival1`

#### Scenario: Loss repeats
- **WHEN** the player loses against `rival3` and plays again
- **THEN** the next match is against `rival3`

#### Scenario: Back to the title
- **WHEN** the player returns to the title from a result or from Pause and chooses Ladder
- **THEN** the match is against `rival1`

### Requirement: Rival label
During a Ladder match, a label next to the rival's board SHALL show the rival's number and style name, in portrait and landscape and in both input modes.

#### Scenario: Shown
- **WHEN** a Ladder match against `rival4` is running
- **THEN** the label names rival 4 and its style name
