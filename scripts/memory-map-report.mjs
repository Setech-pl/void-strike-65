#!/usr/bin/env node
// Generated memory map (docs/memory-map.md, between the BEGIN/END markers).
//
// Reads the default build's link maps, label files and listings in build/,
// build/manifest.json, the cfg MEMORY areas and the equates of src/main.s (as
// the listing records them), and renders one deterministic Markdown block:
// every claimed range of $0000-$FFFF with its phases, the unclaimed ranges,
// the ranges reused across phases, the reservation tails and overlaps, and
// the contents of every segment over 512 B.
//
//   node scripts/memory-map-report.mjs           rewrite the block in place
//   node scripts/memory-map-report.mjs --check   exit 1 when the block is stale
//
// The curated rows below (machine areas, hand-placed state, phase reuse) name
// symbols, never addresses, wherever the build has a symbol; the build supplies
// every number. A row whose symbol disappears makes the script throw.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildDirectory = path.join(rootDirectory, "build");
export const memoryMapPath = path.join(rootDirectory, "docs", "memory-map.md");
export const BEGIN_MARKER = "<!-- BEGIN GENERATED MEMORY MAP: npm run memory-map -->";
export const END_MARKER = "<!-- END GENERATED MEMORY MAP -->";
export const REGENERATE_COMMAND = "npm run memory-map";

const LISTING_MODULES = [
  ["main.lst", "void-strike-65.map", "main.o", "void-strike-65.lbl"],
  ["encounter-director.lst", "encounter-director.map", "encounter-director-c.o", null],
  ["encounter-director-lifecycle.lst", "encounter-director.map",
    "encounter-director-lifecycle.o", null],
  ["encounter-director-abi.lst", "encounter-director.map", "encounter-director-abi.o",
    "encounter-director.lbl"],
  ["light-kernel.lst", "light-kernel.map", "light-kernel.o", "light-kernel.lbl"],
  ["sector-reader.lst", "sector-reader.map", "sector-reader.o", "sector-reader.lbl"],
  ["level-summary.lst", "level-summary.map", "level-summary.o", "level-summary.lbl"],
  ["integration-glue.lst", "integration-glue.map", "integration-glue.o",
    "integration-glue.lbl"],
  ["capital-player-collision.lst", "capital-player-collision.map",
    "capital-player-collision.o", "capital-player-collision.lbl"],
  ["boss.lst", "boss.map", "boss.o", "boss.lbl"],
  ["boss-c.lst", "boss.map", "boss-c.o", null],
];

// cfg files whose MEMORY areas the default build links as written. light-kernel
// and gameplay-music are rewritten by scripts/build.mjs (their areas are taken
// from the label files below); encounter-director-asm.cfg is the ASM-baseline
// variant only.
const RESERVATION_CFGS = ["atari-boot.cfg", "encounter-director.cfg", "sector-reader.cfg",
  "level-summary.cfg", "integration-glue.cfg", "capital-player-collision.cfg"];
// Areas that are not reservations: the cc65 zero-page declaration (shared by
// several links and equates) and the image areas of the boot file, whose
// addresses are positions in the link image, not RAM.
const NON_RESERVATION_AREAS = new Set(["ZP", "BOOTTAIL", "STARTAIL", "A2KERNELFILE",
  "ENTITYFILE", "BOOT2FILE", "PICKUPFILE", "LIGHTFILE"]);

// Phase vocabulary. Every row carries one or more.
const PHASES = [
  ["boot", "stage 2 / cold start only; dead before the first menu frame"],
  ["splash", "the boot splash hold (inside boot)"],
  ["loader", "the loader screen (inside boot)"],
  ["resident", "published by stage 2, lives until RESET"],
  ["menu", "the frontend screens only"],
  ["session", "from the first START GAME of a session until RESET"],
  ["level", "refilled from the level image at every START GAME"],
  ["overlay", "an overlay slot's current run, restored by the sector reader"],
  ["pause", "while the pause menu is up"],
  ["summary", "while the level-summary screen is up"],
  ["boss-entry", "the boss entry's transition (the WARNING screen and its reads), M5b-S3"],
];

// Every linked segment of the default build: owner and phases. A segment
// without a row here stops the generator - add the row, do not skip it.
const SEGMENTS = {
  ZEROPAGE: ["main: zero-page runtime variables", "resident"],
  BOOT_SPLASH: ["boot splash blob (ADR-003 hold, cassette sound, fade, loader_dli)", "splash"],
  CODE: ["main: resident code", "resident"],
  BOOT_STAGE2: ["stage-2 loader; the resident suffix is unpacked over it", "boot"],
  RODATA: ["main: resident read-only data (its tail is boot-only, see reuse)", "resident"],
  PROJECTILES: ["PairShot pool, burst controllers, fighter explosions, Raider records, menu music voice state", "resident"],
  STARFIELD: ["relocated STARFIELD segment (see contents)", "resident"],
  BROADSIDE: ["relocated BROADSIDE segment (see contents); holds overlay slot A", "resident"],
  ENTITY_STATE: ["entity/effect slots and Encounter Director state", "resident"],
  PICKUP_CODE: ["pickup/collision stream: PMG pickup, publication scaffold, backing resolver, admission helpers", "resident"],
  LIGHT_CODE: ["Light late-publication kernel (tail of the C extension composite)", "resident"],
  HEAVY_CODE: ["Heavy late-publication helper (tail of the C extension composite)", "resident"],
  A2_KERNEL: ["A2 display/ring kernel", "resident"],
  ENTITY_RUN_PAD: ["1-B bss link pad that aligns ENTITY_CODE; nothing writes it", "resident"],
  ENTITY_CODE: ["relocated ENTITY_CODE segment (see contents)", "resident"],
  HYBRID_ASM_ARENA: ["arena: assigned ca65 helpers", "resident"],
  HYBRID_C_ARENA: ["arena: cc65 code (Heavy, recycle, drain)", "resident"],
  HYBRID_C_ARENA_RODATA: ["arena: cc65 read-only data", "resident"],
  HYBRID_LIGHT_SLOTS: ["Light per-slot SoA state", "resident"],
  HYBRID_LIGHT_STATE: ["Light record and render cache", "resident"],
  HYBRID_C_STATE: ["derived Raider profile cache", "resident"],
  HYBRID_ENCOUNTER_STATE: ["Encounter state", "resident"],
  HYBRID_HEAVY_STATE: ["Heavy state", "resident"],
  HYBRID_LIGHT_SCREEN: ["Light published-slot bound", "resident"],
  HYBRID_LIGHT_ROTATE: ["ring-rotate marker", "resident"],
  HYBRID_HEAVY_BREAKUP: ["Heavy break-up deferred bit", "resident"],
  DIRECTOR_SECTOR_STATE: ["Director sector row clock and call holds", "resident"],
  HYBRID_LIGHT_LOOK: ["Light appearance keys", "resident"],
  HYBRID_C_SECTOR: ["cc65 sector functions (the resident window)", "resident"],
  DIRECTOR_C_BSS: ["cc65 Director mailbox and scratch", "resident"],
  DIRECTOR_ABI: ["C/ASM ABI veneer and startup publishers", "resident"],
  DIRECTOR_C_LOW: ["low cc65 Director code", "resident"],
  ENEMY_ARCHETYPE_DATA: ["C EnemyArchetype table", "resident"],
  HYBRID_C_EXT: ["cc65 extension: sector, lifecycle, Light", "resident"],
  DIRECTOR_C_PRE: ["cc65 Director RNG", "resident"],
  DIRECTOR_C_RODATA: ["cc65 Director constants", "resident"],
  DIRECTOR_C_CODE: ["high cc65 Director code", "resident"],
  LEVEL_CORE: ["LevelDef core page (bss inside the level buffer)", "level"],
  LEVEL_GEOMETRY: ["HullGeometry header (bss inside the level buffer)", "level"],
  HYBRID_C_WINDOW: ["Director link's half of the BASIC window", "resident"],
  HYBRID_ASM_WINDOW: ["the boss entry's resident half (M5b-S3), last in the Director link's window half", "resident"],
  LIGHT_KERNEL: ["Light ASM kernel; carries the capital vector table", "resident"],
  READER_ZP: ["sector reader (zp),y pointer", "resident"],
  SECTOR_READER: ["between-levels sector reader, overlay runs, stat hooks", "resident"],
  READER_BSS: ["sector reader state", "resident"],
  LEVEL_SUMMARY: ["level-summary module (read at the first START GAME)", "session"],
  GAMEPLAY_MUSIC: ["gameplay music player (in the level image)", "level"],
  GLUE: ["late-published integration glue", "resident"],
  COLLISION: ["capital-bolt / Player Fighter collision module", "resident"],
  // M5b-S3: the boss overlay link, slot A's run and the once-only install;
  // M5b-S4a-i (Q-B5): slot C and the scratch page in the boss's low-RAM claim.
  BOSS_HEAD: ["boss overlay: head JMP and the capital vector table's boss image", "overlay"],
  BOSS_CODE: ["boss overlay: band, boss DLI, motion, the column map, shot-versus-module, hit feedback, fire, the draw queue, nozzles, drawing, hand-off", "overlay"],
  BOSS_C_CODE: ["boss slot C: the C controller (cover and exposure, stages, tier, defeat, fire countdown, chain, bonus, clock)", "overlay"],
  BOSS_C_RODATA: ["boss slot C: C read-only data", "overlay"],
  // The fortress session (plan §5.15.7): the once-per-entry ASM moved from slot A.
  BOSS_C_ASM: ["boss slot C: the overlay's once-per-entry ASM (boss_prepare)", "overlay"],
  BOSS_C_BSS: ["boss slot C: the controller's state (after its code, never read from disk)", "overlay"],
  BOSS_SCRATCH: ["boss scratch page: the column map, the cell-flash ring, the draw queue, a rebuild's candidates", "overlay"],
  BOSS_BSS: ["boss scratch page: slot A's band, collision, feedback, queue and nozzle state", "overlay"],
  BOSS_INSTALL: ["boss install run at $7810, run once in place per boss entry", "boss-entry"],
  // M5b-S4b (owner decision Q7): slot D in the claim grown to $1FFF.
  BOSS_D_LOOKS: ["boss region look tail (open looks, nozzle phases, hull stops; owner decision E4 (b)): first in slot D, read with its run", "overlay"],
  BOSS_D_CODE: ["boss slot D: the lasers (B2: M1 / M2, the column, the warning, the beam, the hit test) and the boss's shots in the band (QA1)", "overlay"],
  BOSS_D_BSS: ["boss slot D: the lasers' state and the boss shots' band cells (after its code, never read from disk)", "overlay"],
  BOSS_E_CODE: ["boss slot E (M5b-S4b.5): the band flash on a kill or a stage, the capsule from a destroyed module, the laser warning's colour; read at the boss entry over the expanded hull maps, the boss sector only", "overlay"],
  BOSS_E_BSS: ["boss slot E: the warning ramp's state (after its code, never read from disk)", "overlay"],
};

