// feat/boss-escort-flow, Phase A (docs/plans/boss-escort-flow.md): comparison
// builds for the owner's smoke of 2026-10-10. Region 1's boss escort today is
// a data stream armed at the boss install - six Interceptors 100 frames apart
// from the first frame of the fight, then none. The owner wants it to start
// once the boss is losing (after N weapon modules are destroyed) and then keep
// coming at a jittered interval until the boss falls; and asked whether an
// Interceptor could return to the top after reaching the bottom edge.
//
//   T   the trigger and the cadence: the Director (src/c/director.c) arms one
//       escort through the window's Light wave stepper on the first quiet
//       fight frame after the N-th weapon kill, then every
//       baseFrames + (RNG & jitterMask) frames; the boss controller (slot C)
//       reports its weapon kills and its quiet frames (no kill, no exposure
//       check). The install no longer arms the stream.
//   TW  T, and the boss sector's wave carries the re-entry flag (wave_flags
//       bit 6): an Interceptor that leaves the bottom edge alive re-enters at
//       the top at its own column, its reload restarted as at an admission.
//       The next escort waits for a clear field, so none is ever pending when
//       the boss falls; a live one keeps re-entering through the chain and
//       the hold (about 3 s) until the hand-off.
//
// Each variant is the default build plus source edits applied IN MEMORY while
// scripts/build.mjs reads its inputs (the method of the retired
// scripts/audio-probe.mjs): nothing under src/ or assets/ changes on disk, and
// the variant owns build/escort-variant-<id>[-level-N-sM]/ like every review
// variant. The data the variants author - the region's escort block and the
// wave's reenter flag - is compiled by the committed scripts, which accept both
// and emit today's bytes when they are absent.

import fs from "node:fs";
import path from "node:path";

// The cadence's data (proposed; the owner tunes). 150 + 0..63 frames: one
// escort every 3.0-4.3 s from arming to arming; an Interceptor's pass is
// 116 frames (2.3 s), so the screen is clear for 0.7-2.0 s between two that
// are not shot.
export const ESCORT_DATA = Object.freeze({ afterWeapons: 2, baseFrames: 150, jitterMask: 63 });

