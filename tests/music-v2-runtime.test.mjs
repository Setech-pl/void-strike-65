// plan-music-v2.md §6 test (b) — the binary plays the renderer's stream.
//
// Test (a) proves the compiled bytes imply the right stream. This one proves
// the 6502 player in the shipped XEX actually emits it: the runtime image is
// loaded into the NMOS harness, music_start_menu and music_tick are called the
// way the frontend loop calls them, every POKEY write is trapped, and each
// frame's final register state is compared with the oracle.
//
// The gameplay half of this test belongs to plan §10 step 2b, which replaces
// the gameplay player; tests/gameplay-music-placement.test.mjs still holds the
// v1 gameplay stream until then.
//
// Red on a build that still carries the v1 menu player.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { initialiseRuntime, requiredLabel } from "../scripts/weapon-pickup-runtime.mjs";
import { compileGameplayMusic, compileMusic, loadMusicDefinition } from "../scripts/music.mjs";
import { renderOracleStream } from "../scripts/music-oracle.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const definition = loadMusicDefinition(
  path.join(rootDirectory, "assets", "music", "menu-theme.json"));
const asset = compileMusic(definition);
const mainSource = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");

function routine(label, nextLabel) {
  const start = mainSource.indexOf(`${label}:`);
  const end = mainSource.indexOf(`${nextLabel}:`, start + label.length + 1);
  assert.notEqual(start, -1, `missing routine ${label}`);
  assert.notEqual(end, -1, `missing routine boundary ${nextLabel}`);
  return mainSource.slice(start, end);
}

const AUDF1 = 0xd200;
const AUDCTL = 0xd208;
const POKEY_FIRST = 0xd200;
const POKEY_LAST = 0xd20f;

function menuTrace() {
  const { memory, labels } = initialiseRuntime(rootDirectory, "xex", 0xa5);
  memory[requiredLabel(labels, "sound_enabled")] = 1;

  let trap = null;
  const cpu = new Nmos6502(memory, {
    write(address) {
      if (trap && address >= POKEY_FIRST && address <= POKEY_LAST) trap.push(address);
    },
  });
  const stop = 0x7fff;
  const call = (address) => {
    const before = cpu.cycles;
    cpu.push((stop - 1) >> 8);
    cpu.push((stop - 1) & 0xff);
    cpu.pc = address;
    for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) cpu.step();
    assert.equal(cpu.pc, stop, `the call at $${address.toString(16)} did not return`);
    return cpu.cycles - before;
  };

  // enter_frontend_state stops the transport and starts the menu theme; the
  // harness does exactly that rather than starting on the cold fill.
  call(requiredLabel(labels, "music_stop"));
  call(requiredLabel(labels, "music_start_menu"));
  assert.equal(memory[requiredLabel(labels, "MUSIC_ACTIVE")], 1,
    "music_start_menu must arm the transport");

  // One full loop plus one row, so the sequence wrap is covered.
  const frames = asset.loopFrames + asset.framesPerRow;
  const stream = [];
  const touched = [];
  const cycles = [];
  for (let frame = 0; frame < frames; frame += 1) {
    trap = touched;
    cycles.push(call(requiredLabel(labels, "music_tick")));
    trap = null;
    stream.push([0, 1, 2, 3].map((channel) => ({
      audf: memory[AUDF1 + channel * 2],
      audc: memory[AUDF1 + channel * 2 + 1],
    })));
  }
  return { stream, touched, cycles, memory, labels, call };
}

const run = menuTrace();

test("the shipped menu player emits the reference renderer's register stream", () => {
  const expected = renderOracleStream(definition,
    { frames: asset.loopFrames + asset.framesPerRow });
  assert.equal(run.stream.length, expected.length);
  for (let frame = 0; frame < expected.length; frame += 1) {
    for (let channel = 0; channel < 4; channel += 1) {
      const want = expected[frame][channel];
      const got = run.stream[frame][channel];
      assert.equal(got.audc, want.audc,
        `frame ${frame} channel ${channel + 1} AUDC: the binary disagrees with the renderer`);
      // AUDF is don't-care while the channel is silent.
      if (want.audc !== 0) {
        assert.equal(got.audf, want.audf,
          `frame ${frame} channel ${channel + 1} AUDF: the binary disagrees with the renderer`);
      }
    }
  }
});

