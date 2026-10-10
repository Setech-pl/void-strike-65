// feat/boss-escort-flow, Phase A (docs/plans/boss-escort-flow.md): comparison
// builds for the owner's smoke of 2026-10-10. Region 1's boss escort today is
// a data stream armed at the boss install - six Interceptors 100 frames apart
// from the first frame of the fight, then none. The owner wants it to start
// once the boss is losing (after N weapon modules are destroyed) and then keep
// coming at a jittered interval until the boss falls; and asked whether an
// Interceptor could return to the top after reaching the bottom edge.
//
//   T   the trigger and the cadence: the boss controller (slot C) arms one
//       escort through the bytes director_c_try_event publishes, the first
//       ESCORT_LEAD frames after the N-th weapon kill, then every
//       baseFrames + (RNG & jitterMask) frames; never on a kill or an exposure
//       frame; none after the defeat. The install no longer arms the stream.
//   TW  T, and the boss sector's wave carries the re-entry flag (wave_flags
//       bit 6): an Interceptor that leaves the bottom edge alive re-enters at
//       the top at its own column, its reload restarted as at an admission;
//       the defeat clears the flag, so the live one leaves for good.
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

const BOSS_C_EXTERNS = {
  file: "src/c/boss.c",
  from: "extern void boss_next_armed(void);\n",
  to: "extern void boss_next_armed(void);\n" +
    "/* feat/boss-escort-flow: the boss sector's escort. The controller arms the\n" +
    " * window's Light wave stepper (src/c/lifecycle.c light_wave_step) through\n" +
    " * the bytes director_c_try_event publishes; the boss link imports them. */\n" +
    "extern volatile uint8_t light_wave_lock;\n" +
    "extern uint8_t light_wave_remaining;\n" +
    "extern uint8_t light_wave_timer;\n" +
    "extern uint8_t director_c_rng_advance(void);\n" +
    "#define BOSS_ESCORT_LEAD 25u\n",
};

const BOSS_C_STATE = {
  file: "src/c/boss.c",
  from: "uint8_t boss_finale;\n",
  to: "uint8_t boss_finale;\n" +
    "/* feat/boss-escort-flow: weapon kills still to come before the first\n" +
    " * escort (0 = started, or none: the install zeroes it for a level with\n" +
    " * no escort wave), and frames to the next one (0 = idle). */\n" +
    "uint8_t boss_escort_wait;\n" +
    "uint8_t boss_escort_timer;\n",
};

const BOSS_C_INIT = {
  file: "src/c/boss.c",
  from: "    boss_start_lo = boss_active_frame[0];\n    boss_start_hi = boss_active_frame[1];\n}\n",
  to: "    boss_start_lo = boss_active_frame[0];\n    boss_start_hi = boss_active_frame[1];\n" +
    "    /* feat/boss-escort-flow: the escort waits for the region's count of\n" +
    "     * weapon kills. */\n" +
    "    boss_escort_wait = TABLE[BOSS_T_ESCORT_AFTER];\n" +
    "    boss_escort_timer = 0u;\n" +
    "}\n",
};

const defeatEdit = (reenter) => ({
  file: "src/c/boss.c",
  from: "            boss_stats_bonus[1] = boss_def[BOSS_DEF_BONUS_HI];\n            return 1u;\n        }\n",
  to: "            boss_stats_bonus[1] = boss_def[BOSS_DEF_BONUS_HI];\n" +
    "            /* feat/boss-escort-flow: no escort after the defeat - an\n" +
    "             * admission still pending is cancelled" +
    (reenter ? ", and the live one\n             * leaves at the bottom edge for good. */\n" +
      "            light_wave_remaining = 0u;\n" +
      "            heavy_wave_flags &= (uint8_t)~WAVE_FLAG_REENTER;\n"
      : ". */\n            light_wave_remaining = 0u;\n") +
    "            return 1u;\n        }\n" +
    "        if (boss_escort_wait != 0u) {\n" +
    "            --boss_escort_wait;\n" +
    "            if (boss_escort_wait == 0u) {\n" +
    "                boss_escort_timer = BOSS_ESCORT_LEAD;\n" +
    "            }\n" +
    "        }\n",
});

const BOSS_C_ARM = {
  file: "src/c/boss.c",
  from: "/* Every frame: in the fight, the one countdown to the next firing module;\n",
  to: "/* feat/boss-escort-flow: one escort. The install published the boss\n" +
    " * sector's wave with nothing pending; each escort asks the window's\n" +
    " * stepper for one admission, which waits for the slot (lights 1). The\n" +
    " * next comes baseFrames + (RNG & jitterMask) frames on - the RNG's high\n" +
    " * bits, as the low bits of x * 5 + 1 cycle short. */\n" +
    "static void boss_escort_arm(void)\n" +
    "{\n" +
    "    light_wave_timer = 0u;\n" +
    "    light_wave_remaining = 1u;\n" +
    "    light_wave_lock = 1u;\n" +
    "    boss_t = director_c_rng_advance();\n" +
    "    boss_t = (uint8_t)((uint8_t)(boss_t >> 2) & TABLE[BOSS_T_ESCORT_JITTER]);\n" +
    "    boss_escort_timer = (uint8_t)(TABLE[BOSS_T_ESCORT_BASE] + boss_t);\n" +
    "}\n\n" +
    "/* Every frame: in the fight, the one countdown to the next firing module;\n",
};