// ---------------------------------------------------------------- readers

function readBuild(name) {
  const file = path.join(buildDirectory, name);
  if (!fs.existsSync(file)) {
    throw new Error(`memory-map: ${path.relative(rootDirectory, file)} is missing; run npm run build`);
  }
  return fs.readFileSync(file, "utf8");
}

function parseMap(name) {
  const text = readBuild(name);
  const modules = new Map();
  const moduleText = text.split("Modules list:")[1].split("Segment list:")[0];
  let current = null;
  for (const line of moduleText.split("\n")) {
    const header = line.match(/^(\S+\.o):/);
    if (header) {
      current = new Map();
      modules.set(header[1], current);
      continue;
    }
    const entry = line.match(/^\s+(\w+)\s+Offs=([0-9A-F]+)\s+Size=([0-9A-F]+)/);
    if (entry && current) {
      current.set(entry[1], { offset: parseInt(entry[2], 16), size: parseInt(entry[3], 16) });
    }
  }
  const segments = [];
  const segmentText = text.split("Segment list:")[1].split("Exports list")[0];
  for (const match of segmentText.matchAll(
    /^(\w+)\s+([0-9A-F]{6})\s+([0-9A-F]{6})\s+([0-9A-F]{6})/gm)) {
    segments.push({ name: match[1], start: parseInt(match[2], 16),
      end: parseInt(match[3], 16), size: parseInt(match[4], 16), map: name });
  }
  return { modules, segments };
}

function parseLabels(name) {
  const labels = new Map();
  for (const line of readBuild(name).split("\n")) {
    const match = line.match(/^al ([0-9A-F]{6}) \.(\S+)$/);
    if (match && !labels.has(match[2])) labels.set(match[2], parseInt(match[1], 16));
  }
  return labels;
}

function parseCfgAreas(name) {
  const text = fs.readFileSync(path.join(rootDirectory, "cfg", name), "utf8")
    .replace(/#.*$/gm, "");
  const memory = text.match(/MEMORY\s*\{([\s\S]*?)\}/)[1];
  const areas = [];
  for (const match of memory.matchAll(
    /(\w+)\s*:\s*start\s*=\s*\$([0-9A-Fa-f]+)\s*,\s*size\s*=\s*\$([0-9A-Fa-f]+)([^;]*);/g)) {
    const start = parseInt(match[2], 16);
    areas.push({ name: match[1], start, end: start + parseInt(match[3], 16) - 1,
      fileless: /file\s*=\s*""/.test(match[4]), cfg: name });
  }
  const segmentsText = text.match(/SEGMENTS\s*\{([\s\S]*?)\}/)[1];
  const placement = new Map();
  for (const match of segmentsText.matchAll(/(\w+)\s*:\s*([^;]*);/g)) {
    const load = match[2].match(/load\s*=\s*(\w+)/);
    const run = match[2].match(/run\s*=\s*(\w+)/);
    placement.set(match[1], (run ?? load)[1]);
  }
  return { areas, placement };
}

// The equates of main.s and everything it includes, from the listing's source
// column (macro bodies skipped), evaluated with + - * / < > and parentheses.
function parseEquates(listingName) {
  const definitions = new Map();
  let macroDepth = 0;
  for (const line of readBuild(listingName).split("\n")) {
    if (!/^[0-9A-F]{6}/.test(line)) continue;
    const source = line.slice(24).replace(/;.*$/, "").trim();
    if (/^\.mac(ro)?\b/i.test(source)) { macroDepth += 1; continue; }
    if (/^\.endmac(ro)?\b/i.test(source)) { macroDepth -= 1; continue; }
    if (macroDepth > 0) continue;
    const match = source.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:?=\s*(.+)$/);
    if (match && !definitions.has(match[1])) definitions.set(match[1], match[2].trim());
  }
  const cache = new Map();
  const evaluate = (name, depth = 0) => {
    if (cache.has(name)) return cache.get(name);
    const expression = definitions.get(name);
    if (expression === undefined || depth > 64) return undefined;
    const tokens = expression.match(/\$[0-9A-Fa-f]+|%[01]+|\d+|[A-Za-z_][A-Za-z0-9_]*|\S/g);
    let index = 0;
    const primary = () => {
      const token = tokens[index++];
      if (token === undefined) throw new Error("end");
      if (token === "(") { const value = sum(); index += 1; return value; }
      if (token === "-") return -primary();
      if (token === "<") return primary() & 0xff;
      if (token === ">") return (primary() >> 8) & 0xff;
      if (token[0] === "$") return parseInt(token.slice(1), 16);
      if (token[0] === "%") return parseInt(token.slice(1), 2);
      if (/^\d/.test(token)) return parseInt(token, 10);
      const value = evaluate(token, depth + 1);
      if (value === undefined) throw new Error(token);
      return value;
    };
    const product = () => {
      let value = primary();
      while (tokens[index] === "*" || tokens[index] === "/") {
        const operator = tokens[index++];
        const right = primary();
        value = operator === "*" ? value * right : Math.trunc(value / right);
      }
      return value;
    };
    const sum = () => {
      let value = product();
      while (tokens[index] === "+" || tokens[index] === "-") {
        const operator = tokens[index++];
        const right = product();
        value = operator === "+" ? value + right : value - right;
      }
      return value;
    };
    let value;
    try {
      value = sum();
      if (index !== tokens.length) value = undefined;
    } catch {
      value = undefined;
    }
    cache.set(name, value);
    return value;
  };
  return evaluate;
}

