# Design

## Context

SA-1 and SA-2 left scenes, config and checks but no game rules. Later tickets need the engine to give identical results in browsers and Node, and to be cheap to copy for bots.

## Goals / Non-Goals

**Goals:** deterministic, easy to test, plain serializable state, and room for SA-4 to add splats between lock and spawn.

**Non-Goals:** feel tuning beyond reasonable starting values; that comes once it's visible in SA-5.

## Decisions

- **State is plain JSON data.** `createState(seed)` makes it and `step(state, input)` advances it one tick in place. Bots and replays can copy or hash it. *Alternative:* a class; harder to copy and compare.
- **Input is a bitmask per tick:** left, right, rotate CW, rotate CCW, soft drop. Opposites cancel. Move and rotate bits act once per tick in which they're set, so key repeat belongs to the input layer (SA-5), and a replay is a list of integers.
- **Cells:** row 0 is the top hidden row; visible rows are 2–13. Cell values are 0 (empty) and 1–5 (colors, in manifest order). A test checks that the color count matches the manifest.
- **RNG:** mulberry32 (one uint32, `Math.imul`), with rejection sampling so colors are unbiased. Pieces have their own stream, so nothing else can change a seed's pieces.
- **Falling:** the pair has a whole row plus fall progress in 1/256 row units. Collision uses whole rows. Progress is kept while grounded, so sliding on and off a bump doesn't slow the fall.
- **Spawn:** pivot in the center column (3), top visible row (2), other half above it. The loss cell is therefore on screen.
- **Tick order:** move, rotate, fall, then lock check. While settling, input is ignored.
- **Rotation, first that fits:** in place; one cell away from the blocked side; for a half pointing down, one row up (floor kick). If turning sideways is blocked on both sides, the pair flips vertically, with a floor kick if needed. If nothing fits, nothing changes.
- **Lock delay is a budget per pair:** 30 grounded ticks that never refill, and each floor kick spends 8. So stalling is bounded. *Alternative:* reset the delay on each move, as many games do; rejected because it lets a player stall forever. Soft drop on the ground locks at once.
- **Starting values** (`src/config/rules.js`): fall 8/256 row per tick (about 1.9 rows/s), soft drop 128/256 (30 rows/s), settle 12 ticks.
- **Settling** puts blobs in their final cells immediately and waits out the settle time. SA-4 replaces the wait with its splat loop.
- **`src/config/rules.js` must stay pure too.** Core imports it directly, not `config/index.js`, which pulls in `import.meta.env`. `board.js` takes its columns and rows from it, so size has one source.
- **Purity by lint:** the core and AI folders allow imports only from core, AI and `rules.js`; `Math` only for `abs`, `floor`, `imul`, `max`, `min`; integer literals only; and no `Date`, `performance`, timers or browser globals. A test runs ESLint on bad snippets, so a broken rule is noticed.
- **Fixtures:** lines of `.` and color letters (first letter; falling halves in uppercase), bottom-aligned so small boards stay short. The falling pair is set separately because its pivot can't be read from letters.

## Risks / Trade-offs

- [Whole-row collision can look like a small snap when sliding beside a stack] → the view eases it in SA-5; rules don't change.
- [Lint can't catch every impurity, such as division] → results stay integers through `Math.floor`, and a test checks that all state numbers are integers over long random runs.
- [Starting speeds may feel wrong] → they're config values, tuned from SA-5 on.
