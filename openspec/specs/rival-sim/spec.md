# rival-sim Specification

## Purpose
Defines `npm run sim`, the headless bot-vs-bot simulator used to check rival strength and style, measure the bots' cost per tick and gather balance numbers.

## Requirements

### Requirement: Headless bot matches
`npm run sim` SHALL play versus matches between bots in Node, without a browser. It SHALL use the same engine and the same bot code the game uses, on a fixed list of seeds, so the same code and options always give the same results. A match that reaches a configured tick limit SHALL stop and be counted as cut off.

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