// Labels of one module's listing, placed by segment: address = segment start +
// the module's offset in it + the listing offset. ca65 sources: global labels
// (cheap @labels and macro bodies skipped), verified against the link's label
// file. cc65 sources: .proc names and top-level data labels (cc65's internal
// Lnnnn labels and everything inside a .proc skipped).
function parseListingLabels(listingName, moduleName, map, labels) {
  const moduleSegments = map.modules.get(moduleName);
  if (!moduleSegments) throw new Error(`memory-map: ${moduleName} is not in ${listingName}'s map`);
  const segmentStart = new Map(map.segments.map((segment) => [segment.name, segment.start]));
  const directives = { ".code": "CODE", ".rodata": "RODATA", ".bss": "BSS",
    ".data": "DATA", ".zeropage": "ZEROPAGE" };
  const items = [];
  let segment = "CODE";
  let macroDepth = 0;
  let procDepth = 0;
  for (const line of readBuild(listingName).split("\n")) {
    const head = line.match(/^([0-9A-F]{6})r?\s/);
    if (!head) continue;
    const source = line.slice(24).replace(/;.*$/, "").trim();
    if (/^\.mac(ro)?\b/i.test(source)) { macroDepth += 1; continue; }
    if (/^\.endmac(ro)?\b/i.test(source)) { macroDepth -= 1; continue; }
    if (macroDepth > 0) continue;
    const segmentMatch = source.match(/^\.segment\s+"(\w+)"/);
    if (segmentMatch) { segment = segmentMatch[1]; continue; }
    if (directives[source.toLowerCase()]) { segment = directives[source.toLowerCase()]; continue; }
    const contribution = moduleSegments.get(segment);
    const offset = parseInt(head[1], 16);
    const proc = source.match(/^\.proc\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (proc) {
      if (procDepth === 0 && contribution) {
        items.push({ name: proc[1], segment,
          address: segmentStart.get(segment) + contribution.offset + offset });
      }
      procDepth += 1;
      continue;
    }
    if (/^\.endproc\b/.test(source)) { procDepth -= 1; continue; }
    if (procDepth > 0) continue;
    const label = source.match(/^([A-Za-z_][A-Za-z0-9_]*):/);
    if (!label || !contribution) continue;
    if (/^L[0-9A-F]{4}$/.test(label[1])) continue;
    const address = segmentStart.get(segment) + contribution.offset + offset;
    if (labels) {
      // ca65 lists false .if branches too; only labels the link kept count.
      if (labels.get(label[1]) !== address) continue;
    }
    items.push({ name: label[1], segment, address });
  }
  return items;
}

// ---------------------------------------------------------------- model

const hex = (value) => `$${value.toString(16).toUpperCase().padStart(4, "0")}`;
const range = (start, end) => (start === end ? `\`${hex(start)}\`` : `\`${hex(start)}-${hex(end)}\``);
const bytes = (value) => `${value.toLocaleString("en-US")} B`;

function loadBuild() {
  const manifest = JSON.parse(readBuild("manifest.json"));
  const maps = new Map();
  for (const name of fs.readdirSync(buildDirectory).filter((file) => file.endsWith(".map")).sort()) {
    maps.set(name, parseMap(name));
  }
  const labels = new Map();
  for (const name of fs.readdirSync(buildDirectory).filter((file) => file.endsWith(".lbl")).sort()) {
    labels.set(name, parseLabels(name));
  }
  const equate = parseEquates("main.lst");
  const segments = [...maps.values()].flatMap((map) => map.segments);
  const cfgs = RESERVATION_CFGS.map((name) => ({ name, ...parseCfgAreas(name) }));
  return { manifest, maps, labels, equate, segments, cfgs };
}

// A symbol's address: a main.s equate, else a label of any link. Throws when
// the build no longer has it, so a curated row cannot outlive its symbol.
function symbolResolver(build) {
  return (name) => {
    const fromEquate = build.equate(name);
    if (fromEquate !== undefined) return fromEquate;
    for (const labels of build.labels.values()) {
      if (labels.has(name)) return labels.get(name);
    }
    throw new Error(`memory-map: symbol ${name} is not in the build; update scripts/memory-map-report.mjs`);
  };
}

function collectRows(build) {
  const sym = symbolResolver(build);
  const m = build.manifest;
  const rows = [];
  const add = (start, end, kind, owner, phases, source) => {
    if (end < start) throw new Error(`memory-map: empty row ${owner}`);
    rows.push({ start, end, kind, owner, phases: phases.split(" "), source });
  };

  // Fixed machine areas.
  add(0x0000, build.cfgs[0].areas.find((area) => area.name === "ZP").start - 1, "machine", "OS zero page (the game's ZP area starts at the cfg's `ZP` start)", "boot resident", "cfg/atari-boot.cfg `ZP`");
  add(0x0100, 0x01ff, "machine", "6502 stack", "boot resident", "6502");
  add(0x0200, 0x03ff, "machine", "OS page 2-3 workspace, shadows and vectors (`VDSLST`, `SDMCTL`, `MEMLO`, SIO `DDEVIC`-`DAUX2`, `BASICF`)", "boot resident", "src/main.s equates");
  add(0xa000, 0xbfff, "machine", "RAM under the BASIC ROM: `disable_basic_rom` forces `PORTB` bit 1 and `BASICF` at every stage-2 entry (a description, not a claim)", "boot resident", "src/main.s, cfg/encounter-director.cfg");
  rows[rows.length - 1].noClaim = true;
  add(0xbc20, 0xbfff, "machine", "OS screen when BASIC is off at coldstart (`RAMTOP $C0`); with BASIC on it sits at `$9C20-$9FFF` instead (MEASURED, *The window at `$A000-$BFFF`*)", "boot resident", "boot smoke snapshots");
  add(0xc000, 0xcfff, "machine", "OS ROM", "boot resident", "65XE");
  add(sym("HPOSP0"), sym("HPOSP0") + 0xff, "machine", "GTIA", "boot resident", "src/main.s `HPOSP0`");
  add(sym("AUDF1"), sym("AUDF1") + 0xff, "machine", "POKEY", "boot resident", "src/main.s `AUDF1`");
  add(sym("STICK0"), sym("STICK0") + 0xff, "machine", "PIA", "boot resident", "src/main.s `STICK0`");
  add(sym("DMACTL"), sym("DMACTL") + 0xff, "machine", "ANTIC", "boot resident", "src/main.s `DMACTL`");
  add(0xd100, 0xd1ff, "machine", "unused I/O page (parallel bus)", "boot resident", "65XE");
  add(0xd500, 0xd7ff, "machine", "cartridge control and unused I/O", "boot resident", "65XE");
  add(0xd800, 0xffff, "machine", "OS ROM (floating point at `$D800-$DFFF`, `SIOV` `$E459`, vectors)", "boot resident", "65XE, src/main.s `SIOV`");

  // Linked segments.
  for (const segment of build.segments) {
    const info = SEGMENTS[segment.name];
    if (!info) {
      throw new Error(`memory-map: segment ${segment.name} (${segment.map}) has no row in SEGMENTS of scripts/memory-map-report.mjs`);
    }
    add(segment.start, segment.end, "segment", `\`${segment.name}\` — ${info[0]}`, info[1], `build/${segment.map}`);
  }

  // Zero-page equates outside any segment.
  add(sym("MUSIC_VOICE_COLUMN"), sym("MUSIC_VOICE_SCRATCH") + 1, "state", "menu music v2 column pointers and publication scratch (equates)", "resident", "src/main.s `MUSIC_VOICE_COLUMN`");
  add(m.levelSummary.statBlock.address, m.levelSummary.statBlock.address + m.levelSummary.statBlock.bytes - 1, "state", "level-summary stat block (`STATS_SHOTS` … `STATS_BONUS`), cleared at every START GAME", "session", "manifest `levelSummary.statBlock`");

  // Display memory and hand-placed resident state.
  const pmg = sym("PMG_BASE");
  add(sym("MISSILES"), pmg + 0x7ff, "state", "PMG DMA: missiles `MISSILES` and players `PLAYER0`-`PLAYER3` (single-line, `PMG_BASE` + `$300`)", "resident", "src/main.s `PMG_BASE`");
  add(sym("SCREEN"), sym("CHARSET") - 1, "state", "screen: HUD prefix, divider, frontend screen RAM", "resident", "src/main.s `SCREEN`");
  add(sym("CHARSET"), sym("CHARSET") + 0x3ff, "state", "gameplay charset", "resident", "src/main.s `CHARSET`");
  add(sym("FRONTEND_CHARSET"), sym("FRONTEND_CHARSET") + 0x3ff, "state", "frontend charset", "resident", "src/main.s `FRONTEND_CHARSET`");
  add(sym("CAPITAL_HULL_RUNTIME_ALLIED"), sym("CAPITAL_HULL_RUNTIME_ENEMY") - 1, "state", "expanded Allied hull map: built at every gameplay start, read by the capital's draw_hull_row; the boss's slot E holds this RAM in the boss sector", "resident", "src/main.s `CAPITAL_HULL_RUNTIME_ALLIED`");
  add(sym("CAPITAL_HULL_RUNTIME_ENEMY"), sym("CAPITAL_HULL_RUNTIME_END") - 1, "state", "expanded Hostile hull map: built at every gameplay start, read by the capital's draw_hull_row; the boss's slot E holds this RAM in the boss sector", "resident", "src/main.s `CAPITAL_HULL_RUNTIME_ENEMY`");
  add(sym("BROAD_STATE_BASE"), sym("BROAD_STATE_END") - 1, "state", "broadside slot state", "resident", "src/main.s `BROAD_STATE_BASE`");
  add(sym("DIFFICULTY_SETTING"), sym("GAMEPLAY_RESIDENT_END") - 1, "state", "difficulty, hull scroll, final-raster bolt tops, flash backing, sector, player lifecycle, capital explosion, engine and Raider state", "resident", "src/main.s `DIFFICULTY_SETTING`");
  add(sym("STAR_RNG_STATE"), sym("STARFIELD_STATE_END") - 1, "state", "star RNG, near-star phase, PAL frame ids", "resident", "src/main.s `STAR_RNG_STATE`");
  add(sym("MUZZLE_ROW_DOMAIN"), sym("SESSION_SCORE_COMPAT_END") - 1, "state", "muzzle row-domain state", "resident", "src/main.s `MUZZLE_ROW_DOMAIN`");
  add(sym("MUSIC_ACTIVE"), sym("MUZZLE_TRACKING_STATE_END") - 1, "state", "music and tracked-muzzle state", "resident", "src/main.s `MUSIC_ACTIVE`");
  add(sym("TOP_SCORE_TABLE"), sym("TOP_SCORE_TABLE_END") - 1, "state", "TOP SCORES table (packed BCD)", "resident", "src/main.s `TOP_SCORE_TABLE`");
  add(sym("ACTIVE_GAMEPLAY_FRAME_LO"), sym("ACTIVE_GAMEPLAY_FRAME_HI"), "state", "16-bit active-gameplay frame counter", "resident", "src/main.s `ACTIVE_GAMEPLAY_FRAME_LO`");
  add(sym("HUD_CHARSET"), sym("HUD_CHARSET") + 0x3ff, "state", "gameplay HUD charset", "resident", "src/main.s `HUD_CHARSET`");
  add(sym("HUD_BOOSTER_BACKING"), sym("CHUNK_FINAL_ADDRESS") - 1, "state", "BOOST HUD-cell backing", "resident", "src/main.s `HUD_BOOSTER_BACKING`");
  add(sym("PLAYFIELD_DLIST_A"), sym("PLAYFIELD_DLIST_B") - 1, "state", "gameplay display list A", "resident", "src/main.s `PLAYFIELD_DLIST_A`");
  add(sym("PLAYFIELD_DLIST_B"), sym("PLAYFIELD_DLIST_END") - 1, "state", "gameplay display list B", "resident", "src/main.s `PLAYFIELD_DLIST_B`");
  add(sym("GAMEPLAY_RING_SCREEN"), sym("GAMEPLAY_RING_SCREEN_END") - 1, "state", "physical gameplay ring, 40 B per row", "resident", "src/main.s `GAMEPLAY_RING_SCREEN`");
  add(sym("PLAYFIELD_ROW_LO"), sym("PLAYFIELD_RING_STATE_END") - 1, "state", "ring row tables and A2 publication state", "resident", "src/main.s `PLAYFIELD_ROW_LO`");
  add(sym("CORRIDOR_BOUNDARY_LEFT"), sym("CORRIDOR_BOUNDARY_LEFT"), "state", "fresh allied boundary cell (row 0 of the retired left boundary cache)", "resident", "src/main.s `CORRIDOR_BOUNDARY_LEFT`");
  add(sym("MUZZLE_BACKING"), sym("MUZZLE_BACKING") + 1, "state", "allied/enemy tracked-muzzle backing", "resident", "src/main.s `MUZZLE_BACKING`");
  add(sym("PREPARED_HULL_ROW"), sym("PREPARED_HULL_LO") - 1, "state", "prepared COMBAT hull row (centre byte `CORRIDOR_BOUNDARY_RIGHT` aliases the fresh enemy boundary cell)", "resident", "src/main.s `PREPARED_HULL_ROW`");
  add(sym("PREPARED_HULL_LO"), sym("PREPARED_HULL_RING_LO"), "state", "prepared-row key", "resident", "src/main.s `PREPARED_HULL_LO`");
  add(sym("CORRIDOR_PHASE_HI"), sym("STAR_NEAR_ROW") - 1, "state", "corridor phase, hull draw row", "resident", "src/main.s `CORRIDOR_PHASE_HI`");
  add(sym("STAR_NEAR_ROW"), sym("STAR_NEAR_STATE_END") - 1, "state", "near-star tables", "resident", "src/main.s `STAR_NEAR_ROW`");
  add(m.sectorReader.levelBuffer.address, m.sectorReader.levelBuffer.address + m.sectorReader.levelBuffer.capacityBytes - 1, "slot", `\`LEVEL_BUFFER\`, ${m.sectorReader.levelBuffer.sectors} sectors: the level image`, "level", "manifest `sectorReader.levelBuffer`");
  add(sym("__DIRECTOR_GUARD_START__"), sym("__DIRECTOR_GUARD_START__") + m.encounterDirector.guard.bytes - 1, "guard", "`DIRECTOR_GUARD`: reserved, no segment", "resident", "cfg/encounter-director.cfg");
  add(sym("__HYBRID_C_WINDOW_GUARD_START__"), sym("__HYBRID_C_WINDOW_GUARD_START__") + 5, "guard", "`HYBRID_C_WINDOW_GUARD` / `READER_GUARD`: reserved, no segment", "resident", "cfg/encounter-director.cfg, cfg/sector-reader.cfg");

  // The level image inside the buffer (per level).
  const buffer = m.sectorReader.levelBuffer.address;
  add(buffer, build.segments.find((segment) => segment.name === "GAMEPLAY_MUSIC").start - 1, "slot", "level image header (byte 7: LevelDef's first sector)", "level", "manifest `capitalHulls.levelBlock`");
  add(m.capitalHulls.levelBlock.blockAddress, m.capitalHulls.levelBlock.blockAddress + m.capitalHulls.levelBlock.blockBytes - 1, "slot", "level hull block (style, packed map, codebook, glyphs, collision boundaries)", "level", "manifest `capitalHulls.levelBlock`");
  add(m.levelDef.payload.blockAddress, m.levelDef.payload.blockAddress + m.levelDef.payload.blockBytes - 1, "slot", "LevelDef payload page", "level", "manifest `levelDef.payload`");
  const levelBytes = Math.max(...m.sectorReader.levels.map((level) => level.bytes));
  add(m.levelDef.geometry.blockAddress, buffer + levelBytes - 1, "slot", "HullGeometry page (after its linked 8-B header)", "level", "manifest `levelDef.geometry`, `sectorReader.levels`");

  // Overlay slot A, the capital vector table, the summary module's region.
  add(m.overlays.slotA.address, m.overlays.slotA.endExclusive - 1, "slot", `overlay slot A (\`${m.overlays.slotA.firstRoutine}\` onward; run \`${m.overlays.runs[0].name}\`)`, "overlay", "manifest `overlays.slotA`");
  add(m.overlays.capitalVectors.address, m.overlays.capitalVectors.address + m.overlays.capitalVectors.bytes - 1, "slot", `capital vector table, ${m.overlays.capitalVectors.entries} entries (inside \`LIGHT_KERNEL\`)`, "resident", "manifest `overlays.capitalVectors`");
  add(m.levelSummary.code.address, m.levelSummary.code.endExclusive - 1, "slot", "level-summary claim (owner decision 2026-10-03): no other link, cfg area or boot range may reach it", "session", "manifest `levelSummary.code`, tests/level-summary-build.test.mjs");
  // M5b-S4a-i (owner answer Q-B5): the boss's claim and its three homes.
  add(m.boss.claim.start, m.boss.claim.endExclusive - 1, "slot", "boss claim (owner answers Q-B5, Q7): the region charset, slot C, the scratch page, slot D - the boss sector only; no other link, cfg area or boot range may reach it", "overlay", "manifest `boss.claim`, tests/boss-claim.test.mjs");
  add(m.boss.charset.address, m.boss.charset.address + m.boss.charset.capacityBytes - 1, "slot", "boss region charset (CHBASE `$0C` under the band), read at every boss entry; codes 0-6 the divider's, copied by the install", "overlay", "manifest `boss.charset`");
  add(m.boss.slotC.address, m.boss.slotC.address + m.boss.slotC.capacityBytes - 1, "slot", `boss slot C: the C controller, run \`boss-slot-c\` (${m.boss.slotC.sectors} sectors)`, "overlay", "manifest `boss.slotC`");
  add(m.boss.scratch.address, m.boss.scratch.address + m.boss.scratch.capacityBytes - 1, "slot", "boss scratch page: the column map, the ring, slot A's state; set by the install", "overlay", "manifest `boss.scratch`");
  add(m.boss.slotD.address, m.boss.slotD.address + m.boss.slotD.capacityBytes - 1, "slot", `boss slot D: the lasers and the boss's shots in the band, run \`boss-slot-d\` (${m.boss.slotD.sectors} sectors)`, "overlay", "manifest `boss.slotD`");
  // M5b-S4b.5 (owner decision 2026-10-07): slot E over the expanded hull maps.
  add(m.boss.slotE.address, m.boss.slotE.address + m.boss.slotE.capacityBytes - 1, "slot", `boss slot E: read at the boss entry over the expanded hull maps (the capital's, rebuilt at every gameplay start), the boss sector only; run \`boss-slot-e\` (${m.boss.slotE.sectors} sectors)`, "overlay", "manifest `boss.slotE`, cfg/boss.cfg");
  add(m.pause.screenBackupAddress, m.pause.screenBackupAddress + m.pause.screenBackupBytes - 1, "transient", "pause-screen backup (`PAUSE_SCREEN_BACKUP`)", "pause", "manifest `pause`");
  add(m.levelSummary.art.staging, m.levelSummary.art.staging + Math.max(...m.levelSummary.art.runs.map((run) => run.bytes)) - 1, "transient", "summary art run (largest region run) read for the summary screen", "summary", "manifest `levelSummary.art`");
  add(m.levelSummary.saveRecord.buffer, m.levelSummary.saveRecord.buffer + m.levelSummary.saveRecord.bytes - 1, "transient", "save-record sector buffer", "summary", "manifest `levelSummary.saveRecord`");

  // Boot: the initial block, the loader, staging and record landings.
  const t = m.transportCapacity;
  add(m.loadAddress, m.loadAddress + t.initialBootContentBytes - 1, "transient", `initial boot block image, ${t.initialBootSectors} sectors (code, data and packed sources)`, "boot", "manifest `transportCapacity`");
  add(m.bootPayloadTrailer.address, m.bootPayloadTrailer.address + m.bootPayloadTrailer.bytes - 1, "transient", `boot payload trailer \`${m.bootPayloadTrailer.ascii}\``, "boot", "manifest `bootPayloadTrailer`");
  add(t.bootSplash.transportAddress, t.bootSplash.transportAddress + t.bootSplash.bytes - 1, "transient", "boot splash blob in the initial block, copied to `$0500`", "boot", "manifest `transportCapacity.bootSplash`");
  for (const stream of m.starfieldRuntime.streams) {
    add(stream.packedSourceAddress, stream.packedSourceAddress + stream.packedBytes - 1, "transient", `packed STARFIELD stream ${stream.id}`, "boot", "manifest `starfieldRuntime.streams`");
    add(stream.stagingAddress, stream.stagedEndExclusive - 1, "transient", `STARFIELD stream ${stream.id} staging`, "boot", "manifest `starfieldRuntime.streams`");
  }
  add(m.entityEffects.packedSourceAddress, m.entityEffects.packedSourceAddress + m.entityEffects.packedBytes - 1, "transient", "packed ENTITY_CODE source", "boot", "manifest `entityEffects`");
  add(m.entityEffects.stagedSourceAddress, m.entityEffects.stagedEndAddress, "transient", "ENTITY_CODE packed source after its backward staging copy", "boot", "manifest `entityEffects`");
  add(m.a2Kernel.sourceAddress, m.a2Kernel.sourceAddress + m.a2Kernel.bytes - 1, "transient", "A2 kernel image in the initial block", "boot", "manifest `a2Kernel`");
  add(m.a2Kernel.stagingAddress, m.a2Kernel.stagingAddress + m.a2Kernel.bytes - 1, "transient", "A2 kernel staging (`BOOT_A2_STAGING`)", "boot", "manifest `a2Kernel`");
  add(sym("WEAPON_PICKUP_COLD_STAGING"), sym("WEAPON_PICKUP_COLD_STAGING") + m.residentCapacity.pickupRecordPackedBytes.combined - 1, "transient", "packed pickup/collision + window streams held in the frontend charset", "boot", "src/main.s `WEAPON_PICKUP_COLD_STAGING`, manifest `residentCapacity.pickupRecordPackedBytes`");
  add(sym("loader_bitmap_lzss"), sym("loader_bitmap_lzss_end") - 1, "transient", "packed loader bitmap (in `RODATA`)", "boot", "build/void-strike-65.lbl");
  add(sym("LOADER_DISPLAY_LIST_ADDRESS"), sym("LOADER_DISPLAY_LIST_ADDRESS") + 201, "transient", "expanded loader display list (202 B)", "loader", "src/main.s `LOADER_DISPLAY_LIST_ADDRESS`");
  const loader = m.loaderScreen;
  add(loader.bitmapAddress, loader.bitmapAddress + loader.secondLmsLine * loader.bytesPerRow - 1, "transient", `loader bitmap lines 0-${loader.secondLmsLine - 1}`, "loader", "manifest `loaderScreen`");
  add(loader.secondLmsAddress, loader.secondLmsAddress + (loader.height - loader.secondLmsLine) * loader.bytesPerRow - 1, "transient", `loader bitmap lines ${loader.secondLmsLine}-${loader.height - 1} (second LMS)`, "loader", "manifest `loaderScreen`");
  add(m.residentRuntime.stagingAddress, m.encounterDirector.coldRecordRelocation.mergedRecord.packedResidentStagingEndExclusive - 1, "transient", "packed resident-suffix staging (`PACKED_RESIDENT_STAGING`)", "boot", "manifest `residentRuntime`, `coldRecordRelocation.mergedRecord`");
  const maxTransport = Math.max(...t.manifest.parsed.records.map((record) => record.sectorCount * 128));
  add(sym("CHUNK_STAGING_ADDRESS"), sym("CHUNK_STAGING_ADDRESS") + maxTransport - 1, "transient", "DFMC record sector staging (largest record)", "boot", "manifest `transportCapacity.manifest`");
  add(m.integrationGlue.holdingAddress, m.integrationGlue.holdingAddress + m.integrationGlue.bytes - 1, "transient", "GLUE hold until `layout_d_publish_glue`", "boot", "manifest `integrationGlue.holdingAddress`");
  const abiRecord = m.encounterDirector.coldRecordRelocation.abiRecord;
  add(abiRecord.address, abiRecord.endExclusive - 1, "transient", "ABI record landing (`DIRECTOR_ABI_STAGING`)", "boot", "manifest `coldRecordRelocation.abiRecord`");
  const merged = m.encounterDirector.coldRecordRelocation.mergedRecord;
  add(merged.address, merged.endExclusive - 1, "transient", "merged low-C/GLUE record landing", "boot", "manifest `coldRecordRelocation.mergedRecord`");
  const extension = m.directorCodeRuntimes.find((runtime) => runtime.name === "extension");
  add(extension.transportAddress, extension.transportAddress + extension.packedBytes - 1, "transient", "packed C extension record landing (`HYBRID_C_EXT_STAGING`)", "boot", "manifest `directorCodeRuntimes`");
  const pickup = t.manifest.parsed.records.find((record) => record.finalDestination === sym("WEAPON_PICKUP_PACKED_STAGING"));
  add(pickup.finalDestination, pickup.finalDestination + pickup.rawLength - 1, "transient", "pickup/collision + window record landing (`WEAPON_PICKUP_PACKED_STAGING`)", "boot", "manifest DFMC records");
  return rows;
}

function collectReservations(build) {
  const reservations = [];
  for (const cfg of build.cfgs) {
    for (const area of cfg.areas) {
      if (NON_RESERVATION_AREAS.has(area.name)) continue;
      const segments = [...cfg.placement].filter(([, areaName]) => areaName === area.name)
        .map(([segment]) => segment);
      reservations.push({ ...area, segments });
    }
  }
  // The two areas scripts/build.mjs rewrites, from their links' own labels.
  const music = build.labels.get("gameplay-music.lbl");
  const musicStart = build.segments.find((segment) => segment.name === "GAMEPLAY_MUSIC").start;
  reservations.push({ name: "GAMEPLAY_MUSIC_RAM", start: musicStart,
    end: musicStart + music.get("__GAMEPLAY_MUSIC_RAM_SIZE__") - 1, cfg: "gameplay-music.cfg (rewritten by build.mjs)",
    segments: ["GAMEPLAY_MUSIC"] });
  return reservations;
}

// Free tail of each reservation: from the last byte its own segments use to the
// area's end, clipped at the first byte any other row claims.
const BOOT_PHASES = new Set(["boot", "splash", "loader"]);
const bootOnly = (row) => row.phases.every((phase) => BOOT_PHASES.has(phase));

// Free tail of each reservation: from the last byte its own segments use to the
// area's end, stopping at the first byte another row claims outside boot.
// Boot-only areas (stage 2, the splash) have no runtime tail.
function reservationTails(build, rows, reservations) {
  const segmentsByName = new Map(build.segments.map((segment) => [segment.name, segment]));
  const tails = [];
  for (const area of reservations) {
    const own = area.segments.map((name) => segmentsByName.get(name)).filter(Boolean);
    // Segments the build appends into the same composite (LIGHT_CODE and
    // HEAVY_CODE run at the end of HYBRID_C_EXT_RAM, LIGHT_KERNEL in the window).
    for (const segment of build.segments) {
      if (!own.includes(segment) && segment.start >= area.start && segment.end <= area.end &&
          ["LIGHT_CODE", "HEAVY_CODE", "LIGHT_KERNEL"].includes(segment.name)) own.push(segment);
    }
    if (own.length === 0) continue;
    if (own.every((segment) => BOOT_PHASES.has(SEGMENTS[segment.name][1]))) continue;
    const used = Math.max(...own.map((segment) => segment.end));
    const ownNames = own.map((segment) => `\`${segment.name}\``);
    const foreign = rows.filter((row) => !row.noClaim && !bootOnly(row) &&
      !ownNames.some((name) => row.owner.startsWith(name)) &&
      !(row.start <= area.start && row.end >= area.end));
    let end = used;
    while (end < area.end && !foreign.some((row) => row.start <= end + 1 && row.end >= end + 1)) end += 1;
    if (end > used) {
      tails.push({ area, start: used + 1, end,
        segments: own.sort((left, right) => left.start - right.start).map((segment) => segment.name) });
    }
  }
  return tails.sort((left, right) => left.start - right.start);
}

// Every cfg overlap that is there on purpose (M5b-S3 brief): ld65 cannot see an
// overlap between two areas, so an accidental one is invisible until something
// lands on it. tests/cfg-overlaps.test.mjs fails on any overlap not named here
// and on any entry here that no longer matches one.
export const DECLARED_CFG_OVERLAPS = Object.freeze([
  { areas: ["LEVEL_SUMMARY_RAM", "SPLASH_RAM"], name: "summary over the splash",
    reason: "the level-summary module is read into the boot splash's RAM after the splash hold ends (owner decision 2026-10-03)" },
  { areas: ["MAIN", "BOOT2_RAM"], name: "stage 2 inside MAIN",
    reason: "stage 2 runs inside MAIN until the resident suffix is unpacked over it" },
  { areas: ["ENTITY_STATE_RAM", "DIRECTOR_BSS"], name: "Director state in the entity page",
    reason: "the Director's twelve state bytes $80F4-$80FF are the top of the entity-state page, read by ASM by address" },
  { areas: ["A2KERNEL_RAM", "ENTITY_CODE_RAM"], name: "A2 kernel page",
    reason: "A2_KERNEL owns $9000-$90FF; ENTITY_CODE_RAM starts on the same page and ENTITY_RUN_PAD aligns ENTITY_CODE past it" },
  { areas: ["ENTITY_CODE_RAM", "DIRECTOR_C_PRE_RAM"], name: "Director RNG in the entity run",
    reason: "the Director's pre-code is linked into the tail of ENTITY_CODE_RAM that ENTITY_CODE does not reach" },
  { areas: ["ENTITY_CODE_RAM", "DIRECTOR_RAM"], name: "Director in the entity run",
    reason: "the Director's high code is linked into the tail of ENTITY_CODE_RAM that ENTITY_CODE does not reach" },
  { areas: ["ENTITY_CODE_RAM", "DIRECTOR_GUARD"], name: "Director guard",
    reason: "the six guard bytes below $A000 close the Director link inside ENTITY_CODE_RAM's last page" },
  { areas: ["LEVEL_BUFFER_RAM", "GAMEPLAY_MUSIC_RAM"], name: "music in the level image",
    reason: "the gameplay music player is linked to run inside the level image it travels in" },
  { areas: ["LEVEL_BUFFER_RAM", "LEVEL_CORE_RAM"], name: "LevelDef core page",
    reason: "the Director's LevelDef core arrays are link-time symbols over the level buffer, filled by the sector reader" },
  { areas: ["LEVEL_BUFFER_RAM", "LEVEL_GEOMETRY_RAM"], name: "HullGeometry header",
    reason: "the HullGeometry header is a link-time symbol over the level buffer, filled by the sector reader" },
  { areas: ["HYBRID_C_WINDOW_GUARD", "READER_GUARD"], name: "one window guard",
    reason: "the same six guard bytes at $BC1A are declared by both links that share the window" },
  { areas: ["BOSS_SLOT_E_RAM", "CAPITAL_HULL_MAPS_RAM"], name: "boss slot E over the hull maps",
    reason: "M5b-S4b.5 (owner decision 2026-10-07): slot E is read over the expanded hull maps at the boss entry and lives in the boss sector only; only the capital's draw_hull_row reads the maps, and every gameplay start rebuilds them (start_gameplay -> publish_level_hull_style) before any capital row; the trace checks it at every draw" },
  { areas: ["BOSS_SLOT_RAM", "BROADSIDE_RAM"], name: "boss in overlay slot A",
    reason: "M5b-S3: the boss overlay is read over slot A, the capital group's 2,048 B inside BROADSIDE; START GAME's restore run puts the capital code back" },
]);

// The overlaps between cfg memory areas, from the cfg files alone: the areas the
// default build links as written, plus gameplay-music.cfg (build.mjs rewrites
// only its start, to the same address).
export function cfgAreaOverlaps() {
  const reservations = [];
  // M5b-S3: boss.cfg too - its areas lie over slot A and the staging RAM by
  // design, which is exactly what must be declared, by name, to pass.
  for (const name of [...RESERVATION_CFGS, "gameplay-music.cfg", "boss.cfg"]) {
    for (const area of parseCfgAreas(name).areas) {
      if (!NON_RESERVATION_AREAS.has(area.name)) reservations.push(area);
    }
  }
  return reservationOverlaps(reservations);
}

const declaredOverlapName = (overlap) => DECLARED_CFG_OVERLAPS.find((entry) =>
  entry.areas.includes(overlap.a.name) && entry.areas.includes(overlap.b.name))?.name;

function reservationOverlaps(reservations) {
  const overlaps = [];
  const sorted = [...reservations].sort((left, right) => left.start - right.start || left.name.localeCompare(right.name));
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const a = sorted[i];
      const b = sorted[j];
      const start = Math.max(a.start, b.start);
      const end = Math.min(a.end, b.end);
      if (start <= end) overlaps.push({ a, b, start, end });
    }
  }
  return overlaps;
}

