# cpu-rivals Specification

## Purpose
Defines the five CPU rivals that play the rival's board in Ladder: how they choose moves, how each match's persona varies their play and how they adapt during a match, what they may see, how fast they think and act, how they stay reproducible, and the order in which Ladder meets them.

## Requirements

### Requirement: Five rival profiles
There SHALL be five CPU rivals, `rival1` to `rival5`, each with a style name and a profile in configuration. A profile SHALL set its pace, its lookahead in visible pairs, its work budget per tick, its evaluation weights, how often it settles for a weaker move, its meter habits, the ranges its per-match persona is drawn from, how likely it is to start with each plan, and how strongly it adapts during a match. No rival SHALL have a scripted move list.

#### Scenario: Distinct styles
- **WHEN** each rival, with its variety on, plays the same 20 seeded matches against the sparring rival
- **THEN** the rivals differ in a way the sim reports. The Rusher sends gunk in more, smaller attacks than the Builder, the Builder's average longest chain is longer than the Rusher's, and the Painter makes more stain matches per splat than the Rookie

#### Scenario: Lookahead limit
- **WHEN** a profile's lookahead is larger than the number of preview pairs
- **THEN** loading the profiles fails with an error naming the rival

#### Scenario: Persona range out of bounds
- **WHEN** a profile's persona range is empty, or its plan weights don't add up to 100
- **THEN** loading the profiles fails with an error naming the rival

### Requirement: Board evaluation and lookahead
A rival SHALL choose each move by trying placements of its falling pair and of up to its lookahead in preview pairs, and simulating each with the game's own gravity, splat, stain and gunk rules. It SHALL rate each result with its current weights: its profile's, as shifted by its persona and its adaptation. While its meter is full, it SHALL also rate firing Rinse and firing Bomb from each column it could aim at. It SHALL then make a seeded weighted choice among its highest-rated moves, treating every move rated within its profile's margin of the best move as equally good while its board is open (holds at most a set number of cells), and steer the pair there with per-tick inputs. It SHALL never choose a move that tops out while another move doesn't.

#### Scenario: Takes a splat
- **WHEN** a rival with lookahead 1 has a board where one placement splats four blobs and no other placement splats
- **THEN** it places the pair to make that splat, unless its settle-for-weaker roll picks another move

#### Scenario: Looks ahead
- **WHEN** a rival with lookahead 2 has a board where the best two-pair sequence needs the first pair placed somewhere that scores nothing by itself
- **THEN** it places the first pair there, and a lookahead-1 rival given the same board doesn't

#### Scenario: No free choice on a crowded board
- **WHEN** a rival's board holds more cells than its profile's open-board limit
- **THEN** it chooses by its rank weights alone, as without a margin

#### Scenario: Near-ties vary
- **WHEN** a rival's best moves on an open board are rated within its margin of each other, and it plays that board with many bot seeds
- **THEN** it plays more than one of those moves, and never a move rated below the margin more often than its rank weights allow

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
A rival's random choices SHALL come only from a stream seeded from its bot seed and its id. It SHALL use no clock and no outside randomness. In the game, the bot seed SHALL be the match seed, which is fresh for every match, so the same match seed and the same player inputs give the same rival inputs in Node and in browsers, and a replay needs only the seed and the inputs. Tools MAY give a rival a bot seed different from the match seed, to vary the rival while keeping the same pieces.

#### Scenario: Same match twice
- **WHEN** the same rival plays the same seed against the same player inputs twice
- **THEN** every tick's rival input is the same both times

#### Scenario: Different rivals, same seed
- **WHEN** two different rivals play the same seed against the same player inputs
- **THEN** their inputs differ

#### Scenario: Same pieces, different bot seed
- **WHEN** a rival plays two matches with the same match seed and the same player inputs but different bot seeds
- **THEN** the pieces are the same in both, and the rival's inputs differ

### Requirement: Work budget per tick
A rival's planning, including reading the player's board to adapt, SHALL be split into steps that cost work units, and in one tick a rival SHALL spend no more than its profile's budget. If its pair is grounded before planning is done, it SHALL play the best move found so far. The unit budget SHALL be the guarantee on per-tick work; tick times depend on the machine and its load, so the sim reports them as information and doesn't check them. The budgets SHALL be confirmed by play on the Android phone against the strongest rival without stutter.

