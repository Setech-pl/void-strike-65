// feat/interceptor-armour (the owner's play of 2026-10-12, plan
// docs/plans/interceptor-armour.md): one shot kills an Interceptor, and the
// owner wants it tougher - several hits, each hit it lives through visible on
// that Interceptor, its death as today, in every wave and as the boss escort.
// Phase A builds the candidates as review variants:
//
//   --interceptor-armour=ID
//     h1   the flash's code, hit points 1 (every Interceptor dies on its first
//          hit as on main: the code's own cost, and the HP-1 control)
//     h2   the flash, hit points 2 everywhere
//     h3   the flash, hit points 3 everywhere
//     hd   the flash, per difficulty: EASY 2 / MEDIUM 3 / HARD 3 (the record's
//          2, plus the armour bonus 0/1/1 on every armoured wave; level 1's
//          three Interceptor waves are armoured)
//     he   the flash, per wave: swarm and elite 3, the boss escort 2 (the
//          record's 2, plus 1 on an armoured wave; the swarm's and elite (a)'s
//          waves are armoured, the escort's is not)
//     h3b  the blink, hit points 3 everywhere
//
// The flash (scripts/interceptor-armour-flash.patch): a hit the Interceptor
// lives through draws its two cells with bit 7 cleared for 3 frames, so its
// colour-3 pixels (the red rotor pods, COLPF3) show COLPF2. No colour register
// is written. The blink (scripts/interceptor-armour-blink.patch): the slot is
// not drawn on 2 frames, drawn on 2, not drawn on 2. The armour
// (scripts/interceptor-armour-wave.patch, -general.patch): a wave_flags bit
// (`armour` in the level source) and, for hd, a per-difficulty bonus table.
//
// Every patch is applied IN MEMORY while scripts/build.mjs reads its inputs
// (the method of the retired scripts/interceptor-loop-variants.mjs): nothing
// under src/, cfg/ or assets/ changes on disk, and the variant owns
// build/interceptor-armour-ID[-level-N-sM]/ like every review variant. The
// default build reads none of this. The patches are plain unified diffs, so
// the chosen one lands later with `git apply`.
//
// The boss entry's pins (src/hybrid/boss-entry-pins.inc) depend on the
// combination - the kernel's size and where the window's Director half ends -
// so the pins file is rewritten per variant from KERNEL_PINS below (measured;
// scripts/build.mjs refuses a wrong one by name).

import fs from "node:fs";
import path from "node:path";

const LEVEL_ONE = "assets/levels/level-01.json";
const LIFECYCLE = "src/c/lifecycle.c";
const PINS = "src/hybrid/boss-entry-pins.inc";

const FLASH = "scripts/interceptor-armour-flash.patch";
const BLINK = "scripts/interceptor-armour-blink.patch";
const WAVE = "scripts/interceptor-armour-wave.patch";
const GENERAL = "scripts/interceptor-armour-general.patch";

// The kernel link's pinned labels, per combination (the build's own error
// names the address when one moves).
const KERNEL_PINS = {
  flash: { read: 0xb815, records: 0xb83a },
  blink: { read: 0xb80c, records: 0xb831 },
  "flash+wave": { read: 0xb82e, records: 0xb853 },
  "flash+general": { read: 0xb83b, records: 0xb860 },
};
// boss_enter_hud_backup, in the BROADSIDE zero pin behind the title.
const HUD_BACKUP_PIN = 0x69ff;

