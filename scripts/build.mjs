import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { shareDir, toolchain } from "romdev-toolchain-cc65";
import { makeAtr, makeXexSegments, validateBuildDirectory } from "./formats.mjs";
import {
  buildDfmcV1Transport,
  chunkLoaderConstants,
  deterministicCapacityBytes,
  parseChunkManifest,
} from "./chunk-loader.mjs";
import {
  compileLoaderBitmap,
  loadLoaderBitmapDefinition,
  renderLoaderCa65Include,
  renderLoaderDisplayListCa65Include,
} from "./loader-assets.mjs";
import {
  compileCapitalHulls,
  loadCapitalHullsDefinition,
  renderCapitalHullsCa65Include,
} from "./capital-hulls.mjs";
import {
  compileEnemyRoster,
  loadEnemyRosterDefinition,
  renderEnemyRosterCa65Include,
} from "./enemy-roster.mjs";
import {
  compileFighterWeapons,
  loadFighterWeaponsDefinition,
  renderFighterWeaponsCa65Include,
} from "./fighter-weapons.mjs";
import {
  compileStarfield,
  loadStarfieldDefinition,
  renderStarfieldCa65Include,
} from "./starfield.mjs";
import {
  compileMenuMusic,
  loadMenuMusicDefinition,
  renderMenuMusicCa65Include,
} from "./menu-music.mjs";
import {
  compileGameplayMusic,
  loadGameplayMusicDefinition,
  renderGameplayMusicCa65Include,
} from "./gameplay-music.mjs";
import {
  compileEntityEffects,
  loadEntityEffectsDefinition,
  renderEntityEffectsCa65Include,
} from "./entity-effects.mjs";
import {
  compileFrontendH31,
  loadFrontendH31Definition,
  renderFrontendH31Ca65Include,
} from "./frontend-h31-assets.mjs";
import { packBroadsideLzss, unpackBroadsideLzss } from "./broadside-lzss.mjs";
import { measureRuntimeCycles } from "./runtime-cycles.mjs";
import {
  runtimeArtifactSet,
  runtimeEvidencePhase,
  validateRuntimeEvidenceBinding,
} from "./runtime-evidence.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const buildDirectory = path.join(rootDirectory, "build");
const distDirectory = path.join(rootDirectory, "dist");
const packageDefinition = JSON.parse(fs.readFileSync(path.join(rootDirectory, "package.json"), "utf8"));
const gameVersion = packageDefinition.version;
const quiet = process.argv.includes("--quiet");
const candidateBuild = runtimeEvidencePhase(process.argv) === "candidate";
const asmDirectorBaseline = process.argv.includes("--asm-director");
const skipRuntimeMeasurement = process.argv.includes("--skip-runtime-measurement");
const twoPmgRaiderPrototype = process.argv.includes("--two-pmg-raiders");
const enemyReviewHarness = process.argv.includes("--enemy-review");
const enemyCombatReviewHarness = process.argv.includes("--enemy-combat-review");
const enemyPaletteArgument = process.argv.find((argument) => argument.startsWith("--enemy-palette="));
const enemyPaletteSlug = enemyPaletteArgument?.slice("--enemy-palette=".length);
const enemyPaletteIds = new Map([
  ["hostile-oxblood", "HOSTILE_OXBLOOD"],
  ["hostile-burgundy", "HOSTILE_BURGUNDY"],
  ["hostile-scarlet", "HOSTILE_SCARLET"],
]);
if (enemyPaletteSlug && !enemyPaletteIds.has(enemyPaletteSlug)) {
  throw new Error(`Unknown enemy palette build ${enemyPaletteSlug}`);
}
const isReviewVariant = enemyReviewHarness || enemyCombatReviewHarness || Boolean(enemyPaletteSlug);
const acceptedMenuMusicPayloadBytes = 14314;
// Gameplay music plus its in-game pause controls remain a bounded post-menu feature.
const runtimeHeadroomPayloadLimit = 1536;
const acceptedRuntimeHeadroomPayloadBytes = 15759;
const entityEffectsFoundationPayloadBudget = 1024;
const entityEffectsFoundationPayloadLimit =
  acceptedRuntimeHeadroomPayloadBytes + entityEffectsFoundationPayloadBudget;
const debrisVisualPolishPayloadLimitBytes = 16384;
const bootPayloadTrailer = Buffer.from([0x44, 0x46, 0x42, 0x31]); // "DFB1"
const minimumRuntimeCompactionReserveBytes = 1024;
const acceptedRuntimeCompactionReserveBytes = 1097;
const minimumWeaponPickupReserveBytes = 512;
const residentRuntimeSuffixAddressExpected = 0x21c1;
const packedResidentStagingAddress = 0x8100;
const entityPackedStagingAddress = 0x5318;
// The pickup/collision stream now starts with the LIGHT_RESIDENT kernel.
const weaponPickupRuntimeAddress = 0x8776;
const weaponPickupPackedStagingAddress = 0x8c80;
const weaponPickupPackedStagingEndAddress = 0x917d;
const weaponPickupPackedCapacityBytes =
  weaponPickupPackedStagingEndAddress - weaponPickupPackedStagingAddress;
// Reusable resident capacity (step 4.3): the former boot-only GLUE hold, after
// the near-star records ending at $8601 and before the C scratch BSS at $86FA.
const residentWindowAddress = 0x8602;
const residentWindowBytes = 0x86fa - residentWindowAddress;
// Roadmap 4.5M-M1: the boot-only GLUE hold moved from $8300 to the start of the
// consumed resident staging interval so that starfield stream B can use the
// contiguous idle range behind it ($81FA-$8601).
const glueHoldingAddress = 0x8100;
// Owner decision B (2026-09-20): the RAM under the BASIC ROM. PORTB bit 1 is
// forced at every stage-2 entry, so $A000-$BFFF is unconditionally RAM; with
// BASIC off at coldstart the OS screen sits at $BC20-$BFFF, so the usable
// window is $A000-$BC1F = 7,200 B. The top six bytes ($BC1A-$BC1F) are the
// reserved guard, in the same shape as the $9FFA Director guard.
const basicWindowAddress = 0xa000;
const basicWindowGuardAddress = 0xbc1a;
// Roadmap 4.3 window layout, as owner decision X (2026-09-21) divides it: the
// reader owns $A000-$A5FF, the level buffer $A600-$B5FF (32 sectors of 128 B)
// and the reader BSS $BC00-$BC19; the Director link owns $B600-$BBFF as
// HYBRID_C_WINDOW; the six-byte window guard at $BC1A stays untouched.
// cfg/sector-reader.cfg and cfg/encounter-director.cfg are the other halves of
// this contract.
const sectorReaderAddress = 0xa000;
const levelBufferAddress = 0xa600;
const sectorReaderCapacityBytes = levelBufferAddress - sectorReaderAddress;
const levelBufferSectors = 32;
const levelBufferCapacityBytes = levelBufferSectors * 128;
const hybridWindowAddress = levelBufferAddress + levelBufferCapacityBytes;
const hybridWindowEndExclusive = 0xbc00;
const hybridWindowCapacityBytes = hybridWindowEndExclusive - hybridWindowAddress;
const LEVEL_FORMAT_VERSION = 1;
const LEVEL_MAX_ID = 16;
// The fixed base sector every level run is placed from. It is deliberately a
// constant and not a function of the transport: the reader's directory holds
// absolute sector numbers, so letting them follow the transport size would
// make the reader's data depend on its own record's length.
const levelBaseSector = 320;
const levelOneSectors = 2;
const basicWindowEndExclusive = 0xbc20;
// Roadmap 4.5M-M2 cold-record relocation. The ABI cold record lands directly
// after A2 staging inside the entity-state page ($8018-$808C; consumed by
// publish_director_abi before init_entity_effects clears $8000-$80FF). The
// low-C image (full $F8 reservation) and the GLUE image (the Heavy window tail
// is retired by 4.5M-M3) travel as ONE LZ record that lands at coldLowGlueRecordAddress, above the
// packed resident staging (checked against the measured packed size) and below
// the direct-landing DIRECTOR_C_PRE record at $9D5E; ENTITY_CODE expands over it
// afterwards, so every consumer runs before unpack_entity_runtime.
const bootA2StagingAddress = 0x7f2b;
const abiColdRecordAddress = 0x8018;
const entityStatePageEndExclusive = 0x8100;
const coldLowGlueRecordAddress = 0x9b40;
const directorPreRunAddress = 0x9d5e;
const lowCodeReservationBytes = 0xf8;
// Roadmap 4.5M-M3: HYBRID_C_ARENA, one contiguous reusable runtime arena for
// cc65 code, cc65 read-only data and assigned ca65 helpers. It replaces the
// temporary 243-B HYBRID_C_HEAVY window ($7E12-$7F04) and its 44-B transport
// tail in the merged cold record. Its linked image (used bytes, at least the
// ca65 anchor) is its own DFMC record whose final destination is the arena
// itself: no hold, no publish copy. It ends before the A2 display lists.
const hybridArenaAddress = 0x7bd0;
const hybridArenaEndExclusive = 0x7f10;
const hybridArenaCapacityBytes = hybridArenaEndExclusive - hybridArenaAddress;
const a2DisplayListAddress = 0x7f10;
const debrisVisualPolishEntityCodeBaselineBytes = 564;
const debrisVisualPolishEntityCodeBudgetBytes = 512;
const runtimeHeadroomHistoricalWallGate = 31568;
const entityEffectsBaselineWallCycles = 31440;
const entityEffectsBaselinePhysicalHeadroom = 4128;
const entityEffectsApprovedWallDelta = 600;
const entityEffectsFeatureWallLimit = 32040;
const entityEffectsFeatureMinimumHeadroom = 3528;
const debrisVisualPolishBaselineWallCycles = 32025;
const debrisVisualPolishBaselineHeadroomCycles = 3543;
const debrisVisualPolishApprovedWallDelta = 256;
const debrisVisualPolishWallLimit = 32281;
const debrisVisualPolishMinimumHeadroom = 3287;
const explosionFlashBaselineWallCycles = 32081;
const explosionFlashBaselineHeadroomCycles = 3487;
const explosionFlashApprovedWallDelta = 64;
const explosionFlashWallLimit = 32145;
const explosionFlashAbsoluteMinimumHeadroom = 3200;
const destructibleDebrisBaselineWallCycles = 32122;
const destructibleDebrisBaselineHeadroomCycles = 3446;
const destructibleDebrisTargetDeltaCycles = 640;
const destructibleDebrisHardDeltaCycles = 768;
const destructibleDebrisMinimumHeadroomCycles = 2800;
const destructibleDebrisEntityCodeBaselineBytes = 714;
const destructibleDebrisEntityCodeBudgetBytes = 768;
const destructibleDebrisRuntimeCodeBaselineBytes = 13697;
const destructibleDebrisRuntimeCodeBudgetBytes = 768;
const enemyBreakupBaselineWallCycles = 32719;
const enemyBreakupBaselineHeadroomCycles = 2849;
const enemyBreakupTargetDeltaCycles = 128;
const enemyBreakupHardDeltaCycles = 224;
const enemyBreakupMinimumHeadroomCycles = 2600;
const enemyBreakupRuntimeCodeBaselineBytes = 14184;
const enemyBreakupRuntimeCodeBudgetBytes = 512;
const runtimePayloadCompactionBaselineLinkedBytes = 14192;
const runtimePayloadCompactionBaselineEntityCodeBytes = 725;
const runtimePayloadCompactionBaselinePackedEntityBytes = 651;
const weaponPickupRapidFireBaselineRuntimeCodeBytes = 14316;
const weaponPickupRapidFireBaselineWallCycles = 32869;
const weaponPickupRapidFireTargetDeltaCycles = 128;
const weaponPickupRapidFireHardDeltaCycles = 256;
const weaponPickupRapidFireMinimumHeadroomCycles = 2400;
const spreadShotBaselineRuntimeCodeBytes = 14948;
const spreadShotBaselineEntityFeatureBytes = 1444;
const spreadShotTargetRuntimeDeltaBytes = 320;
const spreadShotHardRuntimeDeltaBytes = 448;
const spreadShotBaselineWallCycles = 32040;
const spreadShotTargetDeltaCycles = 200;
const spreadShotHardDeltaCycles = 500;
const spreadShotMinimumHeadroomCycles = 3028;
const shieldBoosterBaselineRuntimeCodeBytes = 15346;
const shieldBoosterBaselineEntityFeatureBytes = 1869;
const shieldBoosterHardRuntimeDeltaBytes = 512;
const shieldBoosterBaselineWallCycles = 32072;
const shieldBoosterTargetDeltaCycles = 350;
const shieldBoosterHardDeltaCycles = 496;
const shieldBoosterMinimumHeadroomCycles = 3000;
const frontendH31BaselineRuntimeCodeBytes = shieldBoosterBaselineRuntimeCodeBytes;
const frontendH31BaselineEntityFeatureBytes = shieldBoosterBaselineEntityFeatureBytes;
const frontendH31HardRuntimeDeltaBytes = 1280;
const broadsideRuntimeReservedBytes = 0x1a00;
// Roadmap 4.5M-M1: the packed STARFIELD travels as two independent LZ-10/5
// streams. Stream A is staged in the consumed extension cold source below the
// GLUE cold record ($7810-$7BCF); stream B in idle boot RAM behind the GLUE
// hold ($81FA-$85B9, inside the idle range to $8601). Each stream is moved by
// one exact 960-B resident pause-screen copy (the table-driven boot copier is
// stage-2 overlay code and is gone by then), so each must pack to <= 960 B; the
// total is gated separately (below) so the larger windows grant no content.
const starfieldStagingStreams = Object.freeze([
  Object.freeze({ id: "A", address: 0x7810, capacityBytes: 0x3c0, idleWindowEndExclusive: 0x7bd0 }),
  Object.freeze({ id: "B", address: 0x81fa, capacityBytes: 0x3c0, idleWindowEndExclusive: 0x8602 }),
]);
const starfieldStagingAddress = starfieldStagingStreams[0].address;
const starfieldStagingBytes = starfieldStagingStreams.reduce(
  (sum, { capacityBytes }) => sum + capacityBytes, 0);
// Superseded single-stream gates (kept for the record): reviewed correction
// gate 1,798 B (open owner decision, 1,805 B measured) and hard staging limit
// 1,819 B ($7810-$7F2A). The two-stream representation adds split overhead, so
// the reviewed total gates carry the identical content headroom on top of the
// measured 4.5M-M1 total rather than the sum of the staging windows.
const starfieldSingleStreamCorrectionGateBytes = 0x706;
const starfieldSingleStreamHardStagingBytes = 0x71b;
const starfieldSingleStreamPackedBytesAtSwap = 1805;
const starfieldPackedTotalBaselineBytes = 1811;
const starfieldPackedTotalCorrectionGateBytes = starfieldPackedTotalBaselineBytes -
  (starfieldSingleStreamPackedBytesAtSwap - starfieldSingleStreamCorrectionGateBytes);
const starfieldPackedTotalHardGateBytes = starfieldPackedTotalBaselineBytes +
  (starfieldSingleStreamHardStagingBytes - starfieldSingleStreamPackedBytesAtSwap);
const encounterDirectorEnabled = true;
const glueStagingAddress = coldLowGlueRecordAddress + lowCodeReservationBytes;
const glueFinalAddress = 0x4efe;
const directorRunAddress = 0x9d75;
const directorGuardAddress = 0x9ffa;
// White-only stars and one-cell PairShots retain the same loader implementation.
// The two-Heavy raster repair adds one 40-byte departing-row helper to A2.
const expectedInitialContentBytes = 13165;
const expectedLinkedRuntimeBytes = 17549;
const expectedDirectorRawBytes = 644;
const expectedDirectorPackedBytes = 587;
const expectedGlueRawBytes = 250;
const expectedGluePackedBytes = 245;
const capitalPlayerCollisionAddress = 0x8b67;

function ensureDirectory(fsApi, directory) {
  const parts = directory.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current += `/${part}`;
    try {
      fsApi.mkdir(current);
    } catch (error) {
      if (error?.errno !== 20) {
        throw error;
      }
    }
  }
}

async function runWasmTool(name, inputFiles, args, outputFiles) {
  const definition = toolchain[name];
  if (!definition) {
    throw new Error(`Unknown cc65 tool: ${name}`);
  }

  const factory = (await import(pathToFileURL(definition.gluePath).href)).default;
  const logLines = [];
  const module = await factory({
    noInitialRun: true,
    print: (line) => logLines.push(String(line)),
    printErr: (line) => logLines.push(String(line)),
  });

  for (const [virtualPath, bytes] of Object.entries(inputFiles)) {
    ensureDirectory(module.FS, path.posix.dirname(virtualPath));
    module.FS.writeFile(virtualPath, bytes);
  }

  for (const virtualPath of outputFiles) {
    ensureDirectory(module.FS, path.posix.dirname(virtualPath));
  }

  const status = module.callMain(args);
  if (status !== 0) {
    throw new Error(`${name} failed with status ${status}\n${logLines.join("\n")}`);
  }

  const outputs = {};
  for (const virtualPath of outputFiles) {
    try {
      outputs[virtualPath] = Buffer.from(module.FS.readFile(virtualPath));
    } catch (error) {
      throw new Error(`${name} did not create ${virtualPath}\n${logLines.join("\n")}`, { cause: error });
    }
  }

  return { outputs, log: logLines.join("\n") };
}

function parseViceLabels(labelText) {
  const labels = new Map();
  for (const line of labelText.split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match) {
      labels.set(match[2], Number.parseInt(match[1], 16));
    }
  }
  return labels;
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function parseLinkSegmentSize(mapText, name) {
  const match = new RegExp(
    `^${name}\\s+[0-9A-F]+\\s+[0-9A-F]+\\s+([0-9A-F]+)`,
    "mi",
  ).exec(mapText);
  return match ? Number.parseInt(match[1], 16) : undefined;
}

function writeFile(targetPath, bytes) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, bytes);
}

// Roadmap 4.3 plan §4 [C5]: the reader links on its own, so the main-link
// entry points it calls reach it as generated equates - the direction
// director-abi.inc and integration-abi.inc already run. Generated after main
// links and assembled into the reader, so a moved routine is a build error
// rather than a jump into whatever now lives at the old address.
const SECTOR_READER_MAIN_SYMBOLS = Object.freeze([
  ["render_frontend_data", "draws a frontend record list through frontend_data_ptr"],
  ["wait_frame_start", "returns just after VCOUNT leaves zero"],
  ["pause_silence_audio", "zeroes AUDCTL and the audio channels"],
  ["clear_pmg_graphics_latches", "clears the PMG latches and stores NMIEN = 0"],
  ["clear_pmg", "clears player/missile memory"],
  ["clear_screen", "clears SCREEN"],
  ["frontend_text_display_list", "ANTIC 2, 24 rows, LMS SCREEN, no DLI"],
  ["start_gameplay", "the boundary the reader hands control to on success"],
  ["quit_gameplay_to_menu", "teardown to the main menu, used by the failure screen"],
  ["frontend_data_ptr", "zero-page source pointer read by render_frontend_data"],
]);

// Light multiplicity step 1b (plan §3.1 [C1]): the Light ASM kernel is its own
// link after main, in the shape roadmap 4.3 proved for the sector reader. These
// are every main-link symbol it touches - 13 call targets and 12 data symbols -
// and they are generated from the linked main image, so a moved routine is a
// build error rather than a jump into whatever now lives at the old address.
const LIGHT_KERNEL_MAIN_SYMBOLS = Object.freeze([
  ["entity_effects_update", "the effects tick the Light update runs first"],
  ["entity_debris_publish", "debris, published below the Light in the late window"],
  ["erase_fighter_projectile_overlays", "PairShot erase; the Light erase follows it"],
  ["entity_player_fighter_projectile_target", "the debris/Raider target the shot scan defers to"],
  ["resolve_effect_backing_below_player_pairshot", "render capture chain"],
  ["resolve_effect_backing_below_interactive_debris", "render capture chain"],
  ["resolve_effect_backing_below_transient_effect", "render capture chain"],
  ["clear_transient_effects", "breakup precondition"],
  ["spawn_breakup_effects_at", "breakup feedback at the Light's cell"],
  ["apply_player_damage", "the shared player damage gate"],
  ["light_add_score", "BROADSIDE pad, absolute,X by archetype offset"],
  ["update_score_display", "score publication"],
  ["play_hit_sound", "kill feedback"],
  ["light_glyph", "Wingman then Interceptor art, ENTITY_CODE tail"],
  ["dst_ptr", "zero-page destination pointer the publish loop uses"],
  ["PLAYFIELD_ROW_LO", "ring row address table, low bytes"],
  ["PLAYFIELD_ROW_HI", "ring row address table, high bytes"],
  ["player_x", "player position, contact test"],
  ["player_y", "player position, contact test"],
  ["FIGHTER_PROJECTILE_ACTIVE", "shared PairShot pool"],
  ["FIGHTER_PROJECTILE_LIFETIME", "shared PairShot pool"],
  ["FIGHTER_PROJECTILE_X", "shared PairShot pool"],
  ["FIGHTER_PROJECTILE_Y", "shared PairShot pool"],
  ["FIGHTER_PROJECTILE_PREV_Y", "shared PairShot pool"],
  ["hud_booster_backing", "the STARFIELD neighbour the old resolver was bounded against"],
  // Pure main.s constants. ca65 emits an `=` constant into the label file only
  // when it is exported, so main.s exports these nine for the kernel; that also
  // makes a renamed or deleted constant a build error here.
  ["CHARSET", "glyph bank base"],
  ["CH_SPACE", "blank cell"],
  ["PLAYER_LIFECYCLE", "DYING / GAME OVER are odd"],
  ["PLAYER_HEALTH_UNITS", "full player damage on contact"],
  ["PLAYER_COLLISION_LAST_ROW", "contact test, vertical wrap bound"],
  ["PLAYER_VISIBLE_WIDTH_HPOS", "contact test, horizontal wrap bound"],
  ["WEAPON_PICKUP_GLYPH_BASE", "the retired pickup bank the Light codes reuse"],
  ["FIGHTER_PROJECTILE_FREE", "empty PairShot slot"],
  ["FIGHTER_PROJECTILE_INTERCEPTOR", "hostile owner bits"],
  ["FIGHTER_PROJECTILE_INTERCEPTOR_EMITTER_MASK", "leader-slot attribution mask"],
  ["FIGHTER_PROJECTILE_WEAPON_CLASS_SHIFT", "weapon_class shift above the owner bits"],
]);

// The kernel's five entry points, in the frozen order of its vector table. Each
// is three bytes; main.s reaches them by constant, exactly as it reaches the
// sector reader at $A000.
const LIGHT_KERNEL_VECTORS = Object.freeze([
  ["LIGHT_KERNEL_PUBLISH", "light_publish: PairShot erase, Light erase, debris, Light render"],
  ["LIGHT_KERNEL_UPDATE", "light_update: effects tick, C tick, emission, install, contact"],
  ["LIGHT_KERNEL_SHOT", "light_shot: player PairShot scan, X = projectile slot"],
  ["LIGHT_KERNEL_BACKING", "light_backing: debris resolver then the Light resolver"],
  ["LIGHT_KERNEL_CELL_RESOLVE", "light_cell_resolve_sanitized: near-star sanitise then resolve"],
]);

function renderLightKernelMainAbiInclude(labels) {
  const lines = [
    "; Generated by scripts/build.mjs for Light multiplicity step 1b - do not edit.",
    "; Main-link symbols the Light ASM kernel touches. The kernel is its own link",
    "; (plan §3.1 [C1]); these are its only dependencies on main.s.",
    "",
  ];
  for (const [name, note] of LIGHT_KERNEL_MAIN_SYMBOLS) {
    const address = labels.get(name);
    if (!Number.isInteger(address)) {
      throw new Error(`4.6: main.s no longer exports ${name}, which the Light kernel uses`);
    }
    lines.push(`${name.padEnd(46)} = $${address.toString(16).toUpperCase().padStart(4, "0")}` +
      `   ; ${note}`);
  }
  return `${lines.join("\n")}\n`;
}

