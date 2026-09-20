import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import {
  anticERegisterForBitmapPixel,
  anticFRegisterForBitmapBit,
  compileLoaderBitmap,
  loadLoaderBitmapDefinition,
} from "./loader-assets.mjs";
import {
  compileCapitalHulls,
  loadCapitalHullsDefinition,
} from "./capital-hulls.mjs";
import {
  compileEnemyRoster,
  loadEnemyRosterDefinition,
} from "./enemy-roster.mjs";
import {
  compileFighterWeapons,
  createSharedFighterExplosion,
  createPlayerFighterBurstState,
  loadFighterWeaponsDefinition,
  simulatePlayerFighterBurst,
  stepSharedFighterExplosion,
  stepPlayerFighterBurst,
} from "./fighter-weapons.mjs";
import {
  compileStarfield,
  createStarfieldState,
  loadStarfieldDefinition,
  composeStarfield,
  stepStarfieldWorld,
} from "./starfield.mjs";
import {
  compileFrontendH31,
  loadFrontendH31Definition,
} from "./frontend-h31-assets.mjs";
import {
  compileEntityEffects,
  loadEntityEffectsDefinition,
} from "./entity-effects.mjs";
import {
  assertDebrisDestructionTraceParity,
  assertInterceptorBreakupTraceParity,
  debrisDestructionTraceCsv,
  executeDebrisDestructionTrace,
  executeInterceptorBreakupTrace,
  interceptorBreakupTraceCsv,
} from "./debris-destruction-runtime.mjs";
import {
  assertSpreadShotTraceParity,
  assertWeaponPickupTraceParity,
  executeHudPresentationTrace,
  executeShieldBoosterTrace,
  executeSpreadShotHullVolleyTrace,
  executeSpreadShotTrace,
  executePlayerFighterBurstBalanceTrace,
  executeWeaponPickupTrace,
  executeWeaponPickupBackingTrace,
  executePlayerFighterProjectileColourTrace,
  executePlayerFighterProjectileColourLifecycleTrace,
  spreadShotTraceCsv,
  player_fighterBurstBalanceTraceCsv,
  weaponPickupTraceCsv,
} from "./weapon-pickup-runtime.mjs";
import {
  beginEnemyDamageFrame,
  createEnemyCombatState,
  createEnemyDamageState,
  ENEMY_DAMAGE_SOURCES,
  enemyPulseSpawnPosition,
  projectileVisualMetrics,
  queueEnemyDamage,
  resolveEnemyDamage,
  simulateNaturalInterceptorFire,
  stepEnemyCombatFrame,
  sweptHorizontalProjectileTargets,
} from "./enemy-combat.mjs";
import {
  buildCapitalHullsAntic2Charset,
  compileCapitalHullsAntic2Prototype,
  loadCapitalHullsAntic2Prototype,
} from "./capital-hulls-antic2.mjs";
import {
  BROADSIDE_STATES,
  capitalExplosionVisual,
  centeredSpanTop,
  combinedPlayerEnvelope,
  heavyShellVisual,
  hullBoundary,
  missileWidth,
  muzzlePosition,
  playerHullContact,
  sectorRowForSide,
  simulateBroadsideCadence,
  simulateBroadsideSpeedSequence,
  warningVisual,
} from "./broadside.mjs";
import { canonicalPlayfield } from "./playfield.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const frontendH31Asset = compileFrontendH31(loadFrontendH31Definition(
  path.join(rootDirectory, "assets", "graphics", "frontend-h31.json"),
));

const SCREEN_COLUMNS = 40;
const SCREEN_ROWS = 24;
const GAMEPLAY_SCREEN_ROWS = canonicalPlayfield.gameplayRows + canonicalPlayfield.hudRows;
const CHARACTER_HEIGHT = 8;
const ANTIC_PIXELS_PER_BYTE = 4;
const HIGH_RES_PIXELS_PER_COLOR_CLOCK = 2;
const PREVIEW_SCALE = 2;
const PMG_LEFT_EDGE = 48;
const PMG_SCREEN_TOP = 8;

const SOURCE_WIDTH =
  SCREEN_COLUMNS * ANTIC_PIXELS_PER_BYTE * HIGH_RES_PIXELS_PER_COLOR_CLOCK;
const SOURCE_HEIGHT = SCREEN_ROWS * CHARACTER_HEIGHT;

export const PREVIEW_WIDTH = SOURCE_WIDTH * PREVIEW_SCALE;
export const PREVIEW_HEIGHT = SOURCE_HEIGHT * PREVIEW_SCALE;
export const DEFAULT_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "gameplay-screen.png",
);
export const DEFAULT_LOADER_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "loader-screen.png",
);
export const DEFAULT_START_MENU_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "start-menu.png",
);
export const DEFAULT_CAPITAL_HULLS_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "capital-hulls-strip.png",
);
export const DEFAULT_ENEMY_HULL_COLOUR_OPTIONS_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "enemy-hull-colour-options.png",
);
export const DEFAULT_BROADSIDE_ANTIC2_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "gameplay-broadside-antic2-prototype.png",
);
export const DEFAULT_CAPITAL_HULLS_ANTIC2_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "capital-hulls-antic2-strip.png",
);
export const DEFAULT_BROADSIDE_COMPARISON_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "broadside-mode-comparison.png",
);
export const DEFAULT_BROADSIDE_FIRE_SEQUENCE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "broadside-fire-sequence.png",
);
export const DEFAULT_BROADSIDE_ACCEPTANCE_SEQUENCE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "broadside-acceptance-sequence.png",
);
export const DEFAULT_PLAYER_RESPAWN_SEQUENCE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "player-respawn-sequence.png",
);
export const DEFAULT_BROADSIDE_CADENCE_SEQUENCE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "broadside-cadence-sequence.png",
);
export const DEFAULT_BROADSIDE_SPEED_SEQUENCE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "broadside-speed-sequence.png",
);
export const DEFAULT_DIFFICULTY_SPEED_COMPARISON_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "difficulty-speed-comparison.png",
);
export const DEFAULT_FLAGSHIP_SECTOR_SEQUENCE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "flagship-sector-sequence.png",
);
export const DEFAULT_HEAVY_SHELL_DETAIL_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "heavy-shell-detail-sequence.png",
);
export const DEFAULT_CAPITAL_EXPLOSION_SEQUENCE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "capital-hull-explosion-sequence.png",
);
export const DEFAULT_CAPITAL_EXPLOSION_AUDIO_TRACE_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "capital-explosion-pokey-trace.csv",
);
export const DEFAULT_ENGINE_BANK_SEQUENCE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "capital-engine-bank-sequence.png",
);
export const DEFAULT_PROW_SEQUENCE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "capital-prow-sequence.png",
);
export const DEFAULT_ENEMY_FIGHTER_LIMITS_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "enemy-fighter-corridor-limits.png",
);
export const DEFAULT_ENEMY_REFERENCE_INVENTORY_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "enemy-reference-inventory.png",
);
export const DEFAULT_ENEMY_ANCHOR_COMPARISON_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "enemy-anchor-comparison.png",
);
export const DEFAULT_ENEMY_NATIVE_SPRITES_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "enemy-native-sprites.png",
);
export const DEFAULT_ENEMY_REVIEW_HARNESS_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "enemy-review-harness-sequence.png",
);
export const DEFAULT_ENEMY_SCANNER_COMPARISON_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "enemy-scanner-techniques.png",
);
export const DEFAULT_ENEMY_BEFORE_AFTER_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "enemy-interceptor-before-after.png",
);
export const DEFAULT_ENEMY_PALETTE_HOSTILE_OXBLOOD_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "enemy-palette-hostile-oxblood.png",
);
export const DEFAULT_ENEMY_PALETTE_HOSTILE_BURGUNDY_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "enemy-interceptor-hostile-burgundy-comparison.png",
);
export const DEFAULT_ENEMY_PALETTE_HOSTILE_SCARLET_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "enemy-palette-hostile-scarlet.png",
);
export const DEFAULT_ENEMY_COMBAT_SEQUENCE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "enemy-single-pulse-combat-sequence.png",
);
export const DEFAULT_PROJECTILE_VISUAL_LANGUAGE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "projectile-visual-language.png",
);
export const DEFAULT_PROJECTILE_COLLISION_SCORING_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "projectile-collision-scoring-sequence.png",
);
export const DEFAULT_INTERCEPTOR_NATURAL_FIRE_TRACE_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "interceptor-natural-fire-trace.csv",
);
export const DEFAULT_FIGHTER_BURST_RUNTIME_TRACE_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "fighter-burst-runtime-trace.csv",
);
export const DEFAULT_FIGHTER_WEAPON_TRANSITION_TRACE_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "fighter-weapon-transition-trace.csv",
);
export const DEFAULT_SHARED_FIGHTER_EXPLOSION_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "shared-fighter-explosion-sequence.png",
);
export const DEFAULT_SHARED_FIGHTER_EXPLOSION_TRACE_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "shared-fighter-explosion-trace.csv",
);
export const DEFAULT_EXPLOSION_FLASH_NATIVE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "explosion-colour-flash-native.png",
);
export const DEFAULT_EXPLOSION_FLASH_COMPARISON_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "explosion-colour-flash-comparison.png",
);
export const DEFAULT_EXPLOSION_FLASH_TRACE_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "explosion-colour-flash-trace.csv",
);
export const DEFAULT_DEBRIS_REVIEW_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "debris-visual-polish-review.png",
);
export const DEFAULT_DEBRIS_REVIEW_TRACE_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "debris-visual-polish-trace.csv",
);
export const DEFAULT_DESTRUCTIBLE_DEBRIS_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "destructible-debris-review.png",
);
export const DEFAULT_DESTRUCTIBLE_DEBRIS_TRACE_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "destructible-debris-trace.csv",
);
export const DEFAULT_INTERCEPTOR_BREAKUP_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "enemy-interceptor-breakup-review.png",
);
export const DEFAULT_INTERCEPTOR_BREAKUP_TRACE_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "enemy-interceptor-breakup-trace.csv",
);
export const DEFAULT_WEAPON_PICKUP_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "weapon-pickup-rapid-fire-review.png",
);
export const DEFAULT_WEAPON_PICKUP_TRACE_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "weapon-pickup-rapid-fire-trace.csv",
);
export const DEFAULT_HUD_PRESENTATION_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "hud-presentation-review.png",
);
export const DEFAULT_HUD_PRESENTATION_NATIVE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "hud-presentation-native.png",
);
export const DEFAULT_SPREAD_SHOT_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "weapon-pickup-spread-shot-review.png",
);
export const DEFAULT_SPREAD_SHOT_TRACE_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "weapon-pickup-spread-shot-trace.csv",
);
export const DEFAULT_SHIELD_BOOSTER_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "weapon-pickup-shield-review.png",
);
export const DEFAULT_PROJECTILE_COLOUR_XEX_PREVIEW_PATH = path.join(
  rootDirectory, "build", "previews", "weapon-projectile-colour-regression-xex.png",
);
export const DEFAULT_PROJECTILE_COLOUR_ATR_PREVIEW_PATH = path.join(
  rootDirectory, "build", "previews", "weapon-projectile-colour-regression-atr.png",
);
export const DEFAULT_PLAYER_FIGHTER_BURST_BALANCE_XEX_PREVIEW_PATH = path.join(
  rootDirectory, "build", "previews", "weapon-burst-balance-xex.png",
);
export const DEFAULT_PLAYER_FIGHTER_BURST_BALANCE_ATR_PREVIEW_PATH = path.join(
  rootDirectory, "build", "previews", "weapon-burst-balance-atr.png",
);
export const DEFAULT_PLAYER_FIGHTER_BURST_BALANCE_XEX_TRACE_PATH = path.join(
  rootDirectory, "build", "previews", "weapon-burst-balance-xex.csv",
);
export const DEFAULT_PLAYER_FIGHTER_BURST_BALANCE_ATR_TRACE_PATH = path.join(
  rootDirectory, "build", "previews", "weapon-burst-balance-atr.csv",
);
export const DEFAULT_SPREAD_SHOT_HULL_XEX_PREVIEW_PATH = path.join(
  rootDirectory, "build", "previews", "weapon-pickup-spread-shot-hulls-xex.png",
);
export const DEFAULT_SPREAD_SHOT_HULL_ATR_PREVIEW_PATH = path.join(
  rootDirectory, "build", "previews", "weapon-pickup-spread-shot-hulls-atr.png",
);
export const DEFAULT_SPREAD_SHOT_HULL_XEX_TRACE_PATH = path.join(
  rootDirectory, "build", "previews", "weapon-pickup-spread-shot-hulls-xex.csv",
);
export const DEFAULT_SPREAD_SHOT_HULL_ATR_TRACE_PATH = path.join(
  rootDirectory, "build", "previews", "weapon-pickup-spread-shot-hulls-atr.csv",
);
const DEFAULT_CAPITAL_HULLS_DEFINITION_PATH = path.join(
  rootDirectory,
  "assets",
  "graphics",
  "capital-hulls.json",
);
const DEFAULT_ENEMY_ROSTER_DEFINITION_PATH = path.join(
  rootDirectory,
  "assets",
  "graphics",
  "enemy-roster.json",
);
const DEFAULT_CAPITAL_HULLS_ANTIC2_DEFINITION_PATH = path.join(
  rootDirectory,
  "assets",
  "graphics",
  "capital-hulls-antic2-prototype.json",
);
const DEFAULT_STARFIELD_DEFINITION_PATH = path.join(
  rootDirectory,
  "assets",
  "graphics",
  "starfield.json",
);
const DEFAULT_ENTITY_EFFECTS_DEFINITION_PATH = path.join(
  rootDirectory,
  "assets",
  "graphics",
  "entity-effects.json",
);

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function stripComment(line) {
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') {
      quoted = !quoted;
    } else if (line[index] === ";" && !quoted) {
      return line.slice(0, index);
    }
  }
  return line;
}

function expandDefines(source) {
  const defines = new Map();
  const lines = source.split(/\r?\n/).map((rawLine) => {
    const definition = /^\s*\.define\s+([A-Za-z_][A-Za-z0-9_]*)\s+(.+?)\s*$/.exec(
      stripComment(rawLine),
    );
    if (definition) {
      defines.set(definition[1], definition[2]);
      return "";
    }
    return rawLine;
  });
  if (defines.size === 0) {
    return source;
  }
  const pattern = new RegExp(`\\b(?:${[...defines.keys()].join("|")})\\b`, "g");
  return lines.map((line) => line.replace(pattern, (name) => defines.get(name))).join("\n");
}

function normalizeExpression(expression, constants) {
  let normalized = expression
    .replace(/\$([0-9a-f]+)/gi, "0x$1")
    .replace(/%([01]+)/g, "0b$1");

  normalized = normalized.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, (name) => {
    if (!constants.has(name)) {
      throw new Error(`Unknown ca65 constant in preview source: ${name}`);
    }
    return String(constants.get(name));
  });

  if (!/^[\dA-Fa-fxob()+\-*/|&<>\s]+$/.test(normalized)) {
    throw new Error(`Unsupported ca65 expression in preview source: ${expression}`);
  }
  return normalized;
}

export function evaluateExpression(expression, constants) {
  const trimmed = expression
    .trim()
    .replace(/\.strlen\(\s*("(?:[^"\\]|\\.)*")\s*\)/g, (_match, literal) =>
      String(JSON.parse(literal).length),
    );
  if (trimmed.startsWith("<")) {
    return evaluateExpression(trimmed.slice(1), constants) & 0xff;
  }
  if (trimmed.startsWith(">")) {
    return (evaluateExpression(trimmed.slice(1), constants) >>> 8) & 0xff;
  }
  const normalized = normalizeExpression(trimmed, constants);
  const value = Function(`"use strict"; return (${normalized});`)();
  if (!Number.isInteger(value)) {
    throw new Error(`Non-integer ca65 expression in preview source: ${expression}`);
  }
  return value;
}

function parseConstants(source) {
  source = expandDefines(source);
  const pending = [];
  for (const rawLine of source.split(/\r?\n/)) {
    const line = stripComment(rawLine).trim();
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(line);
    if (match && match[2].trim() !== "*") {
      pending.push({ name: match[1], expression: match[2] });
    }
  }

  const constants = new Map();
  while (pending.length > 0) {
    let resolved = 0;
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      try {
        const value = evaluateExpression(pending[index].expression, constants);
        constants.set(pending[index].name, value);
        pending.splice(index, 1);
        resolved += 1;
      } catch (error) {
        if (!String(error.message).startsWith("Unknown ca65 constant")) {
          throw error;
        }
      }
    }
    if (resolved === 0) {
      break;
    }
  }
  return constants;
}

function splitByteArguments(argumentsText) {
  const argumentsList = [];
  let start = 0;
  let quoted = false;
  for (let index = 0; index < argumentsText.length; index += 1) {
    const character = argumentsText[index];
    if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      argumentsList.push(argumentsText.slice(start, index).trim());
      start = index + 1;
    }
  }
  argumentsList.push(argumentsText.slice(start).trim());
  return argumentsList.filter(Boolean);
}

function parseDataLines(lines, constants) {
  const bytes = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = stripComment(lines[index]).trim();
    if (!line) {
      continue;
    }

    const repeatMatch = /^\.repeat\s+(.+)$/.exec(line);
    if (repeatMatch) {
      let depth = 1;
      let endIndex = index + 1;
      for (; endIndex < lines.length; endIndex += 1) {
        const nestedLine = stripComment(lines[endIndex]).trim();
        if (/^\.repeat\b/.test(nestedLine)) {
          depth += 1;
        } else if (/^\.endrepeat\b/.test(nestedLine)) {
          depth -= 1;
          if (depth === 0) {
            break;
          }
        }
      }
      if (depth !== 0) {
        throw new Error("Unterminated .repeat block in preview source");
      }

      const repetitions = evaluateExpression(repeatMatch[1], constants);
      const repeatedBytes = parseDataLines(lines.slice(index + 1, endIndex), constants);
      for (let repetition = 0; repetition < repetitions; repetition += 1) {
        bytes.push(...repeatedBytes);
      }
      index = endIndex;
      continue;
    }

    if (/^\.endrepeat\b/.test(line) || /^\.assert\b/.test(line)) {
      continue;
    }

    const byteMatch = /^\.byte\s+(.+)$/.exec(line);
    const wordMatch = /^\.word\s+(.+)$/.exec(line);
    if (!byteMatch && !wordMatch) {
      continue;
    }

    for (const argument of splitByteArguments((byteMatch ?? wordMatch)[1])) {
      if (argument.startsWith('"')) {
        if (wordMatch) {
          throw new Error("Preview source cannot encode a string with .word");
        }
        const text = JSON.parse(argument);
        for (const character of text) {
          const code = character.codePointAt(0);
          if (code > 0x7f) {
            throw new Error("Preview source contains a non-ASCII .byte string");
          }
          bytes.push(code);
        }
      } else {
        const value = evaluateExpression(argument, constants);
        if (byteMatch && (value < -128 || value > 0xff)) {
          throw new Error(`Preview source byte is out of range: ${argument}`);
        }
        if (wordMatch && (value < -32768 || value > 0xffff)) {
          throw new Error(`Preview source word is out of range: ${argument}`);
        }
        bytes.push(value & 0xff);
        if (wordMatch) {
          bytes.push((value >>> 8) & 0xff);
        }
      }
    }
  }

  return Uint8Array.from(bytes);
}

function extractLabeledData(source, label, constants, endLabel) {
  source = expandDefines(source);
  const lines = source.split(/\r?\n/);
  const labelPattern = new RegExp(`^${label}:\\s*$`);
  const startIndex = lines.findIndex((line) => labelPattern.test(stripComment(line).trim()));
  if (startIndex < 0) {
    throw new Error(`Missing preview source label: ${label}`);
  }

  let endIndex = startIndex + 1;
  for (; endIndex < lines.length; endIndex += 1) {
    const line = stripComment(lines[endIndex]);
    const foundLabel = /^([A-Za-z_][A-Za-z0-9_]*):\s*$/.exec(line.trim());
    if (
      foundLabel &&
      (endLabel ? foundLabel[1] === endLabel : true)
    ) {
      break;
    }
  }
  return parseDataLines(lines.slice(startIndex + 1, endIndex), constants);
}

function extractRoutine(source, label) {
  source = expandDefines(source);
  const lines = source.split(/\r?\n/);
  const labelPattern = new RegExp(`^${label}:\\s*$`);
  const startIndex = lines.findIndex((line) => labelPattern.test(stripComment(line).trim()));
  if (startIndex < 0) {
    throw new Error(`Missing preview source routine: ${label}`);
  }

  let endIndex = startIndex + 1;
  for (; endIndex < lines.length; endIndex += 1) {
    const line = stripComment(lines[endIndex]);
    if (/^[A-Za-z_][A-Za-z0-9_]*:\s*$/.test(line.trim())) {
      break;
    }
  }
  return lines.slice(startIndex + 1, endIndex);
}

function extractConstantStores(lines, constants) {
  const stores = new Map();
  let accumulator;

  for (const rawLine of lines) {
    const line = stripComment(rawLine).trim();
    const loadMatch = /^lda\s+#(.+)$/i.exec(line);
    if (loadMatch) {
      try {
        accumulator = evaluateExpression(loadMatch[1], constants) & 0xff;
      } catch {
        accumulator = undefined;
      }
      continue;
    }

    const storeMatch = /^sta\s+([A-Za-z_][A-Za-z0-9_]*(?:\+\d+)?)$/i.exec(line);
    if (storeMatch) {
      if (accumulator !== undefined && !stores.has(storeMatch[1])) {
        stores.set(storeMatch[1], accumulator);
      }
      continue;
    }

    if (/^(?:jsr|lda|adc|sbc|and|ora|eor|pla|txa|tya|asl|lsr|rol|ror)\b/i.test(line)) {
      accumulator = undefined;
    }
  }

  return stores;
}

function requireValue(map, name) {
  if (!map.has(name)) {
    throw new Error(`Missing preview source value: ${name}`);
  }
  return map.get(name);
}

function requireLength(name, bytes, expectedLength) {
  if (bytes.length !== expectedLength) {
    throw new Error(
      `${name} has ${bytes.length} bytes; expected ${expectedLength} in preview source`,
    );
  }
}

function buildGameplayHudCharset(frontendGlyphRows, constants, baseCharset) {
  const charset = new Uint8Array(1024);
  const copyGlyph = (sourceIndex, destinationIndex) => {
    charset.set(
      frontendGlyphRows.subarray(sourceIndex * 7, sourceIndex * 7 + 7),
      destinationIndex * CHARACTER_HEIGHT,
    );
    charset[destinationIndex * CHARACTER_HEIGHT + 7] = 0xff;
  };
  for (let digit = 0; digit < 10; digit += 1) {
    copyGlyph(digit, requireValue(constants, "CH_ZERO") + digit);
  }
  for (let letter = 0; letter < 26; letter += 1) {
    copyGlyph(10 + letter, requireValue(constants, "CH_HUD_A") + letter);
  }
  const hullFull = requireValue(constants, "CH_HUD_HULL_FULL");
  const hullDamaged = requireValue(constants, "CH_HUD_HULL_DAMAGED");
  charset.set(
    baseCharset.subarray(hullFull * CHARACTER_HEIGHT, (hullDamaged + 1) * CHARACTER_HEIGHT),
    hullFull * CHARACTER_HEIGHT,
  );
  charset[7] = 0xff;
  charset[requireValue(constants, "CH_HUD_BOOSTER_FULL") * CHARACTER_HEIGHT + 7] = 0xff;
  return charset;
}

export function readGameGraphicsSource(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
  enemyRosterDefinition = loadEnemyRosterDefinition(DEFAULT_ENEMY_ROSTER_DEFINITION_PATH),
) {
  const capitalHulls = compileCapitalHulls(capitalHullsDefinition);
  const enemyRoster = compileEnemyRoster(enemyRosterDefinition, rootDirectory);
  const fighterWeapons = compileFighterWeapons(loadFighterWeaponsDefinition(
    path.join(rootDirectory, "assets", "graphics", "fighter-weapons.json"),
  ), enemyRoster);
  const starfield = compileStarfield(loadStarfieldDefinition(
    DEFAULT_STARFIELD_DEFINITION_PATH,
  ));
  const releaseEnemy = enemyRoster.implemented.find(
    ({ id }) => id === enemyRoster.runtime.releaseArchetype,
  );
  const constants = parseConstants(source);
  for (const [name, value] of [
    ["CAPITAL_HULL_GLYPH_BASE", capitalHulls.definition.charsetBaseIndex],
    ["CAPITAL_HULL_GLYPH_COUNT", capitalHulls.glyphs.length],
    ["CAPITAL_HULL_SEGMENT_ROWS", capitalHulls.segmentRows],
    ["CAPITAL_HULL_PREVIEW_START_PHASE", capitalHulls.previewStartPhase],
    ["CAPITAL_HULL_MAP_COLUMNS", capitalHulls.mapColumns],
    ["CAPITAL_HULL_PACKED_ROW_BYTES", capitalHulls.packedRowBytes],
    ["ENEMY_IMPLEMENTED_COUNT", enemyRoster.implemented.length],
    ["ENEMY_RELEASE_ARCHETYPE", releaseEnemy.index],
    ["ENEMY_FRAME_STRIDE", enemyRoster.runtime.frameStride],
    ["ENEMY_ACCENT_FRAME_COUNT", enemyRoster.runtime.accentFrames],
    ["ENEMY_ANIMATION_PHASE_FRAMES", enemyRoster.runtime.animationPhaseFrames],
    ["ENEMY_ANIMATION_CYCLE_FRAMES",
      enemyRoster.runtime.accentFrames * enemyRoster.runtime.animationPhaseFrames],
    ["ENEMY_RELEASE_VISIBLE_WIDTH", releaseEnemy.visibleWidth],
    ["ENEMY_RELEASE_FRAME_HEIGHT", releaseEnemy.height],
    ["ENEMY_BODY_COLOR", enemyRoster.runtime.colourPolicy.bodyValue],
    ["ENEMY_RUNTIME_BODY_COLOR", enemyRoster.runtime.colourPolicy.bodyValue],
    ["ENEMY_SCANNER_COLOR", enemyRoster.runtime.colourPolicy.accentValue],
    ["HUD_TOP", fighterWeapons.viewport.hudTop],
    ["HUD_BOTTOM", fighterWeapons.viewport.hudBottom],
    ["GAMEPLAY_TOP", fighterWeapons.viewport.gameplayTop],
    ["GAMEPLAY_BOTTOM", fighterWeapons.viewport.gameplayBottom],
    ["PLAYER_RESPAWN_Y", fighterWeapons.viewport.gameplayBottom - 15],
    ["PLAYER_FIGHTER_PROJECTILE_COLOR", fighterWeapons.player_fighter.colourValue],
    ["INTERCEPTOR_PROJECTILE_COLOR", fighterWeapons.interceptor.colourValue],
    ["SHARED_FIGHTER_EXPLOSION_TOTAL", fighterWeapons.sharedFighterExplosion.totalFrames],
    ["GAMEPLAY_COLPF2", fighterWeapons.player_fighter.colourValue],
    ["GAMEPLAY_COLPF3", fighterWeapons.interceptor.colourValue],
    ["STAR_FAR_CAPACITY", starfield.farLayer.population],
    ["STAR_FAR_RATE_NUMERATOR", starfield.farLayer.rateNumerator],
    ["STAR_FAR_RATE_DENOMINATOR", starfield.farLayer.rateDenominator],
    ["STAR_NEAR_CAPACITY", starfield.nearLayer.population],
    ["STAR_NEAR_FINE_STEP", starfield.nearLayer.speedPixelsPerFrame],
    ["STAR_FINE_SCANLINES", 8],
    ["STAR_TWINKLE_INTERVAL", starfield.twinkle.intervalFrames],
    ["STAR_GENERATION_SEED", starfield.generationSeed],
  ]) {
    constants.set(name, value);
  }
  enemyRoster.inventory.forEach(({ id }, index) => constants.set(`ENEMY_ARCHETYPE_${id}`, index));
  constants.set("ENEMY_X_MIN", releaseEnemy.logicalBounds[0]);
  constants.set("ENEMY_X_MAX", releaseEnemy.logicalBounds[1]);
  constants.set("ENEMY_VISIBLE_WIDTH", releaseEnemy.visibleWidth);
  constants.set("ENEMY_X_RANGE", releaseEnemy.logicalBounds[1] - releaseEnemy.logicalBounds[0]);
  constants.set(
    "ENEMY_SPAWN_X",
    releaseEnemy.logicalBounds[0] +
      Math.floor((releaseEnemy.logicalBounds[1] - releaseEnemy.logicalBounds[0]) / 2),
  );
  const initialState = extractConstantStores(extractRoutine(source, "init_state"), constants);
  const frontendHardwareState = extractConstantStores(
    extractRoutine(source, "finish_startup_after_loader"),
    constants,
  );
  const gameplayHardwareState = new Map(frontendHardwareState);
  const gameplayEntryState = extractConstantStores(
    extractRoutine(source, "start_gameplay"),
    constants,
  );
  const gameplayDliState = extractConstantStores(
    extractRoutine(source, "gameplay_dli"),
    constants,
  );
  for (const register of ["COLPF0", "COLPF1", "COLPF2", "COLPF3"]) {
    const value = gameplayDliState.get(register) ?? gameplayEntryState.get(register) ??
      gameplayHardwareState.get(register);
    if (value === undefined) throw new Error(`Gameplay palette does not define ${register}`);
    gameplayHardwareState.set(register, value);
  }
  for (const register of ["SIZEP0", "SIZEP3"]) {
    gameplayHardwareState.set(
      register,
      requireValue(gameplayEntryState, register),
    );
  }

  const baseCharset = extractLabeledData(
    source,
    "charset_data",
    constants,
    "charset_fixed_frontend_end",
  );
  requireLength("fixed frontend charset source", baseCharset, 16 * CHARACTER_HEIGHT);
  const charset = new Uint8Array(1024);
  charset.set(baseCharset);
  charset.set(
    capitalHulls.glyphBytes,
    capitalHulls.definition.charsetBaseIndex * CHARACTER_HEIGHT,
  );
  const frontendGlyphRows = frontendH31Asset.fontRows;
  requireLength("frontend glyph rows", frontendGlyphRows, 43 * 7);
  const hudCharset = buildGameplayHudCharset(frontendGlyphRows, constants, baseCharset);
  const shieldHudGlyph = extractLabeledData(
    source, "hud_shield_booster_glyph", constants, "hud_shield_booster_glyph_end",
  );
  requireLength("Shield HUD glyph", shieldHudGlyph, CHARACTER_HEIGHT);
  hudCharset.set(shieldHudGlyph,
    requireValue(constants, "CH_HUD_BOOSTER_SHIELD") * CHARACTER_HEIGHT);
  charset.set(
    frontendGlyphRows,
    capitalHulls.definition.charsetBaseIndex * CHARACTER_HEIGHT + capitalHulls.glyphBytes.length,
  );
  const sourceCharset = Uint8Array.from(charset);
  charset.set(
    fighterWeapons.glyphs.player_fighter.flat(),
    fighterWeapons.glyphLayout.player_fighterBase * CHARACTER_HEIGHT,
  );
  charset.set(starfield.glyphBytes, starfield.glyphs[0].screenCode * CHARACTER_HEIGHT);

  const hudHardwareState = new Map(gameplayHardwareState);
  for (const register of ["COLPF1", "COLPF2", "COLBK"]) {
    hudHardwareState.set(register, requireValue(gameplayEntryState, register));
  }

  // Runtime A2 keeps HUD and divider LMS operands fixed, then maps the canonical ring.
  // ring. Preview uses the exact accepted head-zero address sequence.
  const screenAddress = requireValue(constants, "SCREEN");
  const gameplayDisplayList = Uint8Array.from([
    0xc2, screenAddress & 0xff, screenAddress >>> 8,
    0x44, (screenAddress + 40) & 0xff, (screenAddress + 40) >>> 8,
    ...Array.from({ length: canonicalPlayfield.ringRows }, (_, row) => {
      const address = screenAddress + (row + 2) * 40;
      return [row === canonicalPlayfield.ringRows - 1 ? 0xc4 : 0x44,
        address & 0xff, address >>> 8];
    }).flat(),
  ]);
  const gameplayLayout = decodeMainMenuDisplayList(
    gameplayDisplayList,
    requireValue(constants, "SCREEN"),
    GAMEPLAY_SCREEN_ROWS * CHARACTER_HEIGHT,
    false,
    GAMEPLAY_SCREEN_ROWS * SCREEN_COLUMNS,
  );

  const mainMenuHardwareState = new Map(frontendHardwareState);
  const mainMenuPaletteState = extractConstantStores(
    extractRoutine(source, "set_frontend_standard_palette"),
    constants,
  );
  for (const register of ["COLBK", "COLPF0", "COLPF1", "COLPF2", "COLPF3"]) {
    mainMenuHardwareState.set(
      register,
      requireValue(mainMenuPaletteState, register),
    );
  }
  const frontendHintHardwareState = new Map(mainMenuHardwareState);
  const hintDliState = extractConstantStores(
    extractRoutine(source, "frontend_hint_dli"),
    constants,
  );
  for (const register of ["COLPF1", "COLPF2"]) {
    frontendHintHardwareState.set(register, requireValue(hintDliState, register));
  }

  const graphics = {
    constants,
    hud: extractLabeledData(source, "hud_ascii", constants),
    playerShape: extractLabeledData(source, "player_shape", constants),
    playerEngineShape: extractLabeledData(source, "player_engine_shape", constants),
    enemyRoster,
    fighterWeapons,
    starfield,
    releaseEnemy,
    enemyShape: releaseEnemy.bodyRows,
    scannerShape: releaseEnemy.accentFrameBytes,
    capitalHulls,
    alliedHullRows: capitalHulls.decodedMaps.get("allied"),
    enemyHullRows: capitalHulls.decodedMaps.get("enemy"),
    alliedSectorRows: capitalHulls.sector.sectorScreenRowsBySide.get("allied"),
    enemySectorRows: capitalHulls.sector.sectorScreenRowsBySide.get("enemy"),
    charset,
    sourceCharset,
    hudCharset,
    gameplayDisplayList,
    gameplayLayout,
    initialState,
    hardwareState: gameplayHardwareState,
    hudHardwareState,
    frontendHardwareState,
    mainMenuHardwareState,
    frontendHintHardwareState,
  };

  requireLength("player_shape", graphics.playerShape, requireValue(constants, "PLAYER_H"));
  requireLength(
    "player_engine_shape",
    graphics.playerEngineShape,
    requireValue(constants, "PLAYER_H"),
  );
  requireLength("release enemy body", graphics.enemyShape, releaseEnemy.height);
  requireLength(
    "release enemy scanner frames",
    graphics.scannerShape,
    enemyRoster.runtime.frameStride * enemyRoster.runtime.accentFrames,
  );
  requireLength("charset_data", graphics.charset, 1024);
  requireLength("HUD charset", graphics.hudCharset, 1024);

  const gameplayModes = graphics.gameplayLayout.rows.map(({ mode }) => mode);
  if (
    gameplayModes.length !== GAMEPLAY_SCREEN_ROWS ||
    gameplayModes[0] !== 2 ||
    gameplayModes.slice(1).some((mode) => mode !== 4)
  ) {
    throw new Error("Preview source does not contain one ANTIC 2 HUD row and 28 ANTIC 4 playfield rows");
  }

  return graphics;
}

