import fs from "node:fs";
import { canonicalPlayfield } from "./playfield.mjs";

const SIDES = ["allied", "enemy"];
const DIFFICULTIES = ["easy", "medium", "hard"];
const SIDE_IDS = new Map([["allied", 0], ["enemy", 1]]);
const DIRECTIONS = new Map([["right", 0], ["left", 1]]);
const SCREEN_BANKS = new Map([["pf2", 0x00], ["pf3", 0x80]]);
const MAP_COLUMNS = 9;
const BASE_HULL_COLUMNS = 8;
const CENTRAL_COLUMNS = 24;
const PACKED_ROW_BYTES = Math.ceil(MAP_COLUMNS / 2);
const PMG_LEFT_EDGE = 48;

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function byteHex(value) {
  return `$${value.toString(16).padStart(2, "0").toUpperCase()}`;
}

// Match Encounter Director's private full-period byte LCG (5*x+1). Layout
// generation is host-side, so it does not consume or perturb runtime policy RNG.
export function nextDirectorLayoutRng(value) {
  invariant(Number.isInteger(value) && value >= 0 && value <= 0xff,
    "Director layout RNG state must be one byte");
  return (value * 5 + 1) & 0xff;
}

function generateTurretModuleIndices({
  firstModule, lastModule, count, minimumSpacingModules, maximumGapModules, seed,
}) {
  invariant(count >= 2 && firstModule < lastModule, "Turret layout span is too short");
  const result = [firstModule];
  let state = seed;
  const averageGap = (lastModule - firstModule) / (count - 1);
  const jitterRadius = Math.max(1, Math.floor((averageGap - minimumSpacingModules) / 2));
  for (let ordinal = 1; ordinal < count - 1; ordinal += 1) {
    state = nextDirectorLayoutRng(state);
    const ideal = Math.round(firstModule + ordinal * averageGap);
    const jitter = (state % (jitterRadius * 2 + 1)) - jitterRadius;
    const remainingGaps = count - 1 - ordinal;
    const low = Math.max(
      result.at(-1) + minimumSpacingModules,
      lastModule - remainingGaps * maximumGapModules,
    );
    const high = Math.min(
      result.at(-1) + maximumGapModules,
      lastModule - remainingGaps * minimumSpacingModules,
    );
    invariant(low <= high, "Turret layout spacing constraints cannot be satisfied");
    result.push(Math.max(low, Math.min(high, ideal + jitter)));
  }
  result.push(lastModule);
  invariant(result.every((moduleIndex, index) => index === 0 ||
    moduleIndex - result[index - 1] >= minimumSpacingModules),
  "Generated turret layout violates minimum spacing");
  invariant(result.every((moduleIndex, index) => index === 0 ||
    moduleIndex - result[index - 1] <= maximumGapModules),
  "Generated turret layout contains an excessive gap");
  return result;
}

function validTurretSubsets(candidates, required, count, maximumGapModules) {
  const requiredSet = new Set(required);
  const optional = candidates.filter((value) => !requiredSet.has(value));
  const needed = count - required.length;
  const valid = [];
  const visit = (start, selected) => {
    if (selected.length === needed) {
      const result = [...required, ...selected].sort((left, right) => left - right);
      if (result.every((value, index) => index === 0 ||
        value - result[index - 1] <= maximumGapModules)) valid.push(result);
      return;
    }
    for (let index = start; index <= optional.length - (needed - selected.length); index += 1) {
      selected.push(optional[index]);
      visit(index + 1, selected);
      selected.pop();
    }
  };
  visit(0, []);
  return valid;
}

function normalizeGlyphPixels(glyph) {
  invariant(Array.isArray(glyph.pixels) && glyph.pixels.length === 8,
    `Glyph ${glyph.name} must contain exactly eight pixel rows`);
  return glyph.pixels.map((row, rowIndex) => {
    const values = typeof row === "string" ? [...row].map(Number) : row;
    invariant(Array.isArray(values) && values.length === 4,
      `Glyph ${glyph.name} row ${rowIndex} must contain four ANTIC 4 pixels`);
    for (const value of values) {
      invariant(Number.isInteger(value) && value >= 0 && value <= 3,
        `Glyph ${glyph.name} row ${rowIndex} contains invalid pixel ${value}`);
    }
    return values;
  });
}

function packGlyphRows(rows) {
  return Uint8Array.from(rows.map((row) =>
    (row[0] << 6) | (row[1] << 4) | (row[2] << 2) | row[3]));
}

function normalizeMapRow(row, side, rowIndex) {
  const cells = typeof row === "string" ? row.trim().split(/\s+/) : row;
  invariant(Array.isArray(cells) && cells.length === MAP_COLUMNS,
    `${side} map row ${rowIndex} must contain ${MAP_COLUMNS} cells`);
  return cells;
}

function absoluteColumn(side, relativeColumn) {
  return side === "allied" ? relativeColumn : 31 + relativeColumn;
}

function relativeColumn(side, column) {
  return side === "allied" ? column : column - 31;
}

function derivedInnerDepth(side, row) {
  if (side === "allied") {
    let last = -1;
    for (let index = 0; index < BASE_HULL_COLUMNS; index += 1) {
      if (row[index] !== "space") last = index;
    }
    return last + 1;
  }
  let first = MAP_COLUMNS;
  for (let index = 1; index < MAP_COLUMNS; index += 1) {
    if (row[index] !== "space") {
      first = index;
      break;
    }
  }
  return MAP_COLUMNS - first;
}

function projectionGlyph(side, row) {
  return row[side === "allied" ? 8 : 0];
}

function collisionBoundary(side, row, depth) {
  const hasProjection = projectionGlyph(side, row) !== "space";
  if (side === "allied") {
    const lastSolidColumn = hasProjection ? 8 : depth - 1;
    return PMG_LEFT_EDGE + (lastSolidColumn + 1) * 4;
  }
  const firstSolidColumn = hasProjection ? 31 : 40 - depth;
  return PMG_LEFT_EDGE + firstSolidColumn * 4;
}

function countCyclicTransitions(values) {
  let transitions = 0;
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] !== values[(index + 1) % values.length]) transitions += 1;
  }
  return transitions;
}

function cyclicRunLengths(values) {
  const start = values.findIndex((value, index) =>
    value !== values[(index + values.length - 1) % values.length]);
  if (start < 0) return [values.length];
  const lengths = [];
  let current = values[start];
  let length = 0;
  for (let offset = 0; offset < values.length; offset += 1) {
    const value = values[(start + offset) % values.length];
    if (value !== current) {
      lengths.push(length);
      current = value;
      length = 0;
    }
    length += 1;
  }
  lengths.push(length);
  return lengths;
}

function validateFootprintCell(turret, component, cell, rows, glyphs) {
  invariant(Array.isArray(cell) && cell.length === 2,
    `Turret ${turret.id} ${component} cell must be [row,column]`);
  const [segmentRow, column] = cell;
  invariant(Number.isInteger(segmentRow) && segmentRow >= 0 && segmentRow < rows.length,
    `Turret ${turret.id} ${component} row is outside its segment`);
  const mapColumn = relativeColumn(turret.side, column);
  invariant(mapColumn >= 0 && mapColumn < MAP_COLUMNS,
    `Turret ${turret.id} ${component} column ${column} is outside its side map`);
  const glyphName = rows[segmentRow][mapColumn];
  const glyph = glyphs.get(glyphName);
  invariant(glyph && glyph.tags.includes(component),
    `Turret ${turret.id} ${component} cell ${segmentRow},${column} uses ${glyphName}`);
}

function createCodebook(side, rows, screenCodes) {
  const codes = [0];
  for (const row of rows) {
    for (const glyphName of row) {
      const screenCode = screenCodes.get(glyphName);
      invariant(Number.isInteger(screenCode), `${side} map references unknown glyph ${glyphName}`);
      if (!codes.includes(screenCode)) codes.push(screenCode);
    }
  }
  invariant(codes.length <= 16,
    `${side} map requires ${codes.length} local codes; packed format permits 16`);
  return Uint8Array.from([...codes, ...Array(16 - codes.length).fill(0)]);
}

function packMap(rows, codebook, screenCodes) {
  const localIndex = new Map([...codebook].map((screenCode, index) => [screenCode, index]));
  const packed = new Uint8Array(rows.length * PACKED_ROW_BYTES);
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    for (let column = 0; column < MAP_COLUMNS; column += 2) {
      const high = localIndex.get(screenCodes.get(rows[rowIndex][column]));
      const low = column + 1 < MAP_COLUMNS
        ? localIndex.get(screenCodes.get(rows[rowIndex][column + 1]))
        : 0;
      invariant(Number.isInteger(high) && Number.isInteger(low),
        `Map row ${rowIndex} could not be encoded through its codebook`);
      packed[rowIndex * PACKED_ROW_BYTES + (column >> 1)] = (high << 4) | low;
    }
  }
  return packed;
}

export function decodePackedHullMap(packed, codebook, segmentRows) {
  invariant(packed.length === segmentRows * PACKED_ROW_BYTES,
    "Packed hull map length does not match its segment height");
  const decoded = [];
  for (let rowIndex = 0; rowIndex < segmentRows; rowIndex += 1) {
    const row = [];
    for (let column = 0; column < MAP_COLUMNS; column += 1) {
      const value = packed[rowIndex * PACKED_ROW_BYTES + (column >> 1)];
      const localIndex = column & 1 ? value & 0x0f : value >>> 4;
      row.push(codebook[localIndex]);
    }
    decoded.push(row);
  }
  return decoded;
}

export function loadCapitalHullsDefinition(filePath) {
  const definition = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return {
    ...definition,
    sector: { ...definition.sector, visibleRows: canonicalPlayfield.gameplayRows },
  };
}

