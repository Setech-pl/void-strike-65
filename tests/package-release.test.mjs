// fix/audit-m5 (M5-05; the m5 audit's addendum M9, its M5-A01): the release
// archive carries the licence and notice files that cover what it ships -
// LICENSE (code, MIT), LICENSE-ASSETS (content and the ATR, CC BY-NC-SA 4.0)
// and THIRD_PARTY_NOTICES.md - byte for byte. The packager writes to a
// scratch path here, never to dist/.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NOTICES = ["LICENSE", "LICENSE-ASSETS", "THIRD_PARTY_NOTICES.md"];

// Every entry of a stored (uncompressed) zip, from its central directory.
function zipEntries(archive) {
  const end = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(end >= 0, "no end-of-central-directory record");
  const count = archive.readUInt16LE(end + 10);
  let at = archive.readUInt32LE(end + 16);
  const entries = new Map();
  for (let i = 0; i < count; i += 1) {
    assert.equal(archive.readUInt32LE(at), 0x02014b50, "a broken central directory");
    const size = archive.readUInt32LE(at + 24);
    const nameLength = archive.readUInt16LE(at + 28);
    const extra = archive.readUInt16LE(at + 30) + archive.readUInt16LE(at + 32);
    const local = archive.readUInt32LE(at + 42);
    const name = archive.subarray(at + 46, at + 46 + nameLength).toString("utf8");
    const dataAt = local + 30 + archive.readUInt16LE(local + 26) + archive.readUInt16LE(local + 28);
    entries.set(name, archive.subarray(dataAt, dataAt + size));
    at += 46 + nameLength + extra;
  }
  return entries;
}

test("M5-05: the release zip carries LICENSE, LICENSE-ASSETS and THIRD_PARTY_NOTICES.md", () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vs65-package-"));
  try {
    const output = path.join(scratch, "release.zip");
    const packed = spawnSync(process.execPath, [path.join(root, "scripts", "package-release.mjs"), `--output=${output}`],
      { cwd: root, encoding: "utf8" });
    assert.equal(packed.status, 0, packed.stderr);
    const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
    const entries = zipEntries(fs.readFileSync(output));
    for (const notice of NOTICES) {
      const entry = entries.get(`void-strike-65-${version}/${notice}`);
      assert.ok(entry, `${notice} is not in the release zip`);
      assert.deepEqual(entry, fs.readFileSync(path.join(root, notice)), `${notice} differs from the repository's`);
    }
    assert.ok(entries.has(`void-strike-65-${version}/dist/void-strike-65.atr`), "the ATR is not in the release zip");
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});