// Measured-free evidence: ranges the repository shows by runtime measurement
// that nothing writes. Add a row only with a committed measurement.
const MEASURED_FREE = [
  { start: 0x0700, end: 0x1fff,
    evidence: "[diagnostics/low-ram-0700-1fff-2026-10-03.md](diagnostics/low-ram-0700-1fff-2026-10-03.md): Atari800, pattern written at `start`, 0 of 6,400 B changed over menu, three games and GAME OVER, BASIC on and off; EMULATOR only" },
];

// Contiguous ranges of addresses for which keep(address) holds, split at the
// measured-evidence boundaries.
function ranges(keep) {
  const gaps = [];
  for (let address = 0; address < 0x10000;) {
    if (!keep(address)) { address += 1; continue; }
    let end = address;
    while (end + 1 < 0x10000 && keep(end + 1)) end += 1;
    const cuts = [address];
    for (const evidence of MEASURED_FREE) {
      if (evidence.start > address && evidence.start <= end) cuts.push(evidence.start);
      if (evidence.end + 1 > address && evidence.end + 1 <= end) cuts.push(evidence.end + 1);
    }
    cuts.sort((left, right) => left - right);
    cuts.forEach((start, index) => {
      const stop = index + 1 < cuts.length ? cuts[index + 1] - 1 : end;
      const evidence = MEASURED_FREE.find((entry) => entry.start <= start && entry.end >= stop);
      gaps.push({ start, end: stop, evidence });
    });
    address = end + 1;
  }
  return gaps;
}

