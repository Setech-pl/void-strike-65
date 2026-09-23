import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createCapitalHullsStripPreview,
  createFighterBurstRuntimeTrace,
  createFighterWeaponTransitionTrace,
  createSharedFighterExplosionPreview,
  createSharedFighterExplosionTrace,
  createDebrisReviewPreview,
  createDebrisReviewTrace,
  createDestructibleDebrisPreview,
  createDestructibleDebrisTrace,
  createInterceptorBreakupPreview,
  createInterceptorBreakupTrace,
  createHudPresentationNativePreview,
  createHudPresentationPreview,
  createWeaponPickupRapidFirePreview,
  createWeaponPickupRapidFireTrace,
  createSpreadShotPreview,
  createShieldBoosterPreview,
  createSpreadShotTrace,
  createPlayerFighterProjectileColourPreview,
  createPlayerFighterBurstBalancePreview,
  createPlayerFighterBurstBalanceTrace,
  createSpreadShotHullPreview,
  createSpreadShotHullTrace,
  PREVIEW_HEIGHT,
  PREVIEW_WIDTH,
  createGameplayPreview,
  createStartMenuPreview,
  inspectPng,
  readFrontendGraphicsSource,
  readGameGraphicsSource,
} from "../scripts/preview.mjs";
import { loadCapitalHullsDefinition } from "../scripts/capital-hulls.mjs";
import { loadEntityEffectsDefinition } from "../scripts/entity-effects.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
const capitalHullsDefinition = loadCapitalHullsDefinition(
  path.join(rootDirectory, "assets", "graphics", "capital-hulls.json"),
);
const entityEffectsDefinition = loadEntityEffectsDefinition(
  path.join(rootDirectory, "assets", "graphics", "entity-effects.json"),
);

function replaceOnce(text, original, replacement) {
  const first = text.indexOf(original);
  assert.notEqual(first, -1, `missing source fixture: ${original}`);
  assert.equal(text.indexOf(original, first + original.length), -1, `ambiguous source fixture: ${original}`);
  return `${text.slice(0, first)}${replacement}${text.slice(first + original.length)}`;
}

test("gameplay preview is a structurally valid RGB PNG", () => {
  const png = createGameplayPreview(source);
  const info = inspectPng(png);

  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(info.bitDepth, 8);
  assert.equal(info.colorType, 2);
  assert.deepEqual(info.chunkTypes, ["IHDR", "IDAT", "IEND"]);
});

test("gameplay preview has the expected enlarged mixed-mode dimensions", () => {
  const info = inspectPng(createGameplayPreview(source));
  assert.equal(info.width, PREVIEW_WIDTH);
  assert.equal(info.height, PREVIEW_HEIGHT);
  assert.deepEqual([info.width, info.height], [640, 384]);
});

test("gameplay preview output is byte-for-byte deterministic", () => {
  const first = createGameplayPreview(source);
  const second = createGameplayPreview(source);
  assert.deepEqual(first, second);
});

test("start-menu preview is deterministic, 640x384, and source-derived", () => {
  const frontend = readFrontendGraphicsSource(source);
  assert.deepEqual(
    frontend.mainMenuRecords.filter(({ mode }) => mode === 6).map(({ text }) => text),
    ["START GAME", "OPTIONS", "TOP SCORES", "EXIT"],
  );
  assert.equal(frontend.mainMenuRecords.at(-1).text, "UP/DOWN MOVE   FIRE SELECT");
  assert.equal(frontend.mainMenuRecords[0].text, "VOID STRIKE 65");
  assert.equal(frontend.mainMenuRecords[0].mode, 7);
  assert.equal(frontend.mainMenuRecords.at(-1).mode, 2);
  assert.equal(frontend.mainMenuRecords.some(({ text }) => text.includes("SETECH")), false);
  assert.equal(frontend.defaultSelection, 0);

  const first = createStartMenuPreview(source);
  const second = createStartMenuPreview(source);
  assert.deepEqual(first, second);
  assert.deepEqual(
    [inspectPng(first).width, inspectPng(first).height],
    [PREVIEW_WIDTH, PREVIEW_HEIGHT],
  );
  assert.deepEqual([PREVIEW_WIDTH, PREVIEW_HEIGHT], [640, 384]);

  const changedLabel = replaceOnce(source, '.byte "START GAME",0', '.byte "START GAMA",0');
  assert.notDeepEqual(createStartMenuPreview(changedLabel), first);
  const changedHangar = replaceOnce(
    source,
    "MAIN_MENU_LINE_TOP_OFFSET = 20",
    "MAIN_MENU_LINE_TOP_OFFSET = 21",
  );
  assert.notDeepEqual(createStartMenuPreview(changedHangar), first);
  const changedCraft = replaceOnce(
    source,
    "CH_FRONT_PLAYER_FIGHTER_TOP_LEFT = 58",
    "CH_FRONT_PLAYER_FIGHTER_TOP_LEFT = 57",
  );
  assert.notDeepEqual(createStartMenuPreview(changedCraft), first);
});

