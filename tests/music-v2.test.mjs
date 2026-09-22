// plan-music-v2.md §6 — the converter's validation rules.
//
// Each rule here is one the encoding or the hardware actually needs, and each
// is exercised by mutating the committed theme so it cannot rot into a
// tautology. The buzz rule (§5) is the one that matters most by ear: it is
// what stops a future retune turning the bass line into noise silently.
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buzzDividerIsTonal, compileMusic, loadMusicDefinition } from "../scripts/music.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const definitionPath = path.join(rootDirectory, "assets", "music", "menu-theme.json");
const base = loadMusicDefinition(definitionPath);

const clone = () => JSON.parse(JSON.stringify(base));
const rejects = (mutate, pattern) => {
  const broken = clone();
  mutate(broken);
  assert.throws(() => compileMusic(broken), pattern);
};

test("distortion $C dividers must not alias into noise", () => {
  // f = clk / ((N+1) * 15); the 4-bit polynomial's period is 15, so an (N+1)
  // divisible by 3 or 5 collapses onto a lower-order pattern.
  assert.equal(buzzDividerIsTonal(63), true, "C2~ (N+1 = 64)");
  assert.equal(buzzDividerIsTonal(44), false, "N+1 = 45 is divisible by 3 and 5");
  assert.equal(buzzDividerIsTonal(59), false, "N+1 = 60");
  // Every buzz pitch and every buzz drum frame in the committed theme passes.
  for (const pitch of base.pitches.filter(({ kind }) => kind === "buzz")) {
    assert.ok(buzzDividerIsTonal(pitch.divider), `${pitch.id} aliases`);
  }
  for (const [name, macro] of Object.entries(base.drums)) {
    for (const [distortion, divider] of macro) {
      if (distortion !== "buzz") continue;
      assert.ok(buzzDividerIsTonal(divider), `drum ${name} divider ${divider} aliases`);
    }
  }
  rejects((theme) => {
    theme.pitches.find(({ kind }) => kind === "buzz").divider = 44;
  }, /divisible by 3 or 5/);
  rejects((theme) => { theme.drums.KICK[0][1] = 44; }, /divisible by 3 or 5/);
});

test("the pure block must be chromatic, contiguous, and first", () => {
  rejects((theme) => { theme.pitches.splice(5, 1); },
    /chromatic and contiguous/);
  rejects((theme) => {
    const buzz = theme.pitches.pop();
    theme.pitches.unshift(buzz);
  }, /chromatic and contiguous|pure pitch block must come first/);
});

test("a channel may carry at most four instruments, because a token has two select bits", () => {
  rejects((theme) => {
    // Give the lead channel a fifth voice by borrowing the bass instruments.
    theme.instruments.LEAD_B = { distortion: "pure", volume: [8] };
    theme.instruments.LEAD_C = { distortion: "pure", volume: [8] };
    theme.instruments.LEAD_D = { distortion: "pure", volume: [8] };
    theme.instruments.LEAD_E = { distortion: "pure", volume: [8] };
    const rows = theme.patterns.bar01;
    ["LEAD_B", "LEAD_C", "LEAD_D", "LEAD_E"].forEach((name, index) => {
      rows[index * 2 + 1][2] = `${name}:A4`;
    });
  }, /at most 4/);
});

test("a zero volume may only be an envelope's last entry", () => {
  // The player stops advancing a held last entry and skips the arpeggio step
  // while a voice is silent. That is only equivalent to the renderer's
  // ever-counting age if silence is terminal.
  rejects((theme) => { theme.instruments.LEAD.volume = [11, 0, 9, 8]; },
    /may only be the last entry/);
  // The bass envelope really does end in a zero, and that is allowed.
  assert.equal(base.instruments.BASS_BUZZ.volume.at(-1), 0);
});

test("a drum frame must carry a real volume, so $00 can terminate its macro", () => {
  rejects((theme) => { theme.drums.HAT[0][2] = 0; }, /volume must be an integer from 1/);
});

test("the macro page is addressed by one byte", () => {
  const asset = compileMusic(base);
  assert.ok(asset.macroPage.length <= 255);
  rejects((theme) => {
    for (let index = 0; index < 40; index += 1) {
      // Each envelope has to be distinct, or the page interns them into one.
      theme.instruments[`PAD${index}`] = {
        distortion: "pure",
        volume: [15, 14, 13, 12, 11, 10, 9, (index % 8) + 1, ((index / 8) | 0) + 1],
      };
    }
  }, /must fit 255 B/);
});

test("AUDCTL stays 0 and the theme documents all four channels", () => {
  rejects((theme) => { theme.audctl = 0x28; }, /AUDCTL at 0/);
  rejects((theme) => { theme.channels.pop(); }, /all four POKEY channels/);
  rejects((theme) => { theme.formatVersion = 1; }, /formatVersion/);
  rejects((theme) => { theme.originalComposition = false; }, /original composition/);
});

test("an arpeggiated note may not reach past the chromatic block", () => {
  rejects((theme) => {
    // The last pure pitch plus a major-third offset runs off the pure block.
    const lastPure = theme.pitches.filter(({ kind }) => kind === "pure").at(-1).id;
    theme.patterns.bar01[0][3] = `ARP_MAJ:${lastPure}`;
  }, /stay inside the chromatic pure block|past the table/);
});

test("every instrument, drum and pitch a pattern names must exist", () => {
  rejects((theme) => { theme.patterns.bar01[0][2] = "LEAD:Z9"; }, /unknown pitch Z9/);
  rejects((theme) => { theme.patterns.bar01[0][2] = "NOPE:A4"; }, /unknown instrument NOPE/);
  rejects((theme) => { theme.patterns.bar01[0][1] = "TOM"; }, /unknown drum TOM/);
  rejects((theme) => { theme.sequence[0] = "bar99"; }, /unknown pattern bar99/);
});

test("a drum token can never be mistaken for HOLD", () => {
  const asset = compileMusic(base);
  // The drum channel's first row is a KICK with select 0. Without the pitch
  // bias its token byte would be $00, which the player reads as HOLD -- the
  // bug the prototype's stream diff found (plan §1.1).
  const drumColumn = asset.columnBytes[asset.sequenceBytes[1]];
  assert.notEqual(drumColumn[0], 0x00);
  assert.equal(drumColumn[0] & 0x3f, 0x02, "a drum token carries pitch field 2");
});
