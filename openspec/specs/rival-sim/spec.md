# rival-sim Specification

## Purpose
Defines `npm run sim`, the headless bot-vs-bot simulator used to check rival strength, style and variety, measure the bots' cost per tick and gather balance numbers.

## Requirements

### Requirement: Headless bot matches
`npm run sim` SHALL play versus matches between bots in Node, without a browser. It SHALL use the same engine and the same bot code the game uses, with each rival's variety on and its bot seed taken from the match seed as in the game, on a fixed list of seeds, so the same code and options always give the same results. A match that reaches a configured tick limit SHALL stop and be counted as cut off.

#### Scenario: Same report twice
- **WHEN** `npm run sim` runs twice with the same options on the same code
- **THEN** every reported result except the timings is identical

#### Scenario: Endless stalemate
- **WHEN** a match reaches the tick limit with neither board topped out
- **THEN** it stops and is counted as cut off, not as a win, loss or draw

### Requirement: Pairings
By default the sim SHALL play `rival1` against the sparring rival and each rival from `rival2` to `rival5` against the rival below it. Each board SHALL get each bot an equal number of times, so neither bot always gets the player's side. Options SHALL choose the number of matches per pairing, which rivals take part and the first seed.

#### Scenario: Default run
- **WHEN** a developer runs `npm run sim`
- **THEN** it plays 100 matches in each of the five default pairings

#### Scenario: Chosen rivals
- **WHEN** a developer runs `npm run sim -- --rivals 3,4 --matches 40`
- **THEN** it plays 40 matches of `rival4` against `rival3` and nothing else

### Requirement: Report
For each pairing, the sim SHALL report:
- win, loss, draw and cut-off rates
- average and median match length in seconds of play
- longest chain and average longest chain
- average score and score spread
- attacks sent, average gunk per attack, stain matches per splat, Rinses and Bombs
- each bot's most work units in one tick, and its p99.9 and worst milliseconds per tick, as information only

#### Scenario: Report printed
- **WHEN** a sim run finishes
- **THEN** a table with every listed value for every pairing is printed

### Requirement: Pass checks
The sim SHALL check that every rival from `rival2` to `rival5` wins at least 60% of its matches against the rival below it, and that `rival1` wins more than half of its matches against the sparring rival. With `--quick`, it SHALL play 20 matches per pairing and check only that each rival wins more than half of its matches against the one below. The sim SHALL exit non-zero and name each failing check when a check fails, and SHALL skip checks for pairings it didn't play.

#### Scenario: Strength order broken
- **WHEN** a change makes `rival3` win fewer than 60% of its matches against `rival2`
- **THEN** `npm run sim` exits non-zero naming that pairing

#### Scenario: Quick run
- **WHEN** a developer runs `npm run sim -- --quick`
- **THEN** it plays 20 matches per default pairing, checks the order only, and exits zero when the order holds

### Requirement: Parallel and bounded
The sim SHALL spread matches across worker threads, and the results SHALL NOT depend on how many workers ran. The quick run SHALL finish in under two minutes on the CI machine.

#### Scenario: Worker count
- **WHEN** the sim runs with one worker and with four
- **THEN** both reports are identical except for the timings

### Requirement: Variety run
`npm run sim -- --variety` SHALL, for each rival taking part, play 200 matches on one piece seed against one fixed opponent, changing only the rival's bot seed. The opponent SHALL be the rival below it with its variety off and a fixed bot seed, or the sparring rival for `rival1`. The rival SHALL play the rival's board. The run SHALL also play the same matches with the rival's variety off, as its baseline. Options SHALL choose the number of matches, which rivals take part and the piece seed.

#### Scenario: Default variety run
- **WHEN** a developer runs `npm run sim -- --variety`
- **THEN** each of the five rivals plays 200 varied matches and 200 baseline matches on piece seed 1

#### Scenario: Same pieces
- **WHEN** two matches of one rival's variety run are compared
- **THEN** both boards got the same pairs in the same order

### Requirement: Variety report
For each rival, the variety run SHALL report:
- the share of matches with a distinct opening, where an opening is the sequence of the rival's first 8 placements and a placement is the cells and colors of its locked pair
- the opening overlap: over every pair of matches, the average share of the first 8 pairs placed identically
- its win rate, with variety and in the baseline
- its average score, and the opponent's average score, standard deviation and points per minute of play, with variety and in the baseline
- each starting plan's share of matches and win rate, and the average plan switches per match, as information

#### Scenario: Report printed
- **WHEN** a variety run finishes
- **THEN** a table with every listed value for every rival is printed

### Requirement: Variety checks
The variety run SHALL check, for each rival:
- at least 95% of its matches have a distinct opening
- its opening overlap is below 50%
- its win rate is within 10 percentage points of its baseline win rate
- the opponent's points per minute of play are within 15% of the baseline's, and the standard deviation of the opponent's score is at most 1.25 times the baseline's. Points per minute, not the average total, because a rival that survives longer lets the opponent bank more points at the same rate, and the strength band already covers how long a rival survives

It SHALL exit non-zero and name each failing check and rival when a check fails.

#### Scenario: Repetitive rival
- **WHEN** a change makes a rival play the same opening in more than 5% of its variety matches
- **THEN** `npm run sim -- --variety` exits non-zero naming that rival and the distinct-opening check

#### Scenario: Variety costs strength
- **WHEN** a rival's win rate with variety is more than 10 points below its baseline's
- **THEN** the run exits non-zero naming that rival and the strength check

### Requirement: Quick variety run
`npm run sim -- --variety --quick` SHALL play the same matches as the variety run but stop each one after the rival's 8th placement, skip the baseline, and check only the distinct-opening and opening-overlap targets. It SHALL finish in under two minutes on the CI machine.

#### Scenario: Quick variety
- **WHEN** a developer runs `npm run sim -- --variety --quick`
- **THEN** it reports the two opening metrics for every rival, checks only those, and exits zero when they hold
