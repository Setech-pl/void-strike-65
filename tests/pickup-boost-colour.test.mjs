// The booster capsule wore an enemy's colour. It was the GTIA fifth player, so
// its only possible register was COLPF3 - the register the Light Wingman's
// whole wing and the Interceptor's rotor pods already use, and whose gameplay
// value is the hostile $46. A pickup that reads as an enemy is a gameplay bug,
// not a palette preference.
//
// Owner decision, 2026-09-28 (docs/plans/pickup-colour.md §7): the capsule is
// one PLAYER3 image and COLPM3 is dedicated to it for the whole of OPEN. These
// assertions are about OWNERSHIP - which object may write which register and
// which plane - because that is what made the old colour impossible to change.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const lifecycle = fs.readFileSync(path.join(root, "src", "c", "lifecycle.c"), "utf8");
const roster = fs.readFileSync(path.join(root, "build", "enemy-roster.inc"), "utf8");
const weapons = fs.readFileSync(path.join(root, "build", "fighter-weapons.inc"), "utf8");

const section = (from, to) => {
  const start = source.indexOf(from);
  assert.ok(start >= 0, `missing ${from}`);
  const end = to === undefined ? source.length : source.indexOf(to, start);
  assert.ok(end > start, `missing ${to} after ${from}`);
  return source.slice(start, end);
};

const constant = (name) => {
  const match = new RegExp(`^${name} = \\$([0-9A-F]{2})$`, "m").exec(source);
  assert.ok(match, `missing constant ${name} in src/main.s`);
  return parseInt(match[1], 16);
};

const hue = (byte) => byte >> 4;

test("the capsule's colour is a hue no enemy and no allied object wears", () => {
  const boostColour = constant("PICKUP_BOOST_COLOUR");
  // Every colour a capsule can be seen against: capsules exist only in OPEN
  // fighter space (docs/plans/pickup-colour.md §1.1), so this is that screen.
  const raider = parseInt(/#define HULL_COLOUR_RAIDER\s+0x([0-9a-f]{2})u/
    .exec(lifecycle)[1], 16);
  const bomberHue = parseInt(/#define BOMBER_HULL_HUE\s+0x([0-9a-f]{2})u/i
    .exec(lifecycle)[1], 16);
  const pulse = parseInt(/^ENEMY_PULSE_COLOR = \$([0-9A-F]{2})$/m.exec(roster)[1], 16);
  const alliedSteel = constant("GAMEPLAY_COLPF1");
  // GAMEPLAY_COLPF3 is INTERCEPTOR_PROJECTILE_COLOR: the enemy accents the
  // Wingman's wing, the Interceptor's pods and the enemy capital mass all wear.
  assert.match(source, /^GAMEPLAY_COLPF3 = INTERCEPTOR_PROJECTILE_COLOR$/m);
  const enemyAccent = parseInt(
    /^INTERCEPTOR_PROJECTILE_COLOR = \$([0-9A-F]{2})$/m.exec(weapons)[1], 16);

  const forbidden = new Map([
    ["Heavy Raider hull COLPM1/2", raider],
    ["Heavy Bomber hull COLPM1/2", bomberHue],
    ["hostile pulse / Interceptor projectile", pulse],
    ["enemy accents COLPF3 (Wingman wing, Interceptor pods)", enemyAccent],
    ["allied steel COLPF1", alliedSteel],
  ]);
  for (const [who, colour] of forbidden) {
    assert.notEqual(hue(boostColour), hue(colour),
      `the boost colour $${boostColour.toString(16).toUpperCase()} shares hue ` +
      `${hue(boostColour).toString(16).toUpperCase()} with ${who} ` +
      `($${colour.toString(16).toUpperCase()}); a pickup must not read as one of them`);
  }
});

test("the capsule is one PLAYER3 image and touches no missile register", () => {
  const render = section("render_fighter_pickup_pmg:", "; Effects publish before");
  assert.match(render, /sta PLAYER3,y/, "the silhouette rows go to the player plane");
  assert.match(render, /sta HPOSP3/, "one player HPOS replaces the four missile HPOSes");
  assert.doesNotMatch(render, /MISSILES|HPOSM[0-3]|SIZEM|PRIOR/,
    "the fifth-player mechanism is what forced the capsule into COLPF3");

  const clear = section("clear_fighter_pickup_pmg:", "; ANTIC fetches one player byte");
  assert.match(clear, /sta PLAYER3,y/);
  assert.doesNotMatch(clear, /MISSILES/);

  const release = section("release_fighter_pickup_pmg_hardware:", "weapon_booster_release:");
  assert.doesNotMatch(release, /PRIOR|SIZEM/,
    "with no fifth-player mode there is nothing for the release to restore");
});

