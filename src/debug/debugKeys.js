import { DEBUG, FLOW } from '../config/index.js';
import { spawn } from '../core/engine.js';
import { onLayout, placeText } from '../layout/manager.js';
import { BOARDS, parseBoard } from './boards.js';

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
    else if (action === 'end') this.forceEnd();
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
    const { text, pair } = BOARDS[this.board];
    this.board = (this.board + 1) % BOARDS.length;
    state.grid = parseBoard(text);
    Object.assign(state, { chain: 0, chainPoints: 0, wait: 0 });
    // The board's pair goes in front of the queue, so the preview stays as it was.
    state.queue.unshift([...pair]);
    spawn(state);
    state.queue.pop();
    runner.dropReplay();
    view.show(state);
  }

  forceEnd() {
    const { runner } = this.match;
    const { state } = runner;
    if (state.phase === 'over') return;
    Object.assign(state, { phase: 'over', pair: null, wait: 0 });
    runner.dropReplay();
    runner.setFrozen(false);
    runner.onTick(state, [{ type: 'over', score: state.score }]);
  }
}
