// fix/gfx-regression (owner request 2026-10-16, docs/diagnostics/
// gfx-regression-2026-10-16.md): the graphics outside the boss band, pinned.
// The owner asked whether agent sessions had changed how the Interceptor, the
// capital ships and the rest look since main 343d55e (2026-10-09). The audit
// found every byte of their art and palette unchanged, and every visible
// change a recorded decision. These pins make the next change a deliberate
// one: a session that changes any of this re-pins here, citing the owner
// decision that asked for it.
//
//   1. the generated art and palette data: the converters' outputs for the
//      roster, the capital hulls and their four region styles, the effects,
//      the weapons and HUD, the starfield, the frontend font, the loader
//      screen, the menu stars, the level look payload and summary art;
//   2. the Light glyphs (Wingman and Interceptor) as the main link carries
//      them, and the Light hit flash: bit 7 of the slot's codes only, 3 frames
//      (decision AN 1);
//   3. the gameplay DLI's palette and charsets, by value and by its source;
//   4. the HUD's spent HULL quarter is the blank (fix/boss-polish, the owner's
//      request 2026-10-12);
//   5. the boss band's colour writes stay in the band: the only colour,
//      charset and DLI-vector stores in the boss link are the ones listed,
//      and on every region's route the band's end puts back the gameplay
//      DLI's charset and all four playfield colours and hands VDSLST back to
//      boss_dli (decision AV's row palettes never reach the ring).
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { label, nmi, readBuild, root, runBossEntry, word } from "./boss-harness.mjs";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const source = (file) => fs.readFileSync(path.join(root, "src", ...file.split("/")), "utf8");
const REPIN = "re-pin only with the owner decision that changes this art (docs/diagnostics/gfx-regression-2026-10-16.md)";

// --- 1. the generated art and palette data -------------------------------------

// Identical at main 343d55e (2026-10-09) and e660d0b (2026-10-16), MEASURED by
// building both.
const ART = Object.freeze({
  "enemy-roster.inc": "98feca26ed79abc7808423ef9ee555e69772e9d4a674a2dc341379a8da43fa40",
  "capital-hulls.inc": "6322db92f0f239635299d0869edfd1855b93c9c0f073a0a1e9b9506e0c11b175",
  "entity-effects.inc": "252d5050d327afb6df8e84fa9b270f16ffa6c7203d463533d6a91817fc736da7",
  "fighter-weapons.inc": "461247cdb50628e35bb25659c154f306297fa844534cf9de7eed2c5aef981a94",
  "starfield.inc": "ff5ab447499777a9f54b37bbf27accc6cd2788dea40ff6fe4e79cf1f65adb4e8",
  "frontend-h31.inc": "1d2af4e7c4be78da0e3abcb4ee3c2e26708e28f73d1589c5acf05769fa4d8870",
  "loader-screen.inc": "718cd7bc49b6c21ad66e8d598e7a8d2eee6ba90d385476afd099d7dfc4e27f42",
  "loader-display-list.inc": "2255125d0ce2fe716da39b33bedcd188d2cc25bbbbef9e869149acbc6e32dc1a",
  "menu-stars.inc": "1b30e470ad9fd0285b4307a5939d0638d116b5807ffc07eef96132b38824d34c",
  "hull-style-R1.bin": "41aea2b5da3b8bb300aa4c8e2b2bfdcae3bd3b80175ceef17f8e4bf04a6eeaa3",
  "hull-style-R2.bin": "5d27060aa1fe04b4a844bad858957336dc48e152b52cc5d00693a8967b791f0e",
  "hull-style-R3.bin": "6ecd32d2e5812b8efd0235d3133dc261687a2c0b02535941f9359a808531408a",
  "hull-style-R4.bin": "19d564fffe4e85f94b6f1453a1f72060b275440db425174d366d5a4579d103b1",
  "level-hull-block.bin": "e9e39ec1e358a8b8841d7a700821a4dd4dad9d2ce1f550e8e697500dfd8e2674",
  "level-payload.bin": "c97e1626223dc32d6bfca262584b2823ded5292473246b38389dfa63dd77edcf",
  "level-summary-art-1.bin": "0367e8a39d120c8d3fff028b650568c01813c92a886445339aadc69523ce9c51",
  "boot-splash.bin": "d0b287a7b11d3eb27841a4a0cc388f553d6dfc47876d2d6607f3e27f2a16ec83",
});

for (const [file, digest] of Object.entries(ART)) {
  test(`the art outside the boss band: build/${file} is the pinned bytes`, () => {
    assert.equal(sha256(readBuild(file)), digest, `build/${file} changed: ${REPIN}`);
  });
}