function renderSectorReaderMainAbiInclude(labels) {
  const lines = [
    "; Generated by scripts/build.mjs for roadmap 4.3 - do not edit.",
    "; Main-link entry points the sector reader calls. The reader is its own",
    "; link (plan 4 [C5]); these are its only dependencies on main.s.",
    "",
  ];
  for (const [name, note] of SECTOR_READER_MAIN_SYMBOLS) {
    const address = labels.get(name);
    if (!Number.isInteger(address)) {
      throw new Error(`4.3: main.s no longer exports ${name}, which the sector reader calls`);
    }
    lines.push(`${name.padEnd(30)} = $${address.toString(16).toUpperCase().padStart(4, "0")}` +
      `   ; ${note}`);
  }
  return `${lines.join("\n")}\n`;
}

// Roadmap 4.3 level image (plan §1.4). v1 carries an inert pattern the gates
// read back byte-exact; 4.6 replaces the payload with LevelDef and hull data.
// The eight-byte header is exactly what sector_reader_validate checks.
function buildLevelImage({ id, sectors }) {
  const bytes = Buffer.alloc(sectors * 128);
  bytes[0] = "V".charCodeAt(0);
  bytes[1] = "S".charCodeAt(0);
  bytes[2] = LEVEL_FORMAT_VERSION;
  bytes[3] = id;
  bytes[4] = sectors;
  bytes.writeUInt16LE(bytes.length - 8, 5);
  bytes[7] = 0;
  for (let index = 8; index < bytes.length; index += 1) {
    bytes[index] = ((index * 7) + (id * 0x1d) + 0x5a) & 0xff;
  }
  return bytes;
}

// The resident directory the reader indexes by level id. Generated so the
// sector numbers can never drift from where the build actually put the runs.
function renderLevelDirectoryInclude(levels) {
  const byte = (value) => `$${(value & 0xff).toString(16).padStart(2, "0")}`;
  const lines = [
    "; Generated by scripts/build.mjs for roadmap 4.3 - do not edit.",
    "; Level directory: 16 entries of {sector_lo, sector_hi, sector_count}.",
    "; A zero count means the build placed no run for that level, which",
    "; sector_reader_lookup rejects without touching SIO.",
    "sector_reader_directory:",
  ];
  for (let id = 1; id <= LEVEL_MAX_ID; id += 1) {
    const level = levels.find((entry) => entry.id === id);
    lines.push(level
      ? `        .byte ${byte(level.startSector)}, ${byte(level.startSector >> 8)}, ` +
        `${level.sectors}\t; level ${id} at sector ${level.startSector}`
      : `        .byte $00, $00, $00\t; level ${id}: not on this disk`);
  }
  lines.push("sector_reader_directory_end:");
  return `${lines.join("\n")}\n`;
}

async function buildResidentModule({ sourcePath, configPath, stem, extraInputs = {},
  configText = null }) {
  const source = fs.readFileSync(sourcePath);
  const config = configText === null ? fs.readFileSync(configPath) : Buffer.from(configText);
  const base = `/project/build/${stem}`;
  const assembled = await runWasmTool(
    "ca65",
    { [`${base}.s`]: source, ...extraInputs },
    ["--cpu", "6502", "-g", "-l", `${base}.lst`, "-o", `${base}.o`, `${base}.s`],
    [`${base}.o`, `${base}.lst`],
  );
  const linked = await runWasmTool(
    "ld65",
    { [`${base}.o`]: assembled.outputs[`${base}.o`], [`${base}.cfg`]: config },
    ["-C", `${base}.cfg`, "-o", `${base}.bin`, "-m", `${base}.map`,
      "-Ln", `${base}.lbl`, `${base}.o`],
    [`${base}.bin`, `${base}.map`, `${base}.lbl`],
  );
  const raw = Buffer.from(linked.outputs[`${base}.bin`]);
  const packed = packBroadsideLzss(raw);
  if (!unpackBroadsideLzss(packed).equals(raw)) {
    throw new Error(`${stem} LZSS round trip failed`);
  }
  return {
    raw,
    packed,
    object: assembled.outputs[`${base}.o`],
    listing: assembled.outputs[`${base}.lst`],
    map: linked.outputs[`${base}.map`],
    labels: linked.outputs[`${base}.lbl`],
  };
}

async function buildHybridDirectorModule(fighterWeaponsInclude) {
  const base = "/project/build/encounter-director";
  const cSource = fs.readFileSync(path.join(rootDirectory, "src", "c", "director.c"));
  const cHeader = fs.readFileSync(path.join(rootDirectory, "src", "c", "director.h"));
  const lifecycleSource = fs.readFileSync(path.join(rootDirectory, "src", "c", "lifecycle.c"));
  const lifecycleHeader = fs.readFileSync(path.join(rootDirectory, "src", "c", "lifecycle.h"));
  const archetypeHeader = fs.readFileSync(
    path.join(rootDirectory, "src", "c", "enemy-archetype.h"),
  );
  const stdintHeader = fs.readFileSync(path.join(shareDir, "include", "stdint.h"));
  const longBranchMacros = fs.readFileSync(path.join(shareDir, "asminc", "longbranch.mac"));
  const abiSource = fs.readFileSync(path.join(rootDirectory, "src", "hybrid", "c-asm-abi.s"));
  const config = fs.readFileSync(path.join(rootDirectory, "cfg", "encounter-director.cfg"));
  const compiled = await runWasmTool(
    "cc65",
    {
      "/project/src/c/director.c": cSource,
      "/project/src/c/director.h": cHeader,
      "/project/src/c/lifecycle.h": lifecycleHeader,
      "/cc65/include/stdint.h": stdintHeader,
    },
    ["--cpu", "6502", "-Oirs", "-I", "/project/src/c", "-I", "/cc65/include",
      "-o", `${base}-generated.s`, "/project/src/c/director.c"],
    [`${base}-generated.s`],
  );
  const generatedAssembly = compiled.outputs[`${base}-generated.s`];
  const lifecycleCompiled = await runWasmTool(
    "cc65",
    {
      "/project/src/c/lifecycle.c": lifecycleSource,
      "/project/src/c/lifecycle.h": lifecycleHeader,
      "/project/src/c/enemy-archetype.h": archetypeHeader,
      "/cc65/include/stdint.h": stdintHeader,
    },
    ["--cpu", "6502", "-Oirs", "-I", "/project/src/c", "-I", "/cc65/include",
      "-o", `${base}-lifecycle-generated.s`, "/project/src/c/lifecycle.c"],
    [`${base}-lifecycle-generated.s`],
  );
  const lifecycleGeneratedAssembly =
    lifecycleCompiled.outputs[`${base}-lifecycle-generated.s`];
  for (const [moduleName, assembly] of [
    ["Director", generatedAssembly],
    ["lifecycle/archetype", lifecycleGeneratedAssembly],
  ]) {
    const generatedText = assembly.toString("utf8");
    const executableText = generatedText.replace(/^\s*\.importzp.*$/gmi, "");
    if (/^\s*(?:jsr|jmp)\s+(?:push|pop|incsp|decsp|tos|addysp|subysp)/mi.test(generatedText) ||
        /\(sp\)/.test(generatedText) ||
        /\b(?:c_sp|sreg|regsave|regbank|tmp[1-4]|ptr[1-4])\b/.test(executableText)) {
      const helperLines = generatedText.split(/\r?\n/).filter((line) =>
        /^\s*(?:jsr|jmp)\s+(?:push|pop|incsp|decsp|tos|addysp|subysp)/i.test(line) ||
        /\(sp\)/.test(line) ||
        (!/^\s*\.importzp/i.test(line) &&
          /\b(?:c_sp|sreg|regsave|regbank|tmp[1-4]|ptr[1-4])\b/.test(line)));
      throw new Error(`C ${moduleName} unexpectedly requires cc65 software-stack/zero-page state: ` +
        helperLines.slice(0, 8).join(" | "));
    }
  }
  const cAssembled = await runWasmTool(
    "ca65",
    {
      [`${base}-generated.s`]: generatedAssembly,
      "/cc65/asminc/longbranch.mac": longBranchMacros,
    },
    ["--cpu", "6502", "-g", "-I", "/cc65/asminc", "-l", `${base}-c.lst`,
      "-o", `${base}-c.o`, `${base}-generated.s`],
    [`${base}-c.o`, `${base}-c.lst`],
  );
  const abiAssembled = await runWasmTool(
    "ca65",
    { [`${base}-abi.s`]: abiSource, "/project/build/fighter-weapons.inc": fighterWeaponsInclude },
    ["--cpu", "6502", "-g", "-l", `${base}-abi.lst`, "-o", `${base}-abi.o`,
      `${base}-abi.s`],
    [`${base}-abi.o`, `${base}-abi.lst`],
  );
  const lifecycleAssembled = await runWasmTool(
    "ca65",
    {
      [`${base}-lifecycle-generated.s`]: lifecycleGeneratedAssembly,
      "/cc65/asminc/longbranch.mac": longBranchMacros,
    },
    ["--cpu", "6502", "-g", "-I", "/cc65/asminc", "-l", `${base}-lifecycle.lst`,
      "-o", `${base}-lifecycle.o`, `${base}-lifecycle-generated.s`],
    [`${base}-lifecycle.o`, `${base}-lifecycle.lst`],
  );
  const linked = await runWasmTool(
    "ld65",
    {
      [`${base}-c.o`]: cAssembled.outputs[`${base}-c.o`],
      [`${base}-lifecycle.o`]: lifecycleAssembled.outputs[`${base}-lifecycle.o`],
      [`${base}-abi.o`]: abiAssembled.outputs[`${base}-abi.o`],
      [`${base}.cfg`]: config,
    },
    ["-C", `${base}.cfg`, "-o", `${base}-combined.bin`, "-m", `${base}.map`,
      "-Ln", `${base}.lbl`, `${base}-abi.o`, `${base}-c.o`, `${base}-lifecycle.o`],
    [`${base}-combined.bin`, `${base}.map`, `${base}.lbl`],
  );
  const combinedRaw = Buffer.from(linked.outputs[`${base}-combined.bin`]);
  const map = linked.outputs[`${base}.map`];
  const labels = linked.outputs[`${base}.lbl`];
  const parsedLabels = parseViceLabels(labels.toString("utf8"));
  const abiBytes = parsedLabels.get("__DIRECTOR_ABI_SIZE__");
  const lowCodeBytes = parsedLabels.get("__DIRECTOR_C_LOW_SIZE__");
  const extensionCodeBytes = parsedLabels.get("__HYBRID_C_EXT_SIZE__");
  const archetypeBytes = parsedLabels.get("__ENEMY_ARCHETYPE_DATA_SIZE__");
  const extensionBytes = extensionCodeBytes + archetypeBytes;
  const preCodeBytes = parsedLabels.get("__DIRECTOR_C_PRE_SIZE__");
  const cCodeBytes = parsedLabels.get("__DIRECTOR_C_CODE_SIZE__");
  const rodataBytes = parsedLabels.get("__LEVEL1_DATA_SIZE__");
  const bssBytes = parsedLabels.get("__DIRECTOR_C_BSS_SIZE__");
  const lifecycleBssBytes = parsedLabels.get("__HYBRID_C_STATE_SIZE__");
  const sectorWindowBytes = parsedLabels.get("__HYBRID_C_SECTOR_SIZE__");
  const arenaAsmBytes = parsedLabels.get("__HYBRID_ASM_ARENA_SIZE__");
  const arenaCodeBytes = parsedLabels.get("__HYBRID_C_ARENA_SIZE__");
  const arenaRodataBytes = parsedLabels.get("__HYBRID_C_ARENA_RODATA_SIZE__");
  const windowAsmBytes = parsedLabels.get("__HYBRID_ASM_WINDOW_SIZE__");
  const windowCodeBytes = parsedLabels.get("__HYBRID_C_WINDOW_SIZE__");
  const windowRodataBytes = parsedLabels.get("__HYBRID_C_WINDOW_RODATA_SIZE__");
  const basicWindowBytes = [windowAsmBytes, windowCodeBytes, windowRodataBytes]
    .every(Number.isInteger)
    ? windowAsmBytes + windowCodeBytes + windowRodataBytes : undefined;
  if (![abiBytes, lowCodeBytes, extensionCodeBytes, archetypeBytes, preCodeBytes,
    cCodeBytes, rodataBytes, bssBytes, lifecycleBssBytes, sectorWindowBytes, arenaAsmBytes,
    arenaCodeBytes, arenaRodataBytes, basicWindowBytes].every(Number.isInteger)) {
    throw new Error("Hybrid Director link is missing segment size labels");
  }
  const highBytes = rodataBytes + cCodeBytes;
  const arenaBytes = arenaAsmBytes + arenaCodeBytes + arenaRodataBytes;
  if (combinedRaw.length !==
    abiBytes + lowCodeBytes + extensionBytes + preCodeBytes + highBytes + sectorWindowBytes +
      arenaBytes + basicWindowBytes) {
    throw new Error("Hybrid Director output does not match its linked CODE/RODATA segments");
  }
  if (parsedLabels.get("__HYBRID_C_SECTOR_RUN__") !== residentWindowAddress ||
    sectorWindowBytes === 0 || sectorWindowBytes > residentWindowBytes) {
    throw new Error(`HYBRID_C_SECTOR is ${sectorWindowBytes} B; the resident window is ` +
      `${residentWindowBytes} B at $${residentWindowAddress.toString(16).toUpperCase()}`);
  }
  if (lowCodeBytes > lowCodeReservationBytes) {
    throw new Error(`Low C is ${lowCodeBytes} B; its reservation is 248 B`);
  }
  // 4.5M-M3 arena contract (also asserted by ld65 through src/hybrid/c-asm-abi.s).
  const arenaMemoryStart = parsedLabels.get("__HYBRID_C_ARENA_RAM_START__");
  const arenaMemorySize = parsedLabels.get("__HYBRID_C_ARENA_RAM_SIZE__");
  const arenaSegmentStart = arenaAsmBytes > 0 ? parsedLabels.get("__HYBRID_ASM_ARENA_RUN__")
    : arenaCodeBytes > 0 ? parsedLabels.get("__HYBRID_C_ARENA_RUN__")
      : parsedLabels.get("__HYBRID_C_ARENA_RODATA_RUN__");
  if (arenaMemoryStart !== hybridArenaAddress || arenaMemorySize !== hybridArenaCapacityBytes ||
    hybridArenaCapacityBytes !== 832 || hybridArenaEndExclusive > a2DisplayListAddress ||
    arenaSegmentStart !== hybridArenaAddress || arenaAsmBytes < 1 ||
    arenaBytes > hybridArenaCapacityBytes) {
    throw new Error(`HYBRID_C_ARENA is ${arenaBytes} B (ASM ${arenaAsmBytes}, C ${arenaCodeBytes}, ` +
      `RODATA ${arenaRodataBytes}) at $${(arenaMemoryStart ?? 0).toString(16)}; the arena is ` +
      `${hybridArenaCapacityBytes} B at $7BD0-$7F0F with a non-empty ca65 anchor first`);
  }
  // Owner decision B: the window region and its six-byte guard are fixed.
  // Owner decision X: the Director link's share of decision B's window is
  // exactly $B600-$BBFF. Its real upper neighbour is the reader BSS at $BC00
  // (cfg/sector-reader.cfg), not the $BC1A guard; the guard is still checked
  // because it is what keeps the OS screen at $BC20 out of reach.
  const basicWindowMemoryStart = parsedLabels.get("__HYBRID_C_WINDOW_RAM_START__");
  const basicWindowMemorySize = parsedLabels.get("__HYBRID_C_WINDOW_RAM_SIZE__");
  const basicWindowGuardStart = parsedLabels.get("__HYBRID_C_WINDOW_GUARD_START__");
  const basicWindowGuardSize = parsedLabels.get("__HYBRID_C_WINDOW_GUARD_SIZE__");
  if (basicWindowMemoryStart !== hybridWindowAddress ||
    basicWindowMemorySize !== hybridWindowCapacityBytes ||
    basicWindowMemoryStart + basicWindowMemorySize !== hybridWindowEndExclusive ||
    basicWindowGuardStart !== basicWindowGuardAddress || basicWindowGuardSize !== 6 ||
    basicWindowGuardStart + basicWindowGuardSize !== basicWindowEndExclusive ||
    basicWindowBytes > basicWindowMemorySize) {
    throw new Error(`HYBRID_C_WINDOW is ${basicWindowBytes} B at ` +
      `$${(basicWindowMemoryStart ?? 0).toString(16)}; the window is ` +
      `${hybridWindowCapacityBytes} B at $B600-$BBFF, below the sector reader BSS at ` +
      `$BC00, with a 6-B guard at $BC1A-$BC1F`);
  }
  const abiStagingMatch = /^DIRECTOR_LOW_STAGING = \$([0-9A-Fa-f]{4})$/m.exec(abiSource.toString("utf8"));
  if (abiStagingMatch === null ||
    Number.parseInt(abiStagingMatch[1], 16) !== coldLowGlueRecordAddress) {
    throw new Error("src/hybrid/c-asm-abi.s DIRECTOR_LOW_STAGING must equal coldLowGlueRecordAddress");
  }
  let offset = 0;
  const makeSegment = (name, runAddress, bytes) => {
    const data = combinedRaw.subarray(offset, offset + bytes);
    offset += bytes;
    return { name, runAddress, data, packed: packBroadsideLzss(data) };
  };
  const codeSegments = [
    { ...makeSegment("abi", 0x8701, abiBytes), transportAddress: abiColdRecordAddress },
    { ...makeSegment("low", 0x8b88, lowCodeBytes), transportAddress: coldLowGlueRecordAddress },
    { ...makeSegment("extension", 0x8c7d, extensionBytes), transportAddress: 0x7810,
      lateCompressed: true },
    makeSegment("pre", 0x9d5e, preCodeBytes),
  ];
  const lifecycleExtension = codeSegments.find(({ name }) => name === "extension");
  if (lifecycleExtension.packed.length > 0x3c0) {
    throw new Error(`Hybrid lifecycle extension is ${lifecycleExtension.data.length} B raw / ` +
      `${lifecycleExtension.packed.length} B packed; cold staging limit is 960 B`);
  }
  const raw = combinedRaw.subarray(offset, offset + highBytes);
  const packed = packBroadsideLzss(raw);
  offset += highBytes;
  // The window segment is not a transport record: its independent stream rides
  // after the pickup/collision stream, so the DFMC topology stays 8 records.
  const windowSegment = makeSegment("window", residentWindowAddress, sectorWindowBytes);
  // 4.5M-M3: the arena image is a direct-landing DFMC record of its own. Only
  // the used bytes travel -- there is no reason to carry padding across the
  // transport; bytes past the image are unspecified. (The original rationale
  // here was the zero-margin ATR boot-smoke menu deadline; owner decision 22
  // re-based that deadline onto the 60-second budget, so it no longer applies.)
  const arenaSegment = {
    ...makeSegment("arena", hybridArenaAddress, arenaBytes),
    arena: { capacityBytes: hybridArenaCapacityBytes, asmBytes: arenaAsmBytes,
      codeBytes: arenaCodeBytes, rodataBytes: arenaRodataBytes },
  };
  codeSegments.push(arenaSegment);
  // Owner decision B (2026-09-20), placed by owner decision X (2026-09-21):
  // the window's own direct-landing record. It is the last MEMORY area in the
  // config, so its bytes close combinedRaw.
  if (basicWindowBytes > 0) {
    codeSegments.push({
      ...makeSegment("hybrid-window", hybridWindowAddress, basicWindowBytes),
      basicWindow: { capacityBytes: hybridWindowCapacityBytes, asmBytes: windowAsmBytes,
        codeBytes: windowCodeBytes, rodataBytes: windowRodataBytes,
        guardAddress: basicWindowGuardAddress, endExclusive: hybridWindowEndExclusive },
    });
  }
  if (!codeSegments.every(({ data, packed: segmentPacked }) =>
    unpackBroadsideLzss(segmentPacked).equals(data)) ||
      !unpackBroadsideLzss(packed).equals(raw) ||
      !unpackBroadsideLzss(windowSegment.packed).equals(windowSegment.data)) {
    throw new Error("Hybrid Director LZSS round trip failed");
  }
  const codeRaw = Buffer.concat(codeSegments.map(({ data }) => data));
  const codePacked = Buffer.concat(codeSegments.map(({ packed: segmentPacked }) => segmentPacked));
  return {
    implementation: "cc65-c",
    raw,
    packed,
    basicWindowBytes,
    basicWindowCapacityBytes: hybridWindowCapacityBytes,
    codeRaw,
    codePacked,
    codeSegments,
    windowSegment,
    arenaSegment,
    combinedRaw,
    object: cAssembled.outputs[`${base}-c.o`],
    lifecycleObject: lifecycleAssembled.outputs[`${base}-lifecycle.o`],
    abiObject: abiAssembled.outputs[`${base}-abi.o`],
    listing: cAssembled.outputs[`${base}-c.lst`],
    lifecycleListing: lifecycleAssembled.outputs[`${base}-lifecycle.lst`],
    abiListing: abiAssembled.outputs[`${base}-abi.lst`],
    generatedAssembly,
    lifecycleGeneratedAssembly,
    map,
    labels,
    footprint: {
      abiBytes,
      codeBytes: lowCodeBytes + extensionCodeBytes + preCodeBytes + cCodeBytes,
      rodataBytes: rodataBytes + archetypeBytes,
      dataBytes: 0,
      bssBytes: bssBytes + lifecycleBssBytes,
      cStackBytes: 0,
      zeroPageBytes: 0,
    },
  };
}

// Roadmap 4.5M-M2: one LZ transport record carries the low-C image padded to
// its full $F8 reservation and the 250-B GLUE image, landing at
// coldLowGlueRecordAddress (4.5M-M3 retired its Heavy window tail). The fixed
// offsets let main.s and the ABI veneer address each part with constants.
function attachGlueToLowRecord(directorModule, glueRaw) {
  const lowSegment = directorModule.codeSegments.find(({ name }) => name === "low");
  if (lowSegment === undefined) return null;
  if (glueRaw.length !== expectedGlueRawBytes) {
    throw new Error(`GLUE image is ${glueRaw.length} B; the merged cold record assumes ` +
      `${expectedGlueRawBytes} B`);
  }
  lowSegment.transportData = Buffer.concat([
    lowSegment.data, Buffer.alloc(lowCodeReservationBytes - lowSegment.data.length), glueRaw,
  ]);
  lowSegment.transportPacked = packBroadsideLzss(lowSegment.transportData);
  if (!unpackBroadsideLzss(lowSegment.transportPacked).equals(lowSegment.transportData)) {
    throw new Error("Merged low-C/GLUE record LZSS round trip failed");
  }
  const endExclusive = coldLowGlueRecordAddress + lowSegment.transportData.length;
  if (endExclusive > directorPreRunAddress) {
    throw new Error(`Merged cold record $${coldLowGlueRecordAddress.toString(16)}-$${
      (endExclusive - 1).toString(16)} reaches the DIRECTOR_C_PRE record at $9D5E`);
  }
  return lowSegment;
}