function decodeMainMenuDisplayList(
  bytes,
  screenAddress,
  expectedHeight = SOURCE_HEIGHT,
  countBlankRows = false,
  maximumScreenBytes = 1024,
) {
  const rows = [];
  let offset = 0;
  let screenOffset = 0;
  let y = 0;

  while (offset < bytes.length && y < expectedHeight) {
    const opcode = bytes[offset];
    offset += 1;
    const mode = opcode & 0x0f;
    if (mode === 0) {
      if (countBlankRows) y += 8;
      continue;
    }
    if (![2, 4, 6, 7].includes(mode)) {
      throw new Error(`Unsupported main-menu ANTIC mode ${mode}`);
    }
    if (opcode & 0x40) {
      if (offset + 2 > bytes.length) {
        throw new Error("Truncated main-menu LMS instruction");
      }
      const address = bytes[offset] | (bytes[offset + 1] << 8);
      screenOffset = address - screenAddress;
      offset += 2;
    }
    const columns = mode === 6 || mode === 7 ? 20 : 40;
    const height = mode === 7 ? 16 : 8;
    rows.push({
      index: rows.length,
      mode,
      columns,
      height,
      y,
      screenOffset,
      dli: (opcode & 0x80) !== 0,
    });
    screenOffset += columns;
    y += height;
  }

  if (y !== expectedHeight || screenOffset > maximumScreenBytes) {
    throw new Error(`Frontend display list does not describe a bounded 320x${expectedHeight} screen`);
  }
  return { rows, screenBytes: screenOffset, height: expectedHeight };
}

function decodeFrontendScreen(bytes, screenAddress, layout) {
  const records = [];
  let offset = 0;

  while (offset < bytes.length && bytes[offset] !== 0xff) {
    if (offset + 2 > bytes.length) {
      throw new Error("Frontend screen record has a truncated address");
    }
    const address = bytes[offset] | (bytes[offset + 1] << 8);
    offset += 2;
    const textBytes = [];
    while (offset < bytes.length && bytes[offset] !== 0) {
      textBytes.push(bytes[offset]);
      offset += 1;
    }
    if (offset >= bytes.length) {
      throw new Error("Frontend screen record has unterminated text");
    }
    offset += 1;

    const screenOffset = address - screenAddress;
    if (
      screenOffset < 0 ||
      screenOffset >= 1024 ||
      screenOffset + textBytes.length > 1024
    ) {
      throw new Error("Frontend screen record lies outside display memory");
    }
    const displayRow = layout?.rows.find(
      (row) => screenOffset >= row.screenOffset &&
        screenOffset + textBytes.length <= row.screenOffset + row.columns,
    );
    if (layout && !displayRow) {
      throw new Error("Frontend screen record crosses a mixed-mode row boundary");
    }
    records.push({
      address,
      screenOffset,
      row: displayRow?.index,
      y: displayRow?.y,
      mode: displayRow?.mode,
      column: displayRow ? screenOffset - displayRow.screenOffset : undefined,
      text: String.fromCharCode(...textBytes),
      textBytes: Uint8Array.from(textBytes),
    });
  }

  if (offset >= bytes.length || bytes[offset] !== 0xff) {
    throw new Error("Frontend screen data is missing its $FF terminator");
  }
  return records;
}

export function readFrontendGraphicsSource(source) {
  const graphics = readGameGraphicsSource(source);
  const screenAddress = requireValue(graphics.constants, "SCREEN");
  const mainMenuDisplayList = extractLabeledData(
    source,
    "main_menu_display_list",
    graphics.constants,
    "main_menu_display_list_jvb",
  );
  const mainMenuLayout = decodeMainMenuDisplayList(
    mainMenuDisplayList,
    screenAddress,
    216,
    true,
  );
  const glyphRows = frontendH31Asset.fontRows;
  requireLength(
    "frontend 6x7 glyph rows",
    glyphRows,
    requireValue(graphics.constants, "FRONTEND_GLYPH_COUNT") * 7,
  );
  const frontendCharset = new Uint8Array(1024);
  const firstGlyph = requireValue(graphics.constants, "CH_FRONT_ZERO");
  for (let glyph = 0; glyph < glyphRows.length / 7; glyph += 1) {
    frontendCharset.set(
      glyphRows.subarray(glyph * 7, glyph * 7 + 7),
      (firstGlyph + glyph) * CHARACTER_HEIGHT,
    );
  }
  frontendCharset.set(frontendH31Asset.extendedGlyphs, 48 * CHARACTER_HEIGHT);
  const markerBytes = extractLabeledData(
    source,
    "frontend_marker_positions",
    graphics.constants,
  );
  requireLength("frontend_marker_positions", markerBytes, 26);

  const markerAddresses = [];
  for (let offset = 0; offset < markerBytes.length; offset += 2) {
    markerAddresses.push(markerBytes[offset] | (markerBytes[offset + 1] << 8));
  }

  return {
    ...graphics,
    frontendCharset,
    mainMenuDisplayList,
    mainMenuLayout,
    mainMenuRecords: decodeFrontendScreen(
      extractLabeledData(source, "main_menu_screen_data", graphics.constants),
      screenAddress,
      mainMenuLayout,
    ),
    markerAddresses,
    defaultSelection: requireValue(
      graphics.constants,
      "FRONTEND_DEFAULT_SELECTION",
    ),
  };
}

function nextRandomByte(state) {
  const carry = state & 1;
  let next = state >>> 1;
  if (carry) {
    next ^= 0xb8;
  }
  return next;
}

function writeCanonicalCorridorRow(screen, row, phase, graphics, rngState) {
  const { constants } = graphics;
  const rowStart = row * SCREEN_COLUMNS;
  const space = requireValue(constants, "CH_SPACE");
  screen.fill(space, rowStart, rowStart + SCREEN_COLUMNS);
  const alliedRow = Number.isInteger(phase) && phase >= 0 &&
      phase < graphics.capitalHulls.sector.totalRows
    ? graphics.alliedSectorRows[phase]
    : null;
  const enemyPhase = Number.isInteger(phase) &&
      phase >= graphics.capitalHulls.sector.sidePhaseRows
    ? phase - graphics.capitalHulls.sector.sidePhaseRows
    : null;
  const enemyRow = Number.isInteger(enemyPhase) && enemyPhase >= 0 &&
      enemyPhase < graphics.capitalHulls.sector.totalRows
    ? graphics.enemySectorRows[enemyPhase]
    : null;

  for (let column = 0; column < graphics.capitalHulls.mapColumns; column += 1) {
    if (alliedRow) screen[rowStart + column] = alliedRow[column];
    if (enemyRow) screen[rowStart + 31 + column] = enemyRow[column];
  }

  let nextRngState = rngState;
  for (let column = 8; column < 32; column += 1) {
    if (screen[rowStart + column] !== space) continue;
    nextRngState = nextRandomByte(nextRngState);
    if ((nextRngState & 0x0f) !== 0) continue;
    nextRngState = nextRandomByte(nextRngState);
    screen[rowStart + column] =
      (nextRngState & 0x03) === 0
        ? requireValue(constants, "CH_STAR")
        : requireValue(constants, "CH_DOT");
  }
  return nextRngState;
}

function createCanonicalScreenRuntimeState(
  graphics,
  { sectorPhase = graphics.capitalHulls.sector.previewSectorRow } = {},
) {
  const { constants, initialState } = graphics;
  const screen = new Uint8Array(SCREEN_COLUMNS * GAMEPLAY_SCREEN_ROWS);
  screen.fill(requireValue(constants, "CH_SPACE"));

  for (let index = 0; index < graphics.hud.length && graphics.hud[index] !== 0; index += 1) {
    screen[index] = (graphics.hud[index] - 0x20) & 0xff;
  }
  let rngState = requireValue(initialState, "rng_state");
  const starfieldState = createStarfieldState(graphics.starfield);
  const starfieldScreen = composeStarfield(graphics.starfield, starfieldState);
  const corridorPhase = sectorPhase;
  const gameplayFirstRow = requireValue(constants, "GAMEPLAY_FIRST_SCREEN_ROW");
  const visibleRowCount = graphics.capitalHulls.sector.visibleRows;

  for (let row = gameplayFirstRow; row < GAMEPLAY_SCREEN_ROWS; row += 1) {
    const starRow = row - gameplayFirstRow;
    screen.set(
      starfieldScreen.subarray(starRow * SCREEN_COLUMNS, (starRow + 1) * SCREEN_COLUMNS),
      row * SCREEN_COLUMNS,
    );
  }

  const hullBase = requireValue(constants, "CAPITAL_HULL_GLYPH_BASE");
  const hullEnd = hullBase + requireValue(constants, "CAPITAL_HULL_GLYPH_COUNT");
  const space = requireValue(constants, "CH_SPACE");
  const boundaryLeft = new Uint8Array(visibleRowCount);
  const boundaryRight = new Uint8Array(visibleRowCount);
  for (let offset = 0; offset < visibleRowCount; offset += 1) {
    const left = screen[(offset + gameplayFirstRow) * SCREEN_COLUMNS + 8];
    const right = screen[(offset + gameplayFirstRow) * SCREEN_COLUMNS + 31];
    const leftIndex = left & 0x7f;
    const rightIndex = right & 0x7f;
    boundaryLeft[offset] = leftIndex >= hullBase && leftIndex < hullEnd ? space : left;
    boundaryRight[offset] = rightIndex >= hullBase && rightIndex < hullEnd ? space : right;
  }

  const zero = requireValue(constants, "CH_ZERO");
  screen.set([zero, zero, zero, zero, zero], 6);
  const visibleScrolls = Math.min(visibleRowCount, sectorPhase);
  const visibleRows = Array.from({ length: visibleRowCount }, (_, offset) =>
    offset < visibleScrolls ? sectorPhase - 1 - offset : null);
  const state = {
    screen,
    rngState,
    corridorPhase,
    advances: 0,
    hullAdvances: 0,
    boundaryLeft,
    boundaryRight,
    visibleRows,
    drainRows: 0,
    starfieldState,
  };
  renderCanonicalHulls(state, graphics);
  return state;
}

function writeCanonicalStarRow(screen, row, graphics, rngState) {
  const rowStart = row * SCREEN_COLUMNS;
  const space = requireValue(graphics.constants, "CH_SPACE");
  screen.fill(space, rowStart + 8, rowStart + 32);
  let nextRngState = rngState;
  for (let column = 8; column < 32; column += 1) {
    nextRngState = nextRandomByte(nextRngState);
    if ((nextRngState & 0x0f) !== 0) continue;
    nextRngState = nextRandomByte(nextRngState);
    screen[rowStart + column] = (nextRngState & 0x03) === 0
      ? requireValue(graphics.constants, "CH_STAR")
      : requireValue(graphics.constants, "CH_DOT");
  }
  return nextRngState;
}

function renderCanonicalHulls(state, graphics) {
  const gameplayFirstRow = requireValue(graphics.constants, "GAMEPLAY_FIRST_SCREEN_ROW");
  for (let offset = 0; offset < graphics.capitalHulls.sector.visibleRows; offset += 1) {
    const rowStart = (offset + gameplayFirstRow) * SCREEN_COLUMNS;
    state.screen[rowStart + 8] = state.boundaryLeft[offset];
    state.screen[rowStart + 31] = state.boundaryRight[offset];
    state.screen.fill(0, rowStart, rowStart + 8);
    state.screen.fill(0, rowStart + 32, rowStart + 40);
    const sectorRow = state.visibleRows[offset];
    if (sectorRow === null) continue;
    const allied = sectorRow < graphics.capitalHulls.sector.totalRows
      ? graphics.alliedSectorRows[sectorRow]
      : null;
    const enemyRow = sectorRow - graphics.capitalHulls.sector.sidePhaseRows;
    const enemy = enemyRow >= 0 && enemyRow < graphics.capitalHulls.sector.totalRows
      ? graphics.enemySectorRows[enemyRow]
      : null;
    if (allied) {
      state.screen.set(allied.slice(0, 8), rowStart);
      if (allied[8] !== 0) state.screen[rowStart + 8] = allied[8];
    }
    if (enemy) {
      state.screen.set(enemy.slice(1), rowStart + 32);
      if (enemy[0] !== 0) state.screen[rowStart + 31] = enemy[0];
    }
  }
}

function advanceCanonicalScreenRuntimeState(state, graphics) {
  const gameplayFirstRow = requireValue(graphics.constants, "GAMEPLAY_FIRST_SCREEN_ROW");
  state.starfieldState = stepStarfieldWorld(graphics.starfield, state.starfieldState);
  const composed = composeStarfield(graphics.starfield, state.starfieldState);
  for (let row = gameplayFirstRow; row < GAMEPLAY_SCREEN_ROWS; row += 1) {
    const starRow = row - gameplayFirstRow;
    for (let column = 9; column <= 30; column += 1) {
      state.screen[row * SCREEN_COLUMNS + column] =
        composed[starRow * SCREEN_COLUMNS + column];
    }
  }
  const priorRows = graphics.capitalHulls.sector.visibleRows - 1;
  state.boundaryLeft.copyWithin(1, 0, priorRows);
  state.boundaryRight.copyWithin(1, 0, priorRows);
  state.rngState = state.starfieldState.rng;
  state.boundaryLeft[0] = composed[8];
  state.boundaryRight[0] = composed[31];
  renderCanonicalHulls(state, graphics);
  state.advances += 1;
}

function advanceCanonicalHullRuntimeState(state, graphics) {
  state.visibleRows.pop();
  if (state.corridorPhase < graphics.capitalHulls.sector.streamRows) {
    state.visibleRows.unshift(state.corridorPhase);
    state.corridorPhase += 1;
  } else {
    state.visibleRows.unshift(null);
    state.drainRows = Math.min(graphics.capitalHulls.sector.visibleRows,
      (state.drainRows ?? 0) + 1);
  }
  state.hullAdvances += 1;
  renderCanonicalHulls(state, graphics);
}

function createCanonicalScreen(graphics) {
  return createCanonicalScreenRuntimeState(graphics).screen;
}

function encodeFrontendAscii(byte, constants) {
  if (byte === 0x20) return requireValue(constants, "CH_FRONT_SPACE");
  if (byte >= 0x30 && byte <= 0x39) {
    return requireValue(constants, "CH_FRONT_ZERO") + byte - 0x30;
  }
  if (byte >= 0x41 && byte <= 0x5a) {
    return requireValue(constants, "CH_FRONT_A") + byte - 0x41;
  }
  const punctuation = new Map([
    [0x2d, "CH_FRONT_DASH"],
    [0x2e, "CH_FRONT_DOT"],
    [0x2f, "CH_FRONT_SLASH"],
    [0x3a, "CH_FRONT_COLON"],
    [0x3f, "CH_FRONT_QUESTION"],
  ]);
  return requireValue(
    constants,
    punctuation.get(byte) ?? "CH_FRONT_QUESTION",
  );
}

function createStartMenuScreen(graphics, selection) {
  const screen = new Uint8Array(1024);
  const screenAddress = requireValue(graphics.constants, "SCREEN");
  screen.fill(requireValue(graphics.constants, "CH_FRONT_SPACE"));

  for (const record of graphics.mainMenuRecords) {
    const destination = record.address - screenAddress;
    for (let index = 0; index < record.textBytes.length; index += 1) {
      screen[destination + index] = encodeFrontendAscii(
        record.textBytes[index],
        graphics.constants,
      );
    }
  }

  const line = requireValue(graphics.constants, "CH_FRONT_LINE");
  for (const base of ["MAIN_MENU_LINE_TOP_OFFSET", "MAIN_MENU_LINE_BOTTOM_OFFSET"]) {
    const offset = requireValue(graphics.constants, base);
    screen.fill(line, offset + 7, offset + 33);
  }
  const player_fighter = requireValue(graphics.constants, "CH_FRONT_PLAYER_FIGHTER_TOP_LEFT");
  for (let x = 0; x < 3; x += 1) {
    screen[requireValue(graphics.constants, "MAIN_MENU_PLAYER_FIGHTER_TOP_OFFSET") + 18 + x] = player_fighter + x;
    screen[requireValue(graphics.constants, "MAIN_MENU_PLAYER_FIGHTER_BOTTOM_OFFSET") + 18 + x] = player_fighter + 3 + x;
  }
  // The run follows the title record. The runtime takes the same figure from
  // MAIN_MENU_TITLE_LENGTH; tests/frontend.test.mjs holds the two together.
  const title = graphics.mainMenuRecords[0];
  for (let index = 0; index < title.text.length; index += 1) {
    screen[title.address - screenAddress + index] |=
      requireValue(graphics.constants, "ANTIC67_COLOR_PF1");
  }

  if (!Number.isInteger(selection) || selection < 0 || selection >= 4) {
    throw new Error("Main-menu selection must be an index from 0 through 3");
  }
  const markerAddress = graphics.markerAddresses[selection];
  const markerOffset = markerAddress - screenAddress;
  if (markerOffset < 0 || markerOffset >= screen.length) {
    throw new Error("Default menu marker lies outside display memory");
  }
  screen[markerOffset] =
    requireValue(graphics.constants, "CH_FRONT_MARKER") |
    requireValue(graphics.constants, "ANTIC67_COLOR_PF3");
  const highlightXor = requireValue(
    graphics.constants,
    "MAIN_MENU_HIGHLIGHT_XOR",
  );
  for (let offset = 1; offset <= 10; offset += 1) {
    if (screen[markerOffset + offset] !== 0) {
      screen[markerOffset + offset] ^= highlightXor;
    }
  }
  return screen;
}

function drawAnticScreen(
  colorRegisters,
  screen,
  graphics,
  colorRegistersForRow,
  screenRows = SCREEN_ROWS,
) {
  const initialRegisters = colorRegistersForRow?.(0) ?? colorRegisters;
  const pixels = new Uint8Array(SOURCE_WIDTH * screenRows * CHARACTER_HEIGHT);
  const background = requireValue(initialRegisters, "COLBK");
  pixels.fill(background);

  for (let characterRow = 0; characterRow < screenRows; characterRow += 1) {
    const rowRegisters = colorRegistersForRow?.(characterRow) ?? colorRegisters;
    const rowBackground = requireValue(rowRegisters, "COLBK");
    const playfieldColors = [
      rowBackground,
      requireValue(rowRegisters, "COLPF0"),
      requireValue(rowRegisters, "COLPF1"),
    ];
    const normalThirdColor = requireValue(rowRegisters, "COLPF2");
    const inverseThirdColor = requireValue(rowRegisters, "COLPF3");

    for (let column = 0; column < SCREEN_COLUMNS; column += 1) {
      const screenCode = screen[characterRow * SCREEN_COLUMNS + column];
      const characterIndex = screenCode & 0x7f;
      const thirdColor = screenCode & 0x80 ? inverseThirdColor : normalThirdColor;

      for (let characterLine = 0; characterLine < CHARACTER_HEIGHT; characterLine += 1) {
        const pattern = graphics.charset[characterIndex * CHARACTER_HEIGHT + characterLine];
        const y = characterRow * CHARACTER_HEIGHT + characterLine;
        const rowStart = y * SOURCE_WIDTH;

        for (let pixel = 0; pixel < ANTIC_PIXELS_PER_BYTE; pixel += 1) {
          const pixelValue = (pattern >>> (6 - pixel * 2)) & 0x03;
          const registerValue =
            pixelValue === 3 ? thirdColor : playfieldColors[pixelValue];
          const x =
            (column * ANTIC_PIXELS_PER_BYTE + pixel) *
            HIGH_RES_PIXELS_PER_COLOR_CLOCK;
          pixels[rowStart + x] = registerValue;
          pixels[rowStart + x + 1] = registerValue;
        }
      }
    }
  }

  return pixels;
}

function drawGameplayMixedScreen(colorRegisters, screen, graphics) {
  const pixels = drawAnticScreen(colorRegisters, screen, graphics);
  drawAntic2Rows({
    pixels,
    pixelHeight: SOURCE_HEIGHT,
    screen,
    charset: graphics.hudCharset,
    registers: graphics.hudHardwareState,
    firstCharacterRow: 0,
    characterRows: 1,
  });
  pixels.fill(0x0e, 7 * SOURCE_WIDTH, 8 * SOURCE_WIDTH);
  return pixels;
}

function drawMixedMainMenuScreen(screen, graphics) {
  const pixels = new Uint8Array(SOURCE_WIDTH * graphics.mainMenuLayout.height);
  let registers = graphics.mainMenuHardwareState;
  pixels.fill(requireValue(registers, "COLBK"));

  for (const row of graphics.mainMenuLayout.rows) {
    const background = requireValue(registers, "COLBK");
    for (let character = 0; character < row.columns; character += 1) {
      const screenCode = screen[row.screenOffset + character];
      if (row.mode === 2) {
        const characterIndex = screenCode & 0x7f;
        const inverse = (screenCode & 0x80) !== 0;
        for (let line = 0; line < 8; line += 1) {
          const pattern = graphics.frontendCharset[characterIndex * 8 + line];
          for (let bit = 0; bit < 8; bit += 1) {
            const bitmapBit = ((pattern >>> (7 - bit)) & 1) ^ Number(inverse);
            pixels[(row.y + line) * SOURCE_WIDTH + character * 8 + bit] =
              anticFRegisterForBitmapBit(registers, bitmapBit);
          }
        }
      } else if (row.mode === 4) {
        const characterIndex = screenCode & 0x7f;
        const playfieldColors = [
          background,
          requireValue(registers, "COLPF0"),
          requireValue(registers, "COLPF1"),
        ];
        const thirdColor = requireValue(
          registers,
          screenCode & 0x80 ? "COLPF3" : "COLPF2",
        );
        for (let line = 0; line < 8; line += 1) {
          const pattern = graphics.frontendCharset[characterIndex * 8 + line];
          for (let pixel = 0; pixel < 4; pixel += 1) {
            const pixelValue = (pattern >>> (6 - pixel * 2)) & 3;
            const color = pixelValue === 3 ? thirdColor : playfieldColors[pixelValue];
            const x = character * 8 + pixel * 2;
            const output = (row.y + line) * SOURCE_WIDTH + x;
            pixels[output] = color;
            pixels[output + 1] = color;
          }
        }
      } else {
        const characterIndex = screenCode & 0x3f;
        const colorBank = screenCode >>> 6;
        const foreground = requireValue(
          registers,
          ["COLPF0", "COLPF1", "COLPF2", "COLPF3"][colorBank],
        );
        const verticalScale = row.mode === 7 ? 2 : 1;
        for (let line = 0; line < 8; line += 1) {
          const pattern = graphics.frontendCharset[characterIndex * 8 + line];
          for (let scaleY = 0; scaleY < verticalScale; scaleY += 1) {
            const y = row.y + line * verticalScale + scaleY;
            for (let bit = 0; bit < 8; bit += 1) {
              const color = pattern & (0x80 >>> bit) ? foreground : background;
              const x = character * 16 + bit * 2;
              const output = y * SOURCE_WIDTH + x;
              pixels[output] = color;
              pixels[output + 1] = color;
            }
          }
        }
      }
    }
    if (row.dli) {
      registers = graphics.frontendHintHardwareState;
    }
  }
  return pixels;
}

function playerWidthInColorClocks(sizeValue) {
  if (sizeValue === 0) {
    return 1;
  }
  if (sizeValue === 1) {
    return 2;
  }
  if (sizeValue === 3) {
    return 4;
  }
  throw new Error(`Unsupported GTIA player size in preview source: ${sizeValue}`);
}

function drawPlayer(
  pixels,
  shape,
  horizontalPosition,
  verticalPosition,
  size,
  color,
  screenTop = PMG_SCREEN_TOP,
  clipTop = Number.NEGATIVE_INFINITY,
  clipBottom = Number.POSITIVE_INFINITY,
) {
  const colorClockWidth = playerWidthInColorClocks(size);
  const pixelWidth = colorClockWidth * HIGH_RES_PIXELS_PER_COLOR_CLOCK;
  const left = (horizontalPosition - PMG_LEFT_EDGE) * HIGH_RES_PIXELS_PER_COLOR_CLOCK;
  const top = verticalPosition - screenTop;

  for (let row = 0; row < shape.length; row += 1) {
    const hardwareY = verticalPosition + row;
    if (hardwareY < clipTop || hardwareY >= clipBottom) continue;
    const y = top + row;
    if (y < 0 || y >= SOURCE_HEIGHT) {
      continue;
    }

    for (let bit = 0; bit < 8; bit += 1) {
      if ((shape[row] & (0x80 >>> bit)) === 0) {
        continue;
      }
      const xStart = left + bit * pixelWidth;
      for (let offset = 0; offset < pixelWidth; offset += 1) {
        const x = xStart + offset;
        if (x >= 0 && x < SOURCE_WIDTH) {
          pixels[y * SOURCE_WIDTH + x] = color;
        }
      }
    }
  }
}

function overlayCanonicalPmg(pixels, graphics, {
  playerX: playerXOverride,
  playerY: playerYOverride,
  enemyX: enemyXOverride,
  enemyY: enemyYOverride,
  enemyArchetype: enemyArchetypeOverride,
  scannerPhase: scannerPhaseOverride,
  enemyBodyColor: enemyBodyColorOverride,
  enemyAccentColor: enemyAccentColorOverride,
  showPlayer = true,
} = {}) {
  const { hardwareState, initialState, constants } = graphics;
  const gameplayTop = requireValue(constants, "GAMEPLAY_TOP");
  const gameplayBottom = requireValue(constants, "GAMEPLAY_BOTTOM");
  const playerX = playerXOverride ?? requireValue(initialState, "player_x");
  const playerY = playerYOverride ?? requireValue(initialState, "player_y");
  const enemyX = enemyXOverride ?? requireValue(initialState, "enemy_x");
  const enemyY = enemyYOverride ?? requireValue(initialState, "enemy_y");
  const enemy = enemyArchetypeOverride ?? graphics.releaseEnemy;
  const scannerPhase = (scannerPhaseOverride ?? requireValue(initialState, "scanner_phase")) %
    (graphics.enemyRoster.runtime.accentFrames *
      graphics.enemyRoster.runtime.animationPhaseFrames);
  const scannerFrameIndex = Math.floor(
    scannerPhase / graphics.enemyRoster.runtime.animationPhaseFrames,
  );
  const scannerFrameOffset = scannerFrameIndex * graphics.enemyRoster.runtime.frameStride;
  const scannerFrame = enemy.accentFrameBytes.subarray(
    scannerFrameOffset,
    scannerFrameOffset + enemy.height,
  );
  const enemyHpos = enemyX - enemy.visibleLeftInset;

  // PRIOR=0 gives lower-numbered players priority. Paint from P3 to P0.
  if (showPlayer) {
    drawPlayer(
      pixels,
      graphics.playerEngineShape,
      playerX,
      playerY,
      requireValue(hardwareState, "SIZEP3"),
      requireValue(hardwareState, "COLPM3"),
    );
  }
  drawPlayer(
    pixels,
    scannerFrame,
    enemyHpos,
    enemyY,
    enemy.sizeCode,
    enemyAccentColorOverride ?? requireValue(hardwareState, "COLPM2"),
    PMG_SCREEN_TOP,
    gameplayTop,
    gameplayBottom,
  );
  drawPlayer(
    pixels,
    enemy.bodyRows,
    enemyHpos,
    enemyY,
    enemy.sizeCode,
    enemyBodyColorOverride ?? requireValue(hardwareState, "COLPM1"),
    PMG_SCREEN_TOP,
    gameplayTop,
    gameplayBottom,
  );
  if (showPlayer) {
    drawPlayer(
      pixels,
      graphics.playerShape,
      playerX,
      playerY,
      requireValue(hardwareState, "SIZEP0"),
      requireValue(hardwareState, "COLPM0"),
    );
  }
}

function drawMissileSpan(pixels, horizontalPosition, verticalPosition, height, color, size = 1) {
  const left = (horizontalPosition - PMG_LEFT_EDGE) * HIGH_RES_PIXELS_PER_COLOR_CLOCK;
  const top = centeredSpanTop(verticalPosition, height) - PMG_SCREEN_TOP;
  const width = missileWidth(size) * HIGH_RES_PIXELS_PER_COLOR_CLOCK;
  for (let yOffset = 0; yOffset < height; yOffset += 1) {
    const y = top + yOffset;
    if (y < 0 || y >= SOURCE_HEIGHT) continue;
    for (let xOffset = 0; xOffset < width; xOffset += 1) {
      const x = left + xOffset;
      if (x >= 0 && x < SOURCE_WIDTH) pixels[y * SOURCE_WIDTH + x] = color;
    }
  }
}

function drawTopAnchoredMissileSpan(
  pixels,
  horizontalPosition,
  verticalPosition,
  height,
  color,
  size = 0,
) {
  const left = (horizontalPosition - PMG_LEFT_EDGE) * HIGH_RES_PIXELS_PER_COLOR_CLOCK;
  const top = verticalPosition - PMG_SCREEN_TOP;
  const width = missileWidth(size) * HIGH_RES_PIXELS_PER_COLOR_CLOCK;
  for (let yOffset = 0; yOffset < height; yOffset += 1) {
    const y = top + yOffset;
    if (y < 0 || y >= SOURCE_HEIGHT) continue;
    for (let xOffset = 0; xOffset < width; xOffset += 1) {
      const x = left + xOffset;
      if (x >= 0 && x < SOURCE_WIDTH) pixels[y * SOURCE_WIDTH + x] = color;
    }
  }
}

function applyCapitalShellVisualToScreen(screen, asset, visual) {
  if (visual.renderer !== "ANTIC4_PLAYFIELD_OVERLAY") return null;
  const screenRow = Math.floor((visual.y - PMG_SCREEN_TOP) / CHARACTER_HEIGHT);
  const screenColumn = Math.floor((visual.x - PMG_LEFT_EDGE) / ANTIC_PIXELS_PER_BYTE);
  if (screenRow < 1 || screenRow >= GAMEPLAY_SCREEN_ROWS ||
      screenColumn < 0 || screenColumn >= SCREEN_COLUMNS) return null;
  const screenIndex = screenRow * SCREEN_COLUMNS + screenColumn;
  const cellCount = visual.width / ANTIC_PIXELS_PER_BYTE;
  const code = (asset.definition.charsetBaseIndex + 18 + visual.phase) | visual.attribute;
  const previousCodes = [];
  for (let cell = 0; cell < cellCount; cell += 1) {
    previousCodes.push(screen[screenIndex + cell]);
    screen[screenIndex + cell] = code;
  }
  return { screenRow, screenColumn, screenIndex, previousCodes, code, cellCount };
}

function overlayStartMenuPmg(pixels, graphics) {
  const { constants, mainMenuHardwareState } = graphics;
  const verticalScale = requireValue(constants, "MAIN_MENU_PLAYER_VERTICAL_SCALE");
  const expandVertically = (shape) => Uint8Array.from(
    [...shape].flatMap((value) => Array(verticalScale).fill(value)),
  );
  const playerX = requireValue(mainMenuHardwareState, "HPOSP0");
  const playerY = requireValue(constants, "MAIN_MENU_PLAYER_Y");

  drawPlayer(
    pixels,
    expandVertically(graphics.playerEngineShape),
    playerX,
    playerY,
    requireValue(mainMenuHardwareState, "SIZEP3"),
    requireValue(mainMenuHardwareState, "COLPM3"),
    32,
  );
  drawPlayer(
    pixels,
    Uint8Array.of(
      requireValue(constants, "MAIN_MENU_RED_LIGHT_BITS"),
      requireValue(constants, "MAIN_MENU_RED_LIGHT_BITS"),
    ),
    requireValue(mainMenuHardwareState, "HPOSP2"),
    requireValue(constants, "MAIN_MENU_RED_LIGHT_Y"),
    requireValue(mainMenuHardwareState, "SIZEP2"),
    requireValue(mainMenuHardwareState, "COLPM2"),
    32,
  );
  drawPlayer(
    pixels,
    expandVertically(graphics.playerShape),
    playerX,
    playerY,
    requireValue(mainMenuHardwareState, "SIZEP0"),
    requireValue(mainMenuHardwareState, "COLPM0"),
    32,
  );
}