function compileSector(definition, rowsBySide, depthsBySide, glyphs, screenCodes, options = {}) {
  const source = definition.sector;
  invariant(source && typeof source === "object", "Capital hull source must define a sector");
  invariant(source.baselineSectorRows === 240 && source.lengthMultiplier === 2,
    "Capital hull sector must declare the provisional exact 2x length contract");
  invariant(source.moduleRows === 8, "Capital hull modules must contain eight character rows");
  invariant(Number.isInteger(source.sidePhaseRows) && source.sidePhaseRows >= 0 &&
    source.sidePhaseRows <= 16, "sector.sidePhaseRows must be a bounded row offset");
  invariant(source.visibleRows === 28, "The PAL gameplay viewport must expose 28 hull rows");
  invariant(Number.isInteger(source.previewSectorRow) && source.previewSectorRow >= source.visibleRows &&
    source.previewSectorRow < 480, "sector.previewSectorRow must expose a complete visible ship span");
  invariant(Number.isInteger(source.engineAnimationFrames) &&
    source.engineAnimationFrames >= 6 && source.engineAnimationFrames <= 8,
  "Engine animation cadence must be six through eight PAL frames");
  invariant(Number.isInteger(source.launchFlashFrames) &&
    source.launchFlashFrames >= 3 && source.launchFlashFrames <= 4,
  "Launch flash duration must be three or four PAL frames");
  invariant(Array.isArray(source.sections) && source.sections.length === 5,
    "Capital hull sector must define five visual sections");

  const expectedSections = [
    ["engines", 32],
    ["aft", 80],
    ["combat", 256],
    ["forward", 80],
    ["prow", 32],
  ];
  let sectionStart = 0;
  const sections = source.sections.map((section, index) => {
    const [expectedId, expectedRows] = expectedSections[index];
    invariant(section.id === expectedId && section.rows === expectedRows,
      `Sector section ${index} must be ${expectedId}/${expectedRows}`);
    invariant(section.rows % source.moduleRows === 0,
      `Sector section ${section.id} must contain complete modules`);
    invariant(typeof section.weaponEligible === "boolean",
      `Sector section ${section.id} must declare weapon eligibility`);
    invariant(section.weaponEligible === !["engines", "prow"].includes(section.id),
      "Every post-engine linear-hull section, and only those sections, must be weapon eligible");
    const weaponShutdownRows = section.weaponShutdownRows ?? 0;
    invariant(Number.isInteger(weaponShutdownRows) && weaponShutdownRows >= 0 &&
      weaponShutdownRows <= section.rows,
    `Sector section ${section.id} has an invalid weapon shutdown margin`);
    const result = {
      id: section.id,
      state: index,
      rows: section.rows,
      start: sectionStart,
      end: sectionStart + section.rows,
      weaponEligible: section.weaponEligible,
      weaponShutdownRows,
      source: section,
    };
    sectionStart += section.rows;
    return result;
  });
  invariant(sectionStart === source.baselineSectorRows * source.lengthMultiplier,
    "Capital hull sector must contain exactly twice the 240-row baseline");

  const turretLayout = source.turretLayout;
  invariant(turretLayout && typeof turretLayout === "object",
    "Capital hull sector must define seeded difficulty-scaled turret geometry");
  const expectedTurretCounts = { easy: 8, medium: 12, hard: 16 };
  for (const [difficulty, count] of Object.entries(expectedTurretCounts)) {
    invariant(turretLayout.counts?.[difficulty] === count,
      `${difficulty} hulls must expose exactly ${count} functional turrets`);
  }
  const layoutSeed = options.layoutSeed ?? turretLayout.seed;
  invariant(Number.isInteger(layoutSeed) && layoutSeed >= 0 && layoutSeed <= 0xff,
    "Capital hull turret layout seed must be one byte");
  invariant(Number.isInteger(turretLayout.minimumSpacingRows) &&
    turretLayout.minimumSpacingRows >= source.moduleRows &&
    turretLayout.minimumSpacingRows % source.moduleRows === 0,
  "Turret minimum spacing must be a positive whole-module distance");
  for (const difficulty of DIFFICULTIES) {
    invariant(Number.isInteger(turretLayout.maximumGapRows?.[difficulty]) &&
      turretLayout.maximumGapRows[difficulty] % source.moduleRows === 0,
    `${difficulty} maximum turret gap must be a whole-module distance`);
  }
  const moduleNamesBySide = new Map();
  const moduleIdsBySide = new Map();
  const moduleSourceRowsBySide = new Map();
  const engineModuleIds = new Map();
  const engineOverlayMasks = new Map();
  const engineGlyphs = new Map();
  for (const side of SIDES) {
    const moduleObject = source.modules?.[side];
    invariant(moduleObject && typeof moduleObject === "object",
      `Sector must define ${side} modules`);
    const names = Object.keys(moduleObject);
    invariant(names.length > 0 && names.length <= 16,
      `${side} sector must use one through sixteen reusable modules`);
    const ids = new Map(names.map((name, index) => [name, index]));
    const sourceRows = [];
    let engineModuleId = -1;
    let engineMasks = new Uint8Array(source.moduleRows);
    let engineGlyph = null;
    for (const [name, module] of Object.entries(moduleObject)) {
      invariant(/^[a-z][a-z0-9_]*$/.test(name), `Invalid ${side} module name ${name}`);
      invariant(Array.isArray(module.sourceRows) && module.sourceRows.length === source.moduleRows,
        `${side} module ${name} must reference eight source rows`);
      for (const row of module.sourceRows) {
        invariant(Number.isInteger(row) && row >= 0 && row < definition.segmentRows,
          `${side} module ${name} references invalid source row ${row}`);
        sourceRows.push(row);
      }
      if (module.engineOverlay) {
        invariant(engineModuleId < 0, `${side} may define only one engine overlay module`);
        engineModuleId = ids.get(name);
        engineGlyph = glyphs.get(module.engineOverlay.glyph);
        invariant(engineGlyph?.faction === side && engineGlyph.tags.includes("engine"),
          `${side} module ${name} must use a faction engine glyph`);
        const columnsByRow = module.engineOverlay.columnsByRow;
        invariant(Array.isArray(columnsByRow) && columnsByRow.length === source.moduleRows,
          `${side} module ${name} must define eight engine overlay rows`);
        engineMasks = Uint8Array.from(columnsByRow.map((columns, rowIndex) => {
          invariant(Array.isArray(columns),
            `${side} engine overlay row ${rowIndex} must be an array`);
          let mask = 0;
          for (const column of columns) {
            const baseColumn = side === "allied" ? column : column - 1;
            invariant(Number.isInteger(baseColumn) && baseColumn >= 0 && baseColumn < 8,
              `${side} engine overlay column ${column} is outside its base hull band`);
            mask |= 1 << baseColumn;
          }
          return mask;
        }));
      }
    }
    invariant(engineModuleId >= 0, `${side} sector must define an engine module`);
    moduleNamesBySide.set(side, names);
    moduleIdsBySide.set(side, ids);
    moduleSourceRowsBySide.set(side, Uint8Array.from(sourceRows));
    engineModuleIds.set(side, engineModuleId);
    engineOverlayMasks.set(side, engineMasks);
    engineGlyphs.set(side, engineGlyph);
  }
  const disabledTurretModuleIds = new Map();
  const turretModuleIds = new Map();
  const turretLocalRows = new Map();
  for (const side of SIDES) {
    const moduleName = turretLayout.disabledModule?.[side];
    invariant(moduleIdsBySide.get(side).has(moduleName),
      `${side} disabled turret replacement must name a reusable module`);
    const moduleId = moduleIdsBySide.get(side).get(moduleName);
    const sourceRows = moduleSourceRowsBySide.get(side).subarray(
      moduleId * source.moduleRows, (moduleId + 1) * source.moduleRows);
    invariant([...sourceRows].every((row) =>
      projectionGlyph(side, rowsBySide.get(side)[row]) === "space"),
    `${side} disabled turret replacement module must contain no muzzle projection`);
    disabledTurretModuleIds.set(side, moduleId);

    const turretModuleName = turretLayout.turretModule?.[side];
    invariant(moduleIdsBySide.get(side).has(turretModuleName),
      `${side} turret layout must name a reusable turret module`);
    const turretModuleId = moduleIdsBySide.get(side).get(turretModuleName);
    const turretSources = moduleSourceRowsBySide.get(side).subarray(
      turretModuleId * source.moduleRows, (turretModuleId + 1) * source.moduleRows);
    const projectionRows = [...turretSources].map((row, localRow) =>
      projectionGlyph(side, rowsBySide.get(side)[row]) === "space" ? -1 : localRow)
      .filter((localRow) => localRow >= 0);
    invariant(projectionRows.length === 1 && projectionRows[0] <= 1,
      `${side} turret module must expose one muzzle within one row of its start`);
    turretModuleIds.set(side, turretModuleId);
    turretLocalRows.set(side, projectionRows[0]);
  }

  const baseModuleSequences = new Map();
  for (const side of SIDES) {
    const sequence = [];
    const ids = moduleIdsBySide.get(side);
    for (const section of sections) {
      const names = section.source.modules?.[side];
      invariant(Array.isArray(names) && names.length === section.rows / source.moduleRows,
        `${side} section ${section.id} has the wrong module count`);
      for (const name of names) {
        invariant(ids.has(name), `${side} section ${section.id} uses unknown module ${name}`);
        const moduleId = ids.get(name);
        const moduleSources = moduleSourceRowsBySide.get(side).subarray(
          moduleId * source.moduleRows, (moduleId + 1) * source.moduleRows);
        const containsMuzzle = [...moduleSources].some((row) =>
          projectionGlyph(side, rowsBySide.get(side)[row]) !== "space");
        sequence.push(containsMuzzle ? disabledTurretModuleIds.get(side) : moduleId);
      }
    }
    invariant(sequence.length === sectionStart / source.moduleRows,
      `${side} sector module sequence does not cover all rows`);
    baseModuleSequences.set(side, Uint8Array.from(sequence));
  }

  const eligibleModules = sections.flatMap((section) => {
    if (!section.weaponEligible) return [];
    const end = section.end - section.weaponShutdownRows;
    return Array.from({ length: (end - section.start) / source.moduleRows }, (_, index) =>
      section.start / source.moduleRows + index);
  });
  invariant(eligibleModules.every((moduleIndex, index) => index === 0 ||
    moduleIndex === eligibleModules[index - 1] + 1),
  "Weapon-eligible linear-hull modules must form one contiguous span");
  const firstEligibleModule = eligibleModules[0];
  const lastEligibleModule = eligibleModules.at(-1);
  const minimumSpacingModules = turretLayout.minimumSpacingRows / source.moduleRows;
  const moduleSequencesByDifficulty = new Map();
  const cannonModuleIndicesByDifficulty = new Map();
  const layoutSeedsByDifficulty = new Map();
  const moduleSequences = new Map();
  for (const side of SIDES) {
    const sequences = new Map();
    const indicesByDifficulty = new Map();
    const seeds = new Map();
    // Each owner starts an independent domain of the Director LCG. Neither
    // owner's positions or terminal RNG state feed the other owner.
    const ownerSeed = layoutSeed ^ (side === "allied" ? 0x2e : 0xfc);
    const hardModules = generateTurretModuleIndices({
      firstModule: firstEligibleModule,
      lastModule: lastEligibleModule,
      count: expectedTurretCounts.hard,
      minimumSpacingModules,
      maximumGapModules: turretLayout.maximumGapRows.hard / source.moduleRows,
      seed: ownerSeed,
    });
    const mediumCandidates = validTurretSubsets(
      hardModules,
      [hardModules[0], hardModules.at(-1)],
      expectedTurretCounts.medium,
      turretLayout.maximumGapRows.medium / source.moduleRows,
    );
    const nestedLayouts = mediumCandidates.flatMap((mediumModules) =>
      validTurretSubsets(
        mediumModules,
        [hardModules[0], hardModules.at(-1)],
        expectedTurretCounts.easy,
        turretLayout.maximumGapRows.easy / source.moduleRows,
      ).map((easyModules) => ({ easyModules, mediumModules })));
    invariant(nestedLayouts.length > 0,
      `${side} has no nested EASY/MEDIUM/HARD turret layout satisfying every gap bound`);
    const selectedLayouts = nestedLayouts[nextDirectorLayoutRng(ownerSeed) % nestedLayouts.length];
    const { easyModules, mediumModules } = selectedLayouts;
    const layouts = new Map([
      ["easy", easyModules], ["medium", mediumModules], ["hard", hardModules],
    ]);
    for (const difficulty of DIFFICULTIES) {
      const moduleIndices = layouts.get(difficulty);
      const sequence = Uint8Array.from(baseModuleSequences.get(side));
      for (const moduleIndex of moduleIndices) sequence[moduleIndex] = turretModuleIds.get(side);
      sequences.set(difficulty, sequence);
      indicesByDifficulty.set(difficulty, moduleIndices);
      seeds.set(difficulty, layoutSeed);
    }
    const encodedSequence = Uint8Array.from(baseModuleSequences.get(side));
    for (const moduleIndex of hardModules) encodedSequence[moduleIndex] =
      (encodedSequence[moduleIndex] & 0x0f) | 0x40;
    for (const moduleIndex of mediumModules) encodedSequence[moduleIndex] =
      (encodedSequence[moduleIndex] & 0x0f) | 0x80;
    for (const moduleIndex of easyModules) encodedSequence[moduleIndex] =
      (encodedSequence[moduleIndex] & 0x0f) | 0xc0;
    moduleSequences.set(side, encodedSequence);
    moduleSequencesByDifficulty.set(side, sequences);
    cannonModuleIndicesByDifficulty.set(side, indicesByDifficulty);
    layoutSeedsByDifficulty.set(side, seeds);
  }

  const prowSection = sections.find(({ id }) => id === "prow");
  const prowOccupancyMasks = new Map();
  const prowEdgeGlyphs = new Map();
  const prowFillGlyphs = new Map();
  const prowCollisionBoundaries = new Map();
  const glyphHorizontalExtent = (glyph) => {
    const occupied = glyph.pixels.flatMap((row) => row
      .map((value, index) => value === 0 ? -1 : index)
      .filter((index) => index >= 0));
    invariant(occupied.length > 0, `Prow edge glyph ${glyph.name} must be visible`);
    return { first: Math.min(...occupied), last: Math.max(...occupied) };
  };
  for (const side of SIDES) {
    const profile = source.prowProfiles?.[side];
    invariant(profile && typeof profile === "object", `Sector must define ${side} prow profile`);
    const edgeGlyph = glyphs.get(profile.edgeGlyph);
    const fillGlyph = glyphs.get(profile.fillGlyph);
    invariant(edgeGlyph?.faction === side && edgeGlyph.tags.includes("prow_edge"),
      `${side} prow profile must use a faction prow-edge glyph`);
    invariant(fillGlyph?.faction === side && fillGlyph.tags.includes("surface"),
      `${side} prow profile must use a faction surface fill glyph`);
    const occupiedRows = profile.occupiedBaseColumnsByRow;
    invariant(Array.isArray(occupiedRows) && occupiedRows.length === prowSection.rows,
      `${side} prow profile must contain ${prowSection.rows} rows`);
    const masks = Uint8Array.from(occupiedRows.map((columns, rowIndex) => {
      invariant(Array.isArray(columns) && columns.length > 0,
        `${side} prow row ${rowIndex} must retain at least one occupied cell`);
      let mask = 0;
      for (const column of columns) {
        invariant(Number.isInteger(column) && column >= 0 && column < BASE_HULL_COLUMNS,
          `${side} prow row ${rowIndex} has invalid base column ${column}`);
        invariant((mask & (1 << column)) === 0,
          `${side} prow row ${rowIndex} repeats base column ${column}`);
        mask |= 1 << column;
      }
      return mask;
    }));
    const widths = [...masks].map((mask) => mask.toString(2).replaceAll("0", "").length);
    invariant(widths[0] === BASE_HULL_COLUMNS && widths.at(-1) === 1,
      `${side} prow must taper from eight occupied cells to one terminal cell`);
    invariant(widths.every((width, index) => index === 0 || width <= widths[index - 1]),
      `${side} prow occupied width must not expand toward its tip`);
    const extent = glyphHorizontalExtent(edgeGlyph);
    const boundaries = Uint8Array.from([...masks].map((mask) => {
      const columns = Array.from({ length: BASE_HULL_COLUMNS }, (_, column) => column)
        .filter((column) => mask & (1 << column));
      if (side === "allied") {
        const edgeColumn = Math.max(...columns);
        return PMG_LEFT_EDGE + edgeColumn * 4 + extent.last + 1;
      }
      const edgeColumn = Math.min(...columns);
      return PMG_LEFT_EDGE + (32 + edgeColumn) * 4 + extent.first;
    }));
    prowOccupancyMasks.set(side, masks);
    prowEdgeGlyphs.set(side, edgeGlyph);
    prowFillGlyphs.set(side, fillGlyph);
    prowCollisionBoundaries.set(side, boundaries);
  }

  const sectionForRow = (row) => sections.find((section) =>
    row >= section.start && row < section.end);
  const sourceRowFor = (side, sectorRow, difficulty = "hard") => {
    if (!Number.isInteger(sectorRow) || sectorRow < 0 || sectorRow >= sectionStart) return null;
    const moduleIndex = Math.floor(sectorRow / source.moduleRows);
    const localRow = sectorRow % source.moduleRows;
    const moduleId = moduleSequencesByDifficulty.get(side).get(difficulty)[moduleIndex];
    return moduleSourceRowsBySide.get(side)[moduleId * source.moduleRows + localRow];
  };
  const moduleIdFor = (side, sectorRow, difficulty = "hard") => {
    if (!Number.isInteger(sectorRow) || sectorRow < 0 || sectorRow >= sectionStart) return null;
    return moduleSequencesByDifficulty.get(side).get(difficulty)
      [Math.floor(sectorRow / source.moduleRows)];
  };
  const sectorRowsByDifficulty = new Map();
  const sectorScreenRowsByDifficulty = new Map();
  const cannonRowsByDifficulty = new Map();
  const sectorRowsBySide = new Map();
  const sectorDepthsBySide = new Map();
  const sectorScreenRowsBySide = new Map();
  const cannonRowsBySide = new Map();
  for (const side of SIDES) {
    const rowsByDifficulty = new Map();
    const screenRowsByDifficulty = new Map();
    const cannonsByDifficulty = new Map();
    for (const difficulty of DIFFICULTIES) {
      const rows = [];
      const depths = [];
      const screenRows = [];
      const cannonRows = [];
      for (let sectorRow = 0; sectorRow < sectionStart; sectorRow += 1) {
        const sourceRow = sourceRowFor(side, sectorRow, difficulty);
        const row = [...rowsBySide.get(side)[sourceRow]];
        const moduleId = moduleIdFor(side, sectorRow, difficulty);
        if (moduleId === engineModuleIds.get(side)) {
          const mask = engineOverlayMasks.get(side)[sectorRow % source.moduleRows];
          for (let baseColumn = 0; baseColumn < 8; baseColumn += 1) {
            if (!(mask & (1 << baseColumn))) continue;
            const mapColumn = side === "allied" ? baseColumn : baseColumn + 1;
            invariant(row[mapColumn] !== "space",
              `${side} engine energy cannot create collision in an empty hull cell`);
            row[mapColumn] = engineGlyphs.get(side).name;
          }
        }
        const section = sectionForRow(sectorRow);
        if (section.id === "prow") {
          const mask = prowOccupancyMasks.get(side)[sectorRow - prowSection.start];
          const fillName = prowFillGlyphs.get(side).name;
          for (let baseColumn = 0; baseColumn < BASE_HULL_COLUMNS; baseColumn += 1) {
            const mapColumn = side === "allied" ? baseColumn : baseColumn + 1;
            if (!(mask & (1 << baseColumn))) {
              row[mapColumn] = "space";
            } else if (row[mapColumn] === "space") {
              row[mapColumn] = fillName;
            }
          }
          const occupiedColumns = Array.from({ length: BASE_HULL_COLUMNS }, (_, column) => column)
            .filter((column) => mask & (1 << column));
          const edgeColumn = side === "allied"
            ? Math.max(...occupiedColumns)
            : Math.min(...occupiedColumns);
          row[side === "allied" ? edgeColumn : edgeColumn + 1] = prowEdgeGlyphs.get(side).name;
        }
        const hasProjection = projectionGlyph(side, row) !== "space";
        if (hasProjection) {
          const eligibleEnd = section.end - section.weaponShutdownRows;
          invariant(section.weaponEligible && sectorRow < eligibleEnd,
            `${side} sector row ${sectorRow} creates a cannon outside its eligible hull span`);
          cannonRows.push(sectorRow);
        }
        const depth = derivedInnerDepth(side, row);
        rows.push(row);
        depths.push(depth);
        screenRows.push(row.map((name) => screenCodes.get(name)));
      }
      invariant(cannonRows.length === expectedTurretCounts[difficulty],
        `${side}/${difficulty} hull must expose exactly ${expectedTurretCounts[difficulty]} cannons`);
      invariant(cannonRows[0] - sections[0].end <= 1,
        `${side}/${difficulty} first cannon is too far behind the engine section`);
      invariant(cannonRows.every((row, index) => index === 0 ||
        row - cannonRows[index - 1] >= turretLayout.minimumSpacingRows),
      `${side}/${difficulty} cannon spacing is unsafe`);
      invariant(cannonRows.every((row, index) => index === 0 ||
        row - cannonRows[index - 1] <= turretLayout.maximumGapRows[difficulty]),
      `${side}/${difficulty} cannon layout contains an excessive gap`);
      const muzzleCode = screenCodes.get([...glyphs.values()].find((glyph) =>
        glyph.faction === side && glyph.tags.includes("muzzle")).name);
      invariant(screenRows.flat().filter((code) => code ===
        muzzleCode).length === cannonRows.length,
      `${side}/${difficulty} runtime geometry must contain one muzzle per station`);
      rowsByDifficulty.set(difficulty, rows);
      screenRowsByDifficulty.set(difficulty, screenRows);
      cannonsByDifficulty.set(difficulty, cannonRows);
      if (difficulty === "hard") sectorDepthsBySide.set(side, depths);
    }
    sectorRowsByDifficulty.set(side, rowsByDifficulty);
    sectorScreenRowsByDifficulty.set(side, screenRowsByDifficulty);
    cannonRowsByDifficulty.set(side, cannonsByDifficulty);
    sectorRowsBySide.set(side, rowsByDifficulty.get("hard"));
    sectorScreenRowsBySide.set(side, screenRowsByDifficulty.get("hard"));
    cannonRowsBySide.set(side, cannonsByDifficulty.get("hard"));
  }

  const streamRows = sectionStart + source.sidePhaseRows;
  for (let streamRow = 0; streamRow < streamRows; streamRow += 1) {
    const leftRow = streamRow < sectionStart ? streamRow : null;
    const rightRow = streamRow >= source.sidePhaseRows
      ? streamRow - source.sidePhaseRows
      : null;
    const projections = [
      leftRow !== null
        ? projectionGlyph("allied", sectorRowsBySide.get("allied")[leftRow])
        : "space",
      rightRow !== null && rightRow < sectionStart
        ? projectionGlyph("enemy", sectorRowsBySide.get("enemy")[rightRow])
        : "space",
    ].filter((name) => name !== "space").length;
    invariant(CENTRAL_COLUMNS - projections >= 22,
      `Sector stream row ${streamRow} leaves fewer than 22 free central cells`);
  }

  return {
    moduleRows: source.moduleRows,
    baselineSectorRows: source.baselineSectorRows,
    lengthMultiplier: source.lengthMultiplier,
    sidePhaseRows: source.sidePhaseRows,
    visibleRows: source.visibleRows,
    previewSectorRow: source.previewSectorRow,
    engineAnimationFrames: source.engineAnimationFrames,
    launchFlashFrames: source.launchFlashFrames,
    sections,
    totalRows: sectionStart,
    streamRows,
    moduleNamesBySide,
    moduleIdsBySide,
    moduleSourceRowsBySide,
    moduleSequences,
    moduleSequencesByDifficulty,
    cannonModuleIndicesByDifficulty,
    turretModuleIds,
    layoutSeed,
    layoutSeedsByDifficulty,
    minimumTurretSpacingRows: turretLayout.minimumSpacingRows,
    maximumTurretGapRows: Object.freeze({ ...turretLayout.maximumGapRows }),
    firstEligibleRow: firstEligibleModule * source.moduleRows,
    lastEligibleRow: (lastEligibleModule + 1) * source.moduleRows - 1,
    engineModuleIds,
    engineOverlayMasks,
    engineGlyphs,
    prowOccupancyMasks,
    prowEdgeGlyphs,
    prowFillGlyphs,
    prowCollisionBoundaries,
    sectorRowsBySide,
    sectorDepthsBySide,
    sectorScreenRowsBySide,
    cannonRowsBySide,
    cannonRowsByDifficulty,
    sectorRowsByDifficulty,
    sectorScreenRowsByDifficulty,
    turretCounts: Object.freeze({ ...expectedTurretCounts }),
    disabledTurretModuleIds,
    sourceRowFor,
    moduleIdFor,
  };
}