test("preview consumes the canonical charset, screen, PMG, and palette source", () => {
  const graphics = readGameGraphicsSource(source);
  assert.equal(graphics.charset.length, 1024);
  assert.deepEqual(
    [graphics.alliedHullRows.length, graphics.enemyHullRows.length],
    [32, 32],
  );
  assert.equal(graphics.playerShape.length, 16);
  assert.deepEqual(
    ["COLBK", "COLPF0", "COLPF1", "COLPF2", "COLPF3", "COLPM0", "COLPM1", "COLPM2", "COLPM3"].map(
      (name) => graphics.hardwareState.get(name),
    ),
    // COLPF1 is the allied steel: $88 by default since owner decision 2, and
    // level data on top of it (tests/level-hull-block.test.mjs).
    [0x00, 0x0e, 0x88, 0x1e, 0x46, 0x0e, 0x44, 0x46, 0x28],
  );
  assert.equal(graphics.frontendHardwareState.get("COLPF3"), 0xd8);
  assert.match(
    source.slice(source.indexOf("init_screen:"), source.indexOf("; -----------------------------------------------------------------------------\n; Player and input")),
    /sbc #\$20\s+sta SCREEN,x/,
    "runtime HUD placement must stay aligned with the canonical gameplay preview",
  );

  const canonical = createGameplayPreview(source);
  const variants = [
    replaceOnce(
      source,
      "player_shape:\n    .byte %00011000",
      "player_shape:\n    .byte %00010000",
    ),
    // Re-pinned for step 2: the assembled default is $88 now.
    replaceOnce(
      source,
      "GAMEPLAY_COLPF1 = $88",
      "GAMEPLAY_COLPF1 = $C4",
    ),
  ];

  for (const variant of variants) {
    assert.notDeepEqual(createGameplayPreview(variant), canonical);
  }

  const changedHulls = structuredClone(capitalHullsDefinition);
  changedHulls.allied.glyphs[0].pixels[0] = "1222";
  assert.notDeepEqual(createGameplayPreview(source, changedHulls), canonical);
});

test("capital-hulls strip preview is deterministic and shows all 32 rows", () => {
  const first = createCapitalHullsStripPreview(source, capitalHullsDefinition);
  const second = createCapitalHullsStripPreview(source, capitalHullsDefinition);
  assert.deepEqual(first, second);
  assert.equal(
    crypto.createHash("sha256").update(first).digest("hex"),
    "4e28d67ca7d611c2f310cf49915a4786ee91da6fdb386016c926cfcd653866d1",
    // Re-pinned for hull set v1: the strip now renders allied B against R1,
    // the resident level-one style, instead of the accepted C INDUSTRIAL pair.
    // Re-pinned again for hull set v2 (owner, 2026-09-22): the step-1 smoke on
    // hardware rejected the v1 look — a black deck interior left the hull
    // reading as a thin ribbon floating in space, and the frame line and rib
    // read as display artefacts. v2 draws full mass out to the screen edge with
    // the texture cut into it, so every hull pixel of the strip changes while
    // the profile, the turret and the colour registers do not.
    // Re-pinned a third time for hull set v1 step 2 (owner decision 2,
    // 2026-09-23): the allied steel the strip renders is the release default,
    // and that default is the brighter $88 the owner chose at the step-1 smoke.
    // Only the COLPF1 register value changed; no hull pixel moved.
    "production capital-hull render must remain pixel-identical to the approved full-mass set",
  );
  const info = inspectPng(first);
  assert.deepEqual([info.width, info.height], [640, 512]);
});