function hslToRgb(hueDegrees, saturation, lightness) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hue = (((hueDegrees % 360) + 360) % 360) / 60;
  const intermediate = chroma * (1 - Math.abs((hue % 2) - 1));
  const sectors = [
    [chroma, intermediate, 0],
    [intermediate, chroma, 0],
    [0, chroma, intermediate],
    [0, intermediate, chroma],
    [intermediate, 0, chroma],
    [chroma, 0, intermediate],
  ];
  const [red, green, blue] = sectors[Math.floor(hue) % 6];
  const match = lightness - chroma / 2;
  return [red + match, green + match, blue + match].map((component) =>
    Math.max(0, Math.min(255, Math.round(component * 255))),
  );
}

function atariPalRegisterToRgb(registerValue) {
  const hue = (registerValue >>> 4) & 0x0f;
  const luminance = registerValue & 0x0e;
  const lightness = 0.04 + (luminance / 14) * 0.86;

  if (hue === 0) {
    const gray = Math.round(lightness * 255);
    return [gray, gray, gray];
  }

  // PAL hue order used by the Atari color registers, expressed as a full
  // deterministic wheel. Analog output and emulator palettes vary.
  const hueAngles = [
    0, 52, 34, 16, 354, 326, 294, 258,
    226, 204, 184, 164, 136, 108, 82, 62,
  ];
  return hslToRgb(hueAngles[hue], 0.68, lightness);
}

function scaleAndConvertToRgb(
  registerPixels,
  sourceWidth = SOURCE_WIDTH,
  sourceHeight = SOURCE_HEIGHT,
  outputScale = PREVIEW_SCALE,
) {
  const outputWidth = sourceWidth * outputScale;
  const outputHeight = sourceHeight * outputScale;
  const rgb = Buffer.alloc(outputWidth * outputHeight * 3);
  const palette = Array.from({ length: 256 }, (_, value) => atariPalRegisterToRgb(value));

  for (let sourceY = 0; sourceY < sourceHeight; sourceY += 1) {
    for (let sourceX = 0; sourceX < sourceWidth; sourceX += 1) {
      const color = palette[registerPixels[sourceY * sourceWidth + sourceX]];
      for (let scaleY = 0; scaleY < outputScale; scaleY += 1) {
        const outputY = sourceY * outputScale + scaleY;
        for (let scaleX = 0; scaleX < outputScale; scaleX += 1) {
          const outputX = sourceX * outputScale + scaleX;
          const outputOffset = (outputY * outputWidth + outputX) * 3;
          rgb[outputOffset] = color[0];
          rgb[outputOffset + 1] = color[1];
          rgb[outputOffset + 2] = color[2];
        }
      }
    }
  }
  return rgb;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return chunk;
}

function encodePng(rgb, width = PREVIEW_WIDTH, height = PREVIEW_HEIGHT) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const scanlineLength = width * 3;
  const scanlines = Buffer.alloc((scanlineLength + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const outputOffset = y * (scanlineLength + 1);
    scanlines[outputOffset] = 0;
    rgb.copy(scanlines, outputOffset + 1, y * scanlineLength, (y + 1) * scanlineLength);
  }

  const compressed = zlib.deflateSync(scanlines, { level: 9 });
  return Buffer.concat([
    PNG_SIGNATURE,
    makePngChunk("IHDR", header),
    makePngChunk("IDAT", compressed),
    makePngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function decodeRgbaReferencePng(png) {
  if (!png.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error("Invalid reference PNG signature");
  }
  let offset = PNG_SIGNATURE.length;
  let header;
  const data = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const chunk = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") header = chunk;
    if (type === "IDAT") data.push(chunk);
    offset += length + 12;
    if (type === "IEND") break;
  }
  if (!header || header[8] !== 8 || header[9] !== 6 || header[12] !== 0) {
    throw new Error("Enemy references must be non-interlaced eight-bit RGBA PNGs");
  }
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const raw = zlib.inflateSync(Buffer.concat(data));
  if (raw.length !== (stride + 1) * height) {
    throw new Error("Enemy reference PNG has an unexpected decoded size");
  }
  const rgba = Buffer.alloc(width * height * bytesPerPixel);
  const paeth = (left, above, upperLeft) => {
    const prediction = left + above - upperLeft;
    const leftDistance = Math.abs(prediction - left);
    const aboveDistance = Math.abs(prediction - above);
    const upperLeftDistance = Math.abs(prediction - upperLeft);
    if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
    if (aboveDistance <= upperLeftDistance) return above;
    return upperLeft;
  };
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x += 1) {
      const encoded = raw[y * (stride + 1) + 1 + x];
      const left = x >= bytesPerPixel ? rgba[y * stride + x - bytesPerPixel] : 0;
      const above = y > 0 ? rgba[(y - 1) * stride + x] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel
        ? rgba[(y - 1) * stride + x - bytesPerPixel]
        : 0;
      const value = [
        encoded,
        encoded + left,
        encoded + above,
        encoded + Math.floor((left + above) / 2),
        encoded + paeth(left, above, upperLeft),
      ][filter];
      if (value === undefined) throw new Error(`Unsupported PNG filter ${filter}`);
      rgba[y * stride + x] = value & 0xff;
    }
  }
  return { width, height, rgba };
}

function isReferenceForeground(red, green, blue, alpha) {
  if (alpha < 24) return false;
  const chromaGreen = green > 96 && green > red * 1.28 && green > blue * 1.28;
  return !chromaGreen;
}

function referenceBounds(image) {
  let left = image.width;
  let top = image.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const index = (y * image.width + x) * 4;
      if (!isReferenceForeground(
        image.rgba[index], image.rgba[index + 1], image.rgba[index + 2], image.rgba[index + 3],
      )) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) throw new Error("Enemy reference contains no ship foreground");
  return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 };
}

function drawRgbLabel(rgb, width, text, x, y, frontend, color = [232, 232, 232]) {
  for (let character = 0; character < text.length; character += 1) {
    const screenCode = encodeFrontendAscii(text.charCodeAt(character), frontend.constants);
    const characterIndex = screenCode & 0x7f;
    for (let line = 0; line < CHARACTER_HEIGHT; line += 1) {
      const pattern = frontend.frontendCharset[characterIndex * CHARACTER_HEIGHT + line];
      for (let bit = 0; bit < 8; bit += 1) {
        if ((pattern & (0x80 >>> bit)) === 0) continue;
        const output = ((y + line) * width + x + character * 8 + bit) * 3;
        rgb[output] = color[0];
        rgb[output + 1] = color[1];
        rgb[output + 2] = color[2];
      }
    }
  }
}

function blitReference(rgb, outputWidth, image, bounds, x, y, width, height) {
  for (let outputY = 0; outputY < height; outputY += 1) {
    const sourceY = bounds.top + Math.min(
      bounds.height - 1,
      Math.floor(outputY * bounds.height / height),
    );
    for (let outputX = 0; outputX < width; outputX += 1) {
      const sourceX = bounds.left + Math.min(
        bounds.width - 1,
        Math.floor(outputX * bounds.width / width),
      );
      const source = (sourceY * image.width + sourceX) * 4;
      if (!isReferenceForeground(
        image.rgba[source], image.rgba[source + 1], image.rgba[source + 2], image.rgba[source + 3],
      )) continue;
      const output = ((y + outputY) * outputWidth + x + outputX) * 3;
      rgb[output] = image.rgba[source];
      rgb[output + 1] = image.rgba[source + 1];
      rgb[output + 2] = image.rgba[source + 2];
    }
  }
}

export function readGameplayRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const screen = createCanonicalScreen(graphics);
  const registerPixels = drawGameplayMixedScreen(graphics.hardwareState, screen, graphics);
  overlayCanonicalPmg(registerPixels, graphics);
  return { graphics, screen, registerPixels };
}

function readGameplayPlayfieldRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
  backgroundColor,
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const screen = createCanonicalScreen(graphics);
  const hardwareState = new Map(graphics.hardwareState);
  if (backgroundColor !== undefined) hardwareState.set("COLBK", backgroundColor);
  return {
    graphics,
    screen,
    registerPixels: drawGameplayMixedScreen(hardwareState, screen, graphics),
  };
}

export function createGameplayPreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const { registerPixels } = readGameplayRuntimeState(source, capitalHullsDefinition);
  return encodePng(scaleAndConvertToRgb(registerPixels));
}

export function readExplosionFlashRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const { constants } = graphics;
  const enemyStored = extractLabeledData(
    source,
    "enemy_fighter_flash_colors",
    constants,
    "player_death_flash_colors",
  );
  const playerStored = extractLabeledData(
    source,
    "player_death_flash_colors",
    constants,
    "flash_color_tables_end",
  );
  requireLength("enemy fighter flash table", enemyStored, 4);
  requireLength("player death flash table", playerStored, 6);
  const colorNames = [
    "FLASH_YELLOW_BRIGHT",
    "FLASH_YELLOW_MID",
    "FLASH_RED_BRIGHT",
    "FLASH_RED_MID",
    "FLASH_RED_DARK",
  ];
  const colors = Object.fromEntries(colorNames.map((name) => [name, requireValue(constants, name)]));
  const baseColor = requireValue(constants, "GAMEPLAY_BACKGROUND_COLOR");
  const playerDamageColor = requireValue(constants, "PLAYER_DAMAGE_FLASH_COLOR");
  const enemySequence = [...enemyStored].reverse();
  const playerSequence = [...playerStored].reverse();
  const nameByValue = new Map([
    [baseColor, "GAMEPLAY_BACKGROUND_COLOR"],
    [playerDamageColor, "PLAYER_DAMAGE_FLASH_COLOR"],
    ...Object.entries(colors).map(([name, value]) => [value, name]),
  ]);
  const basePalette = Object.fromEntries(
    ["COLBK", "COLPF0", "COLPF1", "COLPF2", "COLPF3", "COLPM0", "COLPM1", "COLPM2", "COLPM3"]
      .map((register) => [register, requireValue(graphics.hardwareState, register)]),
  );
  return {
    graphics,
    colors,
    baseColor,
    playerDamageColor,
    basePalette,
    enemySequence,
    playerSequence,
    nameByValue,
    totalExplosionFrames: requireValue(constants, "SHARED_FIGHTER_EXPLOSION_TOTAL"),
  };
}

export function explosionFlashColorForTimers(runtime, {
  playerTimer = 0,
  enemyTimer = 0,
  damageTimer = 0,
  gameplayActive = true,
} = {}) {
  if (!gameplayActive) return runtime.baseColor;
  const playerIndex = runtime.totalExplosionFrames - playerTimer;
  if (playerIndex >= 0 && playerIndex < runtime.playerSequence.length) {
    return runtime.playerSequence[playerIndex];
  }
  if (playerTimer > 0) return runtime.baseColor;
  const enemyIndex = runtime.totalExplosionFrames - enemyTimer;
  if (enemyIndex >= 0 && enemyIndex < runtime.enemySequence.length) {
    return runtime.enemySequence[enemyIndex];
  }
  return damageTimer > 0 ? runtime.playerDamageColor : runtime.baseColor;
}

function explosionFlashGameplayPixels(runtime, color) {
  const hardwareState = new Map(runtime.graphics.hardwareState);
  hardwareState.set("COLBK", color);
  const screen = createCanonicalScreen(runtime.graphics);
  const pixels = drawGameplayMixedScreen(hardwareState, screen, runtime.graphics);
  overlayCanonicalPmg(pixels, runtime.graphics);
  return pixels;
}

export function createExplosionFlashNativePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const runtime = readExplosionFlashRuntimeState(source, capitalHullsDefinition);
  const displayName = (name) => name.replaceAll("_", " ");
  const paletteFrames = Object.entries(runtime.colors).map(([name, color]) => ({
    label: `PALETTE ${displayName(name)} GTIA ${color.toString(16).padStart(2, "0").toUpperCase()}`,
    color,
  }));
  const sequenceFrames = [
    { label: "BASE PALETTE", color: runtime.baseColor },
    ...runtime.enemySequence.map((color, index) => ({
      label: `ENEMY F${index + 1} ${displayName(runtime.nameByValue.get(color))} GTIA ${color.toString(16).padStart(2, "0").toUpperCase()}`,
      color,
    })),
    { label: "ENEMY RESTORE BASE", color: runtime.baseColor },
    ...runtime.playerSequence.map((color, index) => ({
      label: `PLAYER_FIGHTER F${index + 1} ${displayName(runtime.nameByValue.get(color))} GTIA ${color.toString(16).padStart(2, "0").toUpperCase()}`,
      color,
    })),
    { label: "PLAYER_FIGHTER RESTORE BASE", color: runtime.baseColor },
  ];
  const frames = [...paletteFrames, ...sequenceFrames];
  const columns = 3;
  const labelHeight = 16;
  const rows = Math.ceil(frames.length / columns);
  const width = SOURCE_WIDTH * columns;
  const panelHeight = SOURCE_HEIGHT + labelHeight;
  const height = panelHeight * rows;
  const registerPixels = new Uint8Array(width * height);
  const frontend = readFrontendGraphicsSource(source);
  frames.forEach((frame, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = column * SOURCE_WIDTH;
    const top = row * panelHeight;
    drawComparisonLabel(registerPixels, width, frame.label, left + 4, top + 4, frontend);
    const pixels = explosionFlashGameplayPixels(runtime, frame.color);
    for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
      registerPixels.set(
        pixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
        (top + labelHeight + y) * width + left,
      );
    }
  });
  return encodePng(scaleAndConvertToRgb(registerPixels, width, height, 1), width, height);
}

export function createExplosionFlashComparisonPreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const runtime = readExplosionFlashRuntimeState(source, capitalHullsDefinition);
  const width = 640;
  const height = 248;
  const registerPixels = new Uint8Array(width * height);
  const frontend = readFrontendGraphicsSource(source);
  const hex = (value) => value.toString(16).padStart(2, "0").toUpperCase();
  const displayName = (name) => name.replaceAll("_", " ");
  drawComparisonLabel(registerPixels, width, "FIGHTER FULL-SCREEN COLBK FLASH - PAL", 8, 4, frontend);
  drawComparisonLabel(registerPixels, width,
    `BASE COLBK ${hex(runtime.baseColor)}  PF ${["COLPF0", "COLPF1", "COLPF2", "COLPF3"]
      .map((name) => hex(runtime.basePalette[name])).join(" ")}`, 8, 20, frontend);
  Object.entries(runtime.colors).forEach(([name, color], index) => {
    const y = 40 + index * 16;
    drawComparisonLabel(registerPixels, width, `${displayName(name)} GTIA ${hex(color)}`, 8, y + 2, frontend);
    for (let row = y; row < y + 12; row += 1) {
      registerPixels.fill(color, row * width + 224, row * width + width - 8);
    }
  });
  const drawTimeline = (label, sequence, top, boxWidth) => {
    drawComparisonLabel(registerPixels, width, label, 8, top, frontend);
    const frames = [...sequence, runtime.baseColor];
    frames.forEach((color, index) => {
      const left = 112 + index * boxWidth;
      const name = index < sequence.length ? `F${index + 1}` : "BASE";
      drawComparisonLabel(registerPixels, width, `${name} ${hex(color)}`, left, top, frontend);
      for (let y = top + 12; y < top + 32; y += 1) {
        registerPixels.fill(color, y * width + left, y * width + left + boxWidth - 8);
      }
    });
  };
  drawTimeline("ENEMY 4F", runtime.enemySequence, 132, 100);
  drawTimeline("PLAYER_FIGHTER 6F", runtime.playerSequence, 188, 72);
  return encodePng(
    scaleAndConvertToRgb(registerPixels, width, height, 2),
    width * 2,
    height * 2,
  );
}

export function createExplosionFlashTrace(source) {
  const runtime = readExplosionFlashRuntimeState(source);
  const hex = (value) => `$${value.toString(16).padStart(2, "0").toUpperCase()}`;
  const lines = ["profile,frame,timer,COLBK,symbol,active,elapsed_ms"];
  for (const [profile, sequence] of [["ENEMY", runtime.enemySequence], ["PLAYER_FIGHTER", runtime.playerSequence]]) {
    sequence.forEach((color, index) => lines.push([
      profile,
      index + 1,
      runtime.totalExplosionFrames - index,
      hex(color),
      runtime.nameByValue.get(color),
      1,
      (index + 1) * 20,
    ].join(",")));
    lines.push([
      profile,
      sequence.length + 1,
      runtime.totalExplosionFrames - sequence.length,
      hex(runtime.baseColor),
      "GAMEPLAY_BACKGROUND_COLOR",
      0,
      (sequence.length + 1) * 20,
    ].join(","));
  }
  return `${lines.join("\n")}\n`;
}

function createCapitalHullsStripScreen(graphics) {
  const rows = graphics.capitalHulls.segmentRows;
  const screen = new Uint8Array(SCREEN_COLUMNS * rows);
  for (let row = 0; row < rows; row += 1) {
    const rowStart = row * SCREEN_COLUMNS;
    for (let column = 0; column < graphics.capitalHulls.mapColumns; column += 1) {
      screen[rowStart + column] = graphics.alliedHullRows[row][column];
      screen[rowStart + 31 + column] = graphics.enemyHullRows[row][column];
    }
  }
  return screen;
}

export function createCapitalHullsStripPreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const { graphics, registerPixels, sourceHeight } = readCapitalHullsStripRuntimeState(
    source,
    capitalHullsDefinition,
  );
  return encodePng(
    scaleAndConvertToRgb(registerPixels, SOURCE_WIDTH, sourceHeight),
    PREVIEW_WIDTH,
    sourceHeight * PREVIEW_SCALE,
  );
}

export function readCapitalHullsStripRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
  colpf3Override,
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const screen = createCapitalHullsStripScreen(graphics);
  const sourceHeight = graphics.capitalHulls.segmentRows * CHARACTER_HEIGHT;
  const hardwareState = new Map(graphics.hardwareState);
  if (colpf3Override !== undefined) {
    if (!Number.isInteger(colpf3Override) || colpf3Override < 0 || colpf3Override > 0xff) {
      throw new Error("Enemy hull COLPF3 override must be an Atari colour-register byte");
    }
    hardwareState.set("COLPF3", colpf3Override);
  }
  const registerPixels = drawAnticScreen(
    hardwareState,
    screen,
    graphics,
    undefined,
    graphics.capitalHulls.segmentRows,
  );
  return { graphics, hardwareState, screen, registerPixels, sourceHeight };
}

function createBroadsideAntic2Screen(graphics, prototype) {
  const screen = createCanonicalScreen(graphics);
  let phase = requireValue(graphics.initialState, "corridor_phase");
  for (let characterRow = 1; characterRow < SCREEN_ROWS; characterRow += 1) {
    const segmentRow = phase & (prototype.segmentRows - 1);
    const rowStart = characterRow * SCREEN_COLUMNS;
    screen.set(prototype.decodedMaps.get("allied")[segmentRow], rowStart);
    screen.set(prototype.decodedMaps.get("enemy")[segmentRow], rowStart + 31);
    for (let column = 8; column < 32; column += 1) {
      screen[rowStart + column] &= 0x7f;
    }
    phase = (phase + 1) & 0xff;
  }
  return screen;
}

function drawAntic2Rows({
  pixels,
  pixelHeight,
  screen,
  charset,
  registers,
  firstCharacterRow,
  characterRows,
}) {
  for (
    let characterRow = firstCharacterRow;
    characterRow < firstCharacterRow + characterRows;
    characterRow += 1
  ) {
    for (let column = 0; column < SCREEN_COLUMNS; column += 1) {
      const screenCode = screen[characterRow * SCREEN_COLUMNS + column];
      const characterIndex = screenCode & 0x7f;
      const inverse = (screenCode & 0x80) !== 0;
      for (let characterLine = 0; characterLine < CHARACTER_HEIGHT; characterLine += 1) {
        const y = characterRow * CHARACTER_HEIGHT + characterLine;
        if (y < 0 || y >= pixelHeight) {
          throw new Error("ANTIC 2 prototype row lies outside its simulated playfield");
        }
        const pattern = charset[characterIndex * CHARACTER_HEIGHT + characterLine];
        for (let bit = 0; bit < 8; bit += 1) {
          const bitmapBit = ((pattern >>> (7 - bit)) & 1) ^ Number(inverse);
          pixels[y * SOURCE_WIDTH + column * 8 + bit] =
            anticFRegisterForBitmapBit(registers, bitmapBit);
        }
      }
    }
  }
}

export function readBroadsideAntic2PrototypeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
  prototypeDefinition = loadCapitalHullsAntic2Prototype(
    DEFAULT_CAPITAL_HULLS_ANTIC2_DEFINITION_PATH,
  ),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const prototype = compileCapitalHullsAntic2Prototype(
    prototypeDefinition,
    capitalHullsDefinition,
  );
  const charset = buildCapitalHullsAntic2Charset(graphics.charset, prototype);
  const screen = createBroadsideAntic2Screen(graphics, prototype);

  // Runtime already owns a dedicated ANTIC 2 HUD. The rejected spike changes
  // only rows 1-23 to the optional monochrome playfield for comparison.
  const registerPixels = drawGameplayMixedScreen(graphics.hardwareState, screen, graphics);
  drawAntic2Rows({
    pixels: registerPixels,
    pixelHeight: SOURCE_HEIGHT,
    screen,
    charset,
    registers: prototype.palette,
    firstCharacterRow: 1,
    characterRows: SCREEN_ROWS - 1,
  });
  overlayCanonicalPmg(registerPixels, graphics);
  return { graphics, prototype, charset, screen, registerPixels };
}

export function createBroadsideAntic2PrototypePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
  prototypeDefinition = loadCapitalHullsAntic2Prototype(
    DEFAULT_CAPITAL_HULLS_ANTIC2_DEFINITION_PATH,
  ),
) {
  const { registerPixels } = readBroadsideAntic2PrototypeState(
    source,
    capitalHullsDefinition,
    prototypeDefinition,
  );
  return encodePng(scaleAndConvertToRgb(registerPixels));
}

export function createCapitalHullsAntic2StripPreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
  prototypeDefinition = loadCapitalHullsAntic2Prototype(
    DEFAULT_CAPITAL_HULLS_ANTIC2_DEFINITION_PATH,
  ),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const prototype = compileCapitalHullsAntic2Prototype(
    prototypeDefinition,
    capitalHullsDefinition,
  );
  const charset = buildCapitalHullsAntic2Charset(graphics.charset, prototype);
  const screen = new Uint8Array(SCREEN_COLUMNS * prototype.segmentRows);
  for (let row = 0; row < prototype.segmentRows; row += 1) {
    const rowStart = row * SCREEN_COLUMNS;
    screen.set(prototype.decodedMaps.get("allied")[row], rowStart);
    screen.set(prototype.decodedMaps.get("enemy")[row], rowStart + 31);
  }
  const sourceHeight = prototype.segmentRows * CHARACTER_HEIGHT;
  const registerPixels = new Uint8Array(SOURCE_WIDTH * sourceHeight);
  registerPixels.fill(requireValue(prototype.palette, "COLBK"));
  drawAntic2Rows({
    pixels: registerPixels,
    pixelHeight: sourceHeight,
    screen,
    charset,
    registers: prototype.palette,
    firstCharacterRow: 0,
    characterRows: prototype.segmentRows,
  });
  return encodePng(
    scaleAndConvertToRgb(registerPixels, SOURCE_WIDTH, sourceHeight),
    PREVIEW_WIDTH,
    sourceHeight * PREVIEW_SCALE,
  );
}

function drawComparisonLabel(registerPixels, width, text, x, y, frontend) {
  for (let character = 0; character < text.length; character += 1) {
    const screenCode = encodeFrontendAscii(text.charCodeAt(character), frontend.constants);
    const characterIndex = screenCode & 0x7f;
    for (let line = 0; line < CHARACTER_HEIGHT; line += 1) {
      const pattern = frontend.frontendCharset[characterIndex * CHARACTER_HEIGHT + line];
      for (let bit = 0; bit < 8; bit += 1) {
        if (pattern & (0x80 >>> bit)) {
          registerPixels[(y + line) * width + x + character * 8 + bit] = 0x0e;
        }
      }
    }
  }
}

export function createEnemyHullColourOptionsPreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const dark = readCapitalHullsStripRuntimeState(source, capitalHullsDefinition, 0x44);
  const bright = readCapitalHullsStripRuntimeState(source, capitalHullsDefinition, 0x46);
  if (!dark.screen.every((screenCode, index) => screenCode === bright.screen[index])) {
    throw new Error("Enemy colour comparison must use identical hull screen data");
  }

  const comparisonWidth = SOURCE_WIDTH * 2;
  const labelHeight = 16;
  const comparisonHeight = dark.sourceHeight + labelHeight;
  const registerPixels = new Uint8Array(comparisonWidth * comparisonHeight);
  for (let y = 0; y < dark.sourceHeight; y += 1) {
    const destination = (y + labelHeight) * comparisonWidth;
    registerPixels.set(
      dark.registerPixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
      destination,
    );
    registerPixels.set(
      bright.registerPixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
      destination + SOURCE_WIDTH,
    );
  }
  const frontend = readFrontendGraphicsSource(source);
  drawComparisonLabel(registerPixels, comparisonWidth, "COLPF3 44 DARK", 104, 4, frontend);
  drawComparisonLabel(registerPixels, comparisonWidth, "COLPF3 46 BRIGHT", 412, 4, frontend);
  return encodePng(
    scaleAndConvertToRgb(registerPixels, comparisonWidth, comparisonHeight),
    comparisonWidth * PREVIEW_SCALE,
    comparisonHeight * PREVIEW_SCALE,
  );
}

export function createBroadsideModeComparisonPreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
  prototypeDefinition = loadCapitalHullsAntic2Prototype(
    DEFAULT_CAPITAL_HULLS_ANTIC2_DEFINITION_PATH,
  ),
) {
  const current = readGameplayRuntimeState(source, capitalHullsDefinition).registerPixels;
  const proposed = readBroadsideAntic2PrototypeState(
    source,
    capitalHullsDefinition,
    prototypeDefinition,
  ).registerPixels;
  const comparisonWidth = SOURCE_WIDTH * 2;
  const labelHeight = 16;
  const comparisonHeight = SOURCE_HEIGHT + labelHeight;
  const registerPixels = new Uint8Array(comparisonWidth * comparisonHeight);

  for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
    const destination = (y + labelHeight) * comparisonWidth;
    registerPixels.set(current.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH), destination);
    registerPixels.set(
      proposed.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
      destination + SOURCE_WIDTH,
    );
  }
  const frontend = readFrontendGraphicsSource(source);
  drawComparisonLabel(registerPixels, comparisonWidth, "CURRENT ANTIC 4", 100, 4, frontend);
  drawComparisonLabel(registerPixels, comparisonWidth, "PROPOSED ANTIC 2", 416, 4, frontend);
  return encodePng(
    scaleAndConvertToRgb(registerPixels, comparisonWidth, comparisonHeight),
    comparisonWidth * PREVIEW_SCALE,
    comparisonHeight * PREVIEW_SCALE,
  );
}

export function readBroadsideFireSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const base = readGameplayRuntimeState(source, capitalHullsDefinition);
  const { graphics } = base;
  const asset = graphics.capitalHulls;
  const turretById = new Map(asset.turrets.map((turret) => [turret.id, turret]));
  const allied = turretById.get("allied_turret_a");
  const enemy = turretById.get("enemy_turret_a");
  const color = (missile) => requireValue(graphics.hardwareState, `COLPM${missile}`);
  const visibleCannonRow = (turret) => {
    for (let offset = 0; offset < asset.sector.visibleRows; offset += 1) {
      const leftRow = asset.sector.previewSectorRow - 1 - offset;
      const sideRow = sectorRowForSide(asset, turret.side, leftRow);
      if (asset.sector.cannonRowsBySide.get(turret.side).includes(sideRow)) return 1 + offset;
    }
    throw new Error(`${turret.id} is not visible at the source-derived preview phase`);
  };
  const alliedMuzzle = muzzlePosition(allied, visibleCannonRow(allied));
  const enemyMuzzle = muzzlePosition(enemy, visibleCannonRow(enemy));
  const enemySecondMuzzle = muzzlePosition(enemy, 5);
  const enemyX = requireValue(graphics.initialState, "enemy_x");
  const enemyY = requireValue(graphics.initialState, "enemy_y");
  const playerX = requireValue(graphics.initialState, "player_x");
  const playerY = requireValue(graphics.initialState, "player_y");
  const enemyBoundary = hullBoundary(asset, "enemy", allied.segmentRow);
  const warningSpan = (turret, muzzle, missile, timer) => {
    const visual = warningVisual({
      state: BROADSIDE_STATES.WARNING,
      owner: turret.side,
      x: muzzle.x,
      y: muzzle.y,
      timer,
    }, asset);
    return { missile, x: visual.x, y: visual.y, height: visual.height, size: visual.size };
  };
  const shellSpan = (missile, owner, x, y, frame = 0) => ({
    missile,
    ...heavyShellVisual({ state: BROADSIDE_STATES.FLYING, missile, owner, x, y }, asset, frame),
  });

  const panelDefinitions = [
    {
      label: "ALLIED MUZZLE WARNING",
      spans: [warningSpan(allied, alliedMuzzle, 2, 8)],
    },
    {
      label: "ENEMY MUZZLE WARNING",
      spans: [warningSpan(enemy, enemyMuzzle, 1, 8)],
    },
    {
      label: "THREE SHELL CROSSING",
      spans: [
        shellSpan(1, "enemy", enemyMuzzle.x - asset.broadside.projectileSpeed * 12,
          enemyMuzzle.y, 24),
        shellSpan(2, "allied", alliedMuzzle.x + asset.broadside.projectileSpeed * 18,
          alliedMuzzle.y, 36),
        shellSpan(3, "enemy", enemySecondMuzzle.x - asset.broadside.projectileSpeed * 8,
          enemySecondMuzzle.y, 16),
      ],
    },
    {
      label: "ALLIED HIT ON FIGHTER",
      spans: [{ missile: 2, x: enemyX, y: enemyY + 4, height: asset.broadside.impactHeight }],
    },
    {
      label: "OPPOSITE HULL IMPACT",
      spans: [{ missile: 3, x: enemyBoundary - 2, y: alliedMuzzle.y,
        height: asset.broadside.impactHeight }],
    },
    {
      label: "PLAYER DAMAGE IMPACT",
      spans: [{ missile: 1, x: playerX, y: playerY + 4, height: asset.broadside.impactHeight }],
    },
  ];

  const columns = 2;
  const rows = 3;
  const labelHeight = 16;
  const cellHeight = SOURCE_HEIGHT + labelHeight;
  const width = SOURCE_WIDTH * columns;
  const height = cellHeight * rows;
  const registerPixels = new Uint8Array(width * height);
  const frontend = readFrontendGraphicsSource(source);

  panelDefinitions.forEach((panel, index) => {
    const screen = Uint8Array.from(base.screen);
    for (const span of panel.spans) applyCapitalShellVisualToScreen(screen, asset, span);
    const panelPixels = drawGameplayMixedScreen(graphics.hardwareState, screen, graphics);
    overlayCanonicalPmg(panelPixels, graphics);
    for (const span of panel.spans) {
      if (span.renderer === "ANTIC4_PLAYFIELD_OVERLAY") continue;
      drawMissileSpan(panelPixels, span.x, span.y, span.height, color(span.missile), span.size ?? 1);
    }
    const column = index % columns;
    const row = Math.floor(index / columns);
    const originX = column * SOURCE_WIDTH;
    const originY = row * cellHeight;
    for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
      registerPixels.set(
        panelPixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
        (originY + labelHeight + y) * width + originX,
      );
    }
    drawComparisonLabel(registerPixels, width, panel.label, originX + 68, originY + 4, frontend);
  });
  return { graphics, panelDefinitions, registerPixels, width, height };
}

export function createBroadsideFireSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readBroadsideFireSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

function visibleSectorCannon(asset, side, sectorPhase) {
  const turret = asset.turrets.find((candidate) => candidate.side === side);
  for (let offset = 0; offset < asset.sector.visibleRows; offset += 1) {
    const leftRow = sectorPhase - 1 - offset;
    const sideRow = sectorRowForSide(asset, side, leftRow);
    if (asset.sector.cannonRowsBySide.get(side).includes(sideRow)) {
      return { turret, leftRow, sideRow, screenRow: 1 + offset };
    }
  }
  throw new Error(`${side} cannon is not visible at sector phase ${sectorPhase}`);
}

export function readFlagshipSectorSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const asset = graphics.capitalHulls;
  const panelSpecs = [
    { label: "ENGINES  ROWS 000-031", phase: 24, state: "ENGINES" },
    { label: "AFT  ROWS 032-055", phase: 54, state: "AFT" },
    { label: "COMBAT  ROWS 056-183", phase: asset.sector.previewSectorRow, state: "COMBAT" },
    { label: "FORWARD  ROWS 184-207", phase: 206, state: "FORWARD" },
    { label: "PROW  ROWS 208-239", phase: 230, state: "PROW" },
    { label: "TERMINAL TIPS  THEN EMPTY", phase: 240, state: "PROW" },
    { label: "DRAIN  12 OF 23 ROWS", phase: asset.sector.streamRows, drainRows: 12, state: "DRAIN" },
    { label: "COMPLETE  ALL EFFECTS CLEAR", phase: asset.sector.streamRows, drainRows: 23, state: "COMPLETE" },
  ];
  const columns = 3;
  const rows = 3;
  const labelHeight = 20;
  const cellHeight = SOURCE_HEIGHT + labelHeight;
  const width = SOURCE_WIDTH * columns;
  const height = cellHeight * rows;
  const registerPixels = new Uint8Array(width * height);
  const frontend = readFrontendGraphicsSource(source);
  const panelDefinitions = [];

  panelSpecs.forEach((spec, index) => {
    const screenState = createCanonicalScreenRuntimeState(graphics, { sectorPhase: spec.phase });
    for (let drain = 0; drain < (spec.drainRows ?? 0); drain += 1) {
      advanceCanonicalHullRuntimeState(screenState, graphics);
    }
    const panelPixels = drawGameplayMixedScreen(
      graphics.hardwareState,
      screenState.screen,
      graphics,
    );
    overlayCanonicalPmg(panelPixels, graphics);
    const column = index % columns;
    const row = Math.floor(index / columns);
    const originX = column * SOURCE_WIDTH;
    const originY = row * cellHeight;
    for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
      registerPixels.set(
        panelPixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
        (originY + labelHeight + y) * width + originX,
      );
    }
    drawComparisonLabel(registerPixels, width, spec.label, originX + 54, originY + 5, frontend);
    panelDefinitions.push({ ...spec, screen: Uint8Array.from(screenState.screen) });
  });
  return { graphics, panelDefinitions, registerPixels, width, height };
}

