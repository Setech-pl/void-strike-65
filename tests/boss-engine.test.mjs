// M5b-S4a-i — the layered boss engine on the 6502 harness
// (docs/plans/m5-loading-boss.md §5.13.2, §5.13.5, §5.13.7; decisions A-F;
// owner answers Q-B1, Q-B3, Q-B5-Q-B7).
//
// Everything runs on the default build's linked images: the window's boss
// entry against a drive answering from the built ATR, then the overlay's own
// frame entries and DLI. Region 1 (style 2: the core behind a cover group of
// guns) is the shipped boss; the layered fixture (style 1, geometric covers,
// four emitter slots - tests/boss-fixtures.mjs) is installed over it the way
// the head and the install would install it.
//
// RE-POINTED (fortress session, owner decisions H-K and the answers of plan
// §5.15.6): region 1 is the layered fortress now, and the S4a-i core boss
// (style 2) is the Bastion fixture, installed over the entry like the layered
// one - every style-2 assertion reads it, unchanged. Three engine rules moved
// with the owner's answers, and the tests follow them: a kill's exposure check
// runs on the next frame's tick (kill() runs that frame); a module's redraw
// goes through the one-module-a-frame queue (settle() drains it, and lets the
// hit's spark expire, before a look is read); every emitter slot is capped
// armour until the lasers exist (S4b). The bay glyphs gave way to the gone
// look of owner decision L (the cavity inside the hull, background below).
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  BOSS_BAND_COLUMNS, BOSS_COLUMN_ARMOUR, BOSS_COLUMN_OPEN, BOSS_KIND, BOSS_MODULE,
  BOSS_MODULE_BYTES, BOSS_TABLE, bossBandRowAddress, compileBossRegion, loadBossRegionDraft,
  bossRegionDirectory,
} from "../scripts/boss-assets.mjs";
import {
  call, installRegion, label, nmi, placeBand, root, runBossEntry, shootAt, visibleCells,
} from "./boss-harness.mjs";
import { layeredDraft } from "./boss-fixtures.mjs";

const region1 = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 1)));
const bastion = compileBossRegion(loadBossRegionDraft(path.join(root, "assets", "graphics", "boss-regions", "bastion")));
const layered = compileBossRegion(layeredDraft());
const TABLES = 0xad00;
const STATS_HITS = 0xae;

let entry = null;
let entryTrace = null;
function bossEntered() {
  if (entry === null) {
    const order = [];
    const marks = new Map([[label("boss", "_boss_c_init"), "init"],
      [label("boss", "boss_column_at"), "map"], [label("boss", "boss_prepare"), "prepare"]]);
    entry = runBossEntry({ watch: (pc) => { if (marks.has(pc)) order.push(marks.get(pc)); } });
    entryTrace = order;
  }
  return Uint8Array.from(entry.memory);
}

const lbl = (name) => label("boss", name);
const mask16 = (memory, name) => memory[lbl(`${name}_lo`)] | (memory[lbl(`${name}_hi`)] << 8);
const hp = (memory, index) => memory[lbl("_boss_hp") + index];
const record = (region, index, field) =>
  region.tables[BOSS_TABLE.modules + index * BOSS_MODULE_BYTES + BOSS_MODULE[field]];
const columnMap = (memory) => [...memory.subarray(lbl("boss_column_map"), lbl("boss_column_map") + 64)];
const cellsOf = (memory, module) => {
  const cells = [];
  for (let r = module.row; r < module.row + module.height; r += 1) {
    for (let c = module.x; c < module.x + module.width; c += 1) cells.push(memory[bossBandRowAddress(r) + c]);
  }
  return cells;
};

