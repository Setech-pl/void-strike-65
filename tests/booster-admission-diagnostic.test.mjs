import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502, nmos6502Flags } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const labels = new Map();
for (const file of ["build/void-strike-65.lbl", "build/encounter-director.lbl",
  "build/integration-glue.lbl"]) {
  for (const line of fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match) labels.set(match[2], Number.parseInt(match[1], 16));
  }
}

function memory() {
  const image = new Uint8Array(0x10000);
  installRuntimeSegments(image, root);
  return image;
}

function run(image, label, { a = 0, x = 0, y = 0 } = {}) {
  const cpu = new Nmos6502(image);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = labels.get(label);
  cpu.a = a; cpu.x = x; cpu.y = y;
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${label} did not return`);
  return { carry: (cpu.p & nmos6502Flags.carry) !== 0, cycles: cpu.cycles };
}

const director = {
  phase: 0x80f6, intensity: 0x80f8, reaction: 0x80f9, recovery: 0x80fa,
  rng: 0x80fb, flags: 0x80fe, admissionFrame: 0x80ff,
};

function prepareDirector(image, frame = 42) {
  image[labels.get("DIFFICULTY_SETTING")] = 2;
  image[labels.get("PLAYER_LIFECYCLE")] = 0;
  image[labels.get("frame_counter")] = frame;
  run(image, "director_init", { a: 0x6d });
  image[director.phase] = 3;
  image[director.intensity] = 1;
  image[director.reaction] = 0;
  image[director.recovery] = 0;
  image[director.flags] = 0;
  image[director.admissionFrame] = frame - 1;
}

test("every third idle-slot qualifying kill creates one deterministic pending capsule", () => {
  const image = memory();
  const state = labels.get("ENTITY_STATE");
  const hp = labels.get("ENTITY_HP");
  const timer = labels.get("ENTITY_TIMER");
  const type = labels.get("ENTITY_TYPE");
  const y = labels.get("ENTITY_Y");
  run(image, "init_entity_effects");
  prepareDirector(image);
  const rng = image[director.rng];
  run(image, "weapon_pickup_record_qualified_kill");
  run(image, "weapon_pickup_record_qualified_kill");
  assert.equal(image[state + 1], 0);
  assert.equal(image[hp + 1], 2);
  run(image, "weapon_pickup_record_qualified_kill");
  assert.equal(image[state + 1], 1);
  assert.equal(image[hp + 1], 0);
  assert.equal(image[y + 1], 8);
  assert.equal(image[timer + 1], 32);
  assert.equal(image[type + 1], 0);
  assert.equal(image[type + 2], 1);
  assert.equal(image[director.rng], rng, "drop generation must not evaluate RNG");
});

test("pickup admission coexists with slot-0 debris and publishes the 16-row PMG", () => {
  const image = memory();
  const state = labels.get("ENTITY_STATE");
  const type = labels.get("ENTITY_TYPE");
  const timer = labels.get("ENTITY_TIMER");
  const x = labels.get("ENTITY_X");
  const y = labels.get("ENTITY_Y");
  const mask = labels.get("ENTITY_ACTIVE_MASK");
  const count = labels.get("ENTITY_ACTIVE_COUNT");
  run(image, "init_entity_effects");
  prepareDirector(image);
  image[labels.get("CAPITAL_SECTOR_STATE")] = 7;
  image[type] = 1; image[state] = 1;
  image[type + 1] = 0; image[state + 1] = 1;
  image[x + 1] = 100; image[y + 1] = 8; image[timer + 1] = 1;
  image[mask] = 1; image[count] = 1;
  const beforeRng = image[director.rng];
  run(image, "integration_pickup_pending_tick");
  assert.equal(image[state + 1], 2);
  assert.equal(image[y + 1], 24);
  assert.equal(image[mask], 3);
  assert.equal(image[count], 2);
  assert.equal(image[director.rng], (5 * beforeRng + 1) & 0xff,
    "accepted Director accounting advances RNG once");
  // REWRITTEN 2026-10-01 (recorded failures review, B1; owner-approved): the
  // tail read the missile page at $3B00, HPOSM0-3, SIZEM and PRIOR = $10 - the
  // capsule as the GTIA fifth player - after update_fighter_pickup_pmg. The
  // capsule is one PLAYER3 image now (docs/plans/pickup-colour.md section 7),
  // and that routine only moves it: publish_fighter_pickup_pmg draws it in the
  // post-playfield window.
  image.fill(0, 0x3b00, 0x3c00);
  image.fill(0, 0x3f00, 0x4000);
  image.fill(0, 0xd000, 0xd020);
  run(image, "publish_fighter_pickup_pmg");
  assert.equal(image[labels.get("ENTITY_SCREEN_HI") + 1], 1);
  const dmaStart = 0x3f00 + image[labels.get("ENTITY_SCREEN_LO") + 1];
  assert.equal([...image.subarray(dmaStart, dmaStart + 16)].filter(Boolean).length, 16,
    "the Rapid capsule is sixteen PLAYER3 rows");
  assert.equal([...image.subarray(0x3f00, 0x4000)].filter(Boolean).length, 16,
    "and nothing else is on the plane");
  assert.equal(image[0xd003], 100, "HPOSP3 carries the capsule X");
  assert.equal([...image.subarray(0x3b00, 0x3c00)].some(Boolean), false,
    "the capsule writes no missile row");
  assert.deepEqual([...image.subarray(0xd004, 0xd008)], [0, 0, 0, 0],
    "the capsule moves no missile");
  assert.equal(image[0xd01b], 0, "the capsule leaves PRIOR alone");
});

test("capital freezes pending, releases active, and preserves the slot-2 booster", () => {
  const image = memory();
  const state = labels.get("ENTITY_STATE");
  const timer = labels.get("ENTITY_TIMER");
  const mask = labels.get("ENTITY_ACTIVE_MASK");
  const count = labels.get("ENTITY_ACTIVE_COUNT");
  run(image, "init_entity_effects");
  prepareDirector(image);
  image[labels.get("CAPITAL_SECTOR_STATE")] = 0;
  image[state + 1] = 1; image[timer + 1] = 17;
  image[state + 2] = 3; image[timer + 2] = 0xf4;
  image[labels.get("ENTITY_MOVE_ACCUMULATOR") + 2] = 1;
  run(image, "weapon_pickup_clear_sector");
  run(image, "update_fighter_pickup_pmg");
  assert.equal(image[state + 1], 1);
  assert.equal(image[timer + 1], 17);
  assert.equal(image[state + 2], 3);
  assert.equal(image[timer + 2], 0xf4);

  image[state + 1] = 2; image[mask] = 3; image[count] = 2;
  image[labels.get("ENTITY_SCREEN_LO") + 1] = 40;
  image[labels.get("ENTITY_SCREEN_HI") + 1] = 1;
  // RE-POINTED 2026-09-28 (owner decision, docs/plans/pickup-colour.md §7
  // item 2): the capsule is one PLAYER3 image, so the sixteen rows the sector
  // release must blank are at $3F28-$3F37, not $3B28-$3B37. The assertion is
  // unchanged -- an ACTIVE capsule leaves nothing behind on its plane when the
  // capital sector takes it -- and it is now stronger than it was, because the
  // missile plane it used to read has a second writer (the broadside warning
  // marks) while PLAYER3 in OPEN has none.
  image.fill(0xff, 0x3f28, 0x3f38);
  run(image, "weapon_pickup_clear_sector");
  assert.equal(image[state + 1], 0);
  assert.equal(image[mask], 1);
  assert.equal(image[count], 1);
  assert.equal(image[state + 2], 3);
  assert.equal(image[timer + 2], 0xf4);
  assert.equal([...image.subarray(0x3f28, 0x3f38)].every((value) => value === 0), true);
});
