import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const hulls = JSON.parse(fs.readFileSync(
  path.join(root, "assets", "graphics", "capital-hulls.json"), "utf8"));
const roster = JSON.parse(fs.readFileSync(
  path.join(root, "assets", "graphics", "enemy-roster.json"), "utf8"));
const weapons = JSON.parse(fs.readFileSync(
  path.join(root, "assets", "graphics", "fighter-weapons.json"), "utf8"));
const stars = JSON.parse(fs.readFileSync(
  path.join(root, "assets", "graphics", "starfield.json"), "utf8"));
const labels = new Map(fs.readFileSync(path.join(root, "build", "void-strike-65.lbl"), "utf8")
  .split(/\r?\n/)
  .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
  .filter(Boolean)
  .map((match) => [match[2], Number.parseInt(match[1], 16)]));

function run(memory, name) {
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >>> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = labels.get(name);
  assert.ok(Number.isInteger(cpu.pc), `missing ${name}`);
  for (let steps = 0; steps < 100_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${name} did not return`);
  return cpu.cycles;
}

function events(frames, numerator, denominator) {
  let accumulator = 0;
  let count = 0;
  for (let frame = 0; frame < frames; frame += 1) {
    accumulator += numerator;
    if (accumulator >= denominator) {
      accumulator -= denominator;
      count += 1;
    }
  }
  return { count, accumulator };
}

test("enemy PairShot tuning is local and leaves the approved player displacement unchanged", () => {
  const pulse = roster.runtime.weaponPolicy.singlePulse;
  assert.equal(pulse.speed, 2);
  assert.equal(weapons.player_fighter.speedScanlines, 6);
  assert.equal(pulse.burstIntervalFrames, 15, "travel tuning must not alter enemy cadence");
  assert.deepEqual(pulse.postBurstFrames, [60, 50, 40]);

  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, root);
  const active = labels.get("FIGHTER_PROJECTILE_ACTIVE");
  const lifetime = labels.get("FIGHTER_PROJECTILE_LIFETIME");
  const y = labels.get("FIGHTER_PROJECTILE_Y");
  const previousY = labels.get("FIGHTER_PROJECTILE_PREV_Y");
  memory[active] = 1;
  memory[lifetime] = 20;
  memory[y] = 100;
  const enemySlot = 5;
  memory[active + enemySlot] = 1;
  memory[lifetime + enemySlot] = 20;
  memory[y + enemySlot] = 100;
  memory[labels.get("player_y")] = 220;
  memory[labels.get("player_x")] = 200;
  run(memory, "update_fighter_projectiles");
  assert.deepEqual([memory[previousY], memory[y]], [100, 94]);
  assert.deepEqual([memory[previousY + enemySlot], memory[y + enemySlot]], [100, 102]);
});

test("capital traversal uses one slower sector-local rate while fighter rates stay exact", () => {
  const broadside = hulls.broadside;
  assert.deepEqual([broadside.worldScrollRateDenominator,
    broadside.worldScrollRates], [20, { easy: 8, medium: 9, hard: 10 }]);
  assert.deepEqual([broadside.hullScrollRateDenominator,
    broadside.hullScrollRates], [40, { easy: 10, medium: 12, hard: 13 }]);
  const expected = {
    easy: { fighter: 80, capital: 50 },
    medium: { fighter: 90, capital: 60 },
    hard: { fighter: 100, capital: 65 },
  };
  for (const [difficulty, result] of Object.entries(expected)) {
    assert.equal(events(200, broadside.worldScrollRates[difficulty], 20).count,
      result.fighter);
    assert.equal(events(200, broadside.hullScrollRates[difficulty], 40).count,
      result.capital);
  }
  const update = source.slice(source.indexOf("update_starfield:"),
    source.indexOf("advance_starfield_layers:"));
  assert.match(update,
    /cmp #CAPITAL_HULL_STATE_OPEN[\s\S]+lda world_scroll_rates,x[\s\S]+asl[\s\S]+lda hull_scroll_rates,x/);
  assert.equal((update.match(/cmp #HULL_SCROLL_RATE_DENOMINATOR/g) ?? []).length, 2,
    "world ring and hull must consume the same selected sector rate");
});

test("four one-point white stars continue through capital and use occupancy occlusion", () => {
  assert.equal(stars.nearLayer.population, 4);
  assert.equal(stars.nearLayer.speedPixelsPerFrame, 1);
  assert.equal(stars.farLayer.population, 0);
  assert.equal(stars.nearLayer.glyphs[0].bytes.filter(Boolean).length, 1,
    "the current white glyph is already a single scanline point");
  const update = source.slice(source.indexOf("update_white_starfield_phase:"),
    source.indexOf("erase_dynamic_near_star_overlays:"));
  const render = source.slice(source.indexOf("render_dynamic_near_star_overlays:"),
    source.indexOf("star_glyph_bytes:"));
  assert.doesNotMatch(update, /lda CAPITAL_SECTOR_STATE|jmp invalidate_dynamic_near_cache/);
  assert.doesNotMatch(render, /CAPITAL_SECTOR_STATE/);
  assert.match(render, /lda \(dst_ptr\),y\s+bne @next\s+lda #STAR_NEAR_POINT\s+sta \(dst_ptr\),y/,
    "non-empty capital hull geometry must retain visual priority");
});

test("capital shell erase cannot restore a transient white point as backing", () => {
  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, root);
  const row = 0x8400;
  const column = 11;
  const slot = 0;
  const broadState = labels.get("BROAD_STATE");
  memory[broadState + slot] = 2;
  memory[labels.get("BROAD_ROW_LO") + slot] = row & 0xff;
  memory[labels.get("BROAD_ROW_HI") + slot] = row >>> 8;
  memory[broadState + 21 + slot] = column + 1; // BROAD_PREV_H
  memory[broadState + 18 + slot] = 1; // BROAD_PREV_Y
  memory[broadState + 24 + slot] = 1; // BROAD_COLLISION
  memory[row + column] = 126;
  memory[row + column + 1] = 127;
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >>> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.x = slot;
  cpu.pc = labels.get("erase_broadside_slot");
  for (let steps = 0; steps < 100_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop);
  assert.deepEqual([...memory.slice(row + column, row + column + 2)], [0, 0]);
});