#### Scenario: Budget held
- **WHEN** any rival plays a whole match with its variety on
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

### Requirement: Persona per match
At the start of each match, a rival SHALL draw a persona from its own seeded stream, inside the ranges its profile sets. The persona SHALL set the plan the rival starts with (build, rush or paint), its risk (how high it lets its stack get and how long a chain it holds out for), its patience (how long it waits in place before soft-dropping), one or two preferred colors, and a preferred area of the board (left, center or right). The persona SHALL stay the same for the whole match; only adaptation and plan switches change how it plays after that.

#### Scenario: Persona from the bot seed
- **WHEN** a rival is created twice with the same bot seed
- **THEN** both get the same persona

#### Scenario: Personas differ
- **WHEN** a rival is created with 200 different bot seeds
- **THEN** every plan its profile allows appears, more than one area and more than one preferred color appear, and every persona value lies inside the profile's ranges

#### Scenario: Persona shows in play
- **WHEN** two rivals of the same profile with personas preferring opposite areas play the same open board
- **THEN** the one preferring the left places more blobs in the left half over its first 8 pairs than the one preferring the right

### Requirement: Mid-match adaptation
A rival SHALL plan each pair with weights adjusted to its last complete reading of both boards. It SHALL take each reading with the work units left over once a pair's plan is done, so reading never delays a move, and SHALL keep the previous reading when a pair locks before the reading is done. It SHALL react to the player's threat (the longest chain one more blob could set off on the player's board, and the player's stack height), to how many of the player's blobs sit on matching stains, to whether the player's meter is full, to the score gap, and to its own pending gunk. How much it reacts SHALL be set by its profile. Adaptation SHALL use only what a player could see.

#### Scenario: Reading never delays a move
- **WHEN** a rival starts planning a pair
- **THEN** its first work unit goes to the search, and it reads the boards only after the search is done

#### Scenario: Under threat
- **WHEN** the player's board has a chain of 4 or more ready to set off and the rival has a smaller chain ready
- **THEN** the rival values firing its smaller chain more than it does when the player's board has no chain ready

#### Scenario: Player meter full
- **WHEN** the player's meter is full and the player has no pending gunk
- **THEN** the rival values sending gunk less, and building more, than when the player's meter is empty

#### Scenario: Behind on score
- **WHEN** the rival is far behind on score
- **THEN** it holds out for a longer chain than it does when the scores are level

#### Scenario: Gunk incoming
- **WHEN** the rival has a lot of pending gunk
- **THEN** it values cancelling more, and fires shorter chains, than with no pending gunk

### Requirement: Dropping failed plans
A rival SHALL notice when its plan fails and switch to another plan its profile allows. A build plan SHALL fail when the longest chain the rival had set up, if it was 4 or more, shrinks by two or more steps without a chain of at least that length minus one being fired, or when its stack is too high to keep building. A paint plan SHALL fail when none of the rival's blobs has rested on a stain of its own color for a set number of pairs while its board has stains; pairs before its board has any stain don't count. A rush plan SHALL fail only when the stack is too high. After switching, the rival SHALL keep the new plan for at least a set number of pairs. A rival SHALL NOT switch plans without one of these failures.

#### Scenario: Buried chain
- **WHEN** a rival on a build plan has a chain of 4 set up, and gunk lands on it so that only a chain of 2 or less remains
- **THEN** the rival's next pair is planned with a different plan

#### Scenario: Plan holds
- **WHEN** a rival's plan has not failed
- **THEN** it keeps the same plan

### Requirement: Recognizable style
Variety SHALL NOT erase a rival's style. Each profile SHALL make its signature plan the most likely starting plan, and the style differences in the "Distinct styles" scenario SHALL hold with variety on.

#### Scenario: Signature plan most common
- **WHEN** a rival is created with 200 different bot seeds
- **THEN** its signature plan (the Builder's build, the Rusher's rush, the Painter's paint) is the most common starting plan

### Requirement: Variety held in a strength band
Every match SHALL play differently while the rival's strength stays in a band, as the rival sim's variety checks define. Variety SHALL NOT turn a rival's choice into random weak moves.

#### Scenario: Variety checks pass
- **WHEN** `npm run sim -- --variety` runs with its default options
- **THEN** every variety check holds for every rival
