// Display and debug tunables.
export const DISPLAY = {
  width: 960,
  height: 540,
  backgroundColor: '#14121f',
};

export const DEBUG = {
  // Scene labels and dev shortcuts (R = Result in Match). On in `npm run dev`, off in builds.
  enabled: import.meta.env?.DEV ?? false,
};
