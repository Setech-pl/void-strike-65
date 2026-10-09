import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SIO_MODE_PATCHED, SIO_MODE_REAL, TARGET_MACHINE, atari800SioArguments } from "./atari800-machine.mjs";

export const publicArtifactNames = Object.freeze({
  boot: "void-strike-65-boot.bin",
  atr: "void-strike-65.atr",
  manifest: "void-strike-65-manifest.json",
});

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function artifactDescriptor(rootDirectory, manifest, kind) {
  const name = publicArtifactNames[kind];
  const artifactPath = path.resolve(rootDirectory, "dist", name);
  invariant(fs.existsSync(artifactPath), `Public ${kind.toUpperCase()} artifact is missing: ${artifactPath}`);
  const bytes = fs.readFileSync(artifactPath);
  const expected = manifest.artifacts?.[name];
  invariant(expected, `Manifest does not bind public artifact ${name}`);
  invariant(expected.bytes === bytes.length && expected.sha256 === sha256(bytes),
    `Public artifact differs from manifest: ${artifactPath}`);
  invariant(path.basename(fs.realpathSync(artifactPath)) === name,
    `Public artifact resolves through an unexpected alias: ${artifactPath}`);
  return {
    kind,
    name,
    path: artifactPath,
    bytes: bytes.length,
    sha256: expected.sha256,
  };
}

export function publicArtifactBinding(rootDirectory) {
  const manifestPath = path.resolve(rootDirectory, "dist", publicArtifactNames.manifest);
  invariant(fs.existsSync(manifestPath), `Public manifest is missing: ${manifestPath}`);
  const manifestBytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes);
  return {
    manifest: {
      kind: "manifest",
      name: publicArtifactNames.manifest,
      path: manifestPath,
      bytes: manifestBytes.length,
      sha256: sha256(manifestBytes),
    },
    boot: artifactDescriptor(rootDirectory, manifest, "boot"),
    atr: artifactDescriptor(rootDirectory, manifest, "atr"),
  };
}

export function atari800ArtifactLaunches(rootDirectory) {
  const binding = publicArtifactBinding(rootDirectory);
  return {
    atr: {
      id: "atr",
      medium: "ATR",
      mode: "disk-image-d1",
      artifact: binding.atr,
      mediaArguments: [binding.atr.path],
    },
  };
}

export function validateAtari800Launch(launch) {
  invariant(launch?.artifact?.path && path.isAbsolute(launch.artifact.path),
    "Atari800 launch must use an absolute public artifact path");
  // The ATR is the only medium the game ships on (owner decision, 2026-09-30).
  invariant(launch.medium === "ATR", `Unsupported Atari800 medium: ${launch.medium}`);
  invariant(launch.artifact.name === publicArtifactNames.atr &&
    path.basename(launch.artifact.path) === publicArtifactNames.atr,
  "Atari800 launch must use the named public artifact path");
  invariant(!launch.mediaArguments.includes("-run") && launch.mediaArguments.length === 1 &&
    launch.mediaArguments[0] === launch.artifact.path,
  "ATR must be mounted as D1:, not passed to -run (which falls through to SELF TEST)");
  return launch;
}

function cli() {
  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
  const rootDirectory = path.resolve(scriptDirectory, "..");
  const kind = process.argv[2];
  invariant(kind === "atr", "Usage: artifact-launch.mjs atr [--dry-run]");
  const emulatorArgument = process.argv.find((argument) => argument.startsWith("--emulator="));
  const emulator = emulatorArgument?.slice("--emulator=".length) || "atari800";
  const launch = validateAtari800Launch(atari800ArtifactLaunches(rootDirectory)[kind]);
  // M5a-S2 (docs/plans/m5-loading-boss.md §4.8.4, Q16): the game writes its
  // save record to the disk it booted from, so the emulator never mounts
  // dist/. It plays a copy in build/play/, kept between launches (the personal
  // best survives) and replaced whenever dist/'s ATR changes.
  const playDirectory = path.join(rootDirectory, "build", "play");
  const playCopy = path.join(playDirectory, publicArtifactNames.atr);
  const stampPath = `${playCopy}.source-sha256`;
  const published = launch.artifact.sha256;
  if (!process.argv.includes("--dry-run")) {
    fs.mkdirSync(playDirectory, { recursive: true });
    const stale = !fs.existsSync(playCopy) || !fs.existsSync(stampPath) ||
      fs.readFileSync(stampPath, "utf8").trim() !== published;
    if (stale) {
      fs.copyFileSync(launch.artifact.path, playCopy);
      fs.writeFileSync(stampPath, `${published}\n`);
    }
  }
  // fix/hardware-boot (owner answer Q2): the play copy loads like the
  // hardware - real SIO, the OS disk routine at register level, ~27 s to the
  // menu. --fast keeps Atari800's SIO patch (pinned, not inherited).
  const realSio = !process.argv.includes("--fast");
  const args = [TARGET_MACHINE, "-pal", ...atari800SioArguments(rootDirectory, { realSio }), "-nobasic", playCopy];
  const record = {
    emulator,
    sio_mode: realSio ? SIO_MODE_REAL : SIO_MODE_PATCHED,
    medium: launch.medium,
    mode: launch.mode,
    artifact: launch.artifact,
    disk_copy: path.relative(rootDirectory, playCopy),
    arguments: args,
  };
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
  if (process.argv.includes("--dry-run")) return;
  const result = spawnSync(emulator, args, { cwd: rootDirectory, stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) cli();
