// feat/interceptor-standoff (owner smoke 2026-10-11, docs/plans/interceptor-standoff.md):
// the Interceptor's comparison builds. After playing the boss escort flow the
// owner found the Interceptor too fast - it chases at the player's own top
// speed, so every pass ends shot down or in a collision with the player, a
// kamikaze run. Two behaviours are built for the owner to play:
//
//   s  SLOWER CHASE - the same pursuit, horizontal tracking at half the
//      player's top speed (one 4-HPOS cell every fourth frame instead of every
//      other one); the descent, the fire and the pass are unchanged.
//   r  STANDOFF - descends as today to a standoff above the player (each Light
//      slot two rows higher, so a swarm stacks), backs off upward when the
//      player closes in, tracks the player's column at the player's speed,
//      fires its laser straight down only when it is in the player's column,
//      and climbs out when its time is up.
//
// A variant is the default build plus edits applied IN MEMORY while
// scripts/build.mjs reads its inputs (the method of scripts/boss-escort-variants.mjs):
// nothing under src/ changes on disk, and the variant owns
// build/interceptor-variant-<id>[-level-N-sM]/ like every review variant. The
// default build reads none of this.

import fs from "node:fs";
import path from "node:path";

// R's tunables, in one place so a comparison build can try other values
// without touching the code below (plan §3.2 gives the reasons).
export const STANDOFF = Object.freeze({
  lifeFrames: 100,    // frames from admission to the climb out
  far: 56,            // descend while the player is further below than 7 rows
  near: 48,           // back off while the player is closer than 6 rows
  slotRows: 16,       // each Light slot holds 2 rows higher: a swarm stacks
  dive: 2,            // the descent, lines a frame (today's rate)
  backoff: 2,         // the back-off, lines a frame (the player climbs 1)
  climb: 8,           // the climb out, lines a frame: out in <= 23 frames
  trackDive: 1,       // one cell every 2nd frame, the player's speed (today's)
});

const LIFECYCLE = "src/c/lifecycle.c";

const sTrack = {
  file: LIFECYCLE,
  from: "#define INTERCEPTOR_TRACK_PHASE  2u\n",
  to: "/* feat/interceptor-standoff variant S: y steps by 2, so (y & 6) == 0 every\n" +
    " * fourth frame - one cell every fourth frame, half the player's top speed. */\n" +
    "#define INTERCEPTOR_TRACK_PHASE  6u\n",
};

const rDefines = (s) => ({
  file: LIFECYCLE,
  from: "#define INTERCEPTOR_TRACK_PHASE  2u\n",
  to: "#define INTERCEPTOR_TRACK_PHASE  2u\n" +
    "/* feat/interceptor-standoff variant R: the standoff. light_burst_left holds\n" +
    " * the frames the Interceptor has lived (every Light record fires single\n" +
    " * shots, so the burst count is free); at INTERCEPTOR_LIFE_FRAMES it climbs\n" +
    " * out and retires when y wraps past the top into the retire test. */\n" +
    `#define INTERCEPTOR_LIFE_FRAMES  ${s.lifeFrames}u\n` +
    `#define INTERCEPTOR_STANDOFF_FAR ${s.far}u\n` +
    `#define INTERCEPTOR_STANDOFF_NEAR ${s.near}u\n` +
    `#define INTERCEPTOR_SLOT_SHIFT   ${Math.log2(s.slotRows)}u\n` +
    `#define INTERCEPTOR_DIVE         ${s.dive}u\n` +
    `#define INTERCEPTOR_CLIMB        ${s.climb}u\n` +
    `#define INTERCEPTOR_BACKOFF      ${s.backoff}u\n` +
    `#define INTERCEPTOR_TRACK_DIVE   ${s.trackDive}u\n` +
    "#define PLAYER_Y                 U8_AT(0x0081u)\n",
});

