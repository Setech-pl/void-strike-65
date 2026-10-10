import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { shareDir, toolchain } from "romdev-toolchain-cc65";
import { makeAtr, validateBuildDirectory } from "./formats.mjs";
import {
  guardFold, identityBlock, identitySector as renderIdentitySector, layoutId, levelReadOrder,
  renderGuardInclude, renderSumTable,
} from "./disk-guard.mjs";
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
  loadBootSplashDefinition,
  renderBootSplashCa65Include,
} from "./boot-splash-assets.mjs";
import {
  compileCapitalHulls,
  loadCapitalHullsDefinition,
  renderCapitalHullsCa65Include,
  HULL_STYLE_BLOCK_BYTES,
  HULL_STYLE_BLOCK_OFFSETS,
} from "./capital-hulls.mjs";
import {
  compileLevelFile,
  levelSourcePath,
  LEVEL_CORE_OFFSET,
  LEVEL_PAYLOAD_OFFSET,
  LEVEL_GEOMETRY_OFFSET,
  LEVEL_CORE_BYTES,
  LEVEL_PAYLOAD_BYTES,
  LEVEL_GEOMETRY_BYTES,
  LEVEL_IMAGE_SECTORS,
  LEVEL_CORE_ADDRESS,
  LEVEL_PAYLOAD_ADDRESS,
  LEVEL_GEOMETRY_ADDRESS,
  LEVEL_CORE_MAGIC,
  CORE_HEADER_BYTES,
  SECTOR_ARRAY_OFFSET,
  WAVE_ARRAY_OFFSET,
  MAX_SECTORS,
  MAX_WAVES,
  renderLevelDefCa65Include,
  renderLevelDefCHeader,
  CORE_DEBUG_START_SECTOR_OFFSET,
} from "./level-compiler.mjs";
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
  compileGameplayMusic,
  compileMusic,
  layoutGameplayMusicLike,
  loadMusicDefinition,
  renderGameplayMusicCa65Include,
  renderMusicCa65Include,
} from "./music.mjs";
import { peakVolumeSum, renderOracleStream } from "./music-oracle.mjs";

import {
  compileEntityEffects,
  loadEntityEffectsDefinition,
  renderEntityEffectsCa65Include,
} from "./entity-effects.mjs";
import {
  compileFrontendH31,
  compileMenuStars,
  loadFrontendH31Definition,
  renderFrontendH31Ca65Include,
  renderMenuStarsCa65Include,
} from "./frontend-h31-assets.mjs";
import { packBroadsideLzss, unpackBroadsideLzss } from "./broadside-lzss.mjs";
import {
  buildSummaryArtRuns,
  loadSummaryArtDefinition,
  renderSummaryLayoutInclude,
  SUMMARY_ART_SECTORS,
  SUMMARY_LAYOUT,
} from "./level-summary-assets.mjs";
import { measureRuntimeCycles } from "./runtime-cycles.mjs";
import {
  BOSS_BAND_A_SECTORS,
  BOSS_BAND_B_SECTORS,
  BOSS_BLOCK_BASE_SECTOR,
  BOSS_BLOCK_SECTORS,
  BOSS_CHARSET_MAX_SECTORS,
  BOSS_CLAIM,
  BOSS_REGION_RUN_OFFSETS,
  BOSS_REGION_SECTORS,
  BOSS_SCRATCH_ADDRESS,
  BOSS_SCRATCH_BYTES,
  BOSS_SLOT_C_ADDRESS,
  BOSS_SLOT_C_BYTES,
  BOSS_SLOT_D_ADDRESS,
  BOSS_SLOT_D_BYTES,
  BOSS_SLOT_E_ADDRESS,
  BOSS_SLOT_E_BYTES,
  BOSS_SLOT_F_ADDRESS,
  BOSS_SLOT_F_BYTES,
  BOSS_STAGING_ADDRESS,
  BOSS_THEME_SECTORS,
  bossRegionDirectory,
  compileBossRegion,
  bossShotGlyphsFrom,
  bossHostileShotGlyphsFrom,
  bossLaserFixtureDraft,
  loadBossRegionDraft,
  loadBossPlaceholders,
  bossPlaceholderDraft,
  renderBossLayoutHeader,
  renderBossLayoutInclude,
} from "./boss-assets.mjs";
import {
  evaluateReleaseGate,
  loadRecordedGateFailures,
  releaseGateFailureMessage,
  runtimeArtifactSet,
  runtimeEvidencePhase,
  validateRuntimeEvidenceBinding,
} from "./runtime-evidence.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const defaultBuildDirectory = path.join(rootDirectory, "build");
const distDirectory = path.join(rootDirectory, "dist");
const packageDefinition = JSON.parse(fs.readFileSync(path.join(rootDirectory, "package.json"), "utf8"));
const gameVersion = packageDefinition.version;
const quiet = process.argv.includes("--quiet");
const candidateBuild = runtimeEvidencePhase(process.argv) === "candidate";
const asmDirectorBaseline = process.argv.includes("--asm-director");
const skipRuntimeMeasurement = process.argv.includes("--skip-runtime-measurement");
const twoPmgRaiderPrototype = process.argv.includes("--two-pmg-raiders");
// Light multiplicity (plan §2.4 [C4], owner decision 2026-09-21). The
// provisional standalone Interceptor wave is MEASUREMENT SCAFFOLDING, not
// behaviour the game has today: real waves arrive with 4.6's Director and
// WaveDef records. The default build therefore runs one Light exactly as
// before and every replay and coverage clause passes unchanged; this variant
// arms the wave so the §4.3 native three-Light measurement has multi-Light
// frames to measure. It is not a shipping artifact.
const forceLightPopulation = process.argv.includes("--force-light-population");
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
// Owner decision 1 of 2026-09-22, superseded in part by decision 2 of
// 2026-09-23 (docs/plans/hull-set-v1.md §13): the allied steel is level data
// now, so this flag no longer overrides a constant the player ever sees — it
// overrides the LEVEL's colour byte (and, for coherence, the assembled
// pre-publication constant). It stays a review variant: its artifacts never
// reach dist/, runtime measurement is skipped and no gate consults it.
const alliedSteelArgument = process.argv.find((argument) =>
  argument.startsWith("--allied-steel="));
const alliedSteelSlug = alliedSteelArgument?.slice("--allied-steel=".length);
const alliedSteelValues = new Map([["88", 0x88], ["8A", 0x8a]]);
if (alliedSteelSlug && !alliedSteelValues.has(alliedSteelSlug.toUpperCase())) {
  throw new Error(`Unknown allied steel build ${alliedSteelSlug}`);
}
const alliedSteelValue = alliedSteelSlug
  ? alliedSteelValues.get(alliedSteelSlug.toUpperCase())
  : null;
// Owner smoke feedback of 2026-09-23, question two: today only white menu stars
// twinkle, because the twinkle dims to steel and steel has nothing to dim to.
// This review variant gives the steel stars the same share of twinklers using
// the cycle's existing OFF step (steel -> off -> steel), so the owner can
// compare life against noise. The runtime code is identical; only the build-time
// twinkle subset grows. Like every review variant its artifacts never reach
// dist/, runtime measurement is skipped and no gate consults it.
const menuSteelTwinkle = process.argv.includes("--menu-steel-twinkle");
// Owner smoke of 2026-09-23: the Bomber read as blue because its hull byte was
// $88, the allied steel's own byte. Green (hue C) is the accepted hue; RED was
// the stated fallback and was not taken, because the enemy capital hull is
// burgundy and a red Bomber blends into the hull it flies over. This variant
// builds that fallback so the owner can check that claim on hardware instead
// of taking it on trust. Review variant: never dist/, no runtime measurement,
// no gate.
const bomberHullArgument = process.argv.find((argument) =>
  argument.startsWith("--bomber-hull="));
const bomberHullSlug = bomberHullArgument?.slice("--bomber-hull=".length);
const bomberHullValues = new Map([["green", 0xc0], ["red", 0x40]]);
if (bomberHullSlug && !bomberHullValues.has(bomberHullSlug.toLowerCase())) {
  throw new Error(`Unknown Bomber hull build ${bomberHullSlug}`);
}
// green is the default the source already states, so only red is a variant.
const bomberHullFallbackValue = bomberHullSlug
  && bomberHullSlug.toLowerCase() !== "green"
  ? bomberHullValues.get(bomberHullSlug.toLowerCase())
  : null;
// Plasma FX B1.3 (docs/plans/plasma-fx.md §13): the Bomber's hue as a review
// parameter beside the player-side colour, named by its full-HP byte. Only the
// hue changes; the HP luminance ramp (8/6/4/2), the charge +4 and the flash +6
// are the source's. C8 is today's green, built explicitly for the comparison.
// Review variant: never dist/, no gate; the default build takes no flag.
const bomberColourArgument = process.argv.find((argument) =>
  argument.startsWith("--bomber-colour="));
const bomberColourSlug = bomberColourArgument?.slice("--bomber-colour=".length).toUpperCase();
const bomberColourHues = new Map([["C8", 0xc0], ["08", 0x00], ["68", 0x60], ["E8", 0xe0], ["28", 0x20]]);
if (bomberColourSlug && !bomberColourHues.has(bomberColourSlug)) {
  throw new Error(`Unknown Bomber colour build ${bomberColourSlug}; ` +
    `expected one of ${[...bomberColourHues.keys()].join(", ")}`);
}
if (bomberColourSlug && bomberHullFallbackValue !== null) {
  throw new Error("--bomber-colour and --bomber-hull cannot be combined");
}
const bomberColourValue = bomberColourSlug ? bomberColourHues.get(bomberColourSlug) : null;
const bomberHullValue = bomberColourValue ?? bomberHullFallbackValue;
const bomberColourSuffix = bomberColourValue === null ? "" : `-bomber-${bomberColourSlug}`;
// Capital hull set v1 step 2, §7 and decision 1: the campaign does not exist
// yet, so the only way to smoke a region is to bake it into level 1. The flag
// carries the whole REGION — the style's hull block and that region's allied
// steel — so one build shows the owner one quarter of the campaign. Review
// variant: build/hull-style-Rn/, never dist/, no runtime measurement, no gate.
const hullStyleArgument = process.argv.find((argument) =>
  argument.startsWith("--hull-style="));
const hullStyleSlug = hullStyleArgument?.slice("--hull-style=".length);
const hullStyleIds = new Map([["R1", 1], ["R2", 2], ["R3", 3], ["R4", 4]]);
if (hullStyleSlug && !hullStyleIds.has(hullStyleSlug.toUpperCase())) {
  throw new Error(`Unknown hull style build ${hullStyleSlug}`);
}
const hullStyleValue = hullStyleSlug ? hullStyleIds.get(hullStyleSlug.toUpperCase()) : null;
// Roadmap 4.6 step 2, the debug route (docs/plans/director-4.6.md §7):
// --level=N[:sector=M] builds the campaign's level N, entered at its sector M,
// so the owner can reach a level or a sector the campaign does not offer yet.
// A review variant in the exact shape of --hull-style: its artifacts go to
// build/level-N-sM/, never to dist/, runtime measurement is skipped and no
// gate consults it. The default build has no such code path at all - the
// sector reader's `.ifndef` keeps its byte identical and the Director's
// #ifdef leaves the debug_start_sector byte unread.
const levelDebugArgument = process.argv.find((argument) =>
  argument.startsWith("--level="));
const levelDebugMatch = levelDebugArgument === undefined
  ? null
  : /^--level=(\d+)(?::sector=(\d+))?$/.exec(levelDebugArgument);
if (levelDebugArgument !== undefined && levelDebugMatch === null) {
  throw new Error(`Unknown debug level build ${levelDebugArgument}; ` +
    "the form is --level=N or --level=N:sector=M");
}
// Owner decision, 2026-09-28 (docs/plans/pickup-colour.md §7 item 1): the
// pickup capsule owns COLPM3 in OPEN, and which byte it wears is the owner's
// hardware call between gold $1C, cyan $AC and orange $2C. The default build
// carries $1C until that smoke; each candidate builds as a review variant into
// build/pickup-colour-<hex>/, never dist/, with runtime measurement skipped and
// no gate consulting it. $1C is accepted as a flag value so the owner can build
// the placeholder explicitly beside the other two; it is then the same bytes as
// the default build and is still a variant directory.
const pickupColourArgument = process.argv.find((argument) =>
  argument.startsWith("--pickup-colour="));
const pickupColourSlug = pickupColourArgument?.slice("--pickup-colour=".length);
const pickupColourValues = new Map([["1C", 0x1c], ["AC", 0xac], ["2C", 0x2c]]);
if (pickupColourSlug && !pickupColourValues.has(pickupColourSlug.toUpperCase())) {
  throw new Error(`Unknown pickup colour build ${pickupColourSlug}; ` +
    "the candidates are 1C (gold), AC (cyan) and 2C (orange)");
}
const pickupColourValue = pickupColourSlug
  ? pickupColourValues.get(pickupColourSlug.toUpperCase())
  : null;
// Plasma FX (docs/plans/plasma-fx.md, owner answers of 2026-10-05, decision
// 1): the playfield COLPF2 the player's shots and explosions wear is chosen at
// a hardware smoke between $1E (the shipped yellow, decision U), $9E and $AE.
// Each candidate builds as a review variant into build/player-colour-<hex>/,
// never dist/, and composes with the debug route (build/player-colour-<hex>-
// level-N-sM/) so the owner can enter the yellow-sky sector in every colour.
const playerColourArgument = process.argv.find((argument) =>
  argument.startsWith("--player-colour="));
const playerColourSlug = playerColourArgument?.slice("--player-colour=".length);
const playerColourValues = new Map([["1E", 0x1e], ["9E", 0x9e], ["AE", 0xae]]);
if (playerColourSlug && !playerColourValues.has(playerColourSlug.toUpperCase())) {
  throw new Error(`Unknown player colour build ${playerColourSlug}; ` +
    "the candidates are 1E (yellow), 9E (cyan) and AE (mint)");
}
const playerColourValue = playerColourSlug
  ? playerColourValues.get(playerColourSlug.toUpperCase())
  : null;
// M5b-S4b (owner decision Q10, 2026-10-06): the laser fixture - region 1 with
// four uncovered emitter slots (scripts/boss-assets.mjs bossLaserFixtureDraft)
// and the laser tier fixed at 2 or 4 (an assembler define in slot D's
// laser_tier). Debug and review only: build/laser-fixture-<n>[-level-N-sM]/,
// never dist/, runtime measurement skipped, no gate consults it.
const laserFixtureArgument = process.argv.find((argument) => argument.startsWith("--laser-fixture="));
const laserFixtureSlug = laserFixtureArgument?.slice("--laser-fixture=".length);
if (laserFixtureSlug !== undefined && !["2", "4"].includes(laserFixtureSlug)) {
  throw new Error(`Unknown laser fixture ${laserFixtureSlug}; the tiers are 2 and 4`);
}
const laserFixtureTier = laserFixtureSlug === undefined ? null : Number(laserFixtureSlug);
// S5-1 (plan docs/plans/s5-boss-regions.md §5): --boss-region=N (2-4) enters
// region N's boss on level 1's route. Regions 2-4 have no level data yet, so
// the debug route's level run becomes the region's first level (4 / 7 / 10)
// with level 1's authored content: its id - which names the region, its
// theme, the summary's region art, the hull style and the laser tier (1 / 2 /
// 4) - is that level's throughout (the image header, the directory, the START
// GAME request). Composes with --level=1:sector=M and --laser-fixture=T
// (--laser-fixture=4 --boss-region=3 is region 3's level-9 case, tier 4).
// Debug only: build/[laser-fixture-T-]boss-region-N-level-1-sM/, never dist/.
const bossRegionArgument = process.argv.find((argument) => argument.startsWith("--boss-region="));
const bossRegionSlug = bossRegionArgument?.slice("--boss-region=".length);
if (bossRegionSlug !== undefined && !["2", "3", "4"].includes(bossRegionSlug)) {
  throw new Error(`Unknown boss region ${bossRegionSlug}; the routes are 2, 3 and 4`);
}
const bossRegionValue = bossRegionSlug === undefined ? null : Number(bossRegionSlug);
const levelDebugId = levelDebugMatch === null ? null : Number(levelDebugMatch[1]);
if (bossRegionValue !== null && levelDebugId !== 1) {
  throw new Error("--boss-region=N rides level 1's debug route: pass --level=1:sector=M with it");
}
// The level run's id: the debug level's, or the boss region's first level.
const levelRunId = bossRegionValue !== null ? 1 + 3 * (bossRegionValue - 1) : levelDebugId;
const levelDebugSector = levelDebugMatch === null
  ? 0 : Number(levelDebugMatch[2] ?? 0);
// 16 is LEVEL_MAX_ID, declared below with the rest of the layout; this check
// runs while the arguments are parsed, before that binding exists.
if (levelDebugId !== null && (levelDebugId < 1 || levelDebugId > 16)) {
  throw new Error(`--level=${levelDebugId} is outside 1..16`);
}
const isReviewVariant = enemyReviewHarness || enemyCombatReviewHarness ||
  Boolean(enemyPaletteSlug) || alliedSteelValue !== null || menuSteelTwinkle ||
  hullStyleValue !== null || bomberHullValue !== null || levelDebugId !== null ||
  pickupColourValue !== null || playerColourValue !== null || laserFixtureTier !== null;

// A REVIEW VARIANT OWNS ITS WHOLE BUILD DIRECTORY (owner decision, 2026-09-28).
// Until now a variant wrote its *artifacts* into build/<variant>/ but every
// intermediate it generated - the level images, the .inc files, the maps, the
// labels, build/manifest.json - still went to build/, on top of the default
// build's. So a variant left bytes behind that the default build and other
// tests then read. MEASURED instance: tests/build-variants.test.mjs builds
// --level=1:sector=2, whose level-1.bin carries debug_start_sector = 2, and
// tests/level-compiler.test.mjs T2 ("the image carries the compiled core")
// then failed against it whenever the suite happened to run them in that
// order. The variant's directory is now the build directory itself, so nothing
// it produces can be read by anything that did not ask for the variant.
const levelDebugSuffix = levelDebugId === null
  ? "" : `${bossRegionValue === null ? "" : `-boss-region-${bossRegionValue}`}` +
    `-level-${levelDebugId}-s${levelDebugSector}`;
const variantDirectoryName = laserFixtureTier !== null
  ? `laser-fixture-${laserFixtureTier}${levelDebugSuffix}`
  : playerColourValue !== null
  ? `player-colour-${playerColourSlug.toUpperCase()}${bomberColourSuffix}${levelDebugSuffix}`
  : bomberColourValue !== null
  ? `bomber-colour-${bomberColourSlug}${levelDebugSuffix}`
  : enemyReviewHarness
  ? "enemy-review"
  : enemyCombatReviewHarness
    ? "enemy-combat-review"
    : enemyPaletteSlug
      ? `enemy-palette-${enemyPaletteSlug}`
      : alliedSteelValue !== null
        ? `allied-steel-${alliedSteelSlug.toUpperCase()}`
        : menuSteelTwinkle
          ? "menu-steel-twinkle"
          : hullStyleValue !== null
            ? `hull-style-${hullStyleSlug.toUpperCase()}`
            : bomberHullValue !== null
              ? `bomber-hull-${bomberHullSlug.toLowerCase()}`
              : levelDebugId !== null
                ? levelDebugSuffix.slice(1)
                : pickupColourValue !== null
                  ? `pickup-colour-${pickupColourSlug.toUpperCase()}`
                  : null;