// claimed[a]: 0 nothing, 1 boot-only rows, 2 a runtime row or a reservation.
function claimMap(rows) {
  const claimed = new Uint8Array(0x10000);
  for (const row of rows) {
    if (row.noClaim) continue;
    const level = bootOnly(row) ? 1 : 2;
    for (let address = row.start; address <= row.end; address += 1) {
      if (claimed[address] < level) claimed[address] = level;
    }
  }
  return claimed;
}

// Windows whose bytes change owner between phases.
function reuseWindows(build) {
  const sym = symbolResolver(build);
  const m = build.manifest;
  return [
    ["the boot splash RAM / the summary module", m.transportCapacity.bootSplash.runAddress, m.levelSummary.code.endExclusive - 1],
    ["the boss's low-RAM claim (charset, slot C, scratch, slot D)", m.boss.claim.start, m.boss.claim.endExclusive - 1],
    ["the initial block over `MAIN` (stage 2 and its suffix)", m.loadAddress, sym("PMG_BASE") - 1],
    ["the PMG window", sym("PMG_BASE"), sym("PMG_BASE") + 0x7ff],
    ["the screen, charsets and hull maps under the loader bitmap", m.loaderScreen.bitmapAddress, m.loaderScreen.secondLmsAddress + (m.loaderScreen.height - m.loaderScreen.secondLmsLine) * m.loaderScreen.bytesPerRow - 1],
    ["the pause / summary / staging window", m.pause.screenBackupAddress, m.encounterDirector.coldRecordRelocation.abiRecord.endExclusive - 1],
    ["boot staging over the high resident runtime", sym("CHUNK_STAGING_ADDRESS"), m.encounterDirector.coldRecordRelocation.mergedRecord.endExclusive - 1],
    ["overlay slot A inside `BROADSIDE`", m.overlays.slotA.address, m.overlays.slotA.endExclusive - 1],
    ["the level buffer", m.sectorReader.levelBuffer.address, m.sectorReader.levelBuffer.address + m.sectorReader.levelBuffer.capacityBytes - 1],
  ];
}

