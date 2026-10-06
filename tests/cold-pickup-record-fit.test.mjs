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

// REWRITTEN 2026-10-01 (recorded failures review, B3; owner-approved). The two
// tests below pinned the record as it was when the capsule left the character
// renderer: 871 B of pickup code directly followed by the collision module,
// 850 B packed, the Light kernel head at $8776 in LIGHT_RESIDENT, and a render
// routine that used the four missiles and PRIOR. Since then the Light kernel
// moved to its own link, the per-type silhouettes moved to the STARFIELD tail,
// the capsule became one PLAYER3 image (docs/plans/pickup-colour.md) and the
// record gained a second stream. What the tests protect is unchanged and is
// asserted as relations: no character phase bank ships, the record unpacks to
// the linked image, and the stream ends at the fixed $8B67 collision module.
const PICKUP_STREAM_START = 0x8776;
const COLLISION_MODULE_START = 0x8b67;

test("cold pickup record excludes the source-only character phase bank", () => {
  const phaseSource = read("build/weapon-pickup-phases.bin");
  const pickupCode = read("build/pickup-code-runtime.bin");
  const collision = read("build/capital-player-collision.bin");
  const runtime = read("build/weapon-pickup-phase-runtime.bin");
  const packed = read("build/weapon-pickup-phase-runtime-packed.bin");

  assert.equal(phaseSource.length, 1152);
  assert.equal(collision.length, 33);
  // The stream is the pickup code, zero-filled up to the fixed collision
  // module, then the module.
  assert.equal(runtime.length,
    COLLISION_MODULE_START - PICKUP_STREAM_START + collision.length);
  assert.deepEqual(runtime.subarray(0, pickupCode.length), pickupCode);
  assert.ok(pickupCode.length <= COLLISION_MODULE_START - PICKUP_STREAM_START,
    `pickup code is ${pickupCode.length} B and must end before $8B67`);
  assert.ok(runtime.subarray(pickupCode.length, runtime.length - collision.length)
    .every((byte) => byte === 0), "the gap before the collision module is zero-filled");
  assert.deepEqual(runtime.subarray(runtime.length - collision.length), collision);
  assert.deepEqual(unpackBroadsideLzss(packed), runtime);

  const chunk = manifest.entityEffects.pickupPhaseExternalChunk;
  assert.equal(manifest.entityEffects.pickupPhaseBankBytes, 0);
  assert.equal(manifest.entityEffects.pickupPhaseSourceBytes, 1152);
  assert.equal(manifest.entityEffects.pickupPhaseBankRuntimeReferences, 0);
  assert.equal(manifest.entityEffects.pickupPhaseRuntimeBytes, runtime.length);
  assert.equal(manifest.entityEffects.pickupPhasePackedBytes, packed.length);
  assert.equal(chunk.coldCapacityBytes, 0x917d - 0x8c80);
  assert.equal(chunk.coldMarginBytes, chunk.coldCapacityBytes - packed.length);
  assert.ok(chunk.coldMarginBytes >= 0, "the packed record must fit its cold staging");
  assert.equal(runtime.indexOf(phaseSource.subarray(0, 48)), -1,
    "no phase of the source-only character bank is in the shipped stream");
  assert.doesNotMatch(source, /WEAPON_PICKUP_PHASE_BANK|compose_weapon_pickup_phase|weapon_pickup_type_base_hi/);
});

