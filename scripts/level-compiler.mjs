// Roadmap 4.6 step 1 (docs/plans/director-4.6.md §2, §5, §6): the level
// compiler. It reads one authored JSON level from assets/levels/, validates it
// against the caps the runtime can honour, and emits the three pages the
// level image carries behind the hull block:
//
//   LevelDef core     256 B at $AA00 (image offset $400) - plan §2.2
//   LevelDef payload  256 B at $AB00 (image offset $500) - plan §2.3
//   HullGeometry      128 B at $AC00 (image offset $600) - plan §2.4
//
// Step 1 emits the bytes and nothing reads them: the Director still runs on
// LEVEL1_DATA (step 2), the payload consumers arrive at step 5 and the hull
// geometry consumers at step 4. The format is frozen here so that no later
// step changes it.
//
// The rule the validator enforces (plan §5): a level file may make the game
// easier than the runtime allows, never harder. Anything a level asks for
// beyond the runtime's own ceiling is either a hard rejection here or a
// warning plus a runtime clamp; nothing in a level file can name code.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compileCapitalHulls, loadCapitalHullsDefinition } from "./capital-hulls.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");

// ---------------------------------------------------------------------------
// Layout - plan §2.1. Offsets are inside the level image, whose byte 0 lands
// at LEVEL_BUFFER = $A600.
// ---------------------------------------------------------------------------

export const LEVEL_BUFFER_ADDRESS = 0xa600;
export const LEVEL_IMAGE_SECTORS = 13;
export const LEVEL_CORE_OFFSET = 0x400;
export const LEVEL_PAYLOAD_OFFSET = 0x500;
export const LEVEL_GEOMETRY_OFFSET = 0x600;
export const LEVEL_CORE_BYTES = 256;
export const LEVEL_PAYLOAD_BYTES = 256;
export const LEVEL_GEOMETRY_BYTES = 128;
export const LEVEL_CORE_ADDRESS = LEVEL_BUFFER_ADDRESS + LEVEL_CORE_OFFSET;
export const LEVEL_PAYLOAD_ADDRESS = LEVEL_BUFFER_ADDRESS + LEVEL_PAYLOAD_OFFSET;
export const LEVEL_GEOMETRY_ADDRESS = LEVEL_BUFFER_ADDRESS + LEVEL_GEOMETRY_OFFSET;

// The core page's magic byte. Plan §2.2 writes it `$56 | format nibble`; a
// bitwise OR cannot carry a nibble into a byte whose low nibble is already 6,
// so the magic takes the HIGH nibble of $56 ('V') and the format the low one:
// $51 for format 1. director_c_init refuses a mismatch and completes the level
// immediately - fail closed, never a jump (step 2).
export const LEVEL_CORE_FORMAT = 1;
export const LEVEL_CORE_MAGIC = (0x56 & 0xf0) | LEVEL_CORE_FORMAT;

// Core header offsets the build stamps directly (plan §7's debug route).
export const CORE_DEBUG_START_SECTOR_OFFSET = 12;

export const MAX_SECTORS = 10;
export const MAX_WAVES = 20;
export const MAX_LEVEL_NUMBER = 12;

// SectorDef SoA - eight arrays of MAX_SECTORS, plan §2.2.
export const CORE_HEADER_BYTES = 16;
const SECTOR_ARRAYS = ["kind", "len", "caps", "archetypes", "hazards",
  "waveFirst", "waveCount", "look"];
const WAVE_ARRAYS = ["row", "flags", "archetype", "path", "count", "spacing",
  "entry", "memberOffset"];
export const SECTOR_ARRAY_OFFSET = Object.freeze(Object.fromEntries(
  SECTOR_ARRAYS.map((name, index) => [name, CORE_HEADER_BYTES + index * MAX_SECTORS])));
export const WAVE_ARRAY_OFFSET = Object.freeze(Object.fromEntries(
  WAVE_ARRAYS.map((name, index) =>
    [name, CORE_HEADER_BYTES + SECTOR_ARRAYS.length * MAX_SECTORS + index * MAX_WAVES])));

// Payload page - plan §2.3. Step 1 zeroes every block; step 5 fills them.
export const PAYLOAD_OFFSET = Object.freeze({
  appearance: 0, path: 48, weaponGlyph: 144, hullParams: 162, bossDef: 194,
});
export const PAYLOAD_BLOCK_BYTES = Object.freeze({
  appearance: 48, path: 96, weaponGlyph: 18, hullParams: 32, bossDef: 62,
});

// HullGeometry page - plan §2.4.
export const GEOMETRY_OFFSET = Object.freeze({
  hullRowsLo: 0, hullRowsHi: 1, phaseStarts: 2, turretDensityStep: 6,
  reserved: 7, alliedSequence: 8, enemySequence: 68,
});
export const HULL_SEQUENCE_BYTES = 60;
export const HULL_MODULE_ROWS = 8;
// Owner decision 4 (plan §11 item 4): four hull lengths, 8-row modules, with
// the fixed 224 rows of engines/aft/forward/prow around 8/16/24/32 combat
// modules.
export const HULL_ROW_STEPS = Object.freeze([288, 352, 416, 480]);

