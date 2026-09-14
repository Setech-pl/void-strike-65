import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  executeRaiderProjectileOwnershipIsolation,
  executeRaiderProjectilePersistenceAttribution,
} from "../scripts/raider-projectile-persistence-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");

test("owner artifact is positively attributed to a surviving enemy PairShot", () => {
  const before = executeRaiderProjectilePersistenceAttribution({
    root, artifact: "xex", casesPerScenario: 20, legacyEmitterPersistence: true,
  });
  assert.equal(before.post_kill_falling_objects_after_active_shot, 20);
  assert.equal(before.post_kill_falling_objects_without_active_shot, 0);
  assert.equal(before.all_visible_objects_are_active_enemy_pairshots, true);
  for (const item of before.with_shot) {
    assert.equal(item.post_kill_projectiles.length, 1);
    const projectile = item.post_kill_projectiles[0];
    assert.equal(projectile.slot, item.allocated_slot);
    assert.equal(projectile.writer_x, projectile.slot);
    assert.ok(projectile.active !== 0 && projectile.rendered !== 0);
    assert.equal(item.writes.character_effect, 0);
    assert.equal(item.writes.gameplay_debris, 0);
  }
});

test("fixed production path leaves no emitter projectile after either Raider kill", () => {
  const fixed = executeRaiderProjectilePersistenceAttribution({
    root, artifact: "xex", casesPerScenario: 20,
  });
  assert.equal(fixed.post_kill_falling_objects_after_active_shot, 0);
  assert.equal(fixed.post_kill_falling_objects_without_active_shot, 0);
  assert.ok(fixed.with_shot.every((item) =>
    item.writes.character_effect === 0 && item.writes.gameplay_debris === 0));
});

test("enemy ACTIVE bit zero stores emitter identity without changing consumers", () => {
  assert.match(source,
    /FIGHTER_PROJECTILE_INTERCEPTOR_EMITTER_MASK = \$01[\s\S]+FIGHTER_PROJECTILE_INTERCEPTOR_P1 = FIGHTER_PROJECTILE_INTERCEPTOR[\s\S]+FIGHTER_PROJECTILE_INTERCEPTOR_P2 = FIGHTER_PROJECTILE_INTERCEPTOR\|FIGHTER_PROJECTILE_INTERCEPTOR_EMITTER_MASK/);
  assert.doesNotMatch(source, /cmp #FIGHTER_PROJECTILE_INTERCEPTOR/);
  const update = source.slice(source.indexOf("update_fighter_projectiles:"),
    source.indexOf("player_fighter_projectile_hits_enemy:"));
  assert.match(update,
    /@interceptor_slot:[\s\S]+lda FIGHTER_PROJECTILE_ACTIVE,x\s+beq @interceptor_next/);
  const renderer = source.slice(source.indexOf("render_fighter_projectile_overlays:"),
    source.indexOf("render_fighter_projectile_overlays_end"));
  assert.match(renderer,
    /lda FIGHTER_PROJECTILE_ACTIVE,x[\s\S]+cpx #INTERCEPTOR_PROJECTILE_SLOT_BASE\s+bcs @interceptor_code/);
  assert.doesNotMatch(renderer.slice(renderer.indexOf("@interceptor_code:"),
    renderer.indexOf("@code_ready:")),
    /FIGHTER_PROJECTILE_ACTIVE,x/);
});

test("P1 and P2 destruction remove only their own rendered projectiles", () => {
  for (const killEmitter of [0, 1]) {
    const result = executeRaiderProjectileOwnershipIsolation({
      root, artifact: "xex", killEmitter, renderedAtKill: true,
    });
    assert.deepEqual(result.ownership_values_after_allocation, [2, 3]);
    assert.equal(result.killed_projectiles_removed, true);
    assert.equal(result.foreign_projectiles_preserved, true);
    assert.equal(result.after_resolve[killEmitter].active, 0);
    assert.equal(result.after_resolve[killEmitter].rendered, 0xff,
      "OLD visible ownership must remain latched until the normal publication erase");
    assert.notEqual(result.after_resolve[killEmitter ^ 1].active, 0);
    assert.deepEqual(result.destruction_feedback, {
      enemy_explosion_timer: 24,
      hit_sound_timer: 14,
      score_bcd_lo: 0x10,
      score_bcd_hi: 0,
      destroyed_member_state: 0,
      foreign_member_state: 1,
      enemy_live_count: 1,
    });
    assert.equal(result.next_frame[killEmitter].active, 0);
    assert.equal(result.next_frame[killEmitter ^ 1].active,
      result.ownership_values_after_allocation[killEmitter ^ 1]);
    assert.equal(result.next_frame[killEmitter ^ 1].y,
      result.after_publication[killEmitter ^ 1].y + 2);
    assert.equal(result.next_frame[killEmitter ^ 1].lifetime,
      result.after_publication[killEmitter ^ 1].lifetime - 1);
    assert.equal(result.effect_character_writes, 0);
    assert.equal(result.debris_character_writes, 0);
  }
});

test("cleanup is safe between publications, near the player, and at the bottom", () => {
  for (const killEmitter of [0, 1]) {
    for (const renderedAtKill of [false, true]) {
      for (const projectileY of [96, 216, 228]) {
        const result = executeRaiderProjectileOwnershipIsolation({
          root, artifact: "xex", killEmitter, renderedAtKill, projectileY,
        });
        assert.equal(result.killed_projectiles_removed, true,
          `emitter ${killEmitter}, rendered ${renderedAtKill}, Y ${projectileY}`);
        assert.equal(result.foreign_projectiles_preserved, true,
          `foreign emitter ${killEmitter ^ 1}, rendered ${renderedAtKill}, Y ${projectileY}`);
      }
    }
  }
});

test("XEX and ATR execute identical emitter cleanup", () => {
  for (const killEmitter of [0, 1]) {
    const traces = ["xex", "atr"].map((artifact) =>
      executeRaiderProjectileOwnershipIsolation({ root, artifact, killEmitter }));
    const comparable = (trace) => ({
      ownership: trace.ownership_values_after_allocation,
      afterResolve: trace.after_resolve,
      afterPublication: trace.after_publication,
      removed: trace.killed_projectiles_removed,
      foreign: trace.foreign_projectiles_preserved,
      allocationCycles: trace.allocation_cycles,
      destructionCycles: trace.destruction_cycles,
    });
    assert.deepEqual(comparable(traces[0]), comparable(traces[1]));
  }
});