export const INTERCEPTOR_ARMOUR_VARIANTS = Object.freeze({
  h1: { patches: [FLASH], pins: "flash", hp: 1, summary: "the flash's code, hit points 1 (as main)" },
  h2: { patches: [FLASH], pins: "flash", hp: 2, summary: "the flash, hit points 2 everywhere" },
  h3: { patches: [FLASH], pins: "flash", hp: 3, summary: "the flash, hit points 3 everywhere" },
  hd: {
    patches: [FLASH, GENERAL], pins: "flash+general", hp: 2, bonus: [0, 1, 1],
    armoured: ["swarm", "elite", "escort"],
    summary: "the flash, per difficulty: EASY 2 / MEDIUM 3 / HARD 3",
  },
  he: {
    patches: [FLASH, WAVE], pins: "flash+wave", hp: 2, armoured: ["swarm", "elite"],
    summary: "the flash, per wave: swarm and elite 3, the boss escort 2",
  },
  h3b: { patches: [BLINK], pins: "blink", hp: 3, summary: "the blink, hit points 3 everywhere" },
});

export function parseInterceptorArmour(argv) {
  const argument = argv.find((value) => value.startsWith("--interceptor-armour="));
  if (argument === undefined) return null;
  const id = argument.slice("--interceptor-armour=".length);
  if (!Object.hasOwn(INTERCEPTOR_ARMOUR_VARIANTS, id)) {
    throw new Error(`Unknown ${argument}; the variants are ` +
      `${Object.keys(INTERCEPTOR_ARMOUR_VARIANTS).join(", ")}`);
  }
  return id;
}

// A unified diff as exact-text edits: each hunk's old lines (context and
// removed) must occur exactly once in the file and become its new lines.
function patchEdits(rootDirectory, patch) {
  const text = fs.readFileSync(path.join(rootDirectory, patch), "utf8");
  const edits = [];
  let file = null;
  let hunk = null;
  const close = () => {
    if (hunk !== null) edits.push({ file, from: hunk.from.join(""), to: hunk.to.join("") });
    hunk = null;
  };
  for (const line of text.split(/(?<=\n)/)) {
    if (line.startsWith("+++ b/")) {
      close();
      file = line.slice("+++ b/".length).trimEnd();
    } else if (line.startsWith("--- ") || line.startsWith("diff ") || line.startsWith("index ")) {
      close();
    } else if (line.startsWith("@@")) {
      close();
      hunk = { from: [], to: [] };
    } else if (hunk !== null) {
      const body = line.slice(1);
      if (line.startsWith(" ")) {
        hunk.from.push(body);
        hunk.to.push(body);
      } else if (line.startsWith("-")) {
        hunk.from.push(body);
      } else if (line.startsWith("+")) {
        hunk.to.push(body);
      } else if (!line.startsWith("\\")) {
        throw new Error(`${patch}: unexpected line ${JSON.stringify(line)}`);
      }
    }
  }
  close();
  return edits.map((edit) => ({
    file: edit.file,
    transform(source) {
      const at = source.indexOf(edit.from);
      if (at < 0 || source.indexOf(edit.from, at + 1) >= 0) {
        throw new Error(`interceptor armour: a hunk of ${patch} does not match ${edit.file} exactly once`);
      }
      return source.slice(0, at) + edit.to + source.slice(at + edit.from.length);
    },
  }));
}

const exactlyOnce = (source, from, to, what) => {
  const at = source.indexOf(from);
  if (at < 0 || source.indexOf(from, at + 1) >= 0) {
    throw new Error(`interceptor armour: ${what} does not match exactly once`);
  }
  return source.slice(0, at) + to + source.slice(at + from.length);
};

// The Interceptor's record (the third in enemy_archetypes) and, for hd, the
// armour bonus per difficulty.
const lifecycleData = (variant) => ({
  file: LIFECYCLE,
  transform(text) {
    let out = exactlyOnce(text,
      "        1u,\n        ENEMY_MOVEMENT_INTERCEPTOR_PURSUIT,",
      `        ${variant.hp}u,\n        ENEMY_MOVEMENT_INTERCEPTOR_PURSUIT,`,
      "the Interceptor record's hit points");
    if (variant.bonus !== undefined) {
      out = exactlyOnce(out, "light_armour_bonus[3] = { 1u, 1u, 1u };",
        `light_armour_bonus[3] = { ${variant.bonus.map((value) => `${value}u`).join(", ")} };`,
        "the armour bonus table");
    }
    return out;
  },
});

