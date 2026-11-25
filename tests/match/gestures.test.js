import { describe, expect, it } from 'vitest';
import { RULES } from '../../src/config/rules.js';
import { TOUCH } from '../../src/config/touch.js';
import { INPUT } from '../../src/core/engine.js';
import { hashState, playReplay } from '../../src/core/replay.js';
import { nextInt, seedRng } from '../../src/core/rng.js';
import TouchGestures from '../../src/match/gestures.js';
import MatchInput from '../../src/match/input.js';
import MatchRunner from '../../src/match/runner.js';

const { LEFT, RIGHT, ROTATE_CW, SOFT_DROP } = INPUT;
const { columnStep: STEP, dragStart, dropBias, tapTicks, maxQueue, minColumnStep } = TOUCH;
const FIRST = STEP * TOUCH.firstStep;

/** A finger down at (100, 100), then moved by each offset. */
function pressed(...offsets) {
  return pressedAt(1, ...offsets);
}

function pressedAt(scale, ...offsets) {
  const touch = new TouchGestures();
  touch.begin(1, 100, 100, scale);
  to(touch, ...offsets);
  return touch;
}

function to(touch, ...offsets) {
  for (const [dx, dy] of offsets) touch.move(1, 100 + dx, 100 + dy);
}

/** The masks of the next ticks. */
const masks = (touch, count) => Array.from({ length: count }, () => touch.next());

describe('sideways drags', () => {
  it.each([
    [1, RIGHT],
    [-1, LEFT],
  ])('move one column per step (direction %i)', (sign, bit) => {
    const touch = pressed([sign * (FIRST - 1), 0]);
    expect(touch.next()).toBe(0);
    for (let i = 0; i < 3; i++) {
      to(touch, [sign * (FIRST + i * STEP), 0]);
      expect(masks(touch, 2)).toEqual([bit, 0]);
      to(touch, [sign * (FIRST + (i + 1) * STEP - 1), 0]);
      expect(touch.next()).toBe(0);
    }
  });

  it('queue fast steps, one per tick', () => {
    expect(masks(pressed([FIRST + 2 * STEP, 0]), 4)).toEqual([RIGHT, RIGHT, RIGHT, 0]);
  });

  it('keep queued moves after the finger lifts', () => {
    const touch = pressed([FIRST + STEP, 0]);
    touch.end(1);
    expect(masks(touch, 3)).toEqual([RIGHT, RIGHT, 0]);
  });

  it('turn back after a whole step, cancelling queued moves', () => {
    const touch = pressed([FIRST, 0]);
    expect(touch.next()).toBe(RIGHT);
    to(touch, [FIRST - STEP + 1, 0]);
    expect(touch.next()).toBe(0);
    to(touch, [FIRST - STEP, 0]);
    expect(masks(touch, 2)).toEqual([LEFT, 0]);
    to(touch, [FIRST + 2 * STEP, 0], [FIRST, 0]);
    expect(masks(touch, 2)).toEqual([RIGHT, 0]);
  });

  it('queue at most the limit, and turn back without undoing the rest', () => {
    const touch = pressed([FIRST + 20 * STEP, 0]);
    expect(masks(touch, maxQueue + 1)).toEqual([...new Array(maxQueue).fill(RIGHT), 0]);
    to(touch, [FIRST + 19 * STEP, 0]);
    expect(touch.next()).toBe(LEFT);
  });

  it('can queue a move across the whole board', () => {
    expect(maxQueue).toBe(RULES.columns - 1);
  });

  it('need a smallest step on screen', () => {
    const scale = 0.5;
    const first = (minColumnStep / scale) * TOUCH.firstStep;
    expect(pressedAt(scale, [first - 1, 0]).next()).toBe(0);
    expect(pressedAt(scale, [first, 0]).next()).toBe(RIGHT);
    expect(masks(pressedAt(scale, [first + STEP, 0]), 2)).toEqual([RIGHT, 0]);
  });

  it('follow the board on large screens', () => {
    expect(pressedAt(3, [FIRST - 1, 0]).next()).toBe(0);
    expect(pressedAt(3, [FIRST, 0]).next()).toBe(RIGHT);
  });
});