// ---------------------------------------------------------------- contents

// Topic of a label, by name; first match wins. A heuristic, stated as one.
const TOPICS = [
  ["padding and slack", /slack|_pad$|_pad_|compat_pad|padding/i],
  ["level summary", /summary|stats?_|grade|best_|save_record|accuracy/i],
  ["capital ship", /capital|broad|hull|muzzle|shell|turret|launch|flash|engine|prow|explosion_row/i],
  ["music and audio", /music|sound|audio|sfx|pitch|instrument|voice|tone|cassette/i],
  ["starfield", /star(?!t)|twinkle|corridor/i],
  ["frontend and HUD", /frontend|menu|option|score|game_over|title|hud|screen_data|marker|digit|pause|difficulty|exit|ended/i],
  ["Light enemies", /light/i],
  ["Heavy, Raider and Interceptor", /heavy|raider|interceptor|enemy|bomber|hostile|archetype|formation/i],
  ["player, input and weapons", /player|input|joystick|pairshot|shot|projectile|weapon|fire|burst|bolt|spread|rapid|missile/i],
  ["pickups and boosters", /pickup|capsule|boost|shield/i],
  ["debris and effects", /debris|effect|explo|breakup|entity/i],
  ["boot, loader and transport", /boot|loader|splash|stage2|unpack|lzss|chunk|(^|_)sio(_|$)|reader|transport|copy|disk|overlay|manifest|crc|failure/i],
  ["display, PMG and raster", /dlist|display|pmg|dli|vbi|raster|ring|playfield|charset|glyph|wsync|scroll/i],
  ["Director, sectors and waves", /director|sector|wave|level|lifecycle|admission|spawn|rng/i],
];
// What each segment's name promises; a segment is flagged when those topics
// hold less than half of its bytes. Placement names (CODE, HYBRID_C_*, ...) are
// not judged.
const NAME_PROMISES = {
  STARFIELD: ["starfield"],
  BROADSIDE: ["capital ship"],
  ENTITY_CODE: ["debris and effects", "pickups and boosters", "player, input and weapons"],
  PICKUP_CODE: ["pickups and boosters"],
  BOOT_STAGE2: ["boot, loader and transport"],
  LIGHT_KERNEL: ["Light enemies"],
  SECTOR_READER: ["boot, loader and transport", "Director, sectors and waves"],
  LEVEL_SUMMARY: ["level summary"],
};

