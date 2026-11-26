import Phaser from 'phaser';
import { createSparring, sparringInput } from '../ai/sparring.js';
import { CONTROLS, DEBUG, DISPLAY, FLOW, RULES, VIEW } from '../config/index.js';
import DebugKeys from '../debug/debugKeys.js';
import { onLayout } from '../layout/manager.js';
import TouchGestures from '../match/gestures.js';
import MatchInput from '../match/input.js';
import MatchRunner from '../match/runner.js';
import MatchStats from '../match/stats.js';
import TouchButton from '../ui/TouchButton.js';
import BoardView from '../view/BoardView.js';
import MeterView from '../view/MeterView.js';
import PendingView from '../view/PendingView.js';
import { addSceneLabel } from './sceneLabel.js';

// A match: the runner advances the engine, the view draws it. Ladder is a versus match against the
// sparring rival (until the CPU rivals arrive), Endless the player's board alone.
export default class MatchScene extends Phaser.Scene {
  constructor() {
    super('Match');
  }

  /** @param {{mode?: string}} [data] */
  init(data) {
    this.mode = data?.mode === 'endless' ? 'endless' : 'ladder';
    this.elapsedMs = 0;
    this.pauseOpen = false;
    this.finished = false;
  }

  create() {
    const solo = this.mode === 'endless';
    this.view = new BoardView(this, { frameKey: 'board_frame_player', preview: true });
    this.rivalView = solo ? null : new BoardView(this, { frameKey: 'board_frame_rival' });
    this.pending = solo ? null : [new PendingView(this), new PendingView(this)];
    this.meters = solo ? [new MeterView(this)] : [new MeterView(this), new MeterView(this)];
    this.makeChoicePanel();
    this.gameOverText = this.add
      .text(0, 0, FLOW.endMessages.over, {
        fontFamily: FLOW.fontFamily,
        fontSize: '48px',
        fontStyle: 'bold',
        align: 'center',
        color: FLOW.textColor,
        stroke: DISPLAY.backgroundColor,
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(100);
    this.touch = new TouchGestures();
    // The choice needs the player's live board, read when asked.
    this.keys = new MatchInput({
      canOpen: () => this.meterFull(),
      canRinse: () => this.runner.state.pending > 0,
      // A finger that was dragging stops moving the pair, and doesn't snap it when the choice closes.
      onOpen: () => this.touch.releaseAll(),
    });
    this.makeButtons();
    this.debug = DEBUG.enabled ? new DebugKeys(this) : null;
    this.begin(crypto.getRandomValues(new Uint32Array(1))[0]);
    this.listen();
    onLayout(this, (layout, rotated) => this.place(layout, rotated));
    addSceneLabel(this);
    this.scene.launch('UI');
  }

  /** Rotate, meter and pause buttons for touch. While the meter choice is open, the rotate buttons pick. */
  makeButtons() {
    const turn = (action, option) => () => {
      if (this.pauseOpen) return;
      if (this.keys.choice.open) this.keys.pick(option);
      else this.keys.turn(action);
    };
    this.buttons = {
      ccw: new TouchButton(this, 'ccw', { onPress: turn('ccw', 'rinse') }),
      meter: new TouchButton(this, 'meter', {
        onPress: () => {
          if (!this.pauseOpen) this.keys.toggleChoice();
        },
      }),
      cw: new TouchButton(this, 'cw', { onPress: turn('cw', 'bomb') }),
      pause: new TouchButton(this, 'pause', { onRelease: () => this.openPause() }, true),
    };
    for (const button of Object.values(this.buttons)) button.setDepth(50);
    this.showButtons();
  }

  /** The meter choice's panel: Rinse on the left, Bomb on the right, over the player's board. */
  makeChoicePanel() {
    const style = { fontFamily: FLOW.fontFamily, fontSize: '18px', fontStyle: 'bold', color: FLOW.textColor };
    this.choiceTexts = [0, 1].map((side) => this.add.text(0, 0, '', style).setOrigin(side === 0 ? 1 : 0, 0.5));
    this.choicePanel = this.add
      .container(0, 0, [
        this.add.rectangle(0, 0, 200, 36, VIEW.choicePanelColor, VIEW.choicePanelAlpha),
        ...this.choiceTexts,
      ])
      .setDepth(VIEW.choiceDepth)
      .setVisible(false);
    this.choiceTexts[0].setX(-12);
    this.choiceTexts[1].setX(12);
  }

  /** True while the player's live board can fire its meter. */
  meterFull() {
    return !this.runner.over && this.runner.state.meter === RULES.meter.max;
  }

  /** The buttons' icons and dimming for the choice and the meter. */
  showButtons() {
    const { ccw, cw, meter } = this.buttons;
    const open = this.keys.choice.open;
    const state = this.runner?.state;
    ccw.setIcon(open ? 'rinse' : 'ccw');
    cw.setIcon(open ? 'bomb' : 'cw');
    ccw.setDim(open && !(state?.pending > 0));
    meter.setDim(!open && !(state && this.meterFull()));
  }

  /** @param {import('../layout/layout.js').Layout} layout */
  place({ match, mode }, rotated) {
    const { player, gameOver, meterPlayer, choice } = match[this.mode];
    this.view.place(player);
    this.meters[0].place(meterPlayer);
    this.meters[1]?.place(match.ladder.meterRival);
    this.choicePanel.setPosition(choice.x, choice.y);
    FLOW.choiceLabels[mode].forEach((label, i) => this.choiceTexts[i].setText(label));
    this.rivalView?.place(match.ladder.rival);
    this.pending?.[0].place(match.ladder.pendingPlayer);
    this.pending?.[1].place(match.ladder.pendingRival);
    this.gameOverText.setPosition(gameOver.x, gameOver.y);
    for (const [name, button] of Object.entries(this.buttons)) {
      button.place(match.buttons[name]);
      button.show(mode === 'touch');
    }
    // Positions shift under the finger.
    this.touch.releaseAll();
    if (rotated) this.openPause();
  }

  listen() {
    const { keyboard } = this.input;
    keyboard.addCapture(CONTROLS.captured);
    // Phaser sometimes handles one event twice; a late copy must not press a released key.
    const seen = new WeakSet();
    const once = (handle) => (event) => {
      if (seen.has(event)) return;
      seen.add(event);
      handle(event);
    };
    keyboard.on(
      'keydown',
      once((event) => {
        if (this.pauseOpen) return;
        if (!event.repeat) this.keys.press(event.code);
        this.debug?.press(event);
      }),
    );
    keyboard.on(
      'keyup',
      once((event) => this.keys.release(event.code)),
    );
    keyboard.on('keydown-ESC', () => this.openPause());

    this.listenToTouch();

    // Switching apps, locking the phone or clicking elsewhere pauses; coming back doesn't resume.
    const away = () => {
      this.releaseInput();
      this.openPause();
    };
    const { BLUR, HIDDEN } = Phaser.Core.Events;
    this.game.events.on(BLUR, away);
    this.game.events.on(HIDDEN, away);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(BLUR, away);
      this.game.events.off(HIDDEN, away);
    });
  }