describe('axis', () => {
  const kind = (...offsets) => pressed(...offsets).press.kind;

  it('stays undecided until the start distance, in CSS pixels', () => {
    expect(kind([dragStart - 1, 0])).toBe('undecided');
    expect(kind([dragStart, 0])).toBe('sideways');
    expect(kind([0, dragStart])).toBe('drop');
    expect(pressedAt(2, [0, dragStart / 2]).press.kind).toBe('drop');
    expect(pressedAt(0.5, [0, dragStart]).press.kind).toBe('undecided');
  });

  it.each([
    [40, 39, 'sideways'],
    [40, 40, 'undecided'],
    [40, 40 * dropBias - 1, 'undecided'],
    [40, 40 * dropBias, 'drop'],
    [-40, 40 * dropBias, 'drop'],
    [40, -39, 'sideways'],
    [0, -80, 'undecided'],
  ])('(%i, %i) is %s', (dx, dy, expected) => {
    expect(kind([dx, dy])).toBe(expected);
  });

  it('holds: sideways never drops, and a drop never moves', () => {
    const sideways = pressed([dragStart, 0], [dragStart, 300]);
    expect(masks(sideways, 3)).toEqual([0, 0, 0]);
    const drop = pressed([0, dragStart], [300, dragStart]);
    expect(masks(drop, 3)).toEqual([SOFT_DROP, SOFT_DROP, SOFT_DROP]);
  });

  it('can still be chosen after a diagonal, but not a tap', () => {
    expect(kind([40, 45], [60, 45])).toBe('sideways');
    const touch = pressed([0, -80], [0, 0]);
    touch.end(1);
    expect(touch.next()).toBe(0);
  });
});

describe('taps', () => {
  it('rotate once, on release', () => {
    const touch = pressed([dragStart - 1, 0]);
    expect(masks(touch, 2)).toEqual([0, 0]);
    touch.end(1);
    expect(masks(touch, 2)).toEqual([ROTATE_CW, 0]);
  });

  it.each([
    [tapTicks, ROTATE_CW],
    [tapTicks + 1, 0],
  ])('held %i ticks give %i', (ticks, mask) => {
    const touch = pressed();
    masks(touch, ticks);
    touch.end(1);
    expect(touch.next()).toBe(mask);
  });

  it('are not drags that came back', () => {
    const touch = pressed([dragStart, 0], [0, 0]);
    touch.end(1);
    expect(touch.next()).toBe(0);
  });
});

describe('drops', () => {
  it('hold while the finger rests or goes back up, until it lifts', () => {
    const touch = pressed([0, dragStart]);
    expect(masks(touch, 3)).toEqual([SOFT_DROP, SOFT_DROP, SOFT_DROP]);
    to(touch, [0, -50]);
    expect(touch.next()).toBe(SOFT_DROP);
    touch.end(1);
    expect(touch.next()).toBe(0);
  });
});

describe('locks', () => {
  it('end a drop until a new press', () => {
    const touch = pressed([0, dragStart]);
    touch.lock();
    to(touch, [0, 200], [200, 200]);
    expect(masks(touch, 2)).toEqual([0, 0]);
    touch.end(1);
    touch.begin(1, 100, 100, 1);
    to(touch, [0, dragStart]);
    expect(touch.next()).toBe(SOFT_DROP);
  });

  it('clear queued moves, and a drag goes on with new steps', () => {
    const touch = pressed([FIRST + 3 * STEP, 0]);
    touch.lock();
    expect(masks(touch, 2)).toEqual([0, 0]);
    to(touch, [FIRST + 4 * STEP, 0]);
    expect(masks(touch, 2)).toEqual([RIGHT, 0]);
  });

  it('cancel a tap in progress or unused, but the press can still drag', () => {
    const touch = pressed();
    touch.lock();
    touch.end(1);
    expect(touch.next()).toBe(0);
    touch.begin(1, 100, 100, 1);
    touch.end(1);
    touch.lock();
    expect(touch.next()).toBe(0);
    const drag = pressed();
    drag.lock();
    to(drag, [FIRST, 0]);
    expect(drag.next()).toBe(RIGHT);
  });
});

