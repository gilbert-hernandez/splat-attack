// Pure release rules, used by release-check.js and the unit tests.

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
