import Phaser from 'phaser';
import { BOARD, CONTROLS, DEBUG } from '../config/index.js';
import MatchInput from '../match/input.js';
import MatchRunner from '../match/runner.js';
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
  }

  create() {
    const solo = this.mode === 'endless';
    this.view = new BoardView(this, {
      x: solo ? BOARD.soloX : BOARD.playerX,
      frameKey: 'board_frame_player',
      preview: true,
    });
    if (!solo) this.rivalView = new BoardView(this, { x: BOARD.rivalX, frameKey: 'board_frame_rival' });
    this.keys = new MatchInput();
    this.begin(crypto.getRandomValues(new Uint32Array(1))[0]);
    this.listen();
    addSceneLabel(this);
    this.scene.launch('UI');
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
        if (!event.repeat && !this.pauseOpen) this.keys.press(event.code);
      }),
    );
    keyboard.on(
      'keyup',
      once((event) => this.keys.release(event.code)),
    );
    keyboard.on('keydown-ESC', () => this.openPause());
    if (DEBUG.enabled) keyboard.on('keydown-R', () => this.finish());

    const release = () => this.keys.releaseAll();
    this.game.events.on(Phaser.Core.Events.BLUR, release);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(Phaser.Core.Events.BLUR, release));
  }

  /** Starts a match on this seed, replacing any match in progress. */
  begin(seed) {
    this.keys.releaseAll();
    this.runner = new MatchRunner({
      seed,
      readInput: () => this.keys.next(),
      onTick: (state, events) => this.view.tick(state, events),
    });
    this.view.show(this.runner.state);
  }

  update(_time, delta) {
    if (this.pauseOpen) return;
    this.elapsedMs += delta;
    this.runner.update(delta);
    this.view.draw();
  }

  openPause() {
    if (this.pauseOpen) return;
    this.pauseOpen = true;
    this.keys.releaseAll();
    this.scene.pause();
    this.scene.launch('Pause');
  }

  /** Called by Pause once it is closing. */
  closePause() {
    this.pauseOpen = false;
    this.keys.releaseAll();
    this.scene.resume();
  }

  finish() {
    this.scene.stop('UI');
    this.scene.start('Result', { mode: this.mode });
  }
}