// ---------------------------------------------------------------------------
// Vocabulary - plan §6. Names, not numbers.
// ---------------------------------------------------------------------------

export const SECTOR_KIND = Object.freeze({ space: 0, capital: 1, boss: 2 });
export const SECTOR_SUBTYPE = Object.freeze({ swarm: 0, elite: 1 });
// The frozen four-record roster (ROSTER FREEZE, decision 21). A level file
// names an archetype; the byte it compiles to is that record's offset into
// enemy_archetypes, which is the only thing a level can say about code.
export const ARCHETYPE_INDEX = Object.freeze({
  raider: 0, wingman: 1, interceptor: 2, bomber: 3,
});
export const ARCHETYPE_RECORD_BYTES = 12;
// Which renderer class each archetype belongs to. Heavy archetypes own a PMG
// player; Light archetypes use the character renderer (AGENTS.md invariant).
export const ARCHETYPE_CLASS = Object.freeze({
  raider: "heavy", wingman: "light", interceptor: "light", bomber: "heavy",
});
export const NO_ESCORT = 0xff;
// Steps 1-5 author no path: $FF means "the archetype's own movement" and the
// path evaluator is step 6 (plan §2.2).
export const PATH_ARCHETYPE_DEFAULT = 0xff;

// Runtime ceilings the validator warns against (plan §5, lifecycle.c policy
// bytes). A file above these is legal - the runtime clamps - but the author is
// told, because the level will not play the way it reads.
export const SUBTYPE_CEILING = Object.freeze({
  "space/swarm": { heavy: 0, light: 3 },
  "space/elite": { heavy: 2, light: 1 },
  capital: { heavy: 0, light: 0 },
  boss: { heavy: 0, light: 0 },
});
export const MAX_REQUESTED_LIGHT = 4;
export const MAX_REQUESTED_HEAVY = 2;

// Class spacing floors, in frames. Light: the admission floor of
// light_wave_step. Heavy: the fastest interceptor_admission_retry_frames
// (src/main.s, 48/36/24 by difficulty).
export const SPACING_FLOOR = Object.freeze({ light: 16, heavy: 24 });
export const ENTRY_COLUMN_MIN = 48;
export const ENTRY_COLUMN_MAX = 200;

export class LevelValidationError extends Error {
  constructor(message, { file = null, where = null } = {}) {
    const prefix = [file, where].filter(Boolean).join(" ");
    super(prefix ? `${prefix}: ${message}` : message);
    this.name = "LevelValidationError";
    this.file = file;
    this.where = where;
  }
}

// ---------------------------------------------------------------------------
// Source reading
// ---------------------------------------------------------------------------

export function loadLevelSource(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new LevelValidationError(`is not valid JSON - ${error.message}`,
      { file: path.basename(filePath) });
  }
}

export function levelSourcePath(level) {
  return path.join(rootDirectory, "assets", "levels",
    `level-${String(level).padStart(2, "0")}.json`);
}

export function listLevelSources() {
  const directory = path.join(rootDirectory, "assets", "levels");
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter((name) => /^level-\d\d\.json$/.test(name))
    .sort()
    .map((name) => path.join(directory, name));
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function fail(context, where, message) {
  throw new LevelValidationError(message, { file: context.file, where });
}

function requireInteger(context, where, field, value, low, high) {
  if (!Number.isInteger(value) || value < low || value > high) {
    fail(context, where, `${field} is ${JSON.stringify(value)}; it must be an ` +
      `integer in ${low}..${high}`);
  }
  return value;
}

function requireBoolean(context, where, field, value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") {
    fail(context, where, `${field} is ${JSON.stringify(value)}; it must be true or false`);
  }
  return value;
}

function requireName(context, where, field, value, table) {
  if (typeof value !== "string" || !Object.hasOwn(table, value)) {
    fail(context, where, `${field} is ${JSON.stringify(value)}; it must be one of ` +
      Object.keys(table).map((name) => `"${name}"`).join(", "));
  }
  return table[value];
}

// ---------------------------------------------------------------------------
// HullGeometry - plan §2.4
// ---------------------------------------------------------------------------

// The phase starts the capital phase machine reads, in modules. They come from
// the hull asset's own section lengths so the data can never disagree with the
// art: engines, then aft, combat, forward, prow.
export function hullPhaseStartsFromSections(sections) {
  const byId = new Map(sections.map((section) => [section.id, section.rows]));
  for (const id of ["engines", "aft", "combat", "forward", "prow"]) {
    if (!byId.has(id)) {
      throw new LevelValidationError(`the capital hull asset has no "${id}" section`);
    }
  }
  const engines = byId.get("engines");
  const aft = byId.get("aft");
  const combat = byId.get("combat");
  const forward = byId.get("forward");
  return [engines, engines + aft, engines + aft + combat,
    engines + aft + combat + forward].map((row) => row / HULL_MODULE_ROWS);
}

