import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const labels = new Map(fs.readFileSync(path.join(root, "build", "void-strike-65.lbl"), "utf8")
  .split(/\r?\n/)
  .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
  .filter(Boolean)
  .map((match) => [match[2], Number.parseInt(match[1], 16)]));

function routine(label, nextLabel) {
  const start = source.indexOf(`${label}:`);
  const end = source.indexOf(`${nextLabel}:`, start + label.length + 1);
  assert.notEqual(start, -1, `missing routine ${label}`);
  assert.notEqual(end, -1, `missing routine boundary ${nextLabel}`);
  return source.slice(start, end);
}

function runGate({ produced, consumed, releaseAfterSteps = 0 }) {
  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, root);
  const producedAddress = labels.get("PHYSICAL_PAL_FRAME_ID");
  const consumedAddress = labels.get("GAMEPLAY_PAL_FRAME_CONSUMED");
  memory[producedAddress] = produced;
  memory[consumedAddress] = consumed;
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >>> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = labels.get("wait_for_master_pal_frame");
  for (let steps = 0; steps < 1000 && cpu.pc !== stop; steps += 1) {
    if (releaseAfterSteps && steps === releaseAfterSteps) {
      memory[producedAddress] = (produced + 1) & 0xff;
    }
    cpu.step();
  }
  assert.equal(cpu.pc, stop, "master gate did not consume a physical-frame token");
  return { cycles: cpu.cycles, consumed: memory[consumedAddress] };
}

test("first gameplay DLI is the sole physical PAL token producer", () => {
  const dli = routine("gameplay_dli", "clear_screen");
  assert.match(dli,
    /lda gameplay_dli_phase\s+bne gameplay_dli_sync_hud\s+[^]*inc PHYSICAL_PAL_FRAME_ID\s+lda PLAYFIELD_ACTIVE_DLIST_LO/);
  assert.equal((dli.match(/inc PHYSICAL_PAL_FRAME_ID/g) ?? []).length, 1);
  const hud = dli.slice(dli.indexOf("\ngameplay_dli_sync_hud = *"));
  assert.doesNotMatch(hud, /inc PHYSICAL_PAL_FRAME_ID/);
  assert.match(source,
    /PHYSICAL_PAL_FRAME_ID\s*=\s*STARFIELD_COMPAT_STATE\s+GAMEPLAY_PAL_FRAME_CONSUMED\s*=\s*STARFIELD_COMPAT_STATE\+\$01/);
});

test("master gate consumes one new token, waits on duplicates, and handles byte wrap", () => {
  const immediate = runGate({ produced: 1, consumed: 0 });
  assert.deepEqual(immediate, { cycles: 20, consumed: 1 });
  const waited = runGate({ produced: 7, consumed: 7, releaseAfterSteps: 8 });
  assert.equal(waited.consumed, 8);
  assert.ok(waited.cycles > immediate.cycles);
  const wrapped = runGate({ produced: 0, consumed: 0xff });
  assert.deepEqual(wrapped, { cycles: 20, consumed: 0 });
});

test("all main-loop simulation is admitted by one common frame gate", () => {
  const loop = routine("main_loop", "enter_pause");
  assert.match(loop,
    /main_loop:\s+jsr wait_for_master_pal_frame\s+jsr begin_fighter_projectile_frame/);
  for (const call of [
    "integration_active_gameplay_tick",
    "integration_update_player_death",
    "read_input",
    "integration_update_enemy",
    "handle_collisions",
    "update_player_fighter_weapon",
    "integration_update_enemy_weapon",
    "update_starfield",
    // Operand-only Light Wingman hook; it calls entity_effects_update first.
    "entity_effects_update_with_light",
    "integration_update_sector_completion",
    "update_sound",
    "tick_respawn_invulnerability",
  ]) {
    assert.equal((loop.match(new RegExp(`jsr ${call}(?=\\s)`, "g")) ?? []).length, 1, call);
  }
  assert.doesNotMatch(loop, /player_fire_transition_tick/);
});

test("same-frame sector re-entry cannot admit a second simulation iteration", () => {
  let consumed = 0;
  let simulationTicks = 0;
  const tryIteration = (physicalFrame) => {
    if (physicalFrame === consumed) return false;
    consumed = physicalFrame;
    simulationTicks += 1;
    return true;
  };
  for (let transition = 0; transition < 50; transition += 1) {
    const frame = transition + 1;
    assert.equal(tryIteration(frame), true);
    assert.equal(tryIteration(frame), false, "same PAL frame was admitted twice");
  }
  assert.equal(simulationTicks, 50);
});

test("starfield observes but never owns world and hull accumulator clocks", () => {
  const starPhase = routine("update_white_starfield_phase", "erase_dynamic_near_star_overlays");
  assert.doesNotMatch(starPhase, /scroll_accumulator|HULL_SCROLL_ACCUMULATOR/);
  const world = routine("update_starfield", "advance_starfield_layers");
  assert.equal((world.match(/scroll_accumulator/g) ?? []).length, 4);
  assert.equal((world.match(/sta scroll_accumulator/g) ?? []).length, 2);
  assert.equal((world.match(/HULL_SCROLL_ACCUMULATOR/g) ?? []).length, 3);
  assert.equal((world.match(/sta HULL_SCROLL_ACCUMULATOR/g) ?? []).length, 2);
  assert.match(world, /cmp #CAPITAL_HULL_STATE_OPEN[\s\S]+lda world_scroll_rates,x[\s\S]+asl[\s\S]+lda hull_scroll_rates,x/);
});
