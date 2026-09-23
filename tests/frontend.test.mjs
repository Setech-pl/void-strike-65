import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readRuntimeBytes } from "../scripts/runtime-image.mjs";
import { LOADER_DISPLAY_LIST_ADDRESS } from "../scripts/loader-assets.mjs";
import {
  evaluateExpression,
  readFrontendGraphicsSource,
  readStartMenuRuntimeState,
} from "../scripts/preview.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
const residentSource = source.slice(0, source.indexOf('.segment "BOOT_STAGE2"'));
const map = fs.readFileSync(path.join(rootDirectory, "build", "void-strike-65.map"), "utf8");
const labels = new Map(
  fs
    .readFileSync(path.join(rootDirectory, "build", "void-strike-65.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);

function readXexBytes(address, length) {
  return readRuntimeBytes(rootDirectory, address, length);
}

function readBroadsideRuntimeBytes(address, length) {
  return readRuntimeBytes(rootDirectory, address, length);
}

function routine(label) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `${label}:`);
  assert.notEqual(start, -1, `missing routine ${label}`);
  let end = start + 1;
  while (
    end < lines.length &&
    !/^[A-Za-z_][A-Za-z0-9_]*:\s*$/.test(lines[end].replace(/;.*/, "").trim())
  ) {
    end += 1;
  }
  return lines.slice(start + 1, end).join("\n");
}

test("boot enters an explicit ten-state frontend/game state machine", () => {
  assert.match(source, /STATE_LOADER\s*=\s*0/);
  assert.match(source, /STATE_MAIN_MENU\s*=\s*1/);
  assert.match(source, /STATE_OPTIONS\s*=\s*2/);
  assert.match(source, /STATE_TOP_SCORES\s*=\s*3/);
  assert.match(source, /STATE_EXIT_CONFIRM\s*=\s*4/);
  assert.match(source, /STATE_EXITED\s*=\s*5/);
  assert.match(source, /STATE_GAMEPLAY\s*=\s*6/);
  assert.match(source, /STATE_GAME_OVER\s*=\s*7/);
  assert.match(source, /STATE_PAUSED\s*=\s*8/);
  assert.match(source, /STATE_PAUSE_QUIT_CONFIRM\s*=\s*9/);
  assert.match(source,
    /jsr show_loader[\s\S]+jmp finish_startup_after_loader[\s\S]+finish_startup_after_loader:[\s\S]+jsr enter_main_menu\s+jmp frontend_loop/);
});

test("main menu labels are exact, ordered, and default to START GAME", () => {
  const frontend = readFrontendGraphicsSource(source);
  const menuRows = frontend.mainMenuRecords.filter(({ mode }) => mode === 6);
  assert.deepEqual(
    menuRows.map(({ text }) => text),
    ["START GAME", "OPTIONS", "TOP SCORES", "EXIT"],
  );
  const title = frontend.mainMenuRecords.find(({ mode }) => mode === 7);
  assert.deepEqual(
    [title.text, title.column, title.y],
    ["VOID STRIKE 65", 4, 24],
  );
  assert.equal(frontend.defaultSelection, 0);
  assert.equal(frontend.markerAddresses.length, 13);
});

test("frontend uses distinct clean 6x7 glyphs within ANTIC 6/7 indices", () => {
  const frontend = readFrontendGraphicsSource(source);
  const { constants, frontendCharset } = frontend;
  const glyph = (character) => {
    const index = constants.get("CH_FRONT_A") + character.charCodeAt(0) - 0x41;
    return [...frontendCharset.subarray(index * 8, index * 8 + 8)];
  };
  for (let index = 1; index <= constants.get("CH_FRONT_MARKER"); index += 1) {
    const rows = frontendCharset.subarray(index * 8, index * 8 + 8);
    assert.equal(rows[7], 0, `glyph ${index} needs a blank eighth row`);
    assert.ok([...rows].every((row) => (row & 0x01) === 0));
  }
  for (const [left, right] of [["E","F"],["O","D"],["R","P"],["I","T"]]) {
    assert.notDeepEqual(glyph(left), glyph(right), `${left}/${right} must remain distinct`);
  }
  assert.ok(constants.get("CH_FRONT_MARKER") < 64);
  assert.equal(constants.get("CH_FRONT_GAP"), 44);
  assert.deepEqual([...frontendCharset.subarray(44 * 8, 45 * 8)], Array(8).fill(0));
});

test("UP and DOWN move once per neutral release and wrap at both bounds", () => {
  assert.match(
    routine("frontend_input_poll"),
    /cmp #\$0F[\s\S]+lda TRIG0[\s\S]+sta frontend_input_armed/,
  );
  assert.match(
    routine("move_selection_up"),
    /lda frontend_selection[\s\S]+bne[\s\S]+stx frontend_selection[\s\S]+dec frontend_selection/,
  );
  assert.match(
    routine("move_selection_down"),
    /cpx frontend_selection[\s\S]+lda #\$00[\s\S]+sta frontend_selection[\s\S]+inc frontend_selection/,
  );
});

test("an idle main menu has no path to gameplay without a gated FIRE event", () => {
  assert.doesNotMatch(routine("frontend_loop"), /SECTOR_READER_ENTRY|start_gameplay|main_loop/);
  // Roadmap 4.3: the gated FIRE now enters the sector reader, which tears the
  // frontend down, shows the loader screen, reads the level and only then
  // reaches start_gameplay. The gate itself is unchanged.
  assert.match(
    routine("handle_main_menu_input"),
    /lda TRIG0\s+bne @done[\s\S]+lda frontend_selection\s+bne[\s\S]+jmp SECTOR_READER_ENTRY/,
  );
  assert.doesNotMatch(routine("render_frontend_state"),
    /SECTOR_READER_ENTRY|start_gameplay|main_loop/);
});

test("frontend text records explicitly test the byte returned by the reader", () => {
  assert.match(
    routine("render_frontend_data"),
    /@text:\s+jsr read_frontend_data\s+cmp #\$00\s+beq @record/,
    "pointer advancement changes CPU flags, so the terminator needs its own comparison",
  );
});

test("FIRE is release-gated across screens and into gameplay", () => {
  assert.match(routine("enter_frontend_state"), /sta frontend_input_armed/);
  assert.match(routine("start_gameplay"), /sta gameplay_fire_gate/);
  assert.match(
    routine("read_input"),
    /lda gameplay_fire_gate[\s\S]+lda TRIG0[\s\S]+beq @done[\s\S]+sta gameplay_fire_gate/,
  );
});

test("menu actions use explicit transitions and one gameplay reset path", () => {
  const mainInput = routine("handle_main_menu_input");
  // 4.3: START GAME dispatches to the reader's fixed entry vector at $A000,
  // an operand-only change - both forms are three bytes, so MAIN pays nothing.
  assert.match(mainInput, /jmp SECTOR_READER_ENTRY/);
  assert.doesNotMatch(mainInput, /jmp start_gameplay/,
    "START GAME must go through the reader, not straight into gameplay");
  assert.match(mainInput, /jmp enter_options/);
  assert.match(mainInput, /jmp enter_top_scores/);
  assert.match(mainInput, /jmp enter_exit_confirmation/);

  const startGameplay = routine("start_gameplay");
  for (const resetCall of [
    "music_stop",
    "clear_pmg",
    "clear_screen",
    "init_state",
    "init_screen",
    "draw_player",
    "draw_enemy",
    "update_score_display",
  ]) {
    assert.match(startGameplay, new RegExp(`jsr ${resetCall}`));
  }
  assert.doesNotMatch(routine("frontend_loop"), /update_enemy|handle_collisions|update_sound/);
});

test("SOUND defaults ON, toggles in RAM, and OFF silences all POKEY channels", () => {
  assert.match(source, /lda #\$01\s+sta sound_enabled\s+; options default: SOUND ON/);
  assert.match(routine("toggle_sound"), /eor #\$01\s+sta sound_enabled/);
  assert.match(routine("toggle_sound"), /jsr silence_audio/);
  const silence = routine("silence_audio");
  for (const register of [
    "AUDF1", "AUDC1", "AUDF2", "AUDC2", "AUDF3", "AUDC3", "AUDF4", "AUDC4", "AUDCTL",
  ]) {
    assert.match(silence, new RegExp(`sta ${register}`));
  }
  assert.match(routine("play_player_fighter_projectile_sound"), /lda sound_enabled\s+beq @accepted/);
  assert.match(routine("play_hit_sound"), /lda sound_enabled\s+beq @done/);
  assert.match(
    routine("update_sound"),
    /lda sound_enabled[\s\S]+jsr silence_audio\s+jmp @damage/,
    "SOUND OFF must preserve the gameplay damage-flash update",
  );
});

test("OPTIONS persists GAME MUSIC and a MEDIUM-default difficulty", () => {
  const constants = readFrontendGraphicsSource(source).constants;
  const difficultyAddress = constants.get("DIFFICULTY_SETTING");
  assert.equal(difficultyAddress, 0x4e70);
  assert.deepEqual(
    [constants.get("DIFFICULTY_EASY"), constants.get("DIFFICULTY_MEDIUM"),
      constants.get("DIFFICULTY_HARD"), constants.get("DIFFICULTY_DEFAULT")],
    [0, 1, 2, 1],
  );
  assert.match(source,
    /options_screen_data:[\s\S]+"OPTIONS"[\s\S]+"L\/R CHANGE   FIRE SELECT"/);
  assert.match(source,
    /option_label_sound:[\s\S]+option_label_music:[\s\S]+option_label_difficulty:[\s\S]+option_label_back:/);
  assert.match(routine("handle_options_input"), /jmp handle_options_input_resident/);
  assert.match(routine("handle_options_input_resident"),
    /ldx #\$03[\s\S]+beq @sound_row[\s\S]+beq @game_music_row[\s\S]+beq @difficulty_row[\s\S]+jmp enter_main_menu/);
  assert.match(routine("handle_options_input_resident"),
    /and #\$04[\s\S]+select_previous_difficulty[\s\S]+and #\$08[\s\S]+select_next_difficulty/);
  assert.match(routine("select_previous_difficulty"),
    /lda DIFFICULTY_SETTING[\s\S]+lda #DIFFICULTY_HARD[\s\S]+sbc #\$01/);
  assert.match(routine("select_next_difficulty"),
    /cmp #DIFFICULTY_HARD[\s\S]+lda #DIFFICULTY_EASY[\s\S]+adc #\$01/);
  assert.match(routine("set_difficulty"), /sta DIFFICULTY_SETTING[\s\S]+jmp draw_difficulty_value/);
  assert.match(routine("render_frontend_state"),
    /cmp #STATE_OPTIONS[\s\S]+jsr draw_options_structure[\s\S]+jmp update_frontend_marker/);
  assert.match(routine("draw_options_labels"),
    /cpx #\$04[\s\S]+jsr draw_sound_value[\s\S]+jsr draw_game_music_value[\s\S]+jmp draw_difficulty_value/);

  const startupAddress = labels.get("finish_startup_after_loader");
  const startupBytes = readXexBytes(startupAddress,
    labels.get("__ENTITY_CODE_RUN__") + labels.get("__ENTITY_CODE_SIZE__") - startupAddress);
  assert.notEqual(startupBytes.indexOf(Buffer.from([
    0xa9, 0x01, 0x8d, difficultyAddress & 0xff, difficultyAddress >> 8,
  ])), -1, "boot must store MEDIUM in persistent RAM");
  const setBytes = readBroadsideRuntimeBytes(labels.get("set_difficulty"), 6);
  assert.deepEqual([...setBytes.subarray(0, 3)], [
    0x8d, difficultyAddress & 0xff, difficultyAddress >> 8,
  ]);
  assert.doesNotMatch(routine("enter_frontend_state"), /DIFFICULTY_SETTING/);
  assert.doesNotMatch(routine("init_state"), /DIFFICULTY_SETTING/);
  assert.match(routine("draw_options_structure"),
    /CH_FRONT_PIPE\|ANTIC67_COLOR_PF2[\s\S]+OPTIONS_SOUND_OFFSET\+19[\s\S]+OPTIONS_MUSIC_OFFSET\+19[\s\S]+OPTIONS_DIFFICULTY_OFFSET\+19[\s\S]+OPTIONS_BACK_OFFSET\+19/);
});

test("TOP SCORES renders all ten RAM records and returns only on FIRE", () => {
  assert.match(source, /top_score_row_template:[\s\S]+CH_FRONT_PIPE\|ANTIC67_COLOR_PF2/);
  assert.match(routine("draw_top_score_rows"), /cpx #10\s+bne @row/);
  assert.match(routine("draw_top_score_rows"), /cpx #\$09\s+beq @ten/);
  assert.match(routine("draw_top_score_rows"),
    /TOP_SCORE_TABLE_HI,x[\s\S]+TOP_SCORE_TABLE_LO,x[\s\S]+cpx #10/);
  assert.match(source,
    /TOP_SCORE_RECORD_COUNT\s*=\s*10[\s\S]+draw_top_score_bcd_byte:[\s\S]+CH_FRONT_ZERO/);
  assert.match(routine("handle_top_scores_input"), /jmp handle_game_over_input/);
  assert.match(routine("handle_game_over_input"), /lda TRIG0[\s\S]+jmp enter_main_menu/);
  assert.doesNotMatch(residentSource, /jsr SIOV|initials_entry|save_high_scores/i);
});

test("ANTIC 6 attributes route the selected marker and full label to $D8", () => {
  const defaultState = readStartMenuRuntimeState(source, 0);
  const movedState = readStartMenuRuntimeState(source, 1);
  const { constants, mainMenuHardwareState } = defaultState.graphics;
  const screenAddress = constants.get("SCREEN");
  const highlight = constants.get("KAWASAKI_GREEN");

  assert.equal(highlight, 0xd8);
  assert.equal(mainMenuHardwareState.get("COLPF3"), highlight);
  assert.equal(defaultState.selection, 0);

  const labelCodes = (state, selection) => {
    const marker = state.graphics.markerAddresses[selection] - screenAddress;
    return [...state.screen.subarray(marker + 2, marker + 12)].filter(Boolean);
  };
  assert.ok(labelCodes(defaultState, 0).every((code) => (code & 0xc0) === 0xc0));
  assert.ok(labelCodes(defaultState, 1).every((code) => (code & 0xc0) === 0x00));
  assert.ok(labelCodes(movedState, 0).every((code) => (code & 0xc0) === 0x00));
  assert.ok(labelCodes(movedState, 1).every((code) => (code & 0xc0) === 0xc0));

  const recordColors = (state, record) => {
    const colors = new Set();
    const sourceWidth = 320;
    const cellWidth = record.mode === 6 || record.mode === 7 ? 16 : 8;
    const height = record.mode === 7 ? 16 : 8;
    for (let y = record.y; y < record.y + height; y += 1) {
      for (
        let x = record.column * cellWidth;
        x < (record.column + record.text.length) * cellWidth;
        x += 1
      ) {
        const color = state.registerPixels[y * sourceWidth + x];
        colors.add(color);
      }
    }
    return colors;
  };
  const menuRecords = defaultState.graphics.mainMenuRecords.filter(
    ({ mode }) => mode === 6,
  );
  assert.deepEqual(recordColors(defaultState, menuRecords[0]), new Set([0x00, 0xd8]));
  assert.deepEqual(recordColors(defaultState, menuRecords[1]), new Set([0x00, 0x0e]));
  assert.deepEqual(recordColors(movedState, menuRecords[0]), new Set([0x00, 0x0e]));
  assert.deepEqual(recordColors(movedState, menuRecords[1]), new Set([0x00, 0xd8]));

  const defaultMarker = defaultState.graphics.markerAddresses[0] - screenAddress;
  assert.equal(
    defaultState.screen[defaultMarker],
    constants.get("CH_FRONT_MARKER") | constants.get("ANTIC67_COLOR_PF3"),
  );
  assert.equal(defaultState.screen[defaultMarker] & 0xc0, 0xc0);

  const selectedRecord = menuRecords[0];
  let blackPixels = 0;
  for (let y = selectedRecord.y; y < selectedRecord.y + 8; y += 1) {
    for (let x = selectedRecord.column * 16; x < 19 * 16; x += 1) {
      blackPixels += defaultState.registerPixels[y * 320 + x] === 0 ? 1 : 0;
    }
  }
  assert.ok(blackPixels > 0, "selected ANTIC 6 row must retain black glyph backgrounds");

  const updateBytes = readXexBytes(labels.get("update_frontend_marker"), 96);
  const toggleBytes = readXexBytes(labels.get("toggle_main_menu_highlight"), 32);
  assert.notEqual(updateBytes.indexOf(Buffer.from([0x09, 0xc0])), -1);
  assert.notEqual(toggleBytes.indexOf(Buffer.from([0x49, 0xc0])), -1);

  assert.match(routine("handle_main_menu_input"), /jsr toggle_main_menu_highlight[\s\S]+jmp move_selection_up/);
  assert.match(routine("handle_main_menu_input"), /jsr toggle_main_menu_highlight[\s\S]+jmp move_selection_down/);
  assert.match(routine("toggle_main_menu_highlight"), /eor #MAIN_MENU_HIGHLIGHT_XOR/);
});

test("main-menu studio credit is removed while loader copyright source remains", () => {
  const frontend = readFrontendGraphicsSource(source);
  assert.equal(
    frontend.mainMenuRecords.some(({ text }) => text.includes("SETECH")),
    false,
  );
  const loader = JSON.parse(
    fs.readFileSync(
      path.join(rootDirectory, "assets", "graphics", "loader-bitmap.json"),
      "utf8",
    ),
  );
  assert.ok(
    loader.elements.some(
      ({ name, text }) => name === "studio" &&
        text === "SETECH GAME STUDIO",
    ),
  );
  assert.ok(
    loader.elements.some(
      ({ name, text }) => name === "copyright" && text === "(C) 2026",
    ),
  );
});

test("EXIT defaults to NO and reaches a stable, silent reset-only state", () => {
  assert.match(routine("enter_exit_confirmation"), /lda #STATE_EXIT_CONFIRM/);
  assert.equal(
    readFrontendGraphicsSource(source).defaultSelection,
    0,
  );
  const exited = routine("enter_exited_state");
  assert.match(exited, /jsr music_stop/);
  assert.match(exited, /@wait:\s+jsr wait_frame\s+jmp @wait/);
  assert.match(source, /\.byte "VOID STRIKE 65 ENDED",0/);
  assert.match(source, /\.byte "PRESS RESET: RESTART",0/);
  assert.doesNotMatch(exited, /DOSVEC|SIOV/);
  assert.doesNotMatch(residentSource, /jmp \(DOSVEC\)|jsr SIOV/);
});

test("frontend charset and transient loader tail stay in their bounded ranges", () => {
  const charsetStart = labels.get("charset_data");
  const hullGlyphStart = labels.get("capital_hull_glyphs");
  const frontendStart = labels.get("frontend_glyph_source");
  const frontendEnd = labels.get("frontend_glyph_rows_end");
  const charsetEnd = labels.get("charset_data_end");
  const constants = readFrontendGraphicsSource(source).constants;
  assert.ok(Number.isInteger(charsetStart));
  assert.equal(hullGlyphStart, charsetStart + 59 * 8);
  assert.ok(frontendStart > hullGlyphStart);
  assert.ok(frontendEnd <= charsetEnd);
  assert.equal(charsetEnd, charsetStart + 0x400);

  const rodata = /RODATA\s+([0-9A-F]+)\s+([0-9A-F]+)\s+([0-9A-F]+)/i.exec(map);
  const zeroPage = /ZEROPAGE\s+([0-9A-F]+)\s+([0-9A-F]+)\s+([0-9A-F]+)/i.exec(map);
  assert.ok(rodata);
  assert.ok(zeroPage);
  assert.ok(Number.parseInt(rodata[2], 16) < 0x4000);
  assert.ok(Number.parseInt(zeroPage[2], 16) < 0x0100);
  assert.ok(labels.get("draw_main_menu_scene") >= labels.get("__ENTITY_CODE_RUN__"));
  assert.ok(labels.get("frontend_glyph_rows") >= frontendStart);
  assert.ok(labels.get("main_menu_display_list") >= labels.get("__ENTITY_CODE_RUN__"));
  assert.ok(labels.get("loader_display_list_lzss") < labels.get("loader_bitmap_lzss"));
  assert.ok(labels.get("loader_bitmap_lzss") < 0x4000);
  assert.equal(
    labels.get("main_menu_display_list") & 0xfc00,
    (labels.get("frontend_display_lists_end") - 1) & 0xfc00,
    "frontend display lists must not cross ANTIC's 1 KiB counter boundary",
  );
  assert.ok(labels.get("frontend_display_lists_end") <= 0xa000);

  const clearPmg = routine("clear_pmg", "copy_charset");
  assert.doesNotMatch(clearPmg, /PMG_BASE\+\$(?:000|100|200)/);
  for (const offset of ["300", "400", "500", "600", "700"]) {
    assert.match(clearPmg, new RegExp(`PMG_BASE\\+\\$${offset}`));
  }

  assert.equal(constants.get("SCREEN"), 0x4000);
  assert.equal(constants.get("CHARSET"), 0x4400);
  assert.equal(constants.get("FRONTEND_CHARSET"), 0x4800);
  assert.equal(constants.get("FRONTEND_CHARSET") - constants.get("CHARSET"), 0x400);
  assert.equal(constants.get("CAPITAL_HULL_RUNTIME_ALLIED"), 0x4c00);
  assert.equal(constants.get("CAPITAL_HULL_RUNTIME_ENEMY"), 0x4d20);
  assert.equal(constants.get("CAPITAL_HULL_RUNTIME_END"), 0x4e40);
  assert.match(source, /jsr show_loader[\s\S]+jsr clear_pmg[\s\S]+jsr copy_frontend_charset/);
});

test("OPTIONS persistent tables stay outside the loader display-list destination", () => {
  const optionsStart = labels.get("options_persistent_tables_start");
  const optionsEnd = labels.get("options_persistent_tables_end");
  const difficultyStart = labels.get("difficulty_value_table");
  const difficultyEnd = labels.get("difficulty_value_table_end");
  const labelSources = labels.get("options_label_sources");
  const loaderStart = LOADER_DISPLAY_LIST_ADDRESS;
  const loaderEnd = loaderStart + 202;
  const entityCode = /ENTITY_CODE\s+([0-9A-F]+)\s+([0-9A-F]+)\s+([0-9A-F]+)/i.exec(map);

  assert.ok(entityCode, "missing persistent ENTITY_CODE linker range");
  const entityCodeStart = Number.parseInt(entityCode[1], 16);
  const entityCodeEnd = Number.parseInt(entityCode[2], 16) + 1;
  assert.ok(optionsStart >= entityCodeStart && optionsEnd <= entityCodeEnd,
    "OPTIONS tables must remain in resident read-only memory");
  assert.equal(difficultyStart, optionsStart);
  assert.equal(difficultyEnd - difficultyStart, 18);
  assert.ok(labelSources >= difficultyEnd && labelSources < optionsEnd);
  assert.ok(optionsStart >= labels.get("main_menu_display_list_end"));
  assert.ok(optionsEnd <= labels.get("options_display_list"));
  assert.equal(optionsEnd <= loaderStart || optionsStart >= loaderEnd, true,
    `OPTIONS tables $${optionsStart.toString(16)}-$${(optionsEnd - 1).toString(16)} ` +
    `overlap loader DLIST $${loaderStart.toString(16)}-$${(loaderEnd - 1).toString(16)}`);
});

test("the runtime highlights the whole main-menu title, however long the title is", () => {
  // Both sides must take the run from the title record itself. A number written
  // out here would go stale exactly the way `ldx #11` did across the 2026-09-04
  // rename, so the expectation is derived and never spelled.
  const state = readStartMenuRuntimeState(source);
  const title = state.graphics.mainMenuRecords[0];
  assert.equal(title.mode, 7, "record 0 is the ANTIC 7 title row");

  const loadMatch = /^\s*ldx\s+#(.+)$/m.exec(routine("style_main_menu_title"));
  assert.ok(loadMatch, "style_main_menu_title loads a run length into X");
  const runLength =
    evaluateExpression(loadMatch[1], state.graphics.constants) + 1;
  assert.equal(
    runLength,
    title.text.length,
    "style_main_menu_title must colour every cell of the title record",
  );

  // …and the rendered screen agrees, so the generator cannot drift either.
  const screenAddress = state.graphics.constants.get("SCREEN");
  const start = title.address - screenAddress;
  const highlighted = [...state.screen]
    .map((byte, index) => ((byte & 0x40) !== 0 ? index : -1))
    .filter((index) => index >= 0 && index < 20);
  assert.deepEqual(
    highlighted,
    Array.from({ length: title.text.length }, (_value, index) => start + index),
  );
});

test("mixed display list, screen offsets, title, menu, and hint are bounded", () => {
  const state = readStartMenuRuntimeState(source);
  const { constants, mainMenuLayout } = state.graphics;
  // RE-RECORDED 2026-09-22 for owner decision A, the main-menu background
  // stars, and for no other reason. Seven blank-8 ($70) display-list lines are
  // now ANTIC 4 LMS rows carrying star glyphs: two above the title (screen
  // offsets 340, 380), three between EXIT and the hint (420, 460, 500) and two
  // below the hint (540, 580). MAIN_MENU_SCREEN_BYTES still describes the
  // original block; MAIN_MENU_STAR_SCREEN_BYTES is the whole menu footprint.
  //
  // The two numbers that must NOT move are asserted below: a blank-8 line and
  // an ANTIC 4 row are both eight scanlines, so the title still starts at
  // scanline 24 and the menu still has exactly one DLI.
  assert.equal(mainMenuLayout.screenBytes, constants.get("MAIN_MENU_STAR_SCREEN_BYTES"));
  assert.equal(mainMenuLayout.screenBytes, 620);
  assert.equal(
    mainMenuLayout.rows.reduce((height, row) => height + row.height, 0),
    152,                                    // 96 + seven eight-scanline rows
  );
  assert.deepEqual(
    mainMenuLayout.rows.map(({ mode }) => mode),
    [4,4,7,4,4,4,4,6,6,6,6,4,4,4,4,2,4,4],
  );
  assert.deepEqual(
    mainMenuLayout.rows.filter(({ dli }) => dli).map(({ index }) => index),
    [14],                                   // still exactly one, the hint DLI
  );

  const title = state.graphics.mainMenuRecords.find(({ text }) => text === "VOID STRIKE 65");
  assert.deepEqual([title.mode, title.column, title.text.length, title.y], [7, 4, 14, 24]);
  const menuRecords = state.graphics.mainMenuRecords.filter(({ mode }) => mode === 6);
  assert.equal(menuRecords.length, 4);
  assert.deepEqual(menuRecords.map(({ column }) => column), [4,6,4,8]);
  assert.ok(menuRecords.every((record) => record.column + record.text.length <= 20));
  const hint = state.graphics.mainMenuRecords.find(({ mode }) => mode === 2);
  assert.deepEqual(
    [hint.text, hint.column, hint.text.length],
    ["UP/DOWN MOVE FIRE SELECT", 7, 24],
  );
  const visibleColors = (record, cellWidth, height) => {
    const colors = new Set();
    for (let y = record.y; y < record.y + height; y += 1) {
      for (
        let x = record.column * cellWidth;
        x < (record.column + record.text.length) * cellWidth;
        x += 1
      ) {
        colors.add(state.registerPixels[y * 320 + x]);
      }
    }
    return colors;
  };
  assert.deepEqual(visibleColors(title, 16, 16), new Set([0x00, 0x1e]));
  assert.deepEqual(visibleColors(hint, 8, 8), new Set([0x00, 0x0e]));
  assert.deepEqual(
    [...state.screen.subarray(constants.get("MAIN_MENU_PLAYER_FIGHTER_TOP_OFFSET") + 18,
      constants.get("MAIN_MENU_PLAYER_FIGHTER_TOP_OFFSET") + 21)],
    [58,59,60],
  );
  assert.deepEqual(
    [...state.screen.subarray(constants.get("MAIN_MENU_PLAYER_FIGHTER_BOTTOM_OFFSET") + 18,
      constants.get("MAIN_MENU_PLAYER_FIGHTER_BOTTOM_OFFSET") + 21)],
    [61,62,63],
  );

  const assembledDisplayList = readXexBytes(
    labels.get("main_menu_display_list"),
    state.graphics.mainMenuDisplayList.length,
  );
  assert.deepEqual(assembledDisplayList, Buffer.from(state.graphics.mainMenuDisplayList));

  const textDisplayList = readXexBytes(labels.get("frontend_text_display_list"), 32);
  assert.equal(textDisplayList[3] & 0x0f, 2);
  assert.ok([...textDisplayList.subarray(6, 29)].every((opcode) => opcode === 2));

  const hintDli = readXexBytes(labels.get("frontend_hint_dli"), 32);
  assert.notEqual(
    hintDli.indexOf(Buffer.from([
      0xa9,0x0e,0x8d,0x17,0xd0,
      0xa9,0x00,0x8d,0x18,0xd0,
    ])),
    -1,
  );
});

test("menu PlayerFighter is charset-only, frontend PMG stays disabled, and gameplay setup is restored", () => {
  const state = readStartMenuRuntimeState(source);
  const { constants, hardwareState } = state.graphics;
  assert.equal(constants.get("CH_FRONT_PLAYER_FIGHTER_TOP_LEFT"), 58);
  assert.equal(constants.get("FRONTEND_GLYPH_COUNT"), 43);
  assert.doesNotMatch(routine("draw_main_menu_scene"), /PLAYER[0-3]|HPOSP|SIZEP/);

  const frontendEntry = routine("enter_frontend_state");
  assert.match(frontendEntry,
    /sta GRACTL[\s\S]+jsr clear_pmg_graphics_latches[\s\S]+jsr select_frontend_display/);
  assert.doesNotMatch(frontendEntry, /lda #\$02[\s\S]+sta GRACTL/);
  assert.match(frontendEntry, /cpx #STATE_OPTIONS[\s\S]+cpx #STATE_MAIN_MENU[\s\S]+lda #\$80[\s\S]+sta NMIEN/);
  assert.equal(hardwareState.get("SIZEP0"), 1);
  assert.equal(hardwareState.get("SIZEP3"), 1);
  assert.equal(hardwareState.get("COLPF2"), 0x1e);
  assert.equal(hardwareState.get("COLPF3"), 0x46);
  assert.match(routine("start_gameplay"), /jsr clear_pmg/);
  assert.match(
    routine("start_gameplay"),
    /sta NMIEN[\s\S]+jsr init_playfield_display_lists[\s\S]+lda PLAYFIELD_ACTIVE_DLIST_LO[\s\S]+sta DLISTL[\s\S]+lda #<gameplay_dli[\s\S]+lda #>HUD_CHARSET[\s\S]+sta CHBASE/,
  );
  assert.match(
    routine("gameplay_dli"),
    /lda #>CHARSET[\s\S]+sta CHBASE[\s\S]+lda #>HUD_CHARSET[\s\S]+sta CHBASE/,
  );
  assert.match(
    routine("select_frontend_display"),
    /cmp #STATE_MAIN_MENU[\s\S]+main_menu_display_list[\s\S]+frontend_text_display_list/,
  );
});

test("frontend entry clears stale player and missile graphics latches before DMA resumes", () => {
  const entry = routine("enter_frontend_state");
  const pauseEntry = routine("enter_pause");
  const clear = routine("clear_pmg_graphics_latches");
  assert.match(source, /GRAFP0\s*=\s*\$D00D/);
  assert.match(entry,
    /sta DMACTL\s+sta GRACTL\s+jsr clear_pmg_graphics_latches[\s\S]+jsr select_frontend_display/,
    "main frontend entry must clear PMG graphics latches while display DMA is blanked",
  );
  assert.match(pauseEntry,
    /sta DMACTL\s+sta GRACTL\s+jsr clear_pmg_graphics_latches\s+jsr pause_silence_audio/,
    "pause frontend entry must clear PMG graphics latches while display DMA is blanked",
  );
  assert.match(clear,
    /sta NMIEN\s+ldx #\$04\s+@loop:\s+sta GRAFP0,x\s+dex\s+bpl @loop\s+rts/);

  assert.deepEqual(readXexBytes(labels.get("clear_pmg_graphics_latches"), 12), Buffer.from([
    0x8d, 0x0e, 0xd4, // STA NMIEN
    0xa2, 0x04,       // LDX #4
    0x9d, 0x0d, 0xd0, // STA GRAFP0,X (GRAFP0..3 and GRAFM)
    0xca,             // DEX
    0x10, 0xfa,       // BPL back to the store
    0x60,             // RTS
  ]), "assembled helper must clear all five PMG graphics latches");
});