// Pinned separately (plan §5 "non-monotonic thresholds"): the four phase
// starts must strictly increase and stay inside the hull, or the phase machine
// would skip or re-enter a phase.
export function validateHullGeometry({ hullRows, phaseStarts }, context = {}) {
  const where = context.where ?? "hull";
  const wrap = (message) => {
    throw new LevelValidationError(message, { file: context.file ?? null, where });
  };
  if (!HULL_ROW_STEPS.includes(hullRows)) {
    wrap(`hull rows ${hullRows} is outside the four authored lengths ` +
      `${HULL_ROW_STEPS.join(", ")}`);
  }
  if (!Array.isArray(phaseStarts) || phaseStarts.length !== 4) {
    wrap("the hull needs exactly four phase starts (aft, combat, forward, prow)");
  }
  const modules = hullRows / HULL_MODULE_ROWS;
  let previous = 0;
  for (const [index, start] of phaseStarts.entries()) {
    const name = ["aft", "combat", "forward", "prow"][index];
    if (!Number.isInteger(start) || start <= previous) {
      wrap(`the ${name} phase starts at module ${start}, which does not follow ` +
        `${previous}; the four thresholds must strictly increase`);
    }
    if (start >= modules) {
      wrap(`the ${name} phase starts at module ${start}, at or past the hull end ` +
        `(${modules} modules)`);
    }
    previous = start;
  }
  if (modules + 1 > 0xff) wrap(`a ${hullRows}-row hull does not fit a one-byte drain module`);
  return { hullRows, phaseStarts, modules, drainModule: modules + 1 };
}

// The hull asset compiled at a level's length. The full length is the default
// asset itself, so level 1 reproduces today's hull byte for byte (T2).
const hullAssetsByRows = new WeakMap();
function hullAssetForRows(hullAsset, rows) {
  if (hullAsset.sector.totalRows === rows) return hullAsset;
  if (!hullAssetsByRows.has(hullAsset)) hullAssetsByRows.set(hullAsset, new Map());
  const byRows = hullAssetsByRows.get(hullAsset);
  if (!byRows.has(rows)) {
    byRows.set(rows, compileCapitalHulls(hullAsset.definition,
      { combatRows: rows - (HULL_ROW_STEPS.at(-1) - 256) }));
  }
  return byRows.get(rows);
}

// Roadmap 4.6 step 4 (owner, plan §8.2): a short hull is RIGHT-ALIGNED in the
// 480-row coordinate. It occupies rows 480-L .. 479, capital entry starts the
// row clock at 480-L, and so the prow (448-479), the DRAIN row (488) and the
// prow collision rows are the same for every length - the three runtime sites
// that read them never change. The page therefore carries the phase starts as
// ABSOLUTE modules, and the modules before the hull hold the engine module:
// the enemy side trails by eight rows and resolves module lead-1 on its first
// eight, where there is no blank module to put.
function compileGeometryPage(hull, hullAsset, context) {
  const page = Buffer.alloc(LEVEL_GEOMETRY_BYTES);
  const rows = hull.rows;
  const asset = hullAssetForRows(hullAsset, rows);
  const geometry = validateHullGeometry(
    { hullRows: rows, phaseStarts: hullPhaseStartsFromSections(asset.sector.sections) },
    { file: context.file, where: "hull" });
  const leadModules = HULL_SEQUENCE_BYTES - geometry.modules;
  page.writeUInt16LE(geometry.hullRows, GEOMETRY_OFFSET.hullRowsLo);
  const absolutePhaseStarts = geometry.phaseStarts.map((start) => start + leadModules);
  for (const [index, start] of absolutePhaseStarts.entries()) {
    page[GEOMETRY_OFFSET.phaseStarts + index] = start;
  }
  page[GEOMETRY_OFFSET.turretDensityStep] = hull.turrets;
  for (const [side, offset] of [["allied", GEOMETRY_OFFSET.alliedSequence],
    ["enemy", GEOMETRY_OFFSET.enemySequence]]) {
    const sequence = asset.sector.moduleSequences.get(side);
    if (!sequence || sequence.length !== geometry.modules) {
      fail(context, "hull", `the ${side} module sequence is ` +
        `${sequence ? sequence.length : "missing"}; a ${rows}-row hull has ${geometry.modules}`);
    }
    page.fill(asset.sector.engineModuleIds.get(side), offset, offset + leadModules);
    Buffer.from(sequence).copy(page, offset + leadModules);
  }
  return {
    page,
    geometry: {
      ...geometry,
      firstRow: leadModules * HULL_MODULE_ROWS,
      phaseStarts: absolutePhaseStarts,
      drainModule: HULL_SEQUENCE_BYTES + 1,
      turretCounts: { ...asset.sector.turretCounts },
    },
  };
}

// ---------------------------------------------------------------------------
// The compiler
// ---------------------------------------------------------------------------