export function compileCapitalHulls(definition, options = {}) {
  invariant(definition?.formatVersion === 1, "Unsupported capital-hulls formatVersion");
  invariant(definition.displayMode === "ANTIC 4", "Capital hulls must use ANTIC 4");
  invariant(Number.isInteger(definition.charsetBaseIndex) && definition.charsetBaseIndex >= 0,
    "charsetBaseIndex must be a non-negative integer");
  invariant(Number.isInteger(definition.segmentRows) && definition.segmentRows >= 32,
    "Capital hull segment must contain at least 32 rows");
  invariant(Number.isInteger(definition.previewStartPhase) &&
    definition.previewStartPhase >= 0 && definition.previewStartPhase < definition.segmentRows,
  "previewStartPhase must select a segment row");

  const glyphs = new Map();
  const glyphList = [];
  invariant(Array.isArray(definition.glyphs) && definition.glyphs.length > 0,
    "Capital hull source must define glyphs");
  invariant(definition.glyphs.length <= 32, "Capital hull source exceeds the 32-glyph review budget");
  for (const sourceGlyph of definition.glyphs) {
    invariant(/^[a-z][a-z0-9_]*$/.test(sourceGlyph.name ?? ""),
      `Invalid capital hull glyph name ${sourceGlyph.name}`);
    invariant(!glyphs.has(sourceGlyph.name), `Duplicate capital hull glyph ${sourceGlyph.name}`);
    invariant(SIDES.includes(sourceGlyph.faction),
      `Glyph ${sourceGlyph.name} has invalid faction ${sourceGlyph.faction}`);
    invariant(SCREEN_BANKS.has(sourceGlyph.screenBank),
      `Glyph ${sourceGlyph.name} has invalid screenBank ${sourceGlyph.screenBank}`);
    invariant(Array.isArray(sourceGlyph.tags), `Glyph ${sourceGlyph.name} must declare tags`);
    const factionBank = sourceGlyph.faction === "allied" ? "pf2" : "pf3";
    invariant(sourceGlyph.screenBank === factionBank || sourceGlyph.tags.includes("energy"),
      `Glyph ${sourceGlyph.name} does not use its faction's ANTIC 4 colour bank or an explicit energy role`);
    const pixels = normalizeGlyphPixels(sourceGlyph);
    const index = definition.charsetBaseIndex + glyphList.length;
    invariant(index < 128, `Glyph ${sourceGlyph.name} exceeds ANTIC 4 charset index 127`);
    const glyph = {
      ...sourceGlyph,
      index,
      pixels,
      bytes: packGlyphRows(pixels),
      screenCode: index | SCREEN_BANKS.get(sourceGlyph.screenBank),
      animationBytes: sourceGlyph.animationFrames?.map((frame, frameIndex) => {
        const rows = normalizeGlyphPixels({
          name: `${sourceGlyph.name} animation frame ${frameIndex}`,
          pixels: frame,
        });
        return packGlyphRows(rows);
      }) ?? null,
    };
    glyphs.set(glyph.name, glyph);
    glyphList.push(glyph);
  }

  const screenCodes = new Map([["space", 0]]);
  for (const glyph of glyphList) screenCodes.set(glyph.name, glyph.screenCode);

  const rowsBySide = new Map();
  const depthsBySide = new Map();
  const contourTransitionCounts = new Map();
  const depthRunLengthsBySide = new Map();
  for (const side of SIDES) {
    const sourceMap = definition.maps?.[side];
    invariant(sourceMap, `Missing ${side} hull map`);
    invariant(Array.isArray(sourceMap.rows) && sourceMap.rows.length === definition.segmentRows,
      `${side} map must contain ${definition.segmentRows} rows`);
    invariant(Array.isArray(sourceMap.innerDepth) &&
      sourceMap.innerDepth.length === definition.segmentRows,
    `${side} innerDepth must contain ${definition.segmentRows} entries`);
    const rows = sourceMap.rows.map((row, index) => normalizeMapRow(row, side, index));
    const depths = rows.map((row, index) => {
      for (const glyphName of row) {
        invariant(screenCodes.has(glyphName), `${side} row ${index} uses unknown glyph ${glyphName}`);
        if (glyphName !== "space") {
          invariant(glyphs.get(glyphName).faction === side,
            `${side} row ${index} uses ${glyphName} from the other faction`);
        }
      }
      const depth = derivedInnerDepth(side, row);
      invariant(depth >= 5 && depth <= 8,
        `${side} row ${index} has unsupported base depth ${depth}`);
      invariant(sourceMap.innerDepth[index] === depth,
        `${side} row ${index} declares depth ${sourceMap.innerDepth[index]}, derived ${depth}`);
      return depth;
    });
    invariant([5, 6, 7, 8].every((depth) => depths.includes(depth)),
      `${side} contour must use deliberate depths 5, 6, 7 and 8`);
    const transitionCount = countCyclicTransitions(depths);
    invariant(transitionCount <= 8,
      `${side} contour has ${transitionCount} principal depth transitions; maximum is 8`);
    const runLengths = cyclicRunLengths(depths);
    invariant(runLengths.every((length) => length >= 2),
      `${side} contour contains a depth run shorter than two character rows`);
    invariant(runLengths.every((length) => length <= 8),
      `${side} contour contains a depth run longer than eight character rows`);
    rowsBySide.set(side, rows);
    depthsBySide.set(side, depths);
    contourTransitionCounts.set(side, transitionCount);
    depthRunLengthsBySide.set(side, runLengths);
  }

  const turretTypes = new Map(Object.entries(definition.turretTypes ?? {}));
  invariant(turretTypes.size > 0, "Capital hull source must define turretTypes");
  for (const [name, value] of turretTypes) {
    invariant(/^[a-z][a-z0-9_]*$/.test(name) && Number.isInteger(value) && value >= 0 && value <= 255,
      `Invalid turret type ${name}`);
  }

  invariant(Array.isArray(definition.turrets), "Capital hull source must define turrets");
  const turretIds = new Set();
  const turrets = definition.turrets.map((sourceTurret) => {
    invariant(/^[a-z][a-z0-9_]*$/.test(sourceTurret.id ?? ""),
      `Invalid turret id ${sourceTurret.id}`);
    invariant(!turretIds.has(sourceTurret.id), `Duplicate turret id ${sourceTurret.id}`);
    turretIds.add(sourceTurret.id);
    invariant(SIDES.includes(sourceTurret.side), `Turret ${sourceTurret.id} has invalid side`);
    invariant(Number.isInteger(sourceTurret.segmentRow) && sourceTurret.segmentRow >= 0 &&
      sourceTurret.segmentRow < definition.segmentRows,
    `Turret ${sourceTurret.id} has invalid segmentRow`);
    invariant(Number.isInteger(sourceTurret.muzzleScanlineOffset) &&
      sourceTurret.muzzleScanlineOffset >= 0 && sourceTurret.muzzleScanlineOffset < 8,
    `Turret ${sourceTurret.id} has invalid muzzleScanlineOffset`);
    invariant(DIRECTIONS.has(sourceTurret.direction),
      `Turret ${sourceTurret.id} has invalid direction`);
    invariant(turretTypes.has(sourceTurret.type),
      `Turret ${sourceTurret.id} has unknown type ${sourceTurret.type}`);
    const expectedMuzzleColumn = sourceTurret.side === "allied" ? 8 : 31;
    invariant(sourceTurret.muzzleColumn === expectedMuzzleColumn,
      `Turret ${sourceTurret.id} muzzle must use boundary column ${expectedMuzzleColumn}`);
    invariant(sourceTurret.direction === (sourceTurret.side === "allied" ? "right" : "left"),
      `Turret ${sourceTurret.id} points away from the corridor`);
    const rows = rowsBySide.get(sourceTurret.side);
    const muzzleName = rows[sourceTurret.segmentRow][relativeColumn(
      sourceTurret.side,
      sourceTurret.muzzleColumn,
    )];
    invariant(muzzleName === sourceTurret.muzzleGlyph,
      `Turret ${sourceTurret.id} metadata points to ${muzzleName}, not ${sourceTurret.muzzleGlyph}`);
    invariant(glyphs.get(muzzleName)?.tags.includes("muzzle"),
      `Turret ${sourceTurret.id} muzzle cell is not a muzzle glyph`);
    for (const component of ["base", "housing", "barrel"]) {
      const cells = sourceTurret.footprint?.[component];
      invariant(Array.isArray(cells) && cells.length > 0,
        `Turret ${sourceTurret.id} must declare ${component} footprint cells`);
      for (const cell of cells) {
        validateFootprintCell(sourceTurret, component, cell, rows, glyphs);
      }
    }
    return {
      ...sourceTurret,
      sideId: SIDE_IDS.get(sourceTurret.side),
      directionId: DIRECTIONS.get(sourceTurret.direction),
      typeId: turretTypes.get(sourceTurret.type),
      muzzleScreenCode: screenCodes.get(muzzleName),
    };
  });

  for (const side of SIDES) {
    invariant(turrets.filter((turret) => turret.side === side).length >= 1,
      `${side} hull must contain at least one complete turret`);
    const turretRows = new Set(turrets.filter((turret) => turret.side === side)
      .map((turret) => turret.segmentRow));
    for (let rowIndex = 0; rowIndex < definition.segmentRows; rowIndex += 1) {
      const hasProjection = projectionGlyph(side, rowsBySide.get(side)[rowIndex]) !== "space";
      invariant(hasProjection === turretRows.has(rowIndex),
        `${side} row ${rowIndex} projection and muzzle metadata disagree`);
    }
  }

  for (let rowIndex = 0; rowIndex < definition.segmentRows; rowIndex += 1) {
    const projections = SIDES.filter((side) =>
      projectionGlyph(side, rowsBySide.get(side)[rowIndex]) !== "space").length;
    invariant(CENTRAL_COLUMNS - projections >= 22,
      `Row ${rowIndex} leaves fewer than 22 free central cells`);
  }

  const sector = compileSector(definition, rowsBySide, depthsBySide, glyphs, screenCodes, options);

  const codebooks = new Map();
  const packedMaps = new Map();
  const decodedMaps = new Map();
  for (const side of SIDES) {
    const codebook = createCodebook(side, rowsBySide.get(side), screenCodes);
    const packed = packMap(rowsBySide.get(side), codebook, screenCodes);
    codebooks.set(side, codebook);
    packedMaps.set(side, packed);
    decodedMaps.set(side, decodePackedHullMap(packed, codebook, definition.segmentRows));
  }

  const turretBytes = Uint8Array.from(turrets.flatMap((turret) => [
    turret.sideId,
    turret.segmentRow,
    turret.muzzleColumn,
    turret.muzzleScanlineOffset,
    turret.directionId,
    turret.typeId,
    turret.muzzleScreenCode,
  ]));

  const broadside = definition.broadside;
  invariant(broadside && typeof broadside === "object",
    "Capital hull source must define broadside timing");
  const boundedByte = (name, minimum = 0) => {
    const value = broadside[name];
    invariant(Number.isInteger(value) && value >= minimum && value <= 255,
      `broadside.${name} must be a byte from ${minimum} through 255`);
    return value;
  };
  const boundedWord = (name, minimum = 0) => {
    const value = broadside[name];
    invariant(Number.isInteger(value) && value >= minimum && value <= 0xffff,
      `broadside.${name} must be a word from ${minimum} through 65535`);
    return value;
  };
  const broadsideTiming = {
    provisionalFirstCapitalGameplayFrame:
      boundedWord("provisionalFirstCapitalGameplayFrame", 1),
    initialDelayFrames: boundedByte("initialDelayFrames", 1),
    retryDelayFrames: boundedByte("retryDelayFrames", 1),
    scheduleDelayScale: boundedByte("scheduleDelayScale", 1),
    scheduleCalmFrames: boundedByte("scheduleCalmFrames"),
    warningFrames: boundedByte("warningFrames", 20),
    warningEarlyFrames: boundedByte("warningEarlyFrames", 1),
    warningMediumFrames: boundedByte("warningMediumFrames", 1),
    warningPulsePeriodFrames: boundedByte("warningPulsePeriodFrames", 2),
    warningEarlyHeight: boundedByte("warningEarlyHeight", 1),
    warningMediumHeight: boundedByte("warningMediumHeight", 1),
    worldScrollRateDenominator: boundedByte("worldScrollRateDenominator", 1),
    hullScrollRateDenominator: boundedByte("hullScrollRateDenominator", 1),
    projectileSpeed: boundedByte("projectileSpeed", 1),
    warningHeight: boundedByte("warningHeight", 1),
    flyingHeight: boundedByte("flyingHeight", 1),
    impactHeight: boundedByte("impactHeight", 1),
    impactFrames: boundedByte("impactFrames", 1),
    playerDamage: boundedByte("playerDamage", 1),
    damageCooldownFrames: boundedByte("damageCooldownFrames", 1),
    capitalHullContactDamage: boundedByte("capitalHullContactDamage", 1),
    capitalHullContactCooldownFrames: boundedByte("capitalHullContactCooldownFrames", 1),
    minimumVerticalSeparation: boundedByte("minimumVerticalSeparation", 1),
    returnToMenuFrames: boundedByte("returnToMenuFrames", 1),
    playerStartingLives: boundedByte("playerStartingLives", 1),
    respawnInvulnerableFrames: boundedWord("respawnInvulnerableFrames", 1),
    respawnBlinkHalfPeriodFrames: boundedByte("respawnBlinkHalfPeriodFrames", 1),
  };
  const projectileVisuals = broadside.projectileVisuals;
  invariant(projectileVisuals && typeof projectileVisuals === "object",
    "Capital hull source must define projectile visual language");
  const compileProjectileVisual = (name, expected) => {
    const source = projectileVisuals[name];
    invariant(source && typeof source === "object", `projectileVisuals.${name} is required`);
    for (const [field, value] of Object.entries(expected)) {
      invariant(source[field] === value,
        `projectileVisuals.${name}.${field} must remain ${value}`);
    }
    return Object.freeze({ ...source });
  };
  broadsideTiming.projectileVisuals = Object.freeze({
    player: compileProjectileVisual("player", {
      widthHpos: 1,
      height: 2,
      coreRegister: "COLPF2",
      coreValue: 0x1e,
    }),
    interceptor: compileProjectileVisual("interceptor", {
      widthHpos: 2,
      height: 3,
      register: "COLPF3",
      value: 0x46,
    }),
    capital: compileProjectileVisual("capital", {
      widthHpos: 8,
      height: 6,
      coreRegister: "COLPF0",
      coreValue: 0x0e,
      alliedRegister: "COLPF2",
      alliedValue: 0x1e,
      alliedAttribute: 0,
      hostileRegister: "COLPF3",
      hostileValue: 0x46,
      hostileAttribute: 0x80,
    }),
  });
  invariant(broadsideTiming.projectileVisuals.capital.widthHpos >=
    broadsideTiming.projectileVisuals.interceptor.widthHpos * 2,
  "Capital projectile must be at least twice the fighter projectile length");
  const compileScrollRates = (name, denominator) => {
    const rates = broadside[name];
    invariant(rates && typeof rates === "object",
      `Capital hull source must define EASY, MEDIUM, and HARD ${name}`);
    return Object.fromEntries(["easy", "medium", "hard"].map((difficulty) => {
      const rate = rates[difficulty];
      invariant(Number.isInteger(rate) && rate >= 1 && rate < denominator,
        `broadside.${name}.${difficulty} must be below the denominator`);
      return [difficulty, rate];
    }));
  };
  broadsideTiming.worldScrollRates = compileScrollRates(
    "worldScrollRates",
    broadsideTiming.worldScrollRateDenominator,
  );
  broadsideTiming.hullScrollRates = compileScrollRates(
    "hullScrollRates",
    broadsideTiming.hullScrollRateDenominator,
  );
  invariant(broadsideTiming.worldScrollRates.easy < broadsideTiming.worldScrollRates.medium &&
    broadsideTiming.worldScrollRates.medium < broadsideTiming.worldScrollRates.hard,
  "World-scroll rates must increase from EASY through HARD");
  invariant(broadsideTiming.hullScrollRates.easy < broadsideTiming.hullScrollRates.medium &&
    broadsideTiming.hullScrollRates.medium < broadsideTiming.hullScrollRates.hard,
  "Hull-scroll rates must increase from EASY through HARD");
  invariant(broadsideTiming.projectileSpeed <= 4,
    "Broadside projectile speed exceeds the bounded PAL review range");
  invariant(broadsideTiming.warningHeight <= 8 && broadsideTiming.flyingHeight <= 8 &&
    broadsideTiming.impactHeight <= 8,
  "Broadside missile spans may not exceed eight scanlines");
  invariant(broadsideTiming.warningEarlyFrames + broadsideTiming.warningMediumFrames <
    broadsideTiming.warningFrames,
  "Broadside warning phases must leave a non-empty hot phase");
  invariant(broadsideTiming.warningEarlyHeight < broadsideTiming.warningMediumHeight &&
    broadsideTiming.warningMediumHeight < broadsideTiming.warningHeight,
  "Broadside warning heights must grow from early through hot");
  invariant(broadsideTiming.warningPulsePeriodFrames >= 2,
    "Broadside hot pulse may not flicker every PAL frame");
  invariant(broadsideTiming.capitalHullContactDamage === broadsideTiming.playerDamage,
    "Capital-hull contact must share the 20-point player-damage path");
  invariant(broadsideTiming.capitalHullContactCooldownFrames ===
    broadsideTiming.damageCooldownFrames,
  "Capital-hull contact must share the deterministic player-damage cooldown");
  invariant(broadsideTiming.respawnInvulnerableFrames === 250,
    "Respawn invulnerability must last exactly five PAL seconds");
  invariant((broadsideTiming.respawnBlinkHalfPeriodFrames &
    (broadsideTiming.respawnBlinkHalfPeriodFrames - 1)) === 0,
  "Respawn blink half-period must be a power of two");
  const explosionSource = broadside.capitalExplosion;
  invariant(explosionSource && typeof explosionSource === "object",
    "Capital hull source must define the capital-hull explosion");
  const explosionWidth = explosionSource.width;
  const explosionHeight = explosionSource.height;
  const explosionDuration = explosionSource.durationFrames;
  const explosionPhaseFrames = explosionSource.phaseFrames;
  invariant(explosionWidth === 3 && explosionHeight === 3,
    "Capital-hull explosion must use a bounded 3x3 character footprint");
  invariant(Number.isInteger(explosionDuration) && explosionDuration >= 20 &&
    explosionDuration <= 30, "Capital-hull explosion must last 20 through 30 PAL frames");
  invariant(Number.isInteger(explosionPhaseFrames) && explosionPhaseFrames >= 1,
    "Capital-hull explosion phase duration must be positive");
  invariant(Array.isArray(explosionSource.phases) && explosionSource.phases.length >= 5 &&
    explosionDuration === explosionSource.phases.length * explosionPhaseFrames,
  "Capital-hull explosion phases must exactly cover its duration");
  const explosionCells = explosionWidth * explosionHeight;
  let peakOccupiedCells = 0;
  let redExpansionPhases = 0;
  const explosionPhaseBytes = Uint8Array.from(explosionSource.phases.flatMap((phase, phaseIndex) => {
    invariant(Array.isArray(phase) && phase.length === explosionCells,
      `Capital-hull explosion phase ${phaseIndex} must contain ${explosionCells} cells`);
    let occupiedCells = 0;
    let redCells = 0;
    const bytes = phase.map((cell, cellIndex) => {
      if (cell === 0) return 0;
      invariant(cell && typeof cell === "object" && SCREEN_BANKS.has(cell.bank),
        `Capital-hull explosion phase ${phaseIndex} cell ${cellIndex} is invalid`);
      const glyph = glyphs.get(cell.glyph);
      invariant(glyph?.tags.includes("capital_explosion"),
        `Capital-hull explosion phase ${phaseIndex} uses invalid glyph ${cell.glyph}`);
      invariant(cell.bank === "pf2" || cell.bank === "pf3",
        "Capital-hull explosion may use only the amber/core and hostile-red banks");
      occupiedCells += 1;
      if (cell.bank === "pf3") redCells += 1;
      return glyph.index | SCREEN_BANKS.get(cell.bank);
    });
    peakOccupiedCells = Math.max(peakOccupiedCells, occupiedCells);
    if (phaseIndex >= 1 && phaseIndex <= 4 && redCells > occupiedCells / 2) {
      redExpansionPhases += 1;
    }
    return bytes;
  }));
  invariant(explosionSource.phases[0].filter((cell) => cell !== 0).length === 1,
    "Capital-hull explosion must begin with one compact impact core");
  invariant(peakOccupiedCells >= 7,
    "Capital-hull explosion must expand to at least seven occupied cells");
  invariant(redExpansionPhases >= 3,
    "Capital-hull explosion expansion must be predominantly hostile red");
  const soundSource = explosionSource.sound;
  invariant(soundSource?.channel === 4 && soundSource.audctl === 0,
    "Capital-hull explosion sound must use standalone POKEY channel four");
  invariant(Array.isArray(soundSource.frequency) &&
    soundSource.frequency.length === explosionDuration,
  "Capital-hull explosion frequency envelope must cover its complete duration");
  invariant(Array.isArray(soundSource.control) &&
    soundSource.control.length === explosionDuration,
  "Capital-hull explosion control envelope must cover its complete duration");
  const explosionSoundFrequencyBytes = Uint8Array.from(soundSource.frequency);
  const explosionSoundControlBytes = Uint8Array.from(soundSource.control);
  invariant([...explosionSoundFrequencyBytes].every((value) => Number.isInteger(value)),
    "Capital-hull explosion frequencies must be bytes");
  invariant([...explosionSoundControlBytes].every((value) =>
    (value & 0xf0) === 0x80 && (value & 0x0f) >= 1),
  "Capital-hull explosion must use a deterministic POKEY noise/volume envelope");
  invariant((explosionSoundControlBytes.at(-1) & 0x0f) === 1,
    "Capital-hull explosion sound must decay to its minimum non-zero tail before silence");
  broadsideTiming.capitalExplosion = {
    durationFrames: explosionDuration,
    phaseFrames: explosionPhaseFrames,
    width: explosionWidth,
    height: explosionHeight,
    phaseCount: explosionSource.phases.length,
    phaseBytes: explosionPhaseBytes,
    soundChannel: soundSource.channel,
    soundAudctl: soundSource.audctl,
    soundFrequencyBytes: explosionSoundFrequencyBytes,
    soundControlBytes: explosionSoundControlBytes,
    runtimeFrequencyBytes: Uint8Array.from([...explosionSoundFrequencyBytes].reverse()),
    runtimeControlBytes: Uint8Array.from([...explosionSoundControlBytes].reverse()),
  };
  invariant(Array.isArray(broadside.schedule) && broadside.schedule.length > 0,
    "Broadside schedule must contain firing opportunities");
  const schedule = broadside.schedule.map((entry, index) => {
    invariant(SIDE_IDS.has(entry.side),
      `Broadside schedule entry ${index} has unknown side ${entry.side}`);
    invariant(Number.isInteger(entry.baseDelayAfterFrames) &&
      entry.baseDelayAfterFrames >= 1 && entry.baseDelayAfterFrames <= 255,
    `Broadside schedule entry ${index} has invalid baseDelayAfterFrames`);
    const delayAfterFrames = entry.baseDelayAfterFrames * broadsideTiming.scheduleDelayScale +
      broadsideTiming.scheduleCalmFrames;
    invariant(delayAfterFrames <= 255,
      `Broadside schedule entry ${index} exceeds one PAL-frame timer byte`);
    return {
      ...entry,
      delayAfterFrames,
      sideId: SIDE_IDS.get(entry.side),
    };
  });
  const scheduleBytes = Uint8Array.from(schedule.flatMap((entry) => [
    entry.sideId,
    entry.delayAfterFrames,
  ]));
  const worldScrollRateBytes = Uint8Array.from(
    ["easy", "medium", "hard"].map((difficulty) =>
      broadsideTiming.worldScrollRates[difficulty]),
  );
  const hullScrollRateBytes = Uint8Array.from(
    ["easy", "medium", "hard"].map((difficulty) =>
      broadsideTiming.hullScrollRates[difficulty]),
  );
  const warningLastSafeRowBytes = Uint8Array.from(
    ["easy", "medium", "hard"].map((difficulty) => {
      const warningAdvances = Math.ceil(
        broadsideTiming.warningFrames * broadsideTiming.hullScrollRates[difficulty] /
          broadsideTiming.hullScrollRateDenominator,
      );
      return sector.visibleRows - 1 - warningAdvances;
    }),
  );
  const collisionBoundaries = new Map(SIDES.map((side) => [
    side,
    Uint8Array.from(rowsBySide.get(side).map((row, index) =>
      collisionBoundary(side, row, depthsBySide.get(side)[index]))),
  ]));

  return {
    definition,
    glyphs: glyphList,
    glyphBytes: Uint8Array.from(glyphList.flatMap((glyph) => [...glyph.bytes])),
    rowsBySide,
    depthsBySide,
    contourTransitionCounts,
    depthRunLengthsBySide,
    codebooks,
    packedMaps,
    decodedMaps,
    turrets,
    turretBytes,
    broadside: broadsideTiming,
    schedule,
    scheduleBytes,
    worldScrollRateBytes,
    hullScrollRateBytes,
    warningLastSafeRowBytes,
    collisionBoundaries,
    sector,
    segmentRows: definition.segmentRows,
    previewStartPhase: definition.previewStartPhase,
    mapColumns: MAP_COLUMNS,
    packedRowBytes: PACKED_ROW_BYTES,
    runtimeMapBytes: definition.segmentRows * MAP_COLUMNS * SIDES.length,
    packedDataBytes: [...codebooks.values()].reduce((sum, bytes) => sum + bytes.length, 0) +
      [...packedMaps.values()].reduce((sum, bytes) => sum + bytes.length, 0) +
      turretBytes.length + scheduleBytes.length + worldScrollRateBytes.length +
      hullScrollRateBytes.length + warningLastSafeRowBytes.length +
      [...collisionBoundaries.values()].reduce((sum, bytes) => sum + bytes.length, 0) +
      [...sector.moduleSourceRowsBySide.values()].reduce((sum, bytes) => sum + bytes.length, 0) +
      [...sector.moduleSequences.values()].reduce((sum, bytes) => sum + bytes.length, 0) +
      [...sector.engineOverlayMasks.values()].reduce((sum, bytes) => sum + bytes.length, 0) +
      [...sector.prowOccupancyMasks.values()].reduce((sum, bytes) => sum + bytes.length, 0) +
      [...sector.prowCollisionBoundaries.values()].reduce((sum, bytes) => sum + bytes.length, 0) +
      broadsideTiming.capitalExplosion.phaseBytes.length +
      broadsideTiming.capitalExplosion.soundFrequencyBytes.length +
      broadsideTiming.capitalExplosion.soundControlBytes.length,
  };
}

