import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { readRuntimeBytes } from "../scripts/runtime-image.mjs";

// Owner decision (docs/how-to-play.md): the difficulty levels are ROOKIE,
// PILOT and ACE, easiest first. The menu draws them from
// difficulty_value_table - six encoded cells per name, right-aligned - so this
// test decodes the bytes the build actually ships rather than the source text.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const labels = new Map(
  fs.readFileSync(path.join(root, "build", "void-strike-65.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);

function constant(name) {
  const match = new RegExp(`^${name}\\s*=\\s*(\\$?[0-9A-Fa-f]+)\\s*$`, "m").exec(source);
  assert.ok(match, `missing constant ${name}`);
  return match[1].startsWith("$") ? Number.parseInt(match[1].slice(1), 16) : Number(match[1]);
}

function decodeCell(byte, { space, letterA, colour }) {
  if (byte === space) return " ";
  assert.equal(byte & colour, colour, `cell $${byte.toString(16)} is not drawn in PF1`);
  const index = (byte & ~colour) - letterA;
  assert.ok(index >= 0 && index < 26, `cell $${byte.toString(16)} is not a letter`);
  return String.fromCharCode(65 + index);
}

test("the OPTIONS difficulty names are ROOKIE, PILOT and ACE, easiest first", () => {
  const start = labels.get("difficulty_value_table");
  const end = labels.get("difficulty_value_table_end");
  assert.ok(Number.isInteger(start) && Number.isInteger(end));
  assert.equal(end - start, 18, "three names of six cells each");
  const glyphs = {
    space: constant("CH_FRONT_SPACE"),
    letterA: constant("CH_FRONT_A"),
    colour: constant("ANTIC67_COLOR_PF1"),
  };
  const bytes = [...readRuntimeBytes(root, start, 18)];
  const names = [0, 1, 2].map((difficulty) =>
    bytes.slice(difficulty * 6, difficulty * 6 + 6).map((b) => decodeCell(b, glyphs)).join(""));
  assert.deepEqual(names, ["ROOKIE", " PILOT", "   ACE"]);
  assert.deepEqual(
    [constant("DIFFICULTY_EASY"), constant("DIFFICULTY_MEDIUM"), constant("DIFFICULTY_HARD")],
    [0, 1, 2],
    "ROOKIE is the easiest entry and ACE the hardest; the internal symbols keep their order",
  );
});
