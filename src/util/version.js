// The build version label shown on the title screen. Pure, so the format is unit-tested.

/**
 * Format the version label.
 * Production: `v0.0.1`. Development: `v0.0.1-dev (f553d4b)`, or `v0.0.1-dev` without a commit.
 * @param {string} version package.json version, e.g. "0.0.1"
 * @param {string} commit short git commit, or '' when unknown
 * @param {boolean} dev true in a development build
 * @returns {string}
 */
export function versionLabel(version, commit, dev) {
  if (!dev) return `v${version}`;
  const hash = (commit ?? '').trim();
  return hash ? `v${version}-dev (${hash})` : `v${version}-dev`;
}