test("the menu tick writes only AUDF1-4 and AUDC1-4", () => {
  const stray = [...new Set(run.touched)].filter((address) => address > 0xd207);
  assert.deepEqual(stray, [],
    "the menu tick must not touch AUDCTL, STIMER or any other POKEY register");
  // AUDCTL is left where silence_audio put it: the drafts declare audctl 0 and
  // channels 3 and 4 are SFX-owned in gameplay, where the clock is shared.
  assert.equal(run.memory[AUDCTL], 0);
});

test("a silent channel keeps its divider: the player writes AUDC only", () => {
  // The renderer's REST and zero-volume frames are AUDC $00 with no defined
  // divider. The player must not write AUDF there -- that is what lets the
  // stream comparison above ignore AUDF on silent frames instead of inventing
  // a value for it.
  const source = run;
  let silentFrames = 0;
  for (let frame = 1; frame < source.stream.length; frame += 1) {
    for (let channel = 0; channel < 4; channel += 1) {
      if (source.stream[frame][channel].audc !== 0) continue;
      silentFrames += 1;
      assert.equal(source.stream[frame][channel].audf, source.stream[frame - 1][channel].audf,
        `frame ${frame} channel ${channel + 1}: AUDF moved while the channel was silent`);
    }
  }
  assert.ok(silentFrames > 0, "the score has silent frames to check");
});

test("the menu tick's per-frame cost stays a frontend cost, not a raster one", () => {
  // There is no fence in the frontend: music_tick runs right after wait_frame,
  // about ten scanlines of CPU before the input poll and far above the footer
  // DLI. The bound is documented, not gated -- it exists so a later edit that
  // made the tick an order of magnitude more expensive would be noticed.
  const minimum = Math.min(...run.cycles);
  const maximum = Math.max(...run.cycles);
  assert.ok(maximum <= 1400,
    `the menu tick's worst frame costs ${maximum} cycles (min ${minimum})`);
  assert.ok(minimum >= 100, `the menu tick's cheapest frame costs ${minimum} cycles`);
});

test("music_stop silences every channel and disarms the transport", () => {
  run.call(requiredLabel(run.labels, "music_stop"));
  assert.equal(run.memory[requiredLabel(run.labels, "MUSIC_ACTIVE")], 0);
  for (let channel = 0; channel < 4; channel += 1) {
    assert.equal(run.memory[AUDF1 + channel * 2 + 1], 0,
      `AUDC${channel + 1} was left sounding after music_stop`);
  }
  assert.equal(run.memory[AUDCTL], 0);
});