const buildDirectory = variantDirectoryName === null
  ? defaultBuildDirectory
  : path.join(defaultBuildDirectory, variantDirectoryName);
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
const basicWindowGuardAddress = 0xbc1a;
// Roadmap 4.3 window layout, as owner decision X (2026-09-21) divides it: the
// reader owns $A000-$A5FF, the level buffer $A600-$ADFF (16 sectors of 128 B)
// and the reader BSS $BC00-$BC19; the Director link owns $AE00-$BBFF as
// HYBRID_C_WINDOW; the six-byte window guard at $BC1A stays untouched.
// cfg/sector-reader.cfg and cfg/encounter-director.cfg are the other halves of
// this contract.
const sectorReaderAddress = 0xa000;
const levelBufferAddress = 0xa600;
const sectorReaderCapacityBytes = levelBufferAddress - sectorReaderAddress;
// Q-1, owner decision 2026-09-23 (docs/plans/director-4.6.md §3.1, §11 item 2):
// 16 sectors, 2,048 B. A level image is 13 sectors at its worst - header and
// gameplay music 5, hull block 3, LevelDef core 2, payload 2, HullGeometry 1 -
// so 3 sectors stay spare and the 2,048 B the buffer gave back go to the
// Director link's window, which is where roadmap 4.6's code has to live.
// Owner decision X (2026-09-21) had made it 32, from 44.
const levelBufferSectors = 16;
const levelBufferCapacityBytes = levelBufferSectors * 128;
const hybridWindowAddress = levelBufferAddress + levelBufferCapacityBytes;
const hybridWindowEndExclusive = 0xbc00;
const hybridWindowCapacityBytes = hybridWindowEndExclusive - hybridWindowAddress;
const LEVEL_FORMAT_VERSION = 1;
const LEVEL_MAX_ID = 16;
// Decision 1: the enemy hull style is level data — one region per quarter of
// the campaign. The campaign length is NOT hardcoded here: it is LEVEL_MAX_ID,
// the same constant src/hybrid/sector-reader.s asserts its directory against.
// At 16 that is the owner's 1-4 / 5-8 / 9-12 / 13-16; the arithmetic is right
// for any campaign length.
function hullStyleIdForLevel(level) {
  return Math.min(4, 1 + Math.floor(((level - 1) * 4) / LEVEL_MAX_ID));
}

// Decision 2: the allied hull colour is level data too, one byte, the
// GAMEPLAY_COLPF1 the gameplay DLI writes.
function alliedColpf1ForLevel(level) {
  return level * 2 <= LEVEL_MAX_ID ? alliedSteelFirstHalf : alliedSteelSecondHalf;
}

// The fixed base sector every level run is placed from. It is deliberately a
// constant and not a function of the transport: the reader's directory holds
// absolute sector numbers, so letting them follow the transport size would
// make the reader's data depend on its own record's length.
const levelBaseSector = 320;
// M5a-S1 (docs/plans/m5-loading-boss.md §6.3): overlay runs are placed from a
// second fixed base, above the 12 x 16 sectors reserved for levels from 320.
// Constant for the same reason as levelBaseSector: the reader's directory
// holds absolute sector numbers.
const overlayBaseSector = 512;
// The directory's fixed format (§4.2): {sector_lo, sector_hi, count, dest_lo,
// dest_hi} x 8. Index 0 is the capital slot A restore run; the rest are named
// for the sessions that fill them and read as "not on this disk" until then.
const OVERLAY_DIRECTORY = Object.freeze([
  "capital slot A restore (M5a-S1)",
  "boss code (M5b)",
  "boss region 1 (M5b)",
  "boss region 2 (M5b)",
  "boss region 3 (M5b)",
  "boss region 4 (M5b)",
  "hangar / summary art (M5a-S2)",
  "scores / save record (M5a-S2)",
  "level summary code (M5a-S2)",
  "disk identity (audit-hardening)",
]);
// M5a-S2 (§4.8, §6.3): the summary's runs. The code reads once per session at
// $0500; the art, one run per region at a fixed stride, is read first at every
// transition; the save record is ONE sector the reader alone may write
// (SAVE_RECORD_SECTOR in src/hybrid/sector-reader.s), shipped empty. Sectors
// 528-583 stay M5b's (boss code 16 + four regions of 10).
const OVERLAY_SUMMARY_ART = 6;
const OVERLAY_SAVE_RECORD = 7;
const OVERLAY_SUMMARY_CODE = 8;
// audit-hardening (AUD-01, docs/plans/audit-hardening.md §2): the disk's
// identity sector, the one before the record, which nothing else uses (the
// summary code may take 584-597). The build writes it; the game only reads
// it, through the directory, before every PUT.
const OVERLAY_IDENTITY = 9;
const identitySectorNumber = 598;
const summaryCodeSector = 584;
// Owner decision 2026-10-03: the module's home is $0500-$0BFF (1,792 B), so its
// run may take up to 14 sectors, 584-597, below the save record at 599.
const summaryModuleCapacityBytes = 0x0c00 - 0x0500;
const summaryCodeMaxSectors = summaryModuleCapacityBytes / 128;
const saveRecordSector = 599;
const summaryArtBaseSector = 600;
const summaryStagingAddress = 0x7810;
const summaryModuleAddress = 0x0500;
// M5b-S3 / S4a-i (docs/plans/m5-loading-boss.md §5.11, §5.13.4; owner answers
// Q-S1, Q-S6, Q-B5, Q-B8): the boss's disk. Inside the 528-583 reservation:
// the boss code (slot A, up to 16 sectors from 528, sized to use), the ONE
// shared three-sector install run at 544 (read to the staging RAM at $7810 and
// run in place) and slot C (the C controller at $1000, up to 16 sectors from
// 547, sized to use) - 35 of 56. Each region's runs in its own 16 sectors from
// 632: the theme (2, to $7990, read FIRST through the region's directory
// entry), band A (3, rows 0-5 to $A880), band B (3, rows 6-7 + tables to
// $AC80) and the charset (<= 8, sized to use, to $0C00), the last three read
// by slot A's head.
const OVERLAY_BOSS_CODE = 1;
const OVERLAY_BOSS_REGION = 2;
const bossReservationSector = 528;
const bossReservationSectors = 56;
const bossCodeSector = 528;
const bossCodeMaxSectors = 16;
const bossInstallSector = bossCodeSector + bossCodeMaxSectors;
const bossInstallSectors = 3;
const bossInstallAddress = 0x7810;
const bossSlotCSector = bossInstallSector + bossInstallSectors;
const bossSlotCMaxSectors = BOSS_SLOT_C_BYTES / 128;
// M5b-S4b (owner decision Q7): slot D, the lasers and the boss's shots in the
// band, at $1900, up to 14 sectors after slot C's 16 (563-576), sized to use.
const bossSlotDSector = bossSlotCSector + bossSlotCMaxSectors;
const bossSlotDMaxSectors = BOSS_SLOT_D_BYTES / 128;
// M5b-S4b.5 (owner decision of 2026-10-07): slot E at $4C00, up to 5 sectors
// after slot D's 14 (577-581), inside the boss code reservation, sized to use.
const bossSlotESector = bossSlotDSector + bossSlotDMaxSectors;
const bossSlotEMaxSectors = Math.ceil(BOSS_SLOT_E_BYTES / 128);
const bossRegionBaseSector = 632;
const bossRegionCount = 4;
// audit-hardening (AUD-01): what the disk's identity names - the layout's
// reservations, never a run's size or bytes - so every build of this layout,
// and every copy of its ATR, carries the same identity (scripts/disk-guard.mjs).
const diskLayout = Object.freeze({
  levelBaseSector, levelBufferSectors, overlayBaseSector, identitySector: identitySectorNumber,
  saveRecordSector, summaryCodeSector, summaryCodeMaxSectors, summaryArtBaseSector,
  summaryArtSectors: SUMMARY_ART_SECTORS, bossReservationSector, bossReservationSectors,
  bossRegionBaseSector, bossRegionSectors: BOSS_REGION_SECTORS, bossRegionCount,
  // S5-1: the region blocks' reservation (slot F's runs).
  bossBlockBaseSector: BOSS_BLOCK_BASE_SECTOR, bossBlockSectors: BOSS_BLOCK_SECTORS,
});
const diskIdentity = identityBlock(diskLayout);
// The window copies this many bytes of the region's staging run over the
// level's track (src/hybrid/c-asm-abi.s `@theme`, an 8-bit loop that wraps).
const bossThemeCopyBytes = 256;
// Music v2 §1.4 placement G1 (owner answer Q-P1 ACCEPTED, 2026-09-22). The
// gameplay music player is code inside the per-level image: it sits directly
// behind the eight-byte header and executes from $A608 once the image is in
// LEVEL_BUFFER. The reservation is sized for the v2 player (534 B) so this
// transport change is paid exactly once, in the placement commit; the v1
// player that moves here first uses 355 B of it.
const levelHeaderBytes = 8;
const gameplayMusicSectors = 5;
const gameplayMusicAddress = levelBufferAddress + levelHeaderBytes;
const gameplayMusicCapacityBytes = gameplayMusicSectors * 128 - levelHeaderBytes;
// Capital hull set v1 step 2 (plan §3.1): the region's enemy hull style — its
// packed map, codebook, seven surface glyphs and per-row collision boundaries,
// 280 B — rides in the three sectors behind the music, and the level's allied
// steel is one byte inside it (decision 2). The runtime reads it at fixed
// addresses, so the block's home in the image is a build constant.
const hullBlockBytes = HULL_STYLE_BLOCK_BYTES;
const hullBlockOffsets = HULL_STYLE_BLOCK_OFFSETS;
const hullBlockAlliedColpf1Offset = HULL_STYLE_BLOCK_OFFSETS.alliedColpf1;
const hullBlockSectors = 3;
const hullBlockImageOffset = gameplayMusicSectors * 128;
const hullBlockAddress = levelBufferAddress + hullBlockImageOffset;
// One-based sector within the image where roadmap 4.6's LevelDef starts.
// Recorded in header byte 7, which was reserved and zero until now.
const levelDefFirstSector = gameplayMusicSectors + hullBlockSectors + 1;
// Roadmap 4.6 step 1 (docs/plans/director-4.6.md §2.1, §8): the image grows
// from 8 to 13 sectors to carry the three LevelDef pages the compiler emits -
// core $AA00, payload $AB00, HullGeometry $AC00. Sectors 1-8 are untouched:
// the header keeps byte 7 = 9, the music block and the hull block keep their
// frozen addresses and their bytes. Nothing resident reads the new pages yet;
// the Director arrives at step 2, the payload at step 5, the geometry at
// step 4. No boot sector is bought - the block is outside the boot transport,
// exactly as the music and hull moves were - and the ATR START GAME read grows
// by five sectors behind the loader screen.
const levelOneSectors = LEVEL_IMAGE_SECTORS;
// Decision 2: the first half of the campaign flies in the brighter steel the
// owner chose at the step-1 smoke; the second half is colder. $84 is
// provisional — the owner picks the final darker step ($84 or $86) at this
// step's smoke.
const alliedSteelFirstHalf = 0x88;
const alliedSteelSecondHalf = 0x84;
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
// --asm-director only. Not re-measured for the 512-byte ADR-003 splash blob
// that now rides at the tail of the initial block: that mode has no build
// script, no test and no evidence in this tree, so the figure would be a guess.
// Re-measure it in the same change that revives the mode.
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
  // M5a-S2 (docs/plans/m5-loading-boss.md §4.8): the transitions and the stat hooks.
  ["music_stop", "START GAME: the menu theme off, every channel silent"],
  ["music_stop_gameplay", "the level read: the music block is about to be overwritten"],
  ["insert_top_score", "the level's end: the game's score into TOP SCORES"],
  ["hit_timer", "the hit SFX timer; zero gives channel 2 back to the music"],
  ["MUSIC_ACTIVE", "the music player's live flag (menu and gameplay share it)"],
  ["update_score_display", "the kill hook's continuation"],
  ["add_debris_score", "the debris hooks' continuation"],
  ["entity_debris_publish", "the capital-frame hook's continuation"],
  ["FIGHTER_PROJECTILE_LIFETIME", "the shot scan: $FF on a slot's allocation frame"],
  ["FIGHTER_PROJECTILE_ACTIVE", "the shot scan: a slot still holding its shot"],
  ["ENEMY_PENDING_DAMAGE", "this frame's damage per Heavy member"],
  ["ENEMY_PENDING_SOURCE", "this frame's best damage source per Heavy member"],
  ["CAPITAL_SECTOR_STATE", "the terminal COMPLETE the level's end waits for"],
  ["PLAYER_LIFECYCLE", "the level's end waits while the player is dying"],
]);

