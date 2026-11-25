# Splat Attack

A single-player, score-chasing falling-pair versus puzzle game. Built with **Phaser 4** and **Vite**, in plain JavaScript (ES modules). Code by Gilbert; art by david.

## Scripts

Needs Node.js 20+ (developed on 24) and a browser with WebGL.

```bash
npm install        # once
npm run dev        # dev server with hot reload
npm test           # unit tests (Vitest)
npm run build      # static production build into dist/
npm run preview    # serve dist/ locally
```

`dist/` runs from any static web server and any path. In `npm run dev`, each scene shows its name and `R` in a match opens Result.

## Layout

```
src/main.js                Phaser.Game config (960×540, FIT, pixelArt, no physics)
src/config/                tunables
src/assets/manifest.js     every graphic, plus validate()
src/assets/placeholders.js generated stand-ins for missing art
src/assets/img/            david's PNGs go here
src/scenes/                Boot → Preload → Title → ModeSelect → Match (+ UI), Pause, Result
tests/                     unit tests
ASSETS.md                  the art spec
PLAN.md                    the overall plan
openspec/                  specs and changes
```

## Adding art

Name and size the PNG as listed in [ASSETS.md](ASSETS.md), copy it into `src/assets/img/`, and reload (restart `npm run dev` if it isn't picked up). New assets go in both `manifest.js` and `ASSETS.md`; `npm test` fails if they disagree.

## Version

`package.json` is the only source; the title screen shows it. Each Dev ticket bumps it and adds a dated `CHANGELOG.md` section (`npm test` fails if they differ). After merging: annotated tag `v<version>`.

## Workflow

Tracked in the Vikunja project **Splat Attack** (`SA`). One Dev ticket = one OpenSpec change = one branch: propose → review → apply → archive → tag. Art tickets (SA-18 to SA-25) don't use OpenSpec.

## License

Code is under the [MIT License](LICENSE). Artwork is copyright its artist, david, all rights reserved: see [ART-LICENSE.md](ART-LICENSE.md).
