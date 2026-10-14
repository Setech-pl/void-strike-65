// fix/interceptor-speed (docs/plans/interceptor-speed.md): the Interceptor's
// review variants - every Interceptor catchable by a player shot in every
// phase of its flight. Phase A builds them here as in-memory source edits;
// nothing under src/ or assets/ changes on disk, and a variant owns
// build/interceptor-speed-<id>[-level-N-sM]/ like every review variant. The
// default build reads none of this.
//
// A variant is a set of parameters over the shared behaviour (decision AD):
//   climb    lines a frame of the on-screen climbs - to the top-hold row and
//            the exit (main: 8; the player's shot climbs 6)
//   life     the standoff's frames before it climbs (main: 100)
//   dive     lines a frame of the descent to the standoff, from the entry and
//            from the top-hold (main: 2); toward the player
//   topStep  the top phase's age step: the phase lasts (256 - life) / topStep
//            frames, which must divide exactly (main: 4, 39 frames)
//   align    the column it tracks is the ship's centre, (player_x + 6) & $FC,
//            instead of its left edge, player_x & $FC (the player's shot
//            leaves at player_x + 8; the Light's hitbox is [x, x + 8))
//   retire   the exit retires the slot when it leaves the visible playfield
//            (y < 24, the first drawn line) instead of flying on unseen
//   track    the column tracking's FRAME_COUNTER gate while holding: "half"
//            (one cell every 4th frame while it hovers, the descent keeps
//            every 2nd), "3/4" (3 cells in 8 frames while it hovers)
//   reload   the record's reload per difficulty [E, M, H] (data; main 56/44/32)
//   pad      the unexecuted pad at the end of the window's Director half
//            (src/hybrid/c-asm-abi.s; main 4): growth there would move the
//            Light kernel off $B478, so the pad gives the bytes back
//   kernelShift  when the growth is more than the pad, the kernel moves: its
//            two boss-entry pins (src/hybrid/boss-entry-pins.inc) move with it
//
// VS65_INTERCEPTOR_SPEED='{"climb":3,...}' with --interceptor-speed=custom
// builds an ad-hoc parameter set for the Phase A sweep.

import fs from "node:fs";
import path from "node:path";

const LIFECYCLE = "src/c/lifecycle.c";

const define = (name, value) => ({
  file: LIFECYCLE,
  transform(text) {
    const pattern = new RegExp(`(#define ${name}\\s+)\\d+u`);
    if (!pattern.test(text)) throw new Error(`interceptor speed: no #define ${name}`);
    return text.replace(pattern, `$1${value}u`);
  },
});

const replace = (from, to) => ({
  file: LIFECYCLE,
  transform(text) {
    if (!text.includes(from)) throw new Error(`interceptor speed: the source has no "${from.trim().slice(0, 60)}..."`);
    return text.replace(from, to);
  },
});

const ALIGN_FROM = "light_target_x = (uint8_t)(PLAYER_X & 0xFCu);";
const ALIGN_TO = "light_target_x = (uint8_t)((uint8_t)(PLAYER_X + (uint8_t)(LIGHT_CENTRE_OFFSET + LIGHT_ROUND)) & 0xFCu);";

const RETIRE_FROM = `                if (light_tick_result == 0u) {
                    light_work = (uint8_t)(light_work - INTERCEPTOR_CLIMB);
                } else {`;
const RETIRE_TO = `                if (light_tick_result == 0u) {
                    light_work = (uint8_t)(light_work - INTERCEPTOR_CLIMB);
                    if (light_work < LIGHT_FIRE_TOP) {
                        light_work = LIGHT_RETIRE_Y;
                    }
                } else {`;

const TRACK_FROM = "if ((FRAME_COUNTER & INTERCEPTOR_TRACK_DIVE) == 0u) {";
const TRACK_TO = {
  // light_scratch still holds the player's distance below (less the slot's
  // rows): under FAR it hovers. The descent keeps every 2nd frame.
  half: "if ((FRAME_COUNTER & (light_scratch >= INTERCEPTOR_STANDOFF_FAR ? 1u : 3u)) == 0u) {",
  "3/4": "if ((FRAME_COUNTER & INTERCEPTOR_TRACK_DIVE) == 0u &&\n" +
    "                    (light_scratch >= INTERCEPTOR_STANDOFF_FAR || (FRAME_COUNTER & 6u) != 6u)) {",
};

function editsFor(params) {
  const edits = [];
  if (params.climb !== undefined) edits.push(define("INTERCEPTOR_CLIMB", params.climb));
  if (params.life !== undefined) edits.push(define("INTERCEPTOR_LIFE_FRAMES", params.life));
  if (params.dive !== undefined) edits.push(define("INTERCEPTOR_DIVE", params.dive));
  if (params.topStep !== undefined) edits.push(define("INTERCEPTOR_TOP_STEP", params.topStep));
  const life = params.life ?? 100;
  const step = params.topStep ?? 4;
  if ((256 - life) % step !== 0) {
    throw new Error(`interceptor speed: (256 - life ${life}) is not a multiple of topStep ${step} - the age would not wrap to 0`);
  }
  if (params.align) edits.push(replace(ALIGN_FROM, ALIGN_TO));
  if (params.retire) edits.push(replace(RETIRE_FROM, RETIRE_TO));
  if (params.track !== undefined) {
    if (!Object.hasOwn(TRACK_TO, params.track)) throw new Error(`interceptor speed: track ${params.track}`);
    edits.push(replace(TRACK_FROM, TRACK_TO[params.track]));
  }
  if (params.reload !== undefined) edits.push(reloadEdit(params.reload));
  if (params.pad !== undefined && params.pad !== 4) {
    edits.push({
      file: "src/hybrid/c-asm-abi.s",
      transform(text) {
        const from = "; a page (MEASURED from the listings and maps: at $B474, without the pad,";
        const at = text.indexOf(from);
        const pad = text.indexOf("    .res 4, $00", at);
        if (at < 0 || pad < 0) throw new Error("interceptor speed: the window pad was not found");
        return `${text.slice(0, pad)}${params.pad === 0 ? "" : `    .res ${params.pad}, $00`}${text.slice(pad + 15)}`;
      },
    });
  }
  if (params.kernelShift) {
    edits.push({
      file: "src/hybrid/boss-entry-pins.inc",
      transform(text) {
        return text.replace(/^(pin_boss_(?:enter_read|warning_records)\s+= \$)([0-9A-F]{4})/gm,
          (_, head, hex) => `${head}${(Number.parseInt(hex, 16) + params.kernelShift).toString(16).toUpperCase()}`);
      },
    });
  }
  return edits;
}

