// The generated block of docs/memory-map.md is the build's own memory map:
// scripts/memory-map-report.mjs renders it from build/ and cfg/, and this test
// fails whenever the committed block no longer matches the build.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  BEGIN_MARKER, END_MARKER, REGENERATE_COMMAND, currentBlock, memoryMapPath, renderBlock,
} from "../scripts/memory-map-report.mjs";

const document = fs.readFileSync(memoryMapPath, "utf8");

test("docs/memory-map.md carries exactly one generated block", () => {
  assert.equal(document.split(BEGIN_MARKER).length, 2, "one BEGIN marker");
  assert.equal(document.split(END_MARKER).length, 2, "one END marker");
  assert.ok(document.indexOf(BEGIN_MARKER) < document.indexOf(END_MARKER));
});

test("the generated memory map matches the current build", () => {
  const expected = renderBlock();
  const actual = currentBlock(document);
  if (actual !== expected) {
    const actualLines = (actual ?? "").split("\n");
    const expectedLines = expected.split("\n");
    const first = expectedLines.findIndex((line, index) => line !== actualLines[index]);
    assert.fail(`docs/memory-map.md: the generated block does not match the build; run ` +
      `${REGENERATE_COMMAND} after the build and commit the result.\n` +
      `first difference at block line ${first + 1}:\n` +
      `  committed: ${actualLines[first] ?? "(missing)"}\n` +
      `  build:     ${expectedLines[first] ?? "(missing)"}`);
  }
});

test("the generated map reports the measured-free low RAM and the misnamed STARFIELD", () => {
  const block = currentBlock(document);
  assert.match(block, /\| `\$0C00-\$1FFF` \| 5,120 B \| measured-free \|/);
  assert.match(block, /\| `STARFIELD` \|[^\n]*\*\*misleading name\*\* \|/);
});