export function createFlagshipSectorSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readFlagshipSectorSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

function renderLabeledGameplayPanels(frontend, panelDefinitions, columns = 3) {
  const labelHeight = 20;
  const rows = Math.ceil(panelDefinitions.length / columns);
  const cellHeight = SOURCE_HEIGHT + labelHeight;
  const width = SOURCE_WIDTH * columns;
  const height = cellHeight * rows;
  const registerPixels = new Uint8Array(width * height);
  panelDefinitions.forEach((panel, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const originX = column * SOURCE_WIDTH;
    const originY = row * cellHeight;
    for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
      registerPixels.set(
        panel.pixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
        (originY + labelHeight + y) * width + originX,
      );
    }
    drawComparisonLabel(registerPixels, width, panel.label, originX + 16, originY + 5, frontend);
  });
  return { registerPixels, width, height };
}

function graphicsWithEnginePhase(graphics, phase) {
  const charset = Uint8Array.from(graphics.charset);
  for (const side of ["allied", "enemy"]) {
    const glyph = graphics.capitalHulls.sector.engineGlyphs.get(side);
    charset.set(glyph.animationBytes[phase], glyph.index * CHARACTER_HEIGHT);
  }
  return { ...graphics, charset };
}

export function readEngineBankSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const specs = [
    ...[0, 1].map((phase) => ({ label: `LEFT ENGINE PHASE ${phase}`, phase, sectorPhase: 22 })),
    ...[0, 1].map((phase) => ({ label: `RIGHT ENGINE PHASE ${phase}`, phase, sectorPhase: 30 })),
    { label: "LEFT ENGINE HOUSING TO AFT", phase: 1, sectorPhase: 44 },
    { label: "RIGHT ENGINE HOUSING TO AFT", phase: 1, sectorPhase: 52 },
  ];
  const panelDefinitions = specs.map((spec) => {
    const phaseGraphics = graphicsWithEnginePhase(graphics, spec.phase);
    const screenState = createCanonicalScreenRuntimeState(phaseGraphics, {
      sectorPhase: spec.sectorPhase,
    });
    const pixels = drawGameplayMixedScreen(
      phaseGraphics.hardwareState,
      screenState.screen,
      phaseGraphics,
    );
    overlayCanonicalPmg(pixels, phaseGraphics);
    return { ...spec, pixels, screen: Uint8Array.from(screenState.screen) };
  });
  const frontend = readFrontendGraphicsSource(source);
  return { graphics, panelDefinitions, ...renderLabeledGameplayPanels(frontend, panelDefinitions) };
}

export function createEngineBankSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readEngineBankSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

export function readProwSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const specs = [
    ["FORWARD TO LEFT PROW", 214],
    ["BROAD BOW SHOULDERS", 222],
    ["DISTINCT MID TAPER", 230],
    ["LEFT TERMINAL WEDGE", 240],
    ["RIGHT TERMINAL SPEAR", 248],
    ["BOTH TIPS THEN EMPTY", 249],
  ];
  const panelDefinitions = specs.map(([label, sectorPhase]) => {
    const screenState = createCanonicalScreenRuntimeState(graphics, { sectorPhase });
    const pixels = drawGameplayMixedScreen(graphics.hardwareState, screenState.screen, graphics);
    overlayCanonicalPmg(pixels, graphics);
    return { label, sectorPhase, pixels, screen: Uint8Array.from(screenState.screen) };
  });
  const frontend = readFrontendGraphicsSource(source);
  return { graphics, panelDefinitions, ...renderLabeledGameplayPanels(frontend, panelDefinitions) };
}

export function createProwSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readProwSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

export function readEnemyFighterLimitsRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const minimum = requireValue(graphics.constants, "ENEMY_X_MIN");
  const maximum = requireValue(graphics.constants, "ENEMY_X_MAX");
  const visibleWidth = requireValue(graphics.constants, "ENEMY_VISIBLE_WIDTH");
  const corridorLeft = requireValue(graphics.constants, "CORRIDOR_LEFT_HPOS");
  const corridorRight = requireValue(graphics.constants, "CORRIDOR_RIGHT_HPOS");
  const enemyY = 112;
  const panelDefinitions = [
    { label: `LEFT LIMIT LOGICAL HPOS ${minimum}`, enemyX: minimum },
    { label: `RIGHT LIMIT LOGICAL HPOS ${maximum}`, enemyX: maximum },
  ].map((spec) => {
    const screenState = createCanonicalScreenRuntimeState(graphics, {
      sectorPhase: graphics.capitalHulls.sector.previewSectorRow,
    });
    const pixels = drawGameplayMixedScreen(graphics.hardwareState, screenState.screen, graphics);
    overlayCanonicalPmg(pixels, graphics, { enemyX: spec.enemyX, enemyY });
    return { ...spec, enemyY, pixels, screen: Uint8Array.from(screenState.screen) };
  });
  return {
    graphics,
    minimum,
    maximum,
    visibleWidth,
    corridorLeft,
    corridorRight,
    envelopes: [
      { origin: minimum, left: minimum, rightExclusive: minimum + visibleWidth },
      { origin: maximum, left: maximum, rightExclusive: maximum + visibleWidth },
    ],
    panelDefinitions,
    ...renderLabeledGameplayPanels(readFrontendGraphicsSource(source), panelDefinitions, 2),
  };
}

export function createEnemyFighterLimitsPreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readEnemyFighterLimitsRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

function drawEnemyRaster(registerPixels, width, height, archetype, x, y, phase = 0, {
  scale = 1,
  accent = true,
  bodyColor = 0x44,
  accentColor = 0x46,
} = {}) {
  const bitWidth = archetype.hposPerBit * HIGH_RES_PIXELS_PER_COLOR_CLOCK * scale;
  const frameOffset = (phase % archetype.frames) * archetype.bodyBytes.length;
  const drawLayer = (rows, color) => {
    for (let row = 0; row < archetype.height; row += 1) {
      const pattern = rows[row];
      for (let bit = 0; bit < 8; bit += 1) {
        if ((pattern & (0x80 >>> bit)) === 0) continue;
        for (let dy = 0; dy < scale; dy += 1) {
          for (let dx = 0; dx < bitWidth; dx += 1) {
            const targetX = x + bit * bitWidth + dx;
            const targetY = y + row * scale + dy;
            if (targetX >= 0 && targetX < width && targetY >= 0 && targetY < height) {
              registerPixels[targetY * width + targetX] = color;
            }
          }
        }
      }
    }
  };
  if (accent) {
    drawLayer(
      archetype.accentFrameBytes.subarray(frameOffset, frameOffset + archetype.bodyBytes.length),
      accentColor,
    );
  }
  // PRIOR=0 makes P1 body cover P2 wherever both masks contain a pixel.
  drawLayer(archetype.bodyRows, bodyColor);
}

function loadEnemyRosterPreviewAsset() {
  return compileEnemyRoster(
    loadEnemyRosterDefinition(DEFAULT_ENEMY_ROSTER_DEFINITION_PATH),
    rootDirectory,
  );
}

export function createEnemyReferenceInventoryPreview(source) {
  const roster = loadEnemyRosterPreviewAsset();
  const frontend = readFrontendGraphicsSource(source);
  const columns = 5;
  const cellWidth = 160;
  const cellHeight = 170;
  const width = columns * cellWidth;
  const height = 2 * cellHeight;
  const rgb = Buffer.alloc(width * height * 3, 6);
  roster.inventory.forEach((entry, index) => {
    const image = decodeRgbaReferencePng(fs.readFileSync(path.join(rootDirectory, entry.reference)));
    const bounds = referenceBounds(image);
    const maxWidth = 132;
    const maxHeight = 132;
    const scale = Math.min(maxWidth / bounds.width, maxHeight / bounds.height);
    const renderWidth = Math.max(1, Math.floor(bounds.width * scale));
    const renderHeight = Math.max(1, Math.floor(bounds.height * scale));
    const originX = (index % columns) * cellWidth;
    const originY = Math.floor(index / columns) * cellHeight;
    blitReference(
      rgb,
      width,
      image,
      bounds,
      originX + Math.floor((cellWidth - renderWidth) / 2),
      originY + 24 + Math.floor((maxHeight - renderHeight) / 2),
      renderWidth,
      renderHeight,
    );
    drawRgbLabel(rgb, width, entry.id.replaceAll("_", " "), originX + 8, originY + 7, frontend);
  });
  return encodePng(rgb, width, height);
}

function nativeEnemyPanel(archetype, { width = 160, height = 132 } = {}) {
  const registers = new Uint8Array(width * height);
  drawEnemyRaster(registers, width, height, archetype, 8, 26, 0, { scale: 1 });
  for (let phase = 0; phase < archetype.frames; phase += 1) {
    drawEnemyRaster(registers, width, height, archetype, 24 + phase * 44, 52, phase, { scale: 3 });
  }
  drawEnemyRaster(registers, width, height, archetype, 48, 106, 0, {
    scale: 2,
    accent: false,
  });
  return registers;
}

export function createEnemyNativeSpritesPreview(source) {
  const roster = loadEnemyRosterPreviewAsset();
  const frontend = readFrontendGraphicsSource(source);
  const cellWidth = 320;
  const width = cellWidth * roster.implemented.length;
  const height = 170;
  const registers = new Uint8Array(width * height);
  roster.implemented.forEach((archetype, index) => {
    const originX = index * cellWidth;
    drawComparisonLabel(registers, width, `${archetype.id.replaceAll("_", " ")} NATIVE 1X`, originX + 8, 8, frontend);
    drawEnemyRaster(registers, width, height, archetype, originX + 20, 32, 0, { scale: 1 });
    for (let phase = 0; phase < archetype.frames; phase += 1) {
      drawEnemyRaster(registers, width, height, archetype, originX + 72 + phase * 76, 34, phase, {
        scale: 4,
      });
      drawComparisonLabel(registers, width, `P${phase}`, originX + 82 + phase * 76, 110, frontend);
    }
    drawComparisonLabel(registers, width,
      `${archetype.visibleWidth} HPOS  AREA ${archetype.occupiedArea}`,
      originX + 8, 138, frontend);
  });
  return encodePng(scaleAndConvertToRgb(registers, width, height, 1), width, height);
}

export function createEnemyAnchorComparisonPreview(source) {
  const roster = loadEnemyRosterPreviewAsset();
  const frontend = readFrontendGraphicsSource(source);
  const cellWidth = 320;
  const width = cellWidth * roster.implemented.length;
  const height = 220;
  const rgb = Buffer.alloc(width * height * 3, 6);
  roster.implemented.forEach((archetype, index) => {
    const originX = index * cellWidth;
    const image = decodeRgbaReferencePng(fs.readFileSync(path.join(rootDirectory, archetype.reference)));
    const bounds = referenceBounds(image);
    const referenceScale = Math.min(136 / bounds.width, 136 / bounds.height);
    const referenceWidth = Math.floor(bounds.width * referenceScale);
    const referenceHeight = Math.floor(bounds.height * referenceScale);
    blitReference(rgb, width, image, bounds, originX + 8, 34, referenceWidth, referenceHeight);
    const panel = nativeEnemyPanel(archetype);
    const panelRgb = scaleAndConvertToRgb(panel, 160, 132, 1);
    for (let y = 0; y < 132; y += 1) {
      panelRgb.copy(
        rgb,
        ((34 + y) * width + originX + 152) * 3,
        y * 160 * 3,
        (y + 1) * 160 * 3,
      );
    }
    drawRgbLabel(rgb, width, `${archetype.id.replaceAll("_", " ")} REFERENCE  NATIVE`,
      originX + 8, 10, frontend);
    drawRgbLabel(rgb, width, `BODY ${archetype.hardwareWidth}  ${archetype.height} ROWS`,
      originX + 8, 192, frontend, [184, 206, 232]);
  });
  return encodePng(rgb, width, height);
}

export function readEnemyReviewHarnessRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const panelDefinitions = [];
  for (const archetype of graphics.enemyRoster.implemented) {
    const positions = [
      ["LEFT", archetype.logicalBounds[0], 0],
      ["CENTER", Math.floor((archetype.logicalBounds[0] + archetype.logicalBounds[1]) / 2), 1],
      ["RIGHT", archetype.logicalBounds[1], 2],
    ];
    for (const [positionName, enemyX, phase] of positions) {
      const screenState = createCanonicalScreenRuntimeState(graphics, {
        sectorPhase: graphics.capitalHulls.sector.previewSectorRow,
      });
      const pixels = drawGameplayMixedScreen(graphics.hardwareState, screenState.screen, graphics);
      overlayCanonicalPmg(pixels, graphics, {
        enemyX,
        enemyY: 112,
        enemyArchetype: archetype,
        scannerPhase: phase * graphics.enemyRoster.runtime.animationPhaseFrames,
      });
      panelDefinitions.push({
        label: `${archetype.id.replaceAll("_", " ")} ${positionName} P${phase}`,
        archetype,
        enemyX,
        phase,
        pixels,
      });
    }
  }
  return {
    graphics,
    panelDefinitions,
    ...renderLabeledGameplayPanels(readFrontendGraphicsSource(source), panelDefinitions),
  };
}

