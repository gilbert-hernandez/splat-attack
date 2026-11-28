import { RULES } from '../config/rules.js';
import { INPUT } from '../core/engine.js';
import { COLUMNS } from '../core/grid.js';
import {
  FATAL,
  bombed,
  placements,
  probeSteps,
  probes,
  rateArea,
  rateChainSetup,
  rateMove,
  rateShape,
  simulate,
  spawnPair,
  steer,
} from './evaluate.js';

// A rival's plan for one pair: a beam search over the falling pair and the visible next pairs, run
// a few work units at a time. A work unit is about one chain step's work: a simulated placement (plus
// one per chain step it sets off past the first), a search for where a pair can go, or one step of a
// chain-setup probe (chain setup is probed on every board). The job is a generator that yields after each unit, so
// it can stop at any budget and carry on next tick with exactly the same results.

/**
 * A first move: where the falling pair goes, and the meter fired on the way.
 * @typedef {object} Move
 * @property {number} col
 * @property {number} orientation
 * @property {number} meter 0, INPUT.RINSE or INPUT.BOMB
 * @property {number} bombCol the pivot column a Bomb is fired from (-1 without one)
 */

/**
 * @typedef {object} Root a first move and how good the best plan through it looks
 * @property {Move} move
 * @property {number} index generation order, for ties
 * @property {number} depth the deepest depth it has a scored plan at
 * @property {number} score
 */

/**
 * A profile to plan with: a rival's, or one adapted for a pair, with a persona's preferences.
 * @typedef {Omit<(typeof import('../config/rivals.js').RIVALS)[number], 'weights'> &
 *   {weights: Record<string, number>, prefs?: import('./evaluate.js').Prefs}} PlanProfile
 */

/**
 * @typedef {object} Job
 * @property {PlanProfile} profile what this pair is planned with
 * @property {boolean} searched the search is finished, so the move can be picked
 * @property {Root[]} roots
 * @property {Root | null} best the best first move so far
 * @property {boolean} done
 * @property {number} units spent so far
 * @property {Generator<undefined, void, undefined>} work
 */

/**
 * Starts a plan from a snapshot of a falling board. A rival with variety passes `after`, work to do
 * with the units left once the search is done (it reads the boards for its next pair); the job is
 * `searched` when the move can be picked and `done` when the extra work is finished too.
 * @param {import('./view.js').Seen} seen
 * @param {PlanProfile} profile
 * @param {((seen: import('./view.js').Seen) => Generator<undefined, void, undefined>) | null} [after]
 * @returns {Job}
 */
export function startPlan(seen, profile, after = null) {
  /** @type {Job} */
  const job = { profile, roots: [], best: null, searched: false, done: false, units: 0, work: null };
  job.work = searchThen(job, seen, profile, after);
  return job;
}

/** The search, then any extra work. */
function* searchThen(job, seen, profile, after) {
  yield* search(job, seen, profile);
  job.searched = true;
  if (after) yield* after(seen);
}

/**
 * Spends up to `units` work units on a plan.
 * @param {Job} job
 * @param {number} units
 * @returns {number} the units spent
 */
export function stepPlan(job, units) {
  let spent = 0;
  while (spent < units && !job.done) {
    if (job.work.next().done) job.done = true;
    else spent++;
  }
  job.units += spent;
  return spent;
}

/** The job's first moves, best first: deeper plans before shallower, then by score, then by order. */
export function ranked(job) {
  return [...job.roots].sort((a, b) => b.depth - a.depth || b.score - a.score || a.index - b.index);
}

/**
 * The move at a rank among the job's moves that don't top out (or the best one if all do). With a
 * margin, every move rated within it of the best (at the best's depth) shares rank 0, and `tie`
 * chooses among them; rank 1 is then the best move outside the margin.
 * @param {Job} job
 * @param {number} rank
 * @param {number} [margin]
 * @param {number} [tie] any non-negative integer
 * @returns {Move | null}
 */
export function pick(job, rank, margin = 0, tie = 0) {
  const order = ranked(job);
  const alive = order.filter((root) => root.score > FATAL);
  const list = alive.length > 0 ? alive : order;
  if (list.length === 0) return null;
  if (margin <= 0) return list[Math.min(rank, list.length - 1)].move;
  const top = list[0];
  let tied = 1;
  while (tied < list.length && list[tied].depth === top.depth && list[tied].score >= top.score - margin) tied++;
  if (rank === 0) return list[tie % tied].move;
  return list[Math.min(tied - 1 + rank, list.length - 1)].move;
}

/** Moves the best-so-far pointer if this root now ranks first. */
function consider(job, root) {
  const best = job.best;
  if (
    best === null ||
    root.depth > best.depth ||
    (root.depth === best.depth && (root.score > best.score || (root.score === best.score && root.index < best.index)))
  ) {
    job.best = root;
  }
}

