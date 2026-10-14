// MEASUREMENT ONLY. Not part of the build or the test suite.
// fix/interceptor-speed (docs/plans/interceptor-speed.md): the catch table.
//
// Drives production main-loop frames on the linked build in build/ (or
// build/<VS65_HARNESS_BUILD>/) with scripts/measure-population-harness.mjs.
// An Interceptor is admitted by the production admission, flies its own tick,
// and at the chosen moment of a flight phase one player shot is put into a
// free PairShot slot exactly as allocate_player_fighter_projectile_at_slot
// spawns it (x = player_x + 8, y = player_y - 2, lifetime $FF). The frame's
// own projectile update and light_shot then move it and resolve the hit.
//
// "From directly below": the player is teleported, on the fire frame only, to
// the x whose shot passes through the Interceptor's centre (light_x + 4), so
// the shot's line is the best one the player can choose. Where the phase
// tracks the player (descent, hold, back-off), the Interceptor reacts to that
// move exactly as it does in play. A second column, "parked", fires from where
// the player already is (the column the Interceptor has converged on).
//
// Usage: node scripts/measure-interceptor-catch.mjs [--difficulty=0|1|2]
//        [--player-y=N] [--json]
import { boot, frame, L } from "./measure-population-harness.mjs";

const args = new Map(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const DIFFICULTY = Number(args.get("difficulty") ?? 1);
const PLAYER_Y = Number(args.get("player-y") ?? 225);   // PLAYER_Y_MAX: the standoff's lowest
const PLAYER_X = 124;
const OFFSET_INTERCEPTOR = 24;
const LIGHT_SLOT_COUNT = 4;
const MAX_SECTORS = 10;
const SHOT_SLOTS = 5;
// The standoff's frames (INTERCEPTOR_LIFE_FRAMES): a review variant built with
// --interceptor-speed=custom names its own in VS65_INTERCEPTOR_SPEED.
const LIFE = JSON.parse(process.env.VS65_INTERCEPTOR_SPEED ?? "{}").life ?? Number(args.get("life") ?? 100);

function call(m, name) {
  const stop = 0x7fff;
  m.cpu.push((stop - 1) >> 8);
  m.cpu.push((stop - 1) & 0xff);
  m.cpu.pc = L(name);
  for (let steps = 0; steps < 400_000 && m.cpu.pc !== stop; steps += 1) m.cpu.step();
  if (m.cpu.pc !== stop) throw new Error(`${name} did not return`);
}

const at = (m, name, i = 0) => m.memory[L(name) + i];
const put = (m, name, value, i = 0) => { m.memory[L(name) + i] = value & 0xff; };
const liveCount = (m) => [0, 1, 2, 3].filter((s) => at(m, "light_state", s) !== 0).length;

// tests/interceptor-armour.test.mjs's production admission, `count` slots.
function admit(m, count, loops) {
  for (let row = 0; row < 4; row += 1) put(m, "_subtype_ceiling_light", count, row);
  for (let sector = 0; sector < MAX_SECTORS; sector += 1) {
    const caps = at(m, "_sector_caps", sector);
    put(m, "_sector_caps", (caps & 0xf0) | count, sector);
  }
  put(m, "_light_token_budget", LIGHT_SLOT_COUNT + 1);
  let guard = 0;
  while (liveCount(m) < count) {
    put(m, "_heavy_escort_offset", OFFSET_INTERCEPTOR);
    put(m, "_heavy_wave_flags", loops << 6);
    call(m, "enemy_recycle");
    call(m, "enemy_spawn_raiders");
    park(m);
    frame(m);
    if ((guard += 1) >= 96) throw new Error(`could not admit ${count}`);
  }
  put(m, "_light_token_budget", 1);
  for (let s = 0; s < count; s += 1) {
    put(m, "_light_loops", loops << 6, s);
    // Armour off for the measurement: a hit is a hit, the slot stays live so
    // the next moment can be measured on the same flight (light_hp restored).
    put(m, "light_hp", 3, s);
  }
}

// The admission spawns the Raider pair the Interceptor escorts (elite (a)'s
// path); their pulse shots fill the hostile pool and block the laser, and
// they absorb player shots. The Interceptor flies alone: the Heavy members
// leave on the first frame (PMG players, no screen cells to restore) and any
// hostile shot that is not a Light's LASER ($16) is freed every frame.
function quiet(m) {
  put(m, "ENEMY_ACTIVE", 0);
  put(m, "ENEMY_MEMBER_STATE", 0, 0);
  put(m, "ENEMY_MEMBER_STATE", 0, 1);
  for (let i = SHOT_SLOTS; i < SHOT_SLOTS + 5; i += 1) {
    if (at(m, "FIGHTER_PROJECTILE_ACTIVE", i) !== 0x16) put(m, "FIGHTER_PROJECTILE_ACTIVE", 0, i);
  }
}

let parkX = PLAYER_X;
let parkY = PLAYER_Y;
function park(m) {
  quiet(m);
  put(m, "player_x", parkX);
  put(m, "player_y", parkY);
}

const shotsFree = (m) => {
  for (let i = 0; i < SHOT_SLOTS; i += 1) put(m, "FIGHTER_PROJECTILE_ACTIVE", 0, i);
};

function spawnShot(m) {
  const x = Math.min(at(m, "player_x") + 8, 48 + 40 * 4 - 1);
  const y = (at(m, "player_y") - 2) & 0xff;
  put(m, "FIGHTER_PROJECTILE_ACTIVE", 1, 0);
  put(m, "FIGHTER_PROJECTILE_X", x, 0);
  put(m, "FIGHTER_PROJECTILE_Y", y, 0);
  put(m, "FIGHTER_PROJECTILE_PREV_Y", y, 0);
  put(m, "FIGHTER_PROJECTILE_LIFETIME", 0xff, 0);
}

// Phase of a slot from its age byte and motion.
function phaseOf(m, slot, prevY) {
  const age = at(m, "_light_burst_left", slot);
  const y = at(m, "light_y", slot);
  const loops = at(m, "_light_loops", slot) & 0xc0;
  if (age < LIFE) {
    if (prevY === null) return "entry";
    if (y > prevY) return "descent";
    if (y < prevY) return "backoff";
    return "hold";
  }
  if (loops === 0) return "exit-climb";
  if (y < prevY) return "loop-climb";
  return "top-hold";
}

// One flight of `slot` among `count` Interceptors; at the first frame of each
// wanted phase (or `delay` frames into it) fire one shot from below it and
// follow that shot to a hit, its loss, or the Light's retirement.
function measure({ count, slot, loops, phase, delay = 0, aim = "below", backoff = false }) {
  const m = boot({ difficulty: DIFFICULTY });
  parkX = PLAYER_X;
  parkY = PLAYER_Y;
  admit(m, count, loops);
  let prevY = null;
  let seen = 0;
  let lastPhase = null;
  let loopIndex = 0;
  for (let f = 0; f < 1200; f += 1) {
    if (at(m, "light_state", slot) === 0) return { result: "phase not reached" };
    const ph = phaseOf(m, slot, prevY);
    if (ph === "loop-climb" && lastPhase !== "loop-climb" && lastPhase !== null) loopIndex += 1;
    lastPhase = ph;
    // A player climbing close starts the back-off: one line a frame upward.
    if (backoff && (ph === "hold" || ph === "backoff") && parkY > 120) parkY -= 1;
    if (ph === phase) {
      if (seen === delay) {
        const lightX = at(m, "light_x", slot);
        const lightY = at(m, "light_y", slot);
        if (aim === "below") parkX = Math.max(48, lightX - 4);
        park(m);
        shotsFree(m);
        // The other slots leave: a stacked swarm's lower Interceptor would
        // take a shot meant for this one (the first slot owning the cell wins).
        for (let other = 0; other < count; other += 1) {
          if (other !== slot) put(m, "light_state", 0, other);
        }
        const hpBefore = at(m, "light_hp", slot);
        spawnShot(m);
        const startY = at(m, "FIGHTER_PROJECTILE_Y");
        const trace = [];
        for (let t = 1; t <= 60; t += 1) {
          frame(m);
          park(m);
          const hit = at(m, "light_hp", slot) < hpBefore || at(m, "light_state", slot) >= 3;
          const shot = at(m, "FIGHTER_PROJECTILE_ACTIVE");
          trace.push({ t, ly: at(m, "light_y", slot), lx: at(m, "light_x", slot),
            sy: at(m, "FIGHTER_PROJECTILE_Y"), shot });
          if (hit) {
            return { result: "HIT", frames: t, fireY: lightY, fireX: lightX, hitY: at(m, "light_y", slot),
              shotStartY: startY, px: parkX };
          }
          if (shot === 0) {
            return { result: "MISS (shot spent)", frames: t, fireY: lightY, fireX: lightX,
              lightY: at(m, "light_y", slot), lightX: at(m, "light_x", slot),
              lightState: at(m, "light_state", slot), shotStartY: startY, px: parkX, trace };
          }
        }
        return { result: "MISS (timeout)", fireY: lightY, trace };
      }
      seen += 1;
    }
    prevY = at(m, "light_y", slot);
    park(m);
    frame(m);
  }
  return { result: "phase not reached in 1200 frames" };
}

// The flight with no shot: per slot its life (admission to retirement), the
// frames it hovers in its standoff band before it climbs, each top-hold's
// frames, the frames of every climb, and its lasers. The player is parked in
// its column at PLAYER_Y, kept alive (health refilled every frame).
const PLAYER_HEALTH = 0x4e5d;   // BROAD_PLAYER_HEALTH = BROAD_DAMAGE_COOLDOWN - 1
function flight({ count, loops }) {
  const m = boot({ difficulty: DIFFICULTY });
  parkX = PLAYER_X;
  parkY = PLAYER_Y;
  admit(m, count, loops);
  const slots = Array.from({ length: count }, () => ({ life: 0, holdStandoff: 0, topHolds: [], climbs: [],
    lasers: 0, phase: null, run: 0, prevY: null, done: false }));
  const laserSeen = new Set();
  for (let f = 0; f < 2000; f += 1) {
    m.memory[PLAYER_HEALTH] = 10;
    for (let s = 0; s < count; s += 1) {
      const st = slots[s];
      if (st.done) continue;
      if (at(m, "light_state", s) === 0) { st.done = true; close(st); continue; }
      st.life += 1;
      const ph = phaseOf(m, s, st.prevY);
      if (ph !== st.phase) { close(st); st.phase = ph; st.run = 0; }
      st.run += 1;
      if (ph === "hold") st.holdStandoff += 1;
      st.prevY = at(m, "light_y", s);
    }
    // A Light's LASER is ACTIVE $16 in the hostile slots 5-9; count arrivals.
    for (let i = 5; i < 10; i += 1) {
      const a = at(m, "FIGHTER_PROJECTILE_ACTIVE", i);
      if (a === 0x16 && !laserSeen.has(i)) { laserSeen.add(i); slots[0].lasers += 1; }
      if (a !== 0x16) laserSeen.delete(i);
    }
    if (slots.every((st) => st.done)) break;
    park(m);
    frame(m);
  }
  return slots.map(({ life, holdStandoff, topHolds, climbs, lasers }) => ({ life, holdStandoff, topHolds, climbs, lasers }));
  function close(st) {
    if (st.phase === "top-hold") st.topHolds.push(st.run);
    if (st.phase === "loop-climb" || st.phase === "exit-climb") st.climbs.push(`${st.phase}:${st.run}`);
  }
}

const scenarios = [
  { name: "entry descent (first visible frame +2)", phase: "descent", delay: 14 },
  { name: "standoff hold (first frame)", phase: "hold" },
  { name: "back-off (first frame, player climbing)", phase: "backoff", backoff: true },
  { name: "loop climb to the top-hold (first frame)", phase: "loop-climb", loops: 2 },
  { name: "top-hold (first frame)", phase: "top-hold", loops: 2 },
  { name: "exit climb (first frame), escort", phase: "exit-climb", loops: 0 },
  { name: "exit climb (first frame), after 2 loops", phase: "exit-climb", loops: 2 },
];

const rows = [];
for (const count of [1, 3]) {
  for (let slot = 0; slot < count; slot += 1) {
    if (count === 3 && slot === 0) continue;
    for (const s of scenarios) {
      for (const aim of ["below", "parked"]) {
        const r = measure({ count, slot, loops: s.loops ?? 0, phase: s.phase, delay: s.delay ?? 0,
          aim, backoff: s.backoff ?? false });
        rows.push({ slot, count, scenario: s.name, aim, ...r });
      }
    }
  }
}

if (args.get("flight")) {
  const out = {
    escort: flight({ count: 1, loops: 0 }),
    swarm1: flight({ count: 1, loops: 2 }),
    swarm3: flight({ count: 3, loops: 2 }),
  };
  console.log(JSON.stringify(out));
  process.exit(0);
}

if (args.get("json")) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.log(`difficulty ${DIFFICULTY}, player y ${PLAYER_Y}`);
  for (const r of rows) {
    const where = r.fireY === undefined ? "" : `light (${r.fireX},${r.fireY})`;
    const out = r.result === "HIT" ? `HIT in ${r.frames} f at y ${r.hitY}` :
      `${r.result}${r.frames ? ` after ${r.frames} f` : ""}${r.lightY !== undefined ? `, light then (${r.lightX},${r.lightY}) state ${r.lightState}` : ""}`;
    console.log(`slot ${r.slot}/${r.count} ${r.scenario.padEnd(44)} ${r.aim.padEnd(6)} ${where.padEnd(16)} ${out}`);
  }
}