// A module's codes under the cell-flash ring: a cell a live record covers (a
// spark, a muzzle flash) reads as the code the record will give back.
const codesOf = (memory, module) => {
  const under = new Map();
  for (let r = 0; r < 8; r += 1) {
    if (memory[lbl("boss_ring_timer") + r] !== 0) {
      under.set(memory[lbl("boss_ring_lo") + r] | (memory[lbl("boss_ring_hi") + r] << 8), memory[lbl("boss_ring_saved") + r]);
    }
  }
  const cells = [];
  for (let r = module.row; r < module.row + module.height; r += 1) {
    for (let c = module.x; c < module.x + module.width; c += 1) {
      const address = bossBandRowAddress(r) + c;
      cells.push(under.has(address) ? under.get(address) : memory[address]);
    }
  }
  return cells;
};

// The rule the map implements, in JS: the first live module of the
// front-first table that covers the column, else hull or open sky.
function expectedMap(region, memory) {
  return Array.from({ length: BOSS_BAND_COLUMNS }, (_, c) => {
    const index = region.modules.findIndex((module, i) => hp(memory, i) > 0 &&
      c >= module.x && c < module.x + module.width);
    if (index >= 0) return index;
    return (region.tables[BOSS_TABLE.armour + (c >> 3)] >> (c & 7)) & 1 ? BOSS_COLUMN_ARMOUR : BOSS_COLUMN_OPEN;
  });
}

function withRegion(region, options) {
  const memory = bossEntered();
  installRegion(memory, region, options);
  placeBand(memory, 16);
  return memory;
}

// One shot at `cell` through UPDATE; returns what the controller decided.
function fire(memory, cell) {
  shootAt(memory, cell);
  const hitsBefore = memory[STATS_HITS];
  call(memory, lbl("boss_update"));
  return { counted: memory[STATS_HITS] - hitsBefore };
}

// Frames with no shot: the draw queue drains and the ring's sparks expire.
function settle(memory, frames = 8) {
  for (let frame = 0; frame < frames; frame += 1) call(memory, lbl("boss_update"));
}

// Destroys module `index` through a column in which it is the front module,
// then runs the next frame, whose tick checks the exposure (§5.15.6 item 2).
function kill(memory, region, index) {
  const module = region.modules[index];
  const map = columnMap(memory);
  const column = [...Array(module.width).keys()].map((i) => module.x + i).find((c) => map[c] === index);
  assert.notEqual(column, undefined, `${module.name} is the front of none of its columns`);
  for (let guard = 0; guard < 400 && hp(memory, index) > 0; guard += 1) fire(memory, column);
  assert.equal(hp(memory, index), 0, `${module.name} did not die`);
  call(memory, lbl("boss_update"));
}

// ---------------------------------------------------------------------------
// The install order and the charset (§5.13.5, §5.13.4; Q-B5)
// ---------------------------------------------------------------------------

test("the install order: the controller's hit points before the column map that reads them (§5.13.5)", () => {
  const memory = bossEntered();
  const init = entryTrace.indexOf("init");
  assert.ok(init >= 0, "the install never ran the controller's init");
  assert.ok(entryTrace.indexOf("map") > init, "the column map was built before the hit points were set");
  assert.ok(entryTrace.indexOf("prepare") > init);
  // With the order wrong every module reads dead and its columns hull.
  assert.deepEqual(columnMap(memory), expectedMap(region1, memory));
  // RE-POINTED (decision H): every uncovered module is the front of a column
  // (S4a-i's region 1: every module but its covered core).
  region1.modules.forEach((module, index) => {
    assert.ok(columnMap(memory).includes(index) || module.cover !== 0, `${module.name} has no column`);
  });
});

test("the region's charset at $0C00: its glyphs as read, the divider's codes 0-6 copied from the gameplay charset", () => {
  const memory = bossEntered();
  const charset = label("main", "CHARSET");
  assert.deepEqual([...memory.subarray(0x0c00, 0x0c00 + 56)], [...memory.subarray(charset, charset + 56)]);
  assert.deepEqual([...memory.subarray(0x0c38, 0x0c00 + region1.charsetBytes)],
    [...region1.runs.charset.data.subarray(0x38, region1.charsetBytes)]);
  assert.equal(memory[charset], 0, "code 0, the blank band cell, is blank");
});