const BOSS_C_TICK = {
  file: "src/c/boss.c",
  from: "                boss_expose();\n                boss_heavy = 1u;\n            }\n        }\n",
  to: "                boss_expose();\n                boss_heavy = 1u;\n            }\n        }\n" +
    "        /* feat/boss-escort-flow: the escort's countdown. Never on a kill\n" +
    "         * frame (expose_pending 1 here) or the exposure check's frame\n" +
    "         * (boss_heavy): the stepper admits after this tick, on the same\n" +
    "         * frame. */\n" +
    "        if (boss_escort_timer != 0u) {\n" +
    "            --boss_escort_timer;\n" +
    "            if (boss_escort_timer == 0u) {\n" +
    "                if ((uint8_t)(boss_expose_pending | boss_heavy) != 0u) {\n" +
    "                    boss_escort_timer = 1u;\n" +
    "                } else {\n" +
    "                    boss_escort_arm();\n" +
    "                }\n" +
    "            }\n" +
    "        }\n",
};

const BOSS_C_REENTER_EXTERNS = {
  file: "src/c/boss.c",
  from: "#define BOSS_ESCORT_LEAD 25u\n",
  to: "#define BOSS_ESCORT_LEAD 25u\n" +
    "extern volatile uint8_t heavy_wave_flags;\n" +
    "#define WAVE_FLAG_REENTER 0x40u\n",
};

// The install's step 9 armed the row-0 wave's whole count at once. It still
// publishes the wave, but leaves nothing pending: the controller asks for
// each escort once the boss is losing. A level with no escort wave zeroes the
// controller's kill count, so it never asks.
const BOSS_S_INSTALL = {
  file: "src/hybrid/boss.s",
  from: "    jsr _director_c_try_event\n@no_escort:\n",
  to: "    jsr _director_c_try_event\n" +
    "    lda #$00                            ; feat/boss-escort-flow: nothing pending;\n" +
    "    sta _light_wave_remaining           ; the controller asks for each escort\n" +
    "    beq @escort_done\n" +
    "@no_escort:\n" +
    "    sta _boss_escort_wait               ; A = 0: no escort wave, no escort\n" +
    "@escort_done:\n",
};

const bossExports = (reenter) => ({
  file: "src/hybrid/boss.s",
  from: "_boss_stats_bonus  = STATS_BONUS\n",
  to: "_boss_stats_bonus  = STATS_BONUS\n" +
    "; feat/boss-escort-flow: the escort's bytes in the Director link.\n" +
    ".export _light_wave_lock, _light_wave_remaining, _light_wave_timer\n" +
    ".export _director_c_rng_advance\n" +
    ".import _boss_escort_wait\n" +
    (reenter ? ".export _heavy_wave_flags\n" : ""),
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

// TW grows the Director link's half of the window, so the Light kernel above
// it moves and the boss entry's pin on its HUD backup moves with it (the build
// names the new address when the pin is stale).
const PIN_HUD_BACKUP_TW = {
  file: "src/hybrid/boss-entry-pins.inc",
  from: "pin_boss_enter_hud_backup        = $B802",
  to: "pin_boss_enter_hud_backup        = $B81F",
};

const LIFECYCLE_REENTER_FLAG = {
  file: "src/c/lifecycle.c",
  from: "#define LIGHT_RETIRE_Y           232u\n",
  to: "#define LIGHT_RETIRE_Y           232u\n" +
    "/* feat/boss-escort-flow: wave_flags bit 6 (scripts/level-compiler.mjs). */\n" +
    "#define WAVE_FLAG_REENTER        0x40u\n",
};

const regionEscort = {
  file: "assets/graphics/boss-regions/region-1/modules.json",
  transform(text) {
    const layout = JSON.parse(text);
    layout.escort = { ...ESCORT_DATA };
    return JSON.stringify(layout, null, 2);
  },
};

const levelEscort = (reenter) => ({
  file: "assets/levels/level-01.json",
  transform(text) {
    const level = JSON.parse(text);
    const boss = level.sectors.find((sector) => sector.kind === "boss");
    if (boss === undefined || boss.waves?.length !== 1) {
      throw new Error("escort variant: level 1 must have one boss-sector wave");
    }
    // One escort per arming: the controller asks for each.
    boss.waves[0] = { ...boss.waves[0], count: 1, ...(reenter ? { reenter: true } : {}) };
    return JSON.stringify(level, null, 2);
  },
});

export const ESCORT_VARIANTS = Object.freeze({
  t: {
    summary: `trigger after ${ESCORT_DATA.afterWeapons} weapon kills, then one escort every ` +
      `${ESCORT_DATA.baseFrames}+0..${ESCORT_DATA.jitterMask} frames until the boss falls`,
    edits: [BOSS_C_EXTERNS, BOSS_C_STATE, BOSS_C_INIT, defeatEdit(false), BOSS_C_ARM, BOSS_C_TICK,
      BOSS_S_INSTALL, bossExports(false), regionEscort, levelEscort(false)],
  },
  tw: {
    summary: "T, and an Interceptor that leaves the bottom edge alive re-enters at the top",
    edits: [BOSS_C_EXTERNS, BOSS_C_REENTER_EXTERNS, BOSS_C_STATE, BOSS_C_INIT, defeatEdit(true),
      BOSS_C_ARM, BOSS_C_TICK, BOSS_S_INSTALL, bossExports(true), LIFECYCLE_REENTER,
      LIFECYCLE_REENTER_FLAG, PIN_HUD_BACKUP_TW, regionEscort, levelEscort(true)],
  },
});

// The Director-link labels the boss link imports for the variant.
export function escortVariantBossImports(id) {
  return ["_light_wave_lock", "_light_wave_remaining", "_light_wave_timer", "_director_c_rng_advance",
    ...(id === "tw" ? ["_heavy_wave_flags"] : [])];
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
