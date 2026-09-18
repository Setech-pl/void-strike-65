// Owner rule (2026-09-18): destroying something awards score regardless of
// whether the player survives doing it, so a contact kill scores exactly what a
// shot kill scores. Interactive debris awards DEBRIS_SCORE ($05),
// difficulty-independent, on the lethal player shot and on the lethal player
// contact alike. Every other release path — the despawn path, the fall past
// ENTITY_GAMEPLAY_BOTTOM and the sector DRAIN/COMPLETE release — must still
// leave the score untouched.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installBootArtifact } from "../scripts/runtime-image.mjs";
import { executeDebrisDestructionTrace } from "../scripts/debris-destruction-runtime.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const labels = new Map(
  fs.readFileSync(path.join(root, "build", "void-strike-65.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);

const DEBRIS_SCORE = 0x05;
const PLAYER_ALIVE = 0;
const WEAPON_BOOSTER_SLOT = 2;   // build/entity-effects.inc
const BROAD_PLAYER_HEALTH = 0x4e5d;

function at(name) {
  const address = labels.get(name);
  assert.ok(Number.isInteger(address), `missing linked label ${name}`);
  return address;
}

function run(memory, name) {
  const cpu = new Nmos6502(memory, {});
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = at(name);
  for (let steps = 0; steps < 300_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${name} did not return`);
}

// Same resident expansion the debris destruction harness performs, so the C
// arena (DIRECTOR_RELEASE) and the ENTITY_CODE renderers are both live.
function bootedMemory() {
  const memory = new Uint8Array(0x10000);
  installBootArtifact(memory, root, "xex");
  run(memory, "stage_boot_streams");
  run(memory, "unpack_resident_runtime");
  run(memory, "unpack_entity_runtime");
  if (labels.has("publish_director_abi")) run(memory, "publish_director_abi");
  run(memory, "stage_a2_kernel");
  run(memory, "init_entity_effects");
  run(memory, "unpack_weapon_pickup_phase_runtime");
  run(memory, "unpack_starfield_runtime");
  memory.set(fs.readFileSync(path.join(root, "build", "integration-glue.bin")), 0x4efe);
  memory.fill(0, 0x80f4, 0x8110);
  memory[0x80fb] = 0x6d;
  memory[0x80fc] = 0xff;
  memory[0x80f6] = 3;
  memory[0x80f9] = 0;
  memory[0x80fa] = 0;
  memory[0x80ff] = 0xff;
  return memory;
}

function armDebris(memory, { hp }) {
  memory[at("ENTITY_ACTIVE_MASK")] = 1;
  memory[at("ENTITY_ACTIVE_COUNT")] = 1;
  memory[at("ENTITY_TYPE")] = 1;
  memory[at("ENTITY_STATE")] = 1;
  memory[at("ENTITY_FLAGS")] = 0x3f;
  memory[at("ENTITY_X")] = 124;
  memory[at("ENTITY_Y")] = 100;
  memory[at("ENTITY_HP")] = hp;
  memory[at("score_bcd_lo")] = 0x42;
  memory[at("score_bcd_hi")] = 0x07;
}

const score = (memory) => memory[at("score_bcd_hi")] << 8 | memory[at("score_bcd_lo")];

test("the lethal player shot awards DEBRIS_SCORE through the existing mechanism", () => {
  const trace = executeDebrisDestructionTrace({ artifact: "xex" });
  const pre = trace.records[0];
  assert.equal(pre.scoreHi << 8 | pre.scoreLo, 0x0742);

  // Non-lethal hits leave the score alone; only the destroying frame adds.
  const nonLethal = trace.records.filter((record) => record.phase.startsWith("HIT_"));
  assert.ok(nonLethal.length > 0);
  for (const record of nonLethal) {
    assert.equal(record.scoreHi << 8 | record.scoreLo, 0x0742,
      `${record.phase}/${record.frame} must not score`);
  }

  const final = trace.records.filter((record) => record.phase === "FINAL");
  assert.equal(final[0].debrisActive & 1, 0, "the third hit must destroy the debris");
  for (const record of final) {
    assert.equal(record.scoreHi << 8 | record.scoreLo, 0x0747,
      `${record.phase}/${record.frame} must hold exactly one DEBRIS_SCORE award`);
  }
  // Packed BCD, so the delta is the literal constant.
  assert.equal(0x0747 - 0x0742, DEBRIS_SCORE);
});

test("a non-lethal player shot on debris does not score", () => {
  const memory = bootedMemory();
  armDebris(memory, { hp: 2 });
  run(memory, "entity_debris_hit");
  assert.equal(memory[at("ENTITY_HP")], 1);
  assert.equal(score(memory), 0x0742);
});

// Inverted on 2026-09-18: the owner made scoring independent of the player
// surviving the kill. All four enemy archetypes already converged their shot
// and contact paths before the score call; debris was the last object that did
// not, so a contact kill awarded nothing. It now awards DEBRIS_SCORE.
test("player contact destroying the debris awards the same DEBRIS_SCORE", () => {
  const memory = bootedMemory();
  armDebris(memory, { hp: 1 });
  memory[at("player_x")] = 124;
  memory[at("player_y")] = 100;
  memory[at("DIFFICULTY_SETTING")] = 1;
  memory[at("PLAYER_LIFECYCLE")] = PLAYER_ALIVE;
  memory[BROAD_PLAYER_HEALTH] = 10;
  memory[at("BROAD_DAMAGE_COOLDOWN")] = 0;
  memory[at("BROAD_DAMAGE_APPLIED")] = 0;
  memory[at("ENTITY_STATE") + WEAPON_BOOSTER_SLOT] = 0;
  run(memory, "entity_collide_player");
  assert.equal(memory[at("ENTITY_ACTIVE_MASK")] & 1, 0, "contact must release the debris");
  assert.ok(memory[BROAD_PLAYER_HEALTH] < 10, "contact must still damage the player");
  assert.equal(score(memory), 0x0747, "a contact kill awards exactly one DEBRIS_SCORE");
  assert.equal(0x0747 - 0x0742, DEBRIS_SCORE);
});

test("the despawn path does not score", () => {
  const memory = bootedMemory();
  armDebris(memory, { hp: 3 });
  run(memory, "entity_despawn_debris");
  assert.equal(memory[at("ENTITY_ACTIVE_MASK")] & 1, 0);
  assert.equal(score(memory), 0x0742);
});

// Deliberate contract change (2026-09-18): the single-call-site assertion below
// became a two-call-site assertion when the owner rule added the contact award.
// The two sites are the only player-caused destructions of debris; the despawn,
// fall-through and sector-boundary releases reach integration_debris_release
// without passing either.
test("only the two player-caused destruction paths call add_debris_score", () => {
  const callers = source.split(/\r?\n/)
    .filter((line) => /\b(jsr|jmp)\s+add_debris_score\b/.test(line));
  assert.equal(callers.length, 2, "add_debris_score must have exactly two call sites");
  assert.match(source,
    /entity_debris_destroyed:\s*\n\s*jsr spawn_debris_destruction_effects\s*\n\s*jsr integration_debris_release\s*\n\s*jsr add_debris_score/);
  // The contact site is a three-byte BROADSIDE prologue that falls through into
  // the unchanged release wrapper, so ENTITY_CODE stays size-neutral.
  assert.match(source,
    /debris_contact_destroyed:\s*\n\s*jsr add_debris_score\s*\nintegration_debris_release:/);
  assert.match(source, /entity_damage_applied:(?:\s*\n\s*;[^\n]*)*\s*\n\s*jmp debris_contact_destroyed/);
  // The shared mechanism: packed-BCD add then the shared HUD refresh, exactly
  // as light_add_score / add_archetype_score_tail do.
  assert.match(source,
    /add_debris_score:\s*\n\s*sed\s*\n\s*clc\s*\n\s*lda score_bcd_lo\s*\n\s*adc #DEBRIS_SCORE\s*\n\s*sta score_bcd_lo\s*\n\s*lda score_bcd_hi\s*\n\s*adc #\$00\s*\n\s*sta score_bcd_hi\s*\n\s*cld\s*\n\s*jmp update_score_display/);
  assert.match(source, /^DEBRIS_SCORE = \$05$/m);
  // Difficulty-independent: no difficulty table feeds the debris award.
  assert.doesNotMatch(source, /add_debris_score:[\s\S]{0,200}?DIFFICULTY_SETTING/);
});