const rMotion = {
  file: LIFECYCLE,
  from:
    "        light_work = (uint8_t)(light_y[light_slot] + 1u);\n" +
    "        if (light_record != LIGHT_OFFSET_WINGMAN) {\n" +
    "            ++light_work;\n" +
    "            light_y[light_slot] = light_work;\n" +
    "            if ((light_work & INTERCEPTOR_TRACK_PHASE) == 0u) {\n" +
    "                light_target_x = (uint8_t)(PLAYER_X & 0xFCu);\n" +
    "                if (light_target_x > LIGHT_X_LAST) {\n" +
    "                    light_target_x = LIGHT_X_LAST;\n" +
    "                }\n" +
    "                light_work = light_x[light_slot];\n" +
    "                if (light_work < light_target_x) {\n" +
    "                    light_work = (uint8_t)(light_work + LIGHT_X_STEP);\n" +
    "                    light_x[light_slot] = light_work;\n" +
    "                } else if (light_work > light_target_x) {\n" +
    "                    light_work = (uint8_t)(light_work - LIGHT_X_STEP);\n" +
    "                    light_x[light_slot] = light_work;\n" +
    "                }\n" +
    "                light_work = light_y[light_slot];\n" +
    "            }\n" +
    "        } else {\n" +
    "            light_y[light_slot] = light_work;\n" +
    "        }\n",
  to:
    "        light_work = light_y[light_slot];\n" +
    "        if (light_record == LIGHT_OFFSET_WINGMAN) {\n" +
    "            ++light_work;\n" +
    "        } else {\n" +
    "            /* The standoff (variant R). No column while it leaves: the\n" +
    "             * fire gate below compares light_x with light_target_x, and\n" +
    "             * no Light X is 0. */\n" +
    "            light_target_x = 0u;\n" +
    "            light_fire_work = light_burst_left[light_slot];\n" +
    "            if (light_fire_work >= INTERCEPTOR_LIFE_FRAMES) {\n" +
    "                light_work = (uint8_t)(light_work - INTERCEPTOR_CLIMB);\n" +
    "            } else {\n" +
    "                ++light_fire_work;\n" +
    "                light_burst_left[light_slot] = light_fire_work;\n" +
    "                /* The player's distance below, top to top, less the\n" +
    "                 * slot's own rows (a swarm stacks instead of merging; the\n" +
    "                 * Director's ceilings keep the slot under 3, so with the\n" +
    "                 * player at Y 32 or lower down nothing wraps). It tracks at\n" +
    "                 * the player's speed (half speed while holding is 13 packed\n" +
    "                 * bytes, a twelfth window sector). */\n" +
    "                light_target_x = (uint8_t)(light_slot << INTERCEPTOR_SLOT_SHIFT);\n" +
    "                light_scratch = (uint8_t)(PLAYER_Y - light_work);\n" +
    "                light_scratch = (uint8_t)(light_scratch - light_target_x);\n" +
    "                if (light_scratch >= INTERCEPTOR_STANDOFF_FAR) {\n" +
    "                    light_work = (uint8_t)(light_work + INTERCEPTOR_DIVE);\n" +
    "                } else if (light_scratch < INTERCEPTOR_STANDOFF_NEAR &&\n" +
    "                           light_work >= INTERCEPTOR_BACKOFF) {\n" +
    "                    light_work = (uint8_t)(light_work - INTERCEPTOR_BACKOFF);\n" +
    "                }\n" +
    "                light_target_x = (uint8_t)(PLAYER_X & 0xFCu);\n" +
    "                if (light_target_x > LIGHT_X_LAST) {\n" +
    "                    light_target_x = LIGHT_X_LAST;\n" +
    "                }\n" +
    "                if ((FRAME_COUNTER & INTERCEPTOR_TRACK_DIVE) == 0u) {\n" +
    "                    light_fire_work = light_x[light_slot];\n" +
    "                    if (light_fire_work < light_target_x) {\n" +
    "                        light_fire_work = (uint8_t)(light_fire_work + LIGHT_X_STEP);\n" +
    "                        light_x[light_slot] = light_fire_work;\n" +
    "                    } else if (light_fire_work > light_target_x) {\n" +
    "                        light_fire_work = (uint8_t)(light_fire_work - LIGHT_X_STEP);\n" +
    "                        light_x[light_slot] = light_fire_work;\n" +
    "                    }\n" +
    "                }\n" +
    "            }\n" +
    "        }\n" +
    "        light_y[light_slot] = light_work;\n",
};

// Budget, not behaviour: the escort's column in one 8-bit add. cc65 promotes
// ENEMY_X_0 + 4 + 2 to int and emits two additions; (x + 6) & $FC cast to a
// byte is the same value for every x.
const escortColumnAdd = {
  file: LIFECYCLE,
  from: "        light_work = (uint8_t)((ENEMY_X_0 + LIGHT_CENTRE_OFFSET + LIGHT_ROUND) & 0xFCu);\n",
  to: "        light_work = (uint8_t)(ENEMY_X_0 + (uint8_t)(LIGHT_CENTRE_OFFSET + LIGHT_ROUND));\n" +
    "        light_work = (uint8_t)(light_work & 0xFCu);\n",
};

const rFire = {
  file: LIFECYCLE,
  from:
    "    if (light_take_token() == 0u) {\n" +
    "        return 0u;\n" +
    "    }\n" +
    "    light_fire_work = light_burst_left[light_slot];\n" +
    "    if (light_fire_work == 0u) {\n" +
    "        light_fire_work = LIGHT_FIELD(ENEMY_ARCHETYPE_FIELD_BURST_COUNT);\n" +
    "    }\n" +
    "    --light_fire_work;\n" +
    "    light_burst_left[light_slot] = light_fire_work;\n" +
    "    if (light_fire_work != 0u) {\n" +
    "        light_fire_work = LIGHT_FIELD(ENEMY_ARCHETYPE_FIELD_BURST_INTERVAL);\n" +
    "        light_fire_timer[light_slot] = light_fire_work;\n" +
    "    } else {\n" +
    "        light_reload();\n" +
    "    }\n",
  to:
    "    /* Variant R: an Interceptor fires only in the player's column. */\n" +
    "    if (light_record != LIGHT_OFFSET_WINGMAN &&\n" +
    "        light_x[light_slot] != light_target_x) {\n" +
    "        return 0u;\n" +
    "    }\n" +
    "    if (light_take_token() == 0u) {\n" +
    "        return 0u;\n" +
    "    }\n" +
    "    /* Every Light record fires single shots (burst 1), so a shot is a\n" +
    "     * reload; light_burst_left is the Interceptor's age. */\n" +
    "    light_reload();\n",
};

