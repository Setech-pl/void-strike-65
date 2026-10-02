// MEASUREMENT ONLY. Not part of the build, the trace or the test suite.
// Per-member Heavy costs on the linked bytes in build/, with the JS NMOS-6502
// core: what one Raider or Bomber member costs on a frame where its Y moved,
// on a frame where it held (Option D skips the P1/P2 body copy), on a
// non-lethal hit frame and on a kill frame; update_enemy for the formation
// with both members moving, one held and both held; and today's Light tick per
// live member, which is what a wave path replaces.
//
// It is the measurement docs/plans/m3-waves-heavy.md §1.1 rests on. Run it on
// `main` before a Heavy or Light-motion change and again after, from the same
// harness state, and compare the figures; do not diff trace CSVs frame by
// frame between builds. It supersedes scripts/measure-heavy-body-copy-skip.mjs,
// which pokes a scheduler byte roadmap 4.6 step 2 retired.
//
// Needs a linked build in build/ (the default build, or build:candidate).
//
//   node scripts/measure-heavy-member-costs.mjs
import { machine, run, L } from "./measure-population-harness.mjs";

const FRAME_COUNTER = 0x86;
const PLAYER_X = 0x80;
const HEAVY = [["Raider", 0], ["Bomber", 36]];   // byte offsets into enemy_archetypes
const MEMBER = ["heavy_member_update", "draw_enemy_member", "erase_enemy_departing_row"];
const KILL = ["_enemy_c_apply_pending_damage", "erase_enemy_member",
  "_enemy_c_heavy_breakup_claim", "spawn_interceptor_breakup_effects",
  "add_archetype_score_tail", "play_hit_sound"];

const stats = (values) => values.length === 0 ? "n=0"
  : `n=${String(values.length).padStart(4)} mean=${(values.reduce((a, b) => a + b, 0) /
    values.length).toFixed(1).padStart(7)} min=${String(Math.min(...values)).padStart(5)} ` +
    `max=${String(Math.max(...values)).padStart(5)}`;

// The production spawn path: director_init, the armed wave's archetype, then
// reset_enemy (which asks C for the formation and ends with the forced draw).
function formation(offset, { difficulty = 2 } = {}) {
  const m = machine({ difficulty });
  for (let row = 0; row < 27; row += 1) {
    const address = 0x8140 + row * 40;
    m.memory[L("PLAYFIELD_ROW_LO") + row] = address & 0xff;
    m.memory[L("PLAYFIELD_ROW_HI") + row] = address >> 8;
  }
  m.memory.fill(0, 0x3d00, 0x3f00);            // start_gameplay's clear_pmg
  const call = (name, watch = []) => {
    m.cpu.push(0x7f); m.cpu.push(0xfe); m.cpu.a = 0;
    return run(m.cpu, L(name), [0x7fff], { maxSteps: 2_000_000, watch });
  };
  m.cpu.push(0x7f); m.cpu.push(0xfe); m.cpu.a = 0x6d;
  run(m.cpu, L("director_init"), [0x7fff], { maxSteps: 2_000_000 });
  if (offset !== null) {
    m.memory[L("_heavy_archetype_offset")] = offset;
    m.memory[L("_heavy_escort_offset")] = 0xff;   // no Light escort
    call("reset_enemy");
  }
  return { m, call };
}

