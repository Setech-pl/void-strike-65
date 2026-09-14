import path from "node:path";
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { executeProjectileDebrisBackingTrace } from
  "../scripts/debris-destruction-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("PairShot erase cannot republish gameplay debris after it moves", () => {
  const legacy = executeProjectileDebrisBackingTrace({
    root, legacyProjectileDebrisBacking: true,
  });
  const fixed = executeProjectileDebrisBackingTrace({ root });

  assert.equal(legacy.debris.type, 1);
  assert.equal(legacy.visibleGlyph, 117);
  assert.equal(legacy.savedBacking, 117);
  assert.equal(legacy.afterEntityErase, 0);
  assert.equal(legacy.restored, 117);
  assert.equal(legacy.staleRestore, true);

  assert.equal(fixed.savedBacking, 0);
  assert.equal(fixed.afterEntityErase, 0);
  assert.equal(fixed.restored, 0);
  assert.equal(fixed.staleRestore, false);
  assert.deepEqual([fixed.debris.movedX, fixed.debris.movedY], [124, 144]);
  assert.ok(legacy.writes.some(({ routine, after }) =>
    routine === "erase_fighter_projectile_overlays" && after === 117));
  assert.ok(fixed.writes.some(({ routine, after }) =>
    routine === "erase_fighter_projectile_overlays" && after === 0));
});

test("both cells and every PairShot slot restore debris lower backing", () => {
  for (const projectileSlot of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    for (const debrisX of [52, 124, 188]) {
      for (const debrisCellOffset of [0, 4]) {
        const trace = executeProjectileDebrisBackingTrace({ root, projectileSlot,
          debrisX, debrisCellOffset });
        assert.equal(trace.savedBacking, 0);
        assert.equal(trace.restored, 0);
        assert.equal(trace.staleRestore, false);
      }
    }
  }
});

test("slot-zero debris has one production activation writer and canonical admission", () => {
  const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
  const glue = fs.readFileSync(path.join(root, "src", "integration-glue.s"), "utf8");
  const activationWrites = [...source.matchAll(/^\s*sta ENTITY_ACTIVE_MASK\s*$/gm)];
  assert.equal(activationWrites.length, 4,
    "mask writers remain pickup admit/release, debris admit/release");
  assert.match(source,
    /entity_spawn_debris:[\s\S]+lda #\(ENTITY_GAMEPLAY_TOP-ENTITY_DEBRIS_HEIGHT_SCANLINES\)[\s\S]+sta ENTITY_Y[\s\S]+ora ENTITY_ACTIVE_MASK\s+sta ENTITY_ACTIVE_MASK/);
  assert.match(glue,
    /integration_debris_spawn:[\s\S]+jsr DIRECTOR_REQUEST[\s\S]+jmp entity_spawn_debris/);
});