// --- 2. the Light glyphs and the hit flash ---------------------------------------

test("the Light glyphs: the Wingman's and the Interceptor's two cells, byte for byte", () => {
  const image = readBuild("entity-code-runtime.bin");
  const base = label("main", "__ENTITY_CODE_RUN__");
  const from = label("main", "light_glyph") - base;
  assert.equal(label("main", "light_glyph_end") - label("main", "light_glyph"), 32);
  assert.equal(label("main", "light_interceptor_glyph") - label("main", "light_glyph"), 16);
  assert.equal(image.subarray(from, from + 32).toString("hex"),
    "f0fc3f0f0f0303000f3ffcf0f0c0c000" + // Wingman, cells 120 / 121
    "f0e0280928e0f0000f0b2860280b0f00", // Interceptor
    `the Light glyphs changed: ${REPIN}`);
});

test("the Light hit flash clears bit 7 of the slot's own codes for 3 frames and touches no colour register (decision AN 1)", () => {
  const kernel = source("hybrid/light-kernel.s");
  assert.match(kernel, /^LIGHT_FLASH_PATTERN = %01110000$/m);
  assert.match(kernel, /lda LIGHT_FLASH,y\n\s+and #\$80\n\s+eor LIGHT_CODE,y\n\s+sta LIGHT_SLOT_SAVE/,
    "the render draws LIGHT_CODE with bit 7 cleared while the flash's bit 7 is set");
  assert.match(kernel, /asl LIGHT_FLASH,x\n\s+jsr ENEMY_LIGHT_TICK/, "one shift a frame, before the render");
  // %01110000 shifted once a frame before the render: bit 7 set on three.
  let flash = 0b01110000;
  const lit = [];
  for (let frame = 0; frame < 8; frame += 1) { flash = (flash << 1) & 0xff; lit.push(flash >> 7); }
  assert.deepEqual(lit, [1, 1, 1, 0, 0, 0, 0, 0]);
  assert.doesNotMatch(kernel, /sta\s+(COLPF[0-3]|COLPM[0-3]|COLBK|PRIOR|CHBASE)\b/, "the Light kernel writes no colour register");
});

// --- 3. the gameplay DLI ------------------------------------------------------------

test("the gameplay DLI's charsets and palette: CHARSET $4400 / HUD $5000, PF0 $0E, PF2 $AE, PF3 $46, HUD $0E / $00", () => {
  assert.equal(label("main", "CHARSET"), 0x4400);
  assert.equal(label("main", "HUD_CHARSET"), 0x5000);
  assert.equal(label("main", "GAMEPLAY_COLPF0"), 0x0e);
  assert.equal(label("main", "GAMEPLAY_COLPF2"), 0xae);
  assert.equal(label("main", "GAMEPLAY_COLPF3"), 0x46);
  assert.equal(label("main", "HUD_COLPF1"), 0x0e);
  assert.equal(label("main", "HUD_COLPF2"), 0x00);
});

test("the gameplay DLI's instructions are the pinned ones (comments aside)", () => {
  const main = source("main.s");
  const start = main.indexOf("\ngameplay_dli:\n");
  const end = main.indexOf("\n.export profile_gameplay_dli_end", start);
  assert.ok(start > 0 && end > start);
  const body = main.slice(start, end).split("\n").map((line) => line.replace(/;.*$/, "").trim())
    .filter((line) => line !== "");
  assert.deepEqual(body, [
    "gameplay_dli:", "pha", "cld", "lda gameplay_dli_phase", "bne gameplay_dli_sync_hud",
    "inc PHYSICAL_PAL_FRAME_ID", "lda PLAYFIELD_ACTIVE_DLIST_LO", "clc", "adc #$03", "sta DLISTL",
    "gameplay_dli_sync_gameplay = *", "sta WSYNC",
    "lda #>CHARSET", "sta CHBASE", "lda #GAMEPLAY_COLPF0", "sta COLPF0",
    "gameplay_dli_allied_colpf1_load = *", "lda #GAMEPLAY_COLPF1", "sta COLPF1",
    "lda #GAMEPLAY_COLPF2", "sta COLPF2", "lda #GAMEPLAY_COLPF3", "sta COLPF3",
    "inc gameplay_dli_phase", "pla", "profile_gameplay_dli_end = *", "rti", ".byte $EA",
    "gameplay_dli_sync_hud = *", "lda #$00", "sta WSYNC",
    "gameplay_dli_hud = *", "lda #>HUD_CHARSET", "sta CHBASE", "lda #HUD_COLPF1", "sta COLPF1",
    "lda #HUD_COLPF2", "sta COLPF2", "lda #$00", "sta gameplay_dli_phase",
    "publish_playfield_display_list = gameplay_dli_hud", "pla", "profile_gameplay_dli_hud_end = *", "rti",
  ], `the gameplay DLI changed: ${REPIN}`);
});