console.log("== (1) per member, by whether its Y moved this frame (whole formation life)");
for (const [name, offset] of HEAVY) {
  const { m, call } = formation(offset);
  const Y = L("ENEMY_Y"), STATE = L("ENEMY_MEMBER_STATE");
  const per = { moved: {}, held: {} };
  const formationCost = { "both moved": [], "one held": [], "both held": [] };
  let frames = 0;
  for (let f = 0; f < 900; f += 1) {
    m.memory[FRAME_COUNTER] = f & 0xff;
    const state = [m.memory[STATE], m.memory[STATE + 1]];
    if (state[0] === 0 && state[1] === 0) break;
    const y = [m.memory[Y], m.memory[Y + 1]];
    const result = call("update_enemy", MEMBER);
    const live = [0, 1].filter((slot) => state[slot] !== 0);
    const kinds = live.map((slot) => (m.memory[Y + slot] === y[slot] ? "held" : "moved"));
    for (const routine of MEMBER) {
      (result.samples.get(routine) ?? []).forEach((cycles, index) => {
        if (kinds[index]) (per[kinds[index]][routine] ??= []).push(cycles);
      });
    }
    if (live.length === 2) {
      const held = kinds.filter((kind) => kind === "held").length;
      formationCost[["both moved", "one held", "both held"][held]].push(result.cycles);
    }
    frames += 1;
  }
  console.log(`${name}: ${frames} frames from spawn to retirement`);
  for (const kind of ["moved", "held"]) {
    for (const routine of MEMBER) {
      console.log(`  ${kind.padEnd(5)} ${routine.padEnd(26)} ${stats(per[kind][routine] ?? [])}`);
    }
  }
  for (const [label, values] of Object.entries(formationCost)) {
    console.log(`  update_enemy, two live, ${label.padEnd(10)} ${stats(values)}`);
  }
}

console.log("\n== (2) hit frame and kill frame (resolve_enemy_damage, member 0, on screen)");
for (const [name, offset] of HEAVY) {
  for (const [label, hp] of [["non-lethal hit", 3], ["kill, one member left", 1]]) {
    const { m, call } = formation(offset);
    for (let f = 0; f < 120; f += 1) { m.memory[FRAME_COUNTER] = f; call("update_enemy"); }
    m.memory[FRAME_COUNTER] = 121;
    m.memory[L("ENEMY_HP")] = hp;
    m.memory[L("ENEMY_PENDING_DAMAGE")] = 1;
    m.memory[L("ENEMY_PENDING_SOURCE")] = 1;      // DAMAGE_PLAYER_CONTACT (a shot kill is 0 and 32 cycles dearer)
    const result = call("resolve_enemy_damage", KILL);
    const parts = [...result.samples].map(([routine, v]) => `${routine}=${v.join("/")}`);
    console.log(`${name} ${label}: ${result.cycles} cycles  ${parts.join(" ")}`);
    m.memory[FRAME_COUNTER] = 122;
    const next = call("update_enemy", MEMBER);
    console.log(`   update_enemy on the next frame: ${next.cycles}`);
  }
}

console.log("\n== (3) today's Light tick, one live slot (_enemy_c_light_tick, JSR..RTS)");
{
  const { m, call } = formation(null);
  const tick = (label, { archetype, y, x, playerX = 124, fire = 50, frame = 1 }) => {
    m.memory[FRAME_COUNTER] = frame;
    m.memory[PLAYER_X] = playerX;
    m.memory[L("_light_slot")] = 0;
    m.memory[L("_light_state")] = 2;              // LIGHT_ACTIVE_FREE
    m.memory[L("_light_archetype")] = archetype;
    m.memory[L("_light_y")] = y;
    m.memory[L("_light_x")] = x;
    m.memory[L("_light_fire_timer")] = fire;
    m.memory[L("_light_burst_left")] = 0;
    m.memory[L("_light_code")] = 0xf8;
    m.memory[L("_light_hp")] = 1;
    m.memory[L("_light_pair_key")] = archetype;   // look installed: no install event
    m.memory[L("_light_appearance_installed")] = archetype;
    const result = call("_enemy_c_light_tick");
    console.log(`  ${label.padEnd(46)} ${String(result.cycles).padStart(4)} cycles`);
  };
  tick("Wingman, free flight", { archetype: 12, y: 60, x: 100 });
  tick("Interceptor, non-tracking frame", { archetype: 24, y: 60, x: 100 });
  tick("Interceptor, tracking frame, already aligned", { archetype: 24, y: 62, x: 124 });
  tick("Interceptor, tracking frame, steps right", { archetype: 24, y: 62, x: 100, playerX: 160 });
  tick("Interceptor, tracking frame, steps left", { archetype: 24, y: 62, x: 160, playerX: 60 });
  tick("Wingman, free flight, fires", { archetype: 12, y: 60, x: 100, fire: 0, frame: 9 });
  tick("Interceptor, non-tracking frame, fires", { archetype: 24, y: 60, x: 100, fire: 0, frame: 10 });
}