// The Director decides (src/c/director.c, the window's last segment, so the
// hot Light C keeps its addresses and only the kernel above it moves). The
// world stops in a boss sector, so no row tick can arm the escort: the boss
// controller reports its weapon kills and each quiet fight frame.
const directorCadence = (reenter) => ({
  file: "src/c/director.c",
  from: "#pragma code-name (\"DIRECTOR_C_CODE\")\n\nvoid director_c_world_row_tick(void)\n",
  to: "/* feat/boss-escort-flow (owner smoke 2026-10-10): the boss sector's escort\n" +
    " * starts once the boss is losing - after the region's count of weapon\n" +
    " * kills, on the first quiet frame after it - and then comes every\n" +
    " * baseFrames + (RNG & jitterMask) frames\n" +
    " * until the boss falls. The world stops in a boss sector, so no row tick\n" +
    " * arms it: the boss controller (slot C) reports its weapon kills and each\n" +
    " * quiet fight frame, and the Director decides. $80FC and $80FD - the\n" +
    " * armed wave's Heavy formations and their spacing - are idle in a boss\n" +
    " * sector (no Heavy wave, no row tick) and enter_sector zeroed both: they\n" +
    " * count the weapon kills and the frames to the next escort. The region's\n" +
    " * three bytes are at $AD11-$AD13 (scripts/boss-assets.mjs). */\n" +
    "#define ESCORT_KILLS             STATE_WAVE_REMAINING\n" +
    "#define ESCORT_TIMER             STATE_SPACING\n" +
    "#define BOSS_ESCORT_AFTER        U8_AT(0xAD11u)\n" +
    "#define BOSS_ESCORT_BASE         U8_AT(0xAD12u)\n" +
    "#define BOSS_ESCORT_JITTER       U8_AT(0xAD13u)\n" +
    "\n" +
    "/* The boss controller, on a weapon kill that is not the last. The kill\n" +
    " * that makes the region's count publishes the sector's escort wave with\n" +
    " * nothing pending and starts the clock: the first escort comes on the\n" +
    " * next quiet frame. A region with no escort counts to 0, which no kill\n" +
    " * reaches; scripts/build.mjs refuses a region with an escort under a\n" +
    " * level whose boss sector authors no escort wave, and the reverse. */\n" +
    "#pragma code-name (\"DIRECTOR_C_CODE\")\n" +
    "void director_c_boss_weapon_down(void)\n" +
    "{\n" +
    "    ++ESCORT_KILLS;\n" +
    "    if (ESCORT_KILLS != BOSS_ESCORT_AFTER) {\n" +
    "        return;\n" +
    "    }\n" +
    "    director_c_try_event();\n" +
    "    light_wave_remaining = 0u;\n" +
    "    ++ESCORT_TIMER;\n" +
    "}\n" +
    "#pragma code-name (\"HYBRID_C_WINDOW_FLOW\")\n\n" +
    "/* The boss controller, on each fight frame with no kill and no exposure\n" +
    " * check: an escort is armed only on such a frame, and the stepper admits\n" +
    " * it on the same frame (it runs after the boss's update). baseFrames is\n" +
    " * longer than a pass (scripts/boss-assets.mjs), so the last escort has\n" +
    " * left by then unless it re-enters; then the next waits for the slot.\n" +
    " * The RNG's high bits, as the low bits of x * 5 + 1 cycle short. */\n" +
    "void director_c_boss_escort_frame(void)\n" +
    "{\n" +
    "    if (ESCORT_TIMER == 0u) {\n" +
    "        return;\n" +
    "    }\n" +
    "    --ESCORT_TIMER;\n" +
    "    if (ESCORT_TIMER != 0u) {\n" +
    "        return;\n" +
    "    }\n" +
    (reenter
      ? "    /* TW: the last escort may still be re-entering; the next waits for\n" +
        "     * a clear field, so none is ever left pending when the boss falls. */\n" +
        "    if (field_busy() != 0u) {\n" +
        "        ++ESCORT_TIMER;\n" +
        "        return;\n" +
        "    }\n"
      : "") +

    "    light_wave_timer = 0u;\n" +
    "    light_wave_remaining = 1u;\n" +
    "    light_wave_lock = 1u;\n" +
    "    director_c_rng_advance();\n" +
    "    ESCORT_TIMER = (uint8_t)(BOSS_ESCORT_BASE +\n" +
    "        (uint8_t)((uint8_t)(STATE_RNG >> 2) & BOSS_ESCORT_JITTER));\n" +
    "}\n\n" +
    "#pragma code-name (\"DIRECTOR_C_CODE\")\n\nvoid director_c_world_row_tick(void)\n",
});

const BOSS_C_EXTERNS = {
  file: "src/c/boss.c",
  from: "extern void boss_next_armed(void);\n",
  to: "extern void boss_next_armed(void);\n" +
    "/* feat/boss-escort-flow: the escort is the Director's (src/c/director.c);\n" +
    " * the controller reports its weapon kills and each quiet fight frame. */\n" +
    "extern void director_c_boss_weapon_down(void);\n" +
    "extern void director_c_boss_escort_frame(void);\n",
};

const defeatEdit = () => ({
  file: "src/c/boss.c",
  from: "            boss_stats_bonus[1] = boss_def[BOSS_DEF_BONUS_HI];\n            return 1u;\n        }\n",
  to: "            boss_stats_bonus[1] = boss_def[BOSS_DEF_BONUS_HI];\n" +
    "            return 1u;\n        }\n" +
    "        director_c_boss_weapon_down();          /* feat/boss-escort-flow */\n",
});

const BOSS_C_TICK = {
  file: "src/c/boss.c",
  from: "                boss_expose();\n                boss_heavy = 1u;\n            }\n        }\n",
  to: "                boss_expose();\n                boss_heavy = 1u;\n            }\n" +
    "        } else {\n" +
    "            /* feat/boss-escort-flow: a quiet frame - no kill, no exposure\n" +
    "             * check - is the only kind the escort may be armed on. */\n" +
    "            director_c_boss_escort_frame();\n" +
    "        }\n",
};

