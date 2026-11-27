import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint();

/** Purity errors ESLint reports for code at a path. */
async function problems(code, filePath = 'src/core/sample.js') {
  const [result] = await eslint.lintText(`${code}\n`, { filePath });
  return result.messages.filter((m) => m.ruleId?.startsWith('no-restricted') || m.fatal).map((m) => m.message);
}

const bad = [
  "import Phaser from 'phaser'; export default Phaser;",
  "import { BOARD } from '../config/index.js'; export default BOARD;",
  "import x from '../scenes/MatchScene.js'; export default x;",
  "import x from './../scenes/MatchScene.js'; export default x;",
  "import fs from 'node:fs'; export default fs;",
  "export * from '../assets/manifest.js';",
  "export const x = import('phaser');",
  'export const x = import.meta.env;',
  'export const x = Math.random();',
  "export const x = Math['random']();",
  'export const { random } = Math;',
  'export const x = Math.sin(1);',
  'export const x = Date.now();',
  'export const x = new Date();',
  'export const x = performance.now();',
  'setTimeout(() => {}, 1);',
  'export const x = crypto.getRandomValues;',
  'export const x = window.innerWidth;',
  'export const x = globalThis.Date;',
  'export const x = process.hrtime();',
  'export const x = 0.5;',
  'export const x = .5;',
  'export const x = 5e-1;',
];

describe('engine purity lint', () => {
  // ESLint loads its config on the first run, which can be slow.
  it.each(bad)('rejects %s', { timeout: 30000 }, async (code) => {
    expect(await problems(code)).not.toEqual([]);
  });

  it('also covers src/ai, the rules config and the rival profiles', async () => {
    expect(await problems('export const x = Math.random();', 'src/ai/sample.js')).not.toEqual([]);
    expect(await problems('export const x = 0.5;', 'src/config/rules.js')).not.toEqual([]);
    expect(await problems("export * from './board.js';", 'src/config/rules.js')).not.toEqual([]);
    expect(await problems('export const x = 0.5;', 'src/config/rivals.js')).not.toEqual([]);
    expect(await problems("export * from './rules.js';", 'src/config/rivals.js')).not.toEqual([]);
    expect(
      await problems("import { RIVALS } from '../config/rivals.js'; export default RIVALS;", 'src/ai/x.js'),
    ).toEqual([]);
  });

  it('allows pure code', async () => {
    const code = `import { RULES } from '../config/rules.js';
import { createGrid } from './grid.js';
export const x = [Math.floor(RULES.columns / 2), Math.imul(0x6d2b79f5, 3), createGrid(), '0.5'];`;
    expect(await problems(code)).toEqual([]);
  });

  it('leaves the rest of the game alone', async () => {
    expect(await problems('export const x = Math.random() * 0.5;', 'src/scenes/sample.js')).toEqual([]);
  });
});