test("the band DLI: the region's charset under the HUD's last line, the gameplay charset back for the ring", () => {
  const memory = bossEntered();
  const writes = [];
  const hooks = { write: (address, value) => { writes.push([address, value]); return undefined; } };
  const phase = label("main", "loader_dli_phase");
  memory[phase] = 0;
  const phases = [0, 1, 2].map(() => {
    const before = writes.length;
    nmi(memory, lbl("boss_dli"), { hooks });
    return writes.slice(before);
  });
  const afterWsync = (list) => list.slice(list.findIndex(([r]) => r === 0xd40a) + 1);
  assert.deepEqual(afterWsync(phases[0])[0], [0xd409, 0x0c], "phase 0: CHBASE $0C first after WSYNC");
  // RE-POINTED M5b-S4b (owner decision QA2): phase 1 writes COLPF3 first, in
  // the horizontal blank, so the lasers' fifth-player beam switches colour
  // exactly at the band's edge; the gameplay charset follows at once, still
  // before the ring's first line fetches a glyph.
  assert.deepEqual(afterWsync(phases[1])[0], [0xd019, label("main", "GAMEPLAY_COLPF3")],
    "phase 1: COLPF3 first (QA2)");
  assert.deepEqual(afterWsync(phases[1])[1], [0xd409, label("main", "CHARSET") >> 8],
    "phase 1: the gameplay charset next, before the ring's first line");
  assert.deepEqual(phases[2].filter(([r]) => r === 0xd409), [[0xd409, label("main", "HUD_CHARSET") >> 8]],
    "phase 2: the HUD's charset");
  assert.equal(memory[phase], 0, "three phases a frame");
});

// ---------------------------------------------------------------------------
// The column map (§5.13.2 item 3)
// ---------------------------------------------------------------------------

test("the column map: the front intact module per column, and a shot meets it under every band position", () => {
  for (const p of [0, 5, 17, 31, 48, 63]) {
    const memory = withRegion(region1);
    placeBand(memory, p);
    const map = columnMap(memory);
    assert.deepEqual(map, expectedMap(region1, memory));
    const { left, right } = visibleCells(p);
    for (let cell = left; cell <= right; cell += 1) {
      if (map[cell] === BOSS_COLUMN_OPEN || map[cell] === BOSS_COLUMN_ARMOUR) continue;
      memory[lbl("_boss_hit_module")] = 0xee;
      fire(memory, cell);
      assert.equal(memory[lbl("_boss_hit_module")], map[cell], `p ${p}: column ${cell}`);
      assert.equal(memory[lbl("_boss_hit_cell")], cell);
    }
  }
});

test("exposure is re-evaluated on every kill, and the column-local rebuild equals a full rebuild", () => {
  const memory = withRegion(layered, { level: 9 });
  const n = layered.modules.length;
  const exposedModel = () => layered.modules.reduce((value, module, i) => {
    const alive = layered.modules.reduce((m, _, j) => m | (hp(memory, j) > 0 ? 1 << j : 0), 0);
    return hp(memory, i) > 0 && (module.cover & alive) === 0 ? value | (1 << i) : value;
  }, 0);
  assert.equal(mask16(memory, "_boss_exposed"), exposedModel(), "at the install");
  const index = new Map(layered.modules.map((module, i) => [module.name, i]));
  let killed = 0;
  for (const name of ["gun-a", "plate", "salvo", "gun-b", "beam", "e2", "e3", "e4", "core"]) {
    const before = mask16(memory, "_boss_exposed");
    kill(memory, layered, index.get(name));
    killed += 1;
    const after = exposedModel();
    if (killed < n) {
      const alive = layered.modules.reduce((m, _, j) => m | (hp(memory, j) > 0 ? 1 << j : 0), 0);
      assert.equal(mask16(memory, "_boss_exposed") & alive, after,
        `after ${name}: the live exposed set is cover & alive == 0`);
      assert.equal(mask16(memory, "_boss_newly"), after & ~before, `after ${name}: newly exposed`);
    }
    // The map as rebuilt for the dead module's columns only ...
    const local = columnMap(memory);
    // ... is the map a full rebuild gives.
    for (let c = 0; c < BOSS_BAND_COLUMNS; c += 1) call(memory, lbl("boss_column_at"), { x: c });
    assert.deepEqual(local, columnMap(memory), `after ${name}`);
    assert.deepEqual(local, expectedMap(layered, memory), `after ${name}`);
  }
});

