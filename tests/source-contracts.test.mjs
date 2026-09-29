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

test("the ASM Light art selector matches the C Interceptor record offset", () => {
  const light = fs.readFileSync(path.join(rootDirectory, "src", "hybrid", "light-kernel.s"), "utf8");
  const header = fs.readFileSync(path.join(rootDirectory, "src", "c", "enemy-archetype.h"), "utf8");
  const asm = /^LIGHT_OFFSET_INTERCEPTOR\s*=\s*(\d+)\s*$/m.exec(light);
  const index = /ENEMY_ARCHETYPE_INTERCEPTOR\s*=\s*(\d+)\s*,/.exec(header);
  const recordBytes = /#define ENEMY_ARCHETYPE_RECORD_BYTES\s+(\d+)u/.exec(header);
  assert.ok(asm && index && recordBytes, "Light art selector or archetype layout not found");
  assert.match(header,
    /#define ENEMY_ARCHETYPE_OFFSET\(index\) \(\(index\) \* ENEMY_ARCHETYPE_RECORD_BYTES\)/);
  assert.equal(Number(asm[1]), Number(index[1]) * Number(recordBytes[1]),
    "LIGHT_OFFSET_INTERCEPTOR = ENEMY_ARCHETYPE_OFFSET(ENEMY_ARCHETYPE_INTERCEPTOR)");
  assert.match(light, /cmp #LIGHT_OFFSET_INTERCEPTOR/);
});

test("C and ASM agree on the hostile weapon_class ids and the authored visual order", () => {
  const header = fs.readFileSync(path.join(rootDirectory, "src", "c", "enemy-archetype.h"), "utf8");
  const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
  const asset = JSON.parse(fs.readFileSync(
    path.join(rootDirectory, "assets", "graphics", "fighter-weapons.json"), "utf8"));
  const ids = { PULSE: 1, LASER: 2, BOMBER: 3 };
  assert.doesNotMatch(header + source, /ENEMY_WEAPON_RED_PAIRSHOT/,
    "the weapon class names no colour");
  for (const [name, value] of Object.entries(ids)) {
    const c = new RegExp(`ENEMY_WEAPON_${name}\\s*=\\s*(\\d+)`).exec(header);
    const asm = new RegExp(`^ENEMY_WEAPON_${name}\\s*=\\s*(\\d+)\\s*$`, "m").exec(source);
    assert.ok(c && asm, `ENEMY_WEAPON_${name} mirror missing`);
    assert.equal(Number(c[1]), value, `C ENEMY_WEAPON_${name}`);
    assert.equal(Number(asm[1]), value, `ASM ENEMY_WEAPON_${name}`);
    assert.equal(asset.hostileWeaponVisuals.classes[value - 1].id, name,
      `authored visual ${value} is ${name}`);
  }
  assert.match(source, /^FIGHTER_PROJECTILE_WEAPON_CLASS_SHIFT = 3$/m);
});

// T10 (docs/plans/director-4.6.md §9). Roadmap 4.6 step 2 retires six named
// things at once, and the point of naming them here is that a later session
// cannot quietly reintroduce one: each was a piece of SCHEDULE living in code,
// and the schedule is level data now.
test("T10: the provisional schedulers and the capital frame gate are gone from src/", () => {
  const retired = [
    ["encounter_heavy_", "the Heavy smoke scheduler's tables and its counter"],
    ["encounter_light_schedule", "the Light escort schedule"],
    ["provisional_interceptor_director_request", "the wrapper that forced a phase policy"],
    ["select_interceptor_request_phase", "the phase selector it called"],
    ["FIRST_CAPITAL_FRAME", "the capital's frame gate - the row clock is the only clock"],
    ["LIGHT_FORCE_POPULATION", "the measurement build flag a real WaveDef replaces"],
  ];
  const sources = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(c|h|s)$/.test(entry.name)) sources.push(full);
    }
  };
  walk(path.join(rootDirectory, "src"));
  assert.ok(sources.length >= 8, "the walk found the source tree");
  for (const [name, why] of retired) {
    for (const file of sources) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), new RegExp(name),
        `${path.relative(rootDirectory, file)} still names ${name} (${why})`);
    }
  }
});