// Level 1's armoured Interceptor waves: the swarm's (sector 3), elite (a)'s
// companion (sector 4) and the boss sector's escort row.
const levelArmour = (armoured) => ({
  file: LEVEL_ONE,
  transform(text) {
    const level = JSON.parse(text);
    const found = { swarm: 0, elite: 0, escort: 0 };
    for (const sector of level.sectors) {
      for (const wave of sector.waves ?? []) {
        const light = wave.members === undefined ? wave.archetype : wave.members[1];
        if (light !== "interceptor") continue;
        const role = sector.kind === "boss" ? "escort" : wave.members === undefined ? "swarm" : "elite";
        found[role] += 1;
        if (armoured.includes(role)) wave.armour = true;
      }
    }
    for (const role of armoured) {
      if (found[role] !== 1) throw new Error(`interceptor armour: level 1 has ${found[role]} ${role} wave(s)`);
    }
    return JSON.stringify(level, null, 2);
  },
});

const pinsFile = (combination) => ({
  file: PINS,
  transform(text) {
    const pins = KERNEL_PINS[combination];
    const hex = (value) => value.toString(16).toUpperCase();
    let out = text.replace(/^pin_boss_enter_hud_backup(\s*)= \$[0-9A-F]+(\s*); kernel/m,
      (_, a, b) => `pin_boss_enter_hud_backup${a}= $${hex(HUD_BACKUP_PIN)}${b}; main  `);
    out = out.replace(/^pin_boss_enter_read(\s*)= \$[0-9A-F]+/m,
      (_, a) => `pin_boss_enter_read${a}= $${hex(pins.read)}`);
    out = out.replace(/^pin_boss_warning_records(\s*)= \$[0-9A-F]+/m,
      (_, a) => `pin_boss_warning_records${a}= $${hex(pins.records)}`);
    if (!out.includes(`= $${hex(HUD_BACKUP_PIN)}`) || !out.includes(`= $${hex(pins.read)}`) ||
        !out.includes(`= $${hex(pins.records)}`)) {
      throw new Error("interceptor armour: the boss-entry pins did not match");
    }
    return out;
  },
});

// Wraps fs.readFileSync so the variant's files read back edited. Every edit
// must be consumed by the build, or the variant is not what its name says.
export function installInterceptorArmour(rootDirectory, id) {
  const variant = INTERCEPTOR_ARMOUR_VARIANTS[id];
  const edits = [
    ...variant.patches.flatMap((patch) => patchEdits(rootDirectory, patch)),
    lifecycleData(variant),
    pinsFile(variant.pins),
  ];
  if (variant.armoured !== undefined) edits.push(levelArmour(variant.armoured));
  const byFile = new Map();
  for (const edit of edits) {
    const absolute = path.resolve(rootDirectory, edit.file);
    if (!byFile.has(absolute)) byFile.set(absolute, []);
    byFile.get(absolute).push(edit);
  }
  const consumed = new Set();
  const original = fs.readFileSync;
  fs.readFileSync = function readFileSyncWithInterceptorArmour(file, options) {
    const result = original.call(fs, file, options);
    if (typeof file !== "string" && !(file instanceof URL)) return result;
    const absolute = path.resolve(file instanceof URL ? file.pathname : file);
    const fileEdits = byFile.get(absolute);
    if (fileEdits === undefined) return result;
    let text = Buffer.isBuffer(result) ? result.toString("utf8") : result;
    for (const edit of fileEdits) text = edit.transform(text);
    consumed.add(absolute);
    return Buffer.isBuffer(result) ? Buffer.from(text, "utf8") : text;
  };
  return {
    summary: variant.summary,
    assertConsumed() {
      for (const absolute of byFile.keys()) {
        if (!consumed.has(absolute)) {
          throw new Error(`interceptor armour: the build never read ${path.relative(rootDirectory, absolute)}`);
        }
      }
    },
  };
}