  listenToTouch() {
    this.input.on('pointerdown', (pointer, over) => {
      if (this.pauseOpen || !pointer.wasTouch || over.length > 0) return;
      const { gameSize, displaySize } = this.scale;
      this.touch.begin(pointer.id, pointer.x, pointer.y, displaySize.width / gameSize.width);
    });
    this.input.on('pointermove', (pointer) => this.touch.move(pointer.id, pointer.x, pointer.y));
    const lift = (pointer) => {
      // Phaser reports a cancelled touch as a release.
      if (pointer.wasCanceled) {
        this.touch.cancel(pointer.id);
        return;
      }
      // Its last move may not have been reported.
      this.touch.move(pointer.id, pointer.x, pointer.y);
      this.touch.end(pointer.id);
    };
    this.input.on('pointerup', lift);
    this.input.on('pointerupoutside', lift);
  }

  /** Forgets every key, touch and button press. */
  releaseInput() {
    this.keys.releaseAll();
    this.touch.releaseAll();
    for (const button of Object.values(this.buttons)) button.press.reset();
  }

  /** Starts a match on this seed, replacing any match in progress. */
  begin(seed) {
    this.releaseInput();
    this.debug?.reset();
    this.stats = new MatchStats();
    this.overTicks = 0;
    this.gameOverText.setVisible(false);
    const rival = this.rivalView ? createSparring() : null;
    this.runner = new MatchRunner({
      seed,
      // While the choice is open, gestures pass soft drop only.
      readInput: () => {
        const moves = !this.keys.choice.open;
        return this.keys.next() | this.touch.next(moves);
      },
      readRivalInput: rival ? (board) => sparringInput(rival, board) : undefined,
      onTick: (state, events, rivalEvents) => this.tick(state, events, rivalEvents),
    });
    this.view.show(this.runner.state);
    this.rivalView?.show(this.runner.rival);
    this.showPending();
    this.showMeters();
  }

  tick(state, events, rivalEvents) {
    this.view.tick(state, events);
    if (rivalEvents) this.rivalView.tick(this.runner.rival, rivalEvents);
    this.stats.add(events);
    if (events.some(({ type }) => type === 'lock')) this.touch.lock();
    // The meter emptied (fired, or the match ended): nothing left to choose.
    if (this.keys.choice.open && !this.meterFull()) this.keys.closeChoice();
    if (!this.runner.over) return;
    this.gameOverText.setText(FLOW.endMessages[this.runner.outcome ?? 'over']).setVisible(true);
    // Counted in ticks, so pausing stops it.
    if (this.overTicks++ === FLOW.gameOverTicks) this.finish();
  }

  update(_time, delta) {
    if (this.pauseOpen) return;
    this.elapsedMs += delta;
    this.runner.update(delta);
    this.view.draw();
    this.rivalView?.draw();
    this.showPending();
    this.showButtons();
    this.showMeters();
  }

  /** Both meters, and the choice's panel and Bomb target while it is open. */
  showMeters() {
    const { state, rival } = this.runner;
    this.meters[0].show(state.meter);
    this.meters[1]?.show(rival.meter);
    const open = this.keys.choice.open;
    this.choicePanel.setVisible(open);
    this.choiceTexts[0].setAlpha(state.pending > 0 ? 1 : FLOW.dimAlpha);
    this.view.setTarget(open);
  }

  showPending() {
    if (!this.pending) return;
    this.pending[0].show(this.runner.state.pending);
    this.pending[1].show(this.runner.rival.pending);
  }

  openPause() {
    if (this.pauseOpen || this.finished) return;
    this.pauseOpen = true;
    this.releaseInput();
    this.scene.pause();
    this.scene.launch('Pause');
  }

  /** Called by Pause once it is closing. */
  closePause() {
    this.pauseOpen = false;
    this.releaseInput();
    this.scene.resume();
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.scene.stop('UI');
    const { state, outcome } = this.runner;
    this.scene.start('Result', { mode: this.mode, stats: this.stats.summary(state, outcome) });
  }
}
