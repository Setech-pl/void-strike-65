// Regressions found while restoring the preserved M6 stage-2 patch.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { loadRuntimeSegments } from "../scripts/runtime-image.mjs";
import { fileURLToPath } from "node:url";
import { nativeRoutineHarness } from "../scripts/debris-destruction-runtime.mjs";

function harness() {
  const h = nativeRoutineHarness();
  for (const file of ["encounter-director.lbl", "light-kernel.lbl"]) {
    for (const line of fs.readFileSync(new URL(`../build/${file}`, import.meta.url), "utf8").split(/\r?\n/)) {
      const match = /^al ([0-9a-f]+) \.(\S+)$/i.exec(line);
      if (match) h.labels.set(match[2], Number.parseInt(match[1], 16));
    }
  }
  // The effects-only harness does not preserve low C during its abbreviated
  // startup. Install its linked runtime image for these isolated policy calls.
  const root = fileURLToPath(new URL("..", import.meta.url));
  const low = loadRuntimeSegments(root).segments.find(s => s.name === "encounterDirectorCode-low");
  assert.ok(low, "linked low-C runtime exists");
  h.memory.set(low.data, low.start);
  return h;
}

test("LIFE colour selection preserves the publication call and player death colours", () => {
  const h = harness();
  const call = h.label("fighter_projectile_publication_begin") - 10;
  const before = h.memory.slice(call, call + 3);
  assert.equal(before[0], 0x20, "OPEN publication calls the colour veneer");
  h.memory[h.label("ENTITY_TYPE") + 1] = 3;
  h.memory[h.label("FIGHTER_EXPLOSION_TIMER")] = 0;
  h.run("render_shared_fighter_explosions");
  h.run("life_colour");
  assert.equal(h.memory[0xd015], 0xac, "LIFE is mint");
  h.memory[h.label("FIGHTER_EXPLOSION_TIMER")] = 24;
  h.run("render_shared_fighter_explosions");
  h.run("life_colour");
  assert.equal(h.memory[0xd015], 0x1e, "death takes priority even with stale LIFE type");
  assert.deepEqual(h.memory.slice(call, call + 3), before, "death never patches a JSR operand");
});

test("the shared capsule spawn skips ABI padding and keeps the ordinary rotation", () => {
  const h = harness();
  h.memory[h.label("_life_spawned")] = 1;
  h.memory[h.label("ENTITY_TYPE") + 2] = 2;
  h.run("weapon_pickup_spawn_capsule_at");
  assert.equal(h.memory[h.label("ENTITY_TYPE") + 1], 2);
  assert.equal(h.memory[h.label("ENTITY_TYPE") + 2], 0);
  assert.equal(h.memory[h.label("ENTITY_STATE") + 1], 1, "spawn reaches its pending-state publication");
});

test("SPACE LIFE rolls remain one in four and never consume the ordinary rotation", () => {
  for (let seed = 0; seed < 4; seed += 1) {
    const h = harness();
    h.memory[h.label("_life_spawned")] = 0;
    h.memory[h.label("_life_lives")] = 3;
    h.memory[h.label("_life_sector")] = 0;
    h.memory[h.label("_life_kind")] = 0;
    h.memory[0x80fb] = seed; // Director's existing RNG state.
    h.memory[h.label("ENTITY_TYPE") + 2] = 2;
    h.run("weapon_pickup_spawn_capsule_at");
    const life = seed === 3;
    assert.equal(h.memory[0x80fb], seed * 5 + 1, "one RNG draw per eligible spawn");
    assert.equal(h.memory[h.label("ENTITY_TYPE") + 1], life ? 3 : 2);
    assert.equal(h.memory[h.label("ENTITY_TYPE") + 2], life ? 2 : 0);
    assert.equal(h.memory[h.label("_life_spawned")], life ? 1 : 0);
    assert.equal(h.memory[h.label("ENTITY_STATE") + 1], 1);
  }
});

test("forced LIFE, its cap suppression and later SPACE retry preserve the once-per-level rule", () => {
  const h = harness();
  const m = h.memory;
  m[h.label("_life_spawned")] = 0;
  m[h.label("_life_sector")] = 0;
  m[h.label("_life_kind")] = 0x40;
  m[h.label("_life_lives")] = 8;
  m[0x80fb] = 3;
  h.run("life_enter");
  assert.equal(m[h.label("_life_spawned")], 0, "suppression never spends the latch");
  assert.equal(m[h.label("ENTITY_STATE") + 1], 0, "cap 8 injects no pickup");
  m[h.label("_life_lives")] = 7;
  h.run("weapon_pickup_spawn_capsule_at");
  assert.equal(m[h.label("ENTITY_TYPE") + 1], 3, "a later eligible SPACE roll still works");
  assert.equal(m[h.label("_life_spawned")], 1);
  m[h.label("_life_lives")] = 6;
  h.run("life_enter");
  assert.equal(m[0x80fb], 16, "an uncollected LIFE's latch prevents another attempt");

  m[h.label("_life_spawned")] = 0;
  m[h.label("ENTITY_TYPE") + 2] = 2;
  h.run("life_enter");
  assert.equal(m[h.label("ENTITY_TYPE") + 1], 3, "last SPACE forces the rescue capsule");
  assert.equal(m[h.label("ENTITY_TYPE") + 2], 2, "force preserves ordinary rotation");
  assert.equal(m[0x80fb], 16, "force draws no RNG");
  h.run("life_collect");
  assert.equal(m[h.label("_life_lives")], 7, "pickup awards one life");
});
