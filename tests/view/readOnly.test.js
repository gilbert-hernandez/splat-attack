import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint();

async function problems(code) {
  const [result] = await eslint.lintText(`${code}\n`, { filePath: 'src/view/sample.js' });
  return result.messages.filter((m) => m.ruleId?.startsWith('no-restricted') || m.fatal);
}

const bad = [
  "import { step } from '../core/engine.js'; export default step;",
  "import * as engine from '../core/engine.js'; export default engine;",
  "import { setCell } from '../core/grid.js'; export default setCell;",
  "import { applyGravity as cellAt } from '../core/grid.js'; export default cellAt;",
  "import { movePair } from '../core/pair.js'; export default movePair;",
  "import { playReplay } from '../core/replay.js'; export default playReplay;",
  "import MatchRunner from '../match/runner.js'; export default MatchRunner;",
  "export { step } from '../core/engine.js';",
  "export * from '../core/engine.js';",
  "export const x = import('../core/engine.js');",
];

describe('view lint', () => {
  it.each(bad)('rejects %s', { timeout: 30000 }, async (code) => {
    expect(await problems(code)).not.toEqual([]);
  });

  it('allows reading', async () => {
    const code = `import Phaser from 'phaser';
import { COLUMNS, cellAt } from '../core/grid.js';
import { otherCell } from '../core/pair.js';
import { VIEW } from '../config/index.js';
export const x = [Phaser, COLUMNS, cellAt, otherCell, VIEW];`;
    expect(await problems(code)).toEqual([]);
  });
});
