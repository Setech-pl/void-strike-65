import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");

test("source keeps the documented PAL and PMG hardware contract", () => {
  const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
  assert.match(source, /PMG_BASE\s*=\s*\$3800/);
  assert.match(source, /SCREEN\s*=\s*\$4000/);
  assert.match(source, /CHARSET\s*=\s*\$4400/);
  assert.match(source, /FRONTEND_CHARSET\s*=\s*\$4800/);
  assert.match(source, /HUD_CHARSET\s*=\s*\$5000/);
  assert.match(source, /sta CHBASE/);
  assert.match(source, /PLAYFIELD_DLIST_BYTES\s*=\s*3\+3\+PLAYFIELD_RING_ROWS\*3\+3/);
  assert.match(source,
    /build_playfield_display_list:[\s\S]+lda #\$C2[\s\S]+lda #<GAMEPLAY_DIVIDER_SCREEN[\s\S]+cpy #\(6\+\(PLAYFIELD_RING_ROWS-1\)\*3\)[\s\S]+lda #\$C4[\s\S]+lda #\$41/);
  const rotate = source.slice(source.indexOf("rotate_playfield_rows:"),
    source.indexOf("init_starfield_state:"));
  assert.doesNotMatch(rotate, /sta DLISTL/,
    "visible-frame ring rotation must not publish DLISTL directly");
  assert.match(source,
    /gameplay_dli:[\s\S]+lda gameplay_dli_phase\s+bne gameplay_dli_sync_hud[\s\S]+lda PLAYFIELD_ACTIVE_DLIST_LO\s+clc\s+adc #\$03\s+sta DLISTL\s+gameplay_dli_sync_gameplay\s*=\s*\*/,
    "the first gameplay DLI must select byte three of the active A2 list before playfield DMA");
  assert.match(source,
    /gameplay_dli_hud\s*=\s*\*[\s\S]+sta gameplay_dli_phase[\s\S]+publish_playfield_display_list = gameplay_dli_hud\s+pla[\s\S]+rti/,
    "the final gameplay DLI must leave next-frame publication to the active list JVB");
  assert.match(source, /main_menu_display_list:[\s\S]+\.byte \$70,\$70,\$70,\$47,<SCREEN,>SCREEN/);
  assert.match(source, /\.byte \$42,<\(SCREEN\+300\),>\(SCREEN\+300\)/);
  assert.match(source, /lda #\$3E\s+; normal playfield, single-line PMG DMA/);
  assert.match(source, /ldx #\$70\s*\nwait_frame_at_line:\s*\n@wait_for_line:/);
});

test("accepted gameplay screen reference and its mapping decision are versioned", () => {
  assert.ok(fs.existsSync(path.join(rootDirectory, "assets", "graphics", "void-strike-65-screen-concept-v1.png")));
  assert.ok(fs.existsSync(path.join(rootDirectory, "docs", "decisions", "ADR-002-gameplay-screen.md")));
});

test("linker allows loader-only PMG tail but protects screen memory", () => {
  const config = fs.readFileSync(path.join(rootDirectory, "cfg", "atari-boot.cfg"), "utf8");
  assert.match(config, /MAIN:\s+start = \$2000, size = \$2000/);
  assert.match(config, /BOOTTAIL:\s+start = \$4000/);
  assert.match(config, /BROADSIDE_RAM:\s+start = \$5E10/);
});

test("current documentation keeps implemented, planned and historical state distinct", () => {
  const read = (name) => fs.readFileSync(path.join(rootDirectory, name), "utf8");
  const gameDesign = read("docs/game-design.md");
  const architecture = read("docs/architecture.md");
  const artDirection = read("docs/art-direction.md");
  // The single active roadmap and the current CPU/RAM summary.
  const roadmap = read("docs/plan-realizacji.md");
  const runtimeHeadroom = read("docs/STATUS.md");
  const currentSources = [gameDesign, architecture, artDirection, roadmap,
    runtimeHeadroom, read("docs/memory-map.md")].join("\n");

  assert.match(gameDesign, /The gameplay HUD contains `SCORE`, `LIFE`, and `HULL`\./);
  assert.match(gameDesign, /full `BOOST` label/);
  assert.doesNotMatch(gameDesign, /\b(?:ARM|FUEL)\b/);
  assert.match(gameDesign, /Rapid Fire — implemented/);
  assert.match(gameDesign, /Spread Shot — implemented/);
  assert.match(gameDesign, /Shield Booster — implemented/);
  assert.doesNotMatch(currentSources, /\$8100-\$99A3/);
  assert.doesNotMatch(currentSources, /\$8100-\$(?:9AA3|9A3D)/);
  assert.match(architecture, /stage it at\s+`\$8100-\$9ACE`/);
  assert.match(architecture, /packs them to \*\*1,929 bytes\*\*/);
  assert.doesNotMatch(currentSources, /\b2,?027[- ]bytes\b/i);
  assert.doesNotMatch(artDirection, /\bresidual\b/i);
  assert.doesNotMatch(roadmap, /next[^\n]*entity\/effects foundation/i);
  assert.doesNotMatch(runtimeHeadroom, /feature\/runtime-headroom/);
  assert.match(gameDesign,
    /Rapid Fire[\s\S]+projectiles retain the Player Fighter's established\s+yellow\/gold/);
  assert.match(gameDesign,
    /normal Player Fighter weapon fires an eight-projectile burst[\s\S]+Rapid Fire[\s\S]+burst to ten projectiles[\s\S]+normal eight-salvo burst/);
  assert.doesNotMatch(gameDesign, /normal Player Fighter weapon fires a ten-projectile burst/);
  assert.doesNotMatch(currentSources, /Rapid Fire projectile:[^\n]*red/i);
});