test("an exposed module's open look is drawn the moment its cover group falls (style 2)", () => {
  const memory = withRegion(bastion);
  const index = new Map(bastion.modules.map((module, i) => [module.name, i]));
  const core = bastion.modules[index.get("core")];
  const closed = cellsOf(memory, core);
  for (const name of ["gun-left", "emitter"]) {
    kill(memory, bastion, index.get(name));
    settle(memory);
    assert.deepEqual(cellsOf(memory, core), closed, `the core opened after ${name} alone`);
  }
  kill(memory, bastion, index.get("gun-right"));
  assert.ok(mask16(memory, "_boss_exposed") & (1 << index.get("core")));
  settle(memory);
  assert.deepEqual(cellsOf(memory, core), bastion.openLooks.get(index.get("core")), "the core's open look");
});

// ---------------------------------------------------------------------------
// Absorbed hits (Q-B7) and damage stages (decision C)
// ---------------------------------------------------------------------------

test("a covered module and the hull absorb a shot: spent, no damage, not a hit for accuracy (Q-B7)", () => {
  const region1 = bastion;
  const memory = withRegion(region1);
  const index = new Map(region1.modules.map((module, i) => [module.name, i]));
  const coreIndex = index.get("core");
  const map = columnMap(memory);
  const coreColumn = map.indexOf(coreIndex);
  assert.ok(coreColumn >= 0, "the core is the front module of a column beside the emitter");
  const active = label("main", "FIGHTER_PROJECTILE_ACTIVE");
  const hpBefore = region1.modules.map((_, i) => hp(memory, i));
  assert.equal(fire(memory, coreColumn).counted, 0, "a covered module's absorb is not a hit");
  assert.equal(memory[active], 0, "the absorbed shot is spent");
  assert.equal(hp(memory, coreIndex), hpBefore[coreIndex]);
  const hull = map.findIndex((value, c) => value === BOSS_COLUMN_ARMOUR && c >= 20 && c <= 40);
  assert.equal(fire(memory, hull).counted, 0, "a hull absorb is not a hit");
  assert.equal(memory[active], 0);
  assert.deepEqual(region1.modules.map((_, i) => hp(memory, i)), hpBefore);
  // An exposed module: one hit point and one hit.
  assert.equal(fire(memory, map.indexOf(index.get("gun-left"))).counted, 1);
  assert.equal(hp(memory, index.get("gun-left")), hpBefore[index.get("gun-left")] - 1);
  // A covered module of the layered boss, in front in its own columns.
  const fixture = withRegion(layered, { level: 9 });
  const plate = layered.modules.findIndex((module) => module.name === "plate");
  const plateColumn = columnMap(fixture).indexOf(plate);
  assert.equal(fire(fixture, plateColumn).counted, 0);
  assert.equal(hp(fixture, plate), record(layered, plate, "hp"));
});