// The other half of the same contract: what the Director reads INSTEAD. The
// level compiler generates the offsets, the C indexes them by name and the ABI
// asserts the addresses at link time, so this checks the chain is wired rather
// than re-deriving any number.
test("the Director's schedule comes from the level image, not from compiled-in constants", () => {
  const director = fs.readFileSync(path.join(rootDirectory, "src/c/director.c"), "utf8");
  assert.match(director, /#include "level-def\.h"/,
    "the reader takes its offsets from the compiler's generated header");
  assert.match(director, /#pragma bss-name \("LEVEL_CORE"\)/,
    "the core page is a placed bss object, not a table in the image");
  for (const array of ["sector_kind", "sector_len", "sector_caps", "sector_archetypes",
    "sector_hazards", "sector_wave_first", "sector_wave_count",
    "wave_row", "wave_flags", "wave_archetype", "wave_count", "wave_spacing",
    "wave_entry", "wave_member_offset"]) {
    assert.match(director, new RegExp(`uint8_t ${array}\\[`),
      `the Director declares the ${array} column of the core page`);
  }
  assert.doesNotMatch(director, /U8_AT\(0xA[A-C]/i,
    "plan §3.4: level data is never reached through U8_AT");
  const config = fs.readFileSync(path.join(rootDirectory, "cfg/encounter-director.cfg"), "utf8");
  assert.match(config, /LEVEL_CORE_RAM: start = \$AA00, size = \$0100, type = rw, file = ""/,
    "the page is placed in the level buffer and emitted into no artifact");
  const abi = fs.readFileSync(path.join(rootDirectory, "src/hybrid/c-asm-abi.s"), "utf8");
  assert.match(abi, /\.assert _sector_kind = LEVEL_CORE_SECTOR_KIND_ADDRESS, lderror/,
    "the link asserts the reader's page is the compiler's page");
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
  assert.doesNotMatch(currentSources, /\$8100-\$(?:9AA3|9A3D|9ACE)/);
  assert.doesNotMatch(currentSources, /\b2,?027[- ]bytes\b/i);
  assert.doesNotMatch(artDirection, /\bresidual\b/i);
  assert.doesNotMatch(roadmap, /next[^\n]*entity\/effects foundation/i);
  assert.doesNotMatch(runtimeHeadroom, /feature\/runtime-headroom/);
  // Rapid Fire keeps the player's colour; it must never borrow hostile red.
  assert.match(gameDesign,
    /### Rapid Fire — implemented[\s\S]+retain the Player Fighter's established\s+yellow\/gold/);
  assert.doesNotMatch(currentSources, /Rapid Fire projectile:[^\n]*red/i);
  // Production burst sizes, in the current PairShot terminology: 4/4/5 logical
  // PairShots for 8/8/10 visible impulses.
  assert.match(gameDesign,
    /normal Player Fighter weapon fires four logical PairShots[\s\S]+preserving eight visible impulses[\s\S]+Rapid uses five PairShots for\s+ten visible impulses; Spread uses four PairShots for eight/);
  assert.match(gameDesign,
    /### Rapid Fire — implemented[\s\S]+expands the\s+burst to five PairShots \/ ten visible impulses/);
  assert.doesNotMatch(gameDesign, /normal Player Fighter weapon fires a ten-projectile burst/);
});

// Documentation figures that used to be copied by hand and went stale are now
// bound to generated build output instead of to a literal in this test.
test("architecture quotes the generated loader figure rather than a stale copy", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(rootDirectory, "build", "manifest.json"), "utf8"));
  const architecture = fs.readFileSync(
    path.join(rootDirectory, "docs", "architecture.md"), "utf8");
  const packed = manifest.loaderScreen.packedBitmapBytes.toLocaleString("en-US");
  assert.match(architecture, new RegExp(`packs them to \\*\\*${packed} bytes\\*\\*`),
    `architecture.md must quote the current packed loader bitmap size (${packed} B)`);
});