test("PRIOR is $00 for the whole of gameplay: only cold init and the loader write it", () => {
  const writers = [...source.matchAll(/^\s*sta PRIOR$/gm)];
  assert.equal(writers.length, 2,
    "exactly two PRIOR writers remain: finish_startup_after_loader and show_loader");
  assert.match(source, /finish_startup_after_loader:[\s\S]+lda #\$00[\s\S]{0,200}sta PRIOR/);
  assert.match(source, /show_loader:[\s\S]{0,200}lda #\$00[^\n]*\n\s*sta PRIOR/);
});

test("no shield path writes COLPM3", () => {
  const restore = section("restore_player_fighter_normal_colors:",
    "; The authoritative Shield timer");
  const pulse = section("update_shield_player_fighter_colors:",
    "; Boot-time source only.");
  for (const [name, text] of [["restore", restore], ["pulse", pulse]]) {
    assert.match(text, /sta COLPM0/, `${name} still owns the hull colour`);
    assert.doesNotMatch(text, /COLPM3/,
      `${name} would blink the capsule in time with the shield`);
  }
});

test("only the capsule and the player explosion write PLAYER3", () => {
  // draw_player/erase_player published an amber P3 "plume" that reached no
  // pixel (docs/plans/pickup-colour.md §1.4) and would now erase the capsule.
  for (const [name, to] of [["erase_player:", "draw_player:"],
    ["draw_player:", "draw_player_for_lifecycle:"]]) {
    assert.doesNotMatch(section(name, to), /PLAYER3|HPOSP3|player_engine_shape/,
      `${name} must not touch the plane the capsule owns`);
  }
  // Six stores, three per owner: erase rows, position, draw rows.
  const owners = [...source.matchAll(/^\s*sta (?:PLAYER3,y|HPOSP3)$/gm)];
  assert.equal(owners.length, 6,
    "two objects own P3: the player explosion and the pickup capsule, three stores each");
});

test("COLPM3 follows the sector state, once per frame, off the latch that exists", () => {
  const publisher = section("publish_fighter_projectile_overlays:",
    "fighter_projectile_publication_capital_render:");
  assert.match(publisher,
    /lda FIGHTER_PROJECTILE_PUBLICATION_FRAME\s*\n\s*beq @fighter_window[\s\S]*?lda #PLAYER_NORMAL_ENGINE_COLOR\s*\n\s*sta COLPM3/,
    "a capital frame gives COLPM3 back to the broadside M3 and the explosion");
  assert.match(publisher,
    /@fighter_window:\s*\n\s*lda #PICKUP_BOOST_COLOUR\s*\n\s*sta COLPM3/,
    "an OPEN frame gives COLPM3 to the capsule");
  // The register and the P3 image are published in the same window, so they can
  // never disagree for a frame across a sector transition.
  assert.match(publisher, /sta COLPM3[\s\S]*?ldx #\$77\s*\n\s*jsr wait_frame_at_line/);
  assert.equal([...source.matchAll(/^\s*sta COLPM3$/gm)].length, 3,
    "three COLPM3 writers: the two per-frame state writes and the cold frontend init");
});

test("P3 carries the capsule's one-clock size, and the explosion's double width only", () => {
  const entry = section("start_gameplay:", "start_gameplay_end:");
  assert.match(entry, /sta SIZEP0\s*\n\s*lda #\$00[^\n]*\n\s*sta SIZEP3/,
    "gameplay starts with P3 at one colour clock per pixel, P0 at two");
  const explosion = section("begin_player_fighter_explosion:",
    "tick_shared_fighter_explosions:");
  assert.match(explosion, /lda #\$01\s*\n\s*sta SIZEP3/,
    "the outer mask is aligned to P0 and must share its double width");
  const respawn = section("respawn_player:", "lda #PLAYER_RESPAWN_X");
  assert.match(respawn, /lda #\$00[^\n]*\n\s*sta SIZEP3/,
    "P3 returns to the capsule's size when the explosion is over");
});