test("fighter burst trace is runtime-derived for both weapons and records the PlayerFighter hit", () => {
  const trace = createFighterBurstRuntimeTrace(source, capitalHullsDefinition);
  const lines = trace.trimEnd().split("\n");
  assert.equal(lines[0], [
    "weapon", "frame", "source_slot", "burst_state", "shot_index",
    "burst_interval", "post_burst_timer", "allocation_result", "projectile_slot",
    "previous_x", "previous_y", "current_x", "current_y", "visible_width",
    "visible_height", "colour_source", "colour_value", "collision_result",
    "player_fighter_energy_before", "player_fighter_energy_after",
  ].join(","));
  assert.ok(lines.some((line) => line.startsWith("PLAYER_FIGHTER,") && line.includes(",ALLOCATED,")));
  assert.ok(lines.some((line) => line.startsWith("INTERCEPTOR,") && line.includes(",ALLOCATED,")));
  assert.ok(lines.some((line) => line.startsWith("INTERCEPTOR,") && line.includes(",PLAYER_FIGHTER_HIT,100,90")));
  assert.ok(lines.some((line) => line.startsWith("PLAYER_FIGHTER,") && line.includes(",COLPF2,$1E,")));
  assert.ok(lines.some((line) => line.startsWith("INTERCEPTOR,") && line.includes(",COLPF3,$46,")));
});

test("weapon-transition trace covers every PAL frame and preserves held/fresh fire through exit", () => {
  const trace = createFighterWeaponTransitionTrace(source, capitalHullsDefinition);
  const lines = trace.trimEnd().split("\n");
  assert.equal(lines.length, 1 + 181 * 3);
  const records = lines.slice(1).map((line) => {
    const fields = line.split(",");
    return { line, scenario: fields[0], frame: Number(fields[1]), phase: fields[4],
      interpretation: fields[10], calls: Number(fields[11]), allocation: fields[20] };
  });
  assert.ok(records.every(({ calls }) => calls === 1));
  const heldControl = records.filter(({ scenario, allocation }) =>
    scenario === "ORDINARY_HELD_CONTROL" && allocation === "ALLOCATED").map(({ frame }) => frame);
  const heldTransition = records.filter(({ scenario, allocation }) =>
    scenario === "TRANSITION_HELD" && allocation === "ALLOCATED").map(({ frame }) => frame);
  assert.deepEqual(heldTransition, heldControl,
    "sector phases must not add silence beyond the canonical burst cadence");
  assert.ok(records.some(({ scenario, phase, allocation }) =>
    scenario === "TRANSITION_HELD" && phase === "DRAIN" && allocation === "ALLOCATED"));
  for (const frame of [20, 95, 100]) {
    assert.ok(records.some((record) => record.scenario === "TRANSITION_FRESH" &&
      record.frame === frame && record.interpretation === "FRESH_PRESS" &&
      record.allocation === "ALLOCATED"));
  }
});

test("shared fighter-explosion preview and trace use all six runtime phases", () => {
  const first = createSharedFighterExplosionPreview(source, capitalHullsDefinition);
  const second = createSharedFighterExplosionPreview(source, capitalHullsDefinition);
  assert.deepEqual(first, second);
  assert.deepEqual([inspectPng(first).width, inspectPng(first).height], [672, 160]);
  const trace = createSharedFighterExplosionTrace(source, capitalHullsDefinition);
  const lines = trace.trimEnd().split("\n");
  assert.equal(lines.length, 49);
  for (const owner of ["PLAYER_FIGHTER", "INTERCEPTOR"]) {
    const frames = lines.filter((line) => line.startsWith(`${owner},`))
      .map((line) => Number(line.split(",")[2]));
    assert.deepEqual(frames,
      [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
        3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5]);
  }
});

