# Proposal

## Why

Vikunja: **SA-11**. Target version: **0.1.9**. SA-10 gave the five rivals distinct styles and a strength order, but their only variety is the weighted pick among their best moves. The stronger a rival is, the more it repeats itself. Measured on the SA-10 code with the same pieces (100 bot seeds per rival against a fixed opponent):

| Rival | Distinct 8-move openings | Opening overlap (first 8 pairs) |
|---|---|---|
| 1 ROOKIE | 97% | 11% |
| 2 RUSHER | 78% | 20% |
| 3 PAINTER | 68% | 29% |
| 4 BUILDER | 31% | 49% |
| 5 ACE | 20% | 65% |

The ACE plays the same opening four times in five. It also ignores the player: it never reacts to a threat, the score gap or the player's meter, and it holds a chain plan after gunk has buried it. The game is about chasing scores against rivals, so a rival has to play differently every match, adapt during the match, and stay just as strong. SA-12 (Ladder scoring and run records) builds on the rivals as they leave this ticket.

## What Changes

- **A persona per match.** When a rival is created, it draws a persona from its own seeded stream. The draw stays inside ranges set by the rival's profile, so each rival keeps its style. The persona sets five things:
  - **Plan:** the strategy it starts with: *build* (hold for a big chain), *rush* (fire early and often) or *paint* (splat on stains). Each profile weights the draw, so the BUILDER usually builds and the RUSHER usually rushes, but not always.
  - **Risk:** how high it lets its stack get, and how long a chain it holds out for.
  - **Patience:** how long it waits before soft-dropping a pair that's in place.
  - **Preferred colors:** one or two colors whose groups it values a little more.
  - **Area:** the side of the board it likes to place its pairs on (left, center or right), while the lower half there is open.
- **Near-ties are a free choice.** Moves rated within a small margin of the best one count as equally good, and the rival draws among them. On an open board many placements are almost equal, so the strong rivals vary most where it costs least. The existing rank weights still apply below that.
- **Adapts during the match.** Once a pair's plan is done, the rival uses its spare work units to read the visible boards, and plans its next pair with weights adjusted to that reading (so reading never delays a move):
  - **Player threat:** the longest chain one more blob could set off on the player's board, and the player's stack height. A big threat makes it fire smaller chains sooner and keep its stack lower.
  - **Player stains:** how much of the player's board sits on matching stains. More means bigger attacks are coming, which counts as a threat too.
  - **Player meter:** while the player's meter is full, a Rinse could wipe out an attack, so attacking is worth less and building is worth more.
  - **Score gap:** behind by a lot, it takes more risk; well ahead, it plays safer.
  - **Incoming gunk:** the more gunk is pending, the more it values cancelling and the sooner it fires.
- **Drops plans that fail.** A *build* plan fails when the chain it was building shrinks by two or more steps without being fired (gunk landing on it, for example), or when the stack gets too high to keep building. A *paint* plan fails when none of its blobs has rested on a matching stain for several pairs. A *rush* plan fails only when the stack gets too high. A failed plan switches to another plan the profile allows, and it stays switched for a set number of pairs.
- **Still fair and reproducible.** The persona, the plan and the adaptation use only what a player can see. Adaptation reads the player's board through the same snapshot, and reading it costs work units inside the rival's per-tick budget. The rival's random stream gets a separate **bot seed**. In the game, the bot seed comes from the match seed, which is fresh every match, so a replay still needs only the seed and the inputs. The sim can change the bot seed alone and keep the same pieces.
- **`npm run sim -- --variety`.** For each rival, it plays 200 matches with the same pieces (one piece seed) against the same fixed opponent: the rival below it with its variety turned off, or the sparring rival for rival 1. Only the bot seed changes. It plays the same 200 matches again with the rival's variety turned off as a baseline. **Pass, per rival:**
  - **Distinct openings:** at least 95% of the 200 matches have a different sequence of their first 8 placements. A placement is the cells and colors of the locked pair.
  - **Opening overlap:** across every pair of matches, the average share of the first 8 pairs placed identically is below 50%. Both targets are the plan's proposed numbers, confirmed here. Overlap is measured over the opening only, because after the boards diverge, matching placements mostly happen by chance (the SA-10 rivals already score 4–24% over 40 pairs).
  - **Strength band:** its win rate is within 10 points of the baseline's.
  - **Player-score band:** the opponent's points per minute of play are within 15% of the baseline's, and the spread (standard deviation) of its score is at most 1.25 times the baseline's. The opponent stands in for the player, so this checks that a player's score doesn't depend much on which persona they meet. (Changed from the average total during tuning, with Gilbert's OK: variety makes the BUILDER's and ACE's matches longer, so the opponent banks more points at the same rate, while the strength band already covers survival.)

  The report also shows each starting plan's win rate and how often plans switch, as information.