// The install's step 9 armed the row-0 wave's whole count at once; the
// Director publishes it at the trigger now.
const BOSS_S_INSTALL = {
  file: "src/hybrid/boss.s",
  from: "    ldx DIRECTOR_STATE_SECTOR\n    lda _sector_wave_count,x\n    beq @no_escort\n" +
    "    jsr _director_c_try_event\n@no_escort:\n",
  to: "    ; feat/boss-escort-flow: the Director arms it once the boss is losing\n" +
    "    ; (src/c/director.c director_c_boss_weapon_down).\n",
};

const bossExports = () => ({
  file: "src/hybrid/boss.s",
  from: "_boss_stats_bonus  = STATS_BONUS\n",
  to: "_boss_stats_bonus  = STATS_BONUS\n" +
    "; feat/boss-escort-flow: the Director's escort calls.\n" +
    ".export _director_c_boss_weapon_down, _director_c_boss_escort_frame\n",
});

const LIFECYCLE_REENTER = {
  file: "src/c/lifecycle.c",
  from: "        if (light_work >= LIGHT_RETIRE_Y) {\n            light_state[light_slot] = ENEMY_INACTIVE;\n" +
    "            return 0u;\n        }\n",
  to: "        if (light_work >= LIGHT_RETIRE_Y) {\n" +
    "            /* feat/boss-escort-flow: an Interceptor of a wave that carries\n" +
    "             * the re-entry flag comes back in at the top, at its own column\n" +
    "             * - it keeps its chase - with its reload restarted as at an\n" +
    "             * admission, so each pass fires as a fresh one does. */\n" +
    "            if (light_record != LIGHT_OFFSET_WINGMAN &&\n" +
    "                (heavy_wave_flags & WAVE_FLAG_REENTER) != 0u) {\n" +
    "                light_y[light_slot] = 0u;\n" +
    "                light_reload();\n" +
    "                return 0u;\n" +
    "            }\n" +
    "            light_state[light_slot] = ENEMY_INACTIVE;\n            return 0u;\n        }\n",
};

const LIFECYCLE_REENTER_FLAG = {
  file: "src/c/lifecycle.c",
  from: "#define LIGHT_RETIRE_Y           232u\n",
  to: "#define LIGHT_RETIRE_Y           232u\n" +
    "/* feat/boss-escort-flow: wave_flags bit 6 (scripts/level-compiler.mjs). */\n" +
    "#define WAVE_FLAG_REENTER        0x40u\n",
};

// The window grows, so the Light kernel above it moves and the boss entry's
// pin on its HUD backup moves with it; scripts/build.mjs names the address
// the kernel link really gave the label when the pin is stale.
const pinHudBackup = (address) => ({
  file: "src/hybrid/boss-entry-pins.inc",
  from: "pin_boss_enter_hud_backup        = $B802",
  to: `pin_boss_enter_hud_backup        = $${address}`,
});

const regionEscort = (data = ESCORT_DATA) => ({
  file: "assets/graphics/boss-regions/region-1/modules.json",
  transform(text) {
    const layout = JSON.parse(text);
    layout.escort = { ...data };
    return JSON.stringify(layout, null, 2);
  },
});

const levelEscort = (reenter) => ({
  file: "assets/levels/level-01.json",
  transform(text) {
    const level = JSON.parse(text);
    const boss = level.sectors.find((sector) => sector.kind === "boss");
    if (boss === undefined || boss.waves?.length !== 1) {
      throw new Error("escort variant: level 1 must have one boss-sector wave");
    }
    // One escort per arming: the Director asks for each.
    boss.waves[0] = { ...boss.waves[0], count: 1, ...(reenter ? { reenter: true } : {}) };
    return JSON.stringify(level, null, 2);
  },
});

const ESCORT_VARIANTS_EXTRA = {};
const ESCORT_VARIANTS_BASE = Object.freeze({
  t: {
    summary: `trigger after ${ESCORT_DATA.afterWeapons} weapon kills, then one escort every ` +
      `${ESCORT_DATA.baseFrames}+0..${ESCORT_DATA.jitterMask} frames until the boss falls`,
    edits: [directorCadence(false), BOSS_C_EXTERNS, defeatEdit(), BOSS_C_TICK, BOSS_S_INSTALL,
      bossExports(), pinHudBackup("B82D"), regionEscort(), levelEscort(false)],
  },
  tw: {
    summary: "T, and an Interceptor that leaves the bottom edge alive re-enters at the top",
    edits: [directorCadence(true), BOSS_C_EXTERNS, defeatEdit(), BOSS_C_TICK,
      BOSS_S_INSTALL, bossExports(), LIFECYCLE_REENTER, LIFECYCLE_REENTER_FLAG, pinHudBackup("B852"),
      regionEscort(), levelEscort(true)],
  },
});