// RE-POINTED (decisions H, J; §5.15.6): read on the core boss (Bastion), each
// look after the queue drew it; a capped emitter stages at the capped plate's
// thresholds; gone is decision L's look - the cavity on the module's rows
// inside the hull, background below (S4a-i: the kind's bay).
test("the four damage stages: intact, cracked (+K), broken (+2K), gone (cavity inside the hull, background below)", () => {
  const region1 = bastion;
  const memory = withRegion(region1);
  const K = region1.stageStep;
  const index = new Map(region1.modules.map((module, i) => [module.name, i]));
  for (const name of ["gun-left", "plate-right", "gun-right", "emitter", "core"]) {
    const i = index.get(name);
    const module = region1.modules[i];
    const intact = module.open ? region1.openLooks.get(i) : cellsOf(memory, module);
    if (name === "core") assert.deepEqual(cellsOf(memory, module), intact, "the core is open");
    const capped = memory[lbl("_boss_kind") + i] === BOSS_KIND.armour && module.kind === "emitter";
    const [cracked, broken] = capped ? [region1.capped.cracked, region1.capped.broken] : module.thresholds;
    const column = columnMap(memory).indexOf(i);
    const stages = [];
    while (hp(memory, i) > 0) {
      fire(memory, column);
      const now = hp(memory, i);
      if (now === 0) break;
      settle(memory, 3);
      const expected = now <= broken ? 2 : now <= cracked ? 1 : 0;
      assert.deepEqual(codesOf(memory, module), intact.map((code) => code + expected * K),
        `${name} at ${now} HP is stage ${expected}`);
      stages.push(expected);
    }
    assert.ok(stages.includes(1) && stages.includes(2), `${name} showed both damage stages`);
    settle(memory);
    codesOf(memory, module).forEach((code, k) => {
      const expected = Math.floor(k / module.width) < module.cavityRows ? region1.cavity : 0;
      assert.equal(code, expected, `${name} gone: cell ${k}`);
    });
    if (name === "emitter") {
      // The guns are down: the core is exposed now and shows its open look.
      assert.deepEqual(codesOf(memory, region1.modules[index.get("core")]),
        region1.openLooks.get(index.get("core")));
    }
  }
});

// ---------------------------------------------------------------------------
// The laser tier (decisions B, 8), the defeat (decision A), the HP scale (Q-B3)
// ---------------------------------------------------------------------------

// RE-POINTED (owner answer, plan §5.15.6 item 6): every emitter slot was capped
// armour until the lasers existed. RE-POINTED M5b-S4b: the lasers exist, so
// decision 8's tier is back - 1 / 1 / 2 / 4 slots enabled on levels 1 / 4 / 5 / 9.
test("emitter slots: decision 8's tier - 1 / 1 / 2 / 4 slots on levels 1 / 4 / 5 / 9, the rest capped armour", () => {
  for (const [level, enabled] of [[1, 1], [4, 1], [5, 2], [9, 4]]) {
    const memory = withRegion(layered, { level });
    let weapons = 0;
    layered.modules.forEach((module, i) => {
      const kind = memory[lbl("_boss_kind") + i];
      if (module.kind === "emitter") {
        const on = module.slot <= enabled;
        assert.equal(kind, on ? BOSS_KIND.emitter : BOSS_KIND.armour, `level ${level}: ${module.name}`);
        if (!on) {
          assert.equal(hp(memory, i), layered.capped.hp, `level ${level}: a capped plate's hit points`);
          assert.ok(cellsOf(memory, module).every((code) => code === layered.capped.code),
            `level ${level}: ${module.name} shows the capped plate`);
        } else {
          assert.equal(hp(memory, i), record(layered, i, "hp"));
        }
      } else {
        assert.equal(kind, BOSS_KIND[module.kind]);
      }
      if (memory[lbl("_boss_kind") + i] !== BOSS_KIND.armour) weapons += 1;
    });
    assert.equal(memory[lbl("_boss_weapons_left")], weapons, `level ${level}`);
    assert.equal(weapons, 4 + enabled, `level ${level}: two guns, the salvo and the core`);
  }
});

