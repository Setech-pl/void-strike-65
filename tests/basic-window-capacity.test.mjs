import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Finding F6 of docs/plan-4.6-placement.md: residentCapacity.basicWindow
// reported 735 free bytes in the $B600-$BC00 window by counting only the
// Director link's window half as used. The window carries two links — the
// Director half at $B600 and the Light ASM kernel's own link above it — so
// the whole Light kernel was being reported as free space. The window's real
// free tail is 27 B, and it is the same 27 B that lightKernel.freeBytes
// reports, because the kernel link closes the window.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build/manifest.json"), "utf8"));
const basicWindow = manifest.residentCapacity.basicWindow;
const lightKernel = manifest.lightKernel;

test("the BASIC window's free figure counts both of its links", () => {
  assert.equal(basicWindow.usedBytes,
    basicWindow.directorHalfBytes + basicWindow.lightKernelBytes);
  assert.equal(basicWindow.freeBytes, basicWindow.capacityBytes - basicWindow.usedBytes);
  // The Light kernel link is the window's upper half; its own byte count must
  // be the one the window row consumes, not an independent number.
  assert.equal(basicWindow.lightKernelBytes, lightKernel.bytes);
  assert.equal(basicWindow.directorHalfBytes, lightKernel.address - basicWindow.address);
});

test("the window's free tail agrees with the linker map's Light kernel tail", () => {
  // The kernel link ends the window, so the two free figures are the same
  // bytes. This is the assertion that fails on the pre-fix manifest: the
  // window claimed 735 free while the map's own tail was 27.
  assert.equal(basicWindow.freeBytes, lightKernel.freeBytes);
  assert.equal(lightKernel.windowLimit, basicWindow.endExclusive);
  assert.equal(lightKernel.endExclusive + basicWindow.freeBytes, basicWindow.endExclusive);
});

test("the window is nearly full: the free tail is a two-digit byte count", () => {
  assert.ok(basicWindow.freeBytes < 64,
    `the BASIC window reports ${basicWindow.freeBytes} free bytes; the map's tail is ` +
    `${lightKernel.freeBytes}`);
});
