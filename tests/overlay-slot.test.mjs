// M5a-S1 — overlay slot A (docs/plans/m5-loading-boss.md §4.1-4.2, §4.7).
//
// The capital phase's code is regrouped contiguous in BROADSIDE; its first
// 2,048 B are slot A, which a later overlay (the boss) may occupy and which the
// sector reader's capital restore run puts back. Every resident call into the
// capital group goes through the window's vector table. These are the build and
// source contracts; the reader's run read, restore and failure paths are driven
// on the 6502 harness in tests/sector-reader.test.mjs.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative));
const manifest = JSON.parse(read("build/manifest.json").toString("utf8"));

function viceLabels(relative) {
  const labels = new Map();
  for (const line of read(relative).toString("utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match && !labels.has(match[2])) labels.set(match[2], Number.parseInt(match[1], 16));
  }
  return labels;
}
const mainLabels = viceLabels("build/void-strike-65.lbl");
const readerLabels = viceLabels("build/sector-reader.lbl");

const SECTOR_BYTES = 128;
const ATR_HEADER_BYTES = 16;
const SLOT_A_BYTES = 2048;
const OVERLAY_BASE_SECTOR = 512;
const LIGHT_KERNEL_VECTOR_BYTES = 5 * 3;

// The capital group's entry points from outside it (plan §4.1's "~20", found by
// call graph: the plan's other names are calls inside the group).
const CAPITAL_ENTRIES = [
  "init_broadside", "update_broadside", "tick_capital_explosions", "tick_launch_flashes",
  "update_engine_animation", "handle_player_hull_contact", "render_launch_flashes",
  "render_capital_explosions", "update_sector_completion", "restore_active_muzzles",
  "prepare_next_hull_row", "scroll_hull_columns",
];
// Capital-group routines that stay resident outside slot A in v1 and are
// reached only from inside the group (or through the table): the hull row
// generator and muzzles in BROADSIDE, the hull scroll in ENTITY_CODE, the shell
// collision helper in PICKUP_CODE. They may call into the slot directly.
const RESIDENT_CAPITAL_ROUTINES = [
  "init_broadside", "generate_corridor_row", "draw_hull_row",
  "scroll_hull_columns", "scroll_hull_complete_done", "scroll_hull_complete_scroll",
  "scroll_hull_active", "scroll_hull_columns_copy", "scroll_hull_copy_row",
  "scroll_hull_copy_source_ready", "scroll_hull_columns_advance_scene",
  "scroll_hull_divider_source", "commit_prepared_hull_row", "prepare_next_hull_row",
  "prepare_hull_cells", "player_inside_universal_hull_corridor",
  "capital_shell_collision_flags_shared",
];

const slotA = manifest.overlays?.slotA;
const inSlot = (address) => slotA !== undefined &&
  address >= slotA.address && address < slotA.endExclusive;

// Every `jsr`/`jmp`/operand reference in the assembly sources, with the
// global label it sits under. Local (@) and anonymous labels never open a
// routine; equates (`name = *`) do not either, which is how main.s marks the
// slot without fencing the routine below it.
function sourceReferences() {
  const files = ["src/main.s", ...fs.readdirSync(path.join(root, "src/hybrid"))
    .filter((name) => name.endsWith(".s")).map((name) => `src/hybrid/${name}`),
  ...["integration-glue.s", "capital-player-collision.s", "encounter-director.s"]
    .map((name) => `src/${name}`)];
  const references = [];
  for (const file of files) {
    let owner = null;
    read(file).toString("utf8").split(/\r?\n/).forEach((raw, index) => {
      const line = raw.replace(/;.*$/, "");
      const label = /^([A-Za-z_]\w*):/.exec(line);
      if (label) owner = label[1];
      const body = label ? line.slice(label[0].length) : line;
      const instruction = /^\s+([a-z]{3})\s+([A-Za-z_]\w*)/.exec(body);
      if (instruction) {
        references.push({ file, line: index + 1, owner, mnemonic: instruction[1],
          target: instruction[2] });
      }
    });
  }
  return references;
}

test("the capital-phase entry points are reached only through the vector table", () => {
  const vectors = manifest.overlays?.capitalVectors;
  assert.ok(vectors, "the manifest declares no capital vector table");
  assert.deepEqual(vectors.table.map(({ target }) => target), CAPITAL_ENTRIES);
  // The table follows the Light kernel's five frozen vectors in the window.
  assert.equal(vectors.address, manifest.lightKernel.address + LIGHT_KERNEL_VECTOR_BYTES);
  const window = read("build/light-kernel.bin");
  vectors.table.forEach(({ target, address, targetAddress }, index) => {
    assert.equal(address, vectors.address + index * 3, `${target} is not entry ${index}`);
    assert.equal(targetAddress, mainLabels.get(target), `${target} vector points elsewhere`);
    const offset = address - manifest.lightKernel.address;
    assert.equal(window[offset], 0x4c, `entry ${index} is not a JMP`);
    assert.equal(window.readUInt16LE(offset + 1), targetAddress,
      `entry ${index} does not reach ${target}`);
  });

  const group = new Set(RESIDENT_CAPITAL_ROUTINES);
  for (const name of group) assert.ok(mainLabels.has(name), `${name} is not a main label`);
  const insideGroup = (owner) => owner !== null &&
    (group.has(owner) || inSlot(mainLabels.get(owner) ?? -1));
  const strays = sourceReferences().filter(({ target, owner }) =>
    CAPITAL_ENTRIES.includes(target) && !insideGroup(owner));
  assert.deepEqual(strays.map(({ file, line, owner, target }) =>
    `${file}:${line} ${owner} -> ${target}`), [],
  "resident code outside the capital group calls a capital entry directly");
  // main.s calls each entry through its CAPITAL_VECTOR_* constant.
  const source = read("src/main.s").toString("utf8");
  for (const { name } of vectors.table) {
    assert.match(source, new RegExp(`^\\s+(jsr|jmp) ${name}\\b`, "m"), `${name} is never called`);
  }
});

test("nothing outside the capital group names a label inside slot A", () => {
  assert.ok(slotA, "the manifest declares no slot A");
  const group = new Set(RESIDENT_CAPITAL_ROUTINES);
  const strays = sourceReferences().filter(({ target, owner }) => {
    const address = mainLabels.get(target);
    if (address === undefined || !inSlot(address)) return false;
    return !(owner !== null && (group.has(owner) || inSlot(mainLabels.get(owner) ?? -1)));
  });
  assert.deepEqual(strays.map(({ file, line, owner, target }) =>
    `${file}:${line} ${owner} -> ${target}`), [],
  "code outside the capital group reaches into slot A without the vector table");
});

test("slot A is 16 whole sectors of BROADSIDE starting at update_broadside", () => {
  assert.equal(slotA.address, mainLabels.get("update_broadside"));
  assert.equal(slotA.address, mainLabels.get("capital_slot_a"));
  assert.equal(slotA.bytes, SLOT_A_BYTES);
  assert.equal(slotA.endExclusive, mainLabels.get("capital_slot_a_end"));
  // It ends inside the capital group: past the contact routine's head, before
  // the first non-capital byte after it.
  assert.ok(slotA.endExclusive > mainLabels.get("handle_player_hull_contact"));
  assert.ok(slotA.endExclusive <= mainLabels.get("white_starfield_broadside_abi_pad"));
  // The routines the regrouping moved out of the capital run now precede it.
  for (const name of ["apply_player_damage", "update_hud_status",
    "update_weapon_booster_hud", "show_weapon_booster_hud"]) {
    assert.ok(mainLabels.get(name) < slotA.address, `${name} is still inside slot A`);
  }
  // BROADSIDE is byte-neutral and the integration pins hold.
  assert.equal(mainLabels.get("__BROADSIDE_SIZE__"), 0x19fd);
  assert.equal(mainLabels.get("free_broadside_slot"), 0x76a7);
});

test("the capital restore run on the disk is the resident image of slot A", () => {
  const [run] = manifest.overlays.runs;
  assert.equal(manifest.overlays.runs.length, 1);
  assert.equal(run.name, "capital-slot-a");
  assert.equal(run.startSector, OVERLAY_BASE_SECTOR);
  assert.equal(run.sectors, SLOT_A_BYTES / SECTOR_BYTES);
  assert.equal(run.destination, slotA.address);
  // Above the 12 x 16 sectors reserved for levels from 320, inside the disk.
  assert.ok(run.startSector >= 320 + 12 * 16);
  assert.ok(run.startSector + run.sectors - 1 <= 720);

  const broadside = read("build/broadside-runtime.bin");
  const resident = broadside.subarray(slotA.address - manifest.broadsideRuntime.runAddress,
    slotA.endExclusive - manifest.broadsideRuntime.runAddress);
  const atr = read("dist/void-strike-65.atr");
  const onDisk = atr.subarray(ATR_HEADER_BYTES + (run.startSector - 1) * SECTOR_BYTES,
    ATR_HEADER_BYTES + (run.startSector - 1 + run.sectors) * SECTOR_BYTES);
  assert.ok(onDisk.equals(resident), "the restore run differs from the resident slot bytes");
  assert.ok(read(`build/${run.file}`).equals(resident));
});

test("the reader's overlay directory and table image match the disk and the window", () => {
  const reader = read("build/sector-reader.bin");
  const base = manifest.sectorReader.address;
  const directory = reader.subarray(readerLabels.get("overlay_directory") - base,
    readerLabels.get("overlay_directory") - base + 9 * 5);
  const [run] = manifest.overlays.runs;
  assert.deepEqual([...directory.subarray(0, 5)], [run.startSector & 0xff,
    run.startSector >> 8, run.sectors, run.destination & 0xff, run.destination >> 8]);
  // RE-POINTED 2026-10-03 (M5a-S2): entries 6-8 are the level summary's
  // (art, save record, module; tests/level-summary-build.test.mjs pins them),
  // and the directory grew to nine. Entries 1-5 stay M5b's, empty.
  assert.ok(directory.subarray(5, 6 * 5).every((byte) => byte === 0),
    "entries 1-5 must read as not on this disk until M5b fills them");

  const vectors = manifest.overlays.capitalVectors;
  const image = reader.subarray(readerLabels.get("capital_vector_image") - base,
    readerLabels.get("capital_vector_image") - base + vectors.bytes);
  const window = read("build/light-kernel.bin");
  const tableOffset = vectors.address - manifest.lightKernel.address;
  assert.ok(image.equals(window.subarray(tableOffset, tableOffset + vectors.bytes)),
    "the reader's table image is not the window's capital table");
  // Reader vectors: $A006 is the run read now, the 4.9 drain moved to $A009.
  assert.equal(reader.readUInt16LE(7), readerLabels.get("sector_reader_read_run"));
  assert.equal(reader.readUInt16LE(10), readerLabels.get("sector_reader_drain_ready"));
});

// RE-POINTED 2026-10-03 (M5a-S2, Q3: "S2 moves every text to disk"): the four
// lines left the reader with the loader screen and travel in every region's
// summary art run, generated from the same asset.
test("the AI pool holds exactly four lines generated from the assets source", () => {
  const source = JSON.parse(read("assets/text/loader-ai-lines.json").toString("utf8"));
  assert.equal(source.lines.length, 4);
  const { layout, runs } = manifest.levelSummary.art;
  for (const run of runs) {
    const bytes = read(`build/${run.file}`);
    const lines = Array.from({ length: 4 }, (_, index) =>
      bytes.subarray(layout.ai + index * 42 + 2, layout.ai + index * 42 + 40).toString("latin1"));
    assert.deepEqual(lines, source.lines.map((line) => line.padEnd(38, " ")),
      `region ${run.region}'s run does not carry the asset's four lines`);
  }
  // Creative text is an asset (LICENSE-ASSETS, "Mixed files"): no line is
  // typed into src/, and the reader no longer carries a pool at all.
  const asm = read("src/hybrid/sector-reader.s").toString("utf8");
  assert.doesNotMatch(asm, /ai_line_pool|loader-ai-lines\.inc/);
  for (const line of source.lines) assert.ok(!asm.includes(line), `"${line}" is typed into src/`);
  assert.ok(!readerLabels.has("ai_line_pool"), "the reader still links an AI pool");
});