// --- 4. the HUD ------------------------------------------------------------------------

test("the HUD's HULL: a whole quarter is the plate, a spent one the blank (fix/boss-polish, owner request 2026-10-12)", () => {
  const main = source("main.s");
  assert.match(main, /lda #CH_HUD_HULL_FULL\n\s+bne @store_hull\n@damaged:\n(\s*;[^\n]*\n)*\s+lda #CH_SPACE\n@store_hull:/);
});

// --- 5. the boss band's colours stay in the band ----------------------------------------

test("the boss link's colour, charset and DLI-vector stores: only the pinned routines", () => {
  const stores = new Map();
  let routine = null;
  for (const line of source("hybrid/boss.s").split("\n")) {
    const named = /^([A-Za-z_]\w*):/.exec(line);
    if (named) routine = named[1];
    const store = /^\s+sta\s+(COLPF[0-3]|COLBK|CHBASE|PRIOR|GPRIOR|COLPM[0-3]|VDSLST)(?=[\s;,]|$)/.exec(line);
    if (store) {
      const key = `${routine} ${store[1]}`;
      stores.set(key, (stores.get(key) ?? 0) + 1);
    }
  }
  assert.deepEqual(Object.fromEntries([...stores].sort()), {
    "b2_prepare COLPM1": 1, "b2_prepare COLPM2": 1, "b2_restore COLPM1": 1, "b2_restore COLPM2": 1,
    "boss_dli CHBASE": 2, "boss_dli COLPF0": 2, "boss_dli COLPF1": 2, "boss_dli COLPF2": 2, "boss_dli COLPF3": 2,
    "boss_install CHBASE": 1, "boss_install COLBK": 1, "boss_install COLPF1": 1, "boss_install COLPF2": 1,
    "boss_install COLPF3": 1, "boss_install VDSLST": 1,
    "boss_pal_dli COLPF1": 1, "boss_pal_dli COLPF3": 1, "boss_pal_frame VDSLST": 1, "boss_pal_landed VDSLST": 1,
    "laser_publish COLPM1": 1, "laser_publish COLPM2": 1,
  }, "a new colour, charset or DLI-vector store in the boss link: show it stays in the band, then re-pin");
});

const ROUTE_LEVEL = [1, 4, 7, 10];
const HARDWARE = new Map([[0xd409, "CHBASE"], [0xd016, "COLPF0"], [0xd017, "COLPF1"], [0xd018, "COLPF2"], [0xd019, "COLPF3"]]);
const boss = (name) => label("boss", name);

for (let r = 0; r < 4; r += 1) {
  test(`region ${r + 1}'s route: the band's end puts back the gameplay charset and palette, and hands VDSLST back to boss_dli`, () => {
    const run = runBossEntry({ prepare: (m) => { m[0xa603] = ROUTE_LEVEL[r]; } });
    assert.equal(run.end, "main_loop");
    const m = run.memory;
    const gameplay = {
      CHBASE: label("main", "CHARSET") >> 8,
      COLPF0: label("main", "GAMEPLAY_COLPF0"),
      COLPF1: m[label("main", "gameplay_dli_allied_colpf1_load") + 1], // the level's allied steel
      COLPF2: label("main", "GAMEPLAY_COLPF2"),
      COLPF3: label("main", "GAMEPLAY_COLPF3"),
    };
    for (let frame = 0; frame < 2; frame += 1) {
      m[label("main", "loader_dli_phase")] = 0;
      nmi(m, boss("boss_dli"));                         // phase 0: the band's palette (and the hook)
      let switches = 0;
      while (word(m, 0x0200) === boss("boss_pal_dli")) {   // the row switches, inside the band
        assert.ok(switches < 7);
        nmi(m, boss("boss_pal_dli"));
        switches += 1;
      }
      assert.equal(word(m, 0x0200), boss("boss_dli"), "the band's end is boss_dli's");
      const last = {};
      nmi(m, boss("boss_dli"), { hooks: { write: (address, value) => {
        if (HARDWARE.has(address)) last[HARDWARE.get(address)] = value;
        m[address] = value;
      } } });
      assert.deepEqual(last, gameplay, `frame ${frame}: under the band the ring has the gameplay DLI's charset and colours`);
      assert.equal(word(m, 0x0200), boss("boss_dli"), "no row-switch vector left behind for the next frame");
      nmi(m, boss("boss_dli"));                         // phase 2: the HUD
    }
  });
}
