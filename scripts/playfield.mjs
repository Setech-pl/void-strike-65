import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PLAYFIELD_DEFINITION_PATH = path.join(
  root, "assets", "graphics", "playfield.json",
);

export function loadPlayfieldDefinition(filePath = PLAYFIELD_DEFINITION_PATH) {
  const source = JSON.parse(fs.readFileSync(filePath, "utf8"));
  invariant(source.formatVersion === 1, "Unsupported playfield formatVersion");
  // M6 stage 1b (journal §BK 1, docs/plans/m6-gauges.md §2): the HUD's line
  // follows the ring at 240-247; its 8 lines at the top stay blank, so the
  // divider and the ring keep 16-23 and 24-239.
  invariant(source.activeImageTop === 8 && source.hudRows === 1 &&
    source.hudPlacement === "bottom" && source.dividerRows === 1 && source.ringRows === 27,
  "PAL playfield must expose blank 8-15, divider 16-23, ring 24-239 and HUD 240-247");
  invariant(source.screenColumns === 40 && source.leftHpos === 48,
    "Playfield must retain the 40-column normal-width ANTIC geometry");
  invariant(source.ringBufferAddress === 0x8140,
    "Expanded ring must begin at the reviewed post-staging address $8140");
  const gameplayTop = source.activeImageTop + source.hudRows * 8;
  const entityTop = gameplayTop + source.dividerRows * 8;
  const gameplayRows = source.dividerRows + source.ringRows;
  const gameplayBottom = gameplayTop + gameplayRows * 8;
  invariant(gameplayBottom === 240,
    "Gameplay must end exclusively at safe PAL scanline 240");
  const hudTop = gameplayBottom;
  const hudBottom = hudTop + source.hudRows * 8;
  invariant(hudBottom === 248, "The HUD must end at ANTIC's last displayed line, 247");
  return Object.freeze({
    ...source,
    hudTop,
    hudBottom,
    gameplayTop,
    entityTop,
    gameplayRows,
    gameplayBottom,
    ringBufferBytes: source.ringRows * source.screenColumns,
    ringBufferEnd: source.ringBufferAddress + source.ringRows * source.screenColumns,
  });
}

export const canonicalPlayfield = loadPlayfieldDefinition();