function renderDirectorAbiInclude(labelBytes, lightKernelAddress) {
  const labels = parseViceLabels(labelBytes.toString("utf8"));
  const symbols = [
    ["DIRECTOR_INIT", "director_init"],
    ["DIRECTOR_WORLD_ROW_TICK", "director_world_row_tick"],
    ["DIRECTOR_REQUEST", "director_request"],
    ["DIRECTOR_RELEASE", "director_release"],
    ["DIRECTOR_RNG_ADVANCE", "director_rng_advance"],
    ["DIRECTOR_PUBLISH_LOW", "director_publish_low"],
    // Roadmap 4.3 step 5: exposed by name so roadmap 4.9's level boundary
    // reuses the capital entry's drain test instead of writing a second one.
    ["HYBRID_SECTOR_DRAIN_CLEAR", "sector_drain_clear"],
    ["HYBRID_SECTOR_UPDATE_FIRST_CAPITAL", "sector_update_first_capital"],
    ["HYBRID_SECTOR_UPDATE_CAPITAL_PHASE", "sector_update_capital_phase"],
    ["HYBRID_SECTOR_BEGIN_COMPLETE", "sector_begin_complete"],
    ["HYBRID_SECTOR_COMPLETE_SCROLL_TICK", "sector_complete_scroll_tick"],
    ["HYBRID_SECTOR_FORCE_FINAL_DRAIN", "sector_force_final_drain"],
    ["HYBRID_ENEMY_SPAWN_RAIDERS", "enemy_spawn_raiders"],
    ["HYBRID_ENEMY_RETIRE_MEMBER", "enemy_retire_member"],
    ["HYBRID_ENEMY_APPLY_PENDING_DAMAGE", "enemy_apply_pending_damage"],
    ["HYBRID_ENEMY_RECYCLE", "enemy_recycle"],
    ["ENEMY_ARCHETYPE_TABLE", "enemy_archetype_table"],
    ["ENEMY_PROFILE_MOVEMENT_ID", "enemy_profile_movement_id"],
    ["ENEMY_PROFILE_FIRE_POLICY_ID", "enemy_profile_fire_policy_id"],
    ["ENEMY_PROFILE_BURST_COUNT", "enemy_profile_burst_count"],
    ["ENEMY_PROFILE_BURST_INTERVAL", "enemy_profile_burst_interval"],
    ["ENEMY_PROFILE_POST_BURST_FRAMES", "enemy_profile_post_burst_frames"],
    ["ENEMY_PROFILE_RENDERER_CLASS", "enemy_profile_renderer_class"],
    ["ENEMY_PROFILE_WEAPON_CLASS", "enemy_profile_weapon_class"],
    ["ENEMY_PROFILE_SCORE_BCD", "enemy_profile_score_bcd"],
    ["ENEMY_PROFILE_DIRECTOR_VALUE", "enemy_profile_director_value"],
    ["ENEMY_HEAVY_TICK", "enemy_heavy_tick"],
    ["HEAVY_MEMBER_X", "heavy_member_x"],
    ["HEAVY_HULL_COLOUR", "heavy_hull_colour"],
    ["HEAVY_MEMBER_COLOUR", "heavy_member_colour"],
    ["HYBRID_BUILD_HOSTILE_GLYPHS", "build_hostile_weapon_glyphs"],
    ["HEAVY_ARCHETYPE_OFFSET", "heavy_archetype_offset"],
    ["ENEMY_LIGHT_TICK", "enemy_light_tick"],
    ["ENEMY_LIGHT_HIT", "enemy_light_hit"],
    ["LIGHT_STATE", "light_state"],
    ["LIGHT_X", "light_x"],
    ["LIGHT_Y", "light_y"],
    ["LIGHT_SCREEN_LO", "light_screen_lo"],
    ["LIGHT_SCREEN_HI", "light_screen_hi"],
    ["LIGHT_BACKING0", "light_backing0"],
    ["LIGHT_RESOLVE_SAVE", "light_resolve_save"],
    ["LIGHT_SCRATCH", "light_scratch"],
    ["LIGHT_SLOT_SAVE", "light_slot_save"],
    ["LIGHT_SLOT", "light_slot"],
    ["LIGHT_ARCHETYPE_OFFSET", "light_archetype_offset"],
    ["LIGHT_CODE", "light_code"],
  ];
  for (const [, name] of symbols) {
    if (!Number.isInteger(labels.get(name))) throw new Error(`Hybrid ABI symbol ${name} is missing`);
  }
  const abiBytes = labels.get("__DIRECTOR_ABI_SIZE__") ?? 0;
  const extensionBytes = (labels.get("__ENEMY_ARCHETYPE_DATA_SIZE__") ?? 0) +
    (labels.get("__HYBRID_C_EXT_SIZE__") ?? 0);
  return Buffer.from(symbols.map(([constant, name]) =>
    `${constant} = $${labels.get(name).toString(16).toUpperCase()}\n`).join("") +
    `DIRECTOR_ABI_STAGING = $${abiColdRecordAddress.toString(16).toUpperCase()}\n` +
    `DIRECTOR_ABI_RUNTIME = $8701\n` +
    `DIRECTOR_ABI_BYTES = ${abiBytes}\n` +
    `HYBRID_C_EXT_STAGING = $7810\nHYBRID_C_EXT_RUNTIME = $8C7D\n` +
    `HYBRID_C_EXT_BYTES = ${extensionBytes}\n` +
    `HYBRID_C_ARENA_RUNTIME = $${hybridArenaAddress.toString(16).toUpperCase()}\n` +
    `HYBRID_C_ARENA_END = $${hybridArenaEndExclusive.toString(16).toUpperCase()}\n` +
    `HYBRID_C_ARENA_CAPACITY = ${hybridArenaCapacityBytes}\n` +
    `HYBRID_C_ARENA_BYTES = ${(labels.get("__HYBRID_ASM_ARENA_SIZE__") ?? 0) +
      (labels.get("__HYBRID_C_ARENA_SIZE__") ?? 0) +
      (labels.get("__HYBRID_C_ARENA_RODATA_SIZE__") ?? 0)}\n` +
    // Light multiplicity step 1b: two links share the code window, so the
    // boundary between them is not a chosen constant - it is wherever the
    // Director link's C half happens to end. Every later stage (the kernel's
    // own link, main.s's five hook constants, the transport record and the
    // write-watch) takes it from this one line.
    `HYBRID_ASM_WINDOW_BASE = $${lightKernelAddress.toString(16).toUpperCase()}\n` +
    `HYBRID_C_WINDOW_LIMIT = $${hybridWindowEndExclusive.toString(16).toUpperCase()}\n` +
    LIGHT_KERNEL_VECTORS.map(([name], index) =>
      `${name} = HYBRID_ASM_WINDOW_BASE+${index * 3}\n`).join("")); 
}

// Roadmap 4.5M-M1: cut the STARFIELD runtime into two independently packed
// LZ streams. The largest raw prefix that packs into stream A's window is found
// first; the cut is then moved down in 16-byte raw steps (up to 192 B) and the
// candidate with the smallest packed total that fits both windows wins, so the
// split overhead stays small and deterministic for a given runtime image.
function splitStarfieldStreams(raw, stagingStreams) {
  const [first, second] = stagingStreams;
  const fitsFirst = (length) =>
    packBroadsideLzss(raw.subarray(0, length)).length <= first.capacityBytes;
  let low = 0;
  let high = raw.length;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (fitsFirst(middle)) low = middle; else high = middle - 1;
  }
  let best = null;
  for (let cut = low; cut >= Math.max(1, low - 192); cut -= 16) {
    const packedA = packBroadsideLzss(raw.subarray(0, cut));
    const packedB = packBroadsideLzss(raw.subarray(cut));
    if (packedA.length > first.capacityBytes || packedB.length > second.capacityBytes) continue;
    const total = packedA.length + packedB.length;
    if (best === null || total < best.total) best = { cut, packedA, packedB, total };
  }
  if (best === null) {
    throw new Error(`Packed starfield does not fit two streams of ${first.capacityBytes} and ` +
      `${second.capacityBytes} B (largest fitting stream A prefix ${low} raw B)`);
  }
  return {
    rawSplitOffset: best.cut,
    singleStreamPackedBytes: packBroadsideLzss(raw).length,
    streams: [
      { ...first, rawOffset: 0, rawBytes: best.cut, packed: best.packedA },
      { ...second, rawOffset: best.cut, rawBytes: raw.length - best.cut, packed: best.packedB },
    ],
  };
}