- **The regular sim keeps its checks with variety on.** `npm run sim` plays the rivals as the game does, so the neighbor checks (60%) now cover varied rivals.
- **CI runs a short version.** `npm run sim -- --variety --quick` checks only the two opening targets. It stops each match after the rival's 8th pair, so it is quick enough for every push, with all 200 bot seeds.

## Non-goals

- No change to the rules, the engine, the input bits or the replay format. Stored replays and hashes stay the same.
- No `rulesVersion`. It doesn't exist yet. SA-12 adds it, and its first value covers the rivals as SA-11 leaves them.
- No new rivals, no change to how the Ladder climbs, and no rebalancing of the order between rivals beyond what the strength band needs. Match length isn't a goal here: rival 1 and 2 matches can still run about six minutes, and SA-15 tunes that.
- No on-screen display of the persona or plan. A dev build can read them from `window.__GAME__`.
- No learning across matches or sessions. Nothing is stored about the player.

## Capabilities

### New Capabilities

None. Variety and adaptation are rival behavior, so they extend `cpu-rivals`. The variety run extends `rival-sim`.

### Modified Capabilities
- `cpu-rivals`: new requirements for the per-match persona, the near-tie choice, mid-match adaptation, dropping failed plans, keeping the style, and the strength band. The reproducibility requirement changes to use a bot seed that the game takes from the match seed. The board-evaluation requirement adds the near-tie choice. The work budget covers reading the player's board.
- `rival-sim`: the `--variety` run with its pairing, metrics, baseline, pass checks and `--quick` form. The regular sim plays rivals with variety on.
- `code-quality`: CI also runs the quick variety check.

## Impact

- **Changed:**
  - Bots: `src/ai/rival.js` (persona, bot seed, adaptation per pair, plan switching, a `plain` option for baselines), `src/ai/planner.js` (near-tie pick), `src/ai/evaluate.js` (color and area terms, reading the player's threat)
  - New bot module: `src/ai/persona.js` (drawing the persona and adjusting the weights)
  - Config: `src/config/rivals.js` (persona ranges, plan weights, plan overlays, adaptation strengths and the near-tie margin, all integers)
  - Sim: `scripts/simCore.js`, `scripts/simMatch.js`, `scripts/simConfig.js` and `scripts/sim.js` (the variety run and its report)
  - Tooling: `.github/workflows/ci.yml` (the quick variety step)
  - Tests: unit tests for the persona, the adaptation and the variety metrics; the style test runs with variety on
  - Docs: `README.md`, `CHANGELOG.md`, `package.json` (0.1.9)
- Scenes change only where `createRival` is called. MatchScene keeps passing the match seed, so the game takes the bot seed from it.
- Rival play changes, so any e2e test that depends on a rival's exact moves may need new expectations. The landscape fixture changes only where the rival's falling pair is at its snapshot tick (the ROOKIE's persona shifts its drop timing); every layout place stays the same.
- No new dependencies and no new asset keys.
