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