test("the menu theme starts only in the main menu and stops before gameplay", () => {
  // Carried over from the retired v1 menu test: the call sites are a property
  // of the frontend, not of the score format, and they still have to hold.
  assert.match(mainSource,
    /jsr show_loader[\s\S]+jsr unpack_starfield_runtime[\s\S]+jmp finish_startup_after_loader[\s\S]+finish_startup_after_loader:[\s\S]+sta sound_enabled[\s\S]+jsr music_init[\s\S]+jsr enter_main_menu/);
  assert.match(routine("frontend_loop", "dispatch_frontend_input"),
    /cmp #STATE_MAIN_MENU\s+beq @restore_palette[\s\S]+@restore_palette:[\s\S]+jsr music_tick[\s\S]+lda STICK0[\s\S]+lda TRIG0/);
  assert.match(routine("enter_frontend_state", "enter_exited_state"),
    /cmp #STATE_MAIN_MENU[\s\S]+jsr music_stop[\s\S]+jsr music_start_menu/);
  const gameplay = routine("start_gameplay", "main_loop");
  assert.match(gameplay,
    /sta gameplay_fire_gate\s+sta pause_option_latched\s+jsr music_stop[\s\S]+lda sound_enabled/);
  assert.doesNotMatch(gameplay, /music_tick|music_start_menu/);
  assert.match(routine("handle_game_over_input", "handle_exit_input"), /jmp enter_main_menu/);
  // music_stop still reaches the hardware through silence_audio, which is the
  // one place AUDCTL and all eight channel registers are cleared.
  assert.match(routine("music_stop", "music_tick"), /jmp silence_audio/);
  const silence = routine("silence_audio", "hud_ascii");
  for (const register of [
    "AUDF1", "AUDC1", "AUDF2", "AUDC2", "AUDF3", "AUDC3", "AUDF4", "AUDC4", "AUDCTL",
  ]) {
    assert.match(silence, new RegExp(`sta ${register}`));
  }
});

// ---------------------------------------------------------------------------
// Gameplay: plan tests (b) and (c), plus the measurement owner answer Q-S1
// made a condition of moving the shot SFX to channel 4.
// ---------------------------------------------------------------------------

const gameplayDefinition = loadMusicDefinition(
  path.join(rootDirectory, "assets", "music", "gameplay-theme.json"));
const gameplay = compileGameplayMusic(gameplayDefinition, { pitches: definition.pitches });
const placement = JSON.parse(fs.readFileSync(
  path.join(rootDirectory, "build", "manifest.json"), "utf8")).gameplayMusic.placement;

const AUDF4 = 0xd206;
const AUDC4 = 0xd207;
const SHOT_AUDC = 0xa8;
const HIT_AUDC = 0x88;

function gameplayRuntime() {
  const { memory, labels } = initialiseRuntime(rootDirectory, "xex", 0xa5);
  memory[requiredLabel(labels, "sound_enabled")] = 1;
  memory[requiredLabel(labels, "GAME_MUSIC_ENABLED")] = 1;
  memory[requiredLabel(labels, "PLAYER_LIFECYCLE")] = 0;
  memory[requiredLabel(labels, "fire_timer")] = 0;
  memory[requiredLabel(labels, "hit_timer")] = 0;
  memory[requiredLabel(labels, "CAPITAL_EXPLOSION_SOUND_TIMER")] = 0;

  const writes = [];
  let trap = false;
  const cpu = new Nmos6502(memory, {
    write(address, value) {
      if (trap && address >= POKEY_FIRST && address <= POKEY_LAST) {
        writes.push({ address, value });
      }
    },
  });
  const stop = 0x7fff;
  const call = (address) => {
    cpu.push((stop - 1) >> 8);
    cpu.push((stop - 1) & 0xff);
    cpu.pc = address;
    for (let steps = 0; steps < 400_000 && cpu.pc !== stop; steps += 1) cpu.step();
    assert.equal(cpu.pc, stop, `the call at $${address.toString(16)} did not return`);
  };
  call(requiredLabel(labels, "music_stop_gameplay"));
  call(placement.vectors.GAMEPLAY_MUSIC_START);
  assert.equal(memory[requiredLabel(labels, "MUSIC_ACTIVE")], 1,
    "the start vector must arm the transport");
  return {
    memory,
    labels,
    call,
    writes,
    arm: (on) => { trap = on; },
    registers: () => [0, 1].map((channel) => ({
      audf: memory[0xd200 + channel * 2],
      audc: memory[0xd200 + channel * 2 + 1],
    })),
  };
}

test("the shipped gameplay player emits the renderer's stream with no SFX running", () => {
  const run = gameplayRuntime();
  run.arm(true);
  const frames = gameplay.loopFrames + gameplay.framesPerRow;
  const expected = renderOracleStream(gameplayDefinition,
    { pitches: definition.pitches, frames });
  for (let frame = 0; frame < frames; frame += 1) {
    run.call(placement.vectors.GAMEPLAY_MUSIC_TICK);
    const got = run.registers();
    for (let channel = 0; channel < 2; channel += 1) {
      const want = expected[frame][channel];
      assert.equal(got[channel].audc, want.audc,
        `frame ${frame} channel ${channel + 1} AUDC: the binary disagrees with the renderer`);
      if (want.audc !== 0) {
        assert.equal(got[channel].audf, want.audf,
          `frame ${frame} channel ${channel + 1} AUDF: the binary disagrees with the renderer`);
      }
    }
  }
  // The gameplay player owns channels 1 and 2 and nothing else -- not AUDCTL,
  // not the engine bed on 3, not the shot and explosion on 4.
  const stray = [...new Set(run.writes.map(({ address }) => address))]
    .filter((address) => address > 0xd203);
  assert.deepEqual(stray, [],
    "the gameplay tick must never touch AUDCTL or channels 3 and 4");
});

test("the bass is never preempted, the lead stops only for the hit and resumes", () => {
  // Plan test (c), rewritten for the policy the owner chose: the shot SFX is
  // on channel 4 now, so the only thing that can silence music is the hit.
  const run = gameplayRuntime();
  const withMusic = [];
  const shotTrace = [];
  const hitAt = 100;
  const shotsAt = [30, 200];
  const frames = 260;
  for (let frame = 0; frame < frames; frame += 1) {
    if (shotsAt.includes(frame)) {
      run.call(requiredLabel(run.labels, "play_player_fighter_projectile_sound"));
    }
    if (frame === hitAt) run.call(requiredLabel(run.labels, "play_hit_sound"));
    // main_loop's order: update_sound, then the music tick.
    run.call(requiredLabel(run.labels, "update_sound"));
    run.call(placement.vectors.GAMEPLAY_MUSIC_TICK);
    withMusic.push({
      frame,
      music: run.registers(),
      hit: run.memory[requiredLabel(run.labels, "hit_timer")],
      fire: run.memory[requiredLabel(run.labels, "fire_timer")],
    });
    shotTrace.push([run.memory[AUDF4], run.memory[AUDC4]]);
  }

  const expected = renderOracleStream(gameplayDefinition,
    { pitches: definition.pitches, frames });

  // 1. Channel 1 equals the oracle on EVERY frame, SFX or no SFX.
  for (const row of withMusic) {
    const want = expected[row.frame][0];
    assert.equal(row.music[0].audc, want.audc,
      `frame ${row.frame}: the bass was disturbed (hit ${row.hit}, fire ${row.fire})`);
    if (want.audc !== 0) assert.equal(row.music[0].audf, want.audf);
  }

  // 2. While the hit SFX runs, channel 2 carries the SFX, not the music.
  const hitFrames = withMusic.filter(({ hit }) => hit !== 0);
  assert.ok(hitFrames.length >= 13, `the hit SFX ran for ${hitFrames.length} frames`);
  for (const row of hitFrames) {
    assert.equal(row.music[1].audc, HIT_AUDC,
      `frame ${row.frame}: the music overwrote the hit SFX on channel 2`);
  }

  // 3. From the first frame after the hit clears, channel 2 is the oracle's
  //    again -- at the envelope position the score reached, not where it
  //    stopped. That is the "lead resumes the music" property.
  const resume = withMusic.find(({ frame, hit }) => hit === 0 && frame > hitAt);
  assert.ok(resume, "the hit SFX never cleared");
  for (const row of withMusic.filter(({ frame }) => frame >= resume.frame)) {
    const want = expected[row.frame][1];
    assert.equal(row.music[1].audc, want.audc,
      `frame ${row.frame}: the lead did not resume the score in place`);
  }

  // 4. The shot is audible on channel 4 and its envelope is intact: the
  //    complete $33..$38 phase, exactly as it was on channel 1 before Q-S1.
  const phases = shotTrace.map(([audf], frame) =>
    (withMusic[frame].fire !== 0 ? audf : null)).filter((value) => value !== null);
  assert.ok(phases.includes(0x33) && phases.includes(0x38),
    `the shot phase on AUDF4 was ${phases.join(",")}`);
  for (const frame of shotsAt) {
    assert.equal(shotTrace[frame][1], SHOT_AUDC,
      `frame ${frame}: the shot did not take channel 4`);
  }
});

test("the shot SFX register sequence is the same with music on and music off", () => {
  // "SFX envelopes stay intact": the music must not perturb channel 4 at all.
  function shotRun(musicOn) {
    const run = gameplayRuntime();
    if (!musicOn) run.call(requiredLabel(run.labels, "music_stop_gameplay"));
    const trace = [];
    for (let frame = 0; frame < 20; frame += 1) {
      if (frame === 5) {
        run.call(requiredLabel(run.labels, "play_player_fighter_projectile_sound"));
      }
      run.call(requiredLabel(run.labels, "update_sound"));
      if (musicOn && run.memory[requiredLabel(run.labels, "MUSIC_ACTIVE")] !== 0) {
        run.call(placement.vectors.GAMEPLAY_MUSIC_TICK);
      }
      trace.push([run.memory[AUDF4], run.memory[AUDC4]]);
    }
    return trace;
  }
  assert.deepEqual(shotRun(true), shotRun(false),
    "the music changed the shot SFX on channel 4");
});

// Owner answer Q-S1 made this a condition of the move: "verify that the
// capital explosion's AUDCTL does not change the shot's sound while both are
// active; if it does, STOP and report -- the fallback is channel 2".
test("the capital-hull explosion's AUDCTL leaves the shot's sound unchanged", () => {
  const run = gameplayRuntime();
  // POKEY registers are write-only, so this has to be measured from the write
  // stream, not by reading $D208 back.
  run.arm(true);
  const audctlOf = () => run.writes.filter(({ address }) => address === AUDCTL)
    .map(({ value }) => value);

  run.call(requiredLabel(run.labels, "play_player_fighter_projectile_sound"));
  for (let frame = 0; frame < 3; frame += 1) {
    run.call(placement.vectors.GAMEPLAY_MUSIC_TICK);
    run.call(requiredLabel(run.labels, "update_sound"));
  }
  assert.deepEqual(audctlOf(), [],
    "the shot and the music must not write AUDCTL at all");

  run.call(requiredLabel(run.labels, "play_capital_explosion_sound"));
  for (let frame = 0; frame < 3; frame += 1) {
    run.call(placement.vectors.GAMEPLAY_MUSIC_TICK);
    run.call(requiredLabel(run.labels, "update_sound"));
  }
  // Every AUDCTL the explosion writes is 0, which is the value gameplay
  // already runs at: the 64 kHz clock, no 16-bit pairing, no high-pass. So the
  // shot's divider means exactly the same thing during an explosion as
  // outside one, and owner answer Q-S1's fallback (channel 2 with the hit)
  // does not apply.
  const written = audctlOf();
  assert.ok(written.length > 0, "the capital explosion did not write AUDCTL at all");
  assert.deepEqual([...new Set(written)], [0],
    `the capital explosion wrote AUDCTL ${written.join(",")}: the shot's clock would ` +
    "move with it, and owner answer Q-S1's fallback (channel 2 with the hit) applies");
  // The generated constant itself, so a later hull-audio edit cannot change
  // the answer without this test noticing.
  assert.match(
    fs.readFileSync(path.join(rootDirectory, "build", "capital-hulls.inc"), "utf8"),
    /CAPITAL_EXPLOSION_SOUND_AUDCTL = 0\b/,
    "the capital explosion no longer writes AUDCTL 0; re-measure Q-S1");

  // While the explosion runs it outranks the shot on the shared channel; the
  // shot takes channel 4 back on the first frame after the explosion ends.
  run.memory[requiredLabel(run.labels, "fire_timer")] = 0x34;
  run.call(requiredLabel(run.labels, "update_sound"));
  assert.notEqual(run.memory[AUDC4], SHOT_AUDC,
    "the shot masked the capital-hull explosion instead of yielding to it");
  run.memory[requiredLabel(run.labels, "CAPITAL_EXPLOSION_SOUND_TIMER")] = 0;
  run.memory[requiredLabel(run.labels, "fire_timer")] = 0x34;
  run.call(requiredLabel(run.labels, "update_sound"));
  assert.equal(run.memory[AUDC4], SHOT_AUDC,
    "the shot did not take channel 4 back when the explosion ended");
});