function macro(name, bytes) {
  const lines = [`.macro ${name}`];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    lines.push(`    .byte ${[...bytes.subarray(offset, offset + 16)].map(byteHex).join(",")}`);
  }
  lines.push(".endmacro", "");
  return lines.join("\n");
}

export function renderCapitalHullsCa65Include(asset) {
  const alliedFlash = asset.glyphs.find((glyph) => glyph.name === "allied_launch_flash");
  const enemyFlash = asset.glyphs.find((glyph) => glyph.name === "enemy_launch_flash");
  const alliedEngine = asset.sector.engineGlyphs.get("allied");
  const enemyEngine = asset.sector.engineGlyphs.get("enemy");
  const alliedTurret = asset.turrets.find(({ side }) => side === "allied");
  const enemyTurret = asset.turrets.find(({ side }) => side === "enemy");
  invariant(alliedFlash && enemyFlash && alliedEngine && enemyEngine,
    "Sector effect glyphs are missing from the capital hull source");
  invariant(alliedEngine.animationBytes?.length === 2 && enemyEngine.animationBytes?.length === 2,
    "Each engine glyph must define exactly two animation frames");
  const engineAnimationBytes = Uint8Array.from([
    ...alliedEngine.animationBytes[0],
    ...alliedEngine.animationBytes[1],
    ...enemyEngine.animationBytes[0],
    ...enemyEngine.animationBytes[1],
  ]);
  const alliedProwEdge = asset.sector.prowEdgeGlyphs.get("allied");
  const enemyProwEdge = asset.sector.prowEdgeGlyphs.get("enemy");
  const alliedProwFill = asset.sector.prowFillGlyphs.get("allied");
  const enemyProwFill = asset.sector.prowFillGlyphs.get("enemy");
  const sectionById = new Map(asset.sector.sections.map((section) => [section.id, section]));
  const explosion = asset.broadside.capitalExplosion;
  const lines = [
    "; Generated by scripts/capital-hulls.mjs from assets/graphics/capital-hulls.json.",
    "; Do not edit generated bytes by hand.",
    `CAPITAL_HULL_GLYPH_BASE = ${asset.definition.charsetBaseIndex}`,
    `CAPITAL_HULL_GLYPH_COUNT = ${asset.glyphs.length}`,
    `CAPITAL_HULL_SEGMENT_ROWS = ${asset.segmentRows}`,
    `CAPITAL_HULL_PREVIEW_START_PHASE = ${asset.previewStartPhase}`,
    `CAPITAL_HULL_MAP_COLUMNS = ${asset.mapColumns}`,
    `CAPITAL_HULL_PACKED_ROW_BYTES = ${asset.packedRowBytes}`,
    `CAPITAL_HULL_PACKED_SIDE_BYTES = ${asset.packedMaps.get("allied").length}`,
    `CAPITAL_HULL_TURRET_COUNT = ${asset.turrets.length}`,
    `CAPITAL_HULL_CANNON_COUNT = ${asset.sector.turretCounts.hard}`,
    `CAPITAL_HULL_CANNON_COUNT_EASY = ${asset.sector.turretCounts.easy}`,
    `CAPITAL_HULL_CANNON_COUNT_MEDIUM = ${asset.sector.turretCounts.medium}`,
    `CAPITAL_HULL_CANNON_COUNT_HARD = ${asset.sector.turretCounts.hard}`,
    `CAPITAL_HULL_SECTOR_MODULE_ROWS = ${asset.sector.moduleRows}`,
    `CAPITAL_HULL_SECTOR_MODULE_COUNT = ${asset.sector.moduleSequences.get("allied").length}`,
    `CAPITAL_HULL_SECTOR_ROWS = ${asset.sector.totalRows}`,
    `CAPITAL_HULL_STREAM_ROWS = ${asset.sector.streamRows}`,
    `CAPITAL_HULL_SIDE_PHASE_ROWS = ${asset.sector.sidePhaseRows}`,
    `CAPITAL_HULL_VISIBLE_ROWS = ${asset.sector.visibleRows}`,
    `CAPITAL_HULL_SECTOR_PREVIEW_ROW = ${asset.sector.previewSectorRow}`,
    `CAPITAL_HULL_ENGINE_ANIMATION_FRAMES = ${asset.sector.engineAnimationFrames}`,
    `CAPITAL_HULL_ENGINE_ANIMATION_PHASES = ${alliedEngine.animationBytes.length}`,
    `CAPITAL_HULL_LAUNCH_FLASH_FRAMES = ${asset.sector.launchFlashFrames}`,
    `CAPITAL_HULL_ALLIED_ENGINE_MODULE = ${asset.sector.engineModuleIds.get("allied")}`,
    `CAPITAL_HULL_ENEMY_ENGINE_MODULE = ${asset.sector.engineModuleIds.get("enemy")}`,
    `CAPITAL_HULL_ALLIED_ENGINE_GLYPH = ${alliedEngine.index}`,
    `CAPITAL_HULL_ENEMY_ENGINE_GLYPH = ${enemyEngine.index}`,
    `CAPITAL_HULL_ALLIED_ENGINE_CODE = ${byteHex(alliedEngine.screenCode)}`,
    `CAPITAL_HULL_ENEMY_ENGINE_CODE = ${byteHex(enemyEngine.screenCode)}`,
    `CAPITAL_HULL_ALLIED_PROW_EDGE_CODE = ${byteHex(alliedProwEdge.screenCode)}`,
    `CAPITAL_HULL_ENEMY_PROW_EDGE_CODE = ${byteHex(enemyProwEdge.screenCode)}`,
    `CAPITAL_HULL_ALLIED_PROW_FILL_CODE = ${byteHex(alliedProwFill.screenCode)}`,
    `CAPITAL_HULL_ENEMY_PROW_FILL_CODE = ${byteHex(enemyProwFill.screenCode)}`,
    `CAPITAL_HULL_ALLIED_FLASH_CODE = ${byteHex(alliedFlash.screenCode)}`,
    `CAPITAL_HULL_ENEMY_FLASH_CODE = ${byteHex(enemyFlash.screenCode)}`,
    `CAPITAL_HULL_ALLIED_MUZZLE_CODE = ${byteHex(alliedTurret.muzzleScreenCode)}`,
    `CAPITAL_HULL_ENEMY_MUZZLE_CODE = ${byteHex(enemyTurret.muzzleScreenCode)}`,
    `CAPITAL_HULL_TURRET_LAYOUT_SEED = ${byteHex(asset.sector.layoutSeed)}`,
    `CAPITAL_HULL_ALLIED_TURRET_MODULE = ${asset.sector.turretModuleIds.get("allied")}`,
    `CAPITAL_HULL_ENEMY_TURRET_MODULE = ${asset.sector.turretModuleIds.get("enemy")}`,
    `CAPITAL_HULL_SECTION_ENGINES_END = ${sectionById.get("engines").end}`,
    `CAPITAL_HULL_SECTION_AFT_END = ${sectionById.get("aft").end}`,
    `CAPITAL_HULL_SECTION_COMBAT_END = ${sectionById.get("combat").end}`,
    `CAPITAL_HULL_SECTION_FORWARD_END = ${sectionById.get("forward").end}`,
    `CAPITAL_HULL_SECTION_PROW_END = ${sectionById.get("prow").end}`,
    "CAPITAL_HULL_STATE_ENGINES = 0",
    "CAPITAL_HULL_STATE_AFT = 1",
    "CAPITAL_HULL_STATE_COMBAT = 2",
    "CAPITAL_HULL_STATE_FORWARD = 3",
    "CAPITAL_HULL_STATE_PROW = 4",
    "CAPITAL_HULL_STATE_DRAIN = 5",
    "CAPITAL_HULL_STATE_COMPLETE = 6",
    "CAPITAL_HULL_STATE_OPEN = 7",
    "CAPITAL_HULL_TURRET_RECORD_BYTES = 7",
    `PROVISIONAL_FIRST_CAPITAL_FRAME = ${asset.broadside.provisionalFirstCapitalGameplayFrame}`,
    `BROADSIDE_SCHEDULE_COUNT = ${asset.schedule.length}`,
    "BROADSIDE_SCHEDULE_RECORD_BYTES = 2",
    `BROADSIDE_INITIAL_DELAY = ${asset.broadside.initialDelayFrames}`,
    `BROADSIDE_RETRY_DELAY = ${asset.broadside.retryDelayFrames}`,
    `BROADSIDE_WARNING_FRAMES = ${asset.broadside.warningFrames}`,
    `BROADSIDE_WARNING_EARLY_FRAMES = ${asset.broadside.warningEarlyFrames}`,
    `BROADSIDE_WARNING_MEDIUM_FRAMES = ${asset.broadside.warningMediumFrames}`,
    `BROADSIDE_WARNING_PULSE_FRAMES = ${asset.broadside.warningPulsePeriodFrames}`,
    `BROADSIDE_WARNING_EARLY_HEIGHT = ${asset.broadside.warningEarlyHeight}`,
    `BROADSIDE_WARNING_MEDIUM_HEIGHT = ${asset.broadside.warningMediumHeight}`,
    `WORLD_SCROLL_RATE_DENOMINATOR = ${asset.broadside.worldScrollRateDenominator}`,
    `WORLD_SCROLL_RATE_EASY = ${asset.broadside.worldScrollRates.easy}`,
    `WORLD_SCROLL_RATE_MEDIUM = ${asset.broadside.worldScrollRates.medium}`,
    `WORLD_SCROLL_RATE_HARD = ${asset.broadside.worldScrollRates.hard}`,
    `HULL_SCROLL_RATE_DENOMINATOR = ${asset.broadside.hullScrollRateDenominator}`,
    `HULL_SCROLL_RATE_EASY = ${asset.broadside.hullScrollRates.easy}`,
    `HULL_SCROLL_RATE_MEDIUM = ${asset.broadside.hullScrollRates.medium}`,
    `HULL_SCROLL_RATE_HARD = ${asset.broadside.hullScrollRates.hard}`,
    `BROADSIDE_PROJECTILE_SPEED = ${asset.broadside.projectileSpeed}`,
    `BROADSIDE_WARNING_HEIGHT = ${asset.broadside.warningHeight}`,
    `BROADSIDE_FLYING_HEIGHT = ${asset.broadside.flyingHeight}`,
    `PLAYER_PROJECTILE_WIDTH_HPOS = ${asset.broadside.projectileVisuals.player.widthHpos}`,
    `PLAYER_PROJECTILE_VISIBLE_HEIGHT = ${asset.broadside.projectileVisuals.player.height}`,
    `CAPITAL_PROJECTILE_WIDTH_HPOS = ${asset.broadside.projectileVisuals.capital.widthHpos}`,
    `CAPITAL_PROJECTILE_VISIBLE_HEIGHT = ${asset.broadside.projectileVisuals.capital.height}`,
    `CAPITAL_PROJECTILE_ALLIED_ATTRIBUTE = ${asset.broadside.projectileVisuals.capital.alliedAttribute}`,
    `CAPITAL_PROJECTILE_HOSTILE_ATTRIBUTE = ${asset.broadside.projectileVisuals.capital.hostileAttribute}`,
    `BROADSIDE_IMPACT_HEIGHT = ${asset.broadside.impactHeight}`,
    `BROADSIDE_IMPACT_FRAMES = ${asset.broadside.impactFrames}`,
    `BROADSIDE_PLAYER_DAMAGE = ${asset.broadside.playerDamage}`,
    `BROADSIDE_DAMAGE_COOLDOWN = ${asset.broadside.damageCooldownFrames}`,
    `CAPITAL_HULL_CONTACT_DAMAGE = ${asset.broadside.capitalHullContactDamage}`,
    `CAPITAL_HULL_CONTACT_COOLDOWN = ${asset.broadside.capitalHullContactCooldownFrames}`,
    `BROADSIDE_MIN_VERTICAL_SEPARATION = ${asset.broadside.minimumVerticalSeparation}`,
    `BROADSIDE_RETURN_TO_MENU_FRAMES = ${asset.broadside.returnToMenuFrames}`,
    `PLAYER_STARTING_LIVES = ${asset.broadside.playerStartingLives}`,
    `RESPAWN_INVULNERABLE_FRAMES = ${asset.broadside.respawnInvulnerableFrames}`,
    `RESPAWN_BLINK_HALF_PERIOD_FRAMES = ${asset.broadside.respawnBlinkHalfPeriodFrames}`,
    `CAPITAL_EXPLOSION_DURATION = ${explosion.durationFrames}`,
    `CAPITAL_EXPLOSION_PHASE_FRAMES = ${explosion.phaseFrames}`,
    `CAPITAL_EXPLOSION_WIDTH = ${explosion.width}`,
    `CAPITAL_EXPLOSION_HEIGHT = ${explosion.height}`,
    `CAPITAL_EXPLOSION_PHASE_COUNT = ${explosion.phaseCount}`,
    `CAPITAL_EXPLOSION_SOUND_CHANNEL = ${explosion.soundChannel}`,
    `CAPITAL_EXPLOSION_SOUND_AUDCTL = ${explosion.soundAudctl}`,
    "CAPITAL_TURRET_SIDE_OFFSET = 0",
    "CAPITAL_TURRET_SEGMENT_ROW_OFFSET = 1",
    "CAPITAL_TURRET_MUZZLE_COLUMN_OFFSET = 2",
    "CAPITAL_TURRET_SCANLINE_OFFSET = 3",
    "CAPITAL_TURRET_DIRECTION_OFFSET = 4",
    "CAPITAL_TURRET_TYPE_OFFSET = 5",
    "CAPITAL_TURRET_MUZZLE_SCREEN_CODE_OFFSET = 6",
    "",
    macro("EMIT_CAPITAL_HULL_GLYPHS", asset.glyphBytes),
    macro("EMIT_ALLIED_HULL_CODEBOOK", asset.codebooks.get("allied")),
    macro("EMIT_ENEMY_HULL_CODEBOOK", asset.codebooks.get("enemy")),
    macro("EMIT_ALLIED_HULL_PACKED_MAP", asset.packedMaps.get("allied")),
    macro("EMIT_ENEMY_HULL_PACKED_MAP", asset.packedMaps.get("enemy")),
    macro("EMIT_CAPITAL_HULL_TURRETS", asset.turretBytes),
    macro("EMIT_BROADSIDE_SCHEDULE", asset.scheduleBytes),
    macro("EMIT_WORLD_SCROLL_RATES", asset.worldScrollRateBytes),
    macro("EMIT_HULL_SCROLL_RATES", asset.hullScrollRateBytes),
    macro("EMIT_TURRET_WARNING_LAST_SAFE_ROWS", asset.warningLastSafeRowBytes),
    macro("EMIT_ALLIED_COLLISION_BOUNDARIES", asset.collisionBoundaries.get("allied")),
    macro("EMIT_ENEMY_COLLISION_BOUNDARIES", asset.collisionBoundaries.get("enemy")),
    macro("EMIT_ALLIED_SECTOR_MODULE_SOURCES",
      asset.sector.moduleSourceRowsBySide.get("allied")),
    macro("EMIT_ENEMY_SECTOR_MODULE_SOURCES",
      asset.sector.moduleSourceRowsBySide.get("enemy")),
    macro("EMIT_ALLIED_SECTOR_SEQUENCE", asset.sector.moduleSequences.get("allied")),
    macro("EMIT_ENEMY_SECTOR_SEQUENCE", asset.sector.moduleSequences.get("enemy")),
    macro("EMIT_ALLIED_ENGINE_OVERLAY_MASKS",
      asset.sector.engineOverlayMasks.get("allied")),
    macro("EMIT_ENEMY_ENGINE_OVERLAY_MASKS",
      asset.sector.engineOverlayMasks.get("enemy")),
    macro("EMIT_ALLIED_PROW_OCCUPANCY_MASKS",
      asset.sector.prowOccupancyMasks.get("allied")),
    macro("EMIT_ENEMY_PROW_OCCUPANCY_MASKS",
      asset.sector.prowOccupancyMasks.get("enemy")),
    macro("EMIT_ALLIED_PROW_COLLISION_BOUNDARIES",
      asset.sector.prowCollisionBoundaries.get("allied")),
    macro("EMIT_ENEMY_PROW_COLLISION_BOUNDARIES",
      asset.sector.prowCollisionBoundaries.get("enemy")),
    macro("EMIT_ENGINE_ANIMATION_FRAMES", engineAnimationBytes),
    macro("EMIT_CAPITAL_EXPLOSION_PHASES", explosion.phaseBytes),
    macro("EMIT_CAPITAL_EXPLOSION_SOUND_FREQUENCY", explosion.runtimeFrequencyBytes),
    macro("EMIT_CAPITAL_EXPLOSION_SOUND_CONTROL", explosion.runtimeControlBytes),
  ];
  return `${lines.join("\n")}\n`;
}