// M5a-S2: what the $0500 summary module calls in main.
const SUMMARY_MAIN_SYMBOLS = Object.freeze([
  ["render_frontend_data", "jsr clear_screen, then the record loop (the summary enters at +3)"],
  ["clear_screen", "clears SCREEN"],
  ["wait_frame_start", "returns just after VCOUNT leaves zero"],
  ["draw_top_score_bcd_byte", "two BCD digits at (dst_ptr),y"],
  ["dst_ptr", "zero-page destination pointer"],
  ["frontend_data_ptr", "zero-page source pointer read by render_frontend_data"],
  ["score_bcd_lo", "the score, packed BCD"],
  ["score_bcd_hi", "the score, packed BCD"],
  ["MUSIC_ACTIVE", "the music player's live flag"],
  ["PLAYER_LIFECYCLE", "PLAYER_LIVES is the byte after it"],
  ["ACTIVE_GAMEPLAY_FRAME_LO", "the active gameplay clock, 16-bit"],
]);
// M5a-S2: what the $0500 summary module calls in the reader (its own link).
const SUMMARY_READER_SYMBOLS = Object.freeze([
  "sector_reader_read_run", "sector_reader_read_sectors", "sector_reader_load",
  "sector_reader_resident_hit", "sector_reader_restore_if_overlaid",
  "sector_reader_failure_screen", "sector_reader_frame_tick",
  "sector_reader_pokey_setup", "sector_reader_send_command", "sector_reader_begin_receive",
  "sector_reader_receive_byte", "sector_reader_tx_byte", "sector_reader_tx_done",
  "sector_reader_quiesce", "SAVE_RECORD_ENTRY",
  "sr_requested_id", "sr_sector_lo", "sr_sector_hi", "sr_sectors_left", "sr_dst",
  "overlay_directory", "SAVE_RECORD_SECTOR",
  // Owner review (2026-10-03): START GAME's top line, one record in the
  // reader; and the VCOUNT the reader's waits compare with, re-synced when
  // the summary's count starts.
  "sr_engaging_record", "sr_vcount_last",
  // M5b-S3 (Q-S4): START GAME restores what the boss patched, gated by the
  // same flag as the reader's slot-A restore.
  "sr_slot_a_overlaid",
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
  ["music_stop_gameplay", "S5-1: the boss entry's first call, tail-called by the HUD booster backup"],
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

// M5a-S1 (docs/plans/m5-loading-boss.md §4.1): every resident call into the
// capital group goes through this table, appended to the Light kernel's frozen
// vector block in the code window. The capital overlay's entries are jumps to
// the real routines; a later overlay (the boss) installs its own image with
// the same meanings. Entries are only ever APPENDED: main.s binds to
// CAPITAL_VECTOR_* by index through director-abi.inc, and the sector reader
// carries the same image to put the table back after a capital restore.
// These are the group's entry points from outside it, found by call graph
// (§4.1 estimated "~20"; the other plan names are calls inside the group).
const CAPITAL_VECTORS = Object.freeze([
  ["CAPITAL_VECTOR_INIT", "init_broadside", "start_gameplay: capital state, flash and explosion slots"],
  ["CAPITAL_VECTOR_UPDATE", "update_broadside", "handle_collisions: the per-frame shell tick"],
  ["CAPITAL_VECTOR_TICK_EXPLOSIONS", "tick_capital_explosions", "main_loop, frame visuals"],
  ["CAPITAL_VECTOR_TICK_FLASHES", "tick_launch_flashes", "main_loop, frame visuals"],
  ["CAPITAL_VECTOR_ENGINE", "update_engine_animation", "main_loop, frame visuals"],
  ["CAPITAL_VECTOR_HULL_CONTACT", "handle_player_hull_contact", "main_loop, player against the hull"],
  ["CAPITAL_VECTOR_RENDER_FLASHES", "render_launch_flashes", "render_launch_flashes_with_capital_debris"],
  ["CAPITAL_VECTOR_RENDER_EXPLOSIONS", "render_capital_explosions", "main_loop, effect visuals"],
  ["CAPITAL_VECTOR_SECTOR_COMPLETION", "update_sector_completion", "integration_update_sector_completion"],
  ["CAPITAL_VECTOR_RESTORE_MUZZLES", "restore_active_muzzles", "scroll_world_columns, before the ring copy"],
  ["CAPITAL_VECTOR_PREPARE_ROW", "prepare_next_hull_row", "update_starfield, frames without a hull step"],
  ["CAPITAL_VECTOR_SCROLL_HULL", "scroll_hull_columns", "update_starfield, the hull step"],
]);

function renderCapitalVectorsInclude(labels) {
  const lines = [
    "; Generated by scripts/build.mjs for M5a-S1 - do not edit.",
    "; The capital vector table: one JMP per entry, in CAPITAL_VECTORS order.",
    "",
  ];
  for (const [constant, target, note] of CAPITAL_VECTORS) {
    const address = labels.get(target);
    if (!Number.isInteger(address)) {
      throw new Error(`M5a-S1: main.s no longer has ${target}, capital vector ${constant}`);
    }
    lines.push(`    jmp $${address.toString(16).toUpperCase().padStart(4, "0")}` +
      `   ; ${constant}: ${target} - ${note}`);
  }
  return `${lines.join("\n")}\n`;
}

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

// Music v2 §1.4: the gameplay music player links on its own, after main, so
// the main-link symbols it touches reach it as generated equates - the shape
// the sector reader and the Light kernel already use. A moved or renamed
// symbol is a build error here rather than a jump into whatever now lives at
// the old address.
const GAMEPLAY_MUSIC_MAIN_SYMBOLS = Object.freeze([
  ["sound_enabled", "the SOUND option; no music starts while it is off"],
  ["fire_timer", "shot SFX on channel 1; suppresses the music write there"],
  ["hit_timer", "hit SFX on channel 2; suppresses the music write there"],
  ["MUSIC_ACTIVE", "transport flag main tests before calling the tick"],
  ["MUSIC_ROW_TIMER", "frames to the next row"],
  ["MUSIC_SEQUENCE_INDEX", "position in the pattern sequence"],
  ["MUSIC_PATTERN_ROW", "row inside the current pattern"],
  ["GAME_MUSIC_COLUMN", "2 B: the column offset each voice is reading"],
  ["GAME_MUSIC_DIVIDER", "2 B: the note each voice holds"],
  ["GAME_MUSIC_AGE", "2 B: envelope cursor per voice, $FF while resting"],
  ["GAME_MUSIC_ENABLED", "the persistent GAME MUSIC option"],
  ["PLAYER_LIFECYCLE", "the death mute test"],
  ["PLAYER_DYING", "the lifecycle value that mutes both voices"],
]);

// The player's three entry points, in the frozen order of its vector table.
// Each is three bytes; main.s reaches them by constant, exactly as it reaches
// the sector reader at $A000 and the Light kernel in the code window.
const GAMEPLAY_MUSIC_VECTORS = Object.freeze([
  ["GAMEPLAY_MUSIC_START", "music_start_gameplay: arm the transport at row zero"],
  ["GAMEPLAY_MUSIC_TICK", "music_tick_gameplay: one PAL frame of score and publication"],
  ["GAMEPLAY_MUSIC_RESTORE", "music_restore_gameplay_channels: republish the cached voices"],
]);

function renderGameplayMusicAbiInclude() {
  const hex = (value) => `$${value.toString(16).toUpperCase().padStart(4, "0")}`;
  const lines = [
    "; Generated by scripts/build.mjs for music v2 §1.4 - do not edit.",
    "; The gameplay music player's frozen entry vectors inside the per-level",
    "; image. main.s calls these three addresses and nothing else in that link.",
    "",
    `GAMEPLAY_MUSIC_BLOCK                   = ${hex(gameplayMusicAddress)}`,
    `GAMEPLAY_MUSIC_BLOCK_END               = ${hex(gameplayMusicAddress + gameplayMusicCapacityBytes)}`,
  ];
  GAMEPLAY_MUSIC_VECTORS.forEach(([name, note], index) => {
    lines.push(`${name.padEnd(38)} = ${hex(gameplayMusicAddress + index * 3)}   ; ${note}`);
  });
  return `${lines.join("\n")}\n`;
}

// The level hull block's frozen addresses inside the level buffer. main.s
// reads the block only through these, exactly as it reaches the gameplay music
// player only through its three vectors.
function renderLevelHullBlockInclude() {
  const hex = (value) => `$${value.toString(16).toUpperCase().padStart(4, "0")}`;
  return [
    "; Generated by scripts/build.mjs for hull set v1 step 2 - do not edit.",
    "; The per-level enemy hull style, inside the level image at sector " +
      `${gameplayMusicSectors + 1}.`,
    "",
    `LEVEL_HULL_BLOCK                       = ${hex(hullBlockAddress)}`,
    `LEVEL_HULL_BLOCK_STYLE_ID              = ${hex(hullBlockAddress + 0)}`,
    `LEVEL_HULL_BLOCK_ALLIED_COLPF1         = ${hex(hullBlockAddress + hullBlockAlliedColpf1Offset)}`,
    `LEVEL_HULL_BLOCK_PACKED_MAP            = ${hex(hullBlockAddress + hullBlockOffsets.packedMap)}`,
    `LEVEL_HULL_BLOCK_CODEBOOK              = ${hex(hullBlockAddress + hullBlockOffsets.codebook)}`,
    `LEVEL_HULL_BLOCK_GLYPHS                = ${hex(hullBlockAddress + hullBlockOffsets.glyphs)}`,
    `LEVEL_HULL_BLOCK_BOUNDARIES            = ${hex(hullBlockAddress + hullBlockOffsets.collisionBoundaries)}`,
    `LEVEL_HULL_BLOCK_END                   = ${hex(hullBlockAddress + hullBlockBytes)}`,
    "",
  ].join("\n") + "\n";
}

function renderGameplayMusicMainAbiInclude(labels) {
  const lines = [
    "; Generated by scripts/build.mjs for music v2 §1.4 - do not edit.",
    "; Main-link symbols the gameplay music player touches. The player is its",
    "; own link (plan §1.4 placement G1); these are its only dependencies on",
    "; main.s.",
    "",
  ];
  for (const [name, note] of GAMEPLAY_MUSIC_MAIN_SYMBOLS) {
    const address = labels.get(name);
    if (!Number.isInteger(address)) {
      throw new Error(`music v2: main.s no longer exports ${name}, which the gameplay ` +
        "music player uses");
    }
    lines.push(`${name.padEnd(30)} = $${address.toString(16).toUpperCase().padStart(4, "0")}` +
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
function buildLevelImage({ id, sectors, musicBytes, hullBlock, alliedColpf1, levelPages }) {
  const bytes = Buffer.alloc(sectors * 128);
  bytes[0] = "V".charCodeAt(0);
  bytes[1] = "S".charCodeAt(0);
  bytes[2] = LEVEL_FORMAT_VERSION;
  bytes[3] = id;
  bytes[4] = sectors;
  bytes.writeUInt16LE(bytes.length - levelHeaderBytes, 5);
  // Header byte 7 was reserved and zero. Music v2 §1.4 gives it a meaning:
  // the one-based sector inside the image where LevelDef starts, because
  // sectors 1..gameplayMusicSectors now carry the gameplay music player.
  bytes[7] = levelDefFirstSector;
  for (let index = levelHeaderBytes; index < bytes.length; index += 1) {
    bytes[index] = ((index * 7) + (id * 0x1d) + 0x5a) & 0xff;
  }
  if (musicBytes.length > gameplayMusicCapacityBytes) {
    throw new Error(`music v2: the gameplay music block is ${musicBytes.length} B of ` +
      `${gameplayMusicCapacityBytes} B reserved at $${gameplayMusicAddress.toString(16)}`);
  }
  musicBytes.copy(bytes, levelHeaderBytes);
  // Step 2: the region's hull block, with the level's allied steel stamped
  // into it. The generator emits the block per STYLE and leaves byte 2 zero;
  // the colour is per LEVEL, so it is written here (plan §13 decision 2).
  if (hullBlock.length !== hullBlockBytes) {
    throw new Error(`the hull block is ${hullBlock.length} B; the level image reserves ` +
      `${hullBlockBytes} B at sector ${gameplayMusicSectors + 1}`);
  }
  hullBlock.copy(bytes, hullBlockImageOffset);
  bytes[hullBlockImageOffset + hullBlockAlliedColpf1Offset] = alliedColpf1;
  // Roadmap 4.6 step 1: the three compiled LevelDef pages. They are written
  // last and over the inert pattern, so sectors 1-8 stay byte-identical to the
  // image that shipped before this step.
  if (levelPages) {
    for (const [page, offset, size] of [
      [levelPages.core, LEVEL_CORE_OFFSET, LEVEL_CORE_BYTES],
      [levelPages.payload, LEVEL_PAYLOAD_OFFSET, LEVEL_PAYLOAD_BYTES],
      [levelPages.geometry, LEVEL_GEOMETRY_OFFSET, LEVEL_GEOMETRY_BYTES],
    ]) {
      if (page.length !== size) {
        throw new Error(`4.6 level ${id}: a LevelDef page is ${page.length} B, not ${size}`);
      }
      if (offset + size > bytes.length) {
        throw new Error(`4.6 level ${id}: the LevelDef pages need ` +
          `${offset + size} B; the image is ${bytes.length} B`);
      }
      page.copy(bytes, offset);
    }
  }
  return bytes;
}

// The resident directory the reader indexes by level id. Generated so the
// sector numbers can never drift from where the build actually put the runs.
function renderOverlayDirectoryInclude({ runs, slotAddress, slotBytes, vectorImage, entries = [] }) {
  const byte = (value) => `$${(value & 0xff).toString(16).padStart(2, "0")}`;
  const lines = [
    "; Generated by scripts/build.mjs for M5a-S1 - do not edit.",
    `; Overlay directory: ${OVERLAY_DIRECTORY.length} entries of {sector_lo, sector_hi, count, dest_lo, dest_hi}.`,
    "; A zero count means the build placed no run there; sector_reader_read_run",
    "; rejects it without touching SIO.",
    `OVERLAY_DIRECTORY_ENTRIES = ${OVERLAY_DIRECTORY.length}`,
    "OVERLAY_CAPITAL_SLOT_A = 0",
    `OVERLAY_SUMMARY_ART = ${OVERLAY_SUMMARY_ART}`,
    `OVERLAY_SAVE_RECORD = ${OVERLAY_SAVE_RECORD}`,
    `OVERLAY_SUMMARY_CODE = ${OVERLAY_SUMMARY_CODE}`,
    `OVERLAY_IDENTITY = ${OVERLAY_IDENTITY}`,
    `CAPITAL_SLOT_A = $${slotAddress.toString(16).toUpperCase()}`,
    `CAPITAL_SLOT_A_BYTES = ${slotBytes}`,
    "overlay_directory:",
  ];
  OVERLAY_DIRECTORY.forEach((name, index) => {
    const run = runs.find((entry) => entry.index === index) ??
      entries.find((entry) => entry.index === index);
    lines.push(run
      ? `        .byte ${byte(run.startSector)}, ${byte(run.startSector >> 8)}, ${run.sectors}, ` +
        `${byte(run.destination)}, ${byte(run.destination >> 8)}\t; ${index}: ${name}, ` +
        `sector ${run.startSector}`
      : `        .byte $00, $00, $00, $00, $00\t; ${index}: ${name}: not on this disk`);
  });
  // audit-hardening: the capital vector table's image moved to the Light
  // kernel's link (src/hybrid/light-kernel.s); `vectorImage` is still checked
  // against it by the caller.
  void vectorImage;
  lines.push("overlay_directory_end:");
  return `${lines.join("\n")}\n`;
}

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
  configText = null, defines = [] }) {
  const source = fs.readFileSync(sourcePath);
  const config = configText === null ? fs.readFileSync(configPath) : Buffer.from(configText);
  const base = `/project/build/${stem}`;
  const assembled = await runWasmTool(
    "ca65",
    { [`${base}.s`]: source, ...extraInputs },
    ["--cpu", "6502", "-g", ...defines.flatMap((define) => ["-D", define]),
      "-l", `${base}.lst`, "-o", `${base}.o`, `${base}.s`],
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

async function buildHybridDirectorModule(fighterWeaponsInclude, levelDefInclude,
  levelDefHeader, levelDebugStartSector, bossLayoutInclude) {
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
      // feat/sector-flow: the Director reads light_state for the field test.
      "/project/src/c/enemy-archetype.h": archetypeHeader,
      "/project/src/c/level-def.h": levelDefHeader,
      "/cc65/include/stdint.h": stdintHeader,
    },
    ["--cpu", "6502", "-Oirs", "-I", "/project/src/c", "-I", "/cc65/include",
      ...(levelDebugStartSector ? ["-D", "LEVEL_DEBUG_START=1"] : []),
      "-o", `${base}-generated.s`, "/project/src/c/director.c"],
    [`${base}-generated.s`],
  );
  const generatedAssembly = compiled.outputs[`${base}-generated.s`];
  const lifecycleCompiled = await runWasmTool(
    "cc65",
    {
      "/project/src/c/lifecycle.c": lifecycleSource,
      "/project/src/c/lifecycle.h": lifecycleHeader,
      "/project/src/c/director.h": cHeader,
      "/project/src/c/enemy-archetype.h": archetypeHeader,
      "/project/src/c/level-def.h": levelDefHeader,
      "/cc65/include/stdint.h": stdintHeader,
    },
    ["--cpu", "6502", "-Oirs", "-I", "/project/src/c", "-I", "/cc65/include",
      ...(forceLightPopulation ? ["-D", "LIGHT_FORCE_POPULATION=1"] : []),
      ...(bomberHullValue !== null
        ? ["-D", `BOMBER_HULL_HUE_OVERRIDE=0x${bomberHullValue.toString(16)}u`] : []),
      "-o", `${base}-lifecycle-generated.s`, "/project/src/c/lifecycle.c"],
    [`${base}-lifecycle-generated.s`],
  );
  const lifecycleGeneratedAssembly =
    lifecycleCompiled.outputs[`${base}-lifecycle-generated.s`];
  if (process.env.VS65_DUMP_GENERATED === "1") {
    writeFile(path.join(buildDirectory, "director-generated.s"), generatedAssembly);
    writeFile(path.join(buildDirectory, "lifecycle-generated.s"), lifecycleGeneratedAssembly);
  }
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
    { [`${base}-abi.s`]: abiSource,
      "/project/build/fighter-weapons.inc": fighterWeaponsInclude,
      "/project/build/level-def.inc": levelDefInclude,
      // M5b-S3: the boss entry's resident half and the addresses it pins.
      "/project/build/boss-layout.inc": bossLayoutInclude,
      "/project/build/boss-entry-pins.inc": fs.readFileSync(
        path.join(rootDirectory, "src", "hybrid", "boss-entry-pins.inc")) },
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
  // Roadmap 4.6 step 2: LEVEL1_DATA retired; what rides in DIRECTOR_RAM
  // beside the code is the Director's own policy rodata (the subtype
  // ceilings, the class spacing floors, the hazard costs).
  const rodataBytes = parsedLabels.get("__DIRECTOR_C_RODATA_SIZE__");
  const bssBytes = parsedLabels.get("__DIRECTOR_C_BSS_SIZE__");
  const lifecycleBssBytes = parsedLabels.get("__HYBRID_C_STATE_SIZE__");
  const sectorWindowBytes = parsedLabels.get("__HYBRID_C_SECTOR_SIZE__");
  const arenaAsmBytes = parsedLabels.get("__HYBRID_ASM_ARENA_SIZE__");
  const arenaCodeBytes = parsedLabels.get("__HYBRID_C_ARENA_SIZE__");
  const arenaRodataBytes = parsedLabels.get("__HYBRID_C_ARENA_RODATA_SIZE__");
  const windowAsmBytes = parsedLabels.get("__HYBRID_ASM_WINDOW_SIZE__");
  const windowCodeBytes = parsedLabels.get("__HYBRID_C_WINDOW_SIZE__");
  const windowRodataBytes = parsedLabels.get("__HYBRID_C_WINDOW_RODATA_SIZE__");
  // feat/sector-flow: the Director's sector-flow verdicts, placed last.
  const windowFlowBytes = parsedLabels.get("__HYBRID_C_WINDOW_FLOW_SIZE__");
  const basicWindowBytes = [windowAsmBytes, windowCodeBytes, windowRodataBytes, windowFlowBytes]
    .every(Number.isInteger)
    ? windowAsmBytes + windowCodeBytes + windowRodataBytes + windowFlowBytes : undefined;
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
  // Owner decision X, re-sized by Q-1 (2026-09-23): the Director link's share
  // of decision B's window is exactly $AE00-$BBFF. Its upper neighbour is the
  // reader BSS at $BC00
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
      `${hybridWindowCapacityBytes} B at $${hybridWindowAddress.toString(16)}-` +
      `$${(hybridWindowEndExclusive - 1).toString(16)}, below the sector reader BSS at ` +
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
    // Heavy break-up (plan-4.6-placement.md §7.4 variant 2): the kill frame's
    // DEFERRABLE token claim, and the deferred-once bit its forcing rule needs.
    ["HYBRID_ENEMY_HEAVY_BREAKUP_CLAIM", "enemy_heavy_breakup_claim"],
    ["HEAVY_BREAKUP_PENDING", "heavy_breakup_pending"],
    ["HEAVY_MEMBER_X", "heavy_member_x"],
    ["HEAVY_HULL_COLOUR", "heavy_hull_colour"],
    ["HEAVY_MEMBER_COLOUR", "heavy_member_colour"],
    ["HYBRID_BUILD_HOSTILE_GLYPHS", "build_hostile_weapon_glyphs"],
    ["HEAVY_ARCHETYPE_OFFSET", "heavy_archetype_offset"],
    ["ENEMY_LIGHT_TICK", "enemy_light_tick"],
    ["ENEMY_LIGHT_HIT", "enemy_light_hit"],
    ["ENEMY_LIGHT_WAVE", "enemy_light_wave"],
    ["LIGHT_STATE", "light_state"],
    ["LIGHT_X", "light_x"],
    ["LIGHT_Y", "light_y"],
    ["LIGHT_SCREEN_LO", "light_screen_lo"],
    ["LIGHT_SCREEN_HI", "light_screen_hi"],
    ["LIGHT_BACKING0", "light_backing0"],
    ["LIGHT_RESOLVE_SAVE", "light_resolve_save"],
    ["LIGHT_CELL_END", "light_cell_end"],
    ["LIGHT_SCRATCH", "light_scratch"],
    ["LIGHT_SLOT_SAVE", "light_slot_save"],
    ["LIGHT_SLOT", "light_slot"],
    ["LIGHT_SLOT_LIMIT", "light_slot_limit"],
    ["LIGHT_SCREEN_SLOT_LIMIT", "light_screen_slot_limit"],
    ["LIGHT_ROTATE_FRAME", "light_rotate_frame"],
    ["LIGHT_ARCHETYPE_OFFSET", "light_archetype_offset"],
    ["LIGHT_CODE", "light_code"],
    // Roadmap 4.6 step 5 (docs/plans/director-4.6.md §8.3): the look each
    // appearance pair was admitted for, which the kernel's install reads; and
    // the near-star operand the sky veneer patches, which src/main.s asserts
    // is its own label.
    ["LIGHT_PAIR_KEY", "light_pair_key"],
    ["NEAR_STAR_PIXEL_OPERAND", "near_star_pixel_operand_abi"],
    // The rotate gate for Heavy break-ups (docs/plans/m3-waves-heavy.md §9):
    // the routine the claim calls, which src/main.s asserts is its own label.
    ["WORLD_ROTATE_DUE", "world_rotate_due_abi"],
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
      `${name} = HYBRID_ASM_WINDOW_BASE+${index * 3}\n`).join("") +
    // M5a-S1: the capital vector table follows the Light kernel's five.
    `CAPITAL_VECTOR_TABLE = HYBRID_ASM_WINDOW_BASE+${LIGHT_KERNEL_VECTORS.length * 3}\n` +
    `CAPITAL_VECTOR_COUNT = ${CAPITAL_VECTORS.length}\n` +
    CAPITAL_VECTORS.map(([name], index) =>
      `${name} = CAPITAL_VECTOR_TABLE+${index * 3}\n`).join(""));
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
  // The boot splash's cassette script is data, not code: the segment table, the
  // tone constants and the fade come from JSON the owner retunes by ear.
  const bootSplashDefinitionPath = path.join(
    rootDirectory,
    "assets",
    "audio",
    "boot-splash.json",
  );
  const bootSplashAsset = loadBootSplashDefinition(bootSplashDefinitionPath);
  const bootSplashInclude = Buffer.from(renderBootSplashCa65Include(bootSplashAsset));
  writeFile(path.join(buildDirectory, "boot-splash.inc"), bootSplashInclude);
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
  // One 280-byte block per enemy style. Step 2 puts the region's block into
  // the level image (docs/plans/hull-set-v1.md §3.1); these files stay as the
  // per-style evidence the tests and the review builds read.
  for (const levelSet of capitalHullsAsset.levelHullSets) {
    writeFile(
      path.join(buildDirectory, `hull-style-${levelSet.styleName}.bin`),
      Buffer.from(capitalHullsAsset.hullStyleBlocks[levelSet.styleId - 1]),
    );
  }
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
  // Roadmap 4.6 step 2: the LevelDef core page's address, magic and offsets,
  // generated from scripts/level-compiler.mjs - the one place the layout is
  // decided - so the ca65 ABI and the C reader cannot drift from the writer.
  const levelDefInclude = Buffer.from(renderLevelDefCa65Include());
  const levelDefHeader = Buffer.from(renderLevelDefCHeader());
  writeFile(path.join(buildDirectory, "level-def.inc"), levelDefInclude);
  writeFile(path.join(buildDirectory, "level-def.h"), levelDefHeader);
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
  const menuMusicAsset = compileMusic(loadMusicDefinition(menuMusicDefinitionPath));
  const menuMusicInclude = Buffer.from(renderMusicCa65Include(menuMusicAsset));
  writeFile(path.join(buildDirectory, "menu-music.inc"), menuMusicInclude);
  const gameplayMusicDefinitionPath = path.join(
    rootDirectory, "assets", "music", "gameplay-theme.json",
  );
  // The gameplay theme shares the menu's pitch table; only the dividers it
  // actually uses are compiled into its own block (plan §1.1).
  const gameplayMusicAsset = compileGameplayMusic(
    loadMusicDefinition(gameplayMusicDefinitionPath),
    { pitches: menuMusicAsset.pitches },
  );
  const gameplayMusicInclude = Buffer.from(
    renderGameplayMusicCa65Include(gameplayMusicAsset),
  );
  writeFile(path.join(buildDirectory, "gameplay-music.inc"), gameplayMusicInclude);
  // M5b-S3: the boss theme, laid out like the level's track so that the boss
  // entry can copy it over that track inside the level's music block (§2.6,
  // decision 32), and region 1's boss (M5b-S4a-i: from its PNG drafts, Q-B2)
  // with the theme in its first run. Regions 2-4 are S5's: their directory
  // entries and runs stay empty.
  const bossThemeAsset = compileGameplayMusic(
    loadMusicDefinition(path.join(rootDirectory, "assets", "music", "boss-theme.json")),
    { pitches: menuMusicAsset.pitches },
  );
  const bossThemeImage = layoutGameplayMusicLike(bossThemeAsset, gameplayMusicAsset,
    { capacity: bossThemeCopyBytes });
  // M5b-S4b (owner decision Q10): --laser-fixture=2|4 is a debug-only review
  // variant that installs the laser fixture (region 1 with four uncovered
  // emitter slots) as region 1 and fixes the tier; the default build never
  // takes this path.
  const regionOneDraft = loadBossRegionDraft(bossRegionDirectory(rootDirectory, 1));
  const regionOneSource = laserFixtureTier === null
    ? regionOneDraft : bossLaserFixtureDraft(regionOneDraft, laserFixtureTier);
  const compileRegion = (draft) => compileBossRegion(draft,
    { themeImage: bossThemeImage,
      shotGlyphs: bossShotGlyphsFrom(fighterWeaponsAsset.glyphs.player_fighter),
      hostileShotGlyphs: bossHostileShotGlyphsFrom(fighterWeaponsAsset.hostileWeaponVisuals[0]) });
  const regionOne = compileRegion(regionOneSource);
  // (loadBossRegionDraft carries the same glyphs; the build passes its own
  // weapons asset so a variant that changed it converts the boss with it.)
  // S5-1 (owner decision Q10, plan s5-boss-regions §6): four regions on the
  // disk - regions 2-4 are copies of region 1 (the laser fixture's, on a
  // fixture build) until their own sessions replace them. Each region's look
  // tail is its block in slot F now, so the regions no longer share a home.
  // S5-2 (plan §4.2): each copy takes its placeholder entry
  // (assets/graphics/boss-regions/placeholders.json: the finale on, region 1
  // keeping it off, owner answer Q6).
  const bossPlaceholders = loadBossPlaceholders(rootDirectory);
  const bossRegions = [regionOne, ...[2, 3, 4].map((region) =>
    compileRegion(bossPlaceholderDraft(regionOneSource, bossPlaceholders[String(region)])))];
  const bossLayoutInclude = Buffer.from(renderBossLayoutInclude());
  const bossLayoutHeader = Buffer.from(renderBossLayoutHeader());
  writeFile(path.join(buildDirectory, "boss-layout.inc"), bossLayoutInclude);
  writeFile(path.join(buildDirectory, "boss-layout.h"), bossLayoutHeader);
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
  const frontendH31Definition = loadFrontendH31Definition(
    path.join(rootDirectory, "assets", "graphics", "frontend-h31.json"),
  );
  const frontendH31Asset = compileFrontendH31(frontendH31Definition);
  const frontendH31Include = Buffer.from(renderFrontendH31Ca65Include(frontendH31Asset));
  writeFile(path.join(buildDirectory, "frontend-h31.inc"), frontendH31Include);
  // Main-menu background stars: positions are chosen once here from the asset
  // seed, so the sky is deterministic and reproducible from Git (owner A).
  const menuStarsAsset = compileMenuStars(frontendH31Definition,
    { steelTwinkle: menuSteelTwinkle });
  const menuStarsInclude = Buffer.from(renderMenuStarsCa65Include(menuStarsAsset));
  writeFile(path.join(buildDirectory, "menu-stars.inc"), menuStarsInclude);

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
    : await buildHybridDirectorModule(fighterWeaponsInclude, levelDefInclude,
      levelDefHeader, levelDebugId !== null, bossLayoutInclude);
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
      `$${(windowCEnd ?? 0).toString(16)}, outside $${hybridWindowAddress.toString(16)}-` +
      `$${(hybridWindowEndExclusive - 1).toString(16)}`);
  }
  const lightKernelAddress = windowCEnd;
  const directorAbiInclude =
    renderDirectorAbiInclude(directorModule.labels, lightKernelAddress);
  writeFile(path.join(buildDirectory, "director-abi.inc"), directorAbiInclude);
  // Music v2 §1.4: main.s reaches the gameplay music player only through the
  // three frozen vectors at the head of the level image's music block. They
  // are fixed constants of the image layout, so this include is generated
  // before main assembles; the player's own ABI include, which needs main's
  // labels, is generated after it links.
  const gameplayMusicAbiInclude = renderGameplayMusicAbiInclude();
  writeFile(path.join(buildDirectory, "gameplay-music-abi.inc"), gameplayMusicAbiInclude);
  const levelHullBlockInclude = renderLevelHullBlockInclude();
  writeFile(path.join(buildDirectory, "level-hull-block.inc"), levelHullBlockInclude);

  const assembled = await runWasmTool(
    "ca65",
    {
      "/project/src/main.s": source,
      "/project/build/loader-screen.inc": loaderInclude,
      "/project/build/loader-display-list.inc": loaderDisplayListInclude,
      "/project/build/capital-hulls.inc": capitalHullsInclude,
      "/project/build/level-def.inc": levelDefInclude,
      "/project/build/enemy-roster.inc": enemyRosterInclude,
      "/project/build/fighter-weapons.inc": fighterWeaponsInclude,
      "/project/build/starfield.inc": starfieldInclude,
      "/project/build/menu-music.inc": menuMusicInclude,
      "/project/build/gameplay-music-abi.inc": gameplayMusicAbiInclude,
      "/project/build/level-hull-block.inc": Buffer.from(levelHullBlockInclude),
      "/project/build/entity-effects.inc": entityEffectsInclude,
      "/project/build/frontend-h31.inc": frontendH31Include,
      "/project/build/menu-stars.inc": menuStarsInclude,
      "/project/build/director-abi.inc": directorAbiInclude,
      "/project/build/boot-splash.inc": bootSplashInclude,
      "/project/build/boot-splash.s": fs.readFileSync(
        path.join(rootDirectory, "src", "boot-splash.s")),
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
      ...(alliedSteelValue !== null
        ? ["-D", `GAMEPLAY_COLPF1_OVERRIDE=${alliedSteelValue}`] : []),
      ...(pickupColourValue !== null
        ? ["-D", `PICKUP_BOOST_COLOUR_OVERRIDE=${pickupColourValue}`] : []),
      ...(playerColourValue !== null
        ? ["-D", `PLAYER_SIDE_COLOUR_OVERRIDE=${playerColourValue}`] : []),
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
  const bootSplashSourceOperand = labels.get("boot_splash_source");
  const bootSplashSourceHighOperand = labels.get("boot_splash_source_high");
  const bootSplashLoadAddress = labels.get("__BOOT_SPLASH_LOAD__");
  const bootSplashRunAddress = labels.get("__BOOT_SPLASH_RUN__");
  const bootSplashBytes = labels.get("__BOOT_SPLASH_SIZE__");
  const bootSplashCodeBytes = labels.get("splash_blob_code_end") - labels.get("splash_blob_start");
  const bootSplashImmutableAddress = labels.get("splash_immutable");
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
    !Number.isInteger(bootChunkManifestAddress) ||
    !Number.isInteger(bootSplashLoadAddress) || !Number.isInteger(bootSplashRunAddress) ||
    !Number.isInteger(bootSplashBytes) || !Number.isInteger(bootSplashCodeBytes) ||
    !Number.isInteger(bootSplashSourceOperand) ||
    !Number.isInteger(bootSplashImmutableAddress) ||
    !Number.isInteger(bootSplashSourceHighOperand) ||
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
  // BOOT_SPLASH links directly behind BOOT_STAGE2 in the shared BOOT2FILE area,
  // but it is transported separately, at the tail of the initial block (see
  // initialContentParts below), and copied to $0500-$06FF by the stage-2
  // entry right after disable_basic_rom.
  if (bootSplashRunAddress !== 0x0500 || bootSplashBytes !== 0x0200 ||
    bootSplashLoadAddress !== bootStage2LoadAddress + bootStage2Bytes ||
    bootStage2Bytes + bootSplashBytes > 0x0800 ||
    bootSplashCodeBytes < 1 || bootSplashCodeBytes > bootSplashBytes) {
    throw new Error("the boot splash blob lies outside its reviewed $0500-$06FF placement");
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
  // Music v2 §1.4 placement G1: the gameplay music player's own link. It runs
  // HERE, after main, because it reaches main through the generated
  // build/gameplay-music-main-abi.inc; its bytes are then spliced into every
  // level image, so every level's ATR sectors carry the same player.
  const gameplayMusicMainAbiInclude = renderGameplayMusicMainAbiInclude(labels);
  writeFile(path.join(buildDirectory, "gameplay-music-main-abi.inc"),
    gameplayMusicMainAbiInclude);
  const gameplayMusicConfig =
    fs.readFileSync(path.join(rootDirectory, "cfg", "gameplay-music.cfg"), "utf8").replace(
      /GAMEPLAY_MUSIC_RAM:(\s*)start = \$[0-9A-Fa-f]+, size = \$[0-9A-Fa-f]+/,
      (_, spacing) => `GAMEPLAY_MUSIC_RAM:${spacing}start = $${
        gameplayMusicAddress.toString(16).toUpperCase()}, size = $${
        gameplayMusicCapacityBytes.toString(16).toUpperCase().padStart(4, "0")}`);
  const gameplayMusicModule = await buildResidentModule({
    sourcePath: path.join(rootDirectory, "src", "hybrid", "gameplay-music.s"),
    configPath: path.join(rootDirectory, "cfg", "gameplay-music.cfg"),
    configText: gameplayMusicConfig,
    stem: "gameplay-music",
    extraInputs: {
      "/project/build/gameplay-music.inc": gameplayMusicInclude,
      "/project/build/gameplay-music-abi.inc": Buffer.from(gameplayMusicAbiInclude),
      "/project/build/gameplay-music-main-abi.inc": Buffer.from(gameplayMusicMainAbiInclude),
    },
  });
  const gameplayMusicLabels = parseViceLabels(gameplayMusicModule.labels.toString("utf8"));
  const gameMusicPlayerStart = gameplayMusicLabels.get("game_music_player_start");
  const gameMusicPlayerEnd = gameplayMusicLabels.get("game_music_player_end");
  const gameMusicDataStart = gameplayMusicLabels.get("game_music_data_start");
  const gameMusicDataEnd = gameplayMusicLabels.get("game_music_data_end");
  if (![gameMusicPlayerStart, gameMusicPlayerEnd, gameMusicDataStart, gameMusicDataEnd]
    .every(Number.isInteger)) {
    throw new Error("the gameplay music link is missing its player or data bounds");
  }
  if (gameplayMusicLabels.get("gameplay_music_vectors") !== gameplayMusicAddress) {
    throw new Error("the gameplay music vector table does not start at the reserved address");
  }
  writeFile(path.join(buildDirectory, "gameplay-music.bin"), gameplayMusicModule.raw);
  writeFile(path.join(buildDirectory, "gameplay-music.lbl"), gameplayMusicModule.labels);
  writeFile(path.join(buildDirectory, "gameplay-music.map"), gameplayMusicModule.map);
  // Debug route (plan §7): the build bakes level N's image where level 1's
  // would go - the ATR's first level run - so START GAME loads it. The
  // default build is unchanged.
  const levelRuns = [
    { id: levelRunId ?? 1, startSector: levelBaseSector, sectors: levelOneSectors },
  ];
  // S5-1: a boss-region route compiles level 1's source under its run's id.
  const levelSourceIdForRun = (id) => (bossRegionValue !== null ? 1 : id);
  // Decision 1: the region owns the style. --hull-style=Rn forces one region
  // onto every level so the owner can smoke a quarter of the campaign before
  // the campaign exists (§7); the default build reads the level's own region.
  const hullStyleIdForRun = (id) => hullStyleValue ?? hullStyleIdForLevel(id);
  // A forced region carries its own half of the campaign with it: R1/R2 are the
  // brighter steel, R3/R4 the colder one, whichever level the build stamps.
  const regionFirstLevel = (styleId) => 1 + Math.floor(((styleId - 1) * LEVEL_MAX_ID) / 4);
  const alliedColpf1ForRun = (id) => alliedSteelValue ??
    alliedColpf1ForLevel(hullStyleValue === null ? id : regionFirstLevel(hullStyleValue));
  // Roadmap 4.6 step 1: the authored level compiles here, so a level file that
  // asks for something the runtime cannot honour fails the build, not the
  // owner's smoke (plan §5).
  const compiledLevels = new Map(levelRuns.map((run) =>
    [run.id, compileLevelFile(levelSourcePath(levelSourceIdForRun(run.id)), { hullAsset: capitalHullsAsset })]));
  // ... and stamps the sector to enter into the core page's own byte, which
  // director_c_init reads only under LEVEL_DEBUG_START.
  if (levelDebugId !== null) {
    const compiled = compiledLevels.get(levelRunId);
    if (levelDebugSector >= compiled.sectors.length) {
      throw new Error(`--level=${levelDebugId}:sector=${levelDebugSector} is outside the ` +
        `level's ${compiled.sectors.length} sectors`);
    }
    compiled.pages.core[CORE_DEBUG_START_SECTOR_OFFSET] = levelDebugSector;
  }
  for (const compiled of compiledLevels.values()) {
    if (!quiet) for (const warning of compiled.warnings) console.warn(`level warning: ${warning}`);
  }
  const levelImages = new Map(levelRuns.map((run) =>
    [run.id, buildLevelImage({
      id: run.id, sectors: run.sectors, musicBytes: gameplayMusicModule.raw,
      hullBlock: Buffer.from(
        capitalHullsAsset.hullStyleBlocks[hullStyleIdForRun(run.id) - 1]),
      alliedColpf1: alliedColpf1ForRun(run.id),
      levelPages: compiledLevels.get(run.id).pages,
    })]));
  // The level START GAME loads: level 1, or level N on the debug route. Every
  // read below keys on the run's OWN id - roadmap 4.6 step 3 (owner decision
  // 2026-09-30, docs/plans/director-4.6.md §11 item 17): a hard-coded 1 here
  // made every --level=N build but N = 1 throw, because the map above is keyed
  // by the run's id and holds no level 1 on the debug route.
  const [startRun] = levelRuns;
  const startLevelImage = levelImages.get(startRun.id);
  // The block exactly as that level carries it, colour byte and all: the
  // runtime harnesses install it at $A880 the way they install the music block.
  const startLevelHullBlock = Buffer.from(startLevelImage.subarray(
    hullBlockImageOffset, hullBlockImageOffset + hullBlockBytes));
  writeFile(path.join(buildDirectory, "level-hull-block.bin"), startLevelHullBlock);
  const levelDirectoryInclude = renderLevelDirectoryInclude(levelRuns);
  writeFile(path.join(buildDirectory, "level-directory.inc"), levelDirectoryInclude);
  const sectorReaderMainAbiInclude = renderSectorReaderMainAbiInclude(labels);
  writeFile(path.join(buildDirectory, "main-abi.inc"), sectorReaderMainAbiInclude);
  for (const run of levelRuns) {
    writeFile(path.join(buildDirectory, `level-${run.id}.bin`), levelImages.get(run.id));
  }
  // Roadmap 4.6 step 2: the Director reads the core page at LEVEL_CORE_ADDRESS.
  // On both media the sector reader puts it there as part of the level image;
  // the runtime HARNESSES install segments from build/, so the page is written
  // out on its own the way the gameplay music player and the hull block are,
  // and scripts/runtime-image.mjs places it from the manifest.
  const startLevelCorePage = Buffer.from(startLevelImage.subarray(
    LEVEL_CORE_OFFSET, LEVEL_CORE_OFFSET + LEVEL_CORE_BYTES));
  writeFile(path.join(buildDirectory, "level-core.bin"), startLevelCorePage);
  // Roadmap 4.6 step 4: the capital resolvers and phase machine read the
  // HullGeometry page, so the harnesses place it the same way.
  writeFile(path.join(buildDirectory, "level-geometry.bin"), Buffer.from(
    startLevelImage.subarray(LEVEL_GEOMETRY_OFFSET, LEVEL_GEOMETRY_OFFSET + LEVEL_GEOMETRY_BYTES)));
  // Roadmap 4.6 step 5: the Light install and the hostile glyph builder read
  // the payload page, so the harnesses place it the same way.
  const startLevelPayloadPage = Buffer.from(startLevelImage.subarray(
    LEVEL_PAYLOAD_OFFSET, LEVEL_PAYLOAD_OFFSET + LEVEL_PAYLOAD_BYTES));
  writeFile(path.join(buildDirectory, "level-payload.bin"), startLevelPayloadPage);
  // Light multiplicity step 1b (plan §3.1 [C1]): the fourth link. It runs HERE,
  // after main, because the kernel reaches 25 main-link symbols through
  // light-kernel-abi.inc - which is why it cannot live in the Director link,
  // built before main. Its start is not a constant: it is the address after
  // the last byte the Director link's C half used in this same build, so the
  // window stays one pool with no boundary to get wrong.
  const lightKernelMainAbiInclude = renderLightKernelMainAbiInclude(labels);
  writeFile(path.join(buildDirectory, "light-kernel-abi.inc"), lightKernelMainAbiInclude);
  const capitalVectorsInclude = renderCapitalVectorsInclude(labels);
  writeFile(path.join(buildDirectory, "capital-vectors.inc"), capitalVectorsInclude);
  const lightKernelCapacityBytes = hybridWindowEndExclusive - lightKernelAddress;
  const lightKernelConfig =
    fs.readFileSync(path.join(rootDirectory, "cfg", "light-kernel.cfg"), "utf8").replace(
      /LIGHT_KERNEL_RAM:(\s*)start = \$[0-9A-Fa-f]+, size = \$[0-9A-Fa-f]+/,
      (_, spacing) => `LIGHT_KERNEL_RAM:${spacing}start = $${
        lightKernelAddress.toString(16).toUpperCase()}, size = $${
        lightKernelCapacityBytes.toString(16).toUpperCase().padStart(4, "0")}`);
  // audit-hardening: the disk guard links in this record (src/hybrid/disk-guard.s);
  // its expected values are known only once every run has linked, so the
  // kernel links here with zeros and again, with the values, before transport.
  const renderDiskGuardInclude = (sums = null) => renderGuardInclude({
    names: OVERLAY_DIRECTORY, recordEntry: OVERLAY_SAVE_RECORD, sums, identity: diskIdentity,
  });
  const linkLightKernel = (diskGuardInclude) => buildResidentModule({
    sourcePath: path.join(rootDirectory, "src", "hybrid", "light-kernel.s"),
    configPath: path.join(rootDirectory, "cfg", "light-kernel.cfg"),
    configText: lightKernelConfig,
    stem: "light-kernel",
    extraInputs: {
      "/project/build/disk-guard.s": fs.readFileSync(
        path.join(rootDirectory, "src", "hybrid", "disk-guard.s")),
      "/project/build/disk-guard-sums.inc": Buffer.from(diskGuardInclude),
      "/project/build/light-kernel-abi.inc": Buffer.from(lightKernelMainAbiInclude),
      // M5a-S2: the reader's fixed stat vectors the kernel's re-points name.
      "/project/build/level-summary-abi.inc": fs.readFileSync(
        path.join(rootDirectory, "src", "hybrid", "level-summary-abi.inc")),
      "/project/build/capital-vectors.inc": Buffer.from(capitalVectorsInclude),
      "/project/build/director-abi.inc": directorAbiInclude,
      "/project/build/fighter-weapons.inc": fighterWeaponsInclude,
      "/project/build/entity-effects.inc": entityEffectsInclude,
      "/project/build/capital-hulls.inc": capitalHullsInclude,
      "/project/build/starfield.inc": starfieldInclude,
      // Roadmap 4.6 step 5: the install reads payload looks from the page.
      "/project/build/level-def.inc": levelDefInclude,
      // S5-1: the HUD booster backup's cells and its home in the boss scratch page.
      "/project/build/boss-layout.inc": bossLayoutInclude,
    },
  });
  let lightKernelModule = await linkLightKernel(renderDiskGuardInclude());
  if (lightKernelModule.raw.length > lightKernelCapacityBytes) {
    throw new Error(`4.6 Light kernel exceeds the code window: ` +
      `${lightKernelModule.raw.length} of ${lightKernelCapacityBytes} B above ` +
      `$${lightKernelAddress.toString(16)}`);
  }

  // M5a-S1: slot A and its restore run. The run IS the resident image's bytes
  // at the slot, so a restore can only ever put back what boot landed there.
  const slotAddress = labels.get("capital_slot_a");
  const slotEnd = labels.get("capital_slot_a_end");
  if (!Number.isInteger(slotAddress) || !Number.isInteger(slotEnd) ||
    slotAddress < broadsideRunAddress || slotEnd > broadsideRunAddress + broadsideRuntime.length ||
    (slotEnd - slotAddress) % 128 !== 0) {
    throw new Error("M5a-S1: slot A is not whole sectors inside the BROADSIDE runtime");
  }
  const capitalSlotImage = Buffer.from(broadsideRuntime.subarray(
    slotAddress - broadsideRunAddress, slotEnd - broadsideRunAddress));
  const overlayRuns = [{
    index: 0,
    name: "capital-slot-a",
    startSector: overlayBaseSector,
    sectors: capitalSlotImage.length / 128,
    destination: slotAddress,
    data: capitalSlotImage,
    file: "overlay-capital-slot-a.bin",
  }];
  for (const run of overlayRuns) {
    writeFile(path.join(buildDirectory, run.file), run.data);
    if (run.startSector + run.sectors - 1 > chunkLoaderConstants.atrSectors) {
      throw new Error(`M5a-S1 overlay run ${run.name} runs past the disk`);
    }
    for (const level of levelRuns) {
      if (run.startSector < level.startSector + levelBufferSectors &&
        level.startSector < run.startSector + run.sectors) {
        throw new Error(`M5a-S1 overlay run ${run.name} overlaps level ${level.id}'s reservation`);
      }
    }
  }
  const capitalVectorImage = CAPITAL_VECTORS.map(([constant, target], index) => ({
    constant, target, address: labels.get(target),
    windowAddress: lightKernelAddress + LIGHT_KERNEL_VECTORS.length * 3 + index * 3,
  }));
  capitalVectorImage.forEach(({ windowAddress, address, constant }) => {
    const offset = windowAddress - lightKernelAddress;
    if (lightKernelModule.raw[offset] !== 0x4c ||
      lightKernelModule.raw.readUInt16LE(offset + 1) !== address) {
      throw new Error(`M5a-S1: the window's ${constant} is not jmp $${address.toString(16)}`);
    }
  });
  {
    // audit-hardening: the restore's image (now in this link) is the table.
    const image = parseViceLabels(lightKernelModule.labels.toString("utf8")).get("capital_vector_image");
    const table = capitalVectorImage[0].windowAddress - lightKernelAddress;
    const bytes = CAPITAL_VECTORS.length * 3;
    if (!Number.isInteger(image) || !lightKernelModule.raw.subarray(image - lightKernelAddress,
      image - lightKernelAddress + bytes).equals(lightKernelModule.raw.subarray(table, table + bytes))) {
      throw new Error("audit-hardening: the capital vector image is not the window's table");
    }
  }
  // M5a-S2: the summary's art runs, one per region, from assets. They are
  // placed before the reader links so the directory can name region 1's run.
  const summaryArtSource = path.join(rootDirectory, "assets", "graphics", "level-summary.json");
  const summaryArtRuns = buildSummaryArtRuns({
    definition: loadSummaryArtDefinition(summaryArtSource),
    hullAsset: JSON.parse(fs.readFileSync(capitalHullsDefinitionPath, "utf8")),
  }).map((run, index) => ({
    ...run,
    startSector: summaryArtBaseSector + index * SUMMARY_ART_SECTORS,
    sectors: SUMMARY_ART_SECTORS,
    file: `level-summary-art-${run.region}.bin`,
  }));
  const summaryLayoutInclude = renderSummaryLayoutInclude();
  writeFile(path.join(buildDirectory, "level-summary-layout.inc"), summaryLayoutInclude);
  // The summary module links after the reader (it calls the reader), but the
  // reader's directory names the module's sector count: the reader links once
  // with the region's full 14 sectors, the module links, and the reader is
  // relinked with the real count - one data byte, which moves no label (checked).
  // audit-hardening (AUD-01): the identity sector lands in the record's
  // read-back buffer, which the read-back after the PUT reuses.
  const saveVerifyBuffer = (() => {
    const match = /^SAVE_VERIFY_BUFFER\s*=\s*\$([0-9A-Fa-f]+)/m.exec(fs.readFileSync(
      path.join(rootDirectory, "src", "hybrid", "level-summary-abi.inc"), "utf8"));
    if (!match) throw new Error("audit-hardening: level-summary-abi.inc has no SAVE_VERIFY_BUFFER");
    return Number.parseInt(match[1], 16);
  })();
  const summaryDirectoryEntries = (codeSectors, bossCodeSectors = bossCodeMaxSectors) => [
    { index: OVERLAY_IDENTITY, startSector: identitySectorNumber, sectors: 1,
      destination: saveVerifyBuffer },
    { index: OVERLAY_SUMMARY_ART, startSector: summaryArtRuns[0].startSector,
      sectors: SUMMARY_ART_SECTORS, destination: summaryStagingAddress },
    { index: OVERLAY_SAVE_RECORD, startSector: saveRecordSector, sectors: 1,
      destination: summaryStagingAddress },
    { index: OVERLAY_SUMMARY_CODE, startSector: summaryCodeSector,
      sectors: codeSectors, destination: summaryModuleAddress },
    // M5b-S3: the boss code into slot A, and each region's theme run - the
    // two runs the window's boss entry reads by index. M5b-S4a-i (Q-B8): the
    // boss code's count is the linked code's, set once the boss has linked.
    { index: OVERLAY_BOSS_CODE, startSector: bossCodeSector, sectors: bossCodeSectors,
      destination: slotAddress },
    ...bossRegions.map((region, index) => ({
      index: OVERLAY_BOSS_REGION + index,
      startSector: bossRegionBaseSector + index * BOSS_REGION_SECTORS + BOSS_REGION_RUN_OFFSETS.theme,
      sectors: BOSS_THEME_SECTORS, destination: BOSS_STAGING_ADDRESS,
    })),
  ];
  const renderDirectory = (codeSectors, bossCodeSectors) => renderOverlayDirectoryInclude({
    runs: overlayRuns, slotAddress, slotBytes: capitalSlotImage.length,
    vectorImage: capitalVectorImage, entries: summaryDirectoryEntries(codeSectors, bossCodeSectors),
  });
  let overlayDirectoryInclude = renderDirectory(summaryCodeMaxSectors);
  const levelSummaryAbiInclude = fs.readFileSync(
    path.join(rootDirectory, "src", "hybrid", "level-summary-abi.inc"));
  const lightKernelLabels = parseViceLabels(lightKernelModule.labels.toString("utf8"));
  const lightKernelLabelsInclude = [
    "; Generated by scripts/build.mjs for M5a-S2 - do not edit.",
    "; The Light kernel's entries the sector reader's stat hooks continue into,",
    "; and (audit-hardening) the disk guard's that its reads call.",
    ...["light_publish", "guard_begin", "guard_fold", "guard_check", "capital_vector_image"].map((name) => {
      const address = lightKernelLabels.get(name);
      if (!Number.isInteger(address)) throw new Error(`M5a-S2: the Light kernel has no ${name}`);
      return `${name} = $${address.toString(16).toUpperCase()}`;
    }),
    `GUARD_ENTRIES = ${OVERLAY_DIRECTORY.length}`,
    `GUARD_RECORD_ENTRY = ${OVERLAY_SAVE_RECORD}`,
    "",
  ].join("\n");

  const linkSectorReader = () => buildResidentModule({
    sourcePath: path.join(rootDirectory, "src", "hybrid", "sector-reader.s"),
    configPath: path.join(rootDirectory, "cfg", "sector-reader.cfg"),
    stem: "sector-reader",
    // Debug route (plan §7): the only difference the reader sees is WHICH
    // level id START GAME asks for.
    defines: levelDebugId === null ? [] : [`LEVEL_DEBUG_ID=${levelRunId}`],
    extraInputs: {
      "/project/build/level-directory.inc": Buffer.from(levelDirectoryInclude),
      "/project/build/main-abi.inc": Buffer.from(sectorReaderMainAbiInclude),
      "/project/build/director-abi.inc": directorAbiInclude,
      "/project/build/overlay-directory.inc": Buffer.from(overlayDirectoryInclude),
      "/project/build/level-summary-abi.inc": levelSummaryAbiInclude,
      "/project/build/light-kernel-labels.inc": Buffer.from(lightKernelLabelsInclude),
      "/project/build/fighter-weapons.inc": fighterWeaponsInclude,
      "/project/build/capital-hulls.inc": capitalHullsInclude,
      "/project/build/gameplay-music-abi.inc": Buffer.from(gameplayMusicAbiInclude),
    },
  });
  let sectorReaderModule = await linkSectorReader();
  let sectorReaderLabels = parseViceLabels(sectorReaderModule.labels.toString("utf8"));
  if (sectorReaderLabels.get("SAVE_RECORD_SECTOR") !== saveRecordSector) {
    throw new Error("M5a-S2: the reader's SAVE_RECORD_SECTOR is not the directory's record sector");
  }

  // M5a-S2: the $0500 summary module, its own link after the reader.
  if (linkedPayload[labels.get("render_frontend_data") - loadAddress] !== 0x20 ||
    linkedPayload.readUInt16LE(labels.get("render_frontend_data") - loadAddress + 1) !==
      labels.get("clear_screen")) {
    throw new Error("M5a-S2: render_frontend_data no longer starts `jsr clear_screen`; " +
      "the summary's record entry at +3 would draw from the wrong place");
  }
  const summaryMainAbiInclude = SUMMARY_MAIN_SYMBOLS.map(([name, note]) => {
    const address = labels.get(name);
    if (!Number.isInteger(address)) throw new Error(`M5a-S2: main has no ${name}`);
    return `${name.padEnd(28)} = $${address.toString(16).toUpperCase().padStart(4, "0")}   ; ${note}`;
  }).join("\n") + "\n";
  writeFile(path.join(buildDirectory, "summary-main-abi.inc"), summaryMainAbiInclude);
  const summaryReaderAbiInclude = [
    ...SUMMARY_READER_SYMBOLS.map((name) => {
      const address = sectorReaderLabels.get(name);
      if (!Number.isInteger(address)) throw new Error(`M5a-S2: the reader has no ${name}`);
      return `${name.padEnd(36)} = $${address.toString(16).toUpperCase().padStart(4, "0")}`;
    }),
    `OVERLAY_SUMMARY_ART = ${OVERLAY_SUMMARY_ART}`,
    `OVERLAY_SAVE_RECORD = ${OVERLAY_SAVE_RECORD}`,
    // audit-hardening: the disk guard's entries and identity the summary uses.
    `OVERLAY_IDENTITY = ${OVERLAY_IDENTITY}`,
    `GUARD_IDENTITY_BYTES = ${diskIdentity.length}`,
    ...["guard_reset", "guard_compare", "guard_identity"].map((name) => {
      const address = lightKernelLabels.get(name);
      if (!Number.isInteger(address)) throw new Error(`audit-hardening: the Light kernel has no ${name}`);
      return `${name.padEnd(36)} = $${address.toString(16).toUpperCase().padStart(4, "0")}`;
    }),
    "",
  ].join("\n");
  writeFile(path.join(buildDirectory, "summary-reader-abi.inc"), summaryReaderAbiInclude);
  // audit-hardening (AUD-02, owner Q3): the summary checks the two kinds of
  // run it reads with its own sector loop - each region's art, and each
  // level's image in the reader's tail-first order - against these values.
  // Four regions (the summary's SUMMARY_LAST_REGION + 1, asserted there); the
  // level table is indexed by the id START GAME asks for (a debug route's id).
  const summaryArtSums = Array.from({ length: 4 }, (_, region) => {
    const run = summaryArtRuns[region];
    return { sum: run === undefined ? null : guardFold(run.data), note: `region ${region + 1}'s art` };
  });
  const summaryLevelSums = Array.from({ length: LEVEL_MAX_ID }, (_, index) => {
    const image = levelRuns.some((run) => run.id === index + 1) ? levelImages.get(index + 1) : undefined;
    return { sum: image === undefined ? null : guardFold(levelReadOrder(image)),
      note: `level ${index + 1}${image === undefined ? ", not on this disk" : ""}` };
  });
  const summarySumsInclude = [
    "; Generated by scripts/build.mjs (audit-hardening) - do not edit.",
    "; The expected fold of each region's art run and each level image's read.",
    renderSumTable("summary_art_sums", summaryArtSums),
    renderSumTable("summary_level_sums", summaryLevelSums),
    "summary_sums_end:",
    "",
  ].join("\n");
  writeFile(path.join(buildDirectory, "summary-sums.inc"), summarySumsInclude);
  // M5b-S3 (owner answer Q-S4, plan §5.11.7): every setting the boss install
  // patches outside slot A, with the value the shipped image holds there. The
  // summary's START GAME writes them back whenever slot A was overlaid, so a
  // game that ends inside the boss sector (GAME OVER, pause-quit) leaves
  // nothing of the boss behind. The values are read from the linked images,
  // never written by hand.
  const residentByte = (address) => {
    if (address >= broadsideRunAddress && address < broadsideRunAddress + broadsideRuntime.length) {
      return broadsideRuntime[address - broadsideRunAddress];
    }
    if (address >= loadAddress && address < 0x4000) return linkedPayload[address - loadAddress];
    throw new Error(`M5b-S3: no resident image holds $${address.toString(16)}`);
  };
  // read_input's `lda player_y / cmp #PLAYER_Y_MIN`: its operand is the boss's
  // Y floor. Found by its bytes (a label inside the routine would split its
  // cheap-local scope), exactly once in the routine, or the build stops.
  const readInputYMinOperand = (() => {
    const start = labels.get("read_input") - loadAddress;
    const pattern = [0xa5, labels.get("player_y"), 0xc9, labels.get("PLAYER_Y_MIN")];
    const hits = [];
    for (let offset = start; offset < start + 160; offset += 1) {
      if (pattern.every((byte, index) => linkedPayload[offset + index] === byte)) hits.push(offset);
    }
    if (hits.length !== 1) {
      throw new Error(`M5b-S3: read_input's Y floor compare found ${hits.length} times`);
    }
    return loadAddress + hits[0] + 3;
  })();
  const bossRestoreEntries = [
    ...[0, 1, 2, 3, 4, 5].map((offset) => ["world/hull scroll rates",
      labels.get("world_scroll_rates") + offset]),
    ["resume_gameplay's DLI operand (lo)", labels.get("resume_gameplay_dli_lo_operand")],
    ["resume_gameplay's DLI operand (hi)", labels.get("resume_gameplay_dli_hi_operand")],
    ["read_input's player Y floor", readInputYMinOperand],
  ].map(([what, address]) => {
    if (!Number.isInteger(address)) throw new Error(`M5b-S3: main has no ${what}`);
    return { what, address, value: residentByte(address) };
  });
  if (labels.get("hull_scroll_rates") !== labels.get("world_scroll_rates") + 3 ||
    bossRestoreEntries[6].value !== (labels.get("gameplay_dli") & 0xff) ||
    bossRestoreEntries[7].value !== (labels.get("gameplay_dli") >> 8)) {
    throw new Error("M5b-S3: the boss restore's sources are not what the install patches");
  }
  // GTIA and ANTIC: the boss writes HSCROL; PRIOR, SIZEM and HPOSM0-3 are the
  // lasers' (S4), restored from S3 on so that S4 adds no restore code (Q-S4).
  for (const [what, address] of [["HSCROL", 0xd404], ["PRIOR", 0xd01b], ["SIZEM", 0xd00c],
    ["HPOSM0", 0xd004], ["HPOSM1", 0xd005], ["HPOSM2", 0xd006], ["HPOSM3", 0xd007]]) {
    bossRestoreEntries.push({ what, address, value: 0 });
  }
  const hexByte = (value) => `$${(value & 0xff).toString(16).toUpperCase().padStart(2, "0")}`;
  const bossRestoreInclude = [
    "; Generated by scripts/build.mjs for M5b-S3 - do not edit.",
    "; Every setting the boss patches, and the value START GAME writes back (Q-S4).",
    `BOSS_RESTORE_COUNT = ${bossRestoreEntries.length}`,
    "boss_restore_lo:",
    ...bossRestoreEntries.map(({ address, what }) => `        .byte ${hexByte(address)}\t; ${what}`),
    "boss_restore_hi:",
    ...bossRestoreEntries.map(({ address }) => `        .byte ${hexByte(address >> 8)}`),
    "boss_restore_value:",
    ...bossRestoreEntries.map(({ value }) => `        .byte ${hexByte(value)}`),
    "",
  ].join("\n");
  writeFile(path.join(buildDirectory, "boss-restore.inc"), bossRestoreInclude);
  const levelSummaryModule = await buildResidentModule({
    sourcePath: path.join(rootDirectory, "src", "hybrid", "level-summary.s"),
    configPath: path.join(rootDirectory, "cfg", "level-summary.cfg"),
    stem: "level-summary",
    extraInputs: {
      "/project/build/level-summary-abi.inc": levelSummaryAbiInclude,
      "/project/build/level-summary-layout.inc": Buffer.from(summaryLayoutInclude),
      "/project/build/summary-main-abi.inc": Buffer.from(summaryMainAbiInclude),
      "/project/build/summary-reader-abi.inc": Buffer.from(summaryReaderAbiInclude),
      "/project/build/gameplay-music-abi.inc": Buffer.from(gameplayMusicAbiInclude),
      "/project/build/level-def.inc": levelDefInclude,
      "/project/build/capital-hulls.inc": capitalHullsInclude,
      "/project/build/boss-restore.inc": Buffer.from(bossRestoreInclude),
      "/project/build/summary-sums.inc": Buffer.from(summarySumsInclude),
    },
  });
  writeFile(path.join(buildDirectory, "level-summary.lst"), levelSummaryModule.listing);
  writeFile(path.join(buildDirectory, "level-summary.map"), levelSummaryModule.map);
  writeFile(path.join(buildDirectory, "level-summary.lbl"), levelSummaryModule.labels);
  if (levelSummaryModule.raw.length > summaryModuleCapacityBytes) {
    throw new Error(`M5a-S2: the summary module is ${levelSummaryModule.raw.length} B; its ` +
      `claimed home $0500-$0BFF holds ${summaryModuleCapacityBytes}`);
  }
  const summaryCodeSectors = Math.ceil(levelSummaryModule.raw.length / 128);
  overlayDirectoryInclude = renderDirectory(summaryCodeSectors);
  {
    const firstPass = sectorReaderLabels;
    sectorReaderModule = await linkSectorReader();
    sectorReaderLabels = parseViceLabels(sectorReaderModule.labels.toString("utf8"));
    for (const [name, address] of firstPass) {
      if (sectorReaderLabels.get(name) !== address) {
        throw new Error(`M5a-S2: relinking the reader with the summary's sector count moved ${name}`);
      }
    }
  }
  writeFile(path.join(buildDirectory, "overlay-directory.inc"), overlayDirectoryInclude);

  // M5b-S3 (owner answer Q-S3): the window's boss entry linked before main,
  // the music player and the reader, so it names their routines by value
  // (src/hybrid/boss-entry-pins.inc). Every pin must be the address its link
  // really gave the label, or the build stops here and says which.
  const gameplayMusicLabelsForPins = gameplayMusicLabels;
  const pinLinks = { main: labels, reader: sectorReaderLabels, music: gameplayMusicLabelsForPins,
    kernel: lightKernelLabels };
  const bossEntryPins = [];
  for (const line of fs.readFileSync(
    path.join(rootDirectory, "src", "hybrid", "boss-entry-pins.inc"), "utf8").split(/\r?\n/)) {
    const match = /^pin_(\w+)\s*=\s*\$([0-9A-Fa-f]+)\s*;\s*(main|reader|music|kernel)\b/.exec(line);
    if (!match) continue;
    const [, label, value, link] = match;
    const pinned = Number.parseInt(value, 16);
    const actual = pinLinks[link].get(label);
    if (actual !== pinned) {
      throw new Error(`M5b-S3 (Q-S3): the window's boss entry pins ${link}'s ${label} at ` +
        `$${pinned.toString(16).toUpperCase()}, but the ${link} link put it at ` +
        `$${(actual ?? 0).toString(16).toUpperCase()}; update src/hybrid/boss-entry-pins.inc`);
    }
    bossEntryPins.push({ label, link, address: pinned });
  }
  // S5-1: + the HUD booster backup in the Light kernel link.
  if (bossEntryPins.length !== 9) {
    throw new Error(`M5b-S3 / S5-1: expected 9 boss-entry pins, found ${bossEntryPins.length}`);
  }
  if (labels.get("capital_slot_a") + 0 !== slotAddress ||
    gameplayMusicLabels.get("game_music_data_start") + bossThemeCopyBytes > 0xa880) {
    throw new Error("M5b-S3: the boss theme copy would leave the level's music block");
  }

  // M5b-S3: the boss overlay - slot A's per-frame code and C controller, and
  // the once-only install at $7810 - links LAST, against every link above.
  const bossImportNames = {
    main: ["init_broadside", "PHYSICAL_PAL_FRAME_ID", "GAMEPLAY_PAL_FRAME_CONSUMED", "CHARSET",
      "GAMEPLAY_COLPF0", "GAMEPLAY_COLPF2", "GAMEPLAY_COLPF3", "gameplay_dli_allied_colpf1_load",
      "gameplay_dli_sync_hud", "PLAYFIELD_DLIST_A", "PLAYFIELD_ROW_LO", "PLAYFIELD_ROW_HI",
      "PLAYFIELD_ACTIVE_DLIST_LO", "PLAYFIELD_NEXT_DLIST_LO", "PLAYFIELD_PREBUILD_PENDING",
      "frame_counter", "FIGHTER_PROJECTILE_ACTIVE", "FIGHTER_PROJECTILE_X",
      "FIGHTER_PROJECTILE_Y", "FIGHTER_PROJECTILE_FREE", "FIGHTER_EXPLOSION_TIMER",
      "FIGHTER_PROJECTILE_PREV_Y", "FIGHTER_PROJECTILE_LIFETIME", "BROAD_DAMAGE_COOLDOWN",
      "FIGHTER_EXPLOSION_ENEMY_SLOT", "CAPITAL_EXPLOSION_SOUND_TIMER", "score_bcd_lo",
      "score_bcd_hi", "play_hit_sound", "dst_ptr", "ACTIVE_GAMEPLAY_FRAME_LO",
      "world_scroll_rates", "hull_scroll_rates", "resume_gameplay_dli_lo_operand",
      "resume_gameplay_dli_hi_operand", "player_y", "hud_ascii",
      "SCREEN", "update_score_display", "update_hud_status", "set_gameplay_row_ptr",
      "generate_starfield_row", "weapon_pickup_clear_sector", "draw_player", "HUD_CHARSET",
      "HUD_COLPF1", "HUD_COLPF2", "STATE_GAMEPLAY", "game_state", "wait_frame_start",
      "main_loop", "sound_enabled", "GAMEPLAY_DIVIDER_SCREEN", "capital_slot_a",
      "DIFFICULTY_SETTING", "PLAYER_LIFECYCLE", "player_x", "apply_player_damage",
      // S4b.5 (owner decision F3): a destroyed module counts for the capsule rule.
      "ENTITY_STATE", "ENTITY_HP", "ENTITY_Y", "ENTITY_TIMER", "weapon_pickup_spawn_capsule_at",
      "integration_pickup_reveal_body"],
    reader: ["sr_sectors_left", "sr_sector_lo", "sr_sector_hi", "sr_dst",
      "sector_reader_read_sectors", "sector_reader_failure_screen", "sector_reader_level_end"],
    // B2 (owner decision 2026-10-06): the boss restores COLPM1 / COLPM2 to
    // the Heavy's hull colour on leaving the boss sector.
    director: ["_sector_wave_count", "_director_c_try_event", "_heavy_hull_colour"],
    // audit-hardening (AUD-02): the head checks its runs with the disk guard.
    kernel: ["guard_reset", "guard_compare"],
  };
  const importLinks = { main: labels, reader: sectorReaderLabels, director: directorLabels,
    kernel: lightKernelLabels };
  const directorAbiConstants = new Map(directorAbiInclude.toString("utf8").split(/\r?\n/)
    .map((line) => /^(\w+)\s*=\s*\$?([0-9A-Fa-f]+)\s*$/.exec(line.replace(/;.*$/, "").trim()))
    .filter(Boolean).map((match) => [match[1], Number.parseInt(match[2], 16)]));
  const bossImportLines = [
    "; Generated by scripts/build.mjs for M5b-S3 - do not edit.",
    "; Every symbol of main, the reader and the Director link the boss overlay uses,",
    "; from those links' own label files in this build (Q-S3).",
  ];
  for (const [link, names] of Object.entries(bossImportNames)) {
    for (const name of names) {
      const address = importLinks[link].get(name);
      if (!Number.isInteger(address)) throw new Error(`M5b-S3: the ${link} link has no ${name}`);
      bossImportLines.push(`${name.padEnd(36)} = $${address.toString(16).toUpperCase()}   ; ${link}`);
    }
  }
  bossImportLines.push(`read_input_y_min_operand${" ".repeat(12)} = $${
    readInputYMinOperand.toString(16).toUpperCase()}   ; main (found by its bytes)`);
  // main.s's gameplay_dli_phase is an alias of the zero-page loader_dli_phase.
  bossImportLines.push(`gameplay_dli_phase${" ".repeat(18)} = $${
    labels.get("loader_dli_phase").toString(16).toUpperCase()}   ; main (loader_dli_phase)`);
  for (const name of ["CAPITAL_VECTOR_TABLE", "CAPITAL_VECTOR_COUNT"]) {
    const value = name === "CAPITAL_VECTOR_COUNT" ? CAPITAL_VECTORS.length
      : capitalVectorImage[0].windowAddress;
    bossImportLines.push(`${name.padEnd(36)} = $${value.toString(16).toUpperCase()}   ; window`);
  }
  const explosionDuration = /^CAPITAL_EXPLOSION_DURATION = (\d+)$/m.exec(
    capitalHullsInclude.toString("utf8"));
  if (!explosionDuration) throw new Error("M5b-S3: capital-hulls.inc has no CAPITAL_EXPLOSION_DURATION");
  bossImportLines.push(`CAPITAL_EXPLOSION_DURATION${" ".repeat(10)} = ${explosionDuration[1]}`);
  // M5b-S4b.5 (owner decision F3): the capsule rule's slot and kill count, as
  // the resident kill path has them (build/entity-effects.inc).
  for (const name of ["WEAPON_PICKUP_SLOT", "WEAPON_PICKUP_QUALIFIED_KILLS", "WEAPON_PICKUP_STATE_ACTIVE"]) {
    const value = new RegExp(`^${name} = (\\d+)$`, "m").exec(entityEffectsInclude.toString("utf8"));
    if (!value) throw new Error(`M5b-S4b.5: entity-effects.inc has no ${name}`);
    bossImportLines.push(`${name.padEnd(36)} = ${value[1]}   ; entity-effects.inc`);
  }
  // ... and the gameplay world's scroll rates, which the boss sector zeroes:
  // a capsule there falls at the rate it falls everywhere else.
  const worldRates = /\.macro EMIT_WORLD_SCROLL_RATES\s+\.byte (\$[0-9A-F]+),(\$[0-9A-F]+),(\$[0-9A-F]+)/.exec(
    capitalHullsInclude.toString("utf8"));
  if (!worldRates) throw new Error("M5b-S4b.5: capital-hulls.inc has no EMIT_WORLD_SCROLL_RATES");
  ["EASY", "MEDIUM", "HARD"].forEach((name, index) =>
    bossImportLines.push(`${`GAMEPLAY_WORLD_RATE_${name}`.padEnd(36)} = ${worldRates[index + 1]}   ; capital-hulls.inc`));
  bossImportLines.push("");
  const bossImportsInclude = bossImportLines.join("\n");
  writeFile(path.join(buildDirectory, "boss-imports.inc"), bossImportsInclude);
  const bossRunEntry = (startSector, sectors, destination) =>
    `        .byte $${(startSector & 0xff).toString(16).padStart(2, "0")}, ` +
    `$${(startSector >> 8).toString(16).padStart(2, "0")}, ${sectors}, ` +
    `$${(destination & 0xff).toString(16).padStart(2, "0")}, $${(destination >> 8).toString(16).padStart(2, "0")}`;
  // S5-1: a region's block has its own reservation, 4 sectors a region from 696.
  const bossRegionRunSector = (index, run) => (run === "block"
    ? BOSS_BLOCK_BASE_SECTOR + index * BOSS_BLOCK_SECTORS
    : bossRegionBaseSector + index * BOSS_REGION_SECTORS + BOSS_REGION_RUN_OFFSETS[run]);
  // M5b-S4a-i (Q-B8): slot C's run is sized to the linked code, so the run
  // table is rendered twice - first with slot C's whole reservation, then
  // with the linked size; the table's bytes do not move a label (checked).
  const renderBossRuns = (slotCSectors, slotDSectors, slotESectors) => [
    "; Generated by scripts/build.mjs for M5b-S4a-i - do not edit.",
    "; {sector lo, sector hi, count, dst lo, dst hi}: the shared install run, slot C,",
    "; slot D (M5b-S4b), then per region band A, band B, the charset and the block",
    "; (S5-1, slot F) (0 = not on this disk).",
    bossRunEntry(bossInstallSector, bossInstallSectors, bossInstallAddress) + "\t; install",
    bossRunEntry(bossSlotCSector, slotCSectors, BOSS_SLOT_C_ADDRESS) + "\t; slot C",
    bossRunEntry(bossSlotDSector, slotDSectors, BOSS_SLOT_D_ADDRESS) + "\t; slot D",
    bossRunEntry(bossSlotESector, slotESectors, BOSS_SLOT_E_ADDRESS) + "\t; slot E (M5b-S4b.5)",
    ...Array.from({ length: bossRegionCount }, (_, index) => {
      const region = bossRegions[index];
      return region === undefined
        ? ["band A", "band B", "charset", "block"].map((what) =>
          `        .byte 0, 0, 0, 0, 0\t; region ${index + 1}: ${what}, not on this disk`)
        : [bossRunEntry(bossRegionRunSector(index, "bandA"), BOSS_BAND_A_SECTORS,
          region.runs.bandA.address) + `\t; region ${index + 1}: band A`,
        bossRunEntry(bossRegionRunSector(index, "bandB"), BOSS_BAND_B_SECTORS,
          region.runs.bandB.address) + `\t; region ${index + 1}: band B`,
        bossRunEntry(bossRegionRunSector(index, "charset"), region.runs.charset.sectors,
          region.runs.charset.address) + `\t; region ${index + 1}: charset`,
        bossRunEntry(bossRegionRunSector(index, "block"), region.runs.block.sectors,
          region.runs.block.address) + `\t; region ${index + 1}: block (slot F)`];
    }).flat(),
    "",
  ].join("\n");
  const bossConfig = fs.readFileSync(path.join(rootDirectory, "cfg", "boss.cfg"), "utf8").replace(
    /BOSS_SLOT_RAM:(\s*)start = \$[0-9A-Fa-f]+, size = \$[0-9A-Fa-f]+/,
    (_, spacing) => `BOSS_SLOT_RAM:${spacing}start = $${slotAddress.toString(16).toUpperCase()}, ` +
      `size = $${capitalSlotImage.length.toString(16).toUpperCase().padStart(4, "0")}`);
  const bossBase = "/project/build/boss";
  const stdintForBoss = fs.readFileSync(path.join(shareDir, "include", "stdint.h"));
  const bossCompiled = await runWasmTool(
    "cc65",
    {
      "/project/src/c/boss.c": fs.readFileSync(path.join(rootDirectory, "src", "c", "boss.c")),
      "/project/src/c/boss-layout.h": bossLayoutHeader,
      "/project/src/c/level-def.h": levelDefHeader,
      "/cc65/include/stdint.h": stdintForBoss,
    },
    ["--cpu", "6502", "-Oirs", "-I", "/project/src/c", "-I", "/cc65/include",
      "-o", `${bossBase}-c-generated.s`, "/project/src/c/boss.c"],
    [`${bossBase}-c-generated.s`],
  );
  const bossGenerated = bossCompiled.outputs[`${bossBase}-c-generated.s`];
  writeFile(path.join(buildDirectory, "boss-c-generated.s"), bossGenerated);
  {
    const text = bossGenerated.toString("utf8");
    const executable = text.replace(/^\s*\.importzp.*$/gmi, "");
    if (/^\s*(?:jsr|jmp)\s+(?:push|pop|incsp|decsp|tos|addysp|subysp|mul|div|mod|shl|shr|asr)/mi
      .test(text) || /\(sp\)/.test(text) ||
      /\b(?:c_sp|sreg|regsave|regbank|tmp[1-4]|ptr[1-4])\b/.test(executable)) {
      throw new Error("M5b-S3: the boss controller needs cc65 software-stack or helper state");
    }
  }
  const bossCAssembled = await runWasmTool(
    "ca65",
    { [`${bossBase}-c-generated.s`]: bossGenerated,
      "/cc65/asminc/longbranch.mac": fs.readFileSync(path.join(shareDir, "asminc", "longbranch.mac")) },
    ["--cpu", "6502", "-g", "-I", "/cc65/asminc", "-l", `${bossBase}-c.lst`,
      "-o", `${bossBase}-c.o`, `${bossBase}-c-generated.s`],
    [`${bossBase}-c.o`, `${bossBase}-c.lst`],
  );
  // audit-hardening (AUD-02): slot A's head checks the eight runs it reads
  // (install, slots C-E, the region's band A, band B, charset and - S5-1 -
  // block), folded in that order, against its region's value. Zeros until the
  // boss has linked.
  const renderBossSums = (sums = []) => [
    "; Generated by scripts/build.mjs (audit-hardening) - do not edit.",
    "; The expected fold of the head's eight runs, per region (0 = not on this disk).",
    renderSumTable("boss_head_sums", Array.from({ length: bossRegionCount }, (_, index) => ({
      sum: sums[index] ?? null, note: `region ${index + 1}` }))),
  ].join("\n");
  const linkBoss = async (runsInclude, sumsInclude = renderBossSums()) => {
    const assembled = await runWasmTool(
      "ca65",
      {
        [`${bossBase}.s`]: fs.readFileSync(path.join(rootDirectory, "src", "hybrid", "boss.s")),
        "/project/build/boss-layout.inc": bossLayoutInclude,
        "/project/build/boss-imports.inc": Buffer.from(bossImportsInclude),
        "/project/build/boss-runs.inc": Buffer.from(runsInclude),
        "/project/build/boss-sums.inc": Buffer.from(sumsInclude),
        "/project/build/fighter-weapons.inc": fighterWeaponsInclude,
        "/project/build/level-summary-abi.inc": levelSummaryAbiInclude,
        "/project/build/level-def.inc": levelDefInclude,
      },
      ["--cpu", "6502", "-g",
        ...(laserFixtureTier === null ? [] : ["-D", `BOSS_LASER_TIER_OVERRIDE=${laserFixtureTier}`]),
        "-l", `${bossBase}.lst`, "-o", `${bossBase}.o`, `${bossBase}.s`],
      [`${bossBase}.o`, `${bossBase}.lst`],
    );
    const linked = await runWasmTool(
      "ld65",
      {
        [`${bossBase}.o`]: assembled.outputs[`${bossBase}.o`],
        [`${bossBase}-c.o`]: bossCAssembled.outputs[`${bossBase}-c.o`],
        [`${bossBase}.cfg`]: Buffer.from(bossConfig),
      },
      ["-C", `${bossBase}.cfg`, "-o", `${bossBase}.bin`, "-m", `${bossBase}.map`,
        "-Ln", `${bossBase}.lbl`, `${bossBase}.o`, `${bossBase}-c.o`],
      [`${bossBase}.bin`, `${bossBase}.map`, `${bossBase}.lbl`],
    );
    return { assembled, linked,
      labels: parseViceLabels(linked.outputs[`${bossBase}.lbl`].toString("utf8")) };
  };
  let bossRunsInclude = renderBossRuns(bossSlotCMaxSectors, bossSlotDMaxSectors, bossSlotEMaxSectors);
  let bossLink = await linkBoss(bossRunsInclude);
  const bossSlotCCodeBytes = bossLink.labels.get("__BOSS_C_BSS_RUN__") - BOSS_SLOT_C_ADDRESS;
  const bossSlotCSectors = Math.ceil(bossSlotCCodeBytes / 128);
  const bossSlotDCodeBytes = bossLink.labels.get("__BOSS_D_BSS_RUN__") - BOSS_SLOT_D_ADDRESS;
  const bossSlotDSectors = Math.ceil(bossSlotDCodeBytes / 128);
  const bossSlotECodeBytes = (bossLink.labels.get("__BOSS_E_BSS_RUN__") ??
    bossLink.labels.get("__BOSS_SLOT_E_RAM_LAST__")) - BOSS_SLOT_E_ADDRESS;
  const bossSlotESectors = Math.ceil(bossSlotECodeBytes / 128);
  {
    const firstPass = bossLink.labels;
    bossRunsInclude = renderBossRuns(bossSlotCSectors, bossSlotDSectors, bossSlotESectors);
    bossLink = await linkBoss(bossRunsInclude);
    for (const [name, address] of firstPass) {
      if (bossLink.labels.get(name) !== address) {
        throw new Error(`M5b-S4a-i: relinking the boss with slot C's sector count moved ${name}`);
      }
    }
  }
  writeFile(path.join(buildDirectory, "boss-runs.inc"), bossRunsInclude);
  // audit-hardening: the head's expected folds, from the linked runs as they
  // will be on the disk; the relink may change only boss_head_sums (checked).
  const bossHeadSums = (() => {
    const image = Buffer.from(bossLink.linked.outputs[`${bossBase}.bin`]);
    const slotABytesForSums = capitalSlotImage.length;
    const installAt = slotABytesForSums;
    const slotCAt = installAt + bossInstallSectors * 128;
    const slotDAt = slotCAt + BOSS_SLOT_C_BYTES;
    const slotEAt = slotDAt + BOSS_SLOT_D_BYTES;
    const shared = Buffer.concat([
      image.subarray(installAt, installAt + bossInstallSectors * 128),
      image.subarray(slotCAt, slotCAt + bossSlotCSectors * 128),
      image.subarray(slotDAt, slotDAt + bossSlotDSectors * 128),
      image.subarray(slotEAt, slotEAt + bossSlotESectors * 128),
    ]);
    return Array.from({ length: bossRegionCount }, (_, index) => {
      const region = bossRegions[index];
      if (region === undefined) return null;
      return guardFold(Buffer.concat([shared, Buffer.from(region.runs.bandA.data),
        Buffer.from(region.runs.bandB.data), Buffer.from(region.runs.charset.data),
        Buffer.from(region.runs.block.data)]));
    });
  })();
  const bossSumsInclude = renderBossSums(bossHeadSums);
  {
    const firstPass = bossLink;
    bossLink = await linkBoss(bossRunsInclude, bossSumsInclude);
    for (const [name, address] of firstPass.labels) {
      if (bossLink.labels.get(name) !== address) {
        throw new Error(`audit-hardening: relinking the boss with its head's sums moved ${name}`);
      }
    }
    const before = firstPass.linked.outputs[`${bossBase}.bin`];
    const after = bossLink.linked.outputs[`${bossBase}.bin`];
    const table = bossLink.labels.get("boss_head_sums_lo") - slotAddress;
    for (let offset = 0; offset < after.length; offset += 1) {
      if (before[offset] !== after[offset] && !(offset >= table && offset < table + bossRegionCount * 2)) {
        throw new Error(`audit-hardening: the boss's sums changed byte $${(slotAddress + offset).toString(16)}`);
      }
    }
  }
  writeFile(path.join(buildDirectory, "boss-sums.inc"), bossSumsInclude);
  const bossAsmAssembled = bossLink.assembled;
  const bossLinked = bossLink.linked;
  const bossImage = Buffer.from(bossLinked.outputs[`${bossBase}.bin`]);
  const bossLabels = bossLink.labels;
  const bossSlotUsed = bossLabels.get("__BOSS_SLOT_RAM_LAST__") - slotAddress;
  const bossInstallUsed = bossLabels.get("__BOSS_INSTALL_RAM_LAST__") - bossInstallAddress;
  const bossSlotCUsed = bossLabels.get("__BOSS_SLOT_C_RAM_LAST__") - BOSS_SLOT_C_ADDRESS;
  // S5-1: the page's last ten bytes are the pinned HUD booster backup, so the
  // area's last byte is the page's; the bytes used are the segments' sum.
  const bossScratchUsed = ["BOSS_SCRATCH", "BOSS_BSS", "BOSS_HUD_BACKUP"]
    .reduce((sum, name) => sum + (bossLabels.get(`__${name}_SIZE__`) ?? 0), 0);
  const bossSlotDUsed = bossLabels.get("__BOSS_SLOT_D_RAM_LAST__") - BOSS_SLOT_D_ADDRESS;
  const bossSlotEUsed = bossLabels.get("__BOSS_SLOT_E_RAM_LAST__") - BOSS_SLOT_E_ADDRESS;
  const bossCodeSectors = Math.ceil(bossSlotUsed / 128);
  const slotABytes = capitalSlotImage.length;
  const installBytes = bossInstallSectors * 128;
  if (bossImage.length !== slotABytes + installBytes + BOSS_SLOT_C_BYTES + BOSS_SLOT_D_BYTES + BOSS_SLOT_E_BYTES ||
    !(bossSlotEUsed > 0 && bossSlotEUsed <= BOSS_SLOT_E_BYTES) || bossSlotESectors > bossSlotEMaxSectors ||
    bossSlotESector + bossSlotEMaxSectors > bossReservationSector + bossReservationSectors ||
    !(bossSlotDUsed > 0 && bossSlotDUsed <= BOSS_SLOT_D_BYTES) || bossSlotDSectors > bossSlotDMaxSectors ||
    BOSS_SLOT_D_ADDRESS + BOSS_SLOT_D_BYTES !== BOSS_CLAIM.endExclusive ||
    bossSlotDSector + bossSlotDMaxSectors > bossReservationSector + bossReservationSectors ||
    !(bossSlotUsed > 0 && bossSlotUsed <= slotABytes) ||
    !(bossInstallUsed > 0 && bossInstallUsed <= installBytes) ||
    !(bossSlotCUsed > 0 && bossSlotCUsed <= BOSS_SLOT_C_BYTES) ||
    !(bossScratchUsed > 0 && bossScratchUsed <= BOSS_SCRATCH_BYTES) ||
    bossCodeSectors > bossCodeMaxSectors || bossSlotCSectors > bossSlotCMaxSectors ||
    bossLabels.get("boss_slot") !== slotAddress ||
    bossLabels.get("boss_install") !== bossInstallAddress ||
    bossLabels.get("boss_column_map") !== BOSS_SCRATCH_ADDRESS ||
    bossInstallAddress + installBytes > BOSS_STAGING_ADDRESS ||
    BOSS_SCRATCH_ADDRESS + BOSS_SCRATCH_BYTES !== BOSS_SLOT_D_ADDRESS) {
    throw new Error(`M5b-S4a-i: the boss overlay does not fit its homes: slot A ${bossSlotUsed} of ` +
      `${slotABytes} B, install ${bossInstallUsed} of ${installBytes} B, slot C ${bossSlotCUsed} of ` +
      `${BOSS_SLOT_C_BYTES} B, scratch ${bossScratchUsed} of ${BOSS_SCRATCH_BYTES} B, ` +
      `slot D ${bossSlotDUsed} of ${BOSS_SLOT_D_BYTES} B, slot E ${bossSlotEUsed} of ${BOSS_SLOT_E_BYTES} B`);
  }
  // The reader's directory names the boss code's sector count: relinked with
  // the linked count - one data byte, which moves no label (checked), as the
  // summary's count above.
  overlayDirectoryInclude = renderDirectory(summaryCodeSectors, bossCodeSectors);
  {
    const firstPass = sectorReaderLabels;
    sectorReaderModule = await linkSectorReader();
    sectorReaderLabels = parseViceLabels(sectorReaderModule.labels.toString("utf8"));
    for (const [name, address] of firstPass) {
      if (sectorReaderLabels.get(name) !== address) {
        throw new Error(`M5b-S4a-i: relinking the reader with the boss code's sector count moved ${name}`);
      }
    }
  }
  writeFile(path.join(buildDirectory, "overlay-directory.inc"), overlayDirectoryInclude);
  const bossCodeRun = { name: "boss-code", startSector: bossCodeSector, sectors: bossCodeSectors,
    destination: slotAddress, data: bossImage.subarray(0, bossCodeSectors * 128),
    file: "overlay-boss-code.bin" };
  const bossInstallRun = { name: "boss-install", startSector: bossInstallSector,
    sectors: bossInstallSectors, destination: bossInstallAddress,
    data: bossImage.subarray(slotABytes, slotABytes + installBytes), file: "overlay-boss-install.bin" };
  const bossSlotCRun = { name: "boss-slot-c", startSector: bossSlotCSector, sectors: bossSlotCSectors,
    destination: BOSS_SLOT_C_ADDRESS,
    data: bossImage.subarray(slotABytes + installBytes, slotABytes + installBytes + bossSlotCSectors * 128),
    file: "overlay-boss-slot-c.bin" };
  const slotDOffset = slotABytes + installBytes + BOSS_SLOT_C_BYTES;
  const bossSlotDRun = { name: "boss-slot-d", startSector: bossSlotDSector, sectors: bossSlotDSectors,
    destination: BOSS_SLOT_D_ADDRESS,
    data: bossImage.subarray(slotDOffset, slotDOffset + bossSlotDSectors * 128),
    file: "overlay-boss-slot-d.bin" };
  const bossRegionRuns = bossRegions.flatMap((region, index) => ["theme", "bandA", "bandB", "charset", "block"]
    .map((run) => ({
      name: `boss-region-${index + 1}-${run.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
      startSector: bossRegionRunSector(index, run), sectors: region.runs[run].sectors,
      destination: region.runs[run].address, data: Buffer.from(region.runs[run].data),
      file: `boss-region-${index + 1}-${run.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}.bin`,
      region: index + 1,
    })));
  for (const region of bossRegions) {
    if (region.runs.charset.sectors > BOSS_CHARSET_MAX_SECTORS) {
      throw new Error(`M5b-S4a-i: region ${region.name}'s charset is ${region.runs.charset.sectors} sectors`);
    }
  }
  const slotEOffset = slotDOffset + BOSS_SLOT_D_BYTES;
  const bossSlotERun = { name: "boss-slot-e", startSector: bossSlotESector, sectors: bossSlotESectors,
    destination: BOSS_SLOT_E_ADDRESS,
    data: bossImage.subarray(slotEOffset, slotEOffset + bossSlotESectors * 128),
    file: "overlay-boss-slot-e.bin" };
  const bossDiskRuns = [bossCodeRun, bossInstallRun, bossSlotCRun, bossSlotDRun, bossSlotERun, ...bossRegionRuns];
  const bossRegionAreaEnd = bossRegionBaseSector + bossRegionCount * BOSS_REGION_SECTORS;
  for (const run of bossDiskRuns) {
    const inCode = run.startSector >= bossReservationSector &&
      run.startSector + run.sectors <= bossReservationSector + bossReservationSectors;
    const inRegion = run.region !== undefined && (run.name.endsWith("-block")
      ? run.startSector >= BOSS_BLOCK_BASE_SECTOR + (run.region - 1) * BOSS_BLOCK_SECTORS &&
        run.startSector + run.sectors <= BOSS_BLOCK_BASE_SECTOR + run.region * BOSS_BLOCK_SECTORS
      : run.startSector >= bossRegionBaseSector + (run.region - 1) * BOSS_REGION_SECTORS &&
        run.startSector + run.sectors <= bossRegionBaseSector + run.region * BOSS_REGION_SECTORS);
    if (run.data.length !== run.sectors * 128 || !(run.region === undefined ? inCode : inRegion) ||
      run.startSector + run.sectors - 1 > chunkLoaderConstants.atrSectors) {
      throw new Error(`M5b-S4a-i: the boss run ${run.name} leaves its reservation`);
    }
    for (const other of [...levelRuns.map((level) => ({ startSector: level.startSector,
      sectors: levelBufferSectors })), ...overlayRuns, ...summaryArtRuns,
      { startSector: summaryCodeSector, sectors: summaryCodeMaxSectors },
      { startSector: saveRecordSector, sectors: 1 }]) {
      if (run.startSector < other.startSector + other.sectors &&
        other.startSector < run.startSector + run.sectors) {
        throw new Error(`M5b-S4a-i: the boss run ${run.name} overlaps sector ${other.startSector}`);
      }
    }
    writeFile(path.join(buildDirectory, run.file), run.data);
  }
  if (bossRegionAreaEnd - 1 > chunkLoaderConstants.atrSectors ||
    BOSS_BLOCK_BASE_SECTOR < bossRegionAreaEnd ||
    BOSS_BLOCK_BASE_SECTOR + bossRegionCount * BOSS_BLOCK_SECTORS - 1 > chunkLoaderConstants.atrSectors) {
    throw new Error("M5b-S4a-i / S5-1: four regions and their blocks do not fit the disk");
  }
  for (const region of bossRegions) {
    if (region.runs.block.sectors > BOSS_BLOCK_SECTORS ||
      region.runs.block.sectors * 128 > BOSS_SLOT_F_BYTES) {
      throw new Error(`S5-1: region ${region.name}'s block is ${region.runs.block.sectors} sectors`);
    }
  }
  writeFile(path.join(buildDirectory, "boss.bin"), bossImage);
  writeFile(path.join(buildDirectory, "boss.lbl"), bossLinked.outputs[`${bossBase}.lbl`]);
  writeFile(path.join(buildDirectory, "boss.map"), bossLinked.outputs[`${bossBase}.map`]);
  writeFile(path.join(buildDirectory, "boss.lst"), bossAsmAssembled.outputs[`${bossBase}.lst`]);
  writeFile(path.join(buildDirectory, "boss-c.lst"), bossCAssembled.outputs[`${bossBase}-c.lst`]);
  const summaryCodeRun = {
    startSector: summaryCodeSector,
    sectors: summaryCodeSectors,
    data: Buffer.concat([levelSummaryModule.raw,
      Buffer.alloc(summaryCodeSectors * 128 - levelSummaryModule.raw.length)]),
  };
  const summaryDiskRuns = [summaryCodeRun, ...summaryArtRuns];
  for (const run of summaryDiskRuns) {
    const last = run.startSector + run.sectors - 1;
    if (run.data.length > run.sectors * 128 || last > chunkLoaderConstants.atrSectors) {
      throw new Error(`M5a-S2: a summary run at sector ${run.startSector} does not fit`);
    }
    if (run.startSector <= saveRecordSector && saveRecordSector <= last) {
      throw new Error(`M5a-S2: a summary run at sector ${run.startSector} covers the save record`);
    }
    for (const other of [...levelRuns.map((level) => ({ startSector: level.startSector,
      sectors: levelBufferSectors })), ...overlayRuns, { startSector: 528, sectors: 56 }]) {
      if (run.startSector < other.startSector + other.sectors &&
        other.startSector < last + 1) {
        throw new Error(`M5a-S2: a summary run at sector ${run.startSector} overlaps sector ` +
          `${other.startSector}`);
      }
    }
  }
  writeFile(path.join(buildDirectory, "level-summary.bin"), levelSummaryModule.raw);
  for (const run of summaryArtRuns) writeFile(path.join(buildDirectory, run.file), run.data);

  // audit-hardening (AUD-01 / AUD-02, owner Q1-Q2): the identity sector, and
  // the resident guard's expected value of every directory entry's run, from
  // the runs exactly as they go on the disk. The Light kernel relinks with
  // them: no label may move and no byte outside guard_sums may change.
  const identitySectorData = renderIdentitySector(diskLayout);
  for (const other of [...levelRuns.map((level) => ({ startSector: level.startSector,
    sectors: levelBufferSectors })), ...overlayRuns, ...summaryArtRuns, ...bossDiskRuns,
  { startSector: summaryCodeSector, sectors: summaryCodeMaxSectors },
  { startSector: saveRecordSector, sectors: 1 }]) {
    if (identitySectorNumber >= other.startSector && identitySectorNumber < other.startSector + other.sectors) {
      throw new Error(`audit-hardening: the identity sector ${identitySectorNumber} is inside the run at ${other.startSector}`);
    }
  }
  const themeRun = (index) => bossRegionRuns.find((run) => run.region === index + 1 && run.name.endsWith("-theme"));
  const diskGuardRuns = OVERLAY_DIRECTORY.map((_, index) => {
    if (index === 0) return overlayRuns[0].data;
    if (index === OVERLAY_BOSS_CODE) return bossCodeRun.data;
    if (index >= OVERLAY_BOSS_REGION && index < OVERLAY_BOSS_REGION + bossRegionCount) {
      return themeRun(index - OVERLAY_BOSS_REGION)?.data ?? null;
    }
    if (index === OVERLAY_SUMMARY_ART) return summaryArtRuns[0].data;
    if (index === OVERLAY_SAVE_RECORD) return null;
    if (index === OVERLAY_SUMMARY_CODE) return summaryCodeRun.data;
    if (index === OVERLAY_IDENTITY) return identitySectorData;
    throw new Error(`audit-hardening: no run for directory entry ${index}`);
  });
  const diskGuardSums = diskGuardRuns.map((data) => (data === null ? null : guardFold(data)));
  const diskGuardInclude = renderDiskGuardInclude(diskGuardSums);
  {
    const firstPass = lightKernelModule;
    const firstLabels = parseViceLabels(firstPass.labels.toString("utf8"));
    lightKernelModule = await linkLightKernel(diskGuardInclude);
    const relinkedLabels = parseViceLabels(lightKernelModule.labels.toString("utf8"));
    for (const [name, address] of firstLabels) {
      if (relinkedLabels.get(name) !== address) {
        throw new Error(`audit-hardening: relinking the Light kernel with the guard's sums moved ${name}`);
      }
    }
    const table = relinkedLabels.get("guard_sums") - lightKernelAddress;
    if (lightKernelModule.raw.length !== firstPass.raw.length) {
      throw new Error("audit-hardening: the guard's sums changed the Light kernel's size");
    }
    for (let offset = 0; offset < firstPass.raw.length; offset += 1) {
      if (firstPass.raw[offset] !== lightKernelModule.raw[offset] &&
        !(offset >= table && offset < table + OVERLAY_DIRECTORY.length * 2)) {
        throw new Error(`audit-hardening: the guard's sums changed byte $${(lightKernelAddress + offset).toString(16)}`);
      }
    }
  }
  writeFile(path.join(buildDirectory, "disk-guard-sums.inc"), diskGuardInclude);
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
  const bootSplashRuntime = Buffer.from(linkedPayload.subarray(
    bootStage2FileOffset + (bootSplashLoadAddress - bootStage2LoadAddress),
    bootStage2FileOffset + (bootSplashLoadAddress - bootStage2LoadAddress) + bootSplashBytes,
  ));
  if (bootSplashRuntime.length !== bootSplashBytes) {
    throw new Error("Linked BOOT_SPLASH bytes are truncated");
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
  // The splash blob's transported address, patched into the two `lda abs,x`
  // operands of copy_boot_splash_blob. The stage-2 entry reads it here, ahead
  // of every other write the boot makes, so no later stage can have touched it.
  const bootSplashSourceAddress = initialPackedSourcesEnd;
  for (const [operand, address] of [
    [bootSplashSourceOperand, bootSplashSourceAddress],
    [bootSplashSourceHighOperand, bootSplashSourceAddress + 0x0100],
  ]) {
    const offset = operand + 1 - bootStage2RunAddress;
    if (offset < 1 || offset + 2 > bootStage2Runtime.length) {
      throw new Error("the boot splash copy operands do not lie inside BOOT_STAGE2");
    }
    bootStage2Runtime.writeUInt16LE(address, offset);
  }
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
  // The splash blob rides at the tail of the initial block, behind every packed
  // source. Placing it there keeps the measured addresses of the packed
  // resident, starfield, A2 and ENTITY streams - and therefore the 91-byte
  // packed-starfield margin below the pickup cold staging - exactly as they
  // were; the stage-2 entry copies it from here to $0500 before start.
  const initialContentParts = (stage2Bytes) => [
    residentPrefix, stage2Bytes, packedResidentRuntime, packedStarfieldRuntime,
    a2KernelRuntime, packedEntityCodeRuntime, bootSplashRuntime, bootPayloadTrailer,
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
      `$${hybridWindowAddress.toString(16)}-$${(hybridWindowEndExclusive - 1).toString(16)}, ` +
      `not $${basicWindowRecord.finalDestination.toString(16)}`);
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

  const atr = makeAtr(transportPayload, [
    ...levelRuns.map((run) => ({ startSector: run.startSector, data: levelImages.get(run.id) })),
    ...overlayRuns.map((run) => ({ startSector: run.startSector, data: run.data })),
    ...summaryDiskRuns.map((run) => ({ startSector: run.startSector, data: run.data })),
    ...bossDiskRuns.map((run) => ({ startSector: run.startSector, data: run.data })),
    { startSector: identitySectorNumber, data: identitySectorData },
  ]);
  const runtimeArtifacts = runtimeArtifactSet({ boot: transportPayload, atr });
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
      // M5a-S2: the stat hooks are the reader's, reached through its fixed
      // vectors from the kernel and from main, so the reader is placed too.
      { runAddress: sectorReaderAddress, data: sectorReaderModule.raw },
      // Music v2 §1.4: the gameplay music player executes from the level
      // buffer, so the CPU harness has to place the level image's music block
      // exactly as the loader does.
      { runAddress: gameplayMusicAddress, data: gameplayMusicModule.raw },
      // Roadmap 4.6 step 2: the Director's schedule is the level image's core
      // page, so the CPU harness has to place it exactly as the sector reader
      // does - otherwise director_c_init reads a zeroed page, refuses its
      // magic and completes the level before the first frame.
      { runAddress: LEVEL_CORE_ADDRESS, data: startLevelCorePage },
      // Roadmap 4.6 step 5: the payload looks the Light install and the
      // hostile glyph builder read.
      { runAddress: LEVEL_PAYLOAD_ADDRESS, data: startLevelPayloadPage },
    ],
    capitalPlayerCollisionRuntime: capitalPlayerCollisionModule.raw,
    capitalPlayerCollisionRunAddress: capitalPlayerCollisionAddress,
    // The music tick is profiled by name; after the move its label lives in
    // the player's own link, so the harness needs both label files.
    labels: new Map([
      ...labels,
      ...[...gameplayMusicLabels].filter(([name]) => !labels.has(name)),
      // The Heavy break-up's deferred-once bit is C state, so its label lives
      // in the encounter-director link (plan-4.6-placement.md §7.4 variant 2).
      ...[...directorLabels].filter(([name]) => !labels.has(name)),
    ]),
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
    // Owner decision 2026-09-21 — release gate semantics. `gate.passed` is
    // false while any behavioural clause failure is recorded, so it cannot be
    // the release gate. The gate is "no UNRECORDED gate failure, and
    // gate.timing_and_dli_passed", evaluated against the one recorded list in
    // docs/recorded-gate-failures.json that the tripwire test reads too.
    const releaseGate = evaluateReleaseGate(wallTrace, loadRecordedGateFailures(rootDirectory));
    if (!releaseGate.passed) throw new Error(releaseGateFailureMessage(releaseGate));
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
    lightForcePopulation: forceLightPopulation,
    buildVariant: playerColourValue !== null || bomberColourValue !== null || laserFixtureTier !== null
      ? variantDirectoryName
      : enemyReviewHarness
      ? "enemy-review"
      : enemyCombatReviewHarness
        ? "enemy-combat-review"
        : paletteCandidate
          ? `enemy-palette-${enemyPaletteSlug}`
          : pickupColourValue !== null
            ? `pickup-colour-${pickupColourSlug.toUpperCase()}`
          : alliedSteelValue !== null
            ? `allied-steel-${alliedSteelSlug.toUpperCase()}`
          : menuSteelTwinkle
            ? "menu-steel-twinkle"
          : hullStyleValue !== null
            ? `hull-style-${hullStyleSlug.toUpperCase()}`
          : bomberHullValue !== null
            ? `bomber-hull-${bomberHullSlug.toLowerCase()}`
          : levelDebugId !== null
            ? levelDebugSuffix.slice(1)
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
        overwrittenByResidentSuffix: true,
      },
      // The ADR-003 splash blob rides at the tail of the initial block and is
      // copied to $0500-$06FF by both stage-2 entries, right after
      // disable_basic_rom. It is boot-only: no resident byte changes.
      bootSplash: {
        runAddress: bootSplashRunAddress,
        loadAddress: bootSplashLoadAddress,
        transportAddress: bootSplashSourceAddress,
        bytes: bootSplashBytes,
        codeBytes: bootSplashCodeBytes,
        // The tables and code, which never change once the copy has landed.
        // The variables below this address are the hold's own state.
        immutableAddress: bootSplashImmutableAddress,
        immutableBytes: bootSplashRunAddress + bootSplashBytes - bootSplashImmutableAddress,
        sha256: sha256(bootSplashRuntime),
        source: "assets/audio/boot-splash.json",
        sourceSha256: sha256(fs.readFileSync(bootSplashDefinitionPath)),
        holdFrames: bootSplashAsset.holdFrames,
        fadeStartFrame: bootSplashAsset.fadeStartFrame,
        segments: bootSplashAsset.segments.map(({ type, frames }) => ({ type, frames })),
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
    // Roadmap 4.3. The reader and the level buffer are both window residents;
    // the ATR carries each level image as its own sector run and the reader
    // reads it over SIO at START GAME.
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
        origin: "read over SIO at START GAME",
      })),
      // M5a-S1: the run read at $A006 and its directory.
      overlayDirectory: {
        address: sectorReaderLabels.get("overlay_directory"),
        entries: OVERLAY_DIRECTORY.length,
        bytes: OVERLAY_DIRECTORY.length * 5,
        names: OVERLAY_DIRECTORY,
      },
      slotAOverlaidFlag: sectorReaderLabels.get("sr_slot_a_overlaid"),
      summaryResidentFlag: sectorReaderLabels.get("sr_summary_resident"),
    },
    // M5a-S2 (docs/plans/m5-loading-boss.md §4.8): the level-summary screen.
    levelSummary: {
      code: {
        address: summaryModuleAddress,
        bytes: levelSummaryModule.raw.length,
        endExclusive: summaryModuleAddress + summaryModuleCapacityBytes,
        capacityBytes: summaryModuleCapacityBytes,
        freeBytes: summaryModuleCapacityBytes - levelSummaryModule.raw.length,
        maxSectors: summaryCodeMaxSectors,
        startSector: summaryCodeSector,
        sectors: summaryCodeSectors,
        file: "level-summary.bin",
        displayList: levelSummaryModule.labels.toString("utf8").match(
          /^al ([0-9A-F]+) \.summary_display_list$/im)?.[1] ?? null,
      },
      art: {
        source: "assets/graphics/level-summary.json",
        sectorsPerRegion: SUMMARY_ART_SECTORS,
        staging: summaryStagingAddress,
        layout: SUMMARY_LAYOUT,
        runs: summaryArtRuns.map(({ region, hullStyle, startSector, sectors, data, usedBytes, file }) =>
          ({ region, hullStyle, startSector, sectors, bytes: data.length, usedBytes, file,
            sha256: sha256(data) })),
      },
      saveRecord: { sector: saveRecordSector, buffer: summaryStagingAddress, bytes: 128,
        shipped: "empty (all zero): BEST reads -- until the player earns one" },
      statBlock: { address: 0xac, bytes: 10 },
      mboss: { reservedSectors: [528, 583] },
    },
    // audit-hardening (docs/plans/audit-hardening.md §2-§3): the disk's
    // identity and the guard that checks every run a transition uses.
    diskGuard: (() => {
      const guardLabels = parseViceLabels(lightKernelModule.labels.toString("utf8"));
      const start = guardLabels.get("__DISK_GUARD_RUN__") ?? guardLabels.get("guard_begin");
      const end = guardLabels.get("guard_end");
      const hexSum = (sum) => (sum === null ? null :
        `$${((sum.hi << 8) | sum.lo).toString(16).toUpperCase().padStart(4, "0")}`);
      return {
        address: start,
        bytes: end - start,
        record: "the Light kernel's DFMC record (owner Q2: +1 extension sector)",
        identity: {
          sector: identitySectorNumber,
          directoryEntry: OVERLAY_IDENTITY,
          block: [...diskIdentity].map((byte) => byte.toString(16).padStart(2, "0")).join(""),
          magic: diskIdentity.subarray(0, 4).toString("latin1"),
          layoutId: layoutId(diskLayout),
          layout: diskLayout,
        },
        fold: "per accepted sector: a += its SIO carry-wrap sum; b += a + carry (16-bit)",
        directorySums: OVERLAY_DIRECTORY.map((name, index) => ({ index, name,
          expected: index === OVERLAY_SAVE_RECORD ? "never checked" : hexSum(diskGuardSums[index]) })),
        bossHeadSums: bossHeadSums.map(hexSum),
        summaryArtSums: summaryArtSums.map(({ sum }) => hexSum(sum)),
        summaryLevelSums: summaryLevelSums.map(({ sum }) => hexSum(sum)),
      };
    })(),
    // M5a-S1 (docs/plans/m5-loading-boss.md §4.1): overlay slot A and the
    // capital vector table. Restore variant (b): the capital group stays in its
    // boot record; the run below is read only after another overlay used the slot.
    overlays: {
      baseSector: overlayBaseSector,
      slotA: {
        address: slotAddress,
        endExclusive: slotEnd,
        bytes: capitalSlotImage.length,
        firstRoutine: "update_broadside",
        sha256: sha256(capitalSlotImage),
      },
      capitalVectors: {
        address: capitalVectorImage[0].windowAddress,
        entries: capitalVectorImage.length,
        bytes: capitalVectorImage.length * 3,
        table: capitalVectorImage.map(({ constant, target, address, windowAddress }) =>
          ({ name: constant, target, targetAddress: address, address: windowAddress })),
        // audit-hardening: moved from the reader to the Light kernel's link.
        imageInLightKernel: parseViceLabels(lightKernelModule.labels.toString("utf8"))
          .get("capital_vector_image"),
      },
      runs: overlayRuns.map(({ index, name, startSector, sectors, destination, data, file }) => ({
        index, name, startSector, sectors, destination, bytes: data.length,
        sha256: sha256(data), file,
      })),
      sectorsUsed: overlayRuns.reduce((total, run) => total + run.sectors, 0),
    },
    // M5b-S4a-i (docs/plans/m5-loading-boss.md §5.13.4; owner answers Q-B5,
    // Q-B8): the boss's homes, its runs and the entry they make.
    boss: {
      claim: { start: BOSS_CLAIM.start, endExclusive: BOSS_CLAIM.endExclusive,
        bytes: BOSS_CLAIM.endExclusive - BOSS_CLAIM.start,
        owner: "owner answers Q-B5 and Q7: the region charset, slot C, the scratch page, slot D; the boss sector only" },
      slotA: { address: slotAddress, bytes: bossSlotUsed, capacityBytes: slotABytes,
        freeBytes: slotABytes - bossSlotUsed, sectors: bossCodeSectors },
      install: { address: bossInstallAddress, bytes: bossInstallUsed, capacityBytes: installBytes,
        freeBytes: installBytes - bossInstallUsed, sectors: bossInstallSectors },
      slotC: { address: BOSS_SLOT_C_ADDRESS, bytes: bossSlotCUsed, codeBytes: bossSlotCCodeBytes,
        capacityBytes: BOSS_SLOT_C_BYTES, freeBytes: BOSS_SLOT_C_BYTES - bossSlotCUsed,
        sectors: bossSlotCSectors },
      scratch: { address: BOSS_SCRATCH_ADDRESS, bytes: bossScratchUsed, capacityBytes: BOSS_SCRATCH_BYTES,
        freeBytes: BOSS_SCRATCH_BYTES - bossScratchUsed,
        columnMap: bossLabels.get("boss_column_map"), ring: bossLabels.get("boss_ring") },
      slotD: { address: BOSS_SLOT_D_ADDRESS, bytes: bossSlotDUsed, codeBytes: bossSlotDCodeBytes,
        capacityBytes: BOSS_SLOT_D_BYTES, freeBytes: BOSS_SLOT_D_BYTES - bossSlotDUsed,
        sectors: bossSlotDSectors },
      // S5-1 (owner decision Q9): slot F, the HUD charset's unused upper half,
      // each region's block (today its look tail) read there at the entry.
      slotF: { address: BOSS_SLOT_F_ADDRESS, capacityBytes: BOSS_SLOT_F_BYTES,
        lookTail: { address: bossRegions[0].lookTailAddress, bytes: bossRegions[0].lookTail.length },
        blocks: bossRegions.map((region, index) => ({ region: index + 1, bytes: region.lookTail.length,
          sectors: region.runs.block.sectors, startSector: bossRegionRunSector(index, "block"),
          freeBytes: BOSS_SLOT_F_BYTES - region.lookTail.length })) },
      // M5b-S4b.5: slot E over the expanded hull maps, the boss sector only.
      slotE: { address: BOSS_SLOT_E_ADDRESS, bytes: bossSlotEUsed, codeBytes: bossSlotECodeBytes,
        capacityBytes: BOSS_SLOT_E_BYTES, freeBytes: BOSS_SLOT_E_BYTES - bossSlotEUsed,
        sectors: bossSlotESectors },
      laserFixtureTier,
      charset: { address: bossRegions[0].runs.charset.address, capacityBytes: 1024 },
      reservedSectors: { code: [bossReservationSector, bossReservationSector + bossReservationSectors - 1],
        regions: [bossRegionBaseSector, bossRegionAreaEnd - 1],
        blocks: [BOSS_BLOCK_BASE_SECTOR, BOSS_BLOCK_BASE_SECTOR + bossRegionCount * BOSS_BLOCK_SECTORS - 1] },
      runs: bossDiskRuns.map(({ name, startSector, sectors, destination, data, file }) =>
        ({ name, startSector, sectors, destination, bytes: data.length, sha256: sha256(data), file })),
      regions: bossRegions.map((region, index) => ({
        region: index + 1, name: region.name, style: region.style, codes: region.codeCount,
        stageStep: region.stageStep, charsetBytes: region.charsetBytes,
        charsetSectors: region.runs.charset.sectors, modules: region.modules.length,
        // S5-2: the finale's floor (fire.finaleCooldown; 0 = no finale).
        finaleCooldown: region.fire.finaleCooldown,
        entrySectors: BOSS_THEME_SECTORS + bossCodeSectors + bossInstallSectors + bossSlotCSectors +
          bossSlotDSectors + bossSlotESectors +
          BOSS_BAND_A_SECTORS + BOSS_BAND_B_SECTORS + region.runs.charset.sectors +
          region.runs.block.sectors,
      })),
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
            landing: "direct: stage 2 decodes it to $7BD0; no hold, no publish copy",
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
        // The window carries BOTH links: the Director's window half at the
        // window base and the Light ASM kernel's own link above it. Counting only
        // the Director half reported the whole Light kernel as free space
        // (735 B against a real 27 B). The free figure below is the window's,
        // and equals lightKernel.freeBytes because the kernel link closes it.
        directorHalfBytes: directorModule.basicWindowBytes,
        lightKernelBytes: lightKernelModule.raw.length,
        usedBytes: directorModule.basicWindowBytes + lightKernelModule.raw.length,
        freeBytes: hybridWindowCapacityBytes -
          (directorModule.basicWindowBytes + lightKernelModule.raw.length),
        availability: "unconditional: disable_basic_rom forces PORTB bit 1 and writes " +
          "BASICF at every stage-2 entry",
        boundedBy: { below: `${levelBufferSectors}-sector level buffer ` +
            `$${levelBufferAddress.toString(16).toUpperCase()}-` +
            `$${(hybridWindowAddress - 1).toString(16).toUpperCase()}`,
          above: "sector reader BSS $BC00-$BC19, then the guard and the OS screen " +
            "$BC20-$BFFF (RAMTOP $C0 when BASIC is disabled at coldstart)" },
        guard: "HYBRID_C_WINDOW_GUARD $BC1A-$BC1F, reserved with no segment, plus the ld65 " +
          "assert \"HYBRID_C_WINDOW reaches the sector reader BSS at $BC00\"",
        contents: basicWindowSegment === null ? null
          : "the Light kernel: HYBRID_ASM_WINDOW + HYBRID_C_WINDOW + HYBRID_C_WINDOW_RODATA + HYBRID_C_WINDOW_FLOW",
        transport: basicWindowRecord === null ? null : {
          record: "own DFMC record, LZ, stagingId extension",
          finalDestination: basicWindowRecord.finalDestination,
          startSector: basicWindowRecord.startSector,
          sectors: basicWindowRecord.sectorCount,
          rawBytes: basicWindowRecord.rawLength,
          packedBytes: basicWindowRecord.packedLength,
          paddingBytes: basicWindowChunk.sectors * 128 - basicWindowRecord.packedLength -
            chunkLoaderConstants.chunkFooterBytes,
          landing: `direct: stage 2 decodes it to ` +
            `${hybridWindowAddress.toString(16).toUpperCase()} after disable_basic_rom`,
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
    // Roadmap 4.6 step 2 (docs/plans/director-4.6.md §2.2, §3.4): the LevelDef
    // core page, and the offsets the Director reads it by. Both halves of the
    // contract are generated from scripts/level-compiler.mjs, so the C offsets
    // in src/c/director.c and the compiler's own layout cannot drift apart
    // without tests/level-compiler.test.mjs noticing.
    levelDef: {
      core: {
        home: "per-level image, behind the hull block",
        file: "level-core.bin",
        imageOffset: LEVEL_CORE_OFFSET,
        blockAddress: LEVEL_CORE_ADDRESS,
        blockBytes: LEVEL_CORE_BYTES,
        magic: LEVEL_CORE_MAGIC,
        headerBytes: CORE_HEADER_BYTES,
        maxSectors: MAX_SECTORS,
        maxWaves: MAX_WAVES,
        sectorArrayOffset: SECTOR_ARRAY_OFFSET,
        waveArrayOffset: WAVE_ARRAY_OFFSET,
      },
      payloadImageOffset: LEVEL_PAYLOAD_OFFSET,
      // Roadmap 4.6 step 5: read from here on - the Light looks by the
      // install, the weapon looks by the hostile glyph builder.
      payload: {
        home: "per-level image, behind the core page",
        file: "level-payload.bin",
        imageOffset: LEVEL_PAYLOAD_OFFSET,
        blockAddress: LEVEL_PAYLOAD_ADDRESS,
        blockBytes: LEVEL_PAYLOAD_BYTES,
      },
      geometryImageOffset: LEVEL_GEOMETRY_OFFSET,
      geometry: {
        home: "per-level image, behind the payload page",
        file: "level-geometry.bin",
        imageOffset: LEVEL_GEOMETRY_OFFSET,
        blockAddress: LEVEL_GEOMETRY_ADDRESS,
        blockBytes: LEVEL_GEOMETRY_BYTES,
      },
      // Keyed by the level START GAME loads: `level1` in the default build,
      // `level2` on --level=2.
      [`level${startRun.id}`]: {
        sectors: compiledLevels.get(startRun.id).sectors.length,
        waves: compiledLevels.get(startRun.id).waves.length,
        hullRows: compiledLevels.get(startRun.id).geometry.hullRows,
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
      // Step 2: the per-level hull style. The mapping is build-time data — the
      // runtime carries no selector — and the block's home in the level image
      // is what main.s reads through build/level-hull-block.inc.
      levelStyles: Array.from({ length: LEVEL_MAX_ID }, (unused, index) => {
        const level = index + 1;
        const styleId = hullStyleIdForRun(level);
        return {
          level,
          styleId,
          styleName: `R${styleId}`,
          alliedColpf1: alliedColpf1ForRun(level),
        };
      }),
      levelBlock: {
        home: "per-level image, behind the gameplay music block",
        file: "level-hull-block.bin",
        imageOffset: hullBlockImageOffset,
        imageSector: gameplayMusicSectors + 1,
        blockAddress: hullBlockAddress,
        blockBytes: hullBlockBytes,
        blockSectors: hullBlockSectors,
        paddingBytes: hullBlockSectors * 128 - hullBlockBytes,
        offsets: hullBlockOffsets,
        styleId: startLevelHullBlock[0],
        alliedColpf1: startLevelHullBlock[hullBlockAlliedColpf1Offset],
        levelDefFirstSector,
      },
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
      formatVersion: menuMusicAsset.formatVersion,
      patternCount: Object.keys(menuMusicAsset.patterns).length,
      sequencePatterns: menuMusicAsset.sequence.length,
      loopFrames: menuMusicAsset.loopFrames,
      loopSeconds: menuMusicAsset.loopSeconds,
      channelAllocation: menuMusicAsset.channels,
      channelMask: 0x0f,
      pitchCount: menuMusicAsset.pitchBytes.length,
      instrumentCount: menuMusicAsset.instrumentOrder.length,
      macroPageBytes: menuMusicAsset.macroPage.length,
      columnCount: menuMusicAsset.columnBytes.length,
      // Music only, no SFX. The owner declined a rescale (owner decision AB,
      // Q-V1): sketch B keeps its peak and is judged by ear in the emulator.
      peakVolumeSum: peakVolumeSum(renderOracleStream(menuMusicAsset)),
      runtimeCodeBytes: musicPlayerEnd - musicPlayerStart,
      runtimeDataBytes: musicDataEnd - musicDataStart,
      runtimeStateBytes: menuMusicAsset.stateBytes,
      runtimeZeroPageBytes: menuMusicAsset.zeroPageBytes,
    },
    gameplayMusic: {
      source: "assets/music/gameplay-theme.json",
      sourceSha256: sha256(fs.readFileSync(gameplayMusicDefinitionPath)),
      title: gameplayMusicAsset.title,
      originalComposition: gameplayMusicAsset.originalComposition,
      targetFrameHz: gameplayMusicAsset.targetFrameHz,
      framesPerRow: gameplayMusicAsset.framesPerRow,
      rowsPerPattern: gameplayMusicAsset.rowsPerPattern,
      formatVersion: gameplayMusicAsset.formatVersion,
      patternCount: Object.keys(gameplayMusicAsset.patterns).length,
      sequencePatterns: gameplayMusicAsset.sequence.length,
      loopFrames: gameplayMusicAsset.loopFrames,
      loopSeconds: gameplayMusicAsset.loopSeconds,
      channelAllocation: gameplayMusicAsset.channels,
      reservedSfxChannels: gameplayMusicAsset.reservedSfxChannels,
      channelMask: 0x03,
      audctlProfile: gameplayMusicAsset.audctl,
      columnCount: gameplayMusicAsset.columnBytes.length,
      channelPitchCounts: gameplayMusicAsset.channelPitches.map((list) => list.length),
      // Music only, no SFX. The gameplay levels are drafted at ~60 % so the
      // SFX stay on top; the owner tunes the balance in smoke (decision AB.3).
      peakVolumeSum: peakVolumeSum(renderOracleStream(gameplayMusicAsset,
        { pitches: menuMusicAsset.pitches })),
      runtimeCodeBytes: gameMusicPlayerEnd - gameMusicPlayerStart,
      runtimeDataBytes: gameMusicDataEnd - gameMusicDataStart,
      // Music v2 §1.4 placement G1: the player is code inside the per-level
      // image and executes from the level buffer, not from STARFIELD.
      placement: {
        home: "per-level image, behind the eight-byte header",
        file: "gameplay-music.bin",
        source: "src/hybrid/gameplay-music.s",
        config: "cfg/gameplay-music.cfg",
        blockAddress: gameplayMusicAddress,
        blockBytes: gameplayMusicModule.raw.length,
        blockReservedBytes: gameplayMusicCapacityBytes,
        blockFreeBytes: gameplayMusicCapacityBytes - gameplayMusicModule.raw.length,
        blockSectors: gameplayMusicSectors,
        levelDefFirstSector,
        vectors: Object.fromEntries(GAMEPLAY_MUSIC_VECTORS.map(([name], index) =>
          [name, gameplayMusicAddress + index * 3])),
      },
      runtimeStateBytes: gameplayMusicAsset.stateBytes,
      // One column byte read per channel per row: the generalised form of the
      // v1 GAME_MUSIC_EVENTS_PER_TICK_LIMIT assert (plan §2).
      columnReadsPerRow: 1,
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
  writeFile(path.join(buildDirectory, "boot-splash.bin"), bootSplashRuntime);
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
  // The variant's artifacts land beside the intermediates it generated, in the
  // directory it owns; the default build alone writes dist/.
  const artifactDirectory = variantDirectoryName === null
    ? distDirectory
    : buildDirectory;
  writeFile(path.join(artifactDirectory, "void-strike-65-boot.bin"), transportPayload);
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
    } else if (menuSteelTwinkle) {
      console.log(`  variant : menu stars, steel twinkling too (steel -> off -> steel)`);
      console.log(`  output  : ${path.relative(rootDirectory, artifactDirectory)}`);
    } else if (bomberHullFallbackValue !== null) {
      console.log(`  variant : Bomber hull ${bomberHullSlug.toLowerCase()} ` +
        `(hue $${bomberHullValue.toString(16).padStart(2, "0")}, full HP ` +
        `$${(bomberHullValue | 0x08).toString(16)})`);
      console.log(`  output  : ${path.relative(rootDirectory, artifactDirectory)}`);
    } else if (playerColourValue !== null || bomberColourValue !== null) {
      console.log(`  variant : ` + [
        playerColourValue === null ? null : `player-side COLPF2 $${playerColourSlug.toUpperCase()}`,
        bomberColourValue === null ? null : `Bomber hull $${bomberColourSlug} ramp`,
        levelDebugId === null ? null : `level ${levelDebugId} entered at sector ${levelDebugSector + 1}`,
      ].filter(Boolean).join(", "));
      console.log(`  output  : ${path.relative(rootDirectory, artifactDirectory)}`);
    } else if (levelDebugId !== null) {
      console.log(`  variant : debug route - level ${levelDebugId}` +
        `${bossRegionValue === null ? "" : ` as level ${levelRunId} (boss region ${bossRegionValue})`}` +
        `, entered at sector ${levelDebugSector + 1}`);
      console.log(`  output  : ${path.relative(rootDirectory, artifactDirectory)}`);
    } else if (hullStyleValue !== null) {
      console.log(`  variant : hull region ${hullStyleSlug.toUpperCase()} on every level ` +
        `(allied steel $${(alliedSteelValue ?? alliedColpf1ForLevel(
          1 + Math.floor(((hullStyleValue - 1) * LEVEL_MAX_ID) / 4))).toString(16)})`);
      console.log(`  output  : ${path.relative(rootDirectory, artifactDirectory)}`);
    }
  }
}

build().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
