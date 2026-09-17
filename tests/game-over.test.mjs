import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  advancePlayerLifecycle,
  applyPlayerDamage,
  createBroadsideState,
  PLAYER_LIFECYCLE_STATES,
  SHARED_FIGHTER_EXPLOSION_TOTAL,
} from "../scripts/broadside.mjs";
import {
  compileCapitalHulls,
  loadCapitalHullsDefinition,
} from "../scripts/capital-hulls.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";
import { Nmos6502 } from "../scripts/nmos6502.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
const labels = new Map(
  fs
    .readFileSync(path.join(rootDirectory, "build", "void-strike-65.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);
const definitionPath = path.join(
  rootDirectory,
  "assets",
  "graphics",
  "capital-hulls.json",
);
const asset = compileCapitalHulls(loadCapitalHullsDefinition(definitionPath));

function block(startLabel, endLabel) {
  const start = source.indexOf(`${startLabel}:`);
  const end = source.indexOf(`${endLabel}:`, start + startLabel.length + 1);
  assert.notEqual(start, -1, `missing ${startLabel}`);
  assert.notEqual(end, -1, `missing ${endLabel}`);
  return source.slice(start, end);
}

function createRuntimeMemory() {
  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, rootDirectory);
  return memory;
}

function executeGameOverFormatter(memory) {
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = labels.get("draw_game_over_scores");
  let instructions = 0;
  while (cpu.pc !== stop && instructions++ < 256) cpu.step();
  assert.equal(cpu.pc, stop, "Game Over formatter did not return");
  return instructions;
}

function stepFrontendGate(armed, { stickNeutral, fireReleased }) {
  if (stickNeutral && fireReleased) return { armed: true, dispatched: false };
  if (!armed) return { armed: false, dispatched: false };
  return { armed: false, dispatched: true };
}

// Rebaselined 2026-09-17 (death-frame deferral): DYING lasts
// SHARED_FIGHTER_EXPLOSION_TOTAL+1 frames because the explosion begins on the
// first DYING tick (player_dying_tick, ENTITY_CODE), not on the death frame.
test("last-life death enters GAME OVER once after the deferred 24-frame explosion", () => {
  const state = createBroadsideState(asset);
  state.lives = 1;
  state.health = 10;

  assert.equal(applyPlayerDamage(state, asset, 10, 25, 1), true);
  assert.equal(state.lives, 0);
  assert.equal(state.playerLifecycle, PLAYER_LIFECYCLE_STATES.DYING);
  assert.equal(state.deathTimer, SHARED_FIGHTER_EXPLOSION_TOTAL + 1);

  const transitions = [];
  for (let frame = 0; frame < SHARED_FIGHTER_EXPLOSION_TOTAL; frame += 1) {
    transitions.push(advancePlayerLifecycle(state, asset));
  }
  assert.deepEqual(transitions, Array(24).fill("dying"));
  assert.equal(advancePlayerLifecycle(state, asset), "game-over");
  assert.equal(state.playerLifecycle, PLAYER_LIFECYCLE_STATES.GAME_OVER);
  assert.equal(advancePlayerLifecycle(state, asset), "unchanged");

  const lifecycle = block("update_player_death", "respawn_player");
  assert.match(lifecycle,
    /PLAYER_DYING[\s\S]+jmp player_dying_tick[\s\S]+update_player_death_finished:\s+lda PLAYER_LIVES\s+beq @game_over/);
  assert.match(source,
    /player_dying_tick:\s+lda FIGHTER_EXPLOSION_TIMER\+FIGHTER_EXPLOSION_PLAYER_FIGHTER_SLOT\s+bne @tick\s+jsr begin_player_fighter_explosion\s+@tick:\s+dec BROAD_DEATH_TIMER\s+beq @finished\s+clc\s+rts\s+@finished:\s+jmp update_player_death_finished/);
  assert.match(lifecycle,
    /@game_over:[\s\S]+PLAYER_GAME_OVER[\s\S]+sta PLAYER_LIFECYCLE[\s\S]+insert_top_score[\s\S]+clear_player_collision_latches[\s\S]+sec/);
});

test("LIFE saturates at zero and dead-state damage cannot consume it again", () => {
  const state = createBroadsideState(asset);
  state.lives = 1;
  state.health = 10;
  assert.equal(applyPlayerDamage(state, asset, 10, 25, 1), true);
  assert.equal(state.lives, 0);
  state.damageCooldown = 0;
  assert.equal(applyPlayerDamage(state, asset, 10, 25, 2), false);
  assert.equal(state.lives, 0);

  const corruptedZeroLife = createBroadsideState(asset);
  corruptedZeroLife.lives = 0;
  corruptedZeroLife.health = 10;
  assert.equal(applyPlayerDamage(corruptedZeroLife, asset, 10, 25, 3), true);
  assert.equal(corruptedZeroLife.lives, 0);

  assert.match(block("apply_player_damage", "update_hud_status"),
    /lda PLAYER_LIVES\s+beq [^\n]+\s+dec PLAYER_LIVES/);
});

test("GAME OVER leaves the gameplay loop before control, combat, spawn, and scoring", () => {
  const mainLoop = block("main_loop", "wait_frame");
  assert.match(mainLoop,
    /jsr integration_update_player_death\s+bcc main_loop_lifecycle_ready\s+jsr clear_pmg\s+jsr silence_audio\s+jsr enter_game_over\s+jmp frontend_loop/);
  assert.ok(mainLoop.indexOf("jmp frontend_loop") <
    mainLoop.indexOf("main_loop_lifecycle_ready = *"));

  const frontendLoop = block("frontend_loop", "dispatch_frontend_input");
  for (const gameplayRoutine of [
    "read_input",
    "update_enemy",
    "handle_collisions",
    "update_player_fighter_weapon",
    "update_enemy_weapon",
    "update_starfield",
    "handle_player_hull_contact",
    "update_sector_completion",
    "add_archetype_score",
  ]) {
    assert.doesNotMatch(frontendLoop, new RegExp(`jsr ${gameplayRoutine}`));
  }
  assert.match(block("enter_game_over", "enter_frontend_state"),
    /lda #STATE_GAME_OVER\s+bne enter_frontend_state/);
  assert.match(block("enter_frontend_state", "enter_exited_state"),
    /lda #\$00[\s\S]+sta frontend_input_armed[\s\S]+sta DMACTL[\s\S]+sta GRACTL[\s\S]+sta NMIEN/);
});

test("GAME OVER renders final SCORE and TOP from packed BCD without changing them", () => {
  assert.match(source,
    /game_over_screen_data:[\s\S]+"GAME OVER",0[\s\S]+"COMBAT RECORD",0[\s\S]+"SCORE",0[\s\S]+"TOP SCORE",0[\s\S]+"FIRE TO CONTINUE",0/);
  assert.match(block("render_frontend_state", "draw_main_menu_scene"),
    /cmp #STATE_GAME_OVER[\s\S]+jmp draw_game_over_scores/);

  const memory = createRuntimeMemory();
  const screen = 0x4000;
  const scoreDigits = screen + 80 + 12;
  const topDigits = screen + 100 + 12;
  const frontendZero = 1;
  const scoreLow = labels.get("score_bcd_lo");
  const scoreHigh = labels.get("score_bcd_hi");
  const topLow = labels.get("TOP_SCORE_TABLE_LO");
  const topHigh = labels.get("TOP_SCORE_TABLE_HI");

  memory.fill(frontendZero, scoreDigits, scoreDigits + 6);
  memory.fill(frontendZero, topDigits, topDigits + 6);
  memory[scoreHigh] = 0x12;
  memory[scoreLow] = 0x34;
  memory[topHigh] = 0x56;
  memory[topLow] = 0x78;

  const instructions = executeGameOverFormatter(memory);
  assert.deepEqual([...memory.subarray(scoreDigits, scoreDigits + 6)], [65, 65, 66, 67, 68, 69]);
  assert.deepEqual([...memory.subarray(topDigits, topDigits + 6)], [65, 65, 70, 71, 72, 73]);
  assert.deepEqual([memory[scoreHigh], memory[scoreLow]], [0x12, 0x34]);
  assert.deepEqual([memory[topHigh], memory[topLow]], [0x56, 0x78]);
  assert.ok(instructions < 256);
  assert.doesNotMatch(block("draw_game_over_scores", "player_contacts_enemy"),
    /sta (?:score_bcd|TOP_SCORE)/);
});

test("held FIRE cannot skip GAME OVER; release then a fresh press returns to menu", () => {
  assert.match(block("frontend_loop", "dispatch_frontend_input"),
    /cmp #\$0F[\s\S]+lda TRIG0\s+beq @active_input[\s\S]+sta frontend_input_armed[\s\S]+@active_input:[\s\S]+lda frontend_input_armed\s+beq frontend_loop[\s\S]+sta frontend_input_armed[\s\S]+jsr dispatch_frontend_input/);
  assert.match(block("dispatch_frontend_input", "handle_main_menu_input"),
    /cmp #STATE_GAME_OVER\s+beq handle_game_over_input/);
  assert.match(block("handle_game_over_input", "handle_exit_input"),
    /lda TRIG0\s+bne @done\s+jmp enter_main_menu/);

  let gate = { armed: false, dispatched: false };
  gate = stepFrontendGate(gate.armed, { stickNeutral: true, fireReleased: false });
  assert.deepEqual(gate, { armed: false, dispatched: false }, "held death FIRE is ignored");
  gate = stepFrontendGate(gate.armed, { stickNeutral: true, fireReleased: true });
  assert.deepEqual(gate, { armed: true, dispatched: false }, "release arms the screen");
  gate = stepFrontendGate(gate.armed, { stickNeutral: true, fireReleased: false });
  assert.deepEqual(gate, { armed: false, dispatched: true }, "fresh FIRE is dispatched once");
});