describe('ownership and release', () => {
  it('ignores a second finger', () => {
    const touch = pressed([FIRST, 0]);
    touch.begin(2, 0, 0, 1);
    touch.move(2, 0, 200);
    touch.cancel(2);
    touch.end(2);
    expect(masks(touch, 2)).toEqual([RIGHT, 0]);
    to(touch, [FIRST + STEP, 0]);
    expect(touch.next()).toBe(RIGHT);
  });

  it('gives the gesture to a finger pressed after the owner lifts, not one already down', () => {
    const touch = pressed();
    touch.begin(2, 0, 0, 1);
    touch.end(1);
    touch.next();
    touch.move(2, 200, 0);
    touch.end(2);
    expect(masks(touch, 2)).toEqual([0, 0]);
    touch.begin(2, 0, 0, 1);
    touch.move(2, FIRST, 0);
    expect(touch.next()).toBe(RIGHT);
  });

  it('a cancel drops queued moves, a drop and a tap', () => {
    for (const offsets of [[[FIRST + STEP, 0]], [[0, dragStart]], []]) {
      const touch = pressed(...offsets);
      touch.cancel(1);
      touch.end(1);
      expect(masks(touch, 3)).toEqual([0, 0, 0]);
    }
  });

  it('releaseAll forgets everything, and the finger stays ignored', () => {
    const touch = pressed();
    touch.end(1);
    touch.begin(1, 100, 100, 1);
    to(touch, [FIRST + STEP, 0]);
    touch.releaseAll();
    to(touch, [200, 0]);
    touch.end(1);
    expect(masks(touch, 3)).toEqual([0, 0, 0]);
  });
});

describe('a match played by touch', () => {
  it.each([1, 2, 3])('replays to the same hash (seed %i)', (seed) => {
    const touch = new TouchGestures();
    const keys = new MatchInput();
    let rng = seedRng(seed);
    const roll = (n) => {
      const draw = nextInt(rng, n);
      rng = draw.rng;
      return draw.value;
    };
    let used = 0;
    let locks = 0;
    let x = 0;
    let y = 0;
    const runner = new MatchRunner({
      seed,
      readInput: () => {
        const mask = keys.next() | touch.next();
        used |= mask;
        return mask;
      },
      onTick: (_state, events) => {
        if (!events.some(({ type }) => type === 'lock')) return;
        touch.lock();
        locks++;
        // Nothing carries over until the finger does something new.
        expect([touch.queue, touch.pendingTap, touch.press?.kind === 'drop']).toEqual([0, false, false]);
      },
    });
    for (let i = 0; i < 100000 && runner.state.phase !== 'over'; i++) {
      const action = roll(12);
      if (action === 0) touch.begin(1, (x = 180), (y = 300), 1);
      else if (action < 4) touch.move(1, (x += roll(81) - 40), y);
      else if (action < 7) touch.move(1, x, (y += roll(41) - 10));
      else if (action === 7) touch.end(1);
      else if (action === 8 && roll(10) === 0) touch.cancel(1);
      else if (action === 9) keys.press('KeyQ');
      else if (action === 10) keys.release('KeyQ');
      runner.advance(1 + roll(3));
    }
    expect(runner.state.phase).toBe('over');
    expect(locks).toBeGreaterThan(10);
    expect(used).toBe(31);
    const copy = JSON.parse(JSON.stringify(runner.replay));
    expect(hashState(playReplay(copy))).toBe(hashState(runner.state));
  });
});
