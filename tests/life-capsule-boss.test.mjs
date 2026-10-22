import assert from "node:assert/strict";
import test from "node:test";
import { bossGateMemory, bossLevel, call, label, runBossEntry } from "./boss-harness.mjs";

test("every direct boss install keeps ordinary drops cheap, with no LIFE policy or RNG, and restores SPACE selection", () => {
  const select = label("main", "weapon_pickup_select_operand");
  const shipped = bossGateMemory().slice(select, select + 2);
  for (const directory of [1, 4, 3, 2]) {
    const { memory: m, end } = runBossEntry({ prepare: m => { m[0xa603] = bossLevel(directory); } });
    assert.equal(end, "main_loop");
    const type = label("main", "ENTITY_TYPE");
    const state = label("main", "ENTITY_STATE");
    const spawned = label("director", "_life_spawned");
    const lives = label("director", "_life_lives");
    const sector = label("director", "_life_sector");
    const kind = label("director", "_life_kind");
    // Include the abbreviated historical stress setup (SPACE sector still 0),
    // an actual BOSS kind, cap 8, a life lost after cap suppression, and a
    // previously spawned/uncollected capsule. All use the installed route.
    for (const [sectorKind, lifeCount, latch] of [[0, 3, 0], [2, 3, 0], [2, 8, 0], [2, 7, 0], [2, 2, 1]]) {
      m[sector] = 0; m[kind] = sectorKind; m[lives] = lifeCount; m[spawned] = latch;
      m[0x80fb] = 3;
      m[type + 2] = 2;
      let calls = 0;
      const cpu = call(m, label("main", "weapon_pickup_spawn_capsule_at"), {
        a: 120, watch: pc => { if (pc === label("director", "_life_c_pick")) calls += 1; },
      });
      assert.equal(calls, 0, `boss ${directory}: no policy call on a spawn frame`);
      assert.ok(cpu.cycles <= 81, `boss ${directory}: spawn costs ${cpu.cycles}`);
      assert.equal(m[type + 1], 2); assert.equal(m[type + 2], 0, "ordinary rotation wraps");
      assert.equal(m[state + 1], 1, "pending publication survives tail dispatch");
      assert.equal(m[0x80fb], 3); assert.equal(m[spawned], latch);
    }
    call(m, label("summary", "summary_boss_restore"));
    assert.deepEqual(m.slice(select, select + 2), shipped, "START GAME restores both selector bytes");
    m[kind] = 0; m[lives] = 3; m[spawned] = 0; m[0x80fb] = 3;
    m[type + 2] = 2;
    call(m, label("main", "weapon_pickup_spawn_capsule_at"), { a: 120 });
    assert.equal(m[type + 1], 3, "SPACE can roll LIFE after a boss exit");
    assert.equal(m[type + 2], 2, "LIFE preserves ordinary rotation after restore");
    assert.equal(m[0x80fb], 16);
  }
});
