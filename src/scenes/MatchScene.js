import Phaser from 'phaser';
import { CONTROLS, DEBUG, DISPLAY, FLOW } from '../config/index.js';
import DebugKeys from '../debug/debugKeys.js';
import { onLayout } from '../layout/manager.js';
import TouchGestures from '../match/gestures.js';
import MatchInput from '../match/input.js';
import MatchRunner from '../match/runner.js';
import MatchStats from '../match/stats.js';
import TouchButton from '../ui/TouchButton.js';
import BoardView from '../view/BoardView.js';
import { addSceneLabel } from './sceneLabel.js';

// A match: the runner advances the engine, the view draws it. Ladder shows the player's board
// beside the rival's (empty until SA-8), Endless the player's alone.
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
    this.gameOverText = this.add
      .text(0, 0, 'GAME\nOVER', {
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
    this.keys = new MatchInput();
    this.touch = new TouchGestures();
    this.makeButtons();
    this.debug = DEBUG.enabled ? new DebugKeys(this) : null;
    this.begin(crypto.getRandomValues(new Uint32Array(1))[0]);
    this.listen();
    onLayout(this, (layout, rotated) => this.place(layout, rotated));
    addSceneLabel(this);
    this.scene.launch('UI');
  }

  /** Rotate and pause buttons for touch. The meter's slot stays empty until SA-9. */
  makeButtons() {
    const turn = (action) => () => {
      if (!this.pauseOpen) this.keys.turn(action);
    };
    this.buttons = {
      ccw: new TouchButton(this, 'ccw', { onPress: turn('ccw') }),
      cw: new TouchButton(this, 'cw', { onPress: turn('cw') }),
      pause: new TouchButton(this, 'pause', { onRelease: () => this.openPause() }, true),
    };
    for (const button of Object.values(this.buttons)) button.setDepth(50);
  }

  /** @param {import('../layout/layout.js').Layout} layout */
  place({ match, mode }, rotated) {
    const { player, gameOver } = match[this.mode];
    this.view.place(player);
    this.rivalView?.place(match.ladder.rival);
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

    const release = () => this.releaseInput();
    this.game.events.on(Phaser.Core.Events.BLUR, release);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(Phaser.Core.Events.BLUR, release));
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
    this.runner = new MatchRunner({
      seed,
      readInput: () => this.keys.next() | this.touch.next(),
      onTick: (state, events) => this.tick(state, events),
    });
    this.view.show(this.runner.state);
  }

  tick(state, events) {
    this.view.tick(state, events);
    this.stats.add(events);
    if (events.some(({ type }) => type === 'lock')) this.touch.lock();
    if (state.phase !== 'over') return;
    this.gameOverText.setVisible(true);
    // Counted in ticks, so pausing stops it.
    if (this.overTicks++ === FLOW.gameOverTicks) this.finish();
  }

  update(_time, delta) {
    if (this.pauseOpen) return;
    this.elapsedMs += delta;
    this.runner.update(delta);
    this.view.draw();
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
    this.scene.start('Result', { mode: this.mode, stats: this.stats.summary(this.runner.state) });
  }
}