function compileHull(source, context) {
  const hull = source.hull ?? {};
  if (typeof hull !== "object" || Array.isArray(hull)) {
    fail(context, "hull", "must be an object with \"length\" (0-3) and \"turrets\" (0-3)");
  }
  if (hull.rows !== undefined && hull.length !== undefined) {
    fail(context, "hull", "names both \"rows\" and \"length\"; give one");
  }
  const turrets = requireInteger(context, "hull", "turrets", hull.turrets ?? 3, 0, 3);
  // Density step 3 is today's stations per row (owner, plan §8.2). Steps 0-2
  // keep their format slot but have no table until the owner defines one.
  if (turrets !== 3) {
    fail(context, "hull", `turret density ${turrets} is not defined yet; only 3 ` +
      "(today's stations per row) compiles (docs/plans/director-4.6.md §8.2)");
  }
  if (hull.rows !== undefined) {
    if (!Number.isInteger(hull.rows) || !HULL_ROW_STEPS.includes(hull.rows)) {
      fail(context, "hull", `rows is ${JSON.stringify(hull.rows)}; the four authored ` +
        `hull lengths are ${HULL_ROW_STEPS.join(", ")} rows`);
    }
    return { rows: hull.rows, length: HULL_ROW_STEPS.indexOf(hull.rows), turrets };
  }
  const length = requireInteger(context, "hull", "length", hull.length ?? 3, 0, 3);
  return { rows: HULL_ROW_STEPS[length], length, turrets };
}

function waveMembers(wave, context, where) {
  if (wave.members !== undefined) {
    if (wave.archetype !== undefined || wave.escort !== undefined) {
      fail(context, where, "names both \"members\" and \"archetype\"/\"escort\"; give one form");
    }
    if (!Array.isArray(wave.members) || wave.members.length === 0) {
      fail(context, where, "\"members\" must be a non-empty array of archetype names");
    }
    const distinct = [...new Set(wave.members)];
    // Rule 10 (plan §5): one dominant archetype and at most one supporting.
    if (distinct.length > 2) {
      fail(context, where, `names ${distinct.length} distinct archetypes ` +
        `(${distinct.join(", ")}); a wave carries one dominant archetype and at most ` +
        "one supporting escort");
    }
    return { archetype: distinct[0], escort: distinct[1] ?? null };
  }
  if (wave.archetype === undefined) fail(context, where, "has no \"archetype\"");
  return { archetype: wave.archetype, escort: wave.escort ?? null };
}

