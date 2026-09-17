import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { unpackBroadsideLzss } from "../scripts/broadside-lzss.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name));
const source = read("src/main.s").toString("utf8");
const manifest = JSON.parse(read("build/manifest.json").toString("utf8"));

function labels() {
  const result = new Map();
  for (const line of read("build/void-strike-65.lbl").toString("utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9A-Fa-f]{6})\s+\.?([^\s]+)/.exec(line);
    if (match) result.set(match[2], Number.parseInt(match[1], 16));
  }
  return result;
}

test("cold pickup record excludes the source-only character phase bank", () => {
  const phaseSource = read("build/weapon-pickup-phases.bin");
  const pickupCode = read("build/pickup-code-runtime.bin");
  const collision = read("build/capital-player-collision.bin");
  const runtime = read("build/weapon-pickup-phase-runtime.bin");
  const packed = read("build/weapon-pickup-phase-runtime-packed.bin");

  assert.equal(phaseSource.length, 1152);
  assert.equal(pickupCode.length, 871);
  assert.equal(collision.length, 33);
  assert.equal(runtime.length, 904);
  assert.deepEqual(runtime, Buffer.concat([pickupCode, collision]));
  assert.deepEqual(unpackBroadsideLzss(packed), runtime);
  assert.equal(packed.length, 850);
  assert.equal(0x917d - 0x8c80, 1277);
  assert.equal(1277 - packed.length, 427);

  assert.equal(manifest.entityEffects.pickupPhaseBankBytes, 0);
  assert.equal(manifest.entityEffects.pickupPhaseSourceBytes, 1152);
  assert.equal(manifest.entityEffects.pickupPhaseBankRuntimeReferences, 0);
  assert.equal(manifest.entityEffects.pickupPhaseRuntimeBytes, 904);
  assert.equal(manifest.entityEffects.pickupPhasePackedBytes, 850);
  assert.equal(manifest.entityEffects.pickupPhaseExternalChunk.coldCapacityBytes, 1277);
  assert.equal(manifest.entityEffects.pickupPhaseExternalChunk.coldMarginBytes, 427);
  assert.equal(pickupCode.indexOf(phaseSource.subarray(0, 16)) >= 0, true,
    "PMG mask must retain the exact 16 bytes used by the rejected combined candidate");
  assert.doesNotMatch(source, /WEAPON_PICKUP_PHASE_BANK|compose_weapon_pickup_phase|weapon_pickup_type_base_hi/);
});

test("PMG runtime remains legal after retiring the rejected central primitive", () => {
  const symbol = labels();
  // The stream now opens with the Light Wingman kernel at $8776; PICKUP_CODE
  // follows it and the zero-filled image still ends at the fixed $8B67 module.
  assert.equal(symbol.get("__LIGHT_RESIDENT_RUN__"), 0x8776);
  assert.equal(symbol.get("__PICKUP_CODE_RUN__"),
    0x8776 + symbol.get("__LIGHT_RESIDENT_SIZE__"));
  // 777 B originally; +1 B when publication moved post-playfield, then -9 B
  // when the three per-type capsule silhouettes moved to the STARFIELD tail,
  // leaving 14 B of the zero-filled stream before the fixed $8B67 module.
  // 4.5c Bomber: generic Heavy weapon_class emission +4 B = 773.
  assert.equal(symbol.get("__PICKUP_CODE_SIZE__"), 773);
  assert.ok(0x8776 + symbol.get("__LIGHT_RESIDENT_SIZE__") +
    symbol.get("__PICKUP_CODE_SIZE__") <= 0x8b67, "pickup stream still clears $8B67");
  assert.equal(symbol.has("lower_cell_read"), false);
  assert.equal(symbol.has("lower_cell_write"), false);
  assert.equal(manifest.capitalPlayerCollisionRuntime.packedStreamOffset, 0x8b67 - 0x8776);
  assert.equal(manifest.capitalPlayerCollisionRuntime.runAddress, 0x8b67);
  assert.equal(manifest.capitalPlayerCollisionRuntime.runAddress +
    manifest.capitalPlayerCollisionRuntime.bytes, 0x8b88);

  // The mid-frame path owns policy only. Publication moved into the
  // post-playfield window, so the capsule is no longer drawn from here.
  assert.match(source,
    /update_fighter_pickup_pmg:[\s\S]+CAPITAL_HULL_STATE_OPEN[\s\S]+jmp update_weapon_pickup_active/);
  assert.match(source,
    /publish_fighter_pickup_pmg:[\s\S]+jsr clear_fighter_pickup_pmg[\s\S]+render_fighter_pickup_pmg/);
  assert.match(source, /render_fighter_pickup_pmg:[\s\S]+HPOSM0[\s\S]+HPOSM3[\s\S]+MISSILES,y[\s\S]+sta PRIOR/);
  assert.match(source, /weapon_pickup_clear_sector:[\s\S]+WEAPON_PICKUP_STATE_PENDING[\s\S]+weapon_pickup_release/);
  assert.equal((source.match(/lower_cell_(?:read|write)/g) ?? []).length, 0,
    "rejected per-access ownership primitive must stay absent");
});

test("fit preserves the reviewed staging and placement gates", () => {
  const pickup = manifest.entityEffects.pickupPhaseExternalChunk;
  assert.equal(pickup.stagingAddress, 0x8c80);
  assert.equal(pickup.finalRuntimeAddress, 0x8800);
  assert.equal(pickup.sectors, 7);
  assert.ok(manifest.starfieldRuntime.packedBytes <= manifest.starfieldRuntime.stagingBytes);
  assert.equal(manifest.starfieldRuntime.packedSourceToPickupMarginBytes, 149);
  assert.equal(manifest.entityEffects.stagingToBroadsideMarginBytes, 112);
  assert.ok(manifest.broadsideRuntime.bytes <= manifest.broadsideRuntime.reservedBytes);
  assert.equal(manifest.a2Kernel.runAddress, 0x9000);
  assert.equal(manifest.a2Kernel.bytes, 122);
  assert.equal(manifest.entityEffects.codeRunAddress, 0x9100);
  assert.equal(manifest.entityEffects.codeRunAddress & 0xff, 0);
  assert.equal(manifest.transportCapacity.initialBootEnvelopeBytes, 14);
  assert.equal(manifest.transportCapacity.manifest.parsed.records.length, 4);
  assert.equal(manifest.transportCapacity.format, "DFMC-v1 multi-chunk");
});