// The window's code grows, so the Light kernel after it moves, and with it the
// one boss-entry pin in the kernel link's last segment.
const kernelPin = (address) => ({
  file: "src/hybrid/boss-entry-pins.inc",
  from: "pin_boss_enter_hud_backup        = $B82D   ; kernel\n",
  to: `pin_boss_enter_hud_backup        = $${address.toString(16).toUpperCase()}   ; kernel\n`,
});

// Variant R's window budget: the window's boot-loaded record has 14 packed
// bytes before a twelfth sector, which the owner's transport rule forbids.
// Two small sector-flow verdicts - the field test and the early end, run on
// world-row ticks of a space sector only - move from the window's last
// segment to DIRECTOR_C_LOW, the resident low Director code with a free tail,
// and the afterCleared gate to the arena (HYBRID_C_ARENA), resident too.
const pragmaBefore = (signature, segment) => ({
  file: "src/c/director.c",
  from: `${signature}\n`,
  to: `#pragma code-name ("${segment}")\n${signature}\n`,
});
const flowToLow = [
  pragmaBefore("static uint8_t field_busy(void)", "DIRECTOR_C_LOW"),
  pragmaBefore("static void director_c_arm_wave(void)", "HYBRID_C_ARENA"),
  pragmaBefore("static void director_c_sector_spent(void)", "DIRECTOR_C_LOW"),
  pragmaBefore("static void director_c_sector_cut(void)", "HYBRID_C_WINDOW_FLOW"),
];

export const INTERCEPTOR_VARIANTS = Object.freeze({
  s: {
    summary: "slower chase - horizontal tracking at half the player's top speed",
    edits: [sTrack],
  },
  r: {
    summary: "standoff - dives to a standoff above the player, backs off, fires only when aligned, leaves upward",
    edits: [rDefines(STANDOFF), rMotion, escortColumnAdd, rFire, ...flowToLow, kernelPin(0xB81C)],
  },
});

export function parseInterceptorVariant(argv) {
  const argument = argv.find((value) => value.startsWith("--interceptor-variant="));
  if (argument === undefined) return null;
  const id = argument.slice("--interceptor-variant=".length).toLowerCase();
  if (!Object.hasOwn(INTERCEPTOR_VARIANTS, id)) {
    throw new Error(`Unknown Interceptor variant ${id}; expected one of ` +
      `${Object.keys(INTERCEPTOR_VARIANTS).join(", ")}`);
  }
  return id;
}

// Wraps fs.readFileSync so the variant's files read back edited. Every edit
// must match exactly once and be consumed, or the variant is not what its
// name says.
export function installInterceptorVariant(rootDirectory, id) {
  const variant = INTERCEPTOR_VARIANTS[id];
  const byFile = new Map();
  for (const edit of variant.edits) {
    const absolute = path.resolve(rootDirectory, edit.file);
    if (!byFile.has(absolute)) byFile.set(absolute, []);
    byFile.get(absolute).push(edit);
  }
  const consumed = new Set();
  const original = fs.readFileSync;
  fs.readFileSync = function readFileSyncWithInterceptorVariant(file, options) {
    const result = original.call(fs, file, options);
    if (typeof file !== "string" && !(file instanceof URL)) return result;
    const absolute = path.resolve(file instanceof URL ? file.pathname : file);
    const edits = byFile.get(absolute);
    if (edits === undefined) return result;
    let text = Buffer.isBuffer(result) ? result.toString("utf8") : result;
    for (const edit of edits) {
      const at = text.indexOf(edit.from);
      if (at < 0 || text.indexOf(edit.from, at + 1) >= 0) {
        throw new Error(`Interceptor variant ${id}: an edit of ${edit.file} does not match exactly once`);
      }
      text = text.slice(0, at) + edit.to + text.slice(at + edit.from.length);
    }
    consumed.add(absolute);
    return Buffer.isBuffer(result) ? Buffer.from(text, "utf8") : text;
  };
  return {
    summary: variant.summary,
    assertConsumed() {
      for (const absolute of byFile.keys()) {
        if (!consumed.has(absolute)) {
          throw new Error(`Interceptor variant ${id}: the build never read ${path.relative(rootDirectory, absolute)}`);
        }
      }
    },
  };
}