function compileSectors(source, context, warnings) {
  if (!Array.isArray(source.sectors) || source.sectors.length === 0) {
    fail(context, "sectors", "must be a non-empty array");
  }
  if (source.sectors.length > MAX_SECTORS) {
    fail(context, "sectors", `there are ${source.sectors.length}; the core page holds ` +
      `${MAX_SECTORS}`);
  }
  const sectors = [];
  const waves = [];
  let bossSectorIndex = -1;
  for (const [index, raw] of source.sectors.entries()) {
    const where = `sector ${index + 1}`;
    const kindName = raw.kind ?? "space";
    const kind = requireName(context, where, "kind", kindName, SECTOR_KIND);
    const isSpace = kind === SECTOR_KIND.space;
    const subtypeName = raw.subtype ?? (isSpace ? "swarm" : undefined);
    const subtype = isSpace
      ? requireName(context, where, "subtype", subtypeName, SECTOR_SUBTYPE)
      : 0;
    if (!isSpace && raw.subtype !== undefined) {
      fail(context, where, `is a ${kindName} sector; only a space sector takes a subtype`);
    }
    if (kind === SECTOR_KIND.boss) {
      if (index !== source.sectors.length - 1) {
        fail(context, where, "is a boss sector but not the last one; a boss ends the level");
      }
      bossSectorIndex = index;
    }

    // sector_len: rows/8. CAPITAL and BOSS ignore it - the hull traversal and
    // the boss's death are their clocks (plan §2.2).
    let lenModules = 0;
    if (isSpace) {
      const rows = raw.rows;
      if (!Number.isInteger(rows) || rows < HULL_MODULE_ROWS || rows > 255 * HULL_MODULE_ROWS ||
        rows % HULL_MODULE_ROWS !== 0) {
        fail(context, where, `rows is ${JSON.stringify(rows)}; a space sector runs a ` +
          `multiple of ${HULL_MODULE_ROWS} rows, ${HULL_MODULE_ROWS}..${255 * HULL_MODULE_ROWS}`);
      }
      lenModules = rows / HULL_MODULE_ROWS;
    } else if (raw.rows !== undefined) {
      fail(context, where, `is a ${kindName} sector; its length is the hull traversal, ` +
        "not an authored row count");
    }

    // The archetype mask - R3.
    const names = raw.archetypes ?? [];
    if (!Array.isArray(names)) fail(context, where, "\"archetypes\" must be an array of names");
    let mask = 0;
    for (const name of names) {
      const archetypeIndex = requireName(context, where, "archetypes", name, ARCHETYPE_INDEX);
      // Owner decision 1 (plan §11): per-sector enemy selection is
      // non-capital only. A capital sector's Light and Heavy ceilings are
      // zero, so an archetype there could never be admitted.
      if (kind === SECTOR_KIND.capital) {
        fail(context, where, `is a capital sector and names "${name}"; capital sectors ` +
          "carry no Light and no Heavy in 1.0 (owner decision, plan §11 item 1)");
      }
      // A SWARM sector has no Heavy slot at all (SUBTYPE_CEILING), so a Heavy
      // archetype in its mask is a level that cannot play as it reads.
      if (isSpace && subtype === SECTOR_SUBTYPE.swarm && ARCHETYPE_CLASS[name] === "heavy") {
        fail(context, where, `is a swarm sector and names the Heavy archetype "${name}"; ` +
          "Heavy formations belong to an elite sector");
      }
      mask |= 1 << archetypeIndex;
    }

    // Packed caps - low nibble Light, high nibble Heavy (plan §2.2).
    const lights = requireInteger(context, where, "lights", raw.lights ?? 0,
      0, MAX_REQUESTED_LIGHT);
    const heavies = requireInteger(context, where, "heavies", raw.heavies ?? 0,
      0, MAX_REQUESTED_HEAVY);
    const ceilingKey = isSpace
      ? `space/${Object.keys(SECTOR_SUBTYPE)[subtype]}`
      : kindName;
    const ceiling = SUBTYPE_CEILING[ceilingKey];
    if (lights > ceiling.light) {
      warnings.push(`${context.file} ${where}: asks for ${lights} Lights; a ${ceilingKey} ` +
        `sector admits ${ceiling.light} and the runtime clamps`);
    }
    if (heavies > ceiling.heavy) {
      warnings.push(`${context.file} ${where}: asks for ${heavies} Heavy formations; a ` +
        `${ceilingKey} sector admits ${ceiling.heavy} and the runtime clamps`);
    }

    const hazards = raw.hazards ?? {};
    const debris = requireInteger(context, where, "hazards.debris", hazards.debris ?? 0, 0, 2);
    const debrisStep = requireInteger(context, where, "hazards.debrisStep",
      hazards.debrisStep ?? 0, 0, 15);
    const pickups = requireBoolean(context, where, "hazards.pickups", hazards.pickups, false);
    const broadside = requireBoolean(context, where, "hazards.broadside",
      hazards.broadside, false);

    const look = raw.look ?? {};
    const starColour = requireInteger(context, where, "look.stars", look.stars ?? 0, 0, 15);
    const nebula = requireBoolean(context, where, "look.nebula", look.nebula, false);
    const variant = requireInteger(context, where, "look.variant", look.variant ?? 0, 0, 7);

    const sectorWaves = raw.waves ?? [];
    if (!Array.isArray(sectorWaves)) fail(context, where, "\"waves\" must be an array");
    const waveFirst = waves.length;
    if (waveFirst + sectorWaves.length > MAX_WAVES) {
      fail(context, where, `takes the level past ${MAX_WAVES} waves; the core page holds ` +
        `${MAX_WAVES}`);
    }
    for (const [waveIndex, wave] of sectorWaves.entries()) {
      const waveWhere = `${where} wave ${waveIndex + 1}`;
      const { archetype, escort } = waveMembers(wave, context, waveWhere);
      for (const [role, name] of [["archetype", archetype], ["escort", escort]]) {
        if (name === null) continue;
        const archetypeIndex = requireName(context, waveWhere, role, name, ARCHETYPE_INDEX);
        if ((mask & (1 << archetypeIndex)) === 0) {
          fail(context, waveWhere, `names "${name}", which is outside the sector's ` +
            "archetype mask; every wave must name an archetype the sector allows");
        }
      }
      const waveClass = ARCHETYPE_CLASS[archetype];
      // Roadmap 4.6 step 2. For a HEAVY wave the second member is read at
      // runtime as the LIGHT ESCORT (plan §2.2: wave_member_offset is the
      // escort archetype offset), and encounter_light_admit puts that record
      // into a Light slot. A Heavy record there would be a Heavy archetype
      // driven by the character renderer with no PMG player, which the
      // AGENTS.md class invariant forbids outright - so the file is rejected
      // here rather than mis-rendered at runtime.
      if (waveClass === "heavy" && escort !== null && ARCHETYPE_CLASS[escort] !== "light") {
        fail(context, waveWhere, `is a Heavy wave escorted by "${escort}", which is a ` +
          "Heavy archetype; a Heavy formation's escort is a Light, because PMG players " +
          "P1/P2 are the formation's own (AGENTS.md enemy-class invariant)");
      }
      // A LIGHT wave has no escort at all: its members are admitted one at a
      // time by the window's stepper, which reads one archetype.
      if (waveClass === "light" && escort !== null) {
        fail(context, waveWhere, `is a Light wave naming a second archetype ("${escort}"); ` +
          "an escort belongs to a Heavy formation");
      }
      const row = wave.row;
      if (!Number.isInteger(row) || row < 0 || row > 255 * HULL_MODULE_ROWS ||
        row % HULL_MODULE_ROWS !== 0) {
        fail(context, waveWhere, `row is ${JSON.stringify(row)}; a wave arms on a ` +
          `multiple of ${HULL_MODULE_ROWS} rows, 0..${255 * HULL_MODULE_ROWS}`);
      }
      if (isSpace && row >= lenModules * HULL_MODULE_ROWS) {
        fail(context, waveWhere, `arms at row ${row}, at or past the sector's own ` +
          `${lenModules * HULL_MODULE_ROWS} rows`);
      }
      const count = requireInteger(context, waveWhere, "count", wave.count ?? 1, 1, 255);
      const floor = SPACING_FLOOR[waveClass];
      const spacing = wave.spacing ?? floor;
      if (!Number.isInteger(spacing) || spacing > 255) {
        fail(context, waveWhere, `spacing is ${JSON.stringify(spacing)}; it must be an ` +
          "integer in 0..255 frames");
      }
      if (spacing < floor) {
        fail(context, waveWhere, `asks for ${spacing} frames between members; the ` +
          `${waveClass} class floor is ${floor}`);
      }
      const entry = wave.entry ?? Math.trunc((ENTRY_COLUMN_MIN + ENTRY_COLUMN_MAX) / 2);
      if (!Number.isInteger(entry) || entry < ENTRY_COLUMN_MIN || entry > ENTRY_COLUMN_MAX) {
        fail(context, waveWhere, `entry column is ${JSON.stringify(entry)}; the playfield ` +
          `admits ${ENTRY_COLUMN_MIN}..${ENTRY_COLUMN_MAX}`);
      }
      const appearance = requireInteger(context, waveWhere, "appearance",
        wave.appearance ?? 0, 0, 3);
      const mirror = requireBoolean(context, waveWhere, "mirror", wave.mirror, false);
      const onCleared = requireBoolean(context, waveWhere, "afterCleared",
        wave.afterCleared, false);
      if (wave.path !== undefined) {
        fail(context, waveWhere, "names a path; the path evaluator and its library are " +
          "plan step 6 (docs/plans/director-4.6.md §8)");
      }
      // wave_flags: bits 0-1 appearance slot, bit 2 mirror, bit 3 Heavy class,
      // bits 4-5 trigger mode (0 = on row, 1 = when the previous wave cleared).
      const flags = appearance | (mirror ? 0x04 : 0) |
        (waveClass === "heavy" ? 0x08 : 0) | (onCleared ? 0x10 : 0);
      waves.push({
        sector: index + 1, row, flags, count, spacing, entry, appearance, mirror,
        onCleared, archetype, escort, class: waveClass,
        rowModules: row / HULL_MODULE_ROWS,
        archetypeOffset: ARCHETYPE_INDEX[archetype] * ARCHETYPE_RECORD_BYTES,
        escortOffset: escort === null
          ? NO_ESCORT
          : ARCHETYPE_INDEX[escort] * ARCHETYPE_RECORD_BYTES,
      });
    }

    sectors.push({
      index, kind, kindName, subtype, subtypeName: isSpace ? subtypeName : null,
      lenModules, rows: lenModules * HULL_MODULE_ROWS, mask, archetypes: [...names],
      lights, heavies, effectiveLights: Math.min(lights, ceiling.light),
      effectiveHeavies: Math.min(heavies, ceiling.heavy),
      debris, debrisStep, pickups, broadside, starColour, nebula, variant,
      waveFirst, waveCount: sectorWaves.length,
    });
  }
  return { sectors, waves, bossSectorIndex };
}

