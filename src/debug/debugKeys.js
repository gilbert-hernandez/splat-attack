import { DEBUG, FLOW, RIVALS, RULES } from '../config/index.js';
import { spawn } from '../core/engine.js';
import { forceTopOut } from '../core/versus.js';
import { onLayout, placeText } from '../layout/manager.js';
import { BOARDS, parseBoard, parseStains } from './boards.js';

/** Debug keys for a match. Only made in dev builds; the only code that edits a match's state. */
export default class DebugKeys {
  /** @param {any} match the Match scene */
  constructor(match) {
    this.match = match;
    this.reset();
    const style = { fontFamily: FLOW.fontFamily, fontSize: '12px', color: FLOW.mutedColor, align: 'center' };
    const hint = match.add.text(0, 0, DEBUG.hint, style).setOrigin(0.5);
    // The keys need a keyboard, and in portrait the hint would sit under the touch buttons.
    onLayout(match, (layout) => placeText(hint.setVisible(layout.mode === 'keyboard'), layout.match.debugHint));
  }

  /** Call when a new match begins. */
  reset() {
    /** Color picked for the next pair's pivot, or 0. */
    this.firstColor = 0;
    this.board = 0;
  }

  /** @param {KeyboardEvent} event */
  press({ code, repeat }) {
    const action = DEBUG.keys[code];
    if (!action || (repeat && action !== 'step')) return;
    const { runner } = this.match;
    if (action.startsWith('color')) this.pickColor(Number(action.at(-1)));
    else if (action === 'board') this.loadBoard();
    else if (action === 'freeze') runner.setFrozen(!runner.frozen);
    else if (action === 'step') {
      runner.setFrozen(true);
      runner.advance(1);
    } else if (action === 'fast') runner.rate = runner.rate === 1 ? DEBUG.fastRate : 1;
    else if (action === 'gunkPlayer') this.sendGunk(runner.state);
    else if (action === 'gunkRival' && runner.rival) this.sendGunk(runner.rival);
    else if (action === 'meterPlayer') this.fillMeter(runner.state);
    else if (action === 'meterRival' && runner.rival) this.fillMeter(runner.rival);
    else if (action === 'rival' && runner.match) this.nextRival();
    else if (action === 'win' && runner.match) this.forceEnd(1);
    else if (action === 'end') this.forceEnd(0);
  }

  /** Starts a new match, on a new seed, against the next rival; the climb carries on from there. */
  nextRival() {
    const { match } = this;
    match.rival = (match.rival % RIVALS.length) + 1;
    match.begin(match.randomSeed());
  }

  pickColor(color) {
    const { runner } = this.match;
    if (this.firstColor === 0) {
      this.firstColor = color;
      return;
    }
    runner.state.queue[0] = [this.firstColor, color];
    this.firstColor = 0;
    runner.dropReplay();
  }

  loadBoard() {
    const { runner, view } = this.match;
    const { state } = runner;
    if (state.phase === 'over') return;
    const { text, pair, stains = '' } = BOARDS[this.board];
    this.board = (this.board + 1) % BOARDS.length;
    state.grid = parseBoard(text);
    state.stains = parseStains(stains);
    Object.assign(state, { chain: 0, chainPoints: 0, power: 0, dropped: false, wait: 0, armed: false });
    // The board's pair goes in front of the queue, so the preview stays as it was.
    state.queue.unshift([...pair]);
    spawn(state);
    state.queue.pop();
    runner.dropReplay();
    view.show(state);
  }

  /** Adds a row of pending gunk to a board, which drops by the normal rules. */
  sendGunk(board) {
    const { runner } = this.match;
    if (runner.over) return;
    board.pending += RULES.columns;
    runner.dropReplay();
  }

  /** Fills a board's meter and clears its refill limit. */
  fillMeter(board) {
    const { runner } = this.match;
    if (runner.over) return;
    Object.assign(board, { meter: RULES.meter.max, meterLock: 0 });
    runner.dropReplay();
  }

  /** Tops out a board (0 = player, 1 = rival), and the match ends through the normal game-over. */
  forceEnd(side) {
    const { runner } = this.match;
    if (runner.over) return;
    const board = side === 0 ? runner.state : runner.rival;
    if (runner.match) forceTopOut(runner.match, side);
    else Object.assign(board, { phase: 'over', pair: null, wait: 0 });
    runner.dropReplay();
    runner.setFrozen(false);
    const over = [{ type: 'over', score: board.score }];
    if (runner.match) runner.onTick(runner.state, side === 0 ? over : [], side === 1 ? over : []);
    else runner.onTick(runner.state, over, null);
  }
}