test("PMG runtime remains legal after retiring the rejected central primitive", () => {
  const symbol = labels();
  assert.equal(symbol.get("__PICKUP_CODE_RUN__"), PICKUP_STREAM_START);
  assert.equal(symbol.get("WEAPON_PICKUP_RUNTIME"), PICKUP_STREAM_START);
  assert.ok(PICKUP_STREAM_START + symbol.get("__PICKUP_CODE_SIZE__") <= COLLISION_MODULE_START,
    "pickup stream still clears $8B67");
  assert.equal(symbol.has("lower_cell_read"), false);
  assert.equal(symbol.has("lower_cell_write"), false);
  assert.equal(manifest.capitalPlayerCollisionRuntime.packedStreamOffset,
    COLLISION_MODULE_START - PICKUP_STREAM_START);
  assert.equal(manifest.capitalPlayerCollisionRuntime.runAddress, COLLISION_MODULE_START);
  assert.equal(manifest.capitalPlayerCollisionRuntime.runAddress +
    manifest.capitalPlayerCollisionRuntime.bytes, 0x8b88);

  // The mid-frame path owns policy only. Publication moved into the
  // post-playfield window, so the capsule is no longer drawn from here.
  assert.match(source,
    /update_fighter_pickup_pmg:[\s\S]+CAPITAL_HULL_STATE_OPEN[\s\S]+jmp update_weapon_pickup_active/);
  assert.match(source,
    /publish_fighter_pickup_pmg:[\s\S]+jsr clear_fighter_pickup_pmg[\s\S]+render_fighter_pickup_pmg/);
  // The capsule is one PLAYER3 image: one HPOS, sixteen rows, and no write to
  // the missiles or to PRIOR.
  const renderStart = source.indexOf("render_fighter_pickup_pmg:");
  const render = /^render_fighter_pickup_pmg:[\s\S]*?\n {4}rts\n/m.exec(source.slice(renderStart))?.[0];
  assert.ok(render, "render_fighter_pickup_pmg must end in rts");
  assert.match(render, /sta HPOSP3[\s\S]+lda fighter_pickup_pmg_shape,x\s+sta PLAYER3,y/);
  assert.doesNotMatch(render, /HPOSM|MISSILES|sta PRIOR/);
  assert.match(source, /weapon_pickup_clear_sector:[\s\S]+WEAPON_PICKUP_STATE_PENDING[\s\S]+weapon_pickup_release/);
  assert.equal((source.match(/lower_cell_(?:read|write)/g) ?? []).length, 0,
    "rejected per-access ownership primitive must stay absent");
});

// RE-PINNED 2026-10-01 (recorded failures review, A8): seven layout values, all
// read from build/manifest.json. $8800 -> $8776 (the stream opens at
// WEAPON_PICKUP_RUNTIME), 7 -> 9 sectors, margins 149 -> 143 and 112 -> 38,
// A2 kernel 122 -> 237 B, envelope 14 -> 75 B, 4 -> 11 records.
test("fit preserves the reviewed staging and placement gates", () => {
  const pickup = manifest.entityEffects.pickupPhaseExternalChunk;
  assert.equal(pickup.stagingAddress, 0x8c80);
  assert.equal(pickup.finalRuntimeAddress, 0x8776);
  // RE-PINNED 2026-10-04 (M5b-S3, plan §5.11.1): 9 -> 10. HYBRID_C_SECTOR,
  // which rides in this record, grew 215 -> 230 B for the boss gate (one mask
  // for CAPITAL_DUE | BOSS_DUE and the entry call); the record had 3 B spare.
  assert.equal(pickup.sectors, 10);
  assert.ok(manifest.starfieldRuntime.packedBytes <= manifest.starfieldRuntime.stagingBytes);
  // RE-PINNED 2026-10-05, plasma FX B1/B1.1 (docs/plans/plasma-fx.md): 143 ->
  // 151 and 38 -> 20. The break-up's two growth glyphs (16 B of source, codes
  // 108-109) lead the ENTITY_CODE glyph bank and B1.1's art packs less well:
  // the ENTITY_CODE staging grew 18 B packed toward BROADSIDE, and the packed
  // sources below moved down, away from the pickup stream.
  assert.equal(manifest.starfieldRuntime.packedSourceToPickupMarginBytes, 151);
  assert.equal(manifest.entityEffects.stagingToBroadsideMarginBytes, 20);
  assert.ok(manifest.broadsideRuntime.bytes <= manifest.broadsideRuntime.reservedBytes);
  assert.equal(manifest.a2Kernel.runAddress, 0x9000);
  assert.equal(manifest.a2Kernel.bytes, 237);
  assert.equal(manifest.entityEffects.codeRunAddress, 0x9100);
  assert.equal(manifest.entityEffects.codeRunAddress & 0xff, 0);
  // RE-PINNED 2026-10-05, plasma FX B1.1: 75 -> 65. The initial block's content
  // grew 13,621 -> 13,631 B (the break-up's stage masks and per-fragment codes),
  // inside the same 107 sectors (13,696 B).
  assert.equal(manifest.transportCapacity.initialBootEnvelopeBytes, 65);
  assert.equal(manifest.transportCapacity.manifest.parsed.records.length, 11);
  assert.equal(manifest.transportCapacity.format, "DFMC-v1 multi-chunk");
});