export function compileLevel(source, { hullAsset, file = "level.json" } = {}) {
  const context = { file };
  const warnings = [];
  if (typeof source !== "object" || source === null || Array.isArray(source)) {
    fail(context, null, "must be a JSON object");
  }
  const level = requireInteger(context, null, "level", source.level, 1, MAX_LEVEL_NUMBER);
  const seed = requireInteger(context, null, "seed", source.seed ?? 1, 1, 255);
  const stars = requireInteger(context, null, "stars", source.stars ?? 0, 0, 255);
  const nebula = requireInteger(context, null, "nebula", source.nebula ?? 0, 0, 255);
  const bossId = requireInteger(context, null, "boss", source.boss ?? 0, 0, 255);
  const pickupPolicy = requireInteger(context, null, "pickupPolicy",
    source.pickupPolicy ?? 3, 0, 255);
  const debrisDensity = requireInteger(context, null, "debrisDensity",
    source.debrisDensity ?? 0, 0, 255);
  const spacingScale = requireInteger(context, null, "spacingScale",
    source.spacingScale ?? 0, 0, 255);
  const debugStartSector = requireInteger(context, null, "debugStartSector",
    source.debugStartSector ?? 0, 0, MAX_SECTORS - 1);

  const hull = compileHull(source, context);
  const { sectors, waves, bossSectorIndex } = compileSectors(source, context, warnings);
  if (bossId !== 0 && bossSectorIndex < 0) {
    fail(context, null, `names boss ${bossId} but no sector has kind "boss"`);
  }
  if (debugStartSector >= sectors.length) {
    fail(context, null, `debugStartSector is ${debugStartSector}; the level has ` +
      `${sectors.length} sectors`);
  }

  const { page: geometryPage, geometry } = compileGeometryPage(hull, hullAsset, context);

  const core = Buffer.alloc(LEVEL_CORE_BYTES);
  core[0] = LEVEL_CORE_MAGIC;
  core[1] = level;
  core[2] = sectors.length;
  core[3] = waves.length;
  core[4] = seed;
  core[5] = stars;
  core[6] = nebula;
  core[7] = bossId;
  core[8] = hull.length;
  core[9] = pickupPolicy;
  core[10] = debrisDensity;
  core[11] = spacingScale;
  core[12] = debugStartSector;
  for (const sector of sectors) {
    const last = sector.index === sectors.length - 1 ? 0x80 : 0;
    core[SECTOR_ARRAY_OFFSET.kind + sector.index] =
      sector.kind | (sector.subtype << 4) | last;
    core[SECTOR_ARRAY_OFFSET.len + sector.index] = sector.lenModules;
    core[SECTOR_ARRAY_OFFSET.caps + sector.index] = sector.lights | (sector.heavies << 4);
    core[SECTOR_ARRAY_OFFSET.archetypes + sector.index] = sector.mask;
    core[SECTOR_ARRAY_OFFSET.hazards + sector.index] = sector.debris |
      (sector.pickups ? 0x04 : 0) | (sector.broadside ? 0x08 : 0) | (sector.debrisStep << 4);
    core[SECTOR_ARRAY_OFFSET.waveFirst + sector.index] = sector.waveFirst;
    core[SECTOR_ARRAY_OFFSET.waveCount + sector.index] = sector.waveCount;
    core[SECTOR_ARRAY_OFFSET.look + sector.index] = sector.starColour |
      (sector.nebula ? 0x10 : 0) | (sector.variant << 5);
  }
  for (const [index, wave] of waves.entries()) {
    core[WAVE_ARRAY_OFFSET.row + index] = wave.rowModules;
    core[WAVE_ARRAY_OFFSET.flags + index] = wave.flags;
    core[WAVE_ARRAY_OFFSET.archetype + index] = wave.archetypeOffset;
    core[WAVE_ARRAY_OFFSET.path + index] = PATH_ARCHETYPE_DEFAULT;
    core[WAVE_ARRAY_OFFSET.count + index] = wave.count;
    core[WAVE_ARRAY_OFFSET.spacing + index] = wave.spacing;
    core[WAVE_ARRAY_OFFSET.entry + index] = wave.entry;
    core[WAVE_ARRAY_OFFSET.memberOffset + index] = wave.escortOffset;
  }

  // Step 1 emits the payload page zeroed. Its blocks (plan §2.3) are consumed
  // from step 5 (appearances, weapon glyphs, look) and step 6 (paths); the
  // page exists now so that the image layout never changes again.
  const payload = Buffer.alloc(LEVEL_PAYLOAD_BYTES);

  return {
    level, seed, hull, geometry, sectors, waves, warnings, core, payload,
    pages: { core, payload, geometry: geometryPage },
  };
}

