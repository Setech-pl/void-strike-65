import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  initialiseRows,
  initialiseRuntime,
  requiredLabel,
  runRoutine,
} from "./weapon-pickup-runtime.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDirectory, "..");
const dividerAddress = 0x4028;
const screenColumns = 40;
const ringAddress = 0x8140;
const ringRows = 27;
const ringEnd = ringAddress + ringRows * screenColumns;

function screenResidue(memory) {
  const cells = [];
  for (let address = dividerAddress; address < dividerAddress + screenColumns; address += 1) {
    if (memory[address] !== 0) cells.push({ address, value: memory[address] });
  }
  for (let address = ringAddress; address < ringEnd; address += 1) {
    if (memory[address] !== 0) cells.push({ address, value: memory[address] });
  }
  return cells;
}

function rowState(memory, labels, address) {
  if (address >= dividerAddress && address < dividerAddress + screenColumns) {
    return { logicalRow: 0, physicalRow: null };
  }
  const lo = requiredLabel(labels, "PLAYFIELD_ROW_LO");
  const hi = requiredLabel(labels, "PLAYFIELD_ROW_HI");
  for (let index = 0; index < ringRows; index += 1) {
    const base = memory[lo + index] | memory[hi + index] << 8;
    if (address >= base && address < base + screenColumns) {
      return { logicalRow: index + 1,
        physicalRow: Math.floor((base - ringAddress) / screenColumns) };
    }
  }
  return { logicalRow: null, physicalRow: null };
}

function movementAt(index) {
  const movement = Math.floor(index / 3) % 4;
  if (movement === 0) return { id: "STATIONARY", playerX: 124, playerDeltaX: 0 };
  if (movement === 1) return { id: "LEFT", playerX: 200 - index % 32 * 4,
    playerDeltaX: -4 };
  if (movement === 2) return { id: "RIGHT", playerX: 48 + index % 32 * 4,
    playerDeltaX: 4 };
  const phase = index % 32;
  return phase < 16
    ? { id: "REVERSAL", playerX: 60 + phase * 8, playerDeltaX: 8 }
    : { id: "REVERSAL", playerX: 60 + (31 - phase) * 8, playerDeltaX: -8 };
}

function modeAt(index) {
  const mode = index % 3;
  if (mode === 0) return { id: "NORMAL", kind: 0x01 };
  if (mode === 1) return { id: "RAPID", kind: 0x01 };
  const spreadKinds = [0x11, 0x41, 0x21, 0x11];
  return { id: "SPREAD", kind: spreadKinds[Math.floor(index / 3) % spreadKinds.length] };
}

function configureCollision(memory, labels, projectileX) {
  memory[requiredLabel(labels, "ENEMY_ACTIVE")] = 1;
  memory[requiredLabel(labels, "ENEMY_ARCHETYPE")] = 0;
  memory[requiredLabel(labels, "ENEMY_MEMBER_STATE")] = 1;
  memory[requiredLabel(labels, "ENEMY_LIVE_COUNT")] = 1;
  memory[requiredLabel(labels, "ENEMY_HP")] = 3;
  memory[requiredLabel(labels, "ENEMY_PENDING_DAMAGE")] = 0;
  memory[requiredLabel(labels, "ENEMY_PENDING_SOURCE")] = 5;
  memory[requiredLabel(labels, "ENEMY_X")] = projectileX;
  memory[requiredLabel(labels, "ENEMY_Y")] = 170;
  memory[requiredLabel(labels, "ENTITY_ACTIVE_MASK")] = 0;
}

function resetCollision(memory, labels) {
  memory[requiredLabel(labels, "ENEMY_ACTIVE")] = 0;
  memory[requiredLabel(labels, "ENEMY_MEMBER_STATE")] = 0;
  memory[requiredLabel(labels, "ENEMY_LIVE_COUNT")] = 0;
  memory[requiredLabel(labels, "ENTITY_ACTIVE_MASK")] = 0;
}