async function build() {
  fs.mkdirSync(buildDirectory, { recursive: true });
  fs.mkdirSync(distDirectory, { recursive: true });

  const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"));
  const config = fs.readFileSync(path.join(rootDirectory, "cfg", "atari-boot.cfg"));
  const loaderDefinitionPath = path.join(
    rootDirectory,
    "assets",
    "graphics",
    "loader-bitmap.json",
  );
  const loaderDefinition = loadLoaderBitmapDefinition(loaderDefinitionPath);
  const loaderAsset = compileLoaderBitmap(loaderDefinition);
  const loaderInclude = Buffer.from(renderLoaderCa65Include(loaderAsset));
  const loaderDisplayListInclude = Buffer.from(
    renderLoaderDisplayListCa65Include(loaderAsset),
  );
  writeFile(path.join(buildDirectory, "loader-screen.inc"), loaderInclude);
  writeFile(path.join(buildDirectory, "loader-display-list.inc"), loaderDisplayListInclude);
  const capitalHullsDefinitionPath = path.join(
    rootDirectory,
    "assets",
    "graphics",
    "capital-hulls.json",
  );
  const capitalHullsDefinition = loadCapitalHullsDefinition(capitalHullsDefinitionPath);
  const capitalHullsAsset = compileCapitalHulls(capitalHullsDefinition);
  const capitalHullsInclude = Buffer.from(renderCapitalHullsCa65Include(capitalHullsAsset));
  writeFile(path.join(buildDirectory, "capital-hulls.inc"), capitalHullsInclude);
  const enemyRosterDefinitionPath = path.join(
    rootDirectory,
    "assets",
    "graphics",
    "enemy-roster.json",
  );
  const enemyRosterDefinition = loadEnemyRosterDefinition(enemyRosterDefinitionPath);
  const enemyRosterAsset = compileEnemyRoster(enemyRosterDefinition, rootDirectory);
  const paletteCandidateId = enemyPaletteIds.get(enemyPaletteSlug);
  const paletteCandidate = paletteCandidateId
    ? enemyRosterAsset.runtime.colourPolicy.candidates.find(({ id }) => id === paletteCandidateId)
    : null;
  const enemyRosterInclude = Buffer.from(renderEnemyRosterCa65Include(enemyRosterAsset));
  writeFile(path.join(buildDirectory, "enemy-roster.inc"), enemyRosterInclude);
  const fighterWeaponsDefinitionPath = path.join(
    rootDirectory, "assets", "graphics", "fighter-weapons.json",
  );
  const fighterWeaponsAsset = compileFighterWeapons(
    loadFighterWeaponsDefinition(fighterWeaponsDefinitionPath),
    enemyRosterAsset,
  );
  const fighterWeaponsInclude = Buffer.from(
    renderFighterWeaponsCa65Include(fighterWeaponsAsset),
  );
  writeFile(path.join(buildDirectory, "fighter-weapons.inc"), fighterWeaponsInclude);
  const starfieldDefinitionPath = path.join(
    rootDirectory, "assets", "graphics", "starfield.json",
  );
  const starfieldAsset = compileStarfield(loadStarfieldDefinition(starfieldDefinitionPath));
  const starfieldInclude = Buffer.from(renderStarfieldCa65Include(starfieldAsset));
  writeFile(path.join(buildDirectory, "starfield.inc"), starfieldInclude);
  const menuMusicDefinitionPath = path.join(
    rootDirectory, "assets", "music", "menu-theme.json",
  );
  const menuMusicAsset = compileMenuMusic(loadMenuMusicDefinition(menuMusicDefinitionPath));
  const menuMusicInclude = Buffer.from(renderMenuMusicCa65Include(menuMusicAsset));
  writeFile(path.join(buildDirectory, "menu-music.inc"), menuMusicInclude);
  const gameplayMusicDefinitionPath = path.join(
    rootDirectory, "assets", "music", "gameplay-theme.json",
  );
  const gameplayMusicAsset = compileGameplayMusic(
    loadGameplayMusicDefinition(gameplayMusicDefinitionPath),
    menuMusicAsset,
  );
  const gameplayMusicInclude = Buffer.from(
    renderGameplayMusicCa65Include(gameplayMusicAsset),
  );
  writeFile(path.join(buildDirectory, "gameplay-music.inc"), gameplayMusicInclude);
  const entityEffectsDefinitionPath = path.join(
    rootDirectory, "assets", "graphics", "entity-effects.json",
  );
  const entityEffectsAsset = compileEntityEffects(
    loadEntityEffectsDefinition(entityEffectsDefinitionPath),
  );
  const entityEffectsInclude = Buffer.from(
    renderEntityEffectsCa65Include(entityEffectsAsset),
  );
  writeFile(path.join(buildDirectory, "entity-effects.inc"), entityEffectsInclude);
  const weaponPickupPhaseBank = Buffer.from(entityEffectsAsset.pickupPhaseBank);
  writeFile(path.join(buildDirectory, "weapon-pickup-phases.bin"), weaponPickupPhaseBank);
  const frontendH31Asset = compileFrontendH31(loadFrontendH31Definition(
    path.join(rootDirectory, "assets", "graphics", "frontend-h31.json"),
  ));
  const frontendH31Include = Buffer.from(renderFrontendH31Ca65Include(frontendH31Asset));
  writeFile(path.join(buildDirectory, "frontend-h31.inc"), frontendH31Include);

  const directorModule = asmDirectorBaseline
    ? {
        ...(await buildResidentModule({
          sourcePath: path.join(rootDirectory, "src", "encounter-director.s"),
          configPath: path.join(rootDirectory, "cfg", "encounter-director-asm.cfg"),
          stem: "encounter-director",
        })),
        implementation: "ca65-asm",
        codeRaw: Buffer.alloc(0),
        codePacked: Buffer.alloc(0),
        codeSegments: [],
        footprint: {
          abiBytes: 0,
          codeBytes: expectedDirectorRawBytes - 158,
          rodataBytes: 158,
          dataBytes: 0,
          bssBytes: 12,
          cStackBytes: 0,
          zeroPageBytes: 0,
        },
      }
    : await buildHybridDirectorModule(fighterWeaponsInclude);
  if (process.argv.includes("--director-only")) {
    writeFile(path.join(buildDirectory, "encounter-director.map"), directorModule.map);
    writeFile(path.join(buildDirectory, "encounter-director.lbl"), directorModule.labels);
    writeFile(path.join(buildDirectory, "encounter-director-generated.s"),
      directorModule.generatedAssembly ?? Buffer.alloc(0));
    writeFile(path.join(buildDirectory, "encounter-director.bin"), directorModule.raw);
    for (const segment of directorModule.codeSegments) {
      writeFile(path.join(buildDirectory, `encounter-director-code-${segment.name}.bin`),
        segment.data);
    }
    return;
  }
  // Light multiplicity step 1b (plan §3.1 [C1]). The Light kernel's link starts
  // exactly where the Director link's window content ends:
  // __HYBRID_C_WINDOW_RAM_LAST__ is the address after the last byte the C half
  // uses. Nothing rounds it, so no byte of the window is lost to a boundary,
  // and it moves on its own whenever the Light C changes size - which is the
  // whole point of owner option B over a fixed split between two ESTIMATEs.
  const directorLabels = parseViceLabels(directorModule.labels.toString("utf8"));
  const windowCEnd = directorLabels.get("__HYBRID_C_WINDOW_RAM_LAST__");
  if (!Number.isInteger(windowCEnd) || windowCEnd < hybridWindowAddress ||
    windowCEnd > hybridWindowEndExclusive) {
    throw new Error(`the Director link's window half ends at ` +
      `$${(windowCEnd ?? 0).toString(16)}, outside $B600-$BBFF`);
  }
  const lightKernelAddress = windowCEnd;
  const directorAbiInclude =
    renderDirectorAbiInclude(directorModule.labels, lightKernelAddress);
  writeFile(path.join(buildDirectory, "director-abi.inc"), directorAbiInclude);

  const assembled = await runWasmTool(
    "ca65",
    {
      "/project/src/main.s": source,
      "/project/build/loader-screen.inc": loaderInclude,
      "/project/build/loader-display-list.inc": loaderDisplayListInclude,
      "/project/build/capital-hulls.inc": capitalHullsInclude,
      "/project/build/enemy-roster.inc": enemyRosterInclude,
      "/project/build/fighter-weapons.inc": fighterWeaponsInclude,
      "/project/build/starfield.inc": starfieldInclude,
      "/project/build/menu-music.inc": menuMusicInclude,
      "/project/build/gameplay-music.inc": gameplayMusicInclude,
      "/project/build/entity-effects.inc": entityEffectsInclude,
      "/project/build/frontend-h31.inc": frontendH31Include,
      "/project/build/director-abi.inc": directorAbiInclude,
      "/project/build/heavy-member.s": fs.readFileSync(
        path.join(rootDirectory, "src", "hybrid", "heavy-member.s")),
    },
    [
      "--cpu",
      "6502",
      "-g",
      ...(enemyReviewHarness ? ["-D", "ENEMY_REVIEW_HARNESS=1"] : []),
      ...(enemyCombatReviewHarness || paletteCandidate
        ? ["-D", "ENEMY_COMBAT_REVIEW_HARNESS=1"] : []),
      ...(paletteCandidate
        ? ["-D", `ENEMY_BODY_COLOR_OVERRIDE=${paletteCandidate.value}`] : []),
      "-I",
      "/project/build",
      "-l",
      "/project/build/main.lst",
      "-o",
      "/project/build/main.o",
      "/project/src/main.s",
    ],
    ["/project/build/main.o", "/project/build/main.lst"],
  );

  const objectFile = assembled.outputs["/project/build/main.o"];
  writeFile(path.join(buildDirectory, "main.o"), objectFile);
  writeFile(path.join(buildDirectory, "main.lst"), assembled.outputs["/project/build/main.lst"]);

  // LIGHT_CODE is linked with the main image but runs directly after the C
  // extension composite, whose stream later carries it. Its start therefore
  // follows the measured C extension size; ld65 rejects any overflow of $8FFF.
  const cExtensionSegment = directorModule.codeSegments.find(({ name }) => name === "extension");
  const lightCodeRunAddress = cExtensionSegment
    ? cExtensionSegment.runAddress + cExtensionSegment.data.length : null;
  const bootConfig = lightCodeRunAddress === null ? config : Buffer.from(
    config.toString("utf8").replace(
      /LIGHTFILE:(\s*)start = \$[0-9A-Fa-f]+, size = \$[0-9A-Fa-f]+/,
      // A replacer function: a replacement string would read "$01.." in a size
      // such as $0186 as a capture-group reference.
      (_, spacing) => `LIGHTFILE:${spacing}start = $${
        lightCodeRunAddress.toString(16).toUpperCase()}, size = $${
        (0x9000 - lightCodeRunAddress).toString(16).toUpperCase().padStart(4, "0")}`,
    ));
  const linked = await runWasmTool(
    "ld65",
    {
      "/project/build/main.o": objectFile,
      "/project/cfg/atari-boot.cfg": bootConfig,
    },
    [
      "--large-alignment",
      "-C",
      "/project/cfg/atari-boot.cfg",
      "-o",
      "/project/build/void-strike-65.bin",
      "-m",
      "/project/build/void-strike-65.map",
      "-Ln",
      "/project/build/void-strike-65.lbl",
      "/project/build/main.o",
    ],
    [
      "/project/build/void-strike-65.bin",
      "/project/build/void-strike-65.map",
      "/project/build/void-strike-65.lbl",
    ],
  );

  const linkedPayload = Buffer.from(linked.outputs["/project/build/void-strike-65.bin"]);
  const mapFile = linked.outputs["/project/build/void-strike-65.map"];
  const labelFile = linked.outputs["/project/build/void-strike-65.lbl"];
  const labels = parseViceLabels(labelFile.toString("utf8"));
  const startAddress = labels.get("start");
  const bootInitAddress = labels.get("boot_return");
  const broadsideLoadAddress = labels.get("__BROADSIDE_LOAD__");
  const broadsideRunAddress = labels.get("__BROADSIDE_RUN__");
  const broadsideRuntimeBytes = labels.get("__BROADSIDE_SIZE__");
  const starfieldLoadAddress = labels.get("__STARFIELD_LOAD__");
  const starfieldRunAddress = labels.get("__STARFIELD_RUN__");
  const starfieldRuntimeBytes = labels.get("__STARFIELD_SIZE__");
  const a2KernelLoadAddress = labels.get("__A2_KERNEL_LOAD__");
  const a2KernelRunAddress = labels.get("__A2_KERNEL_RUN__");
  const a2KernelBytes = labels.get("__A2_KERNEL_SIZE__");
  const entityCodeLoadAddress = labels.get("__ENTITY_CODE_LOAD__");
  const entityCodeRunAddress = labels.get("__ENTITY_CODE_RUN__");
  const entityCodeBytes = labels.get("__ENTITY_CODE_SIZE__");
  const pickupCodeRunAddress = labels.get("__PICKUP_CODE_RUN__");
  const pickupCodeBytes = labels.get("__PICKUP_CODE_SIZE__");
  const pickupCodeFileOffset = labels.get("__PICKUPFILE_FILEOFFS__");
  const bootStage2LoadAddress = labels.get("__BOOT_STAGE2_LOAD__");
  const bootStage2RunAddress = labels.get("__BOOT_STAGE2_RUN__");
  const bootStage2Bytes = labels.get("__BOOT_STAGE2_SIZE__");
  const bootStage2FileOffset = labels.get("__BOOT2FILE_FILEOFFS__");
  const bootStage2XexEntry = labels.get("boot_stage2_xex_entry");
  const bootChunkManifestAddress = labels.get("boot_chunk_manifest");
  const bootChunkManifestEndAddress = labels.get("boot_chunk_manifest_end");
  const relocatedHullStart = labels.get("scroll_hull_columns");
  const relocatedHullEnd = labels.get("scroll_hull_columns_end");
  const entityStateRunAddress = labels.get("__ENTITY_STATE_RUN__");
  const entityStateBytes = labels.get("__ENTITY_STATE_SIZE__");
  const codeBytes = parseLinkSegmentSize(mapFile.toString("utf8"), "CODE");
  const rodataBytes = parseLinkSegmentSize(mapFile.toString("utf8"), "RODATA");
  const projectileStateBytes = labels.get("__PROJECTILES_SIZE__");
  const residentRuntimeSuffixAddress = labels.get("resident_runtime_suffix");
  const residentPackedSourceOperand = labels.get("resident_packed_source");
  const residentPackedSizeOperand = labels.get("resident_packed_size");
  const pickupPackedSizeOperand = labels.get("pickup_packed_size");
  const weaponPickupColdStagingAddress = labels.get("WEAPON_PICKUP_COLD_STAGING");
  const starfieldPackedSourceOperand = labels.get("starfield_packed_source");
  const starfieldPackedSizeOperand = labels.get("starfield_packed_size");
  const starfieldPackedSourceBOperand = labels.get("starfield_packed_source_b");
  const starfieldPackedSizeBOperand = labels.get("starfield_packed_size_b");
  const a2KernelSourceOperand = labels.get("a2_kernel_source");
  const entityPackedSourceOperand = labels.get("entity_packed_source");
  const entityStagedSourceOperand = labels.get("entity_staged_source");
  const entityPackedSizeOperand = labels.get("entity_packed_size");
  const loaderPackedAddress = labels.get("loader_bitmap_lzss");
  const musicPlayerStart = labels.get("music_player_start");
  const musicPlayerEnd = labels.get("music_player_end");
  const musicDataStart = labels.get("music_data_start");
  const musicDataEnd = labels.get("music_data_end");
  const gameMusicPlayerStart = labels.get("game_music_player_start");
  const gameMusicPlayerEnd = labels.get("game_music_player_end");
  const gameMusicDataStart = labels.get("game_music_data_start");
  const gameMusicDataEnd = labels.get("game_music_data_end");
  const loadAddress = 0x2000;

  if (!Number.isInteger(startAddress) || !Number.isInteger(bootInitAddress) ||
    !Number.isInteger(broadsideLoadAddress) || !Number.isInteger(broadsideRunAddress) ||
    !Number.isInteger(broadsideRuntimeBytes) || !Number.isInteger(starfieldLoadAddress) ||
    !Number.isInteger(starfieldRunAddress) || !Number.isInteger(starfieldRuntimeBytes) ||
    !Number.isInteger(a2KernelLoadAddress) || !Number.isInteger(a2KernelRunAddress) ||
    !Number.isInteger(a2KernelBytes) ||
    !Number.isInteger(entityCodeLoadAddress) || !Number.isInteger(entityCodeRunAddress) ||
    !Number.isInteger(entityCodeBytes) || !Number.isInteger(pickupCodeRunAddress) ||
    !Number.isInteger(pickupCodeBytes) || !Number.isInteger(pickupCodeFileOffset) ||
    !Number.isInteger(bootStage2LoadAddress) ||
    !Number.isInteger(bootStage2RunAddress) || !Number.isInteger(bootStage2Bytes) ||
    !Number.isInteger(bootStage2FileOffset) ||
    !Number.isInteger(bootStage2XexEntry) || !Number.isInteger(bootChunkManifestAddress) ||
    !Number.isInteger(bootChunkManifestEndAddress) || !Number.isInteger(entityStateRunAddress) ||
    !Number.isInteger(entityStateBytes) ||
    !Number.isInteger(residentRuntimeSuffixAddress) ||
    !Number.isInteger(residentPackedSourceOperand) ||
    !Number.isInteger(residentPackedSizeOperand) ||
    !Number.isInteger(pickupPackedSizeOperand) ||
    !Number.isInteger(weaponPickupColdStagingAddress) ||
    !Number.isInteger(starfieldPackedSourceOperand) ||
    !Number.isInteger(starfieldPackedSizeOperand) || !Number.isInteger(a2KernelSourceOperand) ||
    !Number.isInteger(starfieldPackedSourceBOperand) ||
    !Number.isInteger(starfieldPackedSizeBOperand) ||
    !Number.isInteger(entityPackedSourceOperand) || !Number.isInteger(entityStagedSourceOperand) ||
    !Number.isInteger(entityPackedSizeOperand) ||
    !Number.isInteger(loaderPackedAddress) ||
    !Number.isInteger(musicPlayerStart) || !Number.isInteger(musicPlayerEnd) ||
    !Number.isInteger(musicDataStart) || !Number.isInteger(musicDataEnd) ||
    !Number.isInteger(gameMusicPlayerStart) || !Number.isInteger(gameMusicPlayerEnd) ||
    !Number.isInteger(gameMusicDataStart) || !Number.isInteger(gameMusicDataEnd) ||
    !Number.isInteger(codeBytes) || !Number.isInteger(rodataBytes) ||
    !Number.isInteger(relocatedHullStart) || !Number.isInteger(relocatedHullEnd) ||
    !Number.isInteger(projectileStateBytes)) {
    throw new Error("ld65 label file is missing entry or resident relocation labels");
  }
  if (residentRuntimeSuffixAddress !== residentRuntimeSuffixAddressExpected) {
    throw new Error(`Resident runtime suffix moved from its reviewed $${residentRuntimeSuffixAddressExpected.toString(16)} boundary`);
  }
  if (bootStage2LoadAddress !== 0x7a00 || bootStage2RunAddress !== 0x21c1 ||
    bootStage2Bytes < 1 || bootStage2Bytes > 0x0800 ||
    bootChunkManifestEndAddress - bootChunkManifestAddress !==
      12 + chunkLoaderConstants.maxChunks * 16 + 2) {
    throw new Error("BOOT_STAGE2 lies outside its transient reviewed overlay");
  }
  if (broadsideLoadAddress !== 0x4000 || broadsideRunAddress !== 0x5e10 ||
    broadsideRuntimeBytes > broadsideRuntimeReservedBytes) {
    throw new Error("Broadside relocation lies outside its reviewed load/run ranges");
  }
  if (starfieldLoadAddress !== 0x5a00 || starfieldRunAddress !== 0x54e4 ||
    starfieldRuntimeBytes > 0x092c) {
    throw new Error("Starfield relocation lies outside its reviewed load/run ranges");
  }
  if (a2KernelLoadAddress !== 0x6a00 || a2KernelRunAddress !== 0x9000 ||
    a2KernelBytes < 1 || a2KernelBytes >= 0x0100) {
    throw new Error("A2 kernel lies outside its reviewed $9000-$90FF runtime range");
  }
  if (entityCodeLoadAddress !== 0x6b00 || entityCodeRunAddress !== 0x9100 ||
    entityCodeBytes < 1 || entityCodeBytes > 0x0f00) {
    throw new Error("ENTITY_CODE lies outside its reviewed $9100-$9FFF runtime range");
  }
  const relocatedHullBytes = relocatedHullEnd - relocatedHullStart;
  const entityFeatureCodeBytes = entityCodeBytes - relocatedHullBytes;
  if (relocatedHullBytes < 1 || relocatedHullStart < entityCodeRunAddress ||
    relocatedHullEnd > entityCodeRunAddress + entityCodeBytes) {
    throw new Error("Relocated pixel-exact hull scroll does not lie wholly in ENTITY_CODE");
  }
  if (!isReviewVariant && !encounterDirectorEnabled && entityFeatureCodeBytes >
    frontendH31BaselineEntityFeatureBytes + frontendH31HardRuntimeDeltaBytes) {
    throw new Error(`H3.1 ENTITY_CODE feature body is ${entityFeatureCodeBytes} B; ` +
      `limit is ${frontendH31BaselineEntityFeatureBytes + frontendH31HardRuntimeDeltaBytes} B`);
  }
  if (entityStateRunAddress !== 0x8000 || entityStateBytes !== 0x0100) {
    throw new Error("Entity/effects BSS must occupy exactly $8000-$80FF");
  }
  const broadsideRuntime = linkedPayload.subarray(
    broadsideLoadAddress - loadAddress,
    broadsideLoadAddress - loadAddress + broadsideRuntimeBytes,
  );
  const packedBroadsideRuntime = packBroadsideLzss(broadsideRuntime);
  if (!unpackBroadsideLzss(packedBroadsideRuntime).equals(broadsideRuntime)) {
    throw new Error("Broadside LZSS round trip failed");
  }
  const starfieldRuntime = linkedPayload.subarray(
    starfieldLoadAddress - loadAddress,
    starfieldLoadAddress - loadAddress + starfieldRuntimeBytes,
  );
  const a2KernelRuntime = linkedPayload.subarray(
    a2KernelLoadAddress - loadAddress,
    a2KernelLoadAddress - loadAddress + a2KernelBytes,
  );
  const entityCodeRuntime = linkedPayload.subarray(
    entityCodeLoadAddress - loadAddress,
    entityCodeLoadAddress - loadAddress + entityCodeBytes,
  );
  // The zero-filled PICKUPFILE is the complete stream image: LIGHT_RESIDENT,
  // then PICKUP_CODE, then zero bytes up to the fixed $8B67 collision module.
  const pickupFileBytes = labels.get("__PICKUPFILE_SIZE__");
  const lightResidentBytes = labels.get("__LIGHT_RESIDENT_SIZE__") ?? 0;
  const pickupCodeRuntime = Buffer.from(linkedPayload.subarray(
    pickupCodeFileOffset,
    pickupCodeFileOffset + pickupFileBytes,
  ));
  if ((labels.get("__LIGHT_RESIDENT_RUN__") ?? weaponPickupRuntimeAddress) !==
      weaponPickupRuntimeAddress ||
    pickupCodeRunAddress !== weaponPickupRuntimeAddress + lightResidentBytes ||
    pickupCodeRuntime.length !== pickupFileBytes ||
    lightResidentBytes + pickupCodeBytes > pickupFileBytes) {
    throw new Error("Light kernel, PMG pickup and lower-cell primitive do not fit $8776-$8B66");
  }
  // HEAVY_CODE (the Heavy member veneer, 4.5c) follows LIGHT_CODE in the same
  // LIGHTFILE area, so the extension stream carries both as one ASM tail.
  const lightCodeBytes = (labels.get("__LIGHT_CODE_SIZE__") ?? 0) +
    (labels.get("__HEAVY_CODE_SIZE__") ?? 0);
  // Step 1b: LIGHT_RESIDENT and the STARFIELD resolver tail are gone from this
  // link - the whole kernel is the fourth link now - so what stays here is the
  // shared debris publication in the extension tail.
  const lightPlacement = {
    residentRunAddress: weaponPickupRuntimeAddress,
    residentBytes: lightResidentBytes,
    extensionTailRunAddress: lightCodeRunAddress,
    extensionTailBytes: lightCodeBytes,
  };
  if (lightCodeBytes > 0) {
    const lightCodeFileOffset = labels.get("__LIGHTFILE_FILEOFFS__");
    if (labels.get("__LIGHT_CODE_RUN__") !== lightCodeRunAddress) {
      throw new Error("LIGHT_CODE does not directly follow the C extension composite");
    }
    const lightCode = linkedPayload.subarray(
      lightCodeFileOffset, lightCodeFileOffset + lightCodeBytes);
    cExtensionSegment.cBytes = cExtensionSegment.data.length;
    cExtensionSegment.lightCodeBytes = lightCodeBytes;
    cExtensionSegment.data = Buffer.concat([cExtensionSegment.data, lightCode]);
    cExtensionSegment.packed = packBroadsideLzss(cExtensionSegment.data);
    if (!unpackBroadsideLzss(cExtensionSegment.packed).equals(cExtensionSegment.data)) {
      throw new Error("Hybrid extension + LIGHT_CODE LZSS round trip failed");
    }
    if (cExtensionSegment.runAddress + cExtensionSegment.data.length > 0x9000 ||
      cExtensionSegment.packed.length > 0x3c0) {
      throw new Error(`Hybrid extension + LIGHT_CODE is ${cExtensionSegment.data.length} B raw / ` +
        `${cExtensionSegment.packed.length} B packed; limits are $8C7D-$8FFF and 960 B`);
    }
    directorModule.codeRaw = Buffer.concat(directorModule.codeSegments.map(({ data }) => data));
    directorModule.codePacked = Buffer.concat(
      directorModule.codeSegments.map(({ packed }) => packed));
  }
  const capitalPlayerCollisionModule = await buildResidentModule({
    sourcePath: path.join(rootDirectory, "src", "capital-player-collision.s"),
    configPath: path.join(rootDirectory, "cfg", "capital-player-collision.cfg"),
    stem: "capital-player-collision",
  });
  // Roadmap 4.3: the resident direct-SIO sector reader links on its own at
  // $A000, the shape a raw DFMC record consumes. Transport is a separate step;
  // this builds and bounds the module so its harness test has something to run
  // against and so an overflow is a build error rather than a link surprise.
  const levelRuns = [
    { id: 1, startSector: levelBaseSector, sectors: levelOneSectors },
  ];
  const levelImages = new Map(levelRuns.map((run) =>
    [run.id, buildLevelImage({ id: run.id, sectors: run.sectors })]));
  const levelOneImage = levelImages.get(1);
  const levelDirectoryInclude = renderLevelDirectoryInclude(levelRuns);
  writeFile(path.join(buildDirectory, "level-directory.inc"), levelDirectoryInclude);
  const sectorReaderMainAbiInclude = renderSectorReaderMainAbiInclude(labels);
  writeFile(path.join(buildDirectory, "main-abi.inc"), sectorReaderMainAbiInclude);
  for (const run of levelRuns) {
    writeFile(path.join(buildDirectory, `level-${run.id}.bin`), levelImages.get(run.id));
  }
  // Light multiplicity step 1b (plan §3.1 [C1]): the fourth link. It runs HERE,
  // after main, because the kernel reaches 25 main-link symbols through
  // light-kernel-abi.inc - which is why it cannot live in the Director link,
  // built before main. Its start is not a constant: it is the address after
  // the last byte the Director link's C half used in this same build, so the
  // window stays one pool with no boundary to get wrong.
  const lightKernelMainAbiInclude = renderLightKernelMainAbiInclude(labels);
  writeFile(path.join(buildDirectory, "light-kernel-abi.inc"), lightKernelMainAbiInclude);
  const lightKernelCapacityBytes = hybridWindowEndExclusive - lightKernelAddress;
  const lightKernelConfig =
    fs.readFileSync(path.join(rootDirectory, "cfg", "light-kernel.cfg"), "utf8").replace(
      /LIGHT_KERNEL_RAM:(\s*)start = \$[0-9A-Fa-f]+, size = \$[0-9A-Fa-f]+/,
      (_, spacing) => `LIGHT_KERNEL_RAM:${spacing}start = $${
        lightKernelAddress.toString(16).toUpperCase()}, size = $${
        lightKernelCapacityBytes.toString(16).toUpperCase().padStart(4, "0")}`);
  const lightKernelModule = await buildResidentModule({
    sourcePath: path.join(rootDirectory, "src", "hybrid", "light-kernel.s"),
    configPath: path.join(rootDirectory, "cfg", "light-kernel.cfg"),
    configText: lightKernelConfig,
    stem: "light-kernel",
    extraInputs: {
      "/project/build/light-kernel-abi.inc": Buffer.from(lightKernelMainAbiInclude),
      "/project/build/director-abi.inc": directorAbiInclude,
      "/project/build/fighter-weapons.inc": fighterWeaponsInclude,
      "/project/build/entity-effects.inc": entityEffectsInclude,
      "/project/build/capital-hulls.inc": capitalHullsInclude,
      "/project/build/starfield.inc": starfieldInclude,
    },
  });
  if (lightKernelModule.raw.length > lightKernelCapacityBytes) {
    throw new Error(`4.6 Light kernel exceeds the code window: ` +
      `${lightKernelModule.raw.length} of ${lightKernelCapacityBytes} B above ` +
      `$${lightKernelAddress.toString(16)}`);
  }

  const sectorReaderModule = await buildResidentModule({
    sourcePath: path.join(rootDirectory, "src", "hybrid", "sector-reader.s"),
    configPath: path.join(rootDirectory, "cfg", "sector-reader.cfg"),
    stem: "sector-reader",
    extraInputs: {
      "/project/build/level-directory.inc": Buffer.from(levelDirectoryInclude),
      "/project/build/main-abi.inc": Buffer.from(sectorReaderMainAbiInclude),
    },
  });
  if (sectorReaderModule.raw.length > sectorReaderCapacityBytes) {
    throw new Error(`4.3 sector reader exceeds $A000-$A5FF: ` +
      `${sectorReaderModule.raw.length} of ${sectorReaderCapacityBytes} B`);
  }
  for (const run of levelRuns) {
    if (run.sectors < 1 || run.sectors > levelBufferSectors) {
      throw new Error(`4.3 level ${run.id} is ${run.sectors} sectors; the buffer holds ` +
        `${levelBufferSectors}`);
    }
    if (run.startSector < 1 ||
      run.startSector + run.sectors - 1 > chunkLoaderConstants.atrSectors) {
      throw new Error(`4.3 level ${run.id} runs outside sectors 1..` +
        `${chunkLoaderConstants.atrSectors}`);
    }
    for (const other of levelRuns) {
      if (other === run) continue;
      if (run.startSector < other.startSector + other.sectors &&
        other.startSector < run.startSector + run.sectors) {
        throw new Error(`4.3 level runs ${run.id} and ${other.id} overlap`);
      }
    }
  }
  if (capitalPlayerCollisionModule.raw.length > 0x21) {
    throw new Error(`Capital/player collision module exceeds $8B67-$8B87: ` +
      `${capitalPlayerCollisionModule.raw.length} B`);
  }
  if (weaponPickupRuntimeAddress + pickupCodeRuntime.length !==
    capitalPlayerCollisionAddress) {
    throw new Error("Capital/player collision does not immediately follow pickup runtime: " +
      `$${(weaponPickupRuntimeAddress + pickupCodeRuntime.length).toString(16)} != ` +
      `$${capitalPlayerCollisionAddress.toString(16)}`);
  }
  const weaponPickupPhaseRuntime = Buffer.concat([
    pickupCodeRuntime, capitalPlayerCollisionModule.raw,
  ]);
  const packedPickupStream = packBroadsideLzss(weaponPickupPhaseRuntime);
  // The resident window's independent stream follows in the same raw record;
  // the boot decoder expands it with a second destination (step 4.3).
  const residentWindowSegment = directorModule.windowSegment ?? null;
  const packedWeaponPickupPhaseBank = residentWindowSegment === null ? packedPickupStream :
    Buffer.concat([packedPickupStream, residentWindowSegment.packed]);
  if (!unpackBroadsideLzss(packedWeaponPickupPhaseBank).equals(weaponPickupPhaseRuntime) ||
    (residentWindowSegment !== null && !unpackBroadsideLzss(
      packedWeaponPickupPhaseBank.subarray(packedPickupStream.length))
      .equals(residentWindowSegment.data))) {
    throw new Error("Weapon-pickup phase runtime LZSS round trip failed");
  }
  if (packedWeaponPickupPhaseBank.length > weaponPickupPackedCapacityBytes) {
    throw new Error(`Packed pickup runtime ${packedWeaponPickupPhaseBank.length} B from ` +
      `${pickupCodeBytes} B code plus ${capitalPlayerCollisionModule.raw.length} B collision ` +
      `exceeds the reviewed ${weaponPickupPackedCapacityBytes} B cold staging range; ` +
      `BROADSIDE=${broadsideRuntimeBytes} B, ENTITY_CODE=${entityCodeBytes} B`);
  }
  const bootStage2Runtime = Buffer.from(linkedPayload.subarray(
    bootStage2FileOffset,
    bootStage2FileOffset + bootStage2Bytes,
  ));
  if (bootStage2Runtime.length !== bootStage2Bytes) {
    throw new Error("Linked BOOT_STAGE2 bytes are truncated");
  }
  const starfieldSplit = splitStarfieldStreams(starfieldRuntime, starfieldStagingStreams);
  const packedStarfieldRuntime = Buffer.concat(starfieldSplit.streams.map(({ packed }) => packed));
  if (!Buffer.concat(starfieldSplit.streams.map(({ packed }) => unpackBroadsideLzss(packed)))
    .equals(starfieldRuntime)) {
    throw new Error("Starfield two-stream LZSS round trip failed");
  }
  const packedEntityCodeRuntime = packBroadsideLzss(entityCodeRuntime);
  if (!unpackBroadsideLzss(packedEntityCodeRuntime).equals(entityCodeRuntime)) {
    throw new Error("ENTITY_CODE LZSS round trip failed");
  }
  const entitySpawnDebrisAddress = labels.get("entity_spawn_debris");
  if (!Number.isInteger(entitySpawnDebrisAddress)) {
    throw new Error("Linked entity_spawn_debris symbol is missing");
  }
  // Integration glue is assembled as a separately linked resident module.
  // Derive its one cross-module debris entry from the authoritative main link
  // instead of copying a relocatable ENTITY_CODE address into its source.
  const integrationAbiInclude = Buffer.from(
    `entity_spawn_debris = $${entitySpawnDebrisAddress.toString(16).toUpperCase()}\n`,
  );
  const glueModule = await buildResidentModule({
    sourcePath: path.join(rootDirectory, "src", "integration-glue.s"),
    configPath: path.join(rootDirectory, "cfg", "integration-glue.cfg"),
    stem: "integration-glue",
    extraInputs: {
      "/project/build/capital-hulls.inc": capitalHullsInclude,
      "/project/build/integration-abi.inc": integrationAbiInclude,
      "/project/build/director-abi.inc": directorAbiInclude,
    },
  });
  if (asmDirectorBaseline && (directorModule.raw.length !== expectedDirectorRawBytes ||
    directorModule.packed.length !== expectedDirectorPackedBytes)) {
    throw new Error(`Encounter Director size changed: ${directorModule.raw.length} raw / ` +
      `${directorModule.packed.length} packed`);
  }
  if (glueModule.raw.length !== expectedGlueRawBytes ||
    glueModule.packed.length !== expectedGluePackedBytes) {
    throw new Error(`Integration glue size changed: ${glueModule.raw.length} raw / ` +
      `${glueModule.packed.length} packed`);
  }
  const mergedColdRecord = attachGlueToLowRecord(directorModule, glueModule.raw);
  for (const stream of starfieldSplit.streams) {
    if (stream.packed.length > stream.capacityBytes) {
      throw new Error(`Packed starfield stream ${stream.id} is ${stream.packed.length} B; its ` +
        `staging window at $${stream.address.toString(16)} holds ${stream.capacityBytes} B`);
    }
  }
  if (packedStarfieldRuntime.length > starfieldPackedTotalHardGateBytes) {
    throw new Error(`Packed starfield total ${packedStarfieldRuntime.length} B exceeds the reviewed ` +
      `${starfieldPackedTotalHardGateBytes} B two-stream hard gate (baseline ` +
      `${starfieldPackedTotalBaselineBytes} B)`);
  }
  const [starfieldStreamA, starfieldStreamB] = starfieldSplit.streams;
  if (broadsideRunAddress + broadsideRuntimeReservedBytes > starfieldStreamA.address ||
    starfieldStreamA.address + starfieldStreamA.capacityBytes > hybridArenaAddress) {
    throw new Error("Starfield stream A staging overlaps BROADSIDE or HYBRID_C_ARENA");
  }
  if (starfieldStreamB.address < glueHoldingAddress + expectedGlueRawBytes ||
    starfieldStreamB.address < packedResidentStagingAddress ||
    starfieldStreamB.address + starfieldStreamB.capacityBytes > residentWindowAddress ||
    starfieldStreamB.address + starfieldStreamB.capacityBytes >
      starfieldStreamB.idleWindowEndExclusive) {
    throw new Error("Starfield stream B staging overlaps the GLUE hold or the $8602 resident window");
  }
  const loaderPackedEnd = loaderPackedAddress + loaderAsset.packedBitmap.length;
  const loaderBitmapEnd = loaderAsset.bitmapAddress + loaderAsset.bitmapBytes.length;
  for (const stream of starfieldSplit.streams) {
    const stagingEnd = stream.address + stream.capacityBytes;
    if (stream.address < loaderPackedEnd && stagingEnd > loaderPackedAddress ||
      stream.address < loaderBitmapEnd && stagingEnd > loaderAsset.bitmapAddress ||
      stagingEnd > 0xa000) {
      throw new Error(`Starfield stream ${stream.id} staging overlaps loader source, bitmap destination or ROM`);
    }
  }
  const residentMain = Buffer.from(
    linkedPayload.subarray(0, broadsideLoadAddress - loadAddress),
  );
  const residentPrefixBytes = residentRuntimeSuffixAddress - loadAddress;
  const residentRuntimeSuffix = Buffer.from(residentMain.subarray(residentPrefixBytes));
  const packedResidentRuntime = packBroadsideLzss(residentRuntimeSuffix);
  if (!unpackBroadsideLzss(packedResidentRuntime).equals(residentRuntimeSuffix)) {
    throw new Error("Resident runtime suffix LZSS round trip failed");
  }

  const residentPackedSourceAddress = loadAddress + residentPrefixBytes + bootStage2Runtime.length;
  const broadsidePackedSourceAddress = packedResidentStagingAddress;
  const packedStarfieldAddress = residentPackedSourceAddress + packedResidentRuntime.length;
  const a2KernelSourceAddress = packedStarfieldAddress + packedStarfieldRuntime.length;
  const entityPackedSourceAddress = a2KernelSourceAddress + a2KernelRuntime.length;
  const entityStagedSourceAddress = entityPackedStagingAddress;
  const entityStagedEndAddress = entityStagedSourceAddress + packedEntityCodeRuntime.length;
  const initialPackedSourcesEnd = entityPackedSourceAddress + packedEntityCodeRuntime.length;
  const initialPackedSourcesLastAddress = initialPackedSourcesEnd - 1;
  const glueStagingEndAddress = glueStagingAddress + glueModule.raw.length;
  const packedStarfieldEndAddress = packedStarfieldAddress + packedStarfieldRuntime.length;
  if (packedStarfieldEndAddress > weaponPickupColdStagingAddress) {
    throw new Error(
      `Packed STARFIELD $${packedStarfieldAddress.toString(16)}-$${
        (packedStarfieldEndAddress - 1).toString(16)} overlaps pickup staging from $${
        weaponPickupColdStagingAddress.toString(16)}`,
    );
  }
  const packedStarfieldToPickupMarginBytes =
    weaponPickupColdStagingAddress - packedStarfieldEndAddress;
  // 4.5M-M2 cold placement (measured against this build, not the plan).
  const packedResidentStagingEndExclusive =
    packedResidentStagingAddress + packedResidentRuntime.length;
  const mergedColdRecordEndExclusive = mergedColdRecord === null ? null :
    coldLowGlueRecordAddress + mergedColdRecord.transportData.length;
  if (mergedColdRecord !== null && (
    packedResidentStagingEndExclusive > coldLowGlueRecordAddress ||
    mergedColdRecordEndExclusive > directorPreRunAddress ||
    glueStagingAddress !== coldLowGlueRecordAddress + lowCodeReservationBytes ||
    glueStagingEndAddress !== mergedColdRecordEndExclusive)) {
    throw new Error(
      `Merged low-C/GLUE cold record $${coldLowGlueRecordAddress.toString(16)}-$${
        (mergedColdRecordEndExclusive - 1).toString(16)} must lie above the packed resident ` +
      `staging (ends $${(packedResidentStagingEndExclusive - 1).toString(16)}) and below $9D5E`,
    );
  }
  const abiSegment = directorModule.codeSegments.find(({ name }) => name === "abi");
  if (abiSegment !== undefined && (
    bootA2StagingAddress + a2KernelRuntime.length > abiColdRecordAddress ||
    abiColdRecordAddress + abiSegment.data.length > entityStatePageEndExclusive)) {
    throw new Error(`ABI cold record $${abiColdRecordAddress.toString(16)}-$${
      (abiColdRecordAddress + abiSegment.data.length - 1).toString(16)} must follow A2 staging ` +
      `and stay inside the entity-state page`);
  }
  const entitySourceOverlapsStaging =
    entityPackedSourceAddress < entityStagedEndAddress &&
    entityStagedSourceAddress < initialPackedSourcesEnd;
  if (entitySourceOverlapsStaging &&
      !(entityStagedSourceAddress >= entityPackedSourceAddress)) {
    throw new Error(
      `Overlapping ENTITY_CODE staging $${entityStagedSourceAddress.toString(16)}-$${
        (entityStagedEndAddress - 1).toString(16)} must begin at or above its source $${
        entityPackedSourceAddress.toString(16)}-$${
        initialPackedSourcesLastAddress.toString(16)} for backward-copy safety`,
    );
  }
  if (!(entityStagedEndAddress <= broadsideRunAddress)) {
    throw new Error(
      `Packed ENTITY_CODE staging ending exclusively at $${entityStagedEndAddress.toString(16)} ` +
      `must not exceed BROADSIDE destination $${broadsideRunAddress.toString(16)}`,
    );
  }
  const starfieldRunEndAddress = starfieldRunAddress + starfieldRuntimeBytes;
  const entityStagingStarfieldOverlapStart = Math.max(
    entityStagedSourceAddress, starfieldRunAddress,
  );
  const entityStagingStarfieldOverlapEnd = Math.min(
    entityStagedEndAddress, starfieldRunEndAddress,
  );
  const entityStagingStarfieldOverlapBytes = Math.max(
    0, entityStagingStarfieldOverlapEnd - entityStagingStarfieldOverlapStart,
  );
  if (!(entityStagingStarfieldOverlapBytes > 0)) {
    throw new Error("ENTITY_CODE cold staging must overlap the later starfield destination");
  }

  residentMain.writeUInt16LE(
    residentPackedSourceAddress,
    residentPackedSourceOperand - loadAddress,
  );
  residentMain.writeUInt16LE(
    packedResidentRuntime.length,
    residentPackedSizeOperand - loadAddress,
  );
  residentMain.writeUInt16LE(
    packedWeaponPickupPhaseBank.length,
    pickupPackedSizeOperand - loadAddress,
  );
  residentMain.writeUInt16LE(
    packedStarfieldAddress,
    starfieldPackedSourceOperand - loadAddress,
  );
  residentMain.writeUInt16LE(
    starfieldStreamA.packed.length,
    starfieldPackedSizeOperand - loadAddress,
  );
  residentMain.writeUInt16LE(
    packedStarfieldAddress + starfieldStreamA.packed.length,
    starfieldPackedSourceBOperand - loadAddress,
  );
  residentMain.writeUInt16LE(
    starfieldStreamB.packed.length,
    starfieldPackedSizeBOperand - loadAddress,
  );
  residentMain.writeUInt16LE(
    a2KernelSourceAddress,
    a2KernelSourceOperand - loadAddress,
  );
  residentMain.writeUInt16LE(
    entityPackedSourceAddress,
    entityPackedSourceOperand - loadAddress,
  );
  residentMain.writeUInt16LE(
    entityStagedSourceAddress,
    entityStagedSourceOperand - loadAddress,
  );
  residentMain.writeUInt16LE(
    packedEntityCodeRuntime.length,
    entityPackedSizeOperand - loadAddress,
  );

  const residentPrefix = Buffer.from(residentMain.subarray(0, residentPrefixBytes));
  const manifestOffsetInStage2 = bootChunkManifestAddress - bootStage2RunAddress;
  if (manifestOffsetInStage2 < 0 || manifestOffsetInStage2 +
    12 + chunkLoaderConstants.maxChunks * 16 + 2 > bootStage2Runtime.length) {
    throw new Error("BOOT_STAGE2 manifest does not lie inside its transient code block");
  }
  const initialContentParts = (stage2Bytes) => [
    residentPrefix, stage2Bytes, packedResidentRuntime, packedStarfieldRuntime,
    a2KernelRuntime, packedEntityCodeRuntime, bootPayloadTrailer,
  ];
  const placeholderInitial = Buffer.concat(initialContentParts(bootStage2Runtime));
  if (asmDirectorBaseline && placeholderInitial.length !== expectedInitialContentBytes) {
    throw new Error(`Layout D.2 initial content changed: ${placeholderInitial.length} B; ` +
      `expected ${expectedInitialContentBytes} B; packed ENTITY_CODE ` +
      `${packedEntityCodeRuntime.length} B; BROADSIDE ${broadsideRuntimeBytes} B; ` +
      `ENTITY_CODE ${entityCodeBytes} B; PICKUP_CODE ${pickupCodeBytes} B`);
  }
  const buildTag = (bytes) => crypto.createHash("sha256").update(bytes).digest().subarray(0, 5);
  const transportChunks = [{
    packed: packedBroadsideRuntime,
    raw: broadsideRuntime,
    finalDestination: broadsideRunAddress,
    type: chunkLoaderConstants.chunkTypeLz,
    stagingId: chunkLoaderConstants.stagingBroadside,
    destination: packedResidentStagingAddress,
    buildTag: buildTag(packedBroadsideRuntime),
  }, {
    packed: packedWeaponPickupPhaseBank,
    raw: packedWeaponPickupPhaseBank,
    finalDestination: weaponPickupPackedStagingAddress,
    type: chunkLoaderConstants.chunkTypeRaw,
    stagingId: chunkLoaderConstants.stagingExtension,
    destination: packedResidentStagingAddress,
    buildTag: buildTag(packedWeaponPickupPhaseBank),
  }];
  // 4.5M-M2: GLUE has no record of its own; it rides the merged low-C record.
  for (const segment of directorModule.codeSegments) {
    transportChunks.push({
      packed: segment.transportPacked ?? segment.packed,
      raw: segment.lateCompressed ? segment.packed : segment.transportData ?? segment.data,
      finalDestination: segment.transportAddress ?? segment.runAddress,
      type: segment.lateCompressed
        ? chunkLoaderConstants.chunkTypeRaw
        : chunkLoaderConstants.chunkTypeLz,
      stagingId: chunkLoaderConstants.stagingExtension,
      destination: packedResidentStagingAddress,
      buildTag: buildTag(segment.transportPacked ?? segment.packed),
    });
  }
  // Roadmap 4.3: the sector reader is the ninth record owner decision B
  // opened. RAW, not LZ, so the transport size stays a pure function of the
  // source and the build stays single-pass (plan §4); it lands directly at
  // $A000 the way the arena record lands at $7BD0. It is pushed before the
  // Director record so `transport.records.at(-1)` still names the Director and
  // the `2 + index` mapping over codeSegments keeps its meaning.
  // Light multiplicity step 1b: the Light ASM kernel's own record, landing
  // directly above the Director link's window half. LZ, because unlike the
  // reader it is ordinary 6502 code that packs well and its size does not have
  // to stay a pure function of the source.
  transportChunks.push({
    packed: lightKernelModule.packed,
    raw: lightKernelModule.raw,
    finalDestination: lightKernelAddress,
    type: chunkLoaderConstants.chunkTypeLz,
    stagingId: chunkLoaderConstants.stagingExtension,
    destination: packedResidentStagingAddress,
    buildTag: buildTag(lightKernelModule.packed),
  });
  transportChunks.push({
    packed: sectorReaderModule.raw,
    raw: sectorReaderModule.raw,
    finalDestination: sectorReaderAddress,
    type: chunkLoaderConstants.chunkTypeRaw,
    stagingId: chunkLoaderConstants.stagingExtension,
    destination: packedResidentStagingAddress,
    buildTag: buildTag(sectorReaderModule.raw),
  });
  transportChunks.push({
    packed: directorModule.packed,
    raw: directorModule.raw,
    finalDestination: directorRunAddress,
    type: chunkLoaderConstants.chunkTypeLz,
    stagingId: chunkLoaderConstants.stagingExtension,
    destination: packedResidentStagingAddress,
    buildTag: buildTag(directorModule.packed),
  });
  const transport = buildDfmcV1Transport({
    initialContent: placeholderInitial,
    manifestOffset: residentPrefix.length + manifestOffsetInStage2,
    allowExtendedInitialBlock: encounterDirectorEnabled,
    chunks: transportChunks,
    unpackLz: unpackBroadsideLzss,
  });
  const { initialBoot, manifest: chunkManifest, transportPayload,
    totalOccupiedSectors: totalTransportSectors } = transport;
  const [broadsideChunk, pickupPhaseChunk] = transport.chunkImages;
  const [broadsideRecord, pickupPhaseRecord] = transport.records;
  const directorCodeChunks = directorModule.codeSegments.map((segment, index) => ({
    ...segment,
    chunk: transport.chunkImages[2 + index],
    record: transport.records[2 + index],
  }));
  const mergedColdChunk = directorCodeChunks.find(({ name }) => name === "low") ?? null;
  const glueChunk = mergedColdChunk?.chunk ?? null;
  const glueRecord = mergedColdChunk?.record ?? null;
  const directorChunk = transport.chunkImages.at(-1);
  const directorRecord = transport.records.at(-1);
  const extensionSectors = transport.chunkImages.reduce((sum, chunk) => sum + chunk.sectors, 0);
  const extensionStartSector = broadsideRecord.startSector;
  const initialContent = transport.patchedInitialContent;
  const patchedBootStage2 = Buffer.from(initialContent.subarray(
    residentPrefix.length, residentPrefix.length + bootStage2Runtime.length));
  const bootSectors = initialBoot.sectors;
  residentPrefix[1] = bootSectors;
  residentMain[1] = bootSectors;
  if (bootSectors < 1 || bootSectors > 255 || transportPayload.length !==
    totalTransportSectors * chunkLoaderConstants.atrSectorBytes) {
    throw new Error("Dynamic initial/extension sector layout is inconsistent");
  }
  const frozenRecordShape = transport.records.map((record) => [
    record.startSector, record.sectorCount, record.packedLength,
    record.rawLength, record.finalDestination,
  ]);
  const expectedDestinations = [broadsideRunAddress, weaponPickupPackedStagingAddress,
    ...directorModule.codeSegments.map((segment) =>
      segment.transportAddress ?? segment.runAddress),
    // Light multiplicity step 1b: the Light ASM kernel's record sits between
    // the Director code segments and the reader, matching the push order above.
    lightKernelAddress,
    sectorReaderAddress,
    directorRunAddress];
  // 4.5M-M3 proof: the arena's own direct-landing record is the only transport
  // record, staging window, hold or backup that touches $7BD0-$7F0F.
  const basicWindowSegmentIndex =
    directorModule.codeSegments.findIndex(({ name }) => name === "hybrid-window");
  const basicWindowSegment = basicWindowSegmentIndex < 0
    ? null : directorModule.codeSegments[basicWindowSegmentIndex];
  const basicWindowRecord = basicWindowSegmentIndex < 0
    ? null : transport.records[2 + basicWindowSegmentIndex];
  const basicWindowChunk = basicWindowSegmentIndex < 0
    ? null : transport.chunkImages[2 + basicWindowSegmentIndex];
  if (basicWindowRecord !== null && (basicWindowRecord.finalDestination !== hybridWindowAddress ||
    basicWindowRecord.finalDestination + basicWindowRecord.rawLength > hybridWindowEndExclusive)) {
    throw new Error(`Owner decision X: the window record must land inside ` +
      `$B600-$BBFF, not $${basicWindowRecord.finalDestination.toString(16)}`);
  }
  // Owner decision X replaces 4.3's "the reader owns the whole window" rule:
  // the two links now own disjoint halves, so the check is that the Director's
  // half really starts above the level buffer the reader fills. Before the
  // decision the Director's declaration was only harmless while it stayed
  // empty; now it is harmless because the ranges cannot meet.
  const levelBufferEndExclusive = levelBufferAddress + levelBufferCapacityBytes;
  if (hybridWindowAddress < levelBufferEndExclusive) {
    throw new Error(`Owner decision X: HYBRID_C_WINDOW at ` +
      `$${hybridWindowAddress.toString(16)} is inside the ${levelBufferSectors}-sector level ` +
      `buffer $${levelBufferAddress.toString(16)}-` +
      `$${(levelBufferEndExclusive - 1).toString(16)}. Two links cannot both own the window.`);
  }
  const arenaRecordIndex = directorModule.codeSegments.findIndex(({ name }) => name === "arena");
  const arenaRecord = arenaRecordIndex < 0 ? null : transport.records[2 + arenaRecordIndex];
  const arenaChunk = arenaRecordIndex < 0 ? null : transport.chunkImages[2 + arenaRecordIndex];
  const coldOwnersInArena = [
    ...transport.records.map((record) => ({
      owner: `record ${record.finalDestination.toString(16)}`,
      start: record.finalDestination, endExclusive: record.finalDestination + record.rawLength,
    })),
    ...starfieldSplit.streams.map((stream) => ({
      owner: `starfield stream ${stream.id} staging`,
      start: stream.address, endExclusive: stream.address + stream.capacityBytes,
    })),
    { owner: "A2 staging", start: bootA2StagingAddress,
      endExclusive: bootA2StagingAddress + a2KernelRuntime.length },
    { owner: "GLUE hold", start: glueHoldingAddress,
      endExclusive: glueHoldingAddress + glueModule.raw.length },
    { owner: "pause-screen backup", start: starfieldStagingAddress,
      endExclusive: starfieldStagingAddress + 0x3c0 },
  ].filter(({ start, endExclusive }) =>
    start < hybridArenaEndExclusive && endExclusive > hybridArenaAddress);
  const foreignOwnersInArena = coldOwnersInArena.filter(({ start, endExclusive }) =>
    !(arenaRecord !== null && start === hybridArenaAddress &&
      endExclusive === hybridArenaAddress + arenaRecord.rawLength));
  if (foreignOwnersInArena.length !== 0 || (directorModule.implementation === "cc65-c" && (
    arenaRecord === null || arenaRecord.finalDestination !== hybridArenaAddress ||
    arenaRecord.finalDestination + arenaRecord.rawLength > hybridArenaEndExclusive ||
    transport.records.length > chunkLoaderConstants.maxChunks))) {
    throw new Error(`4.5M-M3: $7BD0-$7F0F must be owned only by the arena record: ${
      coldOwnersInArena.map(({ owner }) => owner).join(", ")}`);
  }
  if ((asmDirectorBaseline && bootSectors !== 103) ||
    transportPayload.length !== totalTransportSectors * 128 ||
    JSON.stringify(frozenRecordShape.map((record) => record[4])) !==
      JSON.stringify(expectedDestinations)) {
    throw new Error(`Layout D.2 transport topology changed: ${JSON.stringify(frozenRecordShape)}`);
  }
  if (initialBoot.bytes.readUInt16LE(2) !== loadAddress) {
    throw new Error("Assembled boot header has an unexpected load address");
  }
  if (initialBoot.bytes.readUInt16LE(4) !== bootInitAddress) {
    throw new Error("Assembled boot header has an unexpected init address");
  }

  // Owner decision B (2026-09-20): the XEX must keep working with BASIC both
  // enabled and disabled. The binary loader places blocks before RUNAD is
  // reached, so a block at $A000 would be written into the BASIC ROM and lost
  // whenever the player starts with BASIC enabled. A two-byte INITAD record
  // right after the first block - which is where disable_basic_rom already
  // lives, inside the fixed bootstrap prefix at $21AD - makes the loader call
  // it before any later block is placed. It is idempotent: it forces PORTB
  // bit 1 and writes BASICF, and the stage-2 entries still call it themselves.
  const disableBasicRomAddress = labels.get("disable_basic_rom");
  if (!Number.isInteger(disableBasicRomAddress)) {
    throw new Error("disable_basic_rom is missing from the link");
  }
  const initAdRecord = Buffer.alloc(2);
  initAdRecord.writeUInt16LE(disableBasicRomAddress, 0);
  // Any block at $A000 or above needs the INITAD record: it runs
  // disable_basic_rom before the block is loaded, so the window is RAM by the
  // time the loader writes there. RUNAD would be far too late. The 4.3 reader
  // is such a block, so the record is emitted whenever either it or a Director
  // window segment is present.
  const xexWindowSegments = directorModule.codeSegments.filter((segment) =>
    (segment.transportAddress ?? segment.runAddress) >= basicWindowAddress);
  const xexNeedsWindowInitAd = xexWindowSegments.length > 0 ||
    sectorReaderAddress >= basicWindowAddress;
  const xex = makeXexSegments([
    { start: loadAddress, data: initialBoot.bytes },
    ...(xexNeedsWindowInitAd ? [{ start: 0x02e2, data: initAdRecord }] : []),
    { start: broadsideRunAddress, data: broadsideRuntime },
    { start: weaponPickupPackedStagingAddress, data: packedWeaponPickupPhaseBank },
    ...directorModule.codeSegments.map((segment) => ({
      start: segment.transportAddress ?? segment.runAddress,
      data: segment.lateCompressed ? segment.packed : segment.transportData ?? segment.data,
    })),
    { start: directorRunAddress, data: directorModule.raw },
    // Roadmap 4.3: the reader itself, and behind it the level-1 image as an
    // XEX-only block at LEVEL_BUFFER (owner decision 1). The ATR carries no
    // such block: it reads level 1 over SIO at START GAME, which is what makes
    // the four ATR boot-smoke sessions exercise the reader end to end, while
    // XEX sessions take the resident-skip path and never touch the wire.
    { start: lightKernelAddress, data: lightKernelModule.raw },
    { start: sectorReaderAddress, data: sectorReaderModule.raw },
    { start: levelBufferAddress, data: levelOneImage },
  ], bootStage2XexEntry);
  const atr = makeAtr(transportPayload, levelRuns.map((run) => ({
    startSector: run.startSector, data: levelImages.get(run.id),
  })));
  const runtimeArtifacts = runtimeArtifactSet({ boot: transportPayload, xex, atr });
  const cpuRuntimeTiming = isReviewVariant || twoPmgRaiderPrototype || skipRuntimeMeasurement
    ? null : measureRuntimeCycles({
    residentMain,
    loadAddress,
    broadsideRuntime,
    broadsideRunAddress,
    starfieldRuntime,
    starfieldRunAddress,
    a2KernelRuntime,
    a2KernelRunAddress,
    entityCodeRuntime,
    entityCodeRunAddress,
    weaponPickupPhaseBank: null,
    weaponPickupPhaseBankAddress: weaponPickupRuntimeAddress,
    pickupCodeRuntime: Buffer.concat([
      pickupCodeRuntime, capitalPlayerCollisionModule.raw,
    ]),
    pickupCodeRunAddress: weaponPickupRuntimeAddress,
    integrationGlueRuntime: glueModule.raw,
    integrationGlueRunAddress: glueFinalAddress,
    directorRuntime: directorModule.raw,
    directorRunAddress,
    // The Light ASM kernel is its own link (step 1b), so the CPU harness needs
    // it placed like any other resident image or every Light hook runs into $00.
    directorAdditionalSegments: [
      ...(directorModule.windowSegment === undefined
        ? directorModule.codeSegments
        : [...directorModule.codeSegments, directorModule.windowSegment]),
      { runAddress: lightKernelAddress, data: lightKernelModule.raw },
    ],
    capitalPlayerCollisionRuntime: capitalPlayerCollisionModule.raw,
    capitalPlayerCollisionRunAddress: capitalPlayerCollisionAddress,
    labels,
    segmentSizes: {
      code: codeBytes,
      rodata: rodataBytes,
      projectiles: projectileStateBytes,
      starfield: starfieldRuntimeBytes,
      broadside: broadsideRuntimeBytes,
      a2Kernel: a2KernelBytes,
      entityCode: entityCodeBytes,
      pickupCode: pickupCodeBytes,
      entityState: entityStateBytes,
    },
  });
  const wallTracePath = path.join(rootDirectory, "docs", "runtime-wall-trace.json");
  let wallTrace = null;
  if (!isReviewVariant && !candidateBuild) {
    if (!fs.existsSync(wallTracePath)) {
      throw new Error("Final build requires a complete runtime wall trace; run the candidate and trace phases first");
    }
    wallTrace = JSON.parse(fs.readFileSync(wallTracePath, "utf8"));
    validateRuntimeEvidenceBinding(wallTrace, runtimeArtifacts);
    if (wallTrace.gate?.passed !== true) {
      throw new Error("Final build requires runtime evidence that passes every current gate");
    }
  }
  const runtimeTiming = cpuRuntimeTiming === null ? null : {
    ...cpuRuntimeTiming,
    cpu_cycles_dma_off: cpuRuntimeTiming.cpuDmaOff.heaviestMainLoopCycles,
    cpu_comparison_headroom:
      cpuRuntimeTiming.palFrameCycles - cpuRuntimeTiming.cpuDmaOff.heaviestMainLoopCycles,
    measured_wall_cycles_dma_on: wallTrace?.semantics.measured_wall_cycles_dma_on ?? null,
    measured_physical_headroom: wallTrace?.semantics.measured_physical_headroom ?? null,
    estimated_additive_cycles: cpuRuntimeTiming.estimatedAdditive.cycles,
    wallTrace: wallTrace === null ? null : {
      reportPath: "docs/runtime-wall-trace.json",
      reportSha256: sha256(fs.readFileSync(wallTracePath)),
      artifact: wallTrace.artifact,
      emulator: wallTrace.emulator,
      semantics: wallTrace.semantics,
      gate: wallTrace.gate,
      instrumentation: wallTrace.instrumentation,
      replay: {
        baseline_measured_frames: wallTrace.replay.baseline_measured_frames,
        targeted_measured_frames: wallTrace.replay.targeted_measured_frames,
        parallax_cadence_measured_frames:
          wallTrace.replay.parallax_cadence_measured_frames,
      },
    },
  };
  const destructibleDebrisRuntimeCodeBytes = codeBytes + starfieldRuntimeBytes +
    broadsideRuntimeBytes + a2KernelBytes + entityCodeBytes + pickupCodeBytes;
  if (asmDirectorBaseline && encounterDirectorEnabled &&
    destructibleDebrisRuntimeCodeBytes !== expectedLinkedRuntimeBytes) {
    throw new Error(`Layout D.2 linked runtime changed: ${destructibleDebrisRuntimeCodeBytes} B; ` +
      `expected ${expectedLinkedRuntimeBytes} B`);
  }
  if (!isReviewVariant && !encounterDirectorEnabled && destructibleDebrisRuntimeCodeBytes >
    frontendH31BaselineRuntimeCodeBytes + frontendH31HardRuntimeDeltaBytes) {
    throw new Error(`H3.1 linked runtime is ${destructibleDebrisRuntimeCodeBytes} B; ` +
      `limit is ${frontendH31BaselineRuntimeCodeBytes + frontendH31HardRuntimeDeltaBytes} B`);
  }
  // The historical debris/Interceptor code budgets describe their accepted commits.
  // New weapon code consumes only the explicit post-compaction payload reserve;
  // the live linked total remains reported below instead of being misclassified
  // as growth of either completed feature.
  const directorTotalBytes = directorModule.codeRaw.length + directorModule.raw.length +
    (directorModule.windowSegment?.data.length ?? 0);
  const directorAdditionalStateBytes = directorModule.implementation === "cc65-c"
    ? directorModule.footprint.bssBytes : 0;
  const directorResidencyDelta = directorTotalBytes - expectedDirectorRawBytes +
    directorAdditionalStateBytes;
  const hybridResidencyDelta = directorResidencyDelta +
    (destructibleDebrisRuntimeCodeBytes - expectedLinkedRuntimeBytes);
  const baselineSimultaneousResidencyBytes = 17648 + capitalPlayerCollisionModule.raw.length +
    (expectedLinkedRuntimeBytes - 17203);
  const simultaneousResidencyBytes = baselineSimultaneousResidencyBytes + hybridResidencyDelta;
  const safeResidencyBytes = 4539 - capitalPlayerCollisionModule.raw.length -
    (expectedLinkedRuntimeBytes - 17203) - hybridResidencyDelta;

  const manifest = {
    formatVersion: 1,
    gameVersion,
    target: "Atari 65XE PAL / 64 KB",
    toolchain: "romdev-toolchain-cc65@0.1.3",
    encounterDirector: {
      enabled: encounterDirectorEnabled,
      implementation: directorModule.implementation,
      layout: directorModule.implementation === "cc65-c"
        ? "Hybrid cc65 C Director + stable ca65 ABI veneer"
        : "Layout D.2 ca65 ASM baseline",
      levelWorldRows: 3712,
      phaseCount: 8,
      initialContentBytes: placeholderInitial.length,
      linkedRuntimeBytes: destructibleDebrisRuntimeCodeBytes,
      simultaneousResidencyBytes,
      safeResidencyBytes,
      residencyDeltaBytes: directorResidencyDelta,
      totalMigrationResidencyDeltaBytes: hybridResidencyDelta,
      glue: {
        stagingAddress: glueStagingAddress,
        holdingAddress: glueHoldingAddress,
        finalAddress: glueFinalAddress,
        rawBytes: glueModule.raw.length,
        packedBytes: glueModule.packed.length,
        transport: "4.5M-M2: offset $F8 of the merged low-C/GLUE LZ record",
      },
      coldRecordRelocation: {
        step: "4.5M-M2",
        abiRecord: { address: abiColdRecordAddress,
          endExclusive: abiColdRecordAddress + directorModule.footprint.abiBytes,
          consumedBy: "publish_director_abi, before unpack_entity_runtime and init_entity_effects" },
        mergedRecord: mergedColdRecord === null ? null : {
          address: coldLowGlueRecordAddress,
          endExclusive: mergedColdRecordEndExclusive,
          rawBytes: mergedColdRecord.transportData.length,
          packedBytes: mergedColdRecord.transportPacked.length,
          layout: [
            { part: "low-C", offset: 0, bytes: lowCodeReservationBytes,
              usedBytes: mergedColdRecord.data.length, runtime: 0x8b88 },
            { part: "GLUE", offset: lowCodeReservationBytes, bytes: glueModule.raw.length,
              hold: glueHoldingAddress, runtime: glueFinalAddress },
          ],
          packedResidentStagingEndExclusive,
          marginAbovePackedResidentBytes: coldLowGlueRecordAddress - packedResidentStagingEndExclusive,
          marginBelowDirectorPreBytes: directorPreRunAddress - mergedColdRecordEndExclusive,
          consumedBy: "publish_director_abi -> DIRECTOR_PUBLISH_LOW, stage_glue_holding; " +
            "all before unpack_entity_runtime expands $9100-$9D5D",
        },
      },
      director: {
        address: directorRunAddress,
        endExclusive: directorRunAddress + directorModule.raw.length,
        reservedEndExclusive: directorGuardAddress,
        rawBytes: directorTotalBytes,
        packedBytes: directorModule.codePacked.length + directorModule.packed.length,
        codeAddress: directorModule.codeSegments[0]?.runAddress ?? null,
        codeBytes: directorModule.footprint.abiBytes + directorModule.footprint.codeBytes,
        rodataAddress: directorRunAddress,
        rodataBytes: directorModule.footprint.rodataBytes,
        placements: [
          ...directorModule.codeSegments.map(({ name, runAddress, data }) => ({
            name, runAddress, bytes: data.length,
          })),
          { name: "high", runAddress: directorRunAddress, bytes: directorModule.raw.length },
          ...(directorModule.windowSegment === undefined ? [] : [{
            name: "window",
            runAddress: directorModule.windowSegment.runAddress,
            bytes: directorModule.windowSegment.data.length,
          }]),
        ],
        footprint: directorModule.footprint,
      },
      capitalPlayerCollision: {
        address: capitalPlayerCollisionAddress,
        transportAddress: weaponPickupPackedStagingAddress,
        packedStreamOffset: pickupCodeRuntime.length,
        endExclusive: capitalPlayerCollisionAddress + capitalPlayerCollisionModule.raw.length,
        rawBytes: capitalPlayerCollisionModule.raw.length,
        packedBytes: capitalPlayerCollisionModule.packed.length,
        record: pickupPhaseRecord,
      },
      guard: { address: directorGuardAddress, bytes: 6 },
    },
    buildVariant: enemyReviewHarness
      ? "enemy-review"
      : enemyCombatReviewHarness
        ? "enemy-combat-review"
        : paletteCandidate
          ? `enemy-palette-${enemyPaletteSlug}`
          : candidateBuild
            ? "candidate"
            : "release",
    loadAddress,
    startAddress,
    bootInitAddress,
    bootSectors,
    payloadBytes: transportPayload.length,
    bootPayloadTrailer: {
      address: loadAddress + initialContent.length - bootPayloadTrailer.length,
      bytes: bootPayloadTrailer.length,
      ascii: "DFB1",
      hex: bootPayloadTrailer.toString("hex"),
      sourceOwned: true,
    },
    payloadBudget: {
      historicalRuntimeHeadroom: {
        baselineBytes: acceptedMenuMusicPayloadBytes,
        approvedDeltaBytes: runtimeHeadroomPayloadLimit,
        limitBytes: acceptedMenuMusicPayloadBytes + runtimeHeadroomPayloadLimit,
        finalBytes: acceptedRuntimeHeadroomPayloadBytes,
        preservedForHistory: true,
      },
      entityEffectsFoundation: {
        baselineBytes: acceptedRuntimeHeadroomPayloadBytes,
        approvedDeltaBytes: entityEffectsFoundationPayloadBudget,
        actualDeltaBytes: debrisVisualPolishPayloadLimitBytes - acceptedRuntimeHeadroomPayloadBytes,
        limitBytes: entityEffectsFoundationPayloadLimit,
        remainingBytes: entityEffectsFoundationPayloadLimit - debrisVisualPolishPayloadLimitBytes,
      },
      debrisVisualPolish: {
        limitBytes: debrisVisualPolishPayloadLimitBytes,
        actualBytes: debrisVisualPolishPayloadLimitBytes,
        remainingBytes: 0,
        maximumBootSectors: 128,
      },
      destructibleDebris: {
        limitBytes: debrisVisualPolishPayloadLimitBytes,
        actualBytes: debrisVisualPolishPayloadLimitBytes,
        remainingBytes: 0,
        maximumBootSectors: 128,
      },
      enemyBreakupEffects: {
        limitBytes: debrisVisualPolishPayloadLimitBytes,
        actualBytes: debrisVisualPolishPayloadLimitBytes,
        remainingBytes: 0,
        maximumBootSectors: 128,
      },
      runtimePayloadCompaction: {
        minimumRecoveredReserveBytes: minimumRuntimeCompactionReserveBytes,
        baselineReserveBytes: acceptedRuntimeCompactionReserveBytes,
        reserveBytes: 73,
        recoveredReserveBytes: acceptedRuntimeCompactionReserveBytes,
        residentSuffixGrossSavingsBytes:
          residentRuntimeSuffix.length - packedResidentRuntime.length,
        relocatedColdInitBytes:
          entityCodeBytes - runtimePayloadCompactionBaselineEntityCodeBytes,
        relocatedColdInitPackedCostBytes:
          packedEntityCodeRuntime.length - runtimePayloadCompactionBaselinePackedEntityBytes,
        reserveAddress: 0x5fb3,
        reserveEndAddress: 0x5ffb,
        sourceOwned: true,
        fillByte: 0,
        preservedForHistory: true,
      },
      weaponPickupRapidFire: {
        baselineReserveBytes: acceptedRuntimeCompactionReserveBytes,
        minimumRemainingReserveBytes: minimumWeaponPickupReserveBytes,
        remainingReserveBytes: 73,
        consumedReserveBytes:
          acceptedRuntimeCompactionReserveBytes - 73,
      },
      weaponPickupSpreadShot: {
        baselineReserveBytes: 518,
        minimumRemainingReserveBytes: 64,
        remainingReserveBytes: 73,
        consumedReserveBytes: 518 - 73,
        preservedForHistory: true,
      },
    },
    transportCapacity: {
      format: "DFMC-v1 multi-chunk",
      initialBootBytes: initialBoot.bytes.length,
      initialBootContentBytes: initialContent.length,
      initialBootEnvelopeBytes: initialBoot.envelopeBytes,
      initialBootSectors: bootSectors,
      extensionBytes: transportPayload.length - initialBoot.bytes.length,
      extensionSectors,
      totalTransportBytes: transportPayload.length,
      totalTransportSectors,
      remainingAtrSectors: chunkLoaderConstants.atrSectors - totalTransportSectors,
      remainingAtrTransportBytes:
        (chunkLoaderConstants.atrSectors - totalTransportSectors) * chunkLoaderConstants.atrSectorBytes,
      architecturalAdditionalCapacityBytes:
        Math.min(
          (chunkLoaderConstants.atrSectors - totalTransportSectors) * chunkLoaderConstants.atrSectorBytes,
          (chunkLoaderConstants.maxChunks - transport.records.length) *
            50 * chunkLoaderConstants.atrSectorBytes,
        ),
      maximumExtensionChunkBytes: 50 * chunkLoaderConstants.atrSectorBytes,
      maximumChunkCount: chunkLoaderConstants.maxChunks,
      maximumNewSimultaneousResidencyBytes: 7993,
      remainingSafeResidencyBytes:
        7993 - (destructibleDebrisRuntimeCodeBytes - shieldBoosterBaselineRuntimeCodeBytes) -
          capitalPlayerCollisionModule.raw.length - directorResidencyDelta,
      bootOnlyStaging: { address: packedResidentStagingAddress, bytes: 0x1954 },
      loaderResidentBytes: 0,
      stage2: {
        runAddress: bootStage2RunAddress,
        loadAddress: bootStage2LoadAddress,
        bytes: bootStage2Bytes,
        xexEntryAddress: bootStage2XexEntry,
        xexEntryOffset: bootStage2XexEntry - bootStage2RunAddress,
        overwrittenByResidentSuffix: true,
      },
      manifest: {
        address: bootChunkManifestAddress,
        bytes: chunkManifest.length,
        crc16: chunkManifest.readUInt16LE(chunkManifest.length - 2),
        parsed: parseChunkManifest(chunkManifest),
      },
    },
    residentRuntime: {
      loadAddress,
      runAddress: loadAddress,
      rawBytes: residentMain.length,
      prefixBytes: residentPrefix.length,
      prefixEndAddress: residentRuntimeSuffixAddress - 1,
      suffixAddress: residentRuntimeSuffixAddress,
      suffixRawBytes: residentRuntimeSuffix.length,
      suffixPackedBytes: packedResidentRuntime.length,
      packedSourceAddress: residentPackedSourceAddress,
      stagingAddress: packedResidentStagingAddress,
      stagedEndAddress: packedResidentStagingAddress + packedResidentRuntime.length - 1,
      compression: "LZ-10/5",
    },
    broadsideRuntime: {
      loadAddress: broadsideLoadAddress,
      runAddress: broadsideRunAddress,
      bytes: broadsideRuntimeBytes,
      reservedBytes: broadsideRuntimeReservedBytes,
      packedBytes: packedBroadsideRuntime.length,
      packedSourceAddress: broadsidePackedSourceAddress,
      compression: "LZ-10/5",
      externalChunk: {
        startSector: extensionStartSector,
        sectors: broadsideChunk.sectors,
        transportBytes: broadsideChunk.bytes.length,
        packedBytes: packedBroadsideRuntime.length,
        rawBytes: broadsideRuntime.length,
        crc16: broadsideChunk.storageCrc16,
        stagingAddress: packedResidentStagingAddress,
        stagingEndAddress: packedResidentStagingAddress + broadsideChunk.bytes.length - 1,
        finalAddress: broadsideRunAddress,
      },
    },
    integrationGlue: {
      transportAddress: glueStagingAddress,
      transportRecordAddress: coldLowGlueRecordAddress,
      transportRecordOffset: lowCodeReservationBytes,
      holdingAddress: glueHoldingAddress,
      finalAddress: glueFinalAddress,
      bytes: glueModule.raw.length,
      packedBytes: glueModule.packed.length,
      externalChunk: glueRecord === null ? null : {
        sharedWith: "low-C image (4.5M-M2 merged record)",
        startSector: glueRecord.startSector,
        sectors: glueChunk.sectors,
        transportBytes: glueChunk.bytes.length,
        crc16: glueChunk.storageCrc16,
      },
    },
    directorRuntime: {
      implementation: directorModule.implementation,
      runAddress: directorRunAddress,
      endExclusive: directorRunAddress + directorModule.raw.length,
      reservedEndExclusive: directorGuardAddress,
      bytes: directorModule.raw.length,
      packedBytes: directorModule.packed.length,
      externalChunk: {
        startSector: directorRecord.startSector,
        sectors: directorChunk.sectors,
        transportBytes: directorChunk.bytes.length,
        crc16: directorChunk.storageCrc16,
      },
    },
    directorCodeRuntime: null,
    // Owner decision B (2026-09-20): a two-byte INITAD record placed between
    // the first XEX block and every later one, so the binary loader calls
    // disable_basic_rom before it places a block inside $A000-$BC1F. Without
    // it, a XEX started with BASIC enabled would write that block into ROM.
    xexInitAd: !xexNeedsWindowInitAd ? null : {
      segmentIndex: 1,
      address: 0x02e2,
      target: disableBasicRomAddress,
      reason: "owner decision B: the window block must be placed into RAM, not BASIC ROM",
    },
    // Roadmap 4.3. The reader and the level buffer are both window residents;
    // the level-1 image is an XEX-only block (owner decision 1), so xexBlocks
    // counts what the XEX carries and the ATR does not.
    sectorReader: {
      address: sectorReaderAddress,
      bytes: sectorReaderModule.raw.length,
      capacityBytes: sectorReaderCapacityBytes,
      freeBytes: sectorReaderCapacityBytes - sectorReaderModule.raw.length,
      transport: "own DFMC record, RAW, direct landing at $A000",
      levelBuffer: {
        address: levelBufferAddress,
        capacityBytes: levelBufferCapacityBytes,
        sectors: levelBufferSectors,
      },
      levels: levelRuns.map((run) => ({
        id: run.id,
        startSector: run.startSector,
        sectors: run.sectors,
        bytes: levelImages.get(run.id).length,
        file: `level-${run.id}.bin`,
        origin: "ATR: read over SIO at START GAME; XEX: resident block, no SIO",
      })),
      xexBlocks: 2,
    },
    lightWingman: lightPlacement,
    // Light multiplicity step 1b (plan §3.1 [C1]): the fourth link. Its start
    // is the Director link's window end, so the two halves of the 1,536-B
    // window meet exactly and neither is sized by an estimate.
    lightKernel: {
      address: lightKernelAddress,
      bytes: lightKernelModule.raw.length,
      packedBytes: lightKernelModule.packed.length,
      capacityBytes: lightKernelCapacityBytes,
      freeBytes: lightKernelCapacityBytes - lightKernelModule.raw.length,
      endExclusive: lightKernelAddress + lightKernelModule.raw.length,
      windowLimit: hybridWindowEndExclusive,
      cHalfEndExclusive: lightKernelAddress,
      vectors: Object.fromEntries(LIGHT_KERNEL_VECTORS.map(([name], index) =>
        [name, lightKernelAddress + index * 3])),
      transport: "own DFMC record, LZ, direct landing above the Director window half",
    },
    residentCapacity: residentWindowSegment === null ? null : {
      window: {
        address: residentWindowAddress,
        endExclusive: residentWindowAddress + residentWindowBytes,
        bytes: residentWindowBytes,
        usedBytes: residentWindowSegment.data.length,
        freeBytes: residentWindowBytes - residentWindowSegment.data.length,
        owner: "HYBRID_C_SECTOR",
        packedBytes: residentWindowSegment.packed.length,
        transport: "second LZ stream of the pickup/collision record",
        glueHoldingAddress,
      },
      arena: directorModule.arenaSegment === undefined ? null : (() => {
        const arena = directorModule.arenaSegment;
        // Worst case for sizing the record: the full capacity of pseudo-random bytes.
        const worstPacked = packBroadsideLzss(deterministicCapacityBytes(hybridArenaCapacityBytes));
        const sectorsFor = (packedBytes) =>
          Math.ceil((packedBytes + chunkLoaderConstants.chunkFooterBytes) / 128);
        return {
          step: "4.5M-M3",
          owner: "HYBRID_C_ARENA",
          address: hybridArenaAddress,
          endExclusive: hybridArenaEndExclusive,
          capacityBytes: hybridArenaCapacityBytes,
          usedBytes: arena.data.length,
          freeBytes: hybridArenaCapacityBytes - arena.data.length,
          asmBytes: arena.arena.asmBytes,
          codeBytes: arena.arena.codeBytes,
          rodataBytes: arena.arena.rodataBytes,
          segments: ["HYBRID_ASM_ARENA", "HYBRID_C_ARENA", "HYBRID_C_ARENA_RODATA"],
          anchor: "hybrid_arena_anchor (1-B rts, HYBRID_ASM_ARENA): keeps the record non-empty",
          replaces: "HYBRID_C_HEAVY window $7E12-$7F04 (243 B) and its 44-B transport tail " +
            "in the merged low-C/GLUE record",
          boundedBy: { below: "starfield stream A staging / pause-screen backup end $7BD0",
            above: "A2 display lists $7F10" },
          transport: arenaRecord === null ? null : {
            record: "own DFMC record, LZ, stagingId extension",
            finalDestination: arenaRecord.finalDestination,
            startSector: arenaRecord.startSector,
            sectors: arenaRecord.sectorCount,
            rawBytes: arenaRecord.rawLength,
            packedBytes: arenaRecord.packedLength,
            paddingBytes: arenaChunk.sectors * 128 - arenaRecord.packedLength -
              chunkLoaderConstants.chunkFooterBytes,
            landing: "direct: ATR stage 2 decodes it to $7BD0, the XEX segment loads at $7BD0; " +
              "no hold, no publish copy",
          },
          ownersInArena: coldOwnersInArena,
          worstCaseFullArenaPackedBytes: worstPacked.length,
          worstCaseFullArenaSectors: sectorsFor(worstPacked.length),
        };
      })(),
      basicWindow: {
        step: "owner decision X",
        owner: "HYBRID_C_WINDOW",
        address: hybridWindowAddress,
        guardAddress: basicWindowGuardAddress,
        endExclusive: hybridWindowEndExclusive,
        capacityBytes: hybridWindowCapacityBytes,
        guardBytes: basicWindowEndExclusive - basicWindowGuardAddress,
        usedBytes: directorModule.basicWindowBytes,
        freeBytes: hybridWindowCapacityBytes - directorModule.basicWindowBytes,
        availability: "unconditional: disable_basic_rom forces PORTB bit 1 and writes " +
          "BASICF at every stage-2 entry",
        boundedBy: { below: `${levelBufferSectors}-sector level buffer $A600-$B5FF`,
          above: "sector reader BSS $BC00-$BC19, then the guard and the OS screen " +
            "$BC20-$BFFF (RAMTOP $C0 when BASIC is disabled at coldstart)" },
        guard: "HYBRID_C_WINDOW_GUARD $BC1A-$BC1F, reserved with no segment, plus the ld65 " +
          "assert \"HYBRID_C_WINDOW reaches the sector reader BSS at $BC00\"",
        contents: basicWindowSegment === null ? null
          : "the Light kernel: HYBRID_ASM_WINDOW + HYBRID_C_WINDOW + HYBRID_C_WINDOW_RODATA",
        transport: basicWindowRecord === null ? null : {
          record: "own DFMC record, LZ, stagingId extension",
          finalDestination: basicWindowRecord.finalDestination,
          startSector: basicWindowRecord.startSector,
          sectors: basicWindowRecord.sectorCount,
          rawBytes: basicWindowRecord.rawLength,
          packedBytes: basicWindowRecord.packedLength,
          paddingBytes: basicWindowChunk.sectors * 128 - basicWindowRecord.packedLength -
            chunkLoaderConstants.chunkFooterBytes,
          landing: "direct: ATR stage 2 decodes it to $B600 after disable_basic_rom; the XEX " +
            "block loads at $B600 after the INITAD record has called disable_basic_rom",
        },
      },
      pickupRecordPackedBytes: {
        pickupStream: packedPickupStream.length,
        windowStream: residentWindowSegment.packed.length,
        combined: packedWeaponPickupPhaseBank.length,
        coldCapacity: weaponPickupPackedCapacityBytes,
        coldMargin: weaponPickupPackedCapacityBytes - packedWeaponPickupPhaseBank.length,
      },
      tails: (() => {
        // Free bytes between the last byte a segment uses and the first byte of
        // its real neighbour. A negative tail means the segment has already run
        // into somebody else's memory, so refuse the build instead of shipping
        // the overrun in the manifest.
        const computed = {
          hybridCExtension: cExtensionSegment === undefined ? null :
            0x9000 - (cExtensionSegment.runAddress + cExtensionSegment.data.length),
          entityCode: directorPreRunAddress - (entityCodeRunAddress + entityCodeBytes),
          pickupStreamFill: pickupFileBytes - lightResidentBytes - pickupCodeBytes,
          a2Kernel: 0x0100 - a2KernelBytes,
        };
        const overrun = Object.entries(computed)
          .filter(([, tail]) => tail !== null && tail < 0)
          .map(([name, tail]) => `${name} ${tail} B`);
        if (overrun.length > 0) {
          throw new Error(`segment free tail is negative: ${overrun.join(", ")}`);
        }
        return computed;
      })(),
    },
    directorCodeRuntimes: directorCodeChunks.map(({ name, runAddress, transportAddress, data,
      packed: segmentPacked, lateCompressed, transportData, transportPacked, record, chunk }) => ({
      name,
      file: `encounter-director-code-${name}.bin`,
      xexFile: lateCompressed
        ? `encounter-director-code-${name}-packed.bin`
        : transportData === undefined
          ? `encounter-director-code-${name}.bin`
          : `encounter-director-code-${name}-transport.bin`,
      xexStagingCompression: lateCompressed ? "LZ-10/5" : null,
      runAddress,
      transportAddress: transportAddress ?? runAddress,
      endExclusive: runAddress + data.length,
      bytes: data.length,
      packedBytes: segmentPacked.length,
      ...(transportData === undefined ? {} : {
        transportRawBytes: transportData.length,
        transportPackedBytes: transportPacked.length,
      }),
      externalChunk: {
        startSector: record.startSector,
        sectors: chunk.sectors,
        transportBytes: chunk.bytes.length,
        crc16: chunk.storageCrc16,
      },
    })),
    capitalPlayerCollisionRuntime: {
      runAddress: capitalPlayerCollisionAddress,
      transportAddress: weaponPickupPackedStagingAddress,
      packedStreamOffset: pickupCodeRuntime.length,
      bytes: capitalPlayerCollisionModule.raw.length,
      packedBytes: capitalPlayerCollisionModule.packed.length,
      externalChunk: {
        startSector: pickupPhaseRecord.startSector,
        sectors: pickupPhaseChunk.sectors,
        transportBytes: pickupPhaseChunk.bytes.length,
        crc16: pickupPhaseChunk.storageCrc16,
      },
    },
    starfieldRuntime: {
      loadAddress: starfieldLoadAddress,
      runAddress: starfieldRunAddress,
      bytes: starfieldRuntimeBytes,
      reservedBytes: 0x092c,
      packedBytes: packedStarfieldRuntime.length,
      packedSourceAddress: packedStarfieldAddress,
      packedSourceEndExclusive: packedStarfieldEndAddress,
      pickupColdStagingAddress: weaponPickupColdStagingAddress,
      packedSourceToPickupMarginBytes: packedStarfieldToPickupMarginBytes,
      stagingAddress: starfieldStagingAddress,
      stagingBytes: starfieldStagingBytes,
      compression: "LZ-10/5, two independent streams expanded into one continuous destination",
      rawSplitOffset: starfieldSplit.rawSplitOffset,
      singleStreamPackedBytes: starfieldSplit.singleStreamPackedBytes,
      splitOverheadBytes: packedStarfieldRuntime.length - starfieldSplit.singleStreamPackedBytes,
      streams: starfieldSplit.streams.map((stream, index) => ({
        id: stream.id,
        rawOffset: stream.rawOffset,
        rawBytes: stream.rawBytes,
        packedBytes: stream.packed.length,
        packedSourceAddress: packedStarfieldAddress + starfieldSplit.streams.slice(0, index)
          .reduce((sum, earlier) => sum + earlier.packed.length, 0),
        stagingAddress: stream.address,
        stagingCapacityBytes: stream.capacityBytes,
        stagingEndExclusive: stream.address + stream.capacityBytes,
        idleWindowEndExclusive: stream.idleWindowEndExclusive,
        copy: "one resident 960-B pause-screen copy (copy_pause_screen), exact window, no spill",
        stagedEndExclusive: stream.address + stream.packed.length,
        marginBytes: stream.capacityBytes - stream.packed.length,
      })),
      packedTotalGate: {
        baselineBytes: starfieldPackedTotalBaselineBytes,
        correctionGateBytes: starfieldPackedTotalCorrectionGateBytes,
        hardGateBytes: starfieldPackedTotalHardGateBytes,
        actualBytes: packedStarfieldRuntime.length,
        hardGateMarginBytes: starfieldPackedTotalHardGateBytes - packedStarfieldRuntime.length,
        supersedes: {
          singleStreamCorrectionGateBytes: starfieldSingleStreamCorrectionGateBytes,
          singleStreamHardStagingBytes: starfieldSingleStreamHardStagingBytes,
          singleStreamPackedBytesAtSwap: starfieldSingleStreamPackedBytesAtSwap,
          note: "4.5M-M1 keeps the single-stream content headroom (+14 B to the hard gate, " +
            "-7 B to the open correction-gate decision) on top of the measured two-stream " +
            "total; the staging windows (960 + 1,032 B) are physical limits, not a budget",
        },
      },
    },
    a2Kernel: {
      loadAddress: a2KernelLoadAddress,
      runAddress: a2KernelRunAddress,
      sourceAddress: a2KernelSourceAddress,
      stagingAddress: bootA2StagingAddress,
      bytes: a2KernelBytes,
      reservedBytes: 0x0100,
      availability: "unconditional 64 KB RAM",
    },
    entityEffects: {
      source: "assets/graphics/entity-effects.json",
      sourceSha256: sha256(fs.readFileSync(entityEffectsDefinitionPath)),
      stateAddress: entityStateRunAddress,
      stateBytes: entityStateBytes,
      initializedBytes: entityStateBytes,
      liveFieldBytes: 212,
      interactiveSlots: entityEffectsAsset.pools.interactiveSlots,
      interactiveActiveLimit: entityEffectsAsset.pools.interactiveActiveLimit,
      effectSlots: entityEffectsAsset.pools.effectSlots,
      effectActiveLimit: entityEffectsAsset.pools.effectActiveLimit,
      codeLoadAddress: entityCodeLoadAddress,
      codeRunAddress: entityCodeRunAddress,
      codeBytes: entityCodeBytes,
      sharedRuntimeBytes: relocatedHullBytes,
      featureCodeBytes: entityFeatureCodeBytes,
      codeReservedBytes: entityEffectsAsset.pools.codeReservedBytes,
      codeBudget: {
        baselineBytes: debrisVisualPolishEntityCodeBaselineBytes,
        approvedDeltaBytes: debrisVisualPolishEntityCodeBudgetBytes,
        actualDeltaBytes: entityFeatureCodeBytes - debrisVisualPolishEntityCodeBaselineBytes,
        limitBytes: debrisVisualPolishEntityCodeBaselineBytes +
          debrisVisualPolishEntityCodeBudgetBytes,
        remainingBytes: debrisVisualPolishEntityCodeBaselineBytes +
          debrisVisualPolishEntityCodeBudgetBytes - entityFeatureCodeBytes,
        destructibleDebris: {
          baselineBytes: destructibleDebrisEntityCodeBaselineBytes,
          approvedDeltaBytes: destructibleDebrisEntityCodeBudgetBytes,
          actualBytes: entityFeatureCodeBytes,
          actualDeltaBytes: entityFeatureCodeBytes - destructibleDebrisEntityCodeBaselineBytes,
          limitBytes: destructibleDebrisEntityCodeBaselineBytes +
            destructibleDebrisEntityCodeBudgetBytes,
        },
        weaponPickupRapidFire: {
          baselineBytes: runtimePayloadCompactionBaselineEntityCodeBytes + 124,
          actualBytes: entityFeatureCodeBytes,
          actualDeltaBytes:
            entityFeatureCodeBytes - (runtimePayloadCompactionBaselineEntityCodeBytes + 124),
        },
        weaponPickupSpreadShot: {
          baselineBytes: spreadShotBaselineEntityFeatureBytes,
          actualBytes: shieldBoosterBaselineEntityFeatureBytes,
          actualDeltaBytes: shieldBoosterBaselineEntityFeatureBytes - spreadShotBaselineEntityFeatureBytes,
          hardDeltaBytes: spreadShotHardRuntimeDeltaBytes,
        },
        weaponPickupShield: {
          baselineBytes: shieldBoosterBaselineEntityFeatureBytes,
          actualBytes: shieldBoosterBaselineEntityFeatureBytes,
          actualDeltaBytes: 0,
          hardDeltaBytes: shieldBoosterHardRuntimeDeltaBytes,
        },
        frontendH31: {
          baselineBytes: frontendH31BaselineEntityFeatureBytes,
          actualBytes: entityFeatureCodeBytes,
          actualDeltaBytes: entityFeatureCodeBytes - frontendH31BaselineEntityFeatureBytes,
          hardDeltaBytes: frontendH31HardRuntimeDeltaBytes,
        },
      },
      packedBytes: packedEntityCodeRuntime.length,
      packedSourceAddress: entityPackedSourceAddress,
      initialPackedSourcesEndExclusive: initialPackedSourcesEnd,
      initialPackedSourcesLastAddress,
      stagedSourceAddress: entityStagedSourceAddress,
      stagedEndAddress: entityStagedEndAddress - 1,
      stagedEndExclusive: entityStagedEndAddress,
      sourceToStagingMarginBytes: entityStagedSourceAddress - initialPackedSourcesEnd,
      sourceStagingOverlapBytes: Math.max(
        0, initialPackedSourcesEnd - entityStagedSourceAddress,
      ),
      stagingCopyDirection: "backward",
      stagingToBroadsideMarginBytes: broadsideRunAddress - entityStagedEndAddress,
      stagingLifecycle: {
        starfieldDestinationAddress: starfieldRunAddress,
        starfieldDestinationEndExclusive: starfieldRunEndAddress,
        starfieldDestinationOverlapStartAddress: entityStagingStarfieldOverlapStart,
        starfieldDestinationOverlapEndExclusive: entityStagingStarfieldOverlapEnd,
        starfieldDestinationOverlapBytes: entityStagingStarfieldOverlapBytes,
        stagingReleasedBeforeStarfieldExpansion: true,
      },
      compression: "LZ-10/5",
      deterministicFillTestByte: 0xa5,
      gameplayTopScanline: entityEffectsAsset.coordinateSystem.gameplayTopScanline,
      gameplayBottomExclusive: entityEffectsAsset.coordinateSystem.gameplayBottomExclusive,
      logicalRows: entityEffectsAsset.coordinateSystem.logicalRows,
      archetypeCount: entityEffectsAsset.archetypes.length,
      descriptorBytes: entityEffectsAsset.descriptor.length,
      glyphBytes: entityEffectsAsset.glyphs.length + entityEffectsAsset.effectGlyphs.length +
        entityEffectsAsset.weaponPickupRapidFire.maximumFootprintRows * 2 * 8,
      debrisGlyphBytes: entityEffectsAsset.glyphs.length,
      effectGlyphBytes: entityEffectsAsset.effectGlyphs.length,
      weaponPickupGlyphBytes: entityEffectsAsset.pickupGlyphs.length,
      spreadPickupGlyphBytes: entityEffectsAsset.spreadPickupGlyphs.length,
      shieldPickupGlyphBytes: entityEffectsAsset.shieldPickupGlyphs.length,
      glyphIndex: labels.get("ENTITY_DEBRIS_GLYPH_BASE"),
      glyphCount: (entityEffectsAsset.glyphs.length + entityEffectsAsset.effectGlyphs.length) / 8 +
        entityEffectsAsset.weaponPickupRapidFire.maximumFootprintRows * 2,
      debrisGlyphCount: entityEffectsAsset.glyphs.length / 8,
      effectGlyphCount: entityEffectsAsset.effectGlyphs.length / 8,
      weaponPickupGlyphCount: entityEffectsAsset.pickupGlyphs.length / 8,
      weaponPickupGlyphIndex: labels.get("WEAPON_PICKUP_GLYPH_BASE"),
      spreadPickupGlyphCount: entityEffectsAsset.spreadPickupGlyphs.length / 8,
      spreadPickupGlyphIndex: labels.get("WEAPON_PICKUP_SPREAD_GLYPH_BASE"),
      shieldPickupGlyphCount: entityEffectsAsset.shieldPickupGlyphs.length / 8,
      shieldPickupGlyphIndex: labels.get("WEAPON_PICKUP_SHIELD_GLYPH_BASE"),
      dynamicPickupGlyphBankShared: false,
      pickupPhaseGlyphCount: entityEffectsAsset.weaponPickupRapidFire.maximumFootprintRows * 2,
      pickupPhaseCount: entityEffectsAsset.weaponPickupRapidFire.verticalPhaseCount,
      pickupPhaseBankAddress: weaponPickupRuntimeAddress,
      pickupPhaseBankBytes: 0,
      pickupPhaseSourceBytes: weaponPickupPhaseBank.length,
      pickupPhaseBankRuntimeReferences: 0,
      pickupCodeAddress: pickupCodeRunAddress,
      pickupCodeBytes,
      pickupPhaseRuntimeBytes: weaponPickupPhaseRuntime.length,
      pickupPhasePackedBytes: packedWeaponPickupPhaseBank.length,
      pickupPhaseExternalChunk: {
        startSector: pickupPhaseRecord.startSector,
        sectors: pickupPhaseChunk.sectors,
        transportBytes: pickupPhaseChunk.bytes.length,
        crc16: pickupPhaseChunk.storageCrc16,
        stagingAddress: weaponPickupPackedStagingAddress,
        finalRuntimeAddress: weaponPickupRuntimeAddress,
        coldCapacityBytes: weaponPickupPackedCapacityBytes,
        coldMarginBytes: weaponPickupPackedCapacityBytes - packedWeaponPickupPhaseBank.length,
      },
      newGlyphsFromFoundation: entityEffectsAsset.glyphs.length / 8 - 1,
      runtimeBudget: {
        historicalGateWallCycles: runtimeHeadroomHistoricalWallGate,
        historicalGatePreserved: true,
        baselineWallCycles: entityEffectsBaselineWallCycles,
        baselinePhysicalHeadroomCycles: entityEffectsBaselinePhysicalHeadroom,
        approvedFeatureDeltaCycles: entityEffectsApprovedWallDelta,
        featureWallLimitCycles: entityEffectsFeatureWallLimit,
        minimumPhysicalHeadroomCycles: entityEffectsFeatureMinimumHeadroom,
        measuredWallCycles:
          wallTrace?.gate.entity_effects_foundation?.measured_wall_cycles ?? null,
        actualDeltaCycles:
          wallTrace?.gate.entity_effects_foundation?.actual_delta_cycles ?? null,
        remainingApprovedCycles:
          wallTrace?.gate.entity_effects_foundation?.remaining_approved_cycles ?? null,
        missedSynchronization: wallTrace?.gate.missed_frames ?? null,
        deadlineOverruns: wallTrace?.gate.deadline_overrun_frames ?? null,
        passed: wallTrace?.gate.entity_effects_foundation?.passed ?? null,
        debrisVisualPolish: {
          baselineWallCycles: debrisVisualPolishBaselineWallCycles,
          baselinePhysicalHeadroomCycles: debrisVisualPolishBaselineHeadroomCycles,
          approvedFeatureDeltaCycles: debrisVisualPolishApprovedWallDelta,
          featureWallLimitCycles: debrisVisualPolishWallLimit,
          minimumPhysicalHeadroomCycles: debrisVisualPolishMinimumHeadroom,
          measuredWallCycles:
            wallTrace?.gate.debris_visual_polish?.measured_wall_cycles ?? null,
          actualDeltaCycles:
            wallTrace?.gate.debris_visual_polish?.actual_delta_cycles ?? null,
          remainingApprovedCycles:
            wallTrace?.gate.debris_visual_polish?.remaining_approved_cycles ?? null,
          missedSynchronization: wallTrace?.gate.missed_frames ?? null,
          deadlineOverruns: wallTrace?.gate.deadline_overrun_frames ?? null,
        },
        enemyBreakupEffects: {
          baselineWallCycles: enemyBreakupBaselineWallCycles,
          baselinePhysicalHeadroomCycles: enemyBreakupBaselineHeadroomCycles,
          targetDeltaCycles: enemyBreakupTargetDeltaCycles,
          hardDeltaCycles: enemyBreakupHardDeltaCycles,
          targetWallLimitCycles: enemyBreakupBaselineWallCycles +
            enemyBreakupTargetDeltaCycles,
          hardWallLimitCycles: enemyBreakupBaselineWallCycles +
            enemyBreakupHardDeltaCycles,
          minimumPhysicalHeadroomCycles: enemyBreakupMinimumHeadroomCycles,
          measuredWallCycles:
            wallTrace?.gate.enemy_breakup_effects?.measured_wall_cycles ?? null,
          actualDeltaCycles:
            wallTrace?.gate.enemy_breakup_effects?.actual_delta_cycles ?? null,
          remainingTargetCycles:
            wallTrace?.gate.enemy_breakup_effects?.remaining_target_cycles ?? null,
          remainingHardCycles:
            wallTrace?.gate.enemy_breakup_effects?.remaining_hard_cycles ?? null,
          missedSynchronization: wallTrace?.gate.missed_frames ?? null,
          deadlineOverruns: wallTrace?.gate.deadline_overrun_frames ?? null,
        },
        explosionColourFlash: {
          baselineWallCycles: explosionFlashBaselineWallCycles,
          baselinePhysicalHeadroomCycles: explosionFlashBaselineHeadroomCycles,
          approvedFeatureDeltaCycles: explosionFlashApprovedWallDelta,
          featureWallLimitCycles: explosionFlashWallLimit,
          deltaLimitedMinimumPhysicalHeadroomCycles:
            explosionFlashBaselineHeadroomCycles - explosionFlashApprovedWallDelta,
          absoluteMinimumPhysicalHeadroomCycles: explosionFlashAbsoluteMinimumHeadroom,
          measuredWallCycles:
            wallTrace?.gate.explosion_colour_flash?.measured_wall_cycles ?? null,
          actualDeltaCycles:
            wallTrace?.gate.explosion_colour_flash?.actual_delta_cycles ?? null,
          remainingApprovedCycles:
            wallTrace?.gate.explosion_colour_flash?.remaining_approved_cycles ?? null,
          missedSynchronization: wallTrace?.gate.missed_frames ?? null,
          deadlineOverruns: wallTrace?.gate.deadline_overrun_frames ?? null,
        },
        destructibleDebris: {
          baselineWallCycles: destructibleDebrisBaselineWallCycles,
          baselinePhysicalHeadroomCycles: destructibleDebrisBaselineHeadroomCycles,
          targetDeltaCycles: destructibleDebrisTargetDeltaCycles,
          hardDeltaCycles: destructibleDebrisHardDeltaCycles,
          targetWallLimitCycles: destructibleDebrisBaselineWallCycles +
            destructibleDebrisTargetDeltaCycles,
          hardWallLimitCycles: destructibleDebrisBaselineWallCycles +
            destructibleDebrisHardDeltaCycles,
          minimumPhysicalHeadroomCycles: destructibleDebrisMinimumHeadroomCycles,
          measuredWallCycles:
            wallTrace?.gate.destructible_debris?.measured_wall_cycles ?? null,
          actualDeltaCycles:
            wallTrace?.gate.destructible_debris?.actual_delta_cycles ?? null,
          remainingTargetCycles:
            wallTrace?.gate.destructible_debris?.remaining_target_cycles ?? null,
          remainingHardCycles:
            wallTrace?.gate.destructible_debris?.remaining_hard_cycles ?? null,
          missedSynchronization: wallTrace?.gate.missed_frames ?? null,
          deadlineOverruns: wallTrace?.gate.deadline_overrun_frames ?? null,
        },
        weaponPickupRapidFire: {
          baselineWallCycles: weaponPickupRapidFireBaselineWallCycles,
          baselinePhysicalHeadroomCycles:
            35568 - weaponPickupRapidFireBaselineWallCycles,
          targetDeltaCycles: weaponPickupRapidFireTargetDeltaCycles,
          hardDeltaCycles: weaponPickupRapidFireHardDeltaCycles,
          targetWallLimitCycles:
            weaponPickupRapidFireBaselineWallCycles + weaponPickupRapidFireTargetDeltaCycles,
          hardWallLimitCycles:
            weaponPickupRapidFireBaselineWallCycles + weaponPickupRapidFireHardDeltaCycles,
          minimumPhysicalHeadroomCycles: weaponPickupRapidFireMinimumHeadroomCycles,
          measuredWallCycles:
            wallTrace?.gate.weapon_pickup_rapid_fire?.measured_wall_cycles ?? null,
          actualDeltaCycles:
            wallTrace?.gate.weapon_pickup_rapid_fire?.actual_delta_cycles ?? null,
          missedSynchronization: wallTrace?.gate.missed_frames ?? null,
          deadlineOverruns: wallTrace?.gate.deadline_overrun_frames ?? null,
        },
        weaponPickupSpreadShot: {
          baselineWallCycles: spreadShotBaselineWallCycles,
          baselinePhysicalHeadroomCycles: 35568 - spreadShotBaselineWallCycles,
          targetDeltaCycles: spreadShotTargetDeltaCycles,
          hardDeltaCycles: spreadShotHardDeltaCycles,
          targetWallLimitCycles: spreadShotBaselineWallCycles + spreadShotTargetDeltaCycles,
          hardWallLimitCycles: spreadShotBaselineWallCycles + spreadShotHardDeltaCycles,
          minimumPhysicalHeadroomCycles: spreadShotMinimumHeadroomCycles,
          measuredWallCycles:
            wallTrace?.gate.weapon_pickup_spread_shot?.measured_wall_cycles ?? null,
          actualDeltaCycles:
            wallTrace?.gate.weapon_pickup_spread_shot?.actual_delta_cycles ?? null,
          missedSynchronization: wallTrace?.gate.missed_frames ?? null,
          deadlineOverruns: wallTrace?.gate.deadline_overrun_frames ?? null,
        },
        weaponPickupShield: {
          baselineWallCycles: shieldBoosterBaselineWallCycles,
          baselinePhysicalHeadroomCycles: 35568 - shieldBoosterBaselineWallCycles,
          targetDeltaCycles: shieldBoosterTargetDeltaCycles,
          hardDeltaCycles: shieldBoosterHardDeltaCycles,
          targetWallLimitCycles: shieldBoosterBaselineWallCycles + shieldBoosterTargetDeltaCycles,
          hardWallLimitCycles: shieldBoosterBaselineWallCycles + shieldBoosterHardDeltaCycles,
          minimumPhysicalHeadroomCycles: shieldBoosterMinimumHeadroomCycles,
          measuredWallCycles:
            wallTrace?.gate.weapon_pickup_shield?.measured_wall_cycles ?? null,
          actualDeltaCycles:
            wallTrace?.gate.weapon_pickup_shield?.actual_delta_cycles ?? null,
          missedSynchronization: wallTrace?.gate.missed_frames ?? null,
          deadlineOverruns: wallTrace?.gate.deadline_overrun_frames ?? null,
          extraVbiBoundaries: wallTrace?.gate.extra_vbi_boundaries ?? null,
        },
      },
    },
    runtimeCodeBudget: {
      measurement: "linked CODE + STARFIELD + BROADSIDE + A2_KERNEL + ENTITY_CODE + PICKUP_CODE bytes",
      baselineBytes: destructibleDebrisRuntimeCodeBaselineBytes,
      actualBytes: destructibleDebrisRuntimeCodeBytes,
      actualDeltaBytes: destructibleDebrisRuntimeCodeBytes -
        destructibleDebrisRuntimeCodeBaselineBytes,
      approvedDeltaBytes: destructibleDebrisRuntimeCodeBudgetBytes,
      remainingBytes: destructibleDebrisRuntimeCodeBaselineBytes +
        destructibleDebrisRuntimeCodeBudgetBytes - destructibleDebrisRuntimeCodeBytes,
      enemyBreakupEffects: {
        baselineBytes: enemyBreakupRuntimeCodeBaselineBytes,
        actualBytes: weaponPickupRapidFireBaselineRuntimeCodeBytes,
        actualDeltaBytes: weaponPickupRapidFireBaselineRuntimeCodeBytes -
          enemyBreakupRuntimeCodeBaselineBytes,
        approvedDeltaBytes: enemyBreakupRuntimeCodeBudgetBytes,
        remainingBytes: enemyBreakupRuntimeCodeBaselineBytes +
          enemyBreakupRuntimeCodeBudgetBytes - weaponPickupRapidFireBaselineRuntimeCodeBytes,
      },
      runtimePayloadCompaction: {
        baselineBytes: runtimePayloadCompactionBaselineLinkedBytes,
        actualBytes: weaponPickupRapidFireBaselineRuntimeCodeBytes,
        relocatedColdInitBytes:
          weaponPickupRapidFireBaselineRuntimeCodeBytes -
            runtimePayloadCompactionBaselineLinkedBytes,
        newGameplayBytes: 0,
      },
      weaponPickupRapidFire: {
        baselineBytes: weaponPickupRapidFireBaselineRuntimeCodeBytes,
        actualBytes: destructibleDebrisRuntimeCodeBytes,
        actualDeltaBytes:
          destructibleDebrisRuntimeCodeBytes - weaponPickupRapidFireBaselineRuntimeCodeBytes,
      },
      weaponPickupSpreadShot: {
        baselineBytes: spreadShotBaselineRuntimeCodeBytes,
        actualBytes: shieldBoosterBaselineRuntimeCodeBytes,
        actualDeltaBytes: shieldBoosterBaselineRuntimeCodeBytes - spreadShotBaselineRuntimeCodeBytes,
        targetDeltaBytes: spreadShotTargetRuntimeDeltaBytes,
        hardDeltaBytes: spreadShotHardRuntimeDeltaBytes,
      },
      weaponPickupShield: {
        baselineBytes: shieldBoosterBaselineRuntimeCodeBytes,
        actualBytes: shieldBoosterBaselineRuntimeCodeBytes,
        actualDeltaBytes: 0,
        hardDeltaBytes: shieldBoosterHardRuntimeDeltaBytes,
      },
      frontendH31: {
        baselineBytes: frontendH31BaselineRuntimeCodeBytes,
        actualBytes: destructibleDebrisRuntimeCodeBytes,
        actualDeltaBytes: destructibleDebrisRuntimeCodeBytes - frontendH31BaselineRuntimeCodeBytes,
        hardDeltaBytes: frontendH31HardRuntimeDeltaBytes,
      },
    },
    loaderScreen: {
      mode: "mixed ANTIC F/E",
      source: "assets/graphics/loader-bitmap.json",
      sourceSha256: sha256(fs.readFileSync(loaderDefinitionPath)),
      referenceSha256: loaderDefinition.reference.sha256,
      width: loaderAsset.width,
      height: loaderAsset.height,
      bytesPerRow: loaderAsset.bytesPerRow,
      bitmapAddress: loaderAsset.bitmapAddress,
      secondLmsLine: loaderAsset.secondLmsLine,
      secondLmsAddress: loaderAsset.secondLmsAddress,
      packedBitmapBytes: loaderAsset.packedBitmap.length,
      unpackedBitmapBytes: loaderAsset.bitmapBytes.length,
      dliCount: loaderAsset.dliLines.length,
      durationFrames: loaderAsset.durationFrames,
    },
    capitalHulls: {
      source: "assets/graphics/capital-hulls.json",
      sourceSha256: sha256(fs.readFileSync(capitalHullsDefinitionPath)),
      displayMode: capitalHullsDefinition.displayMode,
      segmentRows: capitalHullsAsset.segmentRows,
      glyphCount: capitalHullsAsset.glyphs.length,
      glyphBytes: capitalHullsAsset.glyphBytes.length,
      packedMapAndMetadataBytes: capitalHullsAsset.packedDataBytes,
      runtimeMapBytes: capitalHullsAsset.runtimeMapBytes,
      turretCount: capitalHullsAsset.turrets.length,
      previewStartPhase: capitalHullsAsset.previewStartPhase,
      contourTransitions: Object.fromEntries(capitalHullsAsset.contourTransitionCounts),
      broadsideScheduleBytes: capitalHullsAsset.scheduleBytes.length,
      broadsideFire: {
        allocatedSlots: 3,
        activeLimit: capitalHullsAsset.broadside.activeLimit,
        delaysAfterFrames: capitalHullsAsset.schedule.map(({ delayAfterFrames }) => delayAfterFrames),
      },
      flagshipSector: {
        totalRows: capitalHullsAsset.sector.totalRows,
        streamRows: capitalHullsAsset.sector.streamRows,
        visibleRows: capitalHullsAsset.sector.visibleRows,
        moduleRows: capitalHullsAsset.sector.moduleRows,
        sidePhaseRows: capitalHullsAsset.sector.sidePhaseRows,
        sectionRows: Object.fromEntries(capitalHullsAsset.sector.sections.map((section) => [
          section.id,
          section.rows,
        ])),
        moduleSourceBytes: [...capitalHullsAsset.sector.moduleSourceRowsBySide.values()]
          .reduce((sum, bytes) => sum + bytes.length, 0),
        moduleSequenceBytes: [...capitalHullsAsset.sector.moduleSequences.values()]
          .reduce((sum, bytes) => sum + bytes.length, 0),
        turretLayoutSeed: capitalHullsAsset.sector.layoutSeed,
        turretRowsByDifficulty: Object.fromEntries(["easy", "medium", "hard"].map(
          (difficulty) => [difficulty, Object.fromEntries(["allied", "enemy"].map(
            (side) => [side,
              capitalHullsAsset.sector.cannonRowsByDifficulty.get(side).get(difficulty)]))],
        )),
        engineOverlayBytes: [...capitalHullsAsset.sector.engineOverlayMasks.values()]
          .reduce((sum, bytes) => sum + bytes.length, 0),
        prowOccupancyBytes: [...capitalHullsAsset.sector.prowOccupancyMasks.values()]
          .reduce((sum, bytes) => sum + bytes.length, 0),
        prowCollisionBytes: [...capitalHullsAsset.sector.prowCollisionBoundaries.values()]
          .reduce((sum, bytes) => sum + bytes.length, 0),
        engineAnimationFrames: capitalHullsAsset.sector.engineAnimationFrames,
        engineAnimationBytes: [...capitalHullsAsset.sector.engineGlyphs.values()]
          .reduce((sum, glyph) => sum + glyph.animationBytes.length * 8, 0),
        launchFlashFrames: capitalHullsAsset.sector.launchFlashFrames,
        capitalExplosion: {
          durationFrames: capitalHullsAsset.broadside.capitalExplosion.durationFrames,
          phaseFrames: capitalHullsAsset.broadside.capitalExplosion.phaseFrames,
          footprint: [
            capitalHullsAsset.broadside.capitalExplosion.width,
            capitalHullsAsset.broadside.capitalExplosion.height,
          ],
          pokeyChannel: capitalHullsAsset.broadside.capitalExplosion.soundChannel,
          soundFrames: capitalHullsAsset.broadside.capitalExplosion.soundFrequencyBytes.length,
        },
      },
    },
    enemyRoster: {
      source: "assets/graphics/enemy-roster.json",
      sourceSha256: sha256(fs.readFileSync(enemyRosterDefinitionPath)),
      inventoryCount: enemyRosterAsset.inventory.length,
      implementedCount: enemyRosterAsset.implemented.length,
      releaseArchetype: enemyRosterAsset.runtime.releaseArchetype,
      runtimeArtBytes: enemyRosterAsset.runtimeArtBytes,
      descriptorBytes: enemyRosterAsset.descriptorBytes,
      palette: {
        selectedId: enemyRosterAsset.runtime.colourPolicy.selected,
        releaseBodyValue: enemyRosterAsset.runtime.colourPolicy.bodyValue,
        artifactBodyValue: paletteCandidate?.value ?? enemyRosterAsset.runtime.colourPolicy.bodyValue,
        scannerValue: enemyRosterAsset.runtime.colourPolicy.accentValue,
      },
      movementPolicy: enemyRosterAsset.runtime.movementPolicy,
      raiderFormation: {
        memberCount: 3,
        guideVisible: false,
        memberVerticalOffsetsScanlines: [0, -24, -48],
        sharedPmgPlayers: ["P1", "P2"],
        independentStateAndHp: true,
        retainDestroyedGaps: true,
        replacementDuringFlight: false,
        leaderTransfer: false,
        maximumOrdinaryMachines: 3,
        lifecycleEndsAfterAllMembersLeaveOrAreDestroyed: true,
        blocksCapitalAdmissionUntilLifecycleEnd: true,
        weaponPoolSlots: 9,
        weaponActiveLimit: enemyRosterAsset.runtime.weaponPolicy.singlePulse.activeLimit,
        weaponOriginSelection: "round-robin living member",
      },
      weaponPolicy: enemyRosterAsset.runtime.weaponPolicy,
      projectileVisuals: capitalHullsAsset.broadside.projectileVisuals,
      damagePolicy: {
        priority: [
          "PLAYER_PROJECTILE",
          "PLAYER_CONTACT",
          "CAPITAL_HOSTILE",
          "CAPITAL_ALLIED",
          "ENEMY_PROJECTILE",
          "CLEANUP",
        ],
        scoreAwarding: ["PLAYER_PROJECTILE", "PLAYER_CONTACT", "CAPITAL_HOSTILE"],
      },
      anchors: enemyRosterAsset.implemented.map((archetype) => ({
        id: archetype.id,
        reference: archetype.reference,
        height: archetype.height,
        hardwareWidth: archetype.hardwareWidth,
        visibleWidth: archetype.visibleWidth,
        logicalBounds: archetype.logicalBounds,
        hposBounds: archetype.hposBounds,
        frames: archetype.frames,
        releaseEnabled: archetype.releaseEnabled,
      })),
    },
    fighterWeapons: {
      source: "assets/graphics/fighter-weapons.json",
      sourceSha256: sha256(fs.readFileSync(fighterWeaponsDefinitionPath)),
      viewport: fighterWeaponsAsset.viewport,
      dynamicGlyphBase: fighterWeaponsAsset.dynamicGlyphBase,
      poolSlots: {
        player_fighter: fighterWeaponsAsset.player_fighter.poolSlots,
        interceptor: fighterWeaponsAsset.interceptor.poolSlots,
        total: fighterWeaponsAsset.totalSlots,
      },
      activeLimits: {
        player_fighter: fighterWeaponsAsset.player_fighter.activeLimit,
        interceptor: fighterWeaponsAsset.interceptor.activeLimit,
        total: fighterWeaponsAsset.player_fighter.activeLimit +
          fighterWeaponsAsset.interceptor.activeLimit,
      },
      runtimeStateBytes: fighterWeaponsAsset.stateBytes,
      sharedFighterExplosion: {
        frameCount: fighterWeaponsAsset.sharedFighterExplosion.frameCount,
        frameDurationFrames: fighterWeaponsAsset.sharedFighterExplosion.frameDurationFrames,
        totalFrames: fighterWeaponsAsset.sharedFighterExplosion.totalFrames,
        dimensions: [fighterWeaponsAsset.sharedFighterExplosion.widthBits,
          fighterWeaponsAsset.sharedFighterExplosion.heightScanlines],
        slots: fighterWeaponsAsset.sharedFighterExplosion.slots,
        artBytes: fighterWeaponsAsset.sharedFighterExplosion.outerBytes.length +
          fighterWeaponsAsset.sharedFighterExplosion.coreMasks.length,
      },
      player_fighter: fighterWeaponsAsset.player_fighter,
      interceptor: fighterWeaponsAsset.interceptor,
    },
    starfield: {
      source: "assets/graphics/starfield.json",
      sourceSha256: sha256(fs.readFileSync(starfieldDefinitionPath)),
      generationSeed: starfieldAsset.generationSeed,
      corridor: starfieldAsset.corridor,
      farLayer: {
        population: starfieldAsset.farLayer.population,
        representation: starfieldAsset.farLayer.representation,
        rateNumerator: starfieldAsset.farLayer.rateNumerator,
        rateDenominator: starfieldAsset.farLayer.rateDenominator,
        patternRows: starfieldAsset.farLayer.pattern.rows,
        patternBytes: starfieldAsset.farLayer.pattern.bytes.length,
        colourRegister: starfieldAsset.farLayer.colourRegister,
        glyphs: starfieldAsset.farLayer.glyphs.map(({ id, screenCode }) => ({ id, screenCode })),
      },
      nearLayer: {
        representation: starfieldAsset.nearLayer.representation,
        population: starfieldAsset.nearLayer.population,
        speedPixelsPerFrame: starfieldAsset.nearLayer.speedPixelsPerFrame,
        expectedVisible: starfieldAsset.expectedNearVisible,
        colourRegister: starfieldAsset.nearLayer.colourRegister,
        glyphs: starfieldAsset.nearLayer.glyphs.map(({ id, screenCode }) => ({ id, screenCode })),
      },
      twinkleEnabled: starfieldAsset.twinkle.enabled,
      twinkleIntervalFrames: starfieldAsset.twinkle.intervalFrames,
      glyphBytes: starfieldAsset.glyphBytes.length,
      runtimeStateBytes: starfieldAsset.stateBytes,
      pmgBytes: 0,
    },
    menuMusic: {
      source: "assets/music/menu-theme.json",
      sourceSha256: sha256(fs.readFileSync(menuMusicDefinitionPath)),
      title: menuMusicAsset.title,
      originalComposition: menuMusicAsset.originalComposition,
      targetFrameHz: menuMusicAsset.targetFrameHz,
      framesPerRow: menuMusicAsset.framesPerRow,
      rowsPerPattern: menuMusicAsset.rowsPerPattern,
      patternCount: menuMusicAsset.patternNames.length,
      sequencePatterns: menuMusicAsset.sequenceBytes.length,
      loopFrames: menuMusicAsset.loopFrames,
      loopSeconds: menuMusicAsset.loopSeconds,
      channelAllocation: menuMusicAsset.channelAllocation,
      channelMask: 0x0f,
      runtimeCodeBytes: musicPlayerEnd - musicPlayerStart,
      runtimeDataBytes: musicDataEnd - musicDataStart,
      runtimeStateBytes: menuMusicAsset.stateBytes,
    },
    gameplayMusic: {
      source: "assets/music/gameplay-theme.json",
      sourceSha256: sha256(fs.readFileSync(gameplayMusicDefinitionPath)),
      title: gameplayMusicAsset.title,
      originalComposition: gameplayMusicAsset.originalComposition,
      targetFrameHz: gameplayMusicAsset.targetFrameHz,
      framesPerRow: gameplayMusicAsset.framesPerRow,
      rowsPerPattern: gameplayMusicAsset.rowsPerPattern,
      patternCount: gameplayMusicAsset.patternNames.length,
      sequencePatterns: gameplayMusicAsset.sequenceBytes.length,
      loopFrames: gameplayMusicAsset.loopFrames,
      loopSeconds: gameplayMusicAsset.loopSeconds,
      channelAllocation: gameplayMusicAsset.channelAllocation,
      reservedSfxChannels: gameplayMusicAsset.reservedSfxChannels,
      channelMask: 0x03,
      audctlProfile: gameplayMusicAsset.audctlProfile,
      runtimeCodeBytes: gameMusicPlayerEnd - gameMusicPlayerStart,
      runtimeDataBytes: gameMusicDataEnd - gameMusicDataStart,
      runtimeStateBytes: gameplayMusicAsset.stateBytes,
      eventsPerTickLimit: gameplayMusicAsset.eventsPerTickLimit,
      normalFrameCycles: runtimeTiming?.cpuDmaOff.gameplayMusicTickMinimumCycles ?? null,
      worstRowFrameCycles: runtimeTiming?.cpuDmaOff.gameplayMusicTickMaximumCycles ?? null,
      pauseOptionPollCycles: runtimeTiming?.cpuDmaOff.optionPollCycles ?? null,
      cpuWorstFrameCyclesDmaOff: runtimeTiming?.cpu_cycles_dma_off ?? null,
      cpuComparisonHeadroomCycles: runtimeTiming?.cpu_comparison_headroom ?? null,
      measuredWallCyclesDmaOn: runtimeTiming?.measured_wall_cycles_dma_on ?? null,
      measuredPhysicalHeadroomCycles: runtimeTiming?.measured_physical_headroom ?? null,
    },
    runtimeTiming,
    pause: {
      inputRegister: 0xd01f,
      optionMask: 0x04,
      screenBackupAddress: starfieldStagingAddress,
      screenBackupBytes: 0x03c0,
      zeroPageStateBytes: 1,
      activeFramePollCycles: 13,
      simulationTicksWhilePaused: 0,
      menuRows: ["RESUME", "GAME MUSIC: ON/OFF", "QUIT TO MENU"],
      quitConfirmationDefault: "NO",
    },
    runtimeEvidence: isReviewVariant ? null : {
      status: candidateBuild ? "candidate-awaiting-trace" : "final-bound",
      artifacts: runtimeArtifacts,
      reportPath: candidateBuild ? null : "docs/runtime-wall-trace.json",
      reportSha256: candidateBuild ? null : sha256(fs.readFileSync(wallTracePath)),
    },
    artifacts: {
      "void-strike-65-boot.bin": { bytes: transportPayload.length, sha256: sha256(transportPayload) },
      "void-strike-65.xex": { bytes: xex.length, sha256: sha256(xex) },
      "void-strike-65.atr": { bytes: atr.length, sha256: sha256(atr) },
    },
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);

  writeFile(path.join(buildDirectory, "void-strike-65.bin"), transportPayload);
  writeFile(path.join(buildDirectory, "initial-boot.bin"), initialBoot.bytes);
  writeFile(path.join(buildDirectory, "broadside-extension.bin"), broadsideChunk.bytes);
  writeFile(path.join(buildDirectory, "weapon-pickup-extension.bin"), pickupPhaseChunk.bytes);
  writeFile(path.join(buildDirectory, "chunk-manifest.bin"), chunkManifest);
  writeFile(path.join(buildDirectory, "boot-stage2.bin"), patchedBootStage2);
  writeFile(path.join(buildDirectory, "resident-runtime.bin"), residentMain);
  writeFile(path.join(buildDirectory, "resident-runtime-suffix.bin"), residentRuntimeSuffix);
  writeFile(path.join(buildDirectory, "resident-runtime-suffix-packed.bin"), packedResidentRuntime);
  writeFile(path.join(buildDirectory, "broadside-runtime.bin"), broadsideRuntime);
  writeFile(path.join(buildDirectory, "broadside-runtime-packed.bin"), packedBroadsideRuntime);
  writeFile(path.join(buildDirectory, "integration-glue.o"), glueModule.object);
  writeFile(path.join(buildDirectory, "integration-glue.lst"), glueModule.listing);
  writeFile(path.join(buildDirectory, "integration-glue.map"), glueModule.map);
  writeFile(path.join(buildDirectory, "integration-glue.lbl"), glueModule.labels);
  writeFile(path.join(buildDirectory, "integration-glue.bin"), glueModule.raw);
  writeFile(path.join(buildDirectory, "integration-glue-packed.bin"), glueModule.packed);
  writeFile(path.join(buildDirectory, "integration-abi.inc"), integrationAbiInclude);
  writeFile(path.join(buildDirectory, "encounter-director.o"), directorModule.object);
  if (directorModule.abiObject) {
    writeFile(path.join(buildDirectory, "encounter-director-abi.o"), directorModule.abiObject);
    writeFile(path.join(buildDirectory, "encounter-director-abi.lst"), directorModule.abiListing);
    writeFile(path.join(buildDirectory, "encounter-director-generated.s"),
      directorModule.generatedAssembly);
    writeFile(path.join(buildDirectory, "encounter-director-lifecycle.o"),
      directorModule.lifecycleObject);
    writeFile(path.join(buildDirectory, "encounter-director-lifecycle.lst"),
      directorModule.lifecycleListing);
    writeFile(path.join(buildDirectory, "encounter-director-lifecycle-generated.s"),
      directorModule.lifecycleGeneratedAssembly);
  }
  writeFile(path.join(buildDirectory, "encounter-director.lst"), directorModule.listing);
  writeFile(path.join(buildDirectory, "encounter-director.map"), directorModule.map);
  writeFile(path.join(buildDirectory, "encounter-director.lbl"), directorModule.labels);
  writeFile(path.join(buildDirectory, "encounter-director.bin"), directorModule.raw);
  writeFile(path.join(buildDirectory, "encounter-director-packed.bin"), directorModule.packed);
  writeFile(path.join(buildDirectory, "encounter-director-code.bin"), directorModule.codeRaw);
  writeFile(path.join(buildDirectory, "encounter-director-code-packed.bin"),
    directorModule.codePacked);
  for (const segment of directorModule.codeSegments) {
    writeFile(path.join(buildDirectory, `encounter-director-code-${segment.name}.bin`),
      segment.data);
    writeFile(path.join(buildDirectory, `encounter-director-code-${segment.name}-packed.bin`),
      segment.packed);
    if (segment.transportData !== undefined) {
      writeFile(path.join(buildDirectory,
        `encounter-director-code-${segment.name}-transport.bin`), segment.transportData);
    }
  }
  if (directorModule.windowSegment !== undefined) {
    writeFile(path.join(buildDirectory, "resident-window-runtime.bin"),
      directorModule.windowSegment.data);
    writeFile(path.join(buildDirectory, "resident-window-runtime-packed.bin"),
      directorModule.windowSegment.packed);
  }
  writeFile(path.join(buildDirectory, "capital-player-collision.o"),
    capitalPlayerCollisionModule.object);
  writeFile(path.join(buildDirectory, "capital-player-collision.lst"),
    capitalPlayerCollisionModule.listing);
  writeFile(path.join(buildDirectory, "capital-player-collision.map"),
    capitalPlayerCollisionModule.map);
  writeFile(path.join(buildDirectory, "capital-player-collision.lbl"),
    capitalPlayerCollisionModule.labels);
  writeFile(path.join(buildDirectory, "capital-player-collision.bin"),
    capitalPlayerCollisionModule.raw);
  writeFile(path.join(buildDirectory, "capital-player-collision-packed.bin"),
    capitalPlayerCollisionModule.packed);
  writeFile(path.join(buildDirectory, "light-kernel.o"), lightKernelModule.object);
  writeFile(path.join(buildDirectory, "light-kernel.lst"), lightKernelModule.listing);
  writeFile(path.join(buildDirectory, "light-kernel.map"), lightKernelModule.map);
  writeFile(path.join(buildDirectory, "light-kernel.lbl"), lightKernelModule.labels);
  writeFile(path.join(buildDirectory, "light-kernel.bin"), lightKernelModule.raw);
  writeFile(path.join(buildDirectory, "sector-reader.o"), sectorReaderModule.object);
  writeFile(path.join(buildDirectory, "sector-reader.lst"), sectorReaderModule.listing);
  writeFile(path.join(buildDirectory, "sector-reader.map"), sectorReaderModule.map);
  writeFile(path.join(buildDirectory, "sector-reader.lbl"), sectorReaderModule.labels);
  writeFile(path.join(buildDirectory, "sector-reader.bin"), sectorReaderModule.raw);
  writeFile(path.join(buildDirectory, "starfield-runtime.bin"), starfieldRuntime);
  writeFile(path.join(buildDirectory, "starfield-runtime-packed.bin"), packedStarfieldRuntime);
  for (const stream of starfieldSplit.streams) {
    writeFile(path.join(buildDirectory,
      `starfield-runtime-packed-${stream.id.toLowerCase()}.bin`), stream.packed);
  }
  writeFile(path.join(buildDirectory, "a2-kernel-runtime.bin"), a2KernelRuntime);
  writeFile(path.join(buildDirectory, "entity-code-runtime.bin"), entityCodeRuntime);
  writeFile(path.join(buildDirectory, "entity-code-runtime-packed.bin"), packedEntityCodeRuntime);
  // PICKUP_CODE proper (at __PICKUP_CODE_RUN__), excluding the LIGHT_RESIDENT
  // prefix and the zero fill before the collision module.
  writeFile(path.join(buildDirectory, "pickup-code-runtime.bin"), pickupCodeRuntime.subarray(
    lightResidentBytes, lightResidentBytes + pickupCodeBytes));
  writeFile(path.join(buildDirectory, "light-resident-runtime.bin"),
    pickupCodeRuntime.subarray(0, lightResidentBytes));
  writeFile(path.join(buildDirectory, "weapon-pickup-phase-runtime.bin"), weaponPickupPhaseRuntime);
  writeFile(path.join(buildDirectory, "weapon-pickup-phase-runtime-packed.bin"), packedWeaponPickupPhaseBank);
  writeFile(path.join(buildDirectory, "void-strike-65.map"), mapFile);
  writeFile(path.join(buildDirectory, "void-strike-65.lbl"), labelFile);
  writeFile(path.join(buildDirectory, "manifest.json"), manifestBytes);
  const artifactDirectory = enemyReviewHarness
    ? path.join(buildDirectory, "enemy-review")
    : enemyCombatReviewHarness
      ? path.join(buildDirectory, "enemy-combat-review")
      : paletteCandidate
        ? path.join(buildDirectory, `enemy-palette-${enemyPaletteSlug}`)
        : distDirectory;
  writeFile(path.join(artifactDirectory, "void-strike-65-boot.bin"), transportPayload);
  writeFile(path.join(artifactDirectory, "void-strike-65.xex"), xex);
  writeFile(path.join(artifactDirectory, "void-strike-65.atr"), atr);
  writeFile(path.join(artifactDirectory, "void-strike-65-manifest.json"), manifestBytes);

  if (!isReviewVariant && !skipRuntimeMeasurement) validateBuildDirectory(rootDirectory);

  if (!quiet) {
    console.log(candidateBuild
      ? `Void Strike 65 ${gameVersion} candidate artifacts built; runtime evidence pending`
      : `Void Strike 65 ${gameVersion} built successfully`);
    console.log(`  boot    : ${initialBoot.bytes.length} bytes / ${bootSectors} sectors @ $${loadAddress.toString(16)}`);
    console.log(`  chunks  : ${transportPayload.length - initialBoot.bytes.length} bytes / ${extensionSectors} sectors`);
    console.log(`  total   : ${transportPayload.length} bytes / ${totalTransportSectors} occupied sectors`);
    console.log(`  entry   : $${startAddress.toString(16)}`);
    console.log(`  XEX     : ${xex.length} bytes`);
    console.log(`  ATR     : ${atr.length} bytes`);
    console.log(`  staging : $${packedResidentStagingAddress.toString(16)} reused after BROADSIDE publish`);
    if (enemyReviewHarness) {
      console.log(`  variant : compile-time enemy review harness`);
      console.log(`  output  : ${path.relative(rootDirectory, artifactDirectory)}`);
    } else if (enemyCombatReviewHarness) {
      console.log(`  variant : deterministic Interceptor combat review`);
      console.log(`  output  : ${path.relative(rootDirectory, artifactDirectory)}`);
    } else if (paletteCandidate) {
      console.log(`  variant : enemy palette ${paletteCandidate.id} ($${paletteCandidate.value.toString(16).padStart(2, "0")})`);
      console.log(`  output  : ${path.relative(rootDirectory, artifactDirectory)}`);
    }
  }
}

build().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
