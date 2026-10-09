// The emulated machine (S5-1, plan docs/plans/s5-boss-regions.md §4.7; owner
// decision: the target is the 64 KB Atari 65XE / 800XL class, PAL; the 130XE
// is a compatibility check only). Every Atari800 launch in the repository
// takes its machine flag from here - tests/target-machine.test.mjs refuses a
// literal machine flag anywhere else.
//
// Atari800: -xl is the 800XL with 64 KB (the 65XE's memory map: no PORTB bank
// switching); -xe is the 130XE with 128 KB.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const TARGET_MACHINE = "-xl";
export const TARGET_MACHINE_NAME = "64 KB Atari 800XL / 65XE class";
// One boot-smoke session (scripts/runtime-wall-trace.mjs) runs on it, labelled.
export const COMPATIBILITY_MACHINE = "-xe";
export const COMPATIBILITY_MACHINE_NAME = "130XE (128 KB) compatibility check";

// fix/hardware-boot (docs/diagnostics/hardware-boot.md, owner answer Q2,
// 2026-10-09): the SIO mode is part of every launch, never inherited.
//
// Atari800's SIO patch replaces the OS disk routine SIOV with a host-side
// handler; with it on, the boot's OS phase and stage 2 never run against
// register-level SIO, which is how a stage-2 defect that stops every real
// machine passed every committed run. REAL_SIO turns it off: the OS SIOV then
// drives POKEY and the PIA command line as on the hardware. The game's own
// direct-SIO reader is register-level in both modes.
//
// Atari800 has a flag to turn the patch off but none to turn it on, so a launch
// without REAL_SIO would take ENABLE_SIO_PATCH from the host's config file.
// Every launch therefore passes -config with PINNED_CONFIG: the host's own
// config (its ROM paths and the rest unchanged) with ENABLE_SIO_PATCH=1 and
// CFG_SAVE_ON_EXIT=0 forced. Real-SIO launches add REAL_SIO, which overrides it.
// tests/sio-patch-policy.test.mjs holds every launch list to this.

export const REAL_SIO = "-nopatch";
export const PINNED_CONFIG = path.join("build", "atari800-pinned.cfg");
export const SIO_MODE_REAL = "real SIO: Atari800 -nopatch, the OS SIOV at register level";
export const SIO_MODE_PATCHED = "Atari800 SIO patch on, pinned by -config build/atari800-pinned.cfg";

const CONFIG_HEADER = "Atari 800 Emulator, Version 7.1.2";

// The host config Atari800 itself would read: ATARI800_HOST_CONFIG when set,
// else $HOME/.atari800.cfg (Unix) or $HOME/atari800.cfg.
function hostConfigText() {
  const candidates = [process.env.ATARI800_HOST_CONFIG,
    path.join(os.homedir(), ".atari800.cfg"), path.join(os.homedir(), "atari800.cfg")].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  return found ? fs.readFileSync(found, "utf8") : `${CONFIG_HEADER}\n`;
}

export function pinnedConfigText(hostText) {
  const forced = { ENABLE_SIO_PATCH: "1", CFG_SAVE_ON_EXIT: "0" };
  const lines = hostText.split(/\r?\n/).filter((line) => line.length > 0)
    .filter((line) => !Object.hasOwn(forced, line.split("=")[0]));
  if (lines.length === 0 || lines[0].includes("=")) lines.unshift(CONFIG_HEADER);
  for (const [key, value] of Object.entries(forced)) lines.push(`${key}=${value}`);
  return `${lines.join("\n")}\n`;
}

// Writes the pinned config (only when its content changes) and returns its path.
export function pinnedAtari800Config(rootDirectory) {
  const configPath = path.join(rootDirectory, PINNED_CONFIG);
  const text = pinnedConfigText(hostConfigText());
  if (!fs.existsSync(configPath) || fs.readFileSync(configPath, "utf8") !== text) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, text);
  }
  return configPath;
}

// The SIO arguments of one launch: the pinned config, plus REAL_SIO for a
// real-SIO launch.
export function atari800SioArguments(rootDirectory, { realSio }) {
  const config = pinnedAtari800Config(rootDirectory);
  return realSio ? ["-config", config, REAL_SIO] : ["-config", config];
}