test("debris owner review is deterministic and covers visuals, trajectories, contact and wrap", () => {
  const first = createDebrisReviewPreview(source, entityEffectsDefinition);
  const second = createDebrisReviewPreview(source, entityEffectsDefinition);
  assert.deepEqual(first, second);
  assert.deepEqual([inspectPng(first).width, inspectPng(first).height], [1280, 880]);

  const trace = createDebrisReviewTrace(entityEffectsDefinition);
  assert.equal(trace, createDebrisReviewTrace(entityEffectsDefinition));
  const rows = trace.trimEnd().split("\n");
  assert.equal(rows.length, 1 + 38 * 3 + 2);
  for (const profile of ["STRAIGHT", "SLIGHT-LEFT", "SLIGHT-RIGHT"]) {
    const pass = rows.filter((row) => row.startsWith(`FULL_PASS_${profile},`));
    assert.equal(pass.length, 38);
    assert.ok(pass.some((row) => row.includes(",200,")), `${profile} lacks bottom despawn`);
  }
  assert.ok(rows.some((row) => row.includes(",DAMAGE_ACCEPTED,10,9")));
  assert.ok(rows.some((row) => row.includes(",INVULNERABLE,10,10")));
  assert.ok(rows.some((row) => row.includes(",$91,$92,") &&
    row.endsWith(",$91,$92,NONE,10,10")));
  const ringHeads = new Set(rows.slice(1, 39).map((row) => Number(row.split(",")[14])));
  assert.ok(ringHeads.has(21) && ringHeads.has(0), "preview pass must cross the A2 ring wrap");
});

test("destructible debris owner preview is an XEX/ATR-executed eight-frame breakup", () => {
  const first = createDestructibleDebrisPreview(source, entityEffectsDefinition);
  const second = createDestructibleDebrisPreview(source, entityEffectsDefinition);
  assert.deepEqual(first, second);
  assert.deepEqual([inspectPng(first).width, inspectPng(first).height], [5228, 720]);
  const trace = createDestructibleDebrisTrace(entityEffectsDefinition);
  assert.equal(trace, createDestructibleDebrisTrace(entityEffectsDefinition));
  const rows = trace.trimEnd().split("\n");
  assert.equal(rows.filter((row) => row.startsWith("xex,FINAL,")).length, 127);
  assert.equal(rows.filter((row) => row.startsWith("atr,FINAL,")).length, 127);
  assert.ok(rows.some((row) => row.startsWith("xex,FINAL,0,0,0,0,0,0,$1F,5,")));
  assert.ok(rows.some((row) => row.startsWith("atr,FINAL,0,0,0,0,0,0,$1F,5,")));
  assert.ok(rows.some((row) => row.startsWith("xex,FINAL,31,0,0,0,0,0,$00,0,")));
  assert.ok(rows.slice(1).every((row) => row.endsWith(",0742")),
    "runtime preview trace changed score");
});

test("Interceptor owner preview is the XEX/ATR-executed eight-frame local breakup", () => {
  const first = createInterceptorBreakupPreview(source, entityEffectsDefinition);
  const second = createInterceptorBreakupPreview(source, entityEffectsDefinition);
  assert.deepEqual(first, second);
  assert.deepEqual([inspectPng(first).width, inspectPng(first).height], [5228, 720]);
  const trace = createInterceptorBreakupTrace(entityEffectsDefinition);
  assert.equal(trace, createInterceptorBreakupTrace(entityEffectsDefinition));
  const rows = trace.trimEnd().split("\n");
  assert.equal(rows.filter((row) => row.startsWith("xex,BREAKUP,")).length, 127);
  assert.equal(rows.filter((row) => row.startsWith("atr,BREAKUP,")).length, 127);
  assert.ok(rows.some((row) => row.startsWith("xex,BREAKUP,0,1,2,24,$1E,$00,0,1,")));
  assert.ok(rows.some((row) => row.startsWith("atr,BREAKUP,0,1,2,24,$1E,$00,0,1,")));
  assert.ok(rows.some((row) => row.startsWith("xex,BREAKUP,1,1,2,23,$3C,$1F,5,0,")));
  assert.ok(rows.some((row) => row.startsWith("xex,BREAKUP,31,1,1,0,$00,$00,0,0,")));
  assert.ok(rows.slice(1).filter((row) => row.includes(",PRE_HIT,")).every((row) =>
    row.endsWith(",0742")));
  assert.ok(rows.slice(1).filter((row) => row.includes(",BREAKUP,")).every((row) =>
    row.endsWith(",0752")), "Interceptor score policy must remain byte-exact");
});