// The Interceptor record's reload per difficulty lives in the archetype table
// (src/c/lifecycle.c, the record after ENEMY_MOVEMENT_INTERCEPTOR_PURSUIT).
function reloadEdit([easy, medium, hard]) {
  return {
    file: LIFECYCLE,
    transform(text) {
      const pattern = /(ENEMY_MOVEMENT_INTERCEPTOR_PURSUIT,\s*ENEMY_FIRE_LIGHT_DOUBLE_TAP,\s*1u, 0u,\s*)56u, 44u, 32u,/;
      if (!pattern.test(text)) throw new Error("interceptor speed: the Interceptor record's reload row was not found");
      return text.replace(pattern, `$1${easy}u, ${medium}u, ${hard}u,`);
    },
  };
}

// The floor fit (plan §3): a catchable exit from the lowest standoff takes 58
// frames at 3 lines a frame, so the escort's life (hover + exit) stays under
// the escort clock's 128-frame floor only with a 64-frame hover; the entry and
// loop dive at 4 lines a frame keeps a hover over a low player, the top phase
// (256 - 64) / 3 = 64 frames keeps a top-hold after the slower climb, and the
// reload keeps 1 / 2 / 3 lasers a visit inside the shorter hover.
const FLOOR_FIT = { climb: 3, dive: 4, life: 64, topStep: 3, reload: [56, 31, 20] };

export const INTERCEPTOR_SPEED_VARIANTS = Object.freeze({
  v1: {
    summary: "centred on the ship's column, on-screen climbs 3 lines a frame, the floor fit (dive 4, hover 64, top phase 64, reload 56/31/20)",
    params: { align: true, ...FLOOR_FIT, pad: 1 },
  },
  v2: {
    summary: "v1 plus tracking at 3/4 of the player's speed while it hovers",
    params: { align: true, ...FLOOR_FIT, track: "3/4", pad: 0, kernelShift: 14 },
  },
});

export function parseInterceptorSpeedVariant(argv) {
  const argument = argv.find((value) => value.startsWith("--interceptor-speed="));
  if (argument === undefined) return null;
  const id = argument.slice("--interceptor-speed=".length).toLowerCase();
  if (id === "custom") return id;
  if (!Object.hasOwn(INTERCEPTOR_SPEED_VARIANTS, id)) {
    throw new Error(`Unknown interceptor speed variant ${id}; expected custom or one of ` +
      `${Object.keys(INTERCEPTOR_SPEED_VARIANTS).join(", ")}`);
  }
  return id;
}

export function interceptorSpeedParams(id) {
  if (id !== "custom") return INTERCEPTOR_SPEED_VARIANTS[id].params;
  const json = process.env.VS65_INTERCEPTOR_SPEED;
  if (json === undefined) throw new Error("--interceptor-speed=custom needs VS65_INTERCEPTOR_SPEED='{...}'");
  return JSON.parse(json);
}

// Wraps fs.readFileSync so the variant's files read back edited, as
// scripts/boss-escort-variants.mjs does. Every edit must be consumed.
export function installInterceptorSpeedVariant(rootDirectory, id) {
  const params = interceptorSpeedParams(id);
  const edits = editsFor(params);
  const byFile = new Map();
  for (const edit of edits) {
    const absolute = path.resolve(rootDirectory, edit.file);
    if (!byFile.has(absolute)) byFile.set(absolute, []);
    byFile.get(absolute).push(edit);
  }
  const consumed = new Set();
  const original = fs.readFileSync;
  fs.readFileSync = function readFileSyncWithInterceptorSpeed(file, options) {
    const result = original.call(fs, file, options);
    if (typeof file !== "string" && !(file instanceof URL)) return result;
    const absolute = path.resolve(file instanceof URL ? file.pathname : file);
    const fileEdits = byFile.get(absolute);
    if (fileEdits === undefined) return result;
    let text = Buffer.isBuffer(result) ? result.toString("utf8") : result;
    for (const edit of fileEdits) text = edit.transform(text);
    consumed.add(absolute);
    return Buffer.isBuffer(result) ? Buffer.from(text, "utf8") : text;
  };
  return {
    summary: id === "custom" ? `custom ${JSON.stringify(params)}` : INTERCEPTOR_SPEED_VARIANTS[id].summary,
    assertConsumed() {
      for (const absolute of byFile.keys()) {
        if (!consumed.has(absolute)) {
          throw new Error(`interceptor speed ${id}: the build never read ${path.relative(rootDirectory, absolute)}`);
        }
      }
    },
  };
}
