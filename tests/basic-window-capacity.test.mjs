import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Finding F6 of docs/plan-4.6-placement.md: residentCapacity.basicWindow
// reported 735 free bytes in the $B600-$BC00 window by counting only the
// Director link's window half as used. The window carries two links — the
// Director half at the window base and the Light ASM kernel's own link above
// it — so the whole Light kernel was being reported as free space. The
// accounting fix is what these tests freeze: the window's free tail is the
// same tail that lightKernel.freeBytes reports, because the kernel link
// closes the window.
//
// Q-1 (owner, 2026-09-23) moved the window base $B600 → $AE00 and its capacity
// 1,536 → 3,584 B: the level buffer went 32 → 16 sectors and the window took
// the 2,048 B back. The accounting is unchanged; the free tail is no longer a
// two-digit number, and that is the point of the step.
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

// Q-1 (owner, 2026-09-23). Before the step this test read "the window is
// nearly full: the free tail is a two-digit byte count" (27 B). The window
// gained 2,048 B without gaining a single byte of content, so the same two
// links now leave 2,075 B. The floor below is what the Director's own code
// will be spent from over roadmap 4.6 (plan §3.1: ~2,075 B free, against a
// Director net need of ~400 B and a 4.7 boss controller of 300-500 B).
test("the window has room for the Director: the free tail is four digits", () => {
  assert.equal(basicWindow.capacityBytes, 3584,
    "Q-1: HYBRID_C_WINDOW is $AE00-$BBFF, 3,584 B");
  assert.equal(basicWindow.address, 0xae00);
  assert.ok(basicWindow.freeBytes >= 2000,
    `the BASIC window reports ${basicWindow.freeBytes} free bytes; Q-1 sized the ` +
    `step for about 2,075`);
  // The tail is still the kernel link's tail, not an independent figure.
  assert.equal(basicWindow.freeBytes, lightKernel.freeBytes);
});