/** Records a scored plan at a depth for its first move. */
function score(job, root, depth, value) {
  if (depth > root.depth || (depth === root.depth && value > root.score)) {
    root.depth = depth;
    root.score = value;
  }
  // A root's score can only rise at its depth, but best may be another root: recheck all at the top.
  if (job.best === root) {
    job.best = null;
    for (const r of job.roots) consider(job, r);
  } else {
    consider(job, root);
  }
}

/**
 * The search itself.
 * @param {Job} job
 * @param {import('./view.js').Seen} seen
 * @param {PlanProfile} profile
 */
function* search(job, seen, profile) {
  const { lookahead, beam } = profile;
  const upcoming = seen.queue.slice(0, Math.max(0, lookahead - 1));
  const depthMax = 1 + upcoming.length;

  // Depth 1: the falling pair where it is, after any meter move.
  /** @type {{board: {grid: number[], stains: number[]}, pending: number, pair: any, move: Omit<Move, 'col' | 'orientation'>, bias: number}[]} */
  const starts = [{ board: seen, pending: seen.pending, pair: seen.pair, move: { meter: 0, bombCol: -1 }, bias: 0 }];
  if (seen.meter === RULES.meter.max && !seen.armed) {
    if (seen.pending > 0) {
      starts.push({
        board: seen,
        pending: 0,
        pair: seen.pair,
        move: { meter: INPUT.RINSE, bombCol: -1 },
        bias: profile.meter.rinseBias,
      });
    }
    for (let col = 0; col < COLUMNS; col++) {
      const aimed = steer(seen.grid, seen.pair, col, seen.pair.orientation);
      if (!aimed) continue;
      starts.push({
        board: bombed(seen, aimed),
        pending: seen.pending,
        pair: aimed,
        move: { meter: INPUT.BOMB, bombCol: col },
        bias: profile.meter.bombBias,
      });
    }
  }

  /** @type {{board: {grid: number[], stains: number[]}, pending: number, value: number, score: number, root: Root}[]} */
  let frontier = [];
  for (const [i, start] of starts.entries()) {
    const options = placements(start.board.grid, start.pair);
    // The first search shares a unit with the first placement, so a best move exists after one unit.
    if (i > 0) yield;
    for (const { col, orientation, pair } of options) {
      const root = { move: { col, orientation, ...start.move }, index: job.roots.length, depth: 0, score: FATAL };
      job.roots.push(root);
      frontier.push(yield* expand(job, 1, start.board, start.pending, pair, start.bias, root, profile));
      yield;
    }
  }

  for (let depth = 2; depth <= depthMax; depth++) {
    const parents = best(frontier, beam);
    frontier = [];
    for (const parent of parents) {
      const pair = spawnPair(upcoming[depth - 2]);
      const options = placements(parent.board.grid, pair);
      yield;
      for (const option of options) {
        frontier.push(
          yield* expand(job, depth, parent.board, parent.pending, option.pair, parent.value, parent.root, profile),
        );
        yield;
      }
    }
  }
}

/**
 * Plays a placement on a parent board and scores the child node for its first move: the placement's
 * immediate value added to its parent's, plus the board's shape and chain setup. The chain-setup
 * probes cost a unit each.
 */
function* expand(job, depth, board, pending, pair, base, root, { weights, fire, prefs = null }) {
  const outcome = simulate(board, pair);
  const move = rateMove(outcome, pending, weights, fire);
  const nudge = depth === 1 && prefs ? rateArea(pair, prefs, weights.area) : 0;
  const value = base + move.value + nudge;
  const shape = rateShape(outcome, move.pending, weights, prefs);
  const node = { board: outcome, pending: move.pending, value, score: shape <= FATAL ? FATAL : value + shape, root };
  score(job, root, depth, node.score);
  // A chain costs a unit per step past the first.
  for (let step = 1; step < outcome.chain; step++) yield;
  if (weights.chainSetup === 0 || node.score <= FATAL) return node;
  let longest = 0;
  for (const probe of probes(outcome.grid)) longest = Math.max(longest, yield* probeSteps(outcome.grid, probe));
  node.score += rateChainSetup(longest, weights);
  score(job, root, depth, node.score);
  return node;
}

/** The best `count` nodes that don't top out, by score, keeping generation order for ties. */
function best(nodes, count) {
  return nodes
    .filter((node) => node.score > FATAL)
    .map((node, i) => ({ node, i }))
    .sort((a, b) => b.node.score - a.node.score || a.i - b.i)
    .slice(0, count)
    .map(({ node }) => node);
}
