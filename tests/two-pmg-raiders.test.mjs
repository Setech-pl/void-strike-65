import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";
import {
  simulateTwoPmgRaiderPrototype,
} from "../scripts/enemy-combat.mjs";
import {
  compileEnemyRoster,
  loadEnemyRosterDefinition,
} from "../scripts/enemy-roster.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
const asset = compileEnemyRoster(loadEnemyRosterDefinition(
  path.join(root, "assets/graphics/enemy-roster.json")), root);
const manifest = JSON.parse(fs.readFileSync(
  path.join(root, "dist/void-strike-65-manifest.json"), "utf8"));
const labels = new Map(fs.readFileSync(path.join(root, "build/void-strike-65.lbl"), "utf8")
  .split(/\r?\n/).map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
  .filter(Boolean).map((match) => [match[2], Number.parseInt(match[1], 16)]));

function runRoutine(memory, target, hooks = {}) {
  const cpu = new Nmos6502(memory, hooks);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = labels.get(target);
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${target} did not return`);
  return cpu.cycles;
}

function pageOpaqueBytes(memory, page) {
  let count = 0;
  for (let offset = 0; offset < 0x100; offset += 1) {
    if (memory[page + offset] !== 0) count += 1;
  }
  return count;
}

test("two PMG Raiders keep independent movement state and cross vertically", () => {
  const replay = simulateTwoPmgRaiderPrototype(asset, {
    frameCount: 240,
    playerXForFrame: (frame) => frame < 80 ? 92 : frame < 160 ? 156 : 112,
  });
  const first = replay.trace[0].slots;
  const sameHeight = replay.trace.find(({ slots }) =>
    slots[0].y === slots[1].y && slots[0].x !== slots[1].x);
  const swapped = replay.trace.find(({ slots }) => slots[0].y > slots[1].y);
  assert.ok(first[0].y < first[1].y, "P1 must start above P2");
  assert.ok(sameHeight, "Raiders must share one height while retaining different X");
  assert.ok(swapped, "Raiders must reverse their vertical ordering");
  assert.notDeepEqual(replay.trace.map(({ slots }) => slots[0].x),
    replay.trace.map(({ slots }) => slots[1].x),
  "independent phases and initial state must not collapse into a fixed offset");
  assert.ok(replay.trace.some(({ slots }) => slots[0].velocityX < 0));
  assert.ok(replay.trace.some(({ slots }) => slots[1].velocityX > 0));
  for (const { slots } of replay.trace) {
    assert.equal(slots.length, 2);
    assert.notStrictEqual(slots[0], slots[1]);
  }
});

test("runtime assigns one monochrome body to P1 and P2 and leaves player PMG intact", () => {
  assert.match(source, /sta COLPM1\s+sta COLPM2/);
  assert.match(source,
    /lda ENEMY_TARGET_SLOT[\s\S]+adc #>PLAYER1[\s\S]+sta @body_store\+2[\s\S]+sta PLAYER1,y/);
  assert.match(source,
    /draw_player:[\s\S]+sta PLAYER0,y[\s\S]+sta PLAYER3,y[\s\S]+cpx #PLAYER_H/);
  assert.match(source, /RAIDER_PMG_SLOT_COUNT = 2/);
  assert.match(source, /ENEMY_X:\s+\.res RAIDER_PMG_SLOT_COUNT/);
  assert.match(source, /ENEMY_Y:\s+\.res RAIDER_PMG_SLOT_COUNT/);
  assert.match(source, /ENEMY_VELOCITY_X:\s+\.res RAIDER_PMG_SLOT_COUNT/);
  assert.match(source, /ENEMY_MANEUVER_STATE:\s+\.res RAIDER_PMG_SLOT_COUNT/);
  assert.match(source, /ENEMY_BEHAVIOUR_PHASE:\s+\.res RAIDER_PMG_SLOT_COUNT/);
  assert.match(source,
    /player_fighter_projectile_hits_enemy:[\s\S]+sbc ENEMY_X,y[\s\S]+DAMAGE_PLAYER_PROJECTILE[\s\S]+queue_enemy_damage/);
  assert.match(source,
    /update_enemy_weapon_runtime:[\s\S]+select_enemy_weapon_member[\s\S]+allocate_interceptor_projectile/);
  const enemyExplosion = source.slice(source.indexOf("begin_enemy_fighter_explosion_tail:"),
    source.indexOf("reset_enemy_fire_cooldown_tail:"));
  assert.doesNotMatch(enemyExplosion, /PLAYER1|PLAYER2|HPOSP1|HPOSP2|COLPM1|COLPM2/);
});

test("real NMOS Heavy update keeps P1/P2 isolated and never blanks either live page", () => {
  const scenarios = [
    { name: "one Heavy", active: [1, 0], x: [88, 152], y: [48, 96] },
    { name: "separated top", active: [1, 1], x: [88, 152], y: [48, 96] },
    { name: "partial overlap", active: [1, 1], x: [108, 116], y: [70, 75] },
    { name: "maximum overlap", active: [1, 1], x: [112, 112], y: [72, 72] },
    { name: "crossing middle", active: [1, 1], x: [116, 110], y: [104, 108] },
    { name: "bottom", active: [1, 1], x: [104, 120], y: [220, 222] },
  ];
  let heldLiveMembers = 0;
  for (const scenario of scenarios) {
    const memory = new Uint8Array(0x10000);
    installRuntimeSegments(memory, root);
    memory.fill(0, 0x3d00, 0x3f00);
    const setPair = (name, values) => values.forEach((value, slot) => {
      memory[labels.get(name) + slot] = value & 0xff;
    });
    memory[labels.get("ENEMY_ACTIVE")] = 1;
    memory[labels.get("ENEMY_ARCHETYPE")] = 0;
    memory[labels.get("ENEMY_LIVE_COUNT")] = scenario.active.reduce((sum, value) => sum + value, 0);
    memory[labels.get("player_x")] = 112;
    setPair("ENEMY_MEMBER_STATE", scenario.active);
    setPair("ENEMY_HP", [3, 3]);
    setPair("ENEMY_X", scenario.x);
    setPair("ENEMY_Y", scenario.y);
    setPair("ENEMY_VELOCITY_X", [1, 0xff]);
    setPair("ENEMY_MOVE_ACCUMULATOR", [0, 2]);
    setPair("ENEMY_MANEUVER_STATE", [0, 0]);
    setPair("ENEMY_MANEUVER_TIMER", [48, 48]);
    setPair("ENEMY_BEHAVIOUR_PHASE", [0, 12]);
    runRoutine(memory, "draw_enemy");
    for (let slot = 0; slot < 2; slot += 1) assert.equal(
      pageOpaqueBytes(memory, 0x3d00 + slot * 0x100) > 0,
      scenario.active[slot] !== 0,
      `${scenario.name}: initial P${slot + 1} state`,
    );

    const writes = [];
    const minimum = [pageOpaqueBytes(memory, 0x3d00), pageOpaqueBytes(memory, 0x3e00)];
    runRoutine(memory, "update_enemy", {
      write(address, value, cpu) {
        if (address < 0x3d00 || address >= 0x3f00) return undefined;
        const pageSlot = address < 0x3e00 ? 0 : 1;
        const targetSlot = memory[labels.get("ENEMY_TARGET_SLOT")];
        writes.push({ address, value, pc: (cpu.pc - 3) & 0xffff, pageSlot, targetSlot });
        assert.equal(pageSlot, targetSlot,
          `${scenario.name}: slot ${targetSlot} wrote foreign PMG page at $${address.toString(16)}`);
        memory[address] = value;
        minimum[pageSlot] = Math.min(minimum[pageSlot],
          pageOpaqueBytes(memory, 0x3d00 + pageSlot * 0x100));
        return false;
      },
    });
    // Roadmap item 1 (Option D): a member recopies its body only on frames
    // where its Y moved; a held member republishes its X and nothing else.
    const liveSlots = [0, 1].filter((slot) => scenario.active[slot] !== 0);
    const movedSlots = liveSlots.filter((slot) =>
      memory[labels.get("ENEMY_Y") + slot] !== scenario.y[slot]);
    assert.ok(movedSlots.length > 0, `${scenario.name}: no live member moved at all`);
    heldLiveMembers += liveSlots.length - movedSlots.length;
    for (const slot of [0, 1]) {
      const slotWrites = writes.filter((write) => write.pageSlot === slot);
      if (movedSlots.includes(slot)) {
        assert.ok(slotWrites.length >= 14,
          `${scenario.name}: a moved body must publish every visible row`);
      } else {
        assert.equal(slotWrites.length, 0,
          `${scenario.name}: a held body must publish nothing`);
      }
    }
    for (let slot = 0; slot < 2; slot += 1) {
      if (scenario.active[slot] !== 0) {
        assert.ok(minimum[slot] > 0, `${scenario.name}: P${slot + 1} became fully blank`);
        assert.ok(pageOpaqueBytes(memory, 0x3d00 + slot * 0x100) > 0,
          `${scenario.name}: final P${slot + 1}`);
      } else {
        assert.equal(pageOpaqueBytes(memory, 0x3d00 + slot * 0x100), 0,
          `${scenario.name}: inactive P${slot + 1} changed`);
      }
    }
  }
  assert.ok(heldLiveMembers > 0,
    "the scenario set no longer exercises a member that holds its Y");
});

test("packed transports have positive measured boundaries", () => {
  const star = manifest.starfieldRuntime;
  assert.equal(star.packedSourceEndExclusive,
    star.packedSourceAddress + star.packedBytes);
  assert.ok(star.packedSourceEndExclusive <= star.pickupColdStagingAddress);
  assert.equal(star.packedSourceToPickupMarginBytes,
    star.pickupColdStagingAddress - star.packedSourceEndExclusive);
  assert.ok(star.packedSourceToPickupMarginBytes > 0);
  assert.ok(manifest.entityEffects.stagedEndExclusive <=
    manifest.broadsideRuntime.runAddress);
});