let cachedHullAsset = null;
export function defaultHullAsset() {
  if (cachedHullAsset === null) {
    cachedHullAsset = compileCapitalHulls(loadCapitalHullsDefinition(
      path.join(rootDirectory, "assets", "graphics", "capital-hulls.json")));
  }
  return cachedHullAsset;
}

export function compileLevelFile(filePath, { hullAsset = null } = {}) {
  return compileLevel(loadLevelSource(filePath), {
    hullAsset: hullAsset ?? defaultHullAsset(),
    file: path.basename(filePath),
  });
}

// ---------------------------------------------------------------------------
// npm run levels:check
// ---------------------------------------------------------------------------

function main() {
  const files = listLevelSources();
  if (files.length === 0) {
    console.error("no levels in assets/levels/");
    process.exitCode = 1;
    return;
  }
  const hullAsset = defaultHullAsset();
  let failed = 0;
  for (const file of files) {
    const name = path.relative(rootDirectory, file);
    try {
      const compiled = compileLevelFile(file, { hullAsset });
      for (const warning of compiled.warnings) console.warn(`warning  ${warning}`);
      console.log(`ok       ${name}: ${compiled.sectors.length} sectors, ` +
        `${compiled.waves.length} waves, ${compiled.geometry.hullRows}-row hull`);
    } catch (error) {
      if (!(error instanceof LevelValidationError)) throw error;
      console.error(`REJECTED ${name}: ${error.message}`);
      failed += 1;
    }
  }
  if (failed !== 0) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

// ---------------------------------------------------------------------------
// Generated contracts - roadmap 4.6 step 2
//
// The Director reads the core page by absolute offset. Those offsets are
// computed above, from MAX_SECTORS and MAX_WAVES, and they are the ONE place
// the layout is decided: the C reader and the ca65 ABI both take them from
// here through these two generators, so a change to the page layout cannot
// leave a hand-written offset behind in src/.
// ---------------------------------------------------------------------------

const GENERATED_BANNER =
  "; Generated by scripts/level-compiler.mjs - do not edit.\n" +
  "; Roadmap 4.6 step 2: the LevelDef core page contract.\n";

export function renderLevelDefCa65Include() {
  const lines = [GENERATED_BANNER.trimEnd(), ""];
  lines.push(`LEVEL_CORE_ADDRESS = $${LEVEL_CORE_ADDRESS.toString(16).toUpperCase()}`);
  lines.push(`LEVEL_CORE_BYTES = ${LEVEL_CORE_BYTES}`);
  lines.push(`LEVEL_CORE_MAGIC = $${LEVEL_CORE_MAGIC.toString(16).toUpperCase().padStart(2, "0")}`);
  lines.push(`LEVEL_PAYLOAD_ADDRESS = $${LEVEL_PAYLOAD_ADDRESS.toString(16).toUpperCase()}`);
  lines.push(`LEVEL_GEOMETRY_ADDRESS = $${LEVEL_GEOMETRY_ADDRESS.toString(16).toUpperCase()}`);
  // Roadmap 4.6 step 4: the two module sequences the resolvers index.
  for (const [name, offset] of [["ALLIED", GEOMETRY_OFFSET.alliedSequence],
    ["ENEMY", GEOMETRY_OFFSET.enemySequence]]) {
    lines.push(`LEVEL_GEOMETRY_${name}_SEQUENCE = ` +
      `$${(LEVEL_GEOMETRY_ADDRESS + offset).toString(16).toUpperCase()}`);
  }
  lines.push(`LEVEL_GEOMETRY_SEQUENCE_BYTES = ${HULL_SEQUENCE_BYTES}`);
  lines.push("", "; The address of every SoA array the Director declares, so the link can");
  lines.push("; assert that the reader's page and the compiler's page are the same page.");
  lines.push(`LEVEL_CORE_HEADER_ADDRESS = $${LEVEL_CORE_ADDRESS.toString(16).toUpperCase()}`);
  for (const [name, offset] of Object.entries(SECTOR_ARRAY_OFFSET)) {
    lines.push(`LEVEL_CORE_SECTOR_${name.replace(/([A-Z])/g, "_$1").toUpperCase()}_ADDRESS = ` +
      `$${(LEVEL_CORE_ADDRESS + offset).toString(16).toUpperCase()}`);
  }
  for (const [name, offset] of Object.entries(WAVE_ARRAY_OFFSET)) {
    lines.push(`LEVEL_CORE_WAVE_${name.replace(/([A-Z])/g, "_$1").toUpperCase()}_ADDRESS = ` +
      `$${(LEVEL_CORE_ADDRESS + offset).toString(16).toUpperCase()}`);
  }
  return `${lines.join("\n")}\n`;
}

export function renderLevelDefCHeader() {
  const lines = [
    "/* Generated by scripts/level-compiler.mjs - do not edit.",
    " * Roadmap 4.6 step 2 (docs/plans/director-4.6.md §2.2): the LevelDef core",
    " * page's layout, as the compiler lays it out. The Director indexes",
    " * level_core[] by these, so the reader and the writer cannot drift. */",
    "#ifndef VOID_STRIKE_65_LEVEL_DEF_H",
    "#define VOID_STRIKE_65_LEVEL_DEF_H",
    "",
    `#define LEVEL_CORE_MAGIC         0x${LEVEL_CORE_MAGIC.toString(16).padStart(2, "0")}u`,
    `#define LEVEL_CORE_BYTES         ${LEVEL_CORE_BYTES}u`,
    `#define LEVEL_MAX_SECTORS        ${MAX_SECTORS}u`,
    `#define LEVEL_MAX_WAVES          ${MAX_WAVES}u`,
    `#define CORE_HEADER_BYTES        ${CORE_HEADER_BYTES}u`,
    "",
    "/* Header, plan §2.2 */",
    "#define CORE_MAGIC               0u",
    "#define CORE_LEVEL_NUMBER        1u",
    "#define CORE_SECTOR_COUNT        2u",
    "#define CORE_WAVE_COUNT          3u",
    "#define CORE_SEED                4u",
    "#define CORE_STAR_COLOUR         5u",
    "#define CORE_NEBULA              6u",
    "#define CORE_BOSS_ID             7u",
    "#define CORE_HULL_LENGTH_STEP    8u",
    "#define CORE_PICKUP_POLICY       9u",
    "#define CORE_DEBRIS_DENSITY      10u",
    "#define CORE_SPACING_SCALE       11u",
    "#define CORE_DEBUG_START_SECTOR  12u",
    "",
    "/* SectorDef structure of arrays */",
  ];
  for (const [name, offset] of Object.entries(SECTOR_ARRAY_OFFSET)) {
    lines.push(`#define SECTOR_${name.replace(/([A-Z])/g, "_$1").toUpperCase()}_AT`
      .padEnd(33, " ") + `${offset}u`);
  }
  lines.push("", "/* WaveDef structure of arrays */");
  for (const [name, offset] of Object.entries(WAVE_ARRAY_OFFSET)) {
    lines.push(`#define WAVE_${name.replace(/([A-Z])/g, "_$1").toUpperCase()}_AT`
      .padEnd(33, " ") + `${offset}u`);
  }
  // Roadmap 4.6 step 4 (plan §2.4, §8.2): the HullGeometry header the capital
  // phase machine reads. Phase starts are absolute modules on the 480-row
  // coordinate, so DRAIN is module 61 for every length.
  lines.push("", "/* HullGeometry header, plan §2.4 */",
    `#define LEVEL_GEOMETRY_HEADER_BYTES ${GEOMETRY_OFFSET.alliedSequence}u`,
    `#define GEOMETRY_HULL_ROWS_LO    ${GEOMETRY_OFFSET.hullRowsLo}u`,
    ...["AFT", "COMBAT", "FORWARD", "PROW"].map((name, index) =>
      `#define GEOMETRY_PHASE_${name}`.padEnd(33, " ") +
      `${GEOMETRY_OFFSET.phaseStarts + index}u`),
    `#define GEOMETRY_DRAIN_MODULE    ${HULL_SEQUENCE_BYTES + 1}u`);
  lines.push("", "#endif", "");
  return lines.join("\n");
}