export const ESCORT_VARIANTS = ESCORT_VARIANTS_EXTRA;
Object.assign(ESCORT_VARIANTS_EXTRA, ESCORT_VARIANTS_BASE);

// Data-only probes on T's code (Phase A, measured for the owner's choice):
//   t1  the escort starts at the first weapon kill (a parked edge-hider
//       reaches one: gun-5 behind plate-a);
//   ts  the slower cadence, 190 + 0..63 frames (3.8-5.1 s).
const T1_DATA = Object.freeze({ ...ESCORT_DATA, afterWeapons: 1 });
const TS_DATA = Object.freeze({ ...ESCORT_DATA, baseFrames: 190 });
const withData = (variant, data, summary) => ({
  summary,
  edits: variant.edits.map((edit) => (edit.file.endsWith("region-1/modules.json") ? regionEscort(data) : edit)),
});
Object.assign(ESCORT_VARIANTS_EXTRA, {
  t1: withData(ESCORT_VARIANTS_BASE.t, T1_DATA, "T with the escort starting at the first weapon kill"),
  ts: withData(ESCORT_VARIANTS_BASE.t, TS_DATA, "T with one escort every 190+0..63 frames"),
});

// The Director-link labels the boss link imports for the variant.
export function escortVariantBossImports(id) {
  return ["_director_c_boss_weapon_down", "_director_c_boss_escort_frame"];
}

export function parseEscortVariant(argv) {
  const argument = argv.find((value) => value.startsWith("--escort-variant="));
  if (argument === undefined) return null;
  const id = argument.slice("--escort-variant=".length).toLowerCase();
  if (!Object.hasOwn(ESCORT_VARIANTS, id)) {
    throw new Error(`Unknown escort variant ${id}; expected one of ${Object.keys(ESCORT_VARIANTS).join(", ")}`);
  }
  return id;
}

function replaceOnce(text, from, to, file) {
  const first = text.indexOf(from);
  if (first < 0 || text.indexOf(from, first + 1) >= 0) {
    throw new Error(`escort variant: ${file} must contain ${JSON.stringify(from)} exactly once`);
  }
  return text.slice(0, first) + to + text.slice(first + from.length);
}

// Wraps fs.readFileSync so the variant's files read back edited. Every edit
// must be consumed by the build, or the variant is not what its name says.
export function installEscortVariant(rootDirectory, id) {
  const variant = ESCORT_VARIANTS[id];
  const byFile = new Map();
  for (const edit of variant.edits) {
    const absolute = path.resolve(rootDirectory, edit.file);
    if (!byFile.has(absolute)) byFile.set(absolute, []);
    byFile.get(absolute).push(edit);
  }
  const consumed = new Set();
  const original = fs.readFileSync;
  fs.readFileSync = function readFileSyncWithEscortVariant(file, options) {
    const result = original.call(fs, file, options);
    if (typeof file !== "string" && !(file instanceof URL)) return result;
    const absolute = path.resolve(file instanceof URL ? file.pathname : file);
    const edits = byFile.get(absolute);
    if (edits === undefined) return result;
    let text = Buffer.isBuffer(result) ? result.toString("utf8") : result;
    for (const edit of edits) {
      text = edit.transform ? edit.transform(text) : replaceOnce(text, edit.from, edit.to, edit.file);
    }
    consumed.add(absolute);
    return Buffer.isBuffer(result) ? Buffer.from(text, "utf8") : text;
  };
  return {
    summary: variant.summary,
    assertConsumed() {
      for (const absolute of byFile.keys()) {
        if (!consumed.has(absolute)) {
          throw new Error(`escort variant ${id}: the build never read ${path.relative(rootDirectory, absolute)}`);
        }
      }
    },
  };
}