function topicOf(name) {
  return (TOPICS.find(([, pattern]) => pattern.test(name)) ?? ["unclassified"])[0];
}

function segmentContents(build) {
  const items = [];
  for (const [listing, mapName, moduleName, labelFile] of LISTING_MODULES) {
    const map = build.maps.get(mapName);
    const found = parseListingLabels(listing, moduleName, map,
      labelFile ? build.labels.get(labelFile) : null).map((item) => ({ ...item, map: mapName, module: moduleName }));
    items.push(...found);
    // ca65 lists a macro call, not the labels its expansion defines (the menu
    // music data is one). For a single-module link, a lower-case label of the
    // link's .lbl that lies inside exactly one of its segments belongs there.
    if (!labelFile || map.modules.size !== 1) continue;
    const seen = new Set(found.map((item) => item.name));
    for (const [name, address] of build.labels.get(labelFile)) {
      if (seen.has(name) || name.startsWith("__") || name.startsWith("@") || !/[a-z]/.test(name)) continue;
      const owners = map.segments.filter((segment) => address >= segment.start && address <= segment.end);
      if (owners.length !== 1) continue;
      items.push({ name, segment: owners[0].name, address, map: mapName, module: moduleName });
    }
  }
  const result = [];
  for (const segment of build.segments.filter((entry) => entry.size > 512)) {
    const map = build.maps.get(segment.map);
    const entries = [];
    for (const [moduleName, contributions] of map.modules) {
      const contribution = contributions.get(segment.name);
      if (!contribution || contribution.size === 0) continue;
      const start = segment.start + contribution.offset;
      const end = start + contribution.size;
      const points = items.filter((item) => item.map === segment.map && item.module === moduleName &&
        item.segment === segment.name && item.address >= start && item.address < end);
      const byAddress = new Map();
      for (const point of points) {
        if (!byAddress.has(point.address)) byAddress.set(point.address, []);
        const names = byAddress.get(point.address);
        if (!names.includes(point.name)) names.push(point.name);
      }
      const addresses = [...byAddress.keys()].sort((left, right) => left - right);
      if (addresses.length === 0 || addresses[0] > start) {
        entries.push({ address: start, size: (addresses[0] ?? end) - start, names: [`(unlabelled head of ${moduleName})`] });
      }
      addresses.forEach((address, index) => {
        const next = index + 1 < addresses.length ? addresses[index + 1] : end;
        // An end marker shares its address with the next item; name by the
        // item that starts there.
        const names = byAddress.get(address);
        const primary = names.filter((name) => !/_end$/i.test(name));
        entries.push({ address, size: next - address,
          names: primary.length ? primary : [`(after ${names.join(" / ")})`] });
      });
    }
    const labelled = entries.filter((entry) => entry.size > 0);
    const shares = new Map();
    for (const entry of labelled) {
      const topic = topicOf(entry.names.join(" "));
      shares.set(topic, (shares.get(topic) ?? 0) + entry.size);
    }
    result.push({ segment, entries: labelled, shares });
  }
  return result;
}

// ---------------------------------------------------------------- render

const ROW_KIND_ORDER = { machine: 0, slot: 1, segment: 2, state: 3, guard: 4, reserved: 5, transient: 6 };
const size = (row) => row.end - row.start + 1;
const total = (list) => list.reduce((sum, row) => sum + size(row), 0);