export function createEnemyReviewHarnessPreview(source, definition) {
  const state = readEnemyReviewHarnessRuntimeState(source, definition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

export function createEnemyScannerComparisonPreview(source) {
  const roster = loadEnemyRosterPreviewAsset();
  const frontend = readFrontendGraphicsSource(source);
  const interceptor = roster.implemented[0];
  const width = 720;
  const height = 150;
  const registers = new Uint8Array(width * height);
  const panels = [
    ["P1 ONLY NO RED", false, 0],
    ["P1 PLUS P2 COMPACT", true, 0],
    ["P1 PLUS P2 HOT", true, 2],
  ];
  panels.forEach(([label, accent, phase], index) => {
    const originX = index * 240;
    drawComparisonLabel(registers, width, label, originX + 12, 10, frontend);
    drawEnemyRaster(registers, width, height, interceptor, originX + 74, 42, phase, {
      scale: 6,
      accent,
    });
  });
  return encodePng(scaleAndConvertToRgb(registers, width, height, 1), width, height);
}

export function createEnemyInterceptorBeforeAfterPreview(source) {
  const roster = loadEnemyRosterPreviewAsset();
  const frontend = readFrontendGraphicsSource(source);
  const interceptor = roster.implemented[0];
  const legacy = {
    ...interceptor,
    height: 12,
    frames: 1,
    bodyRows: Uint8Array.of(0x81, 0xc3, 0xe7, 0x7e, 0x3c, 0x7e, 0xff, 0x7e, 0xdb, 0xc3, 0x81, 0x81),
    bodyBytes: new Uint8Array(16),
    accentFrameBytes: new Uint8Array(16),
  };
  legacy.bodyBytes.set(legacy.bodyRows);
  legacy.accentFrameBytes[5] = 0x80;
  const width = 480;
  const height = 150;
  const registers = new Uint8Array(width * height);
  drawComparisonLabel(registers, width, "SCHEMATIC BASELINE", 28, 10, frontend);
  drawComparisonLabel(registers, width, "FINAL NATIVE INTERCEPTOR", 274, 10, frontend);
  drawEnemyRaster(registers, width, height, legacy, 68, 42, 0, { scale: 6 });
  drawEnemyRaster(registers, width, height, interceptor, 306, 42, 2, { scale: 6 });
  return encodePng(scaleAndConvertToRgb(registers, width, height, 1), width, height);
}

export function readEnemyPaletteCandidateRuntimeState(
  source,
  candidateId,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const candidate = graphics.enemyRoster.runtime.colourPolicy.candidates.find(
    ({ id }) => id === candidateId,
  );
  if (!candidate) throw new Error(`Unknown enemy palette candidate ${candidateId}`);
  const interceptor = graphics.releaseEnemy;
  const enemyY = 96;
  const pulsePolicy = graphics.enemyRoster.runtime.weaponPolicy.singlePulse;
  const positionSpecs = [
    ["LEFT BOUND BESIDE ALLIED HULL", interceptor.logicalBounds[0]],
    ["CENTER WITH PLAYER_FIGHTER AND M0", Math.floor((interceptor.logicalBounds[0] + interceptor.logicalBounds[1]) / 2)],
    ["RIGHT BOUND BESIDE ENEMY HULL", interceptor.logicalBounds[1]],
  ];
  const panelDefinitions = [];

  const blackPixels = new Uint8Array(SOURCE_WIDTH * SOURCE_HEIGHT);
  overlayCanonicalPmg(blackPixels, graphics, {
    enemyX: 100,
    enemyY,
    enemyBodyColor: candidate.value,
    enemyAccentColor: graphics.enemyRoster.runtime.colourPolicy.accentValue,
  });
  drawEnemyRaster(blackPixels, SOURCE_WIDTH, SOURCE_HEIGHT, interceptor, 186, 58, 2, {
    scale: 4,
    bodyColor: candidate.value,
    accentColor: graphics.enemyRoster.runtime.colourPolicy.accentValue,
  });
  panelDefinitions.push({
    label: `${candidateId.replaceAll("_", " ")} REG ${candidate.value.toString(16).toUpperCase()} NATIVE PLUS 4X`,
    pixels: blackPixels,
  });

  for (const [label, enemyX] of positionSpecs) {
    const screenState = createCanonicalScreenRuntimeState(graphics, {
      sectorPhase: graphics.capitalHulls.sector.previewSectorRow,
    });
    const pixels = drawGameplayMixedScreen(graphics.hardwareState, screenState.screen, graphics);
    overlayCanonicalPmg(pixels, graphics, {
      enemyX,
      enemyY,
      scannerPhase: 16,
      enemyBodyColor: candidate.value,
      enemyAccentColor: graphics.enemyRoster.runtime.colourPolicy.accentValue,
    });
    const pulse = enemyPulseSpawnPosition(interceptor, enemyX, enemyY, pulsePolicy);
    drawTopAnchoredMissileSpan(
      pixels,
      pulse.x,
      pulse.y + 20,
      pulsePolicy.height,
      graphics.enemyRoster.runtime.colourPolicy.accentValue,
    );
    if (label.includes("CENTER")) {
      drawTopAnchoredMissileSpan(
        pixels,
        requireValue(graphics.initialState, "player_x") + 8,
        requireValue(graphics.initialState, "player_y") - 20,
        1,
        requireValue(graphics.hardwareState, "COLPM0"),
      );
    }
    if (label.includes("RIGHT")) {
      drawMissileSpan(pixels, 118, 132, 4, candidate.value, 1);
    }
    panelDefinitions.push({ label, enemyX, pixels, screen: screenState.screen });
  }
  return {
    graphics,
    candidate,
    panelDefinitions,
    ...renderLabeledGameplayPanels(readFrontendGraphicsSource(source), panelDefinitions, 2),
  };
}

export function createEnemyPaletteCandidatePreview(
  source,
  candidateId,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readEnemyPaletteCandidateRuntimeState(source, candidateId, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

export function readEnemyCombatSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const roster = graphics.enemyRoster;
  const interceptor = graphics.releaseEnemy;
  const policy = roster.runtime.weaponPolicy.singlePulse;
  const enemyX = Math.floor((interceptor.logicalBounds[0] + interceptor.logicalBounds[1]) / 2);
  const enemyY = 72;
  const origin = enemyPulseSpawnPosition(interceptor, enemyX, enemyY, policy);
  const playerX = requireValue(graphics.initialState, "player_x");
  const playerY = requireValue(graphics.initialState, "player_y");
  const panelSpecs = [
    { label: "INTERCEPTOR READY  RED SCANNER", pulse: null },
    { label: "RED BURST SHOT 1  PLAYFIELD", pulse: { ...origin } },
    { label: "RED BURST PLUS YELLOW PLAYER_FIGHTER FIRE", pulse: { x: origin.x, y: origin.y + 20 }, playerShot: true },
    { label: "PULSE APPROACH  FIVE LINES PER FRAME", pulse: { x: origin.x, y: playerY - 12 } },
    { label: "PLAYER_FIGHTER HIT  10 DAMAGE  HEALTH 090", pulse: { x: playerX + 3, y: playerY }, health: 90 },
    { label: "INVULNERABLE INTERSECTION  NO DAMAGE", pulse: { x: playerX + 3, y: playerY + 4 }, hidePlayer: true },
    { label: "CAPITAL SHELL PLUS INTERCEPTOR BURST", pulse: { x: origin.x, y: 132 }, capital: true },
    { label: "ALLIED CAPITAL SHELL DESTROYS INTERCEPTOR", capitalHit: true },
    { label: "CLEAN POOL  NO GHOST PIXELS", cleanup: true },
  ];
  const panelDefinitions = panelSpecs.map((spec) => {
    const screenState = createCanonicalScreenRuntimeState(graphics, {
      sectorPhase: graphics.capitalHulls.sector.previewSectorRow,
    });
    if (spec.health === 90) {
      const zero = requireValue(graphics.constants, "CH_ZERO");
      screenState.screen.set([zero, zero + 9, zero], 33);
    }
    if (spec.capital) {
      applyCapitalShellVisualToScreen(screenState.screen, graphics.capitalHulls,
        heavyShellVisual({ state: BROADSIDE_STATES.FLYING, missile: 1,
          owner: "allied", x: 112, y: 118 }, graphics.capitalHulls, 0));
    }
    if (spec.capitalHit) {
      applyCapitalShellVisualToScreen(screenState.screen, graphics.capitalHulls,
        heavyShellVisual({ state: BROADSIDE_STATES.FLYING, missile: 1,
          owner: "allied", x: enemyX + 8, y: enemyY + 8 }, graphics.capitalHulls, 2));
    }
    const pixels = drawGameplayMixedScreen(graphics.hardwareState, screenState.screen, graphics);
    if (!spec.cleanup) {
      overlayCanonicalPmg(pixels, graphics, {
        enemyX,
        enemyY,
        scannerPhase: 16,
        showPlayer: !spec.hidePlayer,
      });
    }
    if (spec.pulse) {
      drawTopAnchoredMissileSpan(
        pixels,
        spec.pulse.x,
        spec.pulse.y,
        policy.height,
        roster.runtime.colourPolicy.accentValue,
      );
    }
    if (spec.playerShot) {
      drawTopAnchoredMissileSpan(
        pixels,
        playerX + 8,
        playerY - 28,
        graphics.capitalHulls.broadside.projectileVisuals.player.height,
        requireValue(graphics.constants, "GAMEPLAY_COLPF2"),
      );
    }
    return { ...spec, pixels, screen: screenState.screen };
  });

  let simulation = { ...createEnemyCombatState(roster, { difficulty: 1 }), fireTimer: 0 };
  simulation = stepEnemyCombatFrame(roster, simulation, { archetype: interceptor, enemyX, enemyY });
  const spawnedPulse = simulation.pool.find(Boolean);
  return {
    graphics,
    origin,
    spawnedPulse,
    panelDefinitions,
    ...renderLabeledGameplayPanels(readFrontendGraphicsSource(source), panelDefinitions),
  };
}

export function createEnemyCombatSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readEnemyCombatSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

export function createInterceptorNaturalFireTrace(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const scenarios = [
    ["OPEN_MEDIUM", simulateNaturalInterceptorFire(graphics.enemyRoster, {
      difficulty: 1,
      frameCount: 120,
    })],
    ["BROADSIDE_HARD", simulateNaturalInterceptorFire(graphics.enemyRoster, {
      difficulty: 2,
      frameCount: 100,
      initialSizeM: 0x44,
    })],
  ];
  const header = [
    "scenario", "frame", "enemy_slot", "archetype", "visibility", "enemy_y",
    "burst_state", "shot_index", "timer_before", "timer", "pool_occupancy",
    "allocation_result", "projectile_owner", "render_slot", "hpos", "y", "sizem",
    "active_playfield_projectiles",
  ].join(",");
  const rows = [header];
  for (const [scenario, simulation] of scenarios) {
    for (const entry of simulation.trace) {
      rows.push([
        scenario,
        entry.frame,
        entry.enemySlot,
        entry.archetype,
        Number(entry.visibility),
        entry.enemyY,
        entry.burstState,
        entry.shotIndex,
        entry.cooldownBefore,
        entry.cooldown,
        entry.poolOccupancy.join("|"),
        entry.allocationResult,
        entry.projectileOwner,
        entry.renderSlot,
        entry.hpos ?? "",
        entry.y ?? "",
        `$${entry.sizeM.toString(16).padStart(2, "0").toUpperCase()}`,
        entry.activePlayfieldProjectiles.map(({ renderSlot, x, previousY, y, width, height }) =>
          `PF${renderSlot}:${x}:${previousY}>${y}:${width}x${height}`).join("|"),
      ].join(","));
    }
  }
  return `${rows.join("\n")}\n`;
}

export function createFighterBurstRuntimeTrace(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const player_fighter = simulatePlayerFighterBurst(graphics.fighterWeapons, 70, {
    fireHeld: true,
    playerX: requireValue(graphics.initialState, "player_x"),
    playerY: requireValue(graphics.initialState, "player_y"),
  });
  const interceptor = simulateNaturalInterceptorFire(graphics.enemyRoster, {
    difficulty: 1,
    frameCount: 100,
    enemyX: 120,
    player: { x: 124, y: 184, width: 8, height: 16 },
  });
  const header = [
    "weapon", "frame", "source_slot", "burst_state", "shot_index",
    "burst_interval", "post_burst_timer", "allocation_result", "projectile_slot",
    "previous_x", "previous_y", "current_x", "current_y", "visible_width",
    "visible_height", "colour_source", "colour_value", "collision_result",
    "player_fighter_energy_before", "player_fighter_energy_after",
  ].join(",");
  const rows = [header];
  for (const entry of player_fighter.trace) {
    const allocated = entry.allocationResult === "ALLOCATED";
    const shot = allocated ? entry.active.at(-1) : null;
    rows.push([
      "PLAYER_FIGHTER", entry.frame, 0, entry.burstState, entry.shotsEmitted,
      graphics.fighterWeapons.player_fighter.burstIntervalFrames, entry.timer,
      entry.allocationResult, shot ? entry.active.length - 1 : "",
      shot?.x ?? "", shot?.previousY ?? "", shot?.x ?? "", shot?.y ?? "",
      shot?.width ?? "", shot?.height ?? "", "COLPF2",
      `$${graphics.fighterWeapons.player_fighter.colourValue.toString(16).padStart(2, "0").toUpperCase()}`,
      "NONE", 100, 100,
    ].join(","));
  }
  for (const entry of interceptor.trace) {
    const pulse = entry.activePlayfieldProjectiles.at(-1);
    rows.push([
      "INTERCEPTOR", entry.frame, entry.enemySlot, entry.burstState, entry.shotIndex,
      graphics.fighterWeapons.interceptor.burstIntervalFrames, entry.cooldown,
      entry.allocationResult, pulse?.renderSlot ?? "", pulse?.x ?? "",
      pulse?.previousY ?? "", pulse?.x ?? "", pulse?.y ?? "", pulse?.width ?? "",
      pulse?.height ?? "", "COLPF3",
      `$${graphics.fighterWeapons.interceptor.colourValue.toString(16).padStart(2, "0").toUpperCase()}`,
      entry.collisionResult, entry.playerHealthBefore, entry.playerHealth,
    ].join(","));
  }
  return `${rows.join("\n")}\n`;
}

export function createFighterWeaponTransitionTrace(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const header = [
    "scenario", "frame", "sector_type", "sector_position", "broadside_phase",
    "sector_state", "player_lifecycle", "invulnerability_frames", "raw_fire",
    "previous_fire", "fire_interpretation", "weapon_controller_calls",
    "burst_state", "shot_index", "interval_timer", "reload_cooldown_timer",
    "projectile_pool_occupancy", "player_fighter_projectile_slots_occupied",
    "render_slot_owner", "allocation_requested", "allocation_result",
    "rejection_reason", "projectile_created", "projectile_rendered",
  ].join(",");
  const rows = [header];
  const phaseAt = (frame, transition) => {
    if (!transition) return {
      sectorType: "OPEN_SPACE", sectorPosition: 239, broadsidePhase: "NONE", sectorState: "ACTIVE",
      drain: false, complete: false,
    };
    if (frame < 0) return {
      sectorType: "BROADSIDE", sectorPosition: Math.min(239, 225 + Math.floor((frame + 60) / 4)),
      broadsidePhase: "PROW", sectorState: "ACTIVE", drain: false, complete: false,
    };
    if (frame < 92) return {
      sectorType: "BROADSIDE", sectorPosition: 240 + Math.floor(frame / 4),
      broadsidePhase: "DRAIN", sectorState: "DRAIN", drain: true, complete: false,
    };
    return {
      sectorType: "OPEN_SPACE", sectorPosition: 263, broadsidePhase: "COMPLETE",
      sectorState: "COMPLETE", drain: false, complete: true,
    };
  };
  const freshFrames = new Set([20, 95, 100]);
  const fireFor = (scenario, frame) => scenario === "TRANSITION_FRESH"
    ? freshFrames.has(frame)
    : true;
  for (const [scenario, transition] of [
    ["ORDINARY_HELD_CONTROL", false],
    ["TRANSITION_HELD", true],
    ["TRANSITION_FRESH", true],
  ]) {
    let state = createPlayerFighterBurstState(graphics.fighterWeapons);
    let previousFire = 1;
    for (let frame = -60; frame <= 120; frame += 1) {
      const phase = phaseAt(frame, transition);
      const fireHeld = fireFor(scenario, frame);
      const before = state;
      const shotsBefore = state.shotsEmitted;
      state = stepPlayerFighterBurst(graphics.fighterWeapons, state, {
        fireHeld,
        drain: phase.drain,
        sectorComplete: phase.complete,
        playerX: requireValue(graphics.initialState, "player_x"),
        playerY: requireValue(graphics.initialState, "player_y"),
      });
      const allocated = state.shotsEmitted > shotsBefore;
      const occupancy = state.pool.filter(Boolean).length;
      const allocationDue = fireHeld && (before.burstState === "WAITING" || before.timer <= 1);
      const interpretation = fireHeld
        ? previousFire ? "FRESH_PRESS" : "HELD"
        : "RELEASED";
      const shotIndex = state.burstState === "WAITING"
        ? 0
        : graphics.fighterWeapons.player_fighter.burstCount - state.burstRemaining;
      rows.push([
        scenario, frame, phase.sectorType, phase.sectorPosition, phase.broadsidePhase,
        phase.sectorState, "ALIVE", 0, fireHeld ? 0 : 1, previousFire,
        interpretation, 1, state.burstState, shotIndex,
        state.burstState === "FIRING_BURST" ? state.timer : 0,
        state.burstState === "POST_BURST_COOLDOWN" ? state.timer : 0,
        occupancy, occupancy, occupancy ? "ANTIC4_FIXED_POOL" : "FREE",
        Number(allocationDue), allocated ? "ALLOCATED" : allocationDue ? "REJECTED" : "NONE",
        allocationDue && !allocated ? "POOL_FULL" : "NONE", Number(allocated), Number(occupancy > 0),
      ].join(","));
      previousFire = fireHeld ? 0 : 1;
    }
  }
  return `${rows.join("\n")}\n`;
}

export function createSharedFighterExplosionTrace(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const explosion = graphics.fighterWeapons.sharedFighterExplosion;
  const rows = [[
    "owner", "visible_frame", "animation_frame", "timer", "x", "y",
    "outer_mask", "core_mask", "active",
  ].join(",")];
  for (const [owner, x, y] of [["PLAYER_FIGHTER", 124, 188], ["INTERCEPTOR", 120, 91]]) {
    let state = createSharedFighterExplosion(graphics.fighterWeapons, { owner, x, y });
    for (let visibleFrame = 0; visibleFrame < explosion.totalFrames; visibleFrame += 1) {
      const offset = state.frame * explosion.heightScanlines;
      rows.push([
        owner,
        visibleFrame,
        state.frame,
        state.timer,
        state.x,
        state.y,
        [...explosion.outerBytes.subarray(offset, offset + explosion.heightScanlines)]
          .map((byte) => byte.toString(16).padStart(2, "0")).join("|"),
        explosion.coreMasks[state.frame].toString(16).padStart(2, "0"),
        Number(state.active),
      ].join(","));
      state = stepSharedFighterExplosion(graphics.fighterWeapons, state);
    }
  }
  return `${rows.join("\n")}\n`;
}

export function createSharedFighterExplosionPreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const explosion = graphics.fighterWeapons.sharedFighterExplosion;
  const cellWidth = 56;
  const cellHeight = 40;
  const labelHeight = 12;
  const width = cellWidth * explosion.frameCount;
  const height = cellHeight * 2;
  const registerPixels = new Uint8Array(width * height);
  const frontend = readFrontendGraphicsSource(source);
  const owners = [
    { label: "PLAYER_FIGHTER", outer: 0x28, core: 0x0e },
    { label: "INTERCEPTOR", outer: 0x46, core: 0x84 },
  ];
  for (const [ownerIndex, owner] of owners.entries()) {
    for (let frame = 0; frame < explosion.frameCount; frame += 1) {
      const originX = frame * cellWidth;
      const originY = ownerIndex * cellHeight;
      drawComparisonLabel(registerPixels, width, `${owner.label} F${frame + 1}`,
        originX + 2, originY + 2, frontend);
      const offset = frame * explosion.heightScanlines;
      const coreMask = explosion.coreMasks[frame];
      for (let row = 0; row < explosion.heightScanlines; row += 1) {
        const outerMask = explosion.outerBytes[offset + row];
        for (let bit = 0; bit < explosion.widthBits; bit += 1) {
          const mask = 0x80 >>> bit;
          if ((outerMask & mask) === 0) continue;
          const colour = (outerMask & coreMask & mask) !== 0 ? owner.core : owner.outer;
          const pixelX = originX + 12 + bit * 4;
          const pixelY = originY + labelHeight + 8 + row;
          registerPixels.fill(colour, pixelY * width + pixelX,
            pixelY * width + pixelX + 4);
        }
      }
    }
  }
  return encodePng(
    scaleAndConvertToRgb(registerPixels, width, height),
    width * PREVIEW_SCALE,
    height * PREVIEW_SCALE,
  );
}

function simulateDebrisTrajectory(asset, trajectoryId, {
  variant = 0,
  initialPhase = 0,
  startColumn = 20,
  initialRingHead = 20,
} = {}) {
  const trajectory = asset.debrisMotion.trajectories.find(({ id }) => id === trajectoryId);
  if (!trajectory) throw new Error(`Unknown debris trajectory ${trajectoryId}`);
  const states = [];
  let column = startColumn;
  let phase = initialPhase;
  let horizontalAccumulator = 0;
  let verticalAccumulator = asset.archetypes[0].lifetime;
  let nearAccumulator = 0;
  let ringHead = initialRingHead;
  let yScanline = asset.coordinateSystem.gameplayTopScanline;
  let event = 0;
  const append = (active) => {
    const logicalRow = Math.floor(
      (yScanline - asset.coordinateSystem.gameplayTopScanline) / 8,
    );
    const physicalRow = (ringHead + logicalRow) % asset.coordinateSystem.logicalRows;
    states.push({
      event,
      active,
      worldRowAdvanced: event > 0,
      nearRowAdvanced: event > 0 && nearAccumulator === 0,
      variant,
      phase,
      trajectory: trajectoryId,
      vxSignedHpos: trajectory.vxSignedHpos,
      xHpos: 48 + column * 4,
      column,
      yScanline,
      logicalRow,
      ringHead,
      physicalAddress: 0x4050 + physicalRow * 40 + column,
      horizontalAccumulator,
      verticalAccumulator,
    });
  };
  append(true);
  while (states.at(-1).active) {
    event += 1;
    nearAccumulator += 1;
    if (nearAccumulator >= 2) {
      nearAccumulator -= 2;
      ringHead = (ringHead + 1) % asset.coordinateSystem.logicalRows;
    }
    verticalAccumulator += asset.debrisMotion.verticalStepNumerator;
    if (verticalAccumulator >= asset.debrisMotion.verticalStepDenominator) {
      verticalAccumulator -= asset.debrisMotion.verticalStepDenominator;
      yScanline += asset.archetypes[0].initialVy;
      if (yScanline >= asset.coordinateSystem.gameplayBottomExclusive) {
        append(false);
        break;
      }
    }
    phase ^= 1;
    if (trajectory.vxSignedHpos !== 0) {
      horizontalAccumulator += 1;
      if (horizontalAccumulator === asset.debrisMotion.horizontalStepWorldRows) {
        horizontalAccumulator = 0;
        column += Math.sign(trajectory.vxSignedHpos);
      }
    }
    append(true);
  }
  return states;
}

function fillRgb(rgb, color) {
  for (let offset = 0; offset < rgb.length; offset += 3) {
    rgb[offset] = color[0];
    rgb[offset + 1] = color[1];
    rgb[offset + 2] = color[2];
  }
}

function fillRgbRect(rgb, width, height, x, y, boxWidth, boxHeight, color) {
  for (let row = Math.max(0, y); row < Math.min(height, y + boxHeight); row += 1) {
    for (let column = Math.max(0, x); column < Math.min(width, x + boxWidth); column += 1) {
      const offset = (row * width + column) * 3;
      rgb[offset] = color[0];
      rgb[offset + 1] = color[1];
      rgb[offset + 2] = color[2];
    }
  }
}

function strokeRgbRect(rgb, width, height, x, y, boxWidth, boxHeight, color) {
  fillRgbRect(rgb, width, height, x, y, boxWidth, 1, color);
  fillRgbRect(rgb, width, height, x, y + boxHeight - 1, boxWidth, 1, color);
  fillRgbRect(rgb, width, height, x, y, 1, boxHeight, color);
  fillRgbRect(rgb, width, height, x + boxWidth - 1, y, 1, boxHeight, color);
}

function drawDebrisGlyphRgb(rgb, width, height, glyph, x, y, scaleX, scaleY) {
  const palette = [0x00, 0x0e, 0x84, 0x1e].map(atariPalRegisterToRgb);
  for (let row = 0; row < 8; row += 1) {
    for (let pixel = 0; pixel < 4; pixel += 1) {
      const value = glyph[row] >> (6 - pixel * 2) & 3;
      if (value === 0) continue;
      fillRgbRect(rgb, width, height, x + pixel * scaleX, y + row * scaleY,
        scaleX, scaleY, palette[value]);
    }
  }
}

function drawDebrisPhaseRgb(rgb, width, height, glyphs, x, y, scaleX, scaleY) {
  glyphs.forEach((glyph, cell) => {
    drawDebrisGlyphRgb(rgb, width, height, glyph, x + cell * 4 * scaleX, y, scaleX, scaleY);
  });
}

const PREVIOUS_DEBRIS_REVIEW_VARIANTS = [
  [
    [[8, 46, 191, 251, 191, 46, 8, 0], [0, 128, 224, 254, 235, 184, 32, 8]],
    [[0, 128, 224, 254, 235, 184, 32, 8], [8, 46, 191, 251, 191, 46, 8, 0]],
  ],
  [
    [[8, 42, 136, 251, 191, 46, 8, 0], [0, 128, 224, 254, 235, 184, 32, 8]],
    [[0, 128, 224, 254, 235, 184, 32, 8], [8, 42, 136, 251, 191, 46, 8, 0]],
  ],
];

export function createDebrisReviewTrace(
  definition = loadEntityEffectsDefinition(DEFAULT_ENTITY_EFFECTS_DEFINITION_PATH),
) {
  const asset = compileEntityEffects(definition);
  const rows = [[
    "scenario", "event", "world_row_advanced", "near_row_advanced", "active", "variant", "phase",
    "trajectory", "vx_signed_hpos", "move_accumulator", "vertical_accumulator",
    "x_hpos", "y_scanline",
    "logical_row", "ring_head", "left_physical_address", "right_physical_address",
    "left_backing_before", "right_backing_before", "left_glyph_offset", "right_glyph_offset",
    "left_backing_after_erase", "right_backing_after_erase",
    "contact", "hull_before", "hull_after",
  ].join(",")];
  for (const [index, trajectory] of asset.debrisMotion.trajectories.entries()) {
    for (const state of simulateDebrisTrajectory(asset, trajectory.id, {
      variant: index & 1,
      initialPhase: index >> 1,
    })) {
      rows.push([
        `FULL_PASS_${trajectory.id.toUpperCase()}`,
        state.event,
        Number(state.worldRowAdvanced),
        Number(state.nearRowAdvanced),
        Number(state.active),
        state.variant,
        state.phase,
        state.trajectory,
        state.vxSignedHpos,
        state.horizontalAccumulator,
        state.verticalAccumulator,
        state.xHpos,
        state.yScanline,
        state.logicalRow,
        state.ringHead,
        `$${state.physicalAddress.toString(16).toUpperCase()}`,
        `$${(state.physicalAddress + 1).toString(16).toUpperCase()}`,
        "$91",
        "$92",
        state.variant * 4 + state.phase * 2,
        state.variant * 4 + state.phase * 2 + 1,
        "$91",
        "$92",
        "NONE",
        10,
        10,
      ].join(","));
    }
  }
  for (const [contact, hullAfter, active] of [
    ["DAMAGE_ACCEPTED", 9, 0], ["INVULNERABLE", 10, 1],
  ]) {
    rows.push([
      "PLAYER_CONTACT", 0, 0, 0, active, 0, 0, "straight", 0, 0, 0, 124, 184,
      20, 0, "$4383", "$4384", "$66", "$67", 0, 1, "$66", "$67",
      contact, 10, hullAfter,
    ].join(","));
  }
  return `${rows.join("\n")}\n`;
}

export function createDebrisReviewPreview(
  source,
  definition = loadEntityEffectsDefinition(DEFAULT_ENTITY_EFFECTS_DEFINITION_PATH),
) {
  const asset = compileEntityEffects(definition);
  const starfield = compileStarfield(loadStarfieldDefinition(DEFAULT_STARFIELD_DEFINITION_PATH));
  const frontend = readFrontendGraphicsSource(source);
  const width = 1280;
  const height = 880;
  const rgb = Buffer.alloc(width * height * 3);
  const background = [3, 5, 9];
  const panel = [10, 15, 23];
  const steel = atariPalRegisterToRgb(0x84);
  const gold = atariPalRegisterToRgb(0x1e);
  const white = atariPalRegisterToRgb(0x0e);
  const red = atariPalRegisterToRgb(0x46);
  fillRgb(rgb, background);
  drawRgbLabel(rgb, width, "DEBRIS OWNER RETEST  PREVIOUS VERSUS LARGER", 24, 18, frontend, white);
  drawRgbLabel(rgb, width, "SAME 2X1 RENDERER  SAME GLYPHS  SAME HITBOX", 24, 34,
    frontend, steel);

  const phaseLabels = ["ARMOUR SHARD P0", "ARMOUR SHARD P1",
    "TRUSS FRAGMENT P0", "TRUSS FRAGMENT P1"];
  fillRgbRect(rgb, width, height, 34, 52, 1212, 112, panel);
  strokeRgbRect(rgb, width, height, 34, 52, 1212, 112, steel);
  drawRgbLabel(rgb, width, "NATIVE 1X", 48, 62, frontend, gold);
  const nearStar = [starfield.nearLayer.glyphs.find(({ id }) => id === "POINT").bytes];
  drawRgbLabel(rgb, width, "MAX NEAR STAR", 62, 100, frontend, white);
  drawDebrisPhaseRgb(rgb, width, height, nearStar, 180, 98, 2, 1);
  for (let phaseIndex = 0; phaseIndex < phaseLabels.length; phaseIndex += 1) {
    const x = 278 + phaseIndex * 230;
    const variant = phaseIndex >> 1;
    const phase = phaseIndex & 1;
    drawRgbLabel(rgb, width, phaseLabels[phaseIndex], x, 62, frontend,
      variant === 0 ? gold : steel);
    drawRgbLabel(rgb, width, "OLD", x, 88, frontend, white);
    drawDebrisPhaseRgb(rgb, width, height,
      PREVIOUS_DEBRIS_REVIEW_VARIANTS[variant][phase], x + 52, 86, 2, 1);
    drawRgbLabel(rgb, width, "NEW", x, 124, frontend, gold);
    drawDebrisPhaseRgb(rgb, width, height,
      asset.debrisVisuals.variants[variant].phases[phase], x + 52, 122, 2, 1);
  }

  drawRgbLabel(rgb, width, "ENLARGED OLD AND NEW", 48, 178, frontend, gold);
  strokeRgbRect(rgb, width, height, 34, 194, 226, 86, steel);
  drawRgbLabel(rgb, width, "MAX NEAR STAR", 46, 202, frontend, white);
  drawDebrisPhaseRgb(rgb, width, height, nearStar, 114, 216, 8, 6);
  drawRgbLabel(rgb, width, "REFERENCE", 92, 266, frontend, steel);
  for (let phaseIndex = 0; phaseIndex < 4; phaseIndex += 1) {
    const x = 276 + phaseIndex * 242;
    const variant = phaseIndex >> 1;
    const phase = phaseIndex & 1;
    strokeRgbRect(rgb, width, height, x, 194, 226, 86, steel);
    drawRgbLabel(rgb, width, phaseLabels[phaseIndex], x + 12, 202, frontend,
      variant === 0 ? gold : steel);
    drawDebrisPhaseRgb(rgb, width, height,
      PREVIOUS_DEBRIS_REVIEW_VARIANTS[variant][phase], x + 8, 216, 8, 6);
    drawDebrisPhaseRgb(rgb, width, height,
      asset.debrisVisuals.variants[variant].phases[phase], x + 132, 216, 8, 6);
    drawRgbLabel(rgb, width, "OLD", x + 18, 266, frontend, white);
    drawRgbLabel(rgb, width, "NEW", x + 142, 266, frontend, gold);
  }

  const trajectoryLabels = ["STRAIGHT", "SLIGHT LEFT", "SLIGHT RIGHT"];
  for (let trajectoryIndex = 0; trajectoryIndex < 3; trajectoryIndex += 1) {
    const panelX = 34 + trajectoryIndex * 414;
    const panelY = 300;
    const panelWidth = 380;
    const panelHeight = 334;
    fillRgbRect(rgb, width, height, panelX, panelY, panelWidth, panelHeight, panel);
    strokeRgbRect(rgb, width, height, panelX, panelY, panelWidth, panelHeight, steel);
    drawRgbLabel(rgb, width, trajectoryLabels[trajectoryIndex], panelX + 12, panelY + 12,
      frontend, white);
    drawRgbLabel(rgb, width, "SPAWN Y24", panelX + 250, panelY + 12, frontend, gold);
    const corridorX = panelX + 78;
    const pathTop = panelY + 42;
    const columnWidth = 10;
    const rowHeight = 12;
    strokeRgbRect(rgb, width, height, corridorX, pathTop,
      22 * columnWidth + 1, 22 * rowHeight + 1, steel);
    const states = simulateDebrisTrajectory(asset,
      asset.debrisMotion.trajectories[trajectoryIndex].id, {
        variant: trajectoryIndex & 1,
        initialPhase: trajectoryIndex >> 1,
      });
    const visibleRows = new Map();
    for (const state of states.filter(({ active }) => active)) {
      visibleRows.set(state.logicalRow, state);
    }
    for (const state of visibleRows.values()) {
      drawDebrisPhaseRgb(rgb, width, height,
        asset.debrisVisuals.variants[state.variant].phases[state.phase],
        corridorX + (state.column - 9) * columnWidth + 1,
        pathTop + state.logicalRow * rowHeight + 2, 2, 1);
    }
    const finalState = states.at(-2);
    drawRgbLabel(rgb, width,
      `X ${states[0].xHpos} TO ${finalState.xHpos}`, panelX + 12, panelY + 306,
      frontend, gold);
    drawRgbLabel(rgb, width, "DESPAWN Y200", panelX + 240, panelY + 306, frontend, white);
  }

  fillRgbRect(rgb, width, height, 34, 658, 590, 196, panel);
  strokeRgbRect(rgb, width, height, 34, 658, 590, 196, steel);
  drawRgbLabel(rgb, width, "PLAYER CONTACT AND SHARED DAMAGE GATE", 48, 672, frontend, white);
  drawRgbLabel(rgb, width, "VULNERABLE  HULL 100 TO 090  DEBRIS REMOVED", 48, 700,
    frontend, gold);
  drawDebrisPhaseRgb(rgb, width, height,
    asset.debrisVisuals.variants[0].phases[0], 54, 724, 6, 4);
  fillRgbRect(rgb, width, height, 130, 724, 48, 32, white);
  fillRgbRect(rgb, width, height, 144, 716, 20, 48, white);
  fillRgbRect(rgb, width, height, 210, 736, 72, 3, gold);
  drawRgbLabel(rgb, width, "DAMAGE 1", 294, 728, frontend, gold);
  drawRgbLabel(rgb, width, "INVULNERABLE  HULL 100  DEBRIS REMAINS", 48, 792,
    frontend, steel);
  drawDebrisPhaseRgb(rgb, width, height,
    asset.debrisVisuals.variants[0].phases[1], 474, 780, 6, 4);

  fillRgbRect(rgb, width, height, 656, 658, 590, 196, panel);
  strokeRgbRect(rgb, width, height, 656, 658, 590, 196, steel);
  drawRgbLabel(rgb, width, "A2 RING WRAP AND BYTE-EXACT BACKING", 670, 672, frontend, white);
  for (const [index, head] of [20, 21, 0, 1].entries()) {
    const x = 680 + index * 138;
    strokeRgbRect(rgb, width, height, x, 706, 118, 82, index === 2 ? gold : steel);
    drawRgbLabel(rgb, width, `HEAD ${head.toString().padStart(2, "0")}`,
      x + 14, 716, frontend, index === 2 ? gold : white);
    drawDebrisPhaseRgb(rgb, width, height,
      asset.debrisVisuals.variants[index >> 1].phases[index & 1], x + 18, 736, 8, 4);
  }
  drawRgbLabel(rgb, width, "LOWER 91  ENTITY  RESTORE 91  NO GHOST", 670, 810,
    frontend, red);
  drawRgbLabel(rgb, width, "FULL 22-ROW PASSES AND ALL WRAPS IN CSV TRACE", 670, 828,
    frontend, steel);
  return encodePng(rgb, width, height);
}

export function createDestructibleDebrisTrace(
  _definition = loadEntityEffectsDefinition(DEFAULT_ENTITY_EFFECTS_DEFINITION_PATH),
) {
  const xex = executeDebrisDestructionTrace({ artifact: "xex" });
  const atr = executeDebrisDestructionTrace({ artifact: "atr" });
  assertDebrisDestructionTraceParity(xex, atr);
  const atrRows = debrisDestructionTraceCsv(atr).trimEnd().split("\n").slice(1);
  return `${debrisDestructionTraceCsv(xex).trimEnd()}\n${atrRows.join("\n")}\n`;
}

function copyRgbPanel(destination, destinationWidth, destinationHeight,
  source, sourceWidth, sourceHeight, x, y) {
  for (let row = 0; row < sourceHeight; row += 1) {
    const destinationY = y + row;
    if (destinationY < 0 || destinationY >= destinationHeight) continue;
    const sourceStart = row * sourceWidth * 3;
    const destinationStart = (destinationY * destinationWidth + x) * 3;
    source.copy(destination, destinationStart, sourceStart, sourceStart + sourceWidth * 3);
  }
}

function runtimeDebrisFrameRgb(record, trace, graphics, scale) {
  const registerPixels = drawAnticScreen(
    graphics.hardwareState,
    record.screen,
    { charset: trace.charset },
    undefined,
    22,
  );
  return scaleAndConvertToRgb(registerPixels, SOURCE_WIDTH, 22 * CHARACTER_HEIGHT, scale);
}

export function createDestructibleDebrisPreview(
  source,
  _definition = loadEntityEffectsDefinition(DEFAULT_ENTITY_EFFECTS_DEFINITION_PATH),
) {
  const trace = executeDebrisDestructionTrace({ artifact: "xex" });
  const atrTrace = executeDebrisDestructionTrace({ artifact: "atr" });
  assertDebrisDestructionTraceParity(trace, atrTrace);
  const constants = parseConstants(source);
  const graphics = {
    hardwareState: new Map([
      ["COLBK", requireValue(constants, "GAMEPLAY_BACKGROUND_COLOR")],
      ["COLPF0", requireValue(constants, "GAMEPLAY_COLPF0")],
      ["COLPF1", requireValue(constants, "GAMEPLAY_COLPF1")],
      ["COLPF2", trace.manifest.fighterWeapons.player_fighter.colourValue],
      ["COLPF3", trace.manifest.fighterWeapons.interceptor.colourValue],
    ]),
  };
  const frontend = readFrontendGraphicsSource(source);
  const selected = [
    ["PRE_HIT", 0, "1 DEBRIS"],
    ["FINAL", 0, "2 FINAL HIT"],
    ["FINAL", 1, "3 YELLOW CORE"],
    ["FINAL", 3, "4 FOUR FRAGMENTS"],
    ["FINAL", 5, "5 EARLY SPREAD"],
    ["FINAL", 12, "6 MID SPREAD"],
    ["FINAL", 29, "7 MAX SPREAD"],
    ["FINAL", 31, "8 CLEAN"],
  ].map(([phase, frame, label]) => ({
    label,
    record: trace.records.find((candidate) => candidate.phase === phase && candidate.frame === frame),
  }));
  if (selected.some(({ record }) => !record)) throw new Error("Runtime debris preview frame is missing");

  const nativeWidth = SOURCE_WIDTH;
  const nativeHeight = 22 * CHARACTER_HEIGHT;
  const panelGap = 12;
  const width = 8 * nativeWidth * 2 + 9 * panelGap;
  const height = 720;
  const rgb = Buffer.alloc(width * height * 3);
  const background = [3, 5, 9];
  const panel = [10, 15, 23];
  const white = atariPalRegisterToRgb(0x0e);
  const steel = atariPalRegisterToRgb(0x84);
  const yellow = atariPalRegisterToRgb(0x1e);
  fillRgb(rgb, background);
  drawRgbLabel(rgb, width, "DEBRIS DESTRUCTION  EXECUTED XEX BYTES  50 FPS", 24, 16,
    frontend, white);
  drawRgbLabel(rgb, width,
    "CORE 5 FRAMES  FRAGMENTS 30 FRAMES  XEX ATR BYTE-EXACT TRACE PARITY", 24, 34,
    frontend, yellow);

  drawRgbLabel(rgb, width, "NATIVE 1 TO 1  EIGHT ACTUAL RUNTIME FRAMES", 24, 58,
    frontend, steel);
  selected.forEach(({ label, record }, index) => {
    const x = panelGap + index * (nativeWidth + panelGap);
    fillRgbRect(rgb, width, height, x - 2, 78, nativeWidth + 4, nativeHeight + 24, panel);
    strokeRgbRect(rgb, width, height, x - 2, 78, nativeWidth + 4, nativeHeight + 24, steel);
    drawRgbLabel(rgb, width, label, x + 4, 84, frontend, white);
    const frameRgb = runtimeDebrisFrameRgb(record, trace, graphics, 1);
    copyRgbPanel(rgb, width, height, frameRgb, nativeWidth, nativeHeight, x, 102);
  });

  drawRgbLabel(rgb, width, "ENLARGED 2X  SAME EXECUTED FRAMES GLYPHS COLORS AND TIMINGS", 24, 306,
    frontend, steel);
  selected.forEach(({ label, record }, index) => {
    const panelWidth = nativeWidth * 2;
    const x = panelGap + index * (panelWidth + panelGap);
    drawRgbLabel(rgb, width, label, x + 4, 330, frontend, white);
    const frameRgb = runtimeDebrisFrameRgb(record, trace, graphics, 2);
    copyRgbPanel(rgb, width, height, frameRgb, panelWidth, nativeHeight * 2, x, 350);
  });
  return encodePng(rgb, width, height);
}

export function createInterceptorBreakupTrace(
  _definition = loadEntityEffectsDefinition(DEFAULT_ENTITY_EFFECTS_DEFINITION_PATH),
) {
  const xex = executeInterceptorBreakupTrace({ artifact: "xex" });
  const atr = executeInterceptorBreakupTrace({ artifact: "atr" });
  assertInterceptorBreakupTraceParity(xex, atr);
  const atrRows = interceptorBreakupTraceCsv(atr).trimEnd().split("\n").slice(1);
  return `${interceptorBreakupTraceCsv(xex).trimEnd()}\n${atrRows.join("\n")}\n`;
}

function runtimeInterceptorFrameRgb(record, trace, graphics, scale) {
  const registers = new Map([
    ["COLBK", record.colbk],
    ["COLPF0", requireValue(graphics.hardwareState, "COLPF0")],
    ["COLPF1", requireValue(graphics.hardwareState, "COLPF1")],
    ["COLPF2", trace.manifest.fighterWeapons.player_fighter.colourValue],
    ["COLPF3", trace.manifest.fighterWeapons.interceptor.colourValue],
  ]);
  const registerPixels = drawAnticScreen(registers, record.screen,
    { charset: trace.charset }, undefined, 22);
  drawPlayer(registerPixels, record.player1, record.hposp1, 0, record.sizep1,
    record.colpm1, PMG_SCREEN_TOP, 24, 200);
  drawPlayer(registerPixels, record.player2, record.hposp2, 0, record.sizep2,
    record.colpm2, PMG_SCREEN_TOP, 24, 200);
  return scaleAndConvertToRgb(registerPixels, SOURCE_WIDTH, 22 * CHARACTER_HEIGHT, scale);
}

export function createInterceptorBreakupPreview(
  source,
  _definition = loadEntityEffectsDefinition(DEFAULT_ENTITY_EFFECTS_DEFINITION_PATH),
) {
  const trace = executeInterceptorBreakupTrace({ artifact: "xex" });
  const atrTrace = executeInterceptorBreakupTrace({ artifact: "atr" });
  assertInterceptorBreakupTraceParity(trace, atrTrace);
  const graphics = readGameGraphicsSource(source);
  const frontend = readFrontendGraphicsSource(source);
  const selected = [
    ["PRE_HIT", 0, "1 INTERCEPTOR"],
    ["BREAKUP", 0, "2 FINAL HIT"],
    ["BREAKUP", 1, "3 FLASH"],
    ["BREAKUP", 2, "4 FLASH"],
    ["BREAKUP", 3, "5 FLASH"],
    ["BREAKUP", 4, "6 FLASH"],
    ["BREAKUP", 5, "7 NO GLYPH"],
    ["BREAKUP", 6, "8 NO GLYPH"],
  ].map(([phase, frame, label]) => ({
    label,
    record: trace.records.find((candidate) => candidate.phase === phase && candidate.frame === frame),
  }));
  if (selected.some(({ record }) => !record)) throw new Error("Runtime Interceptor preview frame is missing");

  const nativeWidth = SOURCE_WIDTH;
  const nativeHeight = 22 * CHARACTER_HEIGHT;
  const panelGap = 12;
  const width = 8 * nativeWidth * 2 + 9 * panelGap;
  const height = 720;
  const rgb = Buffer.alloc(width * height * 3);
  const background = [3, 5, 9];
  const panel = [10, 15, 23];
  const white = atariPalRegisterToRgb(0x0e);
  const steel = atariPalRegisterToRgb(0x84);
  const yellow = atariPalRegisterToRgb(0x1e);
  fillRgb(rgb, background);
  drawRgbLabel(rgb, width, "INTERCEPTOR BREAKUP  EXECUTED XEX BYTES  50 FPS", 24, 16,
    frontend, white);
  drawRgbLabel(rgb, width,
    "FULL SCREEN FLASH UNCHANGED  NO RAIDER CHARACTER EFFECT", 24, 34,
    frontend, yellow);
  drawRgbLabel(rgb, width, "NATIVE 1 TO 1  EIGHT ACTUAL RUNTIME FRAMES", 24, 58,
    frontend, steel);
  selected.forEach(({ label, record }, index) => {
    const x = panelGap + index * (nativeWidth + panelGap);
    fillRgbRect(rgb, width, height, x - 2, 78, nativeWidth + 4, nativeHeight + 24, panel);
    strokeRgbRect(rgb, width, height, x - 2, 78, nativeWidth + 4, nativeHeight + 24, steel);
    drawRgbLabel(rgb, width, label, x + 4, 84, frontend, white);
    const frameRgb = runtimeInterceptorFrameRgb(record, trace, graphics, 1);
    copyRgbPanel(rgb, width, height, frameRgb, nativeWidth, nativeHeight, x, 102);
  });
  drawRgbLabel(rgb, width, "ENLARGED 2X  SAME XEX GLYPHS PMG COLORS AND TIMINGS", 24, 306,
    frontend, steel);
  selected.forEach(({ label, record }, index) => {
    const panelWidth = nativeWidth * 2;
    const x = panelGap + index * (panelWidth + panelGap);
    drawRgbLabel(rgb, width, label, x + 4, 330, frontend, white);
    const frameRgb = runtimeInterceptorFrameRgb(record, trace, graphics, 2);
    copyRgbPanel(rgb, width, height, frameRgb, panelWidth, nativeHeight * 2, x, 350);
  });
  return encodePng(rgb, width, height);
}

export function createWeaponPickupRapidFireTrace() {
  const xex = executeWeaponPickupTrace({ artifact: "xex" });
  const atr = executeWeaponPickupTrace({ artifact: "atr" });
  assertWeaponPickupTraceParity(xex, atr);
  const atrRows = weaponPickupTraceCsv(atr).trimEnd().split("\n").slice(1);
  return `${weaponPickupTraceCsv(xex).trimEnd()}\n${atrRows.join("\n")}\n`;
}

function comparableHudPresentation(trace) {
  return {
    frames: trace.frames,
    hudCharset: trace.hudCharset,
    hullOffset: trace.hullOffset,
    hullSegments: trace.hullSegments,
    boosterOffset: trace.boosterOffset,
    boosterCells: trace.boosterCells,
    boosterSegmentsOffset: trace.boosterSegmentsOffset,
    boosterSegments: trace.boosterSegments,
    hullFullCode: trace.hullFullCode,
    hullDamagedCode: trace.hullDamagedCode,
    boosterFullCode: trace.boosterFullCode,
    hullFullGlyph: trace.hullFullGlyph,
    hullDamagedGlyph: trace.hullDamagedGlyph,
    boosterFullGlyph: trace.boosterFullGlyph,
  };
}

function executedHudPresentation(source) {
  const xex = executeHudPresentationTrace({ artifact: "xex" });
  const atr = executeHudPresentationTrace({ artifact: "atr" });
  if (JSON.stringify(comparableHudPresentation(xex)) !==
      JSON.stringify(comparableHudPresentation(atr))) {
    throw new Error("HUD presentation differs between release XEX and ATR");
  }
  return { trace: xex, frontend: readFrontendGraphicsSource(source) };
}

function runtimeHudRowRgb(record, trace, scale = 1) {
  const registerPixels = new Uint8Array(SOURCE_WIDTH * CHARACTER_HEIGHT);
  drawAntic2Rows({
    pixels: registerPixels,
    pixelHeight: CHARACTER_HEIGHT,
    screen: Uint8Array.from(record.display),
    charset: Uint8Array.from(trace.hudCharset),
    registers: new Map([["COLBK", 0x00], ["COLPF1", 0x0e], ["COLPF2", 0x00]]),
    firstCharacterRow: 0,
    characterRows: 1,
  });
  return scaleAndConvertToRgb(
    registerPixels, SOURCE_WIDTH, CHARACTER_HEIGHT, scale,
  );
}

export function createHudPresentationNativePreview(source) {
  const { trace } = executedHudPresentation(source);
  const rgb = Buffer.alloc(SOURCE_WIDTH * CHARACTER_HEIGHT * trace.frames.length * 3);
  trace.frames.forEach((record, index) => {
    copyRgbPanel(
      rgb, SOURCE_WIDTH, CHARACTER_HEIGHT * trace.frames.length,
      runtimeHudRowRgb(record, trace, 1), SOURCE_WIDTH, CHARACTER_HEIGHT,
      0, index * CHARACTER_HEIGHT,
    );
  });
  return encodePng(rgb, SOURCE_WIDTH, CHARACTER_HEIGHT * trace.frames.length);
}

export function createHudPresentationPreview(source) {
  const { trace, frontend } = executedHudPresentation(source);
  const labels = [
    "1 FULL HULL  NO BOOSTER",
    "2 FULL HULL  FULL BOOST",
    "3 PARTIAL HULL  HALF BOOST",
    "4 CRITICAL HULL  BLINKING BOOST",
  ];
  const width = 1350;
  const height = 300;
  const rgb = Buffer.alloc(width * height * 3);
  const white = atariPalRegisterToRgb(0x0e);
  const steel = atariPalRegisterToRgb(0x84);
  const yellow = atariPalRegisterToRgb(0x1e);
  fillRgb(rgb, [3, 5, 9]);
  drawRgbLabel(rgb, width, "HUD PRESENTATION  EXECUTED RELEASE XEX AND ATR", 24, 14,
    frontend, white);
  drawRgbLabel(rgb, width,
    "HULL LOW ANGULAR PLATES  BOOST TALL ENERGY CELLS  NO COLOR DEPENDENCY", 24, 32,
    frontend, yellow);
  drawRgbLabel(rgb, width, "NATIVE 1 TO 1  320 BY 8 PIXELS PER STATE", 24, 54,
    frontend, steel);
  trace.frames.forEach((record, index) => {
    const x = 10 + index * 335;
    drawRgbLabel(rgb, width, labels[index], x + 4, 72, frontend, white);
    copyRgbPanel(rgb, width, height,
      runtimeHudRowRgb(record, trace, 1), SOURCE_WIDTH, CHARACTER_HEIGHT, x, 92);
  });
  drawRgbLabel(rgb, width, "ENLARGED 2X  SAME PACKED GLYPHS AND SCREEN CODES", 24, 126,
    frontend, steel);
  trace.frames.forEach((record, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 10 + column * 670;
    const y = 148 + row * 70;
    drawRgbLabel(rgb, width, labels[index], x + 4, y, frontend, white);
    copyRgbPanel(rgb, width, height,
      runtimeHudRowRgb(record, trace, 2), SOURCE_WIDTH * 2, CHARACTER_HEIGHT * 2,
      x, y + 20);
  });
  return encodePng(rgb, width, height);
}

export function createShieldBoosterPreview(source) {
  const graphics = readGameGraphicsSource(source);
  const frontend = readFrontendGraphicsSource(source);
  const shield = executeShieldBoosterTrace({ artifact: "xex", coldFill: 0xa5 });
  const atrShield = executeShieldBoosterTrace({ artifact: "atr", coldFill: 0xa5 });
  const capsule = executeWeaponPickupBackingTrace({ artifact: "xex", pickupType: "shield" });
  const atrCapsule = executeWeaponPickupBackingTrace({ artifact: "atr", pickupType: "shield" });
  if (JSON.stringify(shield.activation) !== JSON.stringify(atrShield.activation) ||
      JSON.stringify(capsule.rendered.display) !== JSON.stringify(atrCapsule.rendered.display)) {
    throw new Error("Shield visual state differs between packed XEX and ATR");
  }

  const hudTrace = executeHudPresentationTrace({ artifact: "xex" });
  const display = Uint8Array.from(hudTrace.frames[1].display);
  display.set(shield.activation.hudRegion, 30);
  const registers = new Map(graphics.hardwareState);
  registers.set("COLPM0", shield.activation.colpm0);
  registers.set("COLPM3", shield.activation.colpm3);
  const gameplayFrame = (hpos) => {
    const pixels = drawGameplayMixedScreen(registers, display, {
      ...graphics,
      hudCharset: Uint8Array.from(hudTrace.hudCharset),
    });
    drawPlayer(pixels, graphics.playerShape, hpos, 184, 1,
      shield.activation.colpm0, PMG_SCREEN_TOP, 24, 200);
    drawPlayer(pixels, graphics.playerEngineShape, hpos, 184, 1,
      shield.activation.colpm3, PMG_SCREEN_TOP, 24, 200);
    return scaleAndConvertToRgb(pixels, SOURCE_WIDTH, SOURCE_HEIGHT, 1);
  };
  const capsuleRegisters = new Map(graphics.hardwareState);
  const capsuleFrame = runtimeWeaponPickupFrameRgb(capsule.rendered, {
    charset: capsule.charset,
    hudCharset: capsule.hudCharset,
  }, capsuleRegisters, 1);
  const panels = [capsuleFrame, gameplayFrame(48), gameplayFrame(124), gameplayFrame(200)];
  const labels = ["SHIELD CAPSULE", "PLAYER_FIGHTER LEFT", "PLAYER_FIGHTER CENTRE", "PLAYER_FIGHTER RIGHT"];
  const gap = 12;
  const width = panels.length * SOURCE_WIDTH + (panels.length + 1) * gap;
  const height = SOURCE_HEIGHT + 76;
  const rgb = Buffer.alloc(width * height * 3);
  fillRgb(rgb, [3, 5, 9]);
  const white = atariPalRegisterToRgb(0x0e);
  const steel = atariPalRegisterToRgb(0x84);
  drawRgbLabel(rgb, width, "SHIELD BOOSTER  EXECUTED XEX ATR VISUAL STATE", 16, 10,
    frontend, white);
  drawRgbLabel(rgb, width,
    "STEEL WHITE CAPSULE  DISTINCT CONTINUOUS HUD BAR  SOLID PLAYER_FIGHTER PULSE", 16, 28,
    frontend, steel);
  panels.forEach((panel, index) => {
    const x = gap + index * (SOURCE_WIDTH + gap);
    drawRgbLabel(rgb, width, labels[index], x + 4, 48, frontend, white);
    copyRgbPanel(rgb, width, height, panel, SOURCE_WIDTH, SOURCE_HEIGHT, x, 68);
  });
  return encodePng(rgb, width, height);
}

function runtimeWeaponPickupFrameRgb(record, trace, registers, scale) {
  const display = record.display ?? record.screen ?? record.during;
  const rows = display.length / SCREEN_COLUMNS;
  const charset = record.charsetDuring ?? trace.charset;
  const registerPixels = drawAnticScreen(registers, display,
    { charset: Uint8Array.from(charset) }, undefined, rows);
  if (record.display && trace.hudCharset) {
    const hudRegisters = new Map(registers);
    hudRegisters.set("COLPF1", 0x0e);
    hudRegisters.set("COLPF2", 0x00);
    drawAntic2Rows({
      pixels: registerPixels,
      pixelHeight: rows * CHARACTER_HEIGHT,
      screen: display,
      charset: Uint8Array.from(trace.hudCharset),
      registers: hudRegisters,
      firstCharacterRow: 0,
      characterRows: 1,
    });
  }
  return scaleAndConvertToRgb(registerPixels, SOURCE_WIDTH, rows * CHARACTER_HEIGHT, scale);
}

export function createWeaponPickupRapidFirePreview(source) {
  const trace = executeWeaponPickupTrace({ artifact: "xex" });
  const atr = executeWeaponPickupTrace({ artifact: "atr" });
  const colours = executePlayerFighterProjectileColourTrace({ artifact: "xex" });
  const atrColours = executePlayerFighterProjectileColourTrace({ artifact: "atr" });
  assertWeaponPickupTraceParity(trace, atr);
  if (JSON.stringify({ ...colours, artifact: "release" }) !==
      JSON.stringify({ ...atrColours, artifact: "release" })) {
    throw new Error("Rapid Fire projectile colours differ between release XEX and ATR");
  }
  const constants = parseConstants(source);
  const registers = new Map([
    ["COLBK", requireValue(constants, "GAMEPLAY_BACKGROUND_COLOR")],
    ["COLPF0", requireValue(constants, "GAMEPLAY_COLPF0")],
    ["COLPF1", requireValue(constants, "GAMEPLAY_COLPF1")],
    ["COLPF2", trace.manifest.fighterWeapons.player_fighter.colourValue],
    ["COLPF3", trace.manifest.fighterWeapons.interceptor.colourValue],
  ]);
  const frontend = readFrontendGraphicsSource(source);
  const select = (phase, frame) => trace.records.find((record) =>
    record.phase === phase && record.frame === frame);
  const colourRecord = (display) => ({ display: Uint8Array.from(display) });
  const selected = [
    ["1 RF CAPSULE 2X2", select("ACTIVE", 0)],
    ["2 PICKUP", select("PICKUP", 0)],
    ["3 BOOST FULL", trace.rapidTimerFrames[0]],
    ["4 NORMAL YELLOW", colourRecord(colours.normalDisplay)],
    ["5 RAPID YELLOW", colourRecord(colours.rapidDisplay)],
    ["6 BOOST 1 VISIBLE", trace.rapidTimerFrames[443]],
    ["7 BOOST BLINK HIDDEN", trace.rapidTimerFrames[449]],
    ["8 EXPIRY", trace.rapidTimerFrames[499]],
  ].map(([label, record]) => ({ label, record }));
  if (selected.some(({ record }) => !record)) throw new Error("Rapid Fire runtime preview frame missing");

  const nativeWidth = SOURCE_WIDTH;
  const nativeHeight = 24 * CHARACTER_HEIGHT;
  const gap = 12;
  const width = 8 * nativeWidth * 2 + 9 * gap;
  const height = 850;
  const rgb = Buffer.alloc(width * height * 3);
  const background = [3, 5, 9];
  const panel = [10, 15, 23];
  const white = atariPalRegisterToRgb(0x0e);
  const steel = atariPalRegisterToRgb(0x84);
  const yellow = atariPalRegisterToRgb(0x1e);
  fillRgb(rgb, background);
  drawRgbLabel(rgb, width, "WEAPON PICKUP RF  EXECUTED RELEASE XEX AND ATR", 24, 16,
    frontend, white);
  drawRgbLabel(rgb, width,
    "STATIC STEEL YELLOW 2X2 CAPSULE  BLACK RF  FULL BOOST LABEL  YELLOW FIRE", 24, 34,
    frontend, yellow);
  drawRgbLabel(rgb, width, "NATIVE 1 TO 1  ACTUAL RUNTIME FRAMES", 24, 58,
    frontend, steel);
  selected.forEach(({ label, record }, index) => {
    const x = gap + index * (nativeWidth + gap);
    fillRgbRect(rgb, width, height, x - 2, 78, nativeWidth + 4, nativeHeight + 24, panel);
    strokeRgbRect(rgb, width, height, x - 2, 78, nativeWidth + 4, nativeHeight + 24, steel);
    drawRgbLabel(rgb, width, label, x + 4, 84, frontend, white);
    const frame = runtimeWeaponPickupFrameRgb(record, trace, registers, 1);
    copyRgbPanel(rgb, width, height, frame, nativeWidth, nativeHeight, x, 102);
  });
  drawRgbLabel(rgb, width, "ENLARGED 2X  SAME PACKED GLYPHS SCREEN CODES AND TIMING", 24, 324,
    frontend, steel);
  selected.forEach(({ label, record }, index) => {
    const panelWidth = nativeWidth * 2;
    const x = gap + index * (panelWidth + gap);
    drawRgbLabel(rgb, width, label, x + 4, 348, frontend, white);
    const frame = runtimeWeaponPickupFrameRgb(record, trace, registers, 2);
    copyRgbPanel(rgb, width, height, frame, panelWidth, nativeHeight * 2, x, 368);
  });

  drawRgbLabel(rgb, width, "EXECUTED PLAYER_FIGHTER BURST EMISSION FRAMES", 24, 778, frontend, white);
  drawRgbLabel(rgb, width, "NORMAL YELLOW  0 3 6 9 12 15 18 21", 24, 798, frontend, yellow);
  drawRgbLabel(rgb, width, "RAPID YELLOW   0 2 4 6 8 10 12 14 16 18", 24, 816, frontend, yellow);
  for (const frame of trace.normalBurstFrames) {
    fillRgbRect(rgb, width, height, 700 + frame * 14, 796, 5, 10, yellow);
  }
  for (const frame of trace.rapidBurstFrames) {
    fillRgbRect(rgb, width, height, 700 + frame * 14, 814, 5, 10, yellow);
  }
  return encodePng(rgb, width, height);
}

export function createSpreadShotTrace() {
  const xex = executeSpreadShotTrace({ artifact: "xex" });
  const atr = executeSpreadShotTrace({ artifact: "atr" });
  assertSpreadShotTraceParity(xex, atr);
  const atrRows = spreadShotTraceCsv(atr).trimEnd().split("\n").slice(1);
  return `${spreadShotTraceCsv(xex).trimEnd()}\n${atrRows.join("\n")}\n`;
}

export function createPlayerFighterProjectileColourPreview(source, artifact = "xex") {
  const trace = executePlayerFighterProjectileColourLifecycleTrace({ artifact, coldFill: 0xa5 });
  const parity = executePlayerFighterProjectileColourLifecycleTrace({
    artifact: artifact === "xex" ? "atr" : "xex", coldFill: 0xa5,
  });
  if (JSON.stringify({ ...trace, artifact: "release" }) !==
      JSON.stringify({ ...parity, artifact: "release" })) {
    throw new Error("PlayerFighter projectile colour preview differs between packed XEX and ATR");
  }
  const constants = parseConstants(source);
  const registers = new Map([
    ["COLBK", requireValue(constants, "GAMEPLAY_BACKGROUND_COLOR")],
    ["COLPF0", requireValue(constants, "GAMEPLAY_COLPF0")],
    ["COLPF1", requireValue(constants, "GAMEPLAY_COLPF1")],
    ["COLPF2", trace.palette.COLPF2],
    ["COLPF3", trace.palette.COLPF3],
  ]);
  const frontend = readFrontendGraphicsSource(source);
  const capture = (phase) => trace.captures.find((record) => record.phase === phase);
  const selected = [
    ["1 NORMAL YELLOW", capture("NORMAL")],
    ["2 RAPID YELLOW", capture("RAPID")],
    ["3 SPREAD YELLOW", capture("SPREAD")],
    ["4 AFTER EXPIRY", capture("RAPID_EXPIRED")],
    ["5 PLAYER_FIGHTER AND INTERCEPTOR", { display: trace.mixedDisplay }],
    ["6 INTERCEPTOR COLPF3", trace.interceptor],
  ].map(([label, record]) => ({ label, record }));
  if (selected.some(({ record }) => !record)) throw new Error("Projectile colour frame missing");

  const scale = 2;
  const panelWidth = SOURCE_WIDTH * scale;
  const panelHeight = 24 * CHARACTER_HEIGHT * scale;
  const gap = 12;
  const width = selected.length * panelWidth + (selected.length + 1) * gap;
  const height = panelHeight + 92;
  const rgb = Buffer.alloc(width * height * 3);
  const white = atariPalRegisterToRgb(0x0e);
  const steel = atariPalRegisterToRgb(0x84);
  const yellow = atariPalRegisterToRgb(0x1e);
  fillRgb(rgb, [3, 5, 9]);
  drawRgbLabel(rgb, width,
    "PROJECTILE COLOUR REGRESSION  PACKED XEX AND ATR PARITY  COLD RAM A5",
    24, 14, frontend, white);
  drawRgbLabel(rgb, width,
    "PLAYER_FIGHTER NORMAL RAPID SPREAD COLPF2 $1E    INTERCEPTOR COLPF3 $46", 24, 34,
    frontend, yellow);
  selected.forEach(({ label, record }, index) => {
    const x = gap + index * (panelWidth + gap);
    drawRgbLabel(rgb, width, label, x + 4, 58, frontend, steel);
    const frame = runtimeWeaponPickupFrameRgb(record, trace, registers, scale);
    copyRgbPanel(rgb, width, height, frame, panelWidth, panelHeight, x, 80);
  });
  return encodePng(rgb, width, height);
}

export function createPlayerFighterBurstBalancePreview(source, artifact = "xex") {
  const trace = executePlayerFighterBurstBalanceTrace({ artifact });
  const parity = executePlayerFighterBurstBalanceTrace({ artifact: artifact === "xex" ? "atr" : "xex" });
  if (JSON.stringify({ ...trace, artifact: "release" }) !==
      JSON.stringify({ ...parity, artifact: "release" })) {
    throw new Error("PlayerFighter burst-balance preview differs between packed XEX and ATR");
  }
  const constants = parseConstants(source);
  const registers = new Map([
    ["COLBK", requireValue(constants, "GAMEPLAY_BACKGROUND_COLOR")],
    ["COLPF0", requireValue(constants, "GAMEPLAY_COLPF0")],
    ["COLPF1", requireValue(constants, "GAMEPLAY_COLPF1")],
    ["COLPF2", trace.manifest.fighterWeapons.player_fighter.colourValue],
    ["COLPF3", trace.manifest.fighterWeapons.interceptor.colourValue],
  ]);
  const frontend = readFrontendGraphicsSource(source);
  const scale = 2;
  const panelWidth = SOURCE_WIDTH * scale;
  const panelHeight = 24 * CHARACTER_HEIGHT * scale;
  const gap = 12;
  const width = trace.traces.length * panelWidth + (trace.traces.length + 1) * gap;
  const height = 620;
  const rgb = Buffer.alloc(width * height * 3);
  const white = atariPalRegisterToRgb(0x0e);
  const steel = atariPalRegisterToRgb(0x84);
  const yellow = atariPalRegisterToRgb(0x1e);
  fillRgb(rgb, [3, 5, 9]);
  drawRgbLabel(rgb, width,
    `PLAYER_FIGHTER BURST BALANCE  EXECUTED ${artifact.toUpperCase()}  80 PAL FRAMES HELD FIRE`,
    24, 14, frontend, white);
  drawRgbLabel(rgb, width,
    "NORMAL 8 AT I3    RAPID 10 AT I2    SPREAD 8 FULL SALVOS AT I10    POST 12",
    24, 34, frontend, yellow);
  trace.traces.forEach((mode, index) => {
    const x = gap + index * (panelWidth + gap);
    const record = mode.records.find(({ activeCount }) =>
      activeCount === mode.maximumPoolOccupancy);
    const emitted = mode.mode === "SPREAD"
      ? `${mode.emittedProjectiles} PROJECTILES  ${mode.emittedSalvos} SALVOS`
      : `${mode.emittedProjectiles} PROJECTILES`;
    drawRgbLabel(rgb, width,
      `${mode.mode}  BURST ${mode.expectedBurst}  ${emitted}  POOL ${mode.maximumPoolOccupancy}/10`,
      x + 4, 58, frontend, steel);
    const frame = runtimeWeaponPickupFrameRgb(record,
      { charset: Uint8Array.from(mode.charset) }, registers, scale);
    copyRgbPanel(rgb, width, height, frame, panelWidth, panelHeight, x, 80);
  });
  drawRgbLabel(rgb, width,
    "ALLOCATIONS IN THE SAME 80-FRAME WINDOW  SPREAD MARKS ARE ATOMIC THREE-SHOT SALVOS",
    24, 482, frontend, white);
  trace.traces.forEach((mode, index) => {
    const y = 510 + index * 30;
    drawRgbLabel(rgb, width, mode.mode, 24, y, frontend, steel);
    for (const record of mode.records) {
      if (record.allocatedProjectiles === 0) continue;
      const x = 250 + record.frame * 19;
      fillRgbRect(rgb, width, height, x, y - 2, 6,
        record.allocatedProjectiles === 3 ? 18 : 10, yellow);
    }
  });
  return encodePng(rgb, width, height);
}

export function createPlayerFighterBurstBalanceTrace(artifact = "xex") {
  return player_fighterBurstBalanceTraceCsv(executePlayerFighterBurstBalanceTrace({ artifact }));
}

export function createSpreadShotPreview(source) {
  const trace = executeSpreadShotTrace({ artifact: "xex" });
  const atr = executeSpreadShotTrace({ artifact: "atr" });
  assertSpreadShotTraceParity(trace, atr);
  const constants = parseConstants(source);
  const registers = new Map([
    ["COLBK", requireValue(constants, "GAMEPLAY_BACKGROUND_COLOR")],
    ["COLPF0", requireValue(constants, "GAMEPLAY_COLPF0")],
    ["COLPF1", requireValue(constants, "GAMEPLAY_COLPF1")],
    ["COLPF2", trace.manifest.fighterWeapons.player_fighter.colourValue],
    ["COLPF3", trace.manifest.fighterWeapons.interceptor.colourValue],
  ]);
  const frontend = readFrontendGraphicsSource(source);
  const selected = [
    ["1 SP CAPSULE F0", trace.spreadCapsuleFrames[0]],
    ["2 SP MOVED F1", trace.spreadCapsuleFrames[1]],
    ["3 PICKUP BOOST FULL", trace.spreadPickup],
    ["4 FAN FRAME 1", trace.trajectoryFrames[1]],
    ["5 FAN FRAME 2", trace.trajectoryFrames[2]],
    ["6 FAN FRAME 3", trace.trajectoryFrames[3]],
    ["7 FAN FRAME 4", trace.trajectoryFrames[4]],
    ["8 CLEAN EXIT", trace.projectilesAfterCleanup],
  ].map(([label, record]) => ({ label, record }));
  if (selected.some(({ record }) => !record)) throw new Error("Spread Shot runtime preview frame missing");

  const nativeWidth = SOURCE_WIDTH;
  const nativeHeight = 24 * CHARACTER_HEIGHT;
  const gap = 12;
  const width = 8 * nativeWidth * 2 + 9 * gap;
  const height = 850;
  const rgb = Buffer.alloc(width * height * 3);
  const background = [3, 5, 9];
  const panel = [10, 15, 23];
  const white = atariPalRegisterToRgb(0x0e);
  const steel = atariPalRegisterToRgb(0x84);
  const yellow = atariPalRegisterToRgb(0x1e);
  const red = atariPalRegisterToRgb(0x46);
  fillRgb(rgb, background);
  drawRgbLabel(rgb, width, "SPREAD SHOT  EXECUTED RELEASE XEX AND ATR", 24, 16,
    frontend, white);
  drawRgbLabel(rgb, width,
    "RED 2X2 FAN CAPSULE  FULL BOOST LABEL  THREE YELLOW PLAYER_FIGHTER SHOTS  50 FPS", 24, 34,
    frontend, red);
  drawRgbLabel(rgb, width, "NATIVE 1 TO 1  ACTUAL CONSECUTIVE RUNTIME FRAMES", 24, 58,
    frontend, steel);
  selected.forEach(({ label, record }, index) => {
    const x = gap + index * (nativeWidth + gap);
    fillRgbRect(rgb, width, height, x - 2, 78, nativeWidth + 4, nativeHeight + 24, panel);
    strokeRgbRect(rgb, width, height, x - 2, 78, nativeWidth + 4, nativeHeight + 24, steel);
    drawRgbLabel(rgb, width, label, x + 4, 84, frontend, white);
    const frame = runtimeWeaponPickupFrameRgb(record, trace, registers, 1);
    copyRgbPanel(rgb, width, height, frame, nativeWidth, nativeHeight, x, 102);
  });
  drawRgbLabel(rgb, width, "ENLARGED 2X  SAME PACKED BYTES BACKING AND TRAJECTORIES", 24, 324,
    frontend, steel);
  selected.forEach(({ label, record }, index) => {
    const panelWidth = nativeWidth * 2;
    const x = gap + index * (panelWidth + gap);
    drawRgbLabel(rgb, width, label, x + 4, 348, frontend, white);
    const frame = runtimeWeaponPickupFrameRgb(record, trace, registers, 2);
    copyRgbPanel(rgb, width, height, frame, panelWidth, nativeHeight * 2, x, 368);
  });
  drawRgbLabel(rgb, width, "INITIAL X OFFSET 4 HPOS  SIDE STEP 2  Y STEP 6 SCANLINES", 24, 778,
    frontend, yellow);
  drawRgbLabel(rgb, width, "FOUR CONSECUTIVE FAN FRAMES THEN BYTE-CLEAN REVERSE ERASE", 24, 802,
    frontend, red);
  drawRgbLabel(rgb, width, "XEX ATR TRACE PARITY  NO CONCEPT OR PSEUDO GAMEPLAY", 24, 826,
    frontend, steel);
  return encodePng(rgb, width, height);
}

function spreadShotHullCases(artifact) {
  return [
    ["COL ENG", "allied", "engines", 32],
    ["COL MID", "allied", "midship", 128],
    ["COL PROW", "allied", "prow", 224],
    ["CYL ENG", "hostile", "engines", 32],
    ["CYL MID", "hostile", "midship", 128],
    ["CYL PROW", "hostile", "prow", 224],
  ].map(([label, faction, section, topPhase]) => ({
    label,
    faction,
    section,
    topPhase,
    trace: executeSpreadShotHullVolleyTrace({
      artifact, faction, topPhase, head: 21, frames: 12,
    }),
  }));
}

export function createSpreadShotHullTrace(artifact = "xex") {
  const header = [
    "artifact", "faction", "section", "a2_head", "top_phase", "frame",
    "render_cycles", "erase_cycles", "restore_mismatches",
    "left_active", "left_x", "left_y", "left_code", "left_backing",
    "centre_active", "centre_x", "centre_y", "centre_code", "centre_backing",
    "right_active", "right_x", "right_y", "right_code", "right_backing",
  ];
  const rows = spreadShotHullCases(artifact).flatMap(({ faction, section, topPhase, trace }) =>
    trace.records.map((record) => {
      const projectileFields = record.projectiles.flatMap((projectile) => [
        projectile.active, projectile.x, projectile.y,
        projectile.projectileCode, projectile.backingCode,
      ]);
      return [
        artifact, faction, section, trace.head, topPhase, record.frame,
        record.renderCycles, record.eraseCycles, record.restoreMismatches,
        ...projectileFields,
      ].join(",");
    }));
  return `${header.join(",")}\n${rows.join("\n")}\n`;
}

export function createSpreadShotHullPreview(source, artifact = "xex") {
  const activation = executeSpreadShotTrace({ artifact });
  const hullCases = spreadShotHullCases(artifact);
  const constants = parseConstants(source);
  const registers = new Map([
    ["COLBK", requireValue(constants, "GAMEPLAY_BACKGROUND_COLOR")],
    ["COLPF0", requireValue(constants, "GAMEPLAY_COLPF0")],
    ["COLPF1", requireValue(constants, "GAMEPLAY_COLPF1")],
    ["COLPF2", activation.manifest.fighterWeapons.player_fighter.colourValue],
    ["COLPF3", activation.manifest.fighterWeapons.interceptor.colourValue],
  ]);
  const frontend = readFrontendGraphicsSource(source);
  const panels = [
    { label: "ACTIVATE", record: activation.spreadPickup, trace: activation },
    { label: "FAN F0", record: activation.trajectoryFrames[0], trace: activation },
    { label: "FAN F2", record: activation.trajectoryFrames[2], trace: activation },
    { label: "FAN F4", record: activation.trajectoryFrames[4], trace: activation },
    ...hullCases.flatMap(({ label, trace }) => trace.records.map((record) => ({
      label: `${label} F${record.frame.toString().padStart(2, "0")}`,
      record,
      trace,
    }))),
  ];
  const columns = 8;
  const gap = 12;
  const panelStepY = 222;
  const rows = Math.ceil(panels.length / columns);
  const width = columns * SOURCE_WIDTH + (columns + 1) * gap;
  const height = 80 + rows * panelStepY + 28;
  const rgb = Buffer.alloc(width * height * 3);
  const background = [3, 5, 9];
  const panel = [10, 15, 23];
  const white = atariPalRegisterToRgb(0x0e);
  const steel = atariPalRegisterToRgb(0x84);
  const yellow = atariPalRegisterToRgb(0x1e);
  fillRgb(rgb, background);
  drawRgbLabel(rgb, width,
    `SPREAD SHOT HULL RESTORE  EXECUTED ${artifact.toUpperCase()} BYTES`, 24, 14,
    frontend, white);
  drawRgbLabel(rgb, width,
    "THREE YELLOW PLAYER_FIGHTER SHOTS  ENGINES MIDSHIP PROW  A2 HEAD 21 WRAP", 24, 32,
    frontend, yellow);
  drawRgbLabel(rgb, width,
    "TWELVE CONSECUTIVE FRAMES PER SECTION  CURRENT BACKING  NO REDRAW MODEL", 24, 50,
    frontend, steel);
  panels.forEach(({ label, record, trace }, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = gap + column * (SOURCE_WIDTH + gap);
    const y = 72 + row * panelStepY;
    fillRgbRect(rgb, width, height, x - 2, y, SOURCE_WIDTH + 4, 214, panel);
    strokeRgbRect(rgb, width, height, x - 2, y, SOURCE_WIDTH + 4, 214, steel);
    drawRgbLabel(rgb, width, label, x + 4, y + 5, frontend, white);
    const frame = runtimeWeaponPickupFrameRgb(record, trace, registers, 1);
    copyRgbPanel(rgb, width, height, frame, SOURCE_WIDTH,
      (record.display ?? record.screen ?? record.during).length / SCREEN_COLUMNS * CHARACTER_HEIGHT,
      x, y + 20);
  });
  return encodePng(rgb, width, height);
}

export function readProjectileVisualLanguageRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const asset = graphics.capitalHulls;
  const metrics = projectileVisualMetrics(asset);
  const interceptor = graphics.releaseEnemy;
  const playerX = requireValue(graphics.initialState, "player_x");
  const playerY = requireValue(graphics.initialState, "player_y");
  const enemyX = requireValue(graphics.initialState, "enemy_x");
  const enemyY = 72;
  const projectileY = 124;
  const specs = [
    { label: "PLAYER_FIGHTER PLAYFIELD  BRIGHT YELLOW  1X2", playerShot: true },
    { label: "INTERCEPTOR PLAYFIELD  SATURATED RED  2X3", interceptorPulse: true },
    { label: "ALLIED CAPITAL  YELLOW GOLD  8X6", capitalOwner: "allied", phase: 0 },
    { label: "HOSTILE CAPITAL  CRIMSON  8X6", capitalOwner: "enemy", phase: 1 },
    { label: "ALL FOUR  SAME NATIVE SCALE", all: true },
    { label: "MONO FORM  FIGHTER SHORT  CAPITAL HEAVY", all: true, monochrome: true },
  ];
  const panelDefinitions = specs.map((spec) => {
    const screenState = createCanonicalScreenRuntimeState(graphics, {
      sectorPhase: asset.sector.previewSectorRow,
    });
    const hardwareState = new Map(graphics.hardwareState);
    if (spec.monochrome) {
      screenState.screen.fill(0);
      for (const register of ["COLPF0", "COLPF1", "COLPF2", "COLPF3"]) {
        hardwareState.set(register, 0x0e);
      }
    }
    const capitalVisuals = [];
    if (spec.capitalOwner || spec.all) {
      const owners = spec.all ? ["allied", "enemy"] : [spec.capitalOwner];
      owners.forEach((owner, index) => {
        const visual = heavyShellVisual({
          state: BROADSIDE_STATES.FLYING,
          missile: owner === "allied" ? 1 : 3,
          owner,
          x: spec.all ? 130 + index * 36 : 128,
          y: spec.all ? projectileY + index * 24 : projectileY,
        }, asset, spec.phase ?? index * 2);
        const overlay = applyCapitalShellVisualToScreen(screenState.screen, asset, visual);
        capitalVisuals.push({ ...visual, overlay });
      });
    }
    const pixels = drawGameplayMixedScreen(hardwareState, screenState.screen, graphics);
    if (!spec.monochrome) {
      overlayCanonicalPmg(pixels, graphics, { enemyX, enemyY, scannerPhase: 16 });
    }
    if (spec.playerShot || spec.all) {
      drawTopAnchoredMissileSpan(pixels, playerX + 8, playerY - 28,
        metrics.player.height, spec.monochrome ? 0x0e : metrics.player.color);
    }
    if (spec.interceptorPulse || spec.all) {
      drawTopAnchoredMissileSpan(pixels, enemyX + 7, projectileY,
        metrics.interceptor.height, spec.monochrome ? 0x0e : metrics.interceptor.color);
    }
    return { ...spec, pixels, screen: screenState.screen, capitalVisuals };
  });
  return {
    graphics,
    metrics,
    panelDefinitions,
    ...renderLabeledGameplayPanels(readFrontendGraphicsSource(source), panelDefinitions, 2),
  };
}

export function createProjectileVisualLanguagePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readProjectileVisualLanguageRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

export function readProjectileCollisionScoringRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const asset = graphics.capitalHulls;
  const interceptor = graphics.releaseEnemy;
  const enemyX = 124;
  const enemyY = 104;
  const playerY = requireValue(graphics.initialState, "player_y");
  const resolved = (sourceId) => {
    const enemy = createEnemyDamageState(interceptor);
    beginEnemyDamageFrame(enemy);
    queueEnemyDamage(enemy, interceptor.hitPoints, sourceId);
    return resolveEnemyDamage(enemy);
  };
  const firstTarget = sweptHorizontalProjectileTargets({
    previousX: 142,
    x: 120,
    y: 108,
    width: asset.broadside.projectileVisuals.capital.widthHpos,
    height: asset.broadside.projectileVisuals.capital.height,
    velocityX: -2,
  }, [
    { id: "INTERCEPTOR", active: true, x: enemyX, y: enemyY,
      width: interceptor.visibleWidth, height: interceptor.height, priority: 0 },
    { id: "PLAYER_FIGHTER", active: true, x: 104, y: enemyY,
      width: 8, height: 16, priority: 1 },
  ]);
  const specs = [
    { label: "M0 DESTROYS INTERCEPTOR  SCORE PLUS 10", source: ENEMY_DAMAGE_SOURCES.PLAYER_PROJECTILE,
      playerShot: true },
    { label: "PLAYER_FIGHTER CONTACT  DAMAGE AND SCORE PLUS 10", source: ENEMY_DAMAGE_SOURCES.PLAYER_CONTACT,
      contact: true },
    { label: "LETHAL CONTACT  PLAYER_FIGHTER ZERO  SCORE PLUS 10", source: ENEMY_DAMAGE_SOURCES.PLAYER_CONTACT,
      contact: true, lethalPlayer: true },
    { label: "ALLIED SHELL KILL  SCORE UNCHANGED", source: ENEMY_DAMAGE_SOURCES.CAPITAL_ALLIED,
      capitalOwner: "allied" },
    { label: "HOSTILE FRIENDLY FIRE  SCORE PLUS 10", source: ENEMY_DAMAGE_SOURCES.CAPITAL_HOSTILE,
      capitalOwner: "enemy" },
    { label: "HOSTILE SHELL STOPS AT FIRST INTERCEPTOR", source: ENEMY_DAMAGE_SOURCES.CAPITAL_HOSTILE,
      capitalOwner: "enemy", firstTarget: firstTarget?.id },
    { label: "CLEANUP AND DRAIN  SCORE UNCHANGED", source: ENEMY_DAMAGE_SOURCES.CLEANUP,
      cleanup: true },
    { label: "DESTROY RESOLVES ONCE  NO DOUBLE SCORE", source: ENEMY_DAMAGE_SOURCES.PLAYER_PROJECTILE,
      resolveTwice: true },
  ];
  const panelDefinitions = specs.map((spec) => {
    const screenState = createCanonicalScreenRuntimeState(graphics, {
      sectorPhase: asset.sector.previewSectorRow,
    });
    const result = resolved(spec.source);
    const secondResult = spec.resolveTwice
      ? resolveEnemyDamage({ ...createEnemyDamageState(interceptor), alive: false })
      : null;
    if (result.score > 0) {
      const zero = requireValue(graphics.constants, "CH_ZERO");
      screenState.screen.set([zero, zero, zero, zero + 1, zero], 6);
    }
    let capitalVisual = null;
    if (spec.capitalOwner) {
      capitalVisual = heavyShellVisual({ state: BROADSIDE_STATES.FLYING,
        missile: spec.capitalOwner === "allied" ? 1 : 3,
        owner: spec.capitalOwner, x: spec.capitalOwner === "allied" ? 116 : 144,
        y: enemyY + 4 }, asset, 2);
      applyCapitalShellVisualToScreen(screenState.screen, asset, capitalVisual);
    }
    const pixels = drawGameplayMixedScreen(graphics.hardwareState, screenState.screen, graphics);
    if (!spec.cleanup) overlayCanonicalPmg(pixels, graphics, {
      enemyX,
      enemyY,
      playerX: spec.contact ? enemyX + 4 : undefined,
      playerY: spec.contact ? enemyY : playerY,
      scannerPhase: 16,
      showPlayer: !spec.lethalPlayer,
    });
    if (spec.playerShot) drawTopAnchoredMissileSpan(pixels, enemyX + 8, enemyY + 8,
      asset.broadside.projectileVisuals.player.height,
      asset.broadside.projectileVisuals.player.coreValue);
    return { ...spec, result, secondResult, capitalVisual, pixels, screen: screenState.screen };
  });
  return {
    graphics,
    firstTarget,
    panelDefinitions,
    ...renderLabeledGameplayPanels(readFrontendGraphicsSource(source), panelDefinitions, 2),
  };
}

export function createProjectileCollisionScoringPreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readProjectileCollisionScoringRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

export function readHeavyShellDetailSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const base = readGameplayRuntimeState(source, capitalHullsDefinition);
  const { graphics } = base;
  const asset = graphics.capitalHulls;
  const allied = visibleSectorCannon(asset, "allied", asset.sector.previewSectorRow);
  const enemy = visibleSectorCannon(asset, "enemy", asset.sector.previewSectorRow);
  const alliedMuzzle = muzzlePosition(allied.turret, allied.screenRow);
  const enemyMuzzle = muzzlePosition(enemy.turret, enemy.screenRow);
  const flashCode = (side) => asset.glyphs.find(({ name }) =>
    name === `${side}_launch_flash`).screenCode;
  const shellSpan = (missile, owner, x, y, frame) => {
    const visual = heavyShellVisual({
      state: BROADSIDE_STATES.FLYING,
      missile,
      owner,
      x,
      y,
    }, asset, frame);
    return { missile, ...visual };
  };
  const panels = [
    {
      label: "ALLIED HOT WARNING  FRAME 24",
      spans: [{ missile: 2, ...warningVisual({
        state: BROADSIDE_STATES.WARNING,
        owner: "allied",
        x: alliedMuzzle.x,
        y: alliedMuzzle.y,
        timer: 1,
      }, asset) }],
    },
    {
      label: "ALLIED LAUNCH FLASH  FRAME 25",
      flash: { ...allied, code: flashCode("allied") },
      spans: [shellSpan(2, "allied", alliedMuzzle.x, alliedMuzzle.y, 0)],
    },
    {
      label: "ALLIED SLUG COMPACT  FRAME 27",
      flash: { ...allied, code: flashCode("allied") },
      spans: [shellSpan(2, "allied", alliedMuzzle.x + 4, alliedMuzzle.y, 1)],
    },
    {
      label: "ALLIED SLUG FULL  FRAME 29",
      spans: [shellSpan(2, "allied", alliedMuzzle.x + 8, alliedMuzzle.y, 3)],
    },
    {
      label: "ENEMY LAUNCH FLASH  FRAME 25",
      flash: { ...enemy, code: flashCode("enemy") },
      spans: [shellSpan(1, "enemy", enemyMuzzle.x, enemyMuzzle.y, 0)],
    },
    {
      label: "HEAVY IMPACT  FIVE FRAME STATE",
      spans: [{ missile: 3, x: 168, y: alliedMuzzle.y, height: asset.broadside.impactHeight,
        size: 1 }],
    },
  ];
  const columns = 3;
  const rows = 2;
  const labelHeight = 20;
  const cellHeight = SOURCE_HEIGHT + labelHeight;
  const width = SOURCE_WIDTH * columns;
  const height = cellHeight * rows;
  const registerPixels = new Uint8Array(width * height);
  const frontend = readFrontendGraphicsSource(source);

  panels.forEach((panel, index) => {
    const screen = Uint8Array.from(base.screen);
    if (panel.flash) {
      screen[panel.flash.screenRow * SCREEN_COLUMNS + panel.flash.turret.muzzleColumn] =
        panel.flash.code;
    }
    for (const span of panel.spans) applyCapitalShellVisualToScreen(screen, asset, span);
    const panelPixels = drawGameplayMixedScreen(graphics.hardwareState, screen, graphics);
    overlayCanonicalPmg(panelPixels, graphics);
    for (const span of panel.spans) {
      if (span.renderer === "ANTIC4_PLAYFIELD_OVERLAY") continue;
      drawMissileSpan(
        panelPixels,
        span.x,
        span.y,
        span.height,
        requireValue(graphics.hardwareState, `COLPM${span.missile}`),
        span.size ?? 1,
      );
    }
    const column = index % columns;
    const row = Math.floor(index / columns);
    const originX = column * SOURCE_WIDTH;
    const originY = row * cellHeight;
    for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
      registerPixels.set(
        panelPixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
        (originY + labelHeight + y) * width + originX,
      );
    }
    drawComparisonLabel(registerPixels, width, panel.label, originX + 44, originY + 5, frontend);
  });
  return { graphics, panelDefinitions: panels, registerPixels, width, height };
}