test("accepted runtime, candidate and history stay distinguishable", () => {
  const status = fs.readFileSync(path.join(rootDirectory, "docs", "STATUS.md"), "utf8");

  // STATUS must separate the documentation HEAD from the accepted runtime.
  assert.match(status, /## Repository HEAD/);
  assert.match(status, /## Accepted runtime checkpoint/);
  // The accepted checkpoint is named by commit and artifact, never indirectly.
  assert.match(status, /`0a90c1c`/);
  assert.match(status,
    /8940d646fcb2e59e54cb383de382ac86dfb4959f18016854919c3f5157b89d34/);
  assert.doesNotMatch(status, /the commit that follows\s+`?51c97c6/,
    "the accepted checkpoint must be named, not described relative to another commit");

  // Archived documents must be archived, banner-marked, and delinked.
  for (const gone of ["docs/enemy-roster-v2.md"]) {
    assert.ok(!fs.existsSync(path.join(rootDirectory, gone)),
      `${gone} is a pre-hybrid proposal and belongs under docs/history/`);
  }
  for (const archived of [
    "docs/history/enemy-roster-v2-pre-hybrid-proposal.md",
    "docs/history/hardware-testing-pre-hybrid-2026-09-15.md",
  ]) {
    const text = fs.readFileSync(path.join(rootDirectory, archived), "utf8");
    assert.match(text, /^> \*\*ARCHIVED/,
      `${archived} must open with an ARCHIVED banner`);
  }
});

test("documentation keeps the current Heavy/Light PMG contract", () => {
  const read = (name) => fs.readFileSync(path.join(rootDirectory, name), "utf8");
  const adr = read("docs/decisions/ADR-002-gameplay-screen.md");
  const architecture = read("docs/architecture.md");
  const hybrid = read("docs/hybrid-c-architecture.md");

  // P1/P2 are two independent Heavy enemy players, not one machine plus a scanner.
  assert.match(adr, /`P1` and `P2` are the two \*\*Heavy\*\* enemy players/);
  assert.doesNotMatch(adr, /P1 is the Interceptor and P2 its red scanner/);
  assert.match(architecture, /P1 carries Raider slot 0 and P2 carries Raider slot 1/);

  // Light-class enemies never take a PMG player.
  assert.match(adr, /\*\*Light\*\*-class enemies allocate no PMG player/);
  assert.match(hybrid, /PMG players `P1`\/`P2` belong to the Heavy enemy class/);
  // REBASELINED for roadmap 4.6 Light multiplicity: the capacity is a four-slot
  // FORMAT plus per-sector ceilings, which are separate things. The old
  // LIGHT_ACTIVE_MAX = 1 survives only in the superseded section, so assert
  // the new contract and that the old line is not still stated as current.
  assert.match(hybrid, /LIGHT_SLOT_COUNT = 4\b/);
  assert.match(hybrid, /LIGHT_CEILING_SWARM = 3\b/);
  assert.match(hybrid, /LIGHT_CEILING_ELITE = 1\b/);
  assert.match(hybrid, /LIGHT_CEILING_CAPITAL = 0\b/);
  assert.match(hybrid, /#### Superseded: capacity before roadmap 4\.6/);
});

test("documentation describes the accepted PMG pickup, not the retired capsule", () => {
  const read = (name) => fs.readFileSync(path.join(rootDirectory, name), "utf8");
  const artDirection = read("docs/art-direction.md");
  const active = [artDirection, read("docs/architecture.md"),
    read("docs/game-design.md"), read("docs/hardware-testing.md")].join("\n");

  // RE-POINTED 2026-09-28 (owner decision, docs/plans/pickup-colour.md §7
  // item 2): the mark left the GTIA fifth player for PLAYER3, so the document
  // must describe a PLAYER3 image in COLPM3. The assertion keeps its job --
  // the art direction names the accepted object, not a retired one -- and the
  // COLPF3 half becomes its opposite: COLPF3 is the ENEMY accent, and the
  // document must say the capsule does not share it.
  assert.match(artDirection, /solid 16-scanline PMG mark/);
  assert.match(artDirection, /`PLAYER3` image, eight colour clocks wide at `SIZEP3 = 0`, drawn in `COLPM3`/);
  assert.match(artDirection, /`COLPM3` is the capsule's own register in `OPEN`/);
  assert.doesNotMatch(artDirection, /drawn in `COLPF3`/,
    "COLPF3 is the enemy accent; a pickup drawn in it is the defect this retired");
  // The retired phased character capsule must not be described as current.
  assert.doesNotMatch(active, /phase\s+zero occupies 2x2 cells/,
    "the phased character pickup capsule is retired; the pickup is a PMG mark");
  assert.doesNotMatch(active, /Pickup capsules are large 8x16-scanline objects/);
});

test("no active document treats the legacy Interceptor as the planned archetype", () => {
  const activeNames = ["docs/game-design.md", "docs/architecture.md",
    "docs/art-direction.md", "docs/hardware-testing.md",
    "docs/decisions/ADR-002-gameplay-screen.md"];
  const read = (name) => fs.readFileSync(path.join(rootDirectory, name), "utf8");

  // Legacy prose that called the accepted ordinary enemy an "Interceptor".
  const legacyProse = [
    /ordinary Interceptor/i,
    /release Interceptor/i,
    /Interceptor silhouette/i,
    /single-Interceptor/i,
    /Interceptor contact/i,
    /Interceptor shots/i,
  ];
  for (const name of activeNames) {
    const text = read(name);
    for (const pattern of legacyProse) {
      assert.doesNotMatch(text, pattern,
        `${name} still describes the accepted enemy as an Interceptor; it is the Raider`);
    }
  }

  // architecture.md must explain that legacy runtime symbols are Raider-era.
  const architecture = read("docs/architecture.md");
  assert.match(architecture, /## Legacy symbol naming/);
  assert.match(architecture, /INTERCEPTOR_PROJECTILE_SLOT_BASE/);
  assert.match(architecture,
    /do \*\*not\*\* identify the planned Light-class Interceptor `EnemyArchetype`/);

  // Roadmap 4.4: the Interceptor ships in the accepted runtime 0a90c1c and is
  // owner-accepted under it (owner smoke PASS 2026-09-18). Every document must
  // say so with the same label; a candidate label for it is now stale.
  const gameDesign = read("docs/game-design.md");
  assert.match(gameDesign, /### Interceptor — \*\*OWNER-ACCEPTED\*\*/);
  const status = read("docs/STATUS.md");
  assert.match(status,
    /## Interceptor \(plan step 4\.4\) — \*\*OWNER-ACCEPTED\*\*[^\n]*`0a90c1c`/);
  assert.doesNotMatch(status, /Interceptor[^\n]*OWNER-SMOKE CANDIDATE/);
  const roadmap = read("docs/plan-realizacji.md");
  assert.match(roadmap, /### 4\.4 Interceptor — OWNER-ACCEPTED/);
  // 4.4 must not reopen the Heavy-PMG option for a Light-class enemy.
  assert.doesNotMatch(roadmap, /znakowy Light albo Heavy PMG/,
    "owner decision 15 forbids rendering the Interceptor as a Heavy PMG");
});

test("the C/ASM ownership matrix is normative in exactly one place", () => {
  const agents = fs.readFileSync(path.join(rootDirectory, "AGENTS.md"), "utf8");
  const ownershipHeadings = agents.match(/^#+ .*C \/ ASM ownership.*$/gm) ?? [];
  assert.equal(ownershipHeadings.length, 1,
    "AGENTS.md must carry exactly one normative C/ASM ownership section");
  assert.match(agents, /### C \/ ASM ownership/);
  assert.match(agents,
    /If a new gameplay behaviour can be expressed as a decision or a state\s+> transition, it belongs in C by default\./);

  // Other documents reference it instead of restating it.
  const workflow = fs.readFileSync(
    path.join(rootDirectory, "docs", "agent-workflows", "feature.md"), "utf8");
  assert.doesNotMatch(workflow, /^## C owns/m);
  assert.match(workflow, /normative in `AGENTS\.md`/);

  const rules = fs.readFileSync(
    path.join(rootDirectory, "docs", "reguly-projektu.txt"), "utf8");
  assert.match(rules, /AGENTS\.md/);
  // Session start must be Git + STATUS, then task-selected reading.
  assert.match(rules, /obowiązkowe są wyłącznie: stan Gita[^.]*oraz docs\/STATUS\.md/);
  assert.match(agents, /## Session start/);
  assert.match(agents, /read \*\*only\*\* the documents the task actually needs/);
});