export function renderBlock() {
  const build = loadBuild();
  const rows = collectRows(build);
  const reservations = collectReservations(build);
  const tails = reservationTails(build, rows, reservations);
  const overlaps = reservationOverlaps(reservations);
  for (const tail of tails) {
    rows.push({ start: tail.start, end: tail.end, kind: "reserved",
      owner: `free tail of \`${tail.area.name}\``, phases: [SEGMENTS[tail.segments[0]][1]], source: `cfg/${tail.area.cfg.split(" ")[0]}` });
  }
  const claimed = claimMap(rows);
  const gaps = ranges((address) => claimed[address] === 0);
  const afterBoot = ranges((address) => claimed[address] === 1);
  const contents = segmentContents(build);
  const out = [];
  const line = (text = "") => out.push(text);

  line(BEGIN_MARKER);
  line();
  line("## Generated map — from the build");
  line();
  line(`Generated by \`scripts/memory-map-report.mjs\` from \`build/*.map\`, \`build/*.lbl\`, \`build/*.lst\`, \`build/manifest.json\`, \`cfg/*.cfg\` and the equates of \`src/main.s\`. **Do not edit by hand**: run \`${REGENERATE_COMMAND}\` after a build; \`tests/memory-map-generated.test.mjs\` fails when this block does not match the build. Where the hand-written sections below disagree with this block, this block is right.`);
  line();
  line("Ranges are inclusive. Rows overlap where bytes change owner between phases; overlapping rows are never additive free memory. Physical use, reservation tails and unclaimed space are reported in separate tables.");
  line();
  line("### Phases");
  line();
  line("| Phase | Meaning |");
  line("| --- | --- |");
  const used = new Set(rows.flatMap((row) => row.phases));
  for (const [phase, meaning] of PHASES.filter(([phase]) => used.has(phase))) {
    line(`| \`${phase}\` | ${meaning} |`);
  }
  line();
  line("### Address map `$0000-$FFFF`");
  line();
  line("| Range | Size | Kind | Owner | Phases | Source |");
  line("| --- | ---: | --- | --- | --- | --- |");
  const sorted = [...rows, ...gaps.map((gap) => ({ ...gap, kind: "unclaimed",
    owner: gap.evidence ? "**unclaimed — measured-free**" : "**unclaimed — not measured**", phases: ["—"], source: "—" }))]
    .sort((left, right) => left.start - right.start || right.end - left.end ||
      (ROW_KIND_ORDER[left.kind] ?? 9) - (ROW_KIND_ORDER[right.kind] ?? 9) || left.owner.localeCompare(right.owner));
  for (const row of sorted) {
    line(`| ${range(row.start, row.end)} | ${bytes(size(row))} | ${row.kind} | ${row.owner} | ${row.phases.map((phase) => (phase === "—" ? phase : `\`${phase}\``)).join(" ")} | ${row.source} |`);
  }
  line();
  line("### Unclaimed ranges");
  line();
  line("No linked segment, cfg reservation, equate block, manifest range or machine area claims these bytes. **Unclaimed is not safe**: only a measured-free range has runtime evidence that nothing writes it.");
  line();
  line("| Range | Size | Status | Evidence |");
  line("| --- | ---: | --- | --- |");
  for (const gap of gaps) {
    line(`| ${range(gap.start, gap.end)} | ${bytes(size(gap))} | ${gap.evidence ? "measured-free" : "not measured"} | ${gap.evidence ? gap.evidence.evidence : "none in the repository"} |`);
  }
  line();
  line(`Total: ${bytes(total(gaps))} unclaimed, of which ${bytes(total(gaps.filter((gap) => gap.evidence)))} measured-free.`);
  line();
  line("### Free after boot");
  line();
  line("Bytes only boot-phase rows (`boot`, `splash`, `loader`) use: no runtime row and no reservation claims them once stage 2 has handed over. Reusable at runtime by something that does not run during boot; not measured unless the evidence column says so.");
  line();
  line("| Range | Size | Used during boot by | Inside cfg area | Evidence |");
  line("| --- | ---: | --- | --- | --- |");
  for (const free of afterBoot) {
    const users = rows.filter((row) => !row.noClaim && bootOnly(row) && row.start <= free.end && row.end >= free.start)
      .sort((left, right) => left.start - right.start || left.owner.localeCompare(right.owner))
      .map((row) => row.owner);
    const areas = reservations.filter((area) => area.start <= free.start && area.end >= free.end)
      .map((area) => `\`${area.name}\``);
    line(`| ${range(free.start, free.end)} | ${bytes(size(free))} | ${users.join("; ")} | ${areas.join(", ") || "none"} | ${free.evidence ? free.evidence.evidence : "not measured"} |`);
  }
  line();
  line(`Total: ${bytes(total(afterBoot))} free after boot.`);
  line();
  line("### Reservation free tails");
  line();
  line("Bytes a cfg area reserves past its own segments, up to the next byte another row claims outside boot. Reserved, therefore neither unclaimed nor free after boot; the figure is what that owner can still grow into.");
  line();
  line("| Range | Size | Area | Segments in it |");
  line("| --- | ---: | --- | --- |");
  for (const tail of tails) {
    line(`| ${range(tail.start, tail.end)} | ${bytes(tail.end - tail.start + 1)} | \`${tail.area.name}\` (${tail.area.cfg}) | ${tail.segments.map((name) => `\`${name}\``).join(", ")} |`);
  }
  line();
  line("### Overlapping cfg areas");
  line();
  line("ld65 does not report overlaps between separate memory areas or separate links. Every overlap the cfg files declare, with the name `DECLARED_CFG_OVERLAPS` gives it; `tests/cfg-overlaps.test.mjs` fails on an undeclared one:");
  line();
  line("| Range | Size | Area | Area | Declared as |");
  line("| --- | ---: | --- | --- | --- |");
  for (const overlap of overlaps) {
    line(`| ${range(overlap.start, overlap.end)} | ${bytes(overlap.end - overlap.start + 1)} | \`${overlap.a.name}\` ${range(overlap.a.start, overlap.a.end)} (${overlap.a.cfg}) | \`${overlap.b.name}\` ${range(overlap.b.start, overlap.b.end)} (${overlap.b.cfg}) | ${declaredOverlapName(overlap) ?? "**undeclared**"} |`);
  }
  line();
  line("### Ranges reused across phases");
  line();
  for (const [title, start, end] of reuseWindows(build)) {
    line(`**${range(start, end)} — ${title}**`);
    line();
    line("| Range | Phases | Occupant |");
    line("| --- | --- | --- |");
    const inside = rows.filter((row) => row.kind !== "machine" && row.start <= end && row.end >= start)
      .sort((left, right) => left.start - right.start || right.end - left.end || left.owner.localeCompare(right.owner));
    for (const row of inside) {
      line(`| ${range(Math.max(row.start, start), Math.min(row.end, end))} | ${row.phases.map((phase) => `\`${phase}\``).join(" ")} | ${row.owner} |`);
    }
    line();
  }
  line("### Segment contents (segments over 512 B)");
  line();
  line("Items are label spans from the listings, placed with the link map's per-module offsets (ca65 global labels checked against the link's `.lbl`; cc65 `.proc` names, so static C functions count). Every item of 1% of the segment or more is listed; the rest are summed. Topics are a keyword heuristic over the label names, first match wins.");
  line();
  for (const { segment, entries, shares } of contents) {
    line(`#### \`${segment.name}\` ${range(segment.start, segment.end)}, ${bytes(segment.size)} (build/${segment.map})`);
    line();
    line("| Item | Address | Size | Share | Topic |");
    line("| --- | --- | ---: | ---: | --- |");
    const ordered = [...entries].sort((left, right) => right.size - left.size || left.address - right.address);
    const listed = ordered.filter((entry) => entry.size * 100 >= segment.size);
    const rest = ordered.filter((entry) => entry.size * 100 < segment.size);
    for (const entry of listed) {
      line(`| ${entry.names.map((name) => (name.startsWith("(") ? name : `\`${name}\``)).join(" / ")} | \`${hex(entry.address)}\` | ${bytes(entry.size)} | ${(100 * entry.size / segment.size).toFixed(1)}% | ${topicOf(entry.names.join(" "))} |`);
    }
    if (rest.length) {
      const restBytes = rest.reduce((sum, entry) => sum + entry.size, 0);
      line(`| ${rest.length} smaller item${rest.length === 1 ? "" : "s"} | — | ${bytes(restBytes)} | ${(100 * restBytes / segment.size).toFixed(1)}% | — |`);
    }
    line();
    const topics = [...shares].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
    line(`By topic: ${topics.map(([topic, size]) => `${topic} ${(100 * size / segment.size).toFixed(0)}%`).join(", ")}.`);
    line();
  }
  line("### Segment names against their contents");
  line();
  line("| Segment | Size | Name promises | Share of those topics | Dominant topic | Verdict |");
  line("| --- | ---: | --- | ---: | --- | --- |");
  for (const { segment, shares } of contents) {
    const topics = [...shares].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
    const promises = NAME_PROMISES[segment.name];
    const dominant = `${topics[0][0]} (${(100 * topics[0][1] / segment.size).toFixed(0)}%)`;
    if (!promises) {
      line(`| \`${segment.name}\` | ${bytes(segment.size)} | placement name | — | ${dominant} | not judged |`);
      continue;
    }
    const kept = promises.reduce((sum, topic) => sum + (shares.get(topic) ?? 0), 0);
    const share = kept / segment.size;
    line(`| \`${segment.name}\` | ${bytes(segment.size)} | ${promises.join(", ")} | ${(100 * share).toFixed(0)}% | ${dominant} | ${share < 0.5 ? "**misleading name**" : "fits"} |`);
  }
  line();
  line("Nothing is renamed by this report; a rename is a source change with its own session.");
  line();
  line(END_MARKER);
  return out.join("\n");
}

export function spliceBlock(document, block) {
  const begin = document.indexOf(BEGIN_MARKER);
  const end = document.indexOf(END_MARKER);
  if (begin < 0 || end < 0 || end < begin) {
    throw new Error(`memory-map: ${path.relative(rootDirectory, memoryMapPath)} lacks the BEGIN/END markers`);
  }
  return document.slice(0, begin) + block + document.slice(end + END_MARKER.length);
}

export function currentBlock(document) {
  const begin = document.indexOf(BEGIN_MARKER);
  const end = document.indexOf(END_MARKER);
  if (begin < 0 || end < 0) return null;
  return document.slice(begin, end + END_MARKER.length);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const block = renderBlock();
  const document = fs.readFileSync(memoryMapPath, "utf8");
  if (process.argv.includes("--check")) {
    if (currentBlock(document) !== block) {
      console.error(`docs/memory-map.md: the generated block is stale; run ${REGENERATE_COMMAND}`);
      process.exit(1);
    }
    console.log("docs/memory-map.md: the generated block matches the build");
  } else {
    fs.writeFileSync(memoryMapPath, spliceBlock(document, block));
    console.log("docs/memory-map.md: generated block written");
  }
}