test("the defeat: the last weapon module's death starts the chain, armour left standing (decision A)", () => {
  const memory = withRegion(layered, { level: 1 });
  const index = new Map(layered.modules.map((module, i) => [module.name, i]));
  const order = ["gun-a", "plate", "salvo", "gun-b", "beam", "core"];
  for (const name of order) {
    assert.equal(memory[lbl("_boss_phase")], 0, `still the fight before ${name}`);
    kill(memory, layered, index.get(name));
  }
  assert.equal(memory[lbl("_boss_phase")], 2, "the chain");
  for (const name of ["e2", "e3", "e4"]) {
    assert.ok(hp(memory, index.get(name)) > 0, `${name}, capped armour, still stands`);
  }
  assert.equal(memory[lbl("_boss_weapons_left")], 0);
  // The core boss (Bastion): the core's death is the defeat with both plates
  // standing.
  const shipped = withRegion(bastion);
  const byName = new Map(bastion.modules.map((module, i) => [module.name, i]));
  for (const name of ["gun-left", "emitter", "gun-right"]) kill(shipped, bastion, byName.get(name));
  assert.equal(shipped[lbl("_boss_phase")], 0);
  kill(shipped, bastion, byName.get("core"));
  assert.equal(shipped[lbl("_boss_phase")], 2);
  assert.ok(hp(shipped, byName.get("plate-left")) > 0 && hp(shipped, byName.get("plate-right")) > 0);
});

test("the hit-point scale per difficulty from boss_def: x 3/4, x 1, x 5/4 (Q-B3)", () => {
  const coreIndex = bastion.modules.findIndex((module) => module.name === "core");
  const scaled = [0, 1, 2].map((difficulty) => {
    const memory = withRegion(bastion, { difficulty });
    return [hp(memory, coreIndex), memory[lbl("_boss_crack") + coreIndex], memory[lbl("_boss_break") + coreIndex]];
  });
  assert.deepEqual(scaled, [[18, 12, 6], [24, 16, 8], [30, 20, 10]]);
});

// ---------------------------------------------------------------------------
// The fire countdown (§5.13.2 item 6): the policy only - S4a-ii fires
// ---------------------------------------------------------------------------

test("one fire countdown: only armed modules fire, one at a time, never under the cooldown, O(1) a frame", () => {
  const memory = withRegion(layered, { level: 9, difficulty: 1 });
  const index = new Map(layered.modules.map((module, i) => [module.name, i]));
  const cooldown = layered.tables[BOSS_TABLE.fireCooldown];
  const fired = [];
  let idleWorst = 0;
  for (let frame = 0; frame < 600; frame += 1) {
    if (frame === 300) kill(memory, layered, index.get("gun-a"));     // exposes the plate (armour)
    const armed = mask16(memory, "_boss_armed");
    const cycles = call(memory, lbl("_boss_c_tick")).cycles;
    const module = memory[lbl("_boss_fire_module")];
    // RE-POINTED (§5.15.6 item 2): the tick after a kill runs the exposure
    // check - that frame is not an idle one.
    if (memory[lbl("_boss_heavy")] !== 0) continue;
    if (module !== 0xff) {
      assert.ok(armed & (1 << module), `frame ${frame}: ${layered.modules[module].name} fired unarmed`);
      fired.push({ frame, module });
    } else {
      idleWorst = Math.max(idleWorst, cycles);
    }
  }
  assert.ok(fired.length >= 6, `only ${fired.length} firings in 600 frames`);
  for (let i = 1; i < fired.length; i += 1) {
    assert.ok(fired[i].frame - fired[i - 1].frame >= cooldown, "two firings closer than the cooldown");
  }
  const names = new Set(fired.map(({ module }) => layered.modules[module].name));
  assert.ok(names.has("gun-a") && names.has("gun-b"), "the exposed guns take turns");
  for (const covered of ["salvo", "core", "beam"]) assert.ok(!names.has(covered), `${covered} fired while covered`);
  assert.ok(idleWorst <= 120, `a frame without a firing costs ${idleWorst} native cycles`);
});
