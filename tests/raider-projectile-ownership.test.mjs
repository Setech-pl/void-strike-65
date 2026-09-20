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

// Owner decision 2026-09-17: an already-emitted hostile PairShot is independent
// of its emitter and continues its normal lifecycle after the emitter dies.
test("a Raider kill leaves every already-emitted PairShot visible and active", () => {
  const result = executeRaiderProjectilePersistenceAttribution({
    root, artifact: "xex", casesPerScenario: 20,
  });
  assert.equal(result.post_kill_falling_objects_after_active_shot, 20);
  assert.equal(result.post_kill_falling_objects_without_active_shot, 0);
  assert.equal(result.all_visible_objects_are_active_enemy_pairshots, true);
  for (const item of result.with_shot) {
    assert.equal(item.post_kill_projectiles.length, 1);
    const projectile = item.post_kill_projectiles[0];
    assert.equal(projectile.slot, item.allocated_slot);
    assert.equal(projectile.writer_x, projectile.slot);
    assert.ok(projectile.active !== 0 && projectile.rendered !== 0);
    assert.equal(item.writes.character_effect, 0);
    assert.equal(item.writes.gameplay_debris, 0);
  }
});

test("the Raider kill path carries no emitter-owned projectile cleanup", () => {
  assert.doesNotMatch(source, /begin_enemy_fighter_explosion_with_projectile_cleanup/);
  const breakup = source.slice(source.indexOf("spawn_interceptor_breakup_effects:"),
    source.indexOf("materialize_interceptor_breakup_effects:"));
  assert.match(breakup, /jmp begin_enemy_fighter_explosion\n/);
  // The allocator's own cursor update (4.5c generic emission) derives the next
  // owner from the new shot's emitter bit; that is not kill-path cleanup.
  const allocator = source.slice(source.indexOf("allocate_interceptor_projectile:"),
    source.indexOf(".assert FIGHTER_PROJECTILE_INTERCEPTOR_EMITTER_MASK = 1"));
  assert.equal((allocator.match(/and #FIGHTER_PROJECTILE_INTERCEPTOR_EMITTER_MASK/g) ?? []).length, 1);
  assert.equal((source.replace(allocator, "")
    .match(/and #FIGHTER_PROJECTILE_INTERCEPTOR_EMITTER_MASK/g) ?? []).length, 0);
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

test("P1 and P2 destruction keep both emitters' rendered projectiles", () => {
  for (const killEmitter of [0, 1]) {
    const result = executeRaiderProjectileOwnershipIsolation({
      root, artifact: "xex", killEmitter, renderedAtKill: true,
    });
    // P1/P2 emitter bit | hostile bit | weapon_class PULSE (1) << 3.
    assert.deepEqual(result.ownership_values_after_allocation, [10, 11]);
    assert.equal(result.killed_emitter_projectiles_preserved, true);
    assert.equal(result.foreign_projectiles_preserved, true);
    assert.deepEqual(result.after_resolve.map((record) => record.active), [10, 11]);
    for (const emitter of [0, 1]) {
      assert.equal(result.next_frame[emitter].active,
        result.ownership_values_after_allocation[emitter]);
      assert.equal(result.next_frame[emitter].y, result.after_publication[emitter].y + 2);
      assert.equal(result.next_frame[emitter].lifetime,
        result.after_publication[emitter].lifetime - 1);
    }
    assert.equal(result.effect_character_writes, 0);
    assert.equal(result.debris_character_writes, 0);
    // Pre-existing at 2a67684: this harness scores 0x35, not 0x10 (known test debt).
    assert.deepEqual(result.destruction_feedback, {
      enemy_explosion_timer: 24,
      hit_sound_timer: 14,
      score_bcd_lo: 0x10,
      score_bcd_hi: 0,
      destroyed_member_state: 0,
      foreign_member_state: 1,
      enemy_live_count: 1,
    });
  }
});

test("persistence is safe between publications, near the player, and at the bottom", () => {
  for (const killEmitter of [0, 1]) {
    for (const renderedAtKill of [false, true]) {
      for (const projectileY of [96, 216, 228]) {
        const result = executeRaiderProjectileOwnershipIsolation({
          root, artifact: "xex", killEmitter, renderedAtKill, projectileY,
        });
        const label = `emitter ${killEmitter}, rendered ${renderedAtKill}, Y ${projectileY}`;
        assert.equal(result.killed_emitter_projectiles_preserved, true, label);
        assert.equal(result.foreign_projectiles_preserved, true, label);
      }
    }
  }
});

test("XEX and ATR execute identical emitter-independent kills", () => {
  for (const killEmitter of [0, 1]) {
    const traces = ["xex", "atr"].map((artifact) =>
      executeRaiderProjectileOwnershipIsolation({ root, artifact, killEmitter }));
    const comparable = (trace) => ({
      ownership: trace.ownership_values_after_allocation,
      afterResolve: trace.after_resolve,
      afterPublication: trace.after_publication,
      preserved: trace.killed_emitter_projectiles_preserved,
      foreign: trace.foreign_projectiles_preserved,
      allocationCycles: trace.allocation_cycles,
      destructionCycles: trace.destruction_cycles,
    });
    assert.deepEqual(comparable(traces[0]), comparable(traces[1]));
  }
});
