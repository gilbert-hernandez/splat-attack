import { createState, step } from './engine.js';

// A versus match: two boards from one seed, stepped together. Each board offsets its own pending
// gunk inside its step; what it sends reaches the other board only after both have stepped, so
// neither side moves first.

/** @typedef {null | 'win' | 'loss' | 'draw'} Outcome from the player's side */

/**
 * @typedef {object} Versus
 * @property {number} tick
 * @property {Outcome} outcome
 * @property {import('./engine.js').State[]} boards [player, rival]
 */

/**
 * @param {number} seed unsigned 32-bit integer
 * @returns {Versus}
 */
export function createVersus(seed) {
  return { tick: 0, outcome: null, boards: [createState(seed, 0), createState(seed, 1)] };
}

/**
 * Advances both boards one tick, in place, then delivers their attacks and checks for the end.
 * @param {Versus} match
 * @param {number} [playerInput]
 * @param {number} [rivalInput]
 * @returns {import('./engine.js').Event[][]} [player events, rival events]
 */
export function stepVersus(match, playerInput = 0, rivalInput = 0) {
  if (match.outcome !== null) return [[], []];
  match.tick++;
  const [player, rival] = match.boards;
  const events = [step(player, playerInput), step(rival, rivalInput)];
  rival.pending += sentBy(events[0]);
  player.pending += sentBy(events[1]);
  settleOutcome(match);
  return events;
}

function sentBy(events) {
  let sent = 0;
  for (const event of events) if (event.type === 'attack') sent += event.sent;
  return sent;
}

/** Sets the outcome once a board is over. Exported for debug tools. */
export function settleOutcome(match) {
  const [player, rival] = match.boards.map((board) => board.phase === 'over');
  if (player && rival) match.outcome = 'draw';
  else if (player) match.outcome = 'loss';
  else if (rival) match.outcome = 'win';
}

/**
 * Ends a board at once, as if it had topped out, and settles the outcome. For debug tools only.
 * @param {Versus} match
 * @param {number} side 0 = player, 1 = rival
 */
export function forceTopOut(match, side) {
  if (match.outcome !== null) return;
  Object.assign(match.boards[side], { phase: 'over', pair: null, wait: 0 });
  settleOutcome(match);
}