test("Rapid Fire owner preview executes the packed XEX/ATR pickup lifecycle", () => {
  const first = createWeaponPickupRapidFirePreview(source);
  const second = createWeaponPickupRapidFirePreview(source);
  assert.deepEqual(first, second);
  assert.deepEqual([inspectPng(first).width, inspectPng(first).height], [5228, 850]);

  const trace = createWeaponPickupRapidFireTrace();
  assert.equal(trace, createWeaponPickupRapidFireTrace());
  const rows = trace.trimEnd().split("\n");
  assert.equal(rows.filter((row) => row.startsWith("xex,")).length, 588);
  assert.equal(rows.filter((row) => row.startsWith("atr,")).length, 588);
  assert.ok(rows.some((row) => row.startsWith("xex,KILL_2,0,2,0,1,2,2,0,0,")));
  assert.ok(rows.some((row) => row.startsWith("xex,KILL_3,0,3,0,1,0,0,0,1,")));
  assert.ok(rows.some((row) => row.startsWith("xex,PENDING,29,")));
  assert.ok(rows.some((row) => row.includes(",ACTIVE,0,") &&
    row.includes(",120,120,121,122,123,")));
  for (const artifact of ["xex", "atr"]) {
    assert.equal(rows.filter((row) => row.startsWith(`${artifact},ACTIVE,`)).slice(0, 32)
      .every((row) => {
        const fields = row.split(",");
        return fields.slice(16, 21).join(",") === "120,120,121,122,123" &&
          fields.slice(23, 27).every((value) => value === "0") && fields[31] === "15";
      }), true);
  }
  assert.ok(rows.some((row) => {
    if (!row.startsWith("xex,PICKUP,0,")) return false;
    const fields = row.split(",");
    return fields[9] === "3" && fields[10] === "0" && fields[11] === "0" &&
      fields[12] === "128" && Number(fields[13]) >= 40 && Number(fields[13]) <= 184 &&
      fields[14] === "500" && fields[15] === "0" &&
      fields[16] === "120" && fields.slice(17, 21).every((value) => value === "0") &&
      fields.slice(27, 31).join(",") === "7,7,7,7" && fields[31] === "0";
  }));
  assert.ok(rows.some((row) => {
    if (!row.startsWith("xex,RAPID_TIMER,499,")) return false;
    const fields = row.split(",");
    return fields[9] === "0" && fields[14] === "0" && fields[16] === "120" &&
      fields.slice(27, 31).every((value) => value === "0");
  }));
});

test("HUD presentation preview covers four requested states at native and enlarged scale", () => {
  const review = createHudPresentationPreview(source);
  const native = createHudPresentationNativePreview(source);
  assert.deepEqual(createHudPresentationPreview(source), review);
  assert.deepEqual(createHudPresentationNativePreview(source), native);
  assert.deepEqual([inspectPng(review).width, inspectPng(review).height], [1350, 300]);
  assert.deepEqual([inspectPng(native).width, inspectPng(native).height], [320, 32]);
});

test("projectile colour owner previews use identical packed XEX and ATR runtime frames", () => {
  const xex = createPlayerFighterProjectileColourPreview(source, "xex");
  const atr = createPlayerFighterProjectileColourPreview(source, "atr");
  assert.deepEqual(xex, atr);
  assert.deepEqual([inspectPng(xex).width, inspectPng(xex).height], [3924, 476]);
});

test("burst-balance owner previews compare identical 80-frame XEX and ATR executions", () => {
  const xex = createPlayerFighterBurstBalancePreview(source, "xex");
  const atr = createPlayerFighterBurstBalancePreview(source, "atr");
  assert.deepEqual(xex, createPlayerFighterBurstBalancePreview(source, "xex"));
  assert.deepEqual(atr, createPlayerFighterBurstBalancePreview(source, "atr"));
  assert.deepEqual([inspectPng(xex).width, inspectPng(xex).height], [2620, 620]);
  assert.deepEqual([inspectPng(atr).width, inspectPng(atr).height], [2620, 620]);
  const xexRows = createPlayerFighterBurstBalanceTrace("xex").trimEnd().split("\n");
  const atrRows = createPlayerFighterBurstBalanceTrace("atr").trimEnd().split("\n");
  assert.equal(xexRows.length, 321);
  assert.deepEqual(atrRows.slice(1).map((row) => row.replace(/^atr,/, "xex,")),
    xexRows.slice(1));
  const emitted = (mode) => xexRows.slice(1)
    .filter((row) => row.startsWith(`xex,${mode},`))
    .reduce((sum, row) => sum + Number(row.split(",")[10]), 0);
  assert.deepEqual([emitted("NORMAL"), emitted("RAPID"), emitted("SPREAD")], [21, 30, 24]);
  assert.equal(xexRows.filter((row) => row.startsWith("xex,SPREAD,"))
    .every((row) => [0, 3].includes(Number(row.split(",")[10]))), true);
});