export function createHeavyShellDetailSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readHeavyShellDetailSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

function applyCapitalExplosionToScreen(screen, asset, {
  side = "enemy",
  screenRow = 10,
  timer,
} = {}) {
  const visual = capitalExplosionVisual(asset, timer);
  const targetRow = screen.slice(screenRow * SCREEN_COLUMNS,
    (screenRow + 1) * SCREEN_COLUMNS);
  let firstColumn;
  if (side === "allied") {
    let lastHullColumn = 7;
    while (lastHullColumn > 0 && targetRow[lastHullColumn] === 0) lastHullColumn -= 1;
    firstColumn = Math.max(0, lastHullColumn - visual.width + 1);
  } else {
    firstColumn = 32;
    while (firstColumn < 39 && targetRow[firstColumn] === 0) firstColumn += 1;
    firstColumn = Math.min(40 - visual.width, firstColumn);
  }
  const topRow = screenRow - 1;
  const glyphEnd = asset.definition.charsetBaseIndex + asset.glyphs.length;
  for (let row = 0; row < visual.height; row += 1) {
    for (let column = 0; column < visual.width; column += 1) {
      const screenIndex = (topRow + row) * SCREEN_COLUMNS + firstColumn + column;
      const underlying = screen[screenIndex] & 0x7f;
      const effectCode = visual.cells[row * visual.width + column];
      if (effectCode !== 0 && underlying >= asset.definition.charsetBaseIndex &&
          underlying < glyphEnd) {
        screen[screenIndex] = effectCode;
      }
    }
  }
  return { ...visual, side, screenRow, topRow, firstColumn };
}

export function readCapitalHullExplosionSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const asset = graphics.capitalHulls;
  const base = createCanonicalScreenRuntimeState(graphics, {
    sectorPhase: asset.sector.previewSectorRow,
  });
  const labels = [
    "FRAME 00  WHITE AMBER CORE",
    "FRAME 04  RED EXPANSION",
    "FRAME 08  LARGE RED FIREBALL",
    "FRAME 12  RED BREAKUP",
    "FRAME 16  FADING EMBERS",
    "FRAME 20  FINAL EMBERS",
  ];
  const columns = 3;
  const rows = 2;
  const labelHeight = 20;
  const cellHeight = SOURCE_HEIGHT + labelHeight;
  const width = SOURCE_WIDTH * columns;
  const height = cellHeight * rows;
  const registerPixels = new Uint8Array(width * height);
  const frontend = readFrontendGraphicsSource(source);
  const panelDefinitions = [];

  labels.forEach((label, index) => {
    const screen = Uint8Array.from(base.screen);
    const timer = asset.broadside.capitalExplosion.durationFrames -
      index * asset.broadside.capitalExplosion.phaseFrames;
    const explosion = applyCapitalExplosionToScreen(screen, asset, {
      side: "enemy",
      screenRow: 10,
      timer,
    });
    const pixels = drawGameplayMixedScreen(graphics.hardwareState, screen, graphics);
    overlayCanonicalPmg(pixels, graphics);
    const column = index % columns;
    const row = Math.floor(index / columns);
    const originX = column * SOURCE_WIDTH;
    const originY = row * cellHeight;
    for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
      registerPixels.set(
        pixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
        (originY + labelHeight + y) * width + originX,
      );
    }
    drawComparisonLabel(registerPixels, width, label, originX + 44, originY + 5, frontend);
    panelDefinitions.push({ label, timer, explosion, screen });
  });
  return { graphics, panelDefinitions, registerPixels, width, height };
}

export function createCapitalHullExplosionSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readCapitalHullExplosionSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

export function createCapitalExplosionPokeyTrace(
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const effect = compileCapitalHulls(capitalHullsDefinition).broadside.capitalExplosion;
  const lines = ["pal_frame,AUDF4,AUDC4,AUDCTL,volume"];
  for (let frame = 0; frame < effect.durationFrames; frame += 1) {
    const frequency = effect.soundFrequencyBytes[frame];
    const control = effect.soundControlBytes[frame];
    lines.push(`${frame},${frequency},${control},${effect.soundAudctl},${control & 0x0f}`);
  }
  lines.push(`${effect.durationFrames},0,0,0,0`);
  return `${lines.join("\n")}\n`;
}

export function readBroadsideAcceptanceSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const base = readGameplayPlayfieldRuntimeState(source, capitalHullsDefinition);
  const { graphics } = base;
  const asset = graphics.capitalHulls;
  const turretById = new Map(asset.turrets.map((turret) => [turret.id, turret]));
  const allied = turretById.get("allied_turret_a");
  const enemy = turretById.get("enemy_turret_a");
  const visibleRows = Array.from({ length: asset.sector.visibleRows }, (_, offset) =>
    asset.sector.previewSectorRow - 1 - offset);
  const cannonScreenRow = (turret) => {
    const offset = visibleRows.findIndex((leftRow) => {
      const sideRow = sectorRowForSide(asset, turret.side, leftRow);
      return asset.sector.cannonRowsBySide.get(turret.side).includes(sideRow);
    });
    if (offset < 0) throw new Error(`${turret.id} is missing from the preview sector phase`);
    return 1 + offset;
  };
  const alliedMuzzle = muzzlePosition(allied, cannonScreenRow(allied));
  const enemyMuzzle = muzzlePosition(enemy, cannonScreenRow(enemy));
  const color = (missile) => requireValue(graphics.hardwareState, `COLPM${missile}`);
  const warningSpan = (turret, muzzle, missile, timer) => {
    const visual = warningVisual({
      state: BROADSIDE_STATES.WARNING,
      owner: turret.side,
      x: muzzle.x,
      y: muzzle.y,
      timer,
    }, asset);
    return { missile, x: visual.x, y: visual.y, height: visual.height, size: visual.size };
  };
  const shellSpan = (missile, owner, x, y, frame = 0) => ({
    missile,
    ...heavyShellVisual({ state: BROADSIDE_STATES.FLYING, missile, owner, x, y }, asset, frame),
  });
  const envelope = combinedPlayerEnvelope(graphics.playerShape, graphics.playerEngineShape);
  const contactState = { visibleRows, envelope };
  const alliedContact = playerHullContact(asset, {
    ...contactState,
    playerX: 48,
    playerY: 112,
  });
  const enemyContact = playerHullContact(asset, {
    ...contactState,
    playerX: 200,
    playerY: 144,
  });
  const panelDefinitions = [
    { label: "ALLIED EARLY WARNING", spans: [warningSpan(allied, alliedMuzzle, 2, 25)] },
    { label: "ALLIED MEDIUM WARNING", spans: [warningSpan(allied, alliedMuzzle, 2, 17)] },
    { label: "ALLIED HOT WARNING", spans: [warningSpan(allied, alliedMuzzle, 2, 8)] },
    {
      label: "ALLIED LAUNCH SAME PATH",
      spans: [shellSpan(2, "allied", alliedMuzzle.x, alliedMuzzle.y, 0)],
    },
    { label: "ENEMY EARLY WARNING", spans: [warningSpan(enemy, enemyMuzzle, 1, 25)] },
    { label: "ENEMY HOT WARNING", spans: [warningSpan(enemy, enemyMuzzle, 1, 8)] },
    {
      label: "ALLIED HULL CONTACT",
      player: { x: alliedContact.clampedX, y: 112 },
      contact: alliedContact,
    },
    {
      label: "ENEMY HULL CONTACT",
      player: { x: enemyContact.clampedX, y: 144 },
      contact: enemyContact,
    },
    {
      label: "PLAYER DAMAGE FEEDBACK",
      player: { x: alliedContact.clampedX, y: 112 },
      contact: alliedContact,
      backgroundColor: 0x42,
    },
    {
      label: "ZERO HEALTH TRANSITION",
      player: { x: alliedContact.clampedX, y: 112, visible: false },
      contact: alliedContact,
    },
  ];

  const columns = 2;
  const rows = 5;
  const labelHeight = 16;
  const cellHeight = SOURCE_HEIGHT + labelHeight;
  const width = SOURCE_WIDTH * columns;
  const height = cellHeight * rows;
  const registerPixels = new Uint8Array(width * height);
  const frontend = readFrontendGraphicsSource(source);

  panelDefinitions.forEach((panel, index) => {
    const playfield = panel.backgroundColor === undefined
      ? base
      : readGameplayPlayfieldRuntimeState(source, capitalHullsDefinition, panel.backgroundColor);
    const screen = Uint8Array.from(playfield.screen);
    for (const span of panel.spans ?? []) applyCapitalShellVisualToScreen(screen, asset, span);
    const panelHardwareState = new Map(graphics.hardwareState);
    if (panel.backgroundColor !== undefined) panelHardwareState.set("COLBK", panel.backgroundColor);
    const panelPixels = drawGameplayMixedScreen(panelHardwareState, screen, graphics);
    overlayCanonicalPmg(panelPixels, graphics, {
      playerX: panel.player?.x,
      playerY: panel.player?.y,
      showPlayer: panel.player?.visible !== false,
    });
    for (const span of panel.spans ?? []) {
      if (span.renderer === "ANTIC4_PLAYFIELD_OVERLAY") continue;
      drawMissileSpan(panelPixels, span.x, span.y, span.height, color(span.missile), span.size ?? 1);
    }
    const column = index % columns;
    const row = Math.floor(index / columns);
    const originX = column * SOURCE_WIDTH;
    const originY = row * cellHeight;
    for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
      registerPixels.set(
        panelPixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
        (originY + labelHeight + y) * width + originX,
      );
    }
    drawComparisonLabel(registerPixels, width, panel.label, originX + 60, originY + 4, frontend);
  });
  return { graphics, panelDefinitions, registerPixels, width, height };
}

export function createBroadsideAcceptanceSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readBroadsideAcceptanceSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

export function readPlayerRespawnSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const base = readGameplayPlayfieldRuntimeState(source, capitalHullsDefinition);
  const { graphics } = base;
  const asset = graphics.capitalHulls;
  const frontend = readFrontendGraphicsSource(source);
  const visibleRows = Array.from({ length: asset.sector.visibleRows }, (_, offset) =>
    asset.sector.previewSectorRow - 1 - offset);
  const envelope = combinedPlayerEnvelope(graphics.playerShape, graphics.playerEngineShape);
  const playerX = requireValue(graphics.constants, "PLAYER_RESPAWN_X");
  const playerY = requireValue(graphics.constants, "PLAYER_RESPAWN_Y");
  const contactState = { visibleRows, envelope, playerY };
  const centeredContact = playerHullContact(asset, { ...contactState, playerX });
  const alliedContact = playerHullContact(asset, { ...contactState, playerX: PMG_LEFT_EDGE });
  const enemyContact = playerHullContact(asset, { ...contactState, playerX: 200 });
  const bullet = {
    x: playerX + 8,
    y: playerY - 4,
    height: 1,
    size: 0,
  };
  const panels = [
    { label: "CENTER LEFT ROW PASS  NO HIT", player: { x: playerX, y: playerY },
      contact: centeredContact },
    { label: "CENTER RIGHT ROW PASS  NO HIT", player: { x: playerX, y: playerY },
      contact: centeredContact },
    { label: "REAL LEFT CONTACT  ONE LIFE EVENT",
      player: { x: alliedContact.clampedX, y: playerY }, contact: alliedContact },
    { label: "REAL RIGHT CONTACT  ONE LIFE EVENT",
      player: { x: enemyContact.clampedX, y: playerY }, contact: enemyContact },
    { label: "DEATH FRAME 006  PLAYER HIDDEN", player: { x: playerX, y: playerY, visible: false } },
    { label: `RESPAWN FRAME 000  X${playerX} Y${playerY}`,
      player: { x: playerX, y: playerY } },
    { label: "INVULN FRAME 007  VISIBLE M0 ACTIVE", player: { x: playerX, y: playerY }, bullet },
    { label: "INVULN FRAME 008  HIDDEN M0 ACTIVE",
      player: { x: playerX, y: playerY, visible: false }, bullet },
    { label: "INVULN FRAME 249  LAST PROTECTED",
      player: { x: playerX, y: playerY, visible: false } },
    { label: "FRAME 250  VISIBLE ALIVE NEXT HIT", player: { x: playerX, y: playerY } },
  ];
  const columns = 2;
  const rows = 5;
  const labelHeight = 20;
  const cellHeight = SOURCE_HEIGHT + labelHeight;
  const width = SOURCE_WIDTH * columns;
  const height = cellHeight * rows;
  const registerPixels = new Uint8Array(width * height);

  panels.forEach((panel, index) => {
    const panelPixels = Uint8Array.from(base.registerPixels);
    overlayCanonicalPmg(panelPixels, graphics, {
      playerX: panel.player.x,
      playerY: panel.player.y,
      showPlayer: panel.player.visible !== false,
    });
    if (panel.bullet) {
      drawMissileSpan(
        panelPixels,
        panel.bullet.x,
        panel.bullet.y,
        panel.bullet.height,
        requireValue(graphics.hardwareState, "COLPM0"),
        panel.bullet.size,
      );
    }
    const column = index % columns;
    const row = Math.floor(index / columns);
    const originX = column * SOURCE_WIDTH;
    const originY = row * cellHeight;
    for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
      registerPixels.set(
        panelPixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
        (originY + labelHeight + y) * width + originX,
      );
    }
    drawComparisonLabel(registerPixels, width, panel.label, originX + 36, originY + 5, frontend);
  });
  return { graphics, panelDefinitions: panels, registerPixels, width, height };
}

export function createPlayerRespawnSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readPlayerRespawnSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

export function readBroadsideSpeedSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const snapshots = simulateBroadsideSpeedSequence(graphics.capitalHulls);
  const screenState = createCanonicalScreenRuntimeState(graphics);
  const columns = 3;
  const rows = 2;
  const labelHeight = 24;
  const cellHeight = SOURCE_HEIGHT + labelHeight;
  const width = SOURCE_WIDTH * columns;
  const height = cellHeight * rows;
  const registerPixels = new Uint8Array(width * height);
  const frontend = readFrontendGraphicsSource(source);
  const panelDefinitions = [];

  snapshots.forEach((snapshot, index) => {
    while (screenState.advances < snapshot.world.advances) {
      advanceCanonicalScreenRuntimeState(screenState, graphics);
    }
    while (screenState.hullAdvances < snapshot.world.hullAdvances) {
      advanceCanonicalHullRuntimeState(screenState, graphics);
    }
    if (screenState.corridorPhase !== snapshot.world.corridorPhase) {
      throw new Error("Speed preview screen and world simulation lost their corridor phase");
    }
    const screen = Uint8Array.from(screenState.screen);
    const projectileVisual = heavyShellVisual({
      state: BROADSIDE_STATES.FLYING,
      missile: 1,
      ...snapshot.projectile,
    }, graphics.capitalHulls, snapshot.frame);
    applyCapitalShellVisualToScreen(screen, graphics.capitalHulls, projectileVisual);
    const panelPixels = drawGameplayMixedScreen(graphics.hardwareState, screen, graphics);
    overlayCanonicalPmg(panelPixels, graphics);
    const warning = snapshot.warning.visual;
    drawMissileSpan(
      panelPixels,
      warning.x,
      warning.y,
      warning.height,
      requireValue(graphics.hardwareState, `COLPM${snapshot.warning.missile}`),
      warning.size,
    );

    const column = index % columns;
    const row = Math.floor(index / columns);
    const originX = column * SOURCE_WIDTH;
    const originY = row * cellHeight;
    for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
      registerPixels.set(
        panelPixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
        (originY + labelHeight + y) * width + originX,
      );
    }
    const frame = String(snapshot.frame).padStart(2, "0");
    const worldRow = String(snapshot.world.advances).padStart(2, "0");
    const phase = String(snapshot.world.corridorPhase).padStart(2, "0");
    drawComparisonLabel(
      registerPixels,
      width,
      `PAL ${frame}  WORLD ROW ${worldRow}  PHASE ${phase}`,
      originX + 32,
      originY + 2,
      frontend,
    );
    drawComparisonLabel(
      registerPixels,
      width,
      `WORLD ${snapshot.worldScrolled ? "STEP" : "HOLD"}  HULL ${snapshot.hullScrolled ? "STEP" : "HOLD"}`,
      originX + 80,
      originY + 13,
      frontend,
    );
    panelDefinitions.push({ ...snapshot, screen });
  });

  return { graphics, panelDefinitions, registerPixels, width, height };
}

export function createBroadsideSpeedSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readBroadsideSpeedSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

export function readDifficultySpeedComparisonRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const frontend = readFrontendGraphicsSource(source);
  const difficulties = ["easy", "medium", "hard"];
  const frames = 20;
  const labelHeight = 40;
  const width = SOURCE_WIDTH * difficulties.length;
  const height = SOURCE_HEIGHT + labelHeight;
  const registerPixels = new Uint8Array(width * height);
  const panelDefinitions = [];

  difficulties.forEach((difficulty, index) => {
    const snapshots = simulateBroadsideSpeedSequence(
      graphics.capitalHulls,
      { frames, difficulty },
    );
    const initial = snapshots[0];
    const final = snapshots.at(-1);
    const eventFrames = snapshots.filter(({ scrolled }) => scrolled).map(({ frame }) => frame);
    const screenState = createCanonicalScreenRuntimeState(graphics);
    while (screenState.advances < final.world.advances) {
      advanceCanonicalScreenRuntimeState(screenState, graphics);
    }
    while (screenState.hullAdvances < final.world.hullAdvances) {
      advanceCanonicalHullRuntimeState(screenState, graphics);
    }
    if (screenState.corridorPhase !== final.world.corridorPhase) {
      throw new Error(`${difficulty} preview lost its source-derived corridor phase`);
    }
    const screen = Uint8Array.from(screenState.screen);
    const projectileVisual = heavyShellVisual({
      state: BROADSIDE_STATES.FLYING,
      missile: 1,
      ...final.projectile,
    }, graphics.capitalHulls, final.frame);
    applyCapitalShellVisualToScreen(screen, graphics.capitalHulls, projectileVisual);
    const panelPixels = drawGameplayMixedScreen(graphics.hardwareState, screen, graphics);
    overlayCanonicalPmg(panelPixels, graphics);
    const warning = final.warning.visual;
    drawMissileSpan(
      panelPixels,
      warning.x,
      warning.y,
      warning.height,
      requireValue(graphics.hardwareState, `COLPM${final.warning.missile}`),
      warning.size,
    );

    const originX = index * SOURCE_WIDTH;
    for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
      registerPixels.set(
        panelPixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
        (labelHeight + y) * width + originX,
      );
    }
    const eventChunks = [eventFrames.slice(0, 5), eventFrames.slice(5)];
    const rate = graphics.capitalHulls.broadside.worldScrollRates[difficulty];
    const displacement = final.world.advances * CHARACTER_HEIGHT;
    const projectileDisplacement = Math.abs(final.projectile.x - initial.projectile.x);
    drawComparisonLabel(registerPixels, width,
      `${difficulty.toUpperCase()} ${rate}/20 WORLD ${String(final.world.advances).padStart(2, "0")} HULL ${String(final.world.hullAdvances).padStart(2, "0")}`,
      originX + 8, 1, frontend);
    eventChunks.forEach((events, chunkIndex) => {
      const prefix = chunkIndex === 0 ? "EVENT " : "      ";
      drawComparisonLabel(registerPixels, width,
        `${prefix}${events.map((frame) => String(frame).padStart(2, "0")).join(" ")}`,
        originX + 8, 11 + chunkIndex * 10, frontend);
    });
    drawComparisonLabel(registerPixels, width,
      `WARN ${String(final.warning.timer).padStart(2, "0")} SHOT ${String(projectileDisplacement).padStart(3, "0")} PAL FRAMES`,
      originX + 8, 31, frontend);
    panelDefinitions.push({
      difficulty,
      rate,
      frames,
      eventFrames,
      initial,
      final,
      displacement,
      projectileDisplacement,
      screen,
    });
  });

  return { graphics, panelDefinitions, registerPixels, width, height };
}

export function createDifficultySpeedComparisonPreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readDifficultySpeedComparisonRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

function drawCadenceEvents(registerPixels, width, simulation, y, timelineX, timelineWidth,
  hardwareState) {
  const eventX = (frame) => timelineX + Math.floor(
    (frame - 1) * (timelineWidth - 1) / (simulation.frames - 1),
  );
  for (const warning of simulation.warningStarts) {
    const launch = simulation.launches.find((candidate) =>
      candidate.frame >= warning.frame && candidate.missile === warning.missile &&
      candidate.turretId === warning.turretId);
    const colour = requireValue(hardwareState, `COLPM${warning.missile}`);
    const startX = eventX(warning.frame);
    for (let xOffset = 0; xOffset < 2; xOffset += 1) {
      for (let yOffset = -2; yOffset < 5; yOffset += 1) {
        registerPixels[(y + yOffset) * width + startX + xOffset] = colour;
      }
    }
    if (!launch) continue;
    const endX = eventX(launch.frame);
    for (let x = startX; x <= endX; x += 1) {
      for (let offset = 0; offset < 3; offset += 1) {
        registerPixels[(y + offset) * width + x] = colour;
      }
    }
    for (let offset = -2; offset < 6; offset += 1) {
      registerPixels[(y + offset) * width + endX] = colour;
    }
  }
}

function drawCadenceScrollTicks(registerPixels, width, frames, scrollEvents, y, timelineX,
  timelineWidth, colour) {
  for (const frame of scrollEvents) {
    const x = timelineX + Math.floor((frame - 1) * (timelineWidth - 1) / (frames - 1));
    registerPixels[y * width + x] = colour;
  }
}

function cadenceSummaryLabel(prefix, asset, simulation) {
  const twoDigits = (value) => String(value).padStart(2, "0");
  const threeDigits = (value) => String(Math.round(value)).padStart(3, "0");
  return `${prefix} ${asset.broadside.hullScrollRates.hard}/` +
    `${asset.broadside.hullScrollRateDenominator}  ` +
    `${twoDigits(simulation.warningStats.count)} WARN ` +
    `${twoDigits(simulation.launchStats.count)} LAUNCH  GAP ` +
    `${threeDigits(simulation.warningStats.minimumGap)} ` +
    `${threeDigits(simulation.warningStats.averageGap)}`;
}

export function readBroadsideCadenceSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const baselineDefinition = JSON.parse(JSON.stringify(capitalHullsDefinition));
  baselineDefinition.broadside.hullScrollRateDenominator = 80;
  baselineDefinition.broadside.scheduleDelayScale = 1;
  baselineDefinition.broadside.scheduleCalmFrames = 0;
  const baselineAsset = compileCapitalHulls(baselineDefinition);
  const finalAsset = graphics.capitalHulls;
  const baseline = simulateBroadsideCadence(baselineAsset, { frames: 1000 });
  const final = simulateBroadsideCadence(finalAsset, { frames: 1000 });
  const width = SOURCE_WIDTH * 2;
  const height = 128;
  const registerPixels = new Uint8Array(width * height);
  const frontend = readFrontendGraphicsSource(source);
  const timelineX = 16;
  const timelineWidth = width - timelineX * 2;
  const steel = requireValue(graphics.hardwareState, "COLPF1");

  drawComparisonLabel(registerPixels, width, `${baseline.frames} PAL FRAME CADENCE`,
    232, 4, frontend);
  drawComparisonLabel(registerPixels, width,
    cadenceSummaryLabel("BEFORE", baselineAsset, baseline), 16, 20, frontend);
  drawCadenceEvents(registerPixels, width, baseline, 42, timelineX, timelineWidth,
    graphics.hardwareState);
  drawCadenceScrollTicks(registerPixels, width, baseline.frames,
    baseline.scrollEvents, 50, timelineX, timelineWidth, steel);

  drawComparisonLabel(registerPixels, width,
    cadenceSummaryLabel("FINAL", finalAsset, final), 16, 64, frontend);
  drawCadenceEvents(registerPixels, width, final, 86, timelineX, timelineWidth,
    graphics.hardwareState);
  drawCadenceScrollTicks(registerPixels, width, final.frames,
    final.scrollEvents, 94, timelineX, timelineWidth, steel);
  drawComparisonLabel(registerPixels, width, "BARS WARNING TO LAUNCH   LOWER TICKS HULL SCROLL",
    112, 108, frontend);

  return { baseline, final, registerPixels, width, height };
}

export function createBroadsideCadenceSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readBroadsideCadenceSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

export function readStartMenuRuntimeState(source, selection) {
  const graphics = readFrontendGraphicsSource(source);
  const effectiveSelection = selection ?? graphics.defaultSelection;
  const screen = createStartMenuScreen(graphics, effectiveSelection);
  const registerPixels = drawMixedMainMenuScreen(screen, graphics);
  return { graphics, screen, registerPixels, selection: effectiveSelection };
}

export function createStartMenuPreview(source) {
  const { registerPixels } = readStartMenuRuntimeState(source);
  return encodePng(scaleAndConvertToRgb(registerPixels));
}

export function readLoaderRuntimeState(loaderDefinition) {
  const loaderAsset = compileLoaderBitmap(loaderDefinition);
  const memory = new Uint8Array(0x10000);
  const firstPartBytes =
    loaderAsset.secondLmsLine * loaderAsset.bytesPerRow;
  memory.set(
    loaderAsset.bitmapBytes.subarray(0, firstPartBytes),
    loaderAsset.bitmapAddress,
  );
  memory.set(
    loaderAsset.bitmapBytes.subarray(firstPartBytes),
    loaderAsset.secondLmsAddress,
  );

  const registerPixels = new Uint8Array(SOURCE_WIDTH * SOURCE_HEIGHT);
  for (let y = 0; y < loaderAsset.height; y += 1) {
    const zone = loaderAsset.paletteZones.find(
      ({ startLine, endLine }) => y >= startLine && y <= endLine,
    );
    if (!zone) {
      throw new Error(`Loader preview line ${y} has no palette zone`);
    }
    const sourceAddress =
      y < loaderAsset.secondLmsLine
        ? loaderAsset.bitmapAddress + y * loaderAsset.bytesPerRow
        : loaderAsset.secondLmsAddress +
          (y - loaderAsset.secondLmsLine) * loaderAsset.bytesPerRow;
    for (
      let byteColumn = 0;
      byteColumn < loaderAsset.bytesPerRow;
      byteColumn += 1
    ) {
      const value = memory[sourceAddress + byteColumn];
      if (zone.displayMode === "ANTIC F") {
        for (let bit = 0; bit < 8; bit += 1) {
          registerPixels[y * SOURCE_WIDTH + byteColumn * 8 + bit] =
            anticFRegisterForBitmapBit(
              zone.values,
              value & (0x80 >>> bit),
            );
        }
      } else {
        for (let pixel = 0; pixel < 4; pixel += 1) {
          const bitmapPixel = (value >> (6 - pixel * 2)) & 3;
          const registerValue = anticERegisterForBitmapPixel(
            zone.values,
            bitmapPixel,
          );
          const x = byteColumn * 8 + pixel * 2;
          registerPixels[y * SOURCE_WIDTH + x] = registerValue;
          registerPixels[y * SOURCE_WIDTH + x + 1] = registerValue;
        }
      }
    }
  }
  return { loaderAsset, registerPixels };
}

export function createLoaderPreview(loaderDefinition) {
  const { registerPixels } = readLoaderRuntimeState(loaderDefinition);
  return encodePng(scaleAndConvertToRgb(registerPixels));
}

export function inspectPng(png) {
  if (!png.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error("Invalid PNG signature");
  }

  const chunks = [];
  let offset = PNG_SIGNATURE.length;
  while (offset < png.length) {
    if (offset + 12 > png.length) {
      throw new Error("Truncated PNG chunk");
    }
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const crcOffset = dataEnd;
    if (crcOffset + 4 > png.length) {
      throw new Error("Truncated PNG chunk data");
    }
    const data = png.subarray(dataStart, dataEnd);
    const expectedCrc = crc32(Buffer.concat([Buffer.from(type, "ascii"), data]));
    if (png.readUInt32BE(crcOffset) !== expectedCrc) {
      throw new Error(`Invalid PNG CRC for ${type}`);
    }
    chunks.push({ type, data });
    offset = crcOffset + 4;
    if (type === "IEND") {
      break;
    }
  }

  if (offset !== png.length) {
    throw new Error("Unexpected bytes after PNG IEND");
  }
  const header = chunks.find((chunk) => chunk.type === "IHDR");
  const dataChunks = chunks.filter((chunk) => chunk.type === "IDAT");
  const endChunks = chunks.filter((chunk) => chunk.type === "IEND");
  if (!header || dataChunks.length === 0 || endChunks.length !== 1) {
    throw new Error("PNG is missing required chunks");
  }

  const raw = zlib.inflateSync(Buffer.concat(dataChunks.map((chunk) => chunk.data)));
  const width = header.data.readUInt32BE(0);
  const height = header.data.readUInt32BE(4);
  if (
    header.data.length !== 13 ||
    header.data[8] !== 8 ||
    header.data[9] !== 2 ||
    raw.length !== (width * 3 + 1) * height
  ) {
    throw new Error("PNG has an unexpected RGB layout");
  }
  for (let y = 0; y < height; y += 1) {
    if (raw[y * (width * 3 + 1)] !== 0) {
      throw new Error("PNG uses an unexpected scanline filter");
    }
  }

  return {
    width,
    height,
    bitDepth: header.data[8],
    colorType: header.data[9],
    chunkTypes: chunks.map((chunk) => chunk.type),
  };
}

