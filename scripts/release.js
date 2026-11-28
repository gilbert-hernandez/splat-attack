// Pure release rules, used by release-check.js, release-ci.js and the unit tests.

/**
 * The newest dated version in a changelog, or null. `[Unreleased]` is ignored.
 * @param {string} text
 * @returns {string | null}
 */
export function newestChangelogVersion(text) {
  return text.match(/^## \[(\d+\.\d+\.\d+)\] - \d{4}-\d{2}-\d{2}$/m)?.[1] ?? null;
}

/**
 * Compare x.y.z versions by number: negative when a < b, 0 when equal.
 * @param {string} a
 * @param {string} b
 */
export function compareVersions(a, b) {
  const [pa, pb] = [a, b].map((v) => v.split('.').map(Number));
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
}

/**
 * Everything stopping the current commit from being tagged (empty when ready).
 * @param {object} state
 * @param {string} state.version package.json version
 * @param {string | null} state.changelogVersion
 * @param {string} state.branch
 * @param {boolean} state.clean no uncommitted or untracked files
 * @param {string[]} state.localTags
 * @param {string[] | null} state.remoteTags null when origin can't be read
 * @param {boolean} [state.tagIsHere] the version's tag exists and points at this commit, which is
 *   fine when archiving it
 * @returns {string[]}
 */
export function releaseProblems({
  version,
  changelogVersion,
  branch,
  clean,
  localTags,
  remoteTags,
  tagIsHere = false,
}) {
  const problems = [];
  const tag = `v${version}`;
  if (!/^\d+\.\d+\.\d+$/.test(version)) return [`package.json version "${version}" is not x.y.z`];
  if (!clean) problems.push('the working tree has uncommitted changes');
  if (branch !== 'master') problems.push(`the branch is ${branch || 'detached'}, not master`);
  if (changelogVersion !== version) {
    problems.push(`CHANGELOG.md's newest version is ${changelogVersion ?? 'missing'}, but package.json is ${version}`);
  }
  if (localTags.includes(tag) && !tagIsHere) problems.push(`${tag} is already tagged locally`);
  if (remoteTags === null) problems.push("couldn't read the tags on origin");
  else if (remoteTags.includes(tag) && !tagIsHere) problems.push(`${tag} is already tagged on origin`);

  const released = [...localTags, ...(remoteTags ?? [])]
    .filter((t) => /^v\d+\.\d+\.\d+$/.test(t))
    .map((t) => t.slice(1))
    .sort(compareVersions);
  const newest = released.at(-1);
  if (newest && compareVersions(version, newest) < 0) {
    problems.push(`${version} is not above the newest tag, v${newest}`);
  }
  return problems;
}

// Release workflow helpers (SA-31), used by release-ci.js and .github/workflows/release.yml.

export const BLOCK_START = '<!-- arcade-install:start -->';
export const BLOCK_END = '<!-- arcade-install:end -->';

/**
 * The version in a release tag, or null when the tag isn't `v<major>.<minor>.<patch>`.
 * @param {string} tag
 * @returns {string | null}
 */
export function versionFromTag(tag) {
  return /^v(\d+\.\d+\.\d+)$/.exec(tag ?? '')?.[1] ?? null;
}

/**
 * The body of a CHANGELOG section (`## [x.y.z] - date`) without its heading, or null if missing.
 * Stops at the next `## ` heading or at the link reference definitions at the end of the file.
 * @param {string} markdown
 * @param {string} version
 * @returns {string | null}
 */
export function changelogSection(markdown, version) {
  const lines = markdown.split(/\r?\n/);
  const heading = new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\](\\s|$)`);
  const start = lines.findIndex((line) => heading.test(line));
  if (start === -1) return null;
  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (/^## /.test(line) || /^\[[^\]]+\]:\s/.test(line)) break;
    body.push(line);
  }
  return body.join('\n').trim();
}

/**
 * Checks a release tag against package.json's version and the CHANGELOG.
 * @param {string} tag
 * @param {string} pkgVersion
 * @param {string} changelog CHANGELOG.md contents
 * @returns {{ ok: true, version: string } | { ok: false, error: string }}
 */
export function checkTag(tag, pkgVersion, changelog) {
  const version = versionFromTag(tag);
  if (!version) return { ok: false, error: `Tag "${tag}" is not a release tag (expected v<major>.<minor>.<patch>).` };
  if (version !== pkgVersion) {
    return {
      ok: false,
      error: `Tag ${tag} is version ${version}, but package.json says ${pkgVersion}. Bump package.json or fix the tag.`,
    };
  }
  if (changelogSection(changelog, version) === null) {
    return { ok: false, error: `CHANGELOG.md has no "## [${version}]" section. Add one before tagging.` };
  }
  return { ok: true, version };
}

/**
 * The "Install on Arcade" notes block, between marker comments.
 * @param {{ version: string, url: string, sha256: string }} values
 * @returns {string}
 */
export function arcadeBlock({ version, url, sha256 }) {
  return [
    BLOCK_START,
    '### Install on Arcade',
    '',
    'In `config/games.php`:',
    '',
    '```php',
    `'version' => '${version}',`,
    `'download_url' => '${url}',`,
    `'sha256' => '${sha256}',`,
    '```',
    BLOCK_END,
  ].join('\n');
}

/**
 * Notes ending with the block: replaces an existing marked block, or appends one.
 * @param {string} notes
 * @param {string} block
 * @returns {string}
 */
export function withArcadeBlock(notes, block) {
  const text = (notes ?? '').replace(/\r\n/g, '\n');
  const start = text.indexOf(BLOCK_START);
  const end = start === -1 ? -1 : text.indexOf(BLOCK_END, start);
  if (end !== -1) {
    const before = text.slice(0, start).trimEnd();
    const after = text.slice(end + BLOCK_END.length).trim();
    return [before, after, block].filter(Boolean).join('\n\n') + '\n';
  }
  const trimmed = text.trimEnd();
  return (trimmed ? `${trimmed}\n\n${block}` : block) + '\n';
}

/**
 * Whether to upload the new archive, given the SHA-256 of the one already attached (if any).
 * Published archives are never replaced with different contents.
 * @param {string | null | undefined} existingSha256
 * @param {string} newSha256
 * @returns {'upload' | 'skip' | 'conflict'}
 */
export function uploadDecision(existingSha256, newSha256) {
  if (!existingSha256) return 'upload';
  return existingSha256.toLowerCase() === newSha256.toLowerCase() ? 'skip' : 'conflict';
}