test("Spread Shot owner preview is deterministic executed XEX/ATR gameplay", () => {
  const first = createSpreadShotPreview(source);
  const second = createSpreadShotPreview(source);
  assert.deepEqual(first, second);
  assert.deepEqual([inspectPng(first).width, inspectPng(first).height], [5228, 850]);

  const trace = createSpreadShotTrace();
  assert.equal(trace, createSpreadShotTrace());
  const rows = trace.trimEnd().split("\n");
  assert.equal(rows.filter((row) => row.startsWith("xex,")).length, 27);
  assert.equal(rows.filter((row) => row.startsWith("atr,")).length, 27);
  assert.deepEqual(rows.filter((row) => row.startsWith("xex,DROP_"))
    .map((row) => row.split(",").slice(1, 7)), [
    ["DROP_1", "0", "1", "0", "1", "120"],
    ["DROP_2", "0", "1", "1", "2", "252"],
    ["DROP_3", "0", "1", "2", "0", "124"],
  ]);
  assert.ok(rows.includes(
    "xex,SPREAD_VOLLEY,0,4,1,0,,,,,,3,17,128,182,65,124,182,33,132,182"));
  assert.ok(rows.includes(
    "atr,SPREAD_VOLLEY,1,4,1,0,,,,,,3,17,128,176,65,123,176,33,133,176"));
  assert.ok(rows.some((row) => row.startsWith("xex,SPREAD_CLEAN,51,") &&
    row.split(",")[11] === "0"));
});

test("Shield Booster preview is deterministic and covers capsule plus three PlayerFighter positions", () => {
  const first = createShieldBoosterPreview(source);
  assert.deepEqual(createShieldBoosterPreview(source), first);
  assert.deepEqual([inspectPng(first).width, inspectPng(first).height], [1340, 268]);
});

test("Spread Shot hull owner sequences execute identical XEX and ATR backing paths", () => {
  const xexPreview = createSpreadShotHullPreview(source, "xex");
  const atrPreview = createSpreadShotHullPreview(source, "atr");
  assert.deepEqual([inspectPng(xexPreview).width, inspectPng(xexPreview).height], [2668, 2328]);
  assert.deepEqual([inspectPng(atrPreview).width, inspectPng(atrPreview).height], [2668, 2328]);
  assert.deepEqual(createSpreadShotHullPreview(source, "xex"), xexPreview,
    "XEX hull owner sequence must be deterministic");

  const xexRows = createSpreadShotHullTrace("xex").trimEnd().split("\n");
  const atrRows = createSpreadShotHullTrace("atr").trimEnd().split("\n");
  assert.equal(xexRows.length, 73);
  assert.equal(atrRows.length, 73);
  assert.deepEqual(atrRows.slice(1).map((row) => row.replace(/^atr,/, "xex,")), xexRows.slice(1));
  for (const [rowIndex, row] of xexRows.slice(1).entries()) {
    const fields = row.split(",").map((value, index) => index < 3 ? value : Number(value));
    assert.equal(fields[8], 0, "owner sequence contains a backing mismatch");
    const activeIds = [fields[9], fields[14], fields[19]];
    assert.equal(activeIds.every((active, slot) => active === 0 || active === [65, 17, 33][slot]), true);
    if (rowIndex % 12 === 0) assert.deepEqual(activeIds, [65, 17, 33]);
    const screenCodes = [fields[12], fields[17], fields[22]];
    assert.equal(screenCodes.every((code, slot) => activeIds[slot] === 0 || code < 128), true,
      "owner sequence contains a red/inverse Spread projectile");
  }
});