export function executePairShotStaleTrace({
  root = defaultRoot, artifact = "xex", shots = 1200,
} = {}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact);
  const label = (name) => requiredLabel(labels, name);
  const active = label("FIGHTER_PROJECTILE_ACTIVE");
  const projectileX = label("FIGHTER_PROJECTILE_X");
  const projectileY = label("FIGHTER_PROJECTILE_Y");
  const previousY = label("FIGHTER_PROJECTILE_PREV_Y");
  const lifetime = label("FIGHTER_PROJECTILE_LIFETIME");
  const rendered = label("FIGHTER_PROJECTILE_RENDERED");
  const screenLow = label("FIGHTER_PROJECTILE_SCREEN_LO");
  const screenHigh = label("FIGHTER_PROJECTILE_SCREEN_HI");
  const backing = label("FIGHTER_PROJECTILE_BACKUP_TOP");
  const playerXAddress = label("player_x");
  const playerYAddress = label("player_y");
  const rowLow = label("PLAYFIELD_ROW_LO");
  const rowHigh = label("PLAYFIELD_ROW_HI");
  const records = [];
  const releaseReasons = ["top-bound", "expiry", "collision", "test-release"];

  for (let shot = 0; shot < shots; shot += 1) {
    const head = shot % ringRows;
    const movement = movementAt(shot);
    const mode = modeAt(shot);
    const releaseReason = releaseReasons[Math.floor(shot / 12) % releaseReasons.length];
    runRoutine(memory, labels, "init_fighter_projectiles");
    initialiseRows(memory, labels, head);
    memory.fill(0, dividerAddress, dividerAddress + screenColumns);
    memory.fill(0, ringAddress, ringEnd);
    resetCollision(memory, labels);
    memory[playerXAddress] = movement.playerX;
    const initialY = releaseReason === "top-bound" ? 20 :
      releaseReason === "collision" ? 182 : 100;
    memory[playerYAddress] = initialY + 2;
    runRoutine(memory, labels, "allocate_player_fighter_projectile_one", { a: mode.kind });
    memory[lifetime] = releaseReason === "expiry" ? 1 : 64;
    if (releaseReason === "collision") configureCollision(memory, labels,
      memory[projectileX]);

    runRoutine(memory, labels, "render_fighter_projectile_overlays");
    const oldAddress = memory[screenLow] | memory[screenHigh] << 8;
    const oldGlyph = memory[oldAddress];
    const oldRow = rowState(memory, labels, oldAddress);
    const backingByte = memory[backing];
    const recycledBase = memory[rowLow + ringRows - 1] |
      memory[rowHigh + ringRows - 1] << 8;

    runRoutine(memory, labels, "update_fighter_projectiles");
    const activeAfterUpdate = memory[active];
    runRoutine(memory, labels, "rotate_playfield_rows");
    const ringHeadAfter = Math.floor(((memory[rowLow] | memory[rowHigh] << 8) - ringAddress) /
      screenColumns);
    runRoutine(memory, labels, "erase_fighter_projectile_overlays");
    const eraseValue = memory[oldAddress];
    const residueAfterErase = screenResidue(memory);
    let newAddress = null;
    if (activeAfterUpdate !== 0) {
      runRoutine(memory, labels, "render_fighter_projectile_overlays");
      newAddress = memory[screenLow] | memory[screenHigh] << 8;
      memory[active] = 0;
      runRoutine(memory, labels, "erase_fighter_projectile_overlays");
    }
    const finalResidue = screenResidue(memory);
    const copiedAddress = oldAddress >= dividerAddress &&
      oldAddress < dividerAddress + screenColumns
      ? recycledBase + oldAddress - dividerAddress : null;
    const scrollRows = [];
    if (copiedAddress !== null && finalResidue.some(({ address }) => address === copiedAddress)) {
      scrollRows.push(rowState(memory, labels, copiedAddress).logicalRow);
      for (let step = 0; step < 3; step += 1) {
        runRoutine(memory, labels, "rotate_playfield_rows");
        scrollRows.push(rowState(memory, labels, copiedAddress).logicalRow);
      }
    }
    records.push({
      shot, mode: mode.id, movement: movement.id, playerX: movement.playerX,
      playerDeltaX: movement.playerDeltaX, releaseReason, ringHeadBefore: head,
      ringHeadAfter, slot: 0, x: memory[projectileX], y: memory[projectileY],
      previousY: memory[previousY], oldAddress, newAddress, oldLogicalRow: oldRow.logicalRow,
      oldPhysicalRow: oldRow.physicalRow, backingByte, oldGlyph, eraseAddress: oldAddress,
      eraseValue, renderedAfterErase: memory[rendered], activeAfterUpdate,
      copiedAddress, residueAfterErase, finalResidue, scrollRows,
      lostErase: eraseValue !== backingByte,
      restoreMismatch: finalResidue.length,
      staleCells: finalResidue.length,
      ghostGlyphs: finalResidue.filter(({ value }) => value === oldGlyph).length,
    });
  }

  const sum = (name) => records.reduce((total, record) => total + record[name], 0);
  const byMovement = Object.fromEntries(["STATIONARY", "LEFT", "RIGHT", "REVERSAL"].map((id) => {
    const selected = records.filter((record) => record.movement === id);
    return [id, { shots: selected.length,
      staleCells: selected.reduce((sum, record) => sum + record.staleCells, 0) }];
  }));
  const byMode = Object.fromEntries(["NORMAL", "RAPID", "SPREAD"].map((id) => {
    const selected = records.filter((record) => record.mode === id);
    return [id, { shots: selected.length,
      staleCells: selected.reduce((sum, record) => sum + record.staleCells, 0) }];
  }));
  const byRelease = Object.fromEntries(releaseReasons.map((id) => {
    const selected = records.filter((record) => record.releaseReason === id);
    return [id, { shots: selected.length,
      staleCells: selected.reduce((sum, record) => sum + record.staleCells, 0) }];
  }));
  return {
    schema: "void-strike-65.pairshot-stale-trace.v1", artifact, shots,
    manifestArtifact: manifest.artifacts[`void-strike-65.${artifact}`],
    summary: { staleCells: sum("staleCells"), ghostGlyphs: sum("ghostGlyphs"),
      restoreMismatches: sum("restoreMismatch"), lostErases: sum("lostErase"),
      byMovement, byMode, byRelease },
    firstFailure: records.find((record) => record.staleCells > 0) ?? null,
    records,
  };
}

function main() {
  const trace = executePairShotStaleTrace({ root: defaultRoot, artifact: "xex" });
  process.stdout.write(`${JSON.stringify({ ...trace, records: undefined }, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