export function generateGameplayPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  outputPath = DEFAULT_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const png = createGameplayPreview(source);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateLoaderPreview({
  definitionPath = path.join(
    rootDirectory,
    "assets",
    "graphics",
    "loader-bitmap.json",
  ),
  outputPath = DEFAULT_LOADER_PREVIEW_PATH,
} = {}) {
  const definition = loadLoaderBitmapDefinition(definitionPath);
  const png = createLoaderPreview(definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateStartMenuPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  outputPath = DEFAULT_START_MENU_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const png = createStartMenuPreview(source);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateCapitalHullsStripPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_CAPITAL_HULLS_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createCapitalHullsStripPreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateEnemyHullColourOptionsPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_ENEMY_HULL_COLOUR_OPTIONS_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createEnemyHullColourOptionsPreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateBroadsideAntic2PrototypePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  capitalHullsDefinitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  prototypeDefinitionPath = DEFAULT_CAPITAL_HULLS_ANTIC2_DEFINITION_PATH,
  outputPath = DEFAULT_BROADSIDE_ANTIC2_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const capitalHullsDefinition = loadCapitalHullsDefinition(capitalHullsDefinitionPath);
  const prototypeDefinition = loadCapitalHullsAntic2Prototype(prototypeDefinitionPath);
  const png = createBroadsideAntic2PrototypePreview(
    source,
    capitalHullsDefinition,
    prototypeDefinition,
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateCapitalHullsAntic2StripPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  capitalHullsDefinitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  prototypeDefinitionPath = DEFAULT_CAPITAL_HULLS_ANTIC2_DEFINITION_PATH,
  outputPath = DEFAULT_CAPITAL_HULLS_ANTIC2_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const capitalHullsDefinition = loadCapitalHullsDefinition(capitalHullsDefinitionPath);
  const prototypeDefinition = loadCapitalHullsAntic2Prototype(prototypeDefinitionPath);
  const png = createCapitalHullsAntic2StripPreview(
    source,
    capitalHullsDefinition,
    prototypeDefinition,
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateBroadsideModeComparisonPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  capitalHullsDefinitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  prototypeDefinitionPath = DEFAULT_CAPITAL_HULLS_ANTIC2_DEFINITION_PATH,
  outputPath = DEFAULT_BROADSIDE_COMPARISON_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const capitalHullsDefinition = loadCapitalHullsDefinition(capitalHullsDefinitionPath);
  const prototypeDefinition = loadCapitalHullsAntic2Prototype(prototypeDefinitionPath);
  const png = createBroadsideModeComparisonPreview(
    source,
    capitalHullsDefinition,
    prototypeDefinition,
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateBroadsideFireSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_BROADSIDE_FIRE_SEQUENCE_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createBroadsideFireSequencePreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateBroadsideAcceptanceSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_BROADSIDE_ACCEPTANCE_SEQUENCE_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createBroadsideAcceptanceSequencePreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generatePlayerRespawnSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_PLAYER_RESPAWN_SEQUENCE_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createPlayerRespawnSequencePreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateBroadsideCadenceSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_BROADSIDE_CADENCE_SEQUENCE_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createBroadsideCadenceSequencePreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateBroadsideSpeedSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_BROADSIDE_SPEED_SEQUENCE_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createBroadsideSpeedSequencePreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateDifficultySpeedComparisonPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_DIFFICULTY_SPEED_COMPARISON_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createDifficultySpeedComparisonPreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateFlagshipSectorSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_FLAGSHIP_SECTOR_SEQUENCE_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createFlagshipSectorSequencePreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateHeavyShellDetailSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_HEAVY_SHELL_DETAIL_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createHeavyShellDetailSequencePreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateCapitalHullExplosionSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_CAPITAL_EXPLOSION_SEQUENCE_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createCapitalHullExplosionSequencePreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateCapitalExplosionPokeyTrace({
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_CAPITAL_EXPLOSION_AUDIO_TRACE_PATH,
} = {}) {
  const definition = loadCapitalHullsDefinition(definitionPath);
  const trace = createCapitalExplosionPokeyTrace(definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, trace);
  return { outputPath, bytes: Buffer.byteLength(trace), frames: definition.broadside.capitalExplosion.durationFrames };
}

export function generateEngineBankSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_ENGINE_BANK_SEQUENCE_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createEngineBankSequencePreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateProwSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_PROW_SEQUENCE_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createProwSequencePreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateEnemyFighterLimitsPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_ENEMY_FIGHTER_LIMITS_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createEnemyFighterLimitsPreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

function writeEnemyReviewPreview(outputPath, png) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateDebrisReviewPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_ENTITY_EFFECTS_DEFINITION_PATH,
  outputPath = DEFAULT_DEBRIS_REVIEW_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createDebrisReviewPreview(
      fs.readFileSync(sourcePath, "utf8"),
      loadEntityEffectsDefinition(definitionPath),
    ),
  );
}

export function generateDebrisReviewTrace({
  definitionPath = DEFAULT_ENTITY_EFFECTS_DEFINITION_PATH,
  outputPath = DEFAULT_DEBRIS_REVIEW_TRACE_PATH,
} = {}) {
  const trace = createDebrisReviewTrace(loadEntityEffectsDefinition(definitionPath));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, trace);
  return { outputPath, bytes: Buffer.byteLength(trace), rows: trace.trimEnd().split("\n").length - 1 };
}

export function generateDestructibleDebrisPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_ENTITY_EFFECTS_DEFINITION_PATH,
  outputPath = DEFAULT_DESTRUCTIBLE_DEBRIS_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createDestructibleDebrisPreview(
      fs.readFileSync(sourcePath, "utf8"),
      loadEntityEffectsDefinition(definitionPath),
    ),
  );
}

export function generateDestructibleDebrisTrace({
  definitionPath = DEFAULT_ENTITY_EFFECTS_DEFINITION_PATH,
  outputPath = DEFAULT_DESTRUCTIBLE_DEBRIS_TRACE_PATH,
} = {}) {
  const trace = createDestructibleDebrisTrace(loadEntityEffectsDefinition(definitionPath));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, trace);
  return { outputPath, bytes: Buffer.byteLength(trace), rows: trace.trimEnd().split("\n").length - 1 };
}

export function generateInterceptorBreakupPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_ENTITY_EFFECTS_DEFINITION_PATH,
  outputPath = DEFAULT_INTERCEPTOR_BREAKUP_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createInterceptorBreakupPreview(
      fs.readFileSync(sourcePath, "utf8"),
      loadEntityEffectsDefinition(definitionPath),
    ),
  );
}

export function generateInterceptorBreakupTrace({
  definitionPath = DEFAULT_ENTITY_EFFECTS_DEFINITION_PATH,
  outputPath = DEFAULT_INTERCEPTOR_BREAKUP_TRACE_PATH,
} = {}) {
  const trace = createInterceptorBreakupTrace(loadEntityEffectsDefinition(definitionPath));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, trace);
  return { outputPath, bytes: Buffer.byteLength(trace), rows: trace.trimEnd().split("\n").length - 1 };
}

export function generateWeaponPickupRapidFirePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  outputPath = DEFAULT_WEAPON_PICKUP_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createWeaponPickupRapidFirePreview(fs.readFileSync(sourcePath, "utf8")),
  );
}

export function generateHudPresentationPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  outputPath = DEFAULT_HUD_PRESENTATION_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createHudPresentationPreview(fs.readFileSync(sourcePath, "utf8")),
  );
}

export function generateHudPresentationNativePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  outputPath = DEFAULT_HUD_PRESENTATION_NATIVE_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createHudPresentationNativePreview(fs.readFileSync(sourcePath, "utf8")),
  );
}

export function generateWeaponPickupRapidFireTrace({
  outputPath = DEFAULT_WEAPON_PICKUP_TRACE_PATH,
} = {}) {
  const trace = createWeaponPickupRapidFireTrace();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, trace);
  return { outputPath, bytes: Buffer.byteLength(trace), rows: trace.trimEnd().split("\n").length - 1 };
}

export function generateSpreadShotPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  outputPath = DEFAULT_SPREAD_SHOT_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createSpreadShotPreview(fs.readFileSync(sourcePath, "utf8")),
  );
}

export function generateShieldBoosterPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  outputPath = DEFAULT_SHIELD_BOOSTER_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createShieldBoosterPreview(fs.readFileSync(sourcePath, "utf8")),
  );
}

export function generateSpreadShotTrace({
  outputPath = DEFAULT_SPREAD_SHOT_TRACE_PATH,
} = {}) {
  const trace = createSpreadShotTrace();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, trace);
  return { outputPath, bytes: Buffer.byteLength(trace), rows: trace.trimEnd().split("\n").length - 1 };
}

export function generatePlayerFighterProjectileColourPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  artifact = "xex",
  outputPath = artifact === "xex" ? DEFAULT_PROJECTILE_COLOUR_XEX_PREVIEW_PATH :
    DEFAULT_PROJECTILE_COLOUR_ATR_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createPlayerFighterProjectileColourPreview(fs.readFileSync(sourcePath, "utf8"), artifact),
  );
}

export function generatePlayerFighterBurstBalancePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  artifact = "xex",
  outputPath = artifact === "xex" ? DEFAULT_PLAYER_FIGHTER_BURST_BALANCE_XEX_PREVIEW_PATH :
    DEFAULT_PLAYER_FIGHTER_BURST_BALANCE_ATR_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createPlayerFighterBurstBalancePreview(fs.readFileSync(sourcePath, "utf8"), artifact),
  );
}

export function generatePlayerFighterBurstBalanceTrace({
  artifact = "xex",
  outputPath = artifact === "xex" ? DEFAULT_PLAYER_FIGHTER_BURST_BALANCE_XEX_TRACE_PATH :
    DEFAULT_PLAYER_FIGHTER_BURST_BALANCE_ATR_TRACE_PATH,
} = {}) {
  const trace = createPlayerFighterBurstBalanceTrace(artifact);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, trace);
  return { outputPath, bytes: Buffer.byteLength(trace), rows: trace.trimEnd().split("\n").length - 1 };
}

export function generateSpreadShotHullPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  artifact = "xex",
  outputPath = artifact === "xex" ? DEFAULT_SPREAD_SHOT_HULL_XEX_PREVIEW_PATH :
    DEFAULT_SPREAD_SHOT_HULL_ATR_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createSpreadShotHullPreview(fs.readFileSync(sourcePath, "utf8"), artifact),
  );
}

export function generateSpreadShotHullTrace({
  artifact = "xex",
  outputPath = artifact === "xex" ? DEFAULT_SPREAD_SHOT_HULL_XEX_TRACE_PATH :
    DEFAULT_SPREAD_SHOT_HULL_ATR_TRACE_PATH,
} = {}) {
  const trace = createSpreadShotHullTrace(artifact);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, trace);
  return { outputPath, bytes: Buffer.byteLength(trace), rows: trace.trimEnd().split("\n").length - 1 };
}

export function generateEnemyReferenceInventoryPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  outputPath = DEFAULT_ENEMY_REFERENCE_INVENTORY_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createEnemyReferenceInventoryPreview(fs.readFileSync(sourcePath, "utf8")),
  );
}

export function generateEnemyAnchorComparisonPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  outputPath = DEFAULT_ENEMY_ANCHOR_COMPARISON_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createEnemyAnchorComparisonPreview(fs.readFileSync(sourcePath, "utf8")),
  );
}

export function generateEnemyNativeSpritesPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  outputPath = DEFAULT_ENEMY_NATIVE_SPRITES_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createEnemyNativeSpritesPreview(fs.readFileSync(sourcePath, "utf8")),
  );
}

export function generateEnemyReviewHarnessPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_ENEMY_REVIEW_HARNESS_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createEnemyReviewHarnessPreview(
      fs.readFileSync(sourcePath, "utf8"),
      loadCapitalHullsDefinition(definitionPath),
    ),
  );
}

export function generateEnemyScannerComparisonPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  outputPath = DEFAULT_ENEMY_SCANNER_COMPARISON_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createEnemyScannerComparisonPreview(fs.readFileSync(sourcePath, "utf8")),
  );
}

export function generateEnemyInterceptorBeforeAfterPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  outputPath = DEFAULT_ENEMY_BEFORE_AFTER_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createEnemyInterceptorBeforeAfterPreview(fs.readFileSync(sourcePath, "utf8")),
  );
}

export function generateEnemyPaletteCandidatePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  candidateId,
  outputPath,
} = {}) {
  if (!candidateId || !outputPath) {
    throw new Error("Enemy palette preview requires candidateId and outputPath");
  }
  return writeEnemyReviewPreview(
    outputPath,
    createEnemyPaletteCandidatePreview(
      fs.readFileSync(sourcePath, "utf8"),
      candidateId,
      loadCapitalHullsDefinition(definitionPath),
    ),
  );
}

export function generateEnemyCombatSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_ENEMY_COMBAT_SEQUENCE_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createEnemyCombatSequencePreview(
      fs.readFileSync(sourcePath, "utf8"),
      loadCapitalHullsDefinition(definitionPath),
    ),
  );
}

export function generateInterceptorNaturalFireTrace({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_INTERCEPTOR_NATURAL_FIRE_TRACE_PATH,
} = {}) {
  const trace = createInterceptorNaturalFireTrace(
    fs.readFileSync(sourcePath, "utf8"),
    loadCapitalHullsDefinition(definitionPath),
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, trace);
  return { outputPath, bytes: Buffer.byteLength(trace), rows: trace.trimEnd().split("\n").length - 1 };
}

export function generateFighterBurstRuntimeTrace({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_FIGHTER_BURST_RUNTIME_TRACE_PATH,
} = {}) {
  const trace = createFighterBurstRuntimeTrace(
    fs.readFileSync(sourcePath, "utf8"),
    loadCapitalHullsDefinition(definitionPath),
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, trace);
  return { outputPath, bytes: Buffer.byteLength(trace), rows: trace.trimEnd().split("\n").length - 1 };
}

export function generateFighterWeaponTransitionTrace({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_FIGHTER_WEAPON_TRANSITION_TRACE_PATH,
} = {}) {
  const trace = createFighterWeaponTransitionTrace(
    fs.readFileSync(sourcePath, "utf8"),
    loadCapitalHullsDefinition(definitionPath),
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, trace);
  return { outputPath, bytes: Buffer.byteLength(trace), rows: trace.trimEnd().split("\n").length - 1 };
}

export function generateSharedFighterExplosionPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_SHARED_FIGHTER_EXPLOSION_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createSharedFighterExplosionPreview(
      fs.readFileSync(sourcePath, "utf8"),
      loadCapitalHullsDefinition(definitionPath),
    ),
  );
}

export function generateSharedFighterExplosionTrace({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_SHARED_FIGHTER_EXPLOSION_TRACE_PATH,
} = {}) {
  const trace = createSharedFighterExplosionTrace(
    fs.readFileSync(sourcePath, "utf8"),
    loadCapitalHullsDefinition(definitionPath),
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, trace);
  return { outputPath, bytes: Buffer.byteLength(trace), rows: trace.trimEnd().split("\n").length - 1 };
}

export function generateExplosionFlashNativePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_EXPLOSION_FLASH_NATIVE_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createExplosionFlashNativePreview(
      fs.readFileSync(sourcePath, "utf8"),
      loadCapitalHullsDefinition(definitionPath),
    ),
  );
}

export function generateExplosionFlashComparisonPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_EXPLOSION_FLASH_COMPARISON_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createExplosionFlashComparisonPreview(
      fs.readFileSync(sourcePath, "utf8"),
      loadCapitalHullsDefinition(definitionPath),
    ),
  );
}

export function generateExplosionFlashTrace({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  outputPath = DEFAULT_EXPLOSION_FLASH_TRACE_PATH,
} = {}) {
  const trace = createExplosionFlashTrace(fs.readFileSync(sourcePath, "utf8"));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, trace);
  return { outputPath, bytes: Buffer.byteLength(trace), rows: trace.trimEnd().split("\n").length - 1 };
}

export function generateProjectileVisualLanguagePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_PROJECTILE_VISUAL_LANGUAGE_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createProjectileVisualLanguagePreview(
      fs.readFileSync(sourcePath, "utf8"),
      loadCapitalHullsDefinition(definitionPath),
    ),
  );
}

export function generateProjectileCollisionScoringPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_PROJECTILE_COLLISION_SCORING_PREVIEW_PATH,
} = {}) {
  return writeEnemyReviewPreview(
    outputPath,
    createProjectileCollisionScoringPreview(
      fs.readFileSync(sourcePath, "utf8"),
      loadCapitalHullsDefinition(definitionPath),
    ),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const gameplayResult = generateGameplayPreview();
    console.log(`Gameplay preview generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, gameplayResult.outputPath)}`);
    console.log(
      `  size: ${gameplayResult.width}x${gameplayResult.height}, ${gameplayResult.bytes} bytes`,
    );

    const capitalHullsResult = generateCapitalHullsStripPreview();
    console.log(`Capital-hulls strip preview generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, capitalHullsResult.outputPath)}`);
    console.log(
      `  size: ${capitalHullsResult.width}x${capitalHullsResult.height}, ${capitalHullsResult.bytes} bytes`,
    );

    const enemyHullColoursResult = generateEnemyHullColourOptionsPreview();
    console.log(`Enemy-hull colour comparison generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, enemyHullColoursResult.outputPath)}`);
    console.log(
      `  size: ${enemyHullColoursResult.width}x${enemyHullColoursResult.height}, ${enemyHullColoursResult.bytes} bytes`,
    );

    const broadsideAntic2Result = generateBroadsideAntic2PrototypePreview();
    console.log(`ANTIC 2 broadside gameplay prototype generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, broadsideAntic2Result.outputPath)}`);
    console.log(
      `  size: ${broadsideAntic2Result.width}x${broadsideAntic2Result.height}, ${broadsideAntic2Result.bytes} bytes`,
    );

    const capitalHullsAntic2Result = generateCapitalHullsAntic2StripPreview();
    console.log(`ANTIC 2 capital-hulls strip generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, capitalHullsAntic2Result.outputPath)}`);
    console.log(
      `  size: ${capitalHullsAntic2Result.width}x${capitalHullsAntic2Result.height}, ${capitalHullsAntic2Result.bytes} bytes`,
    );

    const comparisonResult = generateBroadsideModeComparisonPreview();
    console.log(`Broadside mode comparison generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, comparisonResult.outputPath)}`);
    console.log(
      `  size: ${comparisonResult.width}x${comparisonResult.height}, ${comparisonResult.bytes} bytes`,
    );

    const broadsideFireResult = generateBroadsideFireSequencePreview();
    console.log(`Broadside-fire sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, broadsideFireResult.outputPath)}`);
    console.log(
      `  size: ${broadsideFireResult.width}x${broadsideFireResult.height}, ${broadsideFireResult.bytes} bytes`,
    );

    const broadsideAcceptanceResult = generateBroadsideAcceptanceSequencePreview();
    console.log(`Broadside acceptance sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, broadsideAcceptanceResult.outputPath)}`);
    console.log(
      `  size: ${broadsideAcceptanceResult.width}x${broadsideAcceptanceResult.height}, ${broadsideAcceptanceResult.bytes} bytes`,
    );

    const playerRespawnResult = generatePlayerRespawnSequencePreview();
    console.log(`Player-respawn sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, playerRespawnResult.outputPath)}`);
    console.log(
      `  size: ${playerRespawnResult.width}x${playerRespawnResult.height}, ${playerRespawnResult.bytes} bytes`,
    );

    const broadsideCadenceResult = generateBroadsideCadenceSequencePreview();
    console.log(`Broadside cadence sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, broadsideCadenceResult.outputPath)}`);
    console.log(
      `  size: ${broadsideCadenceResult.width}x${broadsideCadenceResult.height}, ${broadsideCadenceResult.bytes} bytes`,
    );

    const broadsideSpeedResult = generateBroadsideSpeedSequencePreview();
    console.log(`Broadside speed sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, broadsideSpeedResult.outputPath)}`);
    console.log(
      `  size: ${broadsideSpeedResult.width}x${broadsideSpeedResult.height}, ${broadsideSpeedResult.bytes} bytes`,
    );

    const difficultySpeedResult = generateDifficultySpeedComparisonPreview();
    console.log(`Difficulty-speed comparison generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, difficultySpeedResult.outputPath)}`);
    console.log(
      `  size: ${difficultySpeedResult.width}x${difficultySpeedResult.height}, ${difficultySpeedResult.bytes} bytes`,
    );

    const flagshipSectorResult = generateFlagshipSectorSequencePreview();
    console.log(`Flagship-sector sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, flagshipSectorResult.outputPath)}`);
    console.log(
      `  size: ${flagshipSectorResult.width}x${flagshipSectorResult.height}, ${flagshipSectorResult.bytes} bytes`,
    );

    const heavyShellResult = generateHeavyShellDetailSequencePreview();
    console.log(`Heavy-shell detail sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, heavyShellResult.outputPath)}`);
    console.log(
      `  size: ${heavyShellResult.width}x${heavyShellResult.height}, ${heavyShellResult.bytes} bytes`,
    );

    const capitalExplosionResult = generateCapitalHullExplosionSequencePreview();
    console.log(`Capital-hull explosion sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, capitalExplosionResult.outputPath)}`);
    console.log(
      `  size: ${capitalExplosionResult.width}x${capitalExplosionResult.height}, ${capitalExplosionResult.bytes} bytes`,
    );

    const capitalExplosionAudioResult = generateCapitalExplosionPokeyTrace();
    console.log(`Capital-explosion POKEY trace generated successfully`);
    console.log(`  CSV : ${path.relative(rootDirectory, capitalExplosionAudioResult.outputPath)}`);
    console.log(
      `  span: ${capitalExplosionAudioResult.frames} PAL frames, ${capitalExplosionAudioResult.bytes} bytes`,
    );

    const engineBankResult = generateEngineBankSequencePreview();
    console.log(`Capital-engine bank sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, engineBankResult.outputPath)}`);
    console.log(
      `  size: ${engineBankResult.width}x${engineBankResult.height}, ${engineBankResult.bytes} bytes`,
    );

    const prowResult = generateProwSequencePreview();
    console.log(`Capital-prow sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, prowResult.outputPath)}`);
    console.log(
      `  size: ${prowResult.width}x${prowResult.height}, ${prowResult.bytes} bytes`,
    );

    const fighterLimitsResult = generateEnemyFighterLimitsPreview();
    console.log(`Enemy-fighter corridor-limit preview generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, fighterLimitsResult.outputPath)}`);
    console.log(
      `  size: ${fighterLimitsResult.width}x${fighterLimitsResult.height}, ${fighterLimitsResult.bytes} bytes`,
    );

    for (const [name, result] of [
      ["Enemy reference inventory", generateEnemyReferenceInventoryPreview()],
      ["Enemy anchor comparison", generateEnemyAnchorComparisonPreview()],
      ["Enemy native sprites", generateEnemyNativeSpritesPreview()],
      ["Enemy review harness", generateEnemyReviewHarnessPreview()],
      ["Enemy scanner comparison", generateEnemyScannerComparisonPreview()],
      ["Enemy Interceptor before/after", generateEnemyInterceptorBeforeAfterPreview()],
      ["Enemy palette Hostile oxblood", generateEnemyPaletteCandidatePreview({
        candidateId: "HOSTILE_OXBLOOD",
        outputPath: DEFAULT_ENEMY_PALETTE_HOSTILE_OXBLOOD_PREVIEW_PATH,
      })],
      ["Enemy palette Hostile burgundy comparison", generateEnemyPaletteCandidatePreview({
        candidateId: "HOSTILE_BURGUNDY",
        outputPath: DEFAULT_ENEMY_PALETTE_HOSTILE_BURGUNDY_PREVIEW_PATH,
      })],
      ["Enemy palette Hostile scarlet", generateEnemyPaletteCandidatePreview({
        candidateId: "HOSTILE_SCARLET",
        outputPath: DEFAULT_ENEMY_PALETTE_HOSTILE_SCARLET_PREVIEW_PATH,
      })],
      ["Enemy single-pulse combat", generateEnemyCombatSequencePreview()],
      ["Projectile visual language", generateProjectileVisualLanguagePreview()],
      ["Projectile collision scoring", generateProjectileCollisionScoringPreview()],
    ]) {
      console.log(`${name} generated successfully`);
      console.log(`  PNG : ${path.relative(rootDirectory, result.outputPath)}`);
      console.log(`  size: ${result.width}x${result.height}, ${result.bytes} bytes`);
    }

    const interceptorNaturalFireTrace = generateInterceptorNaturalFireTrace();
    console.log(`Interceptor natural-fire runtime trace generated successfully`);
    console.log(`  CSV : ${path.relative(rootDirectory, interceptorNaturalFireTrace.outputPath)}`);
    console.log(`  rows: ${interceptorNaturalFireTrace.rows}, ${interceptorNaturalFireTrace.bytes} bytes`);

    const fighterBurstRuntimeTrace = generateFighterBurstRuntimeTrace();
    console.log(`Fighter burst runtime trace generated successfully`);
    console.log(`  CSV : ${path.relative(rootDirectory, fighterBurstRuntimeTrace.outputPath)}`);
    console.log(`  rows: ${fighterBurstRuntimeTrace.rows}, ${fighterBurstRuntimeTrace.bytes} bytes`);

    const fighterTransitionTrace = generateFighterWeaponTransitionTrace();
    console.log(`Fighter weapon-transition trace generated successfully`);
    console.log(`  CSV : ${path.relative(rootDirectory, fighterTransitionTrace.outputPath)}`);
    console.log(`  rows: ${fighterTransitionTrace.rows}, ${fighterTransitionTrace.bytes} bytes`);

    const sharedExplosionResult = generateSharedFighterExplosionPreview();
    console.log(`Shared fighter-explosion sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, sharedExplosionResult.outputPath)}`);
    console.log(
      `  size: ${sharedExplosionResult.width}x${sharedExplosionResult.height}, ${sharedExplosionResult.bytes} bytes`,
    );

    const sharedExplosionTrace = generateSharedFighterExplosionTrace();
    console.log(`Shared fighter-explosion trace generated successfully`);
    console.log(`  CSV : ${path.relative(rootDirectory, sharedExplosionTrace.outputPath)}`);
    console.log(`  rows: ${sharedExplosionTrace.rows}, ${sharedExplosionTrace.bytes} bytes`);

    const explosionFlashNative = generateExplosionFlashNativePreview();
    console.log(`Explosion colour-flash native sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, explosionFlashNative.outputPath)}`);
    console.log(
      `  size: ${explosionFlashNative.width}x${explosionFlashNative.height}, ${explosionFlashNative.bytes} bytes`,
    );
    const explosionFlashComparison = generateExplosionFlashComparisonPreview();
    console.log(`Explosion colour-flash comparison generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, explosionFlashComparison.outputPath)}`);
    console.log(
      `  size: ${explosionFlashComparison.width}x${explosionFlashComparison.height}, ${explosionFlashComparison.bytes} bytes`,
    );
    const explosionFlashTrace = generateExplosionFlashTrace();
    console.log(`Explosion colour-flash frame trace generated successfully`);
    console.log(`  CSV : ${path.relative(rootDirectory, explosionFlashTrace.outputPath)}`);
    console.log(`  rows: ${explosionFlashTrace.rows}, ${explosionFlashTrace.bytes} bytes`);

    const debrisReviewResult = generateDebrisReviewPreview();
    console.log(`Debris visual-polish owner review generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, debrisReviewResult.outputPath)}`);
    console.log(
      `  size: ${debrisReviewResult.width}x${debrisReviewResult.height}, ${debrisReviewResult.bytes} bytes`,
    );
    const debrisReviewTrace = generateDebrisReviewTrace();
    console.log(`Debris visual-polish trace generated successfully`);
    console.log(`  CSV : ${path.relative(rootDirectory, debrisReviewTrace.outputPath)}`);
    console.log(`  rows: ${debrisReviewTrace.rows}, ${debrisReviewTrace.bytes} bytes`);

    const destructibleDebrisResult = generateDestructibleDebrisPreview();
    console.log(`Destructible-debris owner review generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, destructibleDebrisResult.outputPath)}`);
    console.log(
      `  size: ${destructibleDebrisResult.width}x${destructibleDebrisResult.height}, ${destructibleDebrisResult.bytes} bytes`,
    );
    const destructibleDebrisTrace = generateDestructibleDebrisTrace();
    console.log(`Destructible-debris acceptance trace generated successfully`);
    console.log(`  CSV : ${path.relative(rootDirectory, destructibleDebrisTrace.outputPath)}`);
    console.log(`  rows: ${destructibleDebrisTrace.rows}, ${destructibleDebrisTrace.bytes} bytes`);

    const interceptorBreakupResult = generateInterceptorBreakupPreview();
    console.log(`Enemy Interceptor-breakup owner review generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, interceptorBreakupResult.outputPath)}`);
    console.log(
      `  size: ${interceptorBreakupResult.width}x${interceptorBreakupResult.height}, ${interceptorBreakupResult.bytes} bytes`,
    );
    const interceptorBreakupTrace = generateInterceptorBreakupTrace();
    console.log(`Enemy Interceptor-breakup runtime trace generated successfully`);
    console.log(`  CSV : ${path.relative(rootDirectory, interceptorBreakupTrace.outputPath)}`);
    console.log(`  rows: ${interceptorBreakupTrace.rows}, ${interceptorBreakupTrace.bytes} bytes`);

    const hudPresentationResult = generateHudPresentationPreview();
    console.log(`HUD presentation review generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, hudPresentationResult.outputPath)}`);
    console.log(
      `  size: ${hudPresentationResult.width}x${hudPresentationResult.height}, ${hudPresentationResult.bytes} bytes`,
    );
    const hudPresentationNativeResult = generateHudPresentationNativePreview();
    console.log(`HUD native-scale presentation generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, hudPresentationNativeResult.outputPath)}`);
    console.log(
      `  size: ${hudPresentationNativeResult.width}x${hudPresentationNativeResult.height}, ${hudPresentationNativeResult.bytes} bytes`,
    );

    const weaponPickupResult = generateWeaponPickupRapidFirePreview();
    console.log(`Rapid Fire weapon-pickup owner review generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, weaponPickupResult.outputPath)}`);
    console.log(
      `  size: ${weaponPickupResult.width}x${weaponPickupResult.height}, ${weaponPickupResult.bytes} bytes`,
    );
    const weaponPickupTrace = generateWeaponPickupRapidFireTrace();
    console.log(`Rapid Fire weapon-pickup runtime trace generated successfully`);
    console.log(`  CSV : ${path.relative(rootDirectory, weaponPickupTrace.outputPath)}`);
    console.log(`  rows: ${weaponPickupTrace.rows}, ${weaponPickupTrace.bytes} bytes`);

    const spreadShotResult = generateSpreadShotPreview();
    console.log(`Spread Shot weapon-pickup owner review generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, spreadShotResult.outputPath)}`);
    console.log(
      `  size: ${spreadShotResult.width}x${spreadShotResult.height}, ${spreadShotResult.bytes} bytes`,
    );
    const shieldBoosterResult = generateShieldBoosterPreview();
    console.log(`Shield Booster owner review generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, shieldBoosterResult.outputPath)}`);
    console.log(
      `  size: ${shieldBoosterResult.width}x${shieldBoosterResult.height}, ${shieldBoosterResult.bytes} bytes`,
    );
    const spreadShotTrace = generateSpreadShotTrace();
    console.log(`Spread Shot XEX/ATR runtime trace generated successfully`);
    console.log(`  CSV : ${path.relative(rootDirectory, spreadShotTrace.outputPath)}`);
    console.log(`  rows: ${spreadShotTrace.rows}, ${spreadShotTrace.bytes} bytes`);
    for (const artifact of ["xex", "atr"]) {
      const colourPreview = generatePlayerFighterProjectileColourPreview({ artifact });
      console.log(`Projectile-colour ${artifact.toUpperCase()} owner review generated successfully`);
      console.log(`  PNG : ${path.relative(rootDirectory, colourPreview.outputPath)}`);
      console.log(
        `  size: ${colourPreview.width}x${colourPreview.height}, ${colourPreview.bytes} bytes`,
      );
      const burstPreview = generatePlayerFighterBurstBalancePreview({ artifact });
      console.log(`PlayerFighter burst-balance ${artifact.toUpperCase()} owner review generated successfully`);
      console.log(`  PNG : ${path.relative(rootDirectory, burstPreview.outputPath)}`);
      console.log(
        `  size: ${burstPreview.width}x${burstPreview.height}, ${burstPreview.bytes} bytes`,
      );
      const burstTrace = generatePlayerFighterBurstBalanceTrace({ artifact });
      console.log(`  CSV : ${path.relative(rootDirectory, burstTrace.outputPath)}`);
      console.log(`  rows: ${burstTrace.rows}, ${burstTrace.bytes} bytes`);
    }
    for (const artifact of ["xex", "atr"]) {
      const hullPreview = generateSpreadShotHullPreview({ artifact });
      console.log(`Spread Shot ${artifact.toUpperCase()} hull owner sequence generated successfully`);
      console.log(`  PNG : ${path.relative(rootDirectory, hullPreview.outputPath)}`);
      console.log(
        `  size: ${hullPreview.width}x${hullPreview.height}, ${hullPreview.bytes} bytes`,
      );
      const hullTrace = generateSpreadShotHullTrace({ artifact });
      console.log(`  CSV : ${path.relative(rootDirectory, hullTrace.outputPath)}`);
      console.log(`  rows: ${hullTrace.rows}, ${hullTrace.bytes} bytes`);
    }

    const startMenuResult = generateStartMenuPreview();
    console.log(`Start-menu preview generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, startMenuResult.outputPath)}`);
    console.log(
      `  size: ${startMenuResult.width}x${startMenuResult.height}, ${startMenuResult.bytes} bytes`,
    );

    const loaderResult = generateLoaderPreview();
    console.log(`Loader preview generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, loaderResult.outputPath)}`);
    console.log(
      `  size: ${loaderResult.width}x${loaderResult.height}, ${loaderResult.bytes} bytes`,
    );
  } catch (error) {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  }
}
