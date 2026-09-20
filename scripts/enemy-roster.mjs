import fs from "node:fs";
import path from "node:path";
import { canonicalPlayfield } from "./playfield.mjs";

export const ENEMY_ROSTER_IDS = Object.freeze([
  "INTERCEPTOR",
  "TALON",
  "SCYTHE_BOMBER",
  "TRIDENT_GUNSHIP",
  "WRAITH_SCOUT",
  "HUNTER",
  "LEECH_DRONE",
  "AEGIS_ESCORT",
  "CROWN_INTERCEPTOR",
  "HYDRA_CARRIER",
]);

export const ENEMY_IMPLEMENTED_IDS = Object.freeze([
  "INTERCEPTOR",
  "TALON",
  "SCYTHE_BOMBER",
]);

const WIDTH_MODES = new Map([
  ["NORMAL", { sizeCode: 0x00, hposPerBit: 1 }],
  ["DOUBLE", { sizeCode: 0x01, hposPerBit: 2 }],
  ["QUAD", { sizeCode: 0x03, hposPerBit: 4 }],
]);

const MOVEMENT_PROFILES = new Map([
  ["CURRENT_INTERCEPTOR", 0],
  ["FUTURE_TALON", 1],
  ["FUTURE_SCYTHE", 2],
]);

export const ENEMY_WEAPON_PROFILES = Object.freeze({
  NONE: 0,
  SINGLE_PULSE: 1,
});

const WEAPON_PROFILES = new Map([
  ["NONE", ENEMY_WEAPON_PROFILES.NONE],
  ["SINGLE_PULSE", ENEMY_WEAPON_PROFILES.SINGLE_PULSE],
]);

const FLAG_BITS = new Map([
  ["RELEASE", 0x01],
  ["REVIEW_ONLY", 0x02],
  ["SCANNER", 0x04],
  ["HEAVY", 0x08],
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function byteHex(value) {
  return `$${value.toString(16).padStart(2, "0").toUpperCase()}`;
}

function bytesFromRows(rows, height, name) {
  invariant(Array.isArray(rows) && rows.length === height,
    `${name} must contain exactly ${height} native rows`);
  return rows.map((row, rowIndex) => {
    invariant(typeof row === "string" && /^[01]{8}$/.test(row),
      `${name} row ${rowIndex} must contain eight one-bit PMG pixels`);
    return Number.parseInt(row, 2);
  });
}

function occupiedColumns(bytes) {
  const columns = [];
  for (let column = 0; column < 8; column += 1) {
    if (bytes.some((byte) => (byte & (0x80 >>> column)) !== 0)) columns.push(column);
  }
  return columns;
}

function occupiedArea(bytes) {
  return bytes.reduce((area, byte) => {
    let value = byte;
    let count = 0;
    while (value !== 0) {
      count += value & 1;
      value >>>= 1;
    }
    return area + count;
  }, 0);
}

function connectedComponents(bytes, height) {
  const occupied = new Set();
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      if (bytes[row] & (0x80 >>> column)) occupied.add(`${row},${column}`);
    }
  }
  let components = 0;
  while (occupied.size > 0) {
    components += 1;
    const [first] = occupied;
    const queue = [first];
    occupied.delete(first);
    while (queue.length > 0) {
      const [row, column] = queue.pop().split(",").map(Number);
      for (const [nextRow, nextColumn] of [
        [row - 1, column], [row + 1, column],
        [row, column - 1], [row, column + 1],
      ]) {
        const key = `${nextRow},${nextColumn}`;
        if (occupied.delete(key)) queue.push(key);
      }
    }
  }
  return components;
}

function compileImplementedArchetype(source, index, runtime) {
  invariant(source.id === ENEMY_IMPLEMENTED_IDS[index],
    `Implemented enemy ${index} must be ${ENEMY_IMPLEMENTED_IDS[index]}`);
  invariant(source.implemented === true, `${source.id} must be marked implemented`);
  invariant(Number.isInteger(source.height) && source.height > 0 &&
    source.height <= runtime.frameStride,
  `${source.id} has invalid native frame height`);
  const width = WIDTH_MODES.get(source.hardwareWidth);
  invariant(width, `${source.id} has unknown PMG width ${source.hardwareWidth}`);
  invariant(Array.isArray(source.visibleBits) && source.visibleBits.length === 2,
    `${source.id} must declare its visible bit envelope`);
  const [leftBit, rightBit] = source.visibleBits;
  invariant(Number.isInteger(leftBit) && Number.isInteger(rightBit) &&
    leftBit >= 0 && rightBit < 8 && leftBit <= rightBit,
  `${source.id} has invalid visible bit envelope`);
  invariant(source.frames === runtime.accentFrames,
    `${source.id} must define ${runtime.accentFrames} accent frames`);

  const bodyRows = bytesFromRows(source.body, source.height, `${source.id} body`);
  const bodyColumns = occupiedColumns(bodyRows);
  invariant(bodyColumns.length > 0, `${source.id} body cannot be empty`);
  invariant(bodyColumns[0] === leftBit && bodyColumns.at(-1) === rightBit,
    `${source.id} visibleBits do not match its body mask`);
  invariant(bodyRows.at(-1) === 0,
    `${source.id} requires one explicit cleared tail row for deterministic cleanup`);

  const accentFrames = source.accent.map((frame, frameIndex) => {
    const rows = bytesFromRows(frame, source.height, `${source.id} accent ${frameIndex}`);
    invariant(rows.some(Boolean), `${source.id} accent ${frameIndex} cannot be empty`);
    const envelopeMask = (0xff >>> leftBit) & (0xff << (7 - rightBit));
    rows.forEach((byte, row) => {
      invariant((byte & ~envelopeMask) === 0,
        `${source.id} accent ${frameIndex} row ${row} leaves the visible envelope`);
      invariant(byte === 0 || bodyRows[row] !== 0,
        `${source.id} accent ${frameIndex} row ${row} has no supporting hull mass`);
    });
    return rows;
  });
  const accentRows = accentFrames.map((rows, frameIndex) => {
    const occupied = rows.map((value, row) => value === 0 ? -1 : row).filter((row) => row >= 0);
    invariant(occupied.length === 1,
      `${source.id} accent ${frameIndex} must occupy one bounded PMG scanline`);
    return occupied[0];
  });
  invariant(accentRows.every((row) => row === accentRows[0]),
    `${source.id} scanner phases must share one vertical attachment row`);
  const accentValues = Uint8Array.from(accentFrames.map((rows, index) => rows[accentRows[index]]));
  const projectileSpawnYOffset = bodyRows.findLastIndex((value) => value !== 0) + 1;
  invariant(projectileSpawnYOffset > 0 && projectileSpawnYOffset < source.height,
    `${source.id} projectile origin must follow visible body data and precede its clear tail`);

  const logicalLeft = runtime.corridor.leftHpos;
  const visibleLeftInset = leftBit * width.hposPerBit;
  const visibleWidth = (rightBit - leftBit + 1) * width.hposPerBit;
  const logicalRight = runtime.corridor.rightHposExclusive - visibleWidth;
  const hposLeft = logicalLeft - visibleLeftInset;
  const hposRight = logicalRight - visibleLeftInset;
  invariant(logicalRight >= logicalLeft, `${source.id} does not fit the flight corridor`);
  invariant(hposLeft >= 0 && hposRight <= 255, `${source.id} HPOS bounds overflow`);

  let flags = 0;
  for (const name of source.flags) {
    invariant(FLAG_BITS.has(name), `${source.id} has unknown behaviour flag ${name}`);
    flags |= FLAG_BITS.get(name);
  }
  invariant(Number.isInteger(source.hitPoints) && source.hitPoints > 0 && source.hitPoints <= 255,
    `${source.id} hitPoints must fit one byte`);
  invariant(Number.isInteger(source.score) && source.score >= 0 && source.score <= 99,
    `${source.id} score must be a two-digit value`);
  invariant(MOVEMENT_PROFILES.has(source.movementProfile),
    `${source.id} has unknown movement profile`);
  invariant(WEAPON_PROFILES.has(source.weaponProfile),
    `${source.id} has unknown weapon profile`);

  const paddedBody = Uint8Array.from([
    ...bodyRows,
    ...new Array(runtime.frameStride - source.height).fill(0),
  ]);
  const accentFrameBytes = Uint8Array.from(accentFrames.flatMap((frame) => [
    ...frame,
    ...new Array(runtime.frameStride - source.height).fill(0),
  ]));

  return {
    ...source,
    index,
    sizeCode: width.sizeCode,
    hposPerBit: width.hposPerBit,
    visibleLeftInset,
    visibleWidth,
    logicalBounds: [logicalLeft, logicalRight],
    hposBounds: [hposLeft, hposRight],
    bodyRows: Uint8Array.from(bodyRows),
    bodyBytes: paddedBody,
    accentFrames: accentFrames.map((frame) => Uint8Array.from(frame)),
    accentFrameBytes,
    accentRow: accentRows[0],
    accentValues,
    projectileSpawnYOffset,
    occupiedArea: occupiedArea(bodyRows),
    connectedComponents: connectedComponents(bodyRows, source.height),
    movementProfileId: MOVEMENT_PROFILES.get(source.movementProfile),
    weaponProfileId: WEAPON_PROFILES.get(source.weaponProfile),
    flagsByte: flags,
    scoreBcd: ((Math.floor(source.score / 10) << 4) | (source.score % 10)),
  };
}

export function loadEnemyRosterDefinition(filePath) {
  const definition = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const pursuit = definition.runtime.movementPolicy.interceptorSoftPursuit;
  return {
    ...definition,
    runtime: {
      ...definition.runtime,
      movementPolicy: {
        ...definition.runtime.movementPolicy,
        interceptorSoftPursuit: {
          ...pursuit,
          attackActiveTop: canonicalPlayfield.gameplayTop,
          attackActiveBottomExclusive: canonicalPlayfield.gameplayBottom,
        },
      },
    },
  };
}

export function compileEnemyRoster(definition, rootDirectory) {
  invariant(definition?.formatVersion === 1, "Unsupported enemy-roster formatVersion");
  const runtime = definition.runtime;
  invariant(runtime?.releaseArchetype === "INTERCEPTOR", "Pass 1 release archetype must be INTERCEPTOR");
  invariant(runtime.frameStride === 16, "Enemy PMG frame stride must remain 16 bytes");
  invariant(runtime.accentFrames === 3, "Enemy scanner animation must contain three phases");
  invariant(runtime.animationPhaseFrames === 8,
    "Enemy animation phase must remain eight PAL frames");
  const pursuit = runtime.movementPolicy?.interceptorSoftPursuit;
  invariant(pursuit?.targetSamplingIntervalFrames === 8 && pursuit.deadZoneHpos === 3 &&
    pursuit.horizontalAccelerationHpos === 1 &&
    pursuit.maximumHorizontalVelocityHpos === 1 &&
    pursuit.player_fighterReferenceSpeedHposPerFrame === 2 && pursuit.movementStepHpos === 2 &&
    pursuit.maximumSpeedRatioNumerator === 4 &&
    pursuit.maximumSpeedRatioDenominator === 5 &&
    pursuit.weaveAmplitudeHpos === 4 && pursuit.weavePeriodFrames === 32 &&
    pursuit.attackActiveTop === canonicalPlayfield.gameplayTop &&
    pursuit.attackActiveBottomExclusive === canonicalPlayfield.gameplayBottom,
  "Interceptor soft-pursuit parameters must remain the reviewed bounded profile");
  invariant(runtime.corridor?.leftHpos === 80 && runtime.corridor?.rightHposExclusive === 176,
    "Enemy roster must use the accepted 24-column corridor bounds");
  invariant(runtime.colourPolicy?.bodyRegister === "COLPM1" &&
    runtime.colourPolicy?.accentRegister === "COLPM2",
  "Enemy roster must preserve the accepted COLPM1/COLPM2 ownership");
  invariant(Array.isArray(runtime.colourPolicy.candidates) &&
    runtime.colourPolicy.candidates.length === 3,
  "Enemy roster must define exactly three reviewed body-colour candidates");
  const paletteCandidates = new Map(runtime.colourPolicy.candidates.map(({ id, value }) => [id, value]));
  invariant(paletteCandidates.get("HOSTILE_OXBLOOD") === 0x42 &&
    paletteCandidates.get("HOSTILE_BURGUNDY") === 0x44 &&
    paletteCandidates.get("HOSTILE_SCARLET") === 0x48,
  "Enemy palette candidates must remain Hostile-family $42/$44/$48");
  invariant(runtime.colourPolicy.selected === "HOSTILE_BURGUNDY" &&
    runtime.colourPolicy.bodyValue === paletteCandidates.get(runtime.colourPolicy.selected) &&
    runtime.colourPolicy.accentValue === 0x46,
  "Enemy roster must select Hostile burgundy $44 with a brighter red $46 scanner");
  const pulse = runtime.weaponPolicy?.singlePulse;
  invariant(pulse?.renderer === "ANTIC4_GLYPH_POOL" && pulse.poolSlots === 5 &&
    pulse.activeLimit === 5 && pulse.visiblePulsesPerObject === 2 &&
    pulse.pairGlyphRows?.join(",") === "1,2,5,6",
    "Interceptor burst must keep five one-cell PairShot slots with a five-shot active limit");
  invariant(pulse.burstCount === 5 && pulse.burstIntervalFrames === 15 &&
    JSON.stringify(pulse.postBurstFrames) === JSON.stringify([60, 50, 40]),
  "Interceptor burst count, interval, or Easy/Medium/Hard pauses changed");
  invariant(pulse.speed === 2 && pulse.height === 3 && pulse.widthHpos === 2 &&
    pulse.damage === 10 && pulse.lifetimeFrames === 96 &&
    pulse.colourRegister === "COLPF3" && pulse.colourValue === 0x46,
  "Interceptor tuned speed, geometry, damage, lifetime, or red playfield colour changed");
  invariant(Array.isArray(definition.archetypes) &&
    definition.archetypes.length === ENEMY_ROSTER_IDS.length,
  "Enemy roster must inventory exactly ten identities");

  const inventory = definition.archetypes.map((source, index) => {
    invariant(source.id === ENEMY_ROSTER_IDS[index],
      `Enemy roster entry ${index} must be ${ENEMY_ROSTER_IDS[index]}`);
    invariant(typeof source.reference === "string" && source.reference.length > 0,
      `${source.id} must identify a source reference`);
    invariant(source.reference === source.reference.normalize("NFC"),
      `${source.id} reference path must use Unicode NFC`);
    if (rootDirectory) {
      const referencePath = path.join(rootDirectory, source.reference);
      invariant(fs.existsSync(referencePath), `${source.id} reference is missing: ${source.reference}`);
    }
    invariant(typeof source.role === "string" && typeof source.futureTactics === "string" &&
      typeof source.futureWeapon === "string",
    `${source.id} future role contract is incomplete`);
    if (!source.implemented) {
      for (const forbidden of ["body", "accent", "hardwareWidth", "height", "frames"]) {
        invariant(source[forbidden] === undefined,
          `${source.id} is unimplemented and cannot contain runtime field ${forbidden}`);
      }
      invariant(source.releaseEnabled === false,
        `${source.id} cannot enter release waves before implementation`);
    }
    return source;
  });
  invariant(inventory[0].weaponProfile === "SINGLE_PULSE" &&
    inventory[1].weaponProfile === "NONE" && inventory[2].weaponProfile === "NONE",
  "Only the release Interceptor may use WEAPON_SINGLE_PULSE in pass 1");

  const implemented = inventory.slice(0, ENEMY_IMPLEMENTED_IDS.length)
    .map((source, index) => compileImplementedArchetype(source, index, runtime));
  invariant(inventory.slice(ENEMY_IMPLEMENTED_IDS.length).every(({ implemented }) => !implemented),
    "Only the three pass-1 anchors may have runtime definitions");
  invariant(implemented.filter(({ releaseEnabled }) => releaseEnabled).length === 1 &&
    implemented[0].releaseEnabled,
  "Only INTERCEPTOR may enter normal release waves in pass 1");

  const bodyBytes = Uint8Array.from(implemented.flatMap(({ bodyBytes }) => [...bodyBytes]));
  const accentBytes = Uint8Array.from(implemented.flatMap(({ accentValues }) => [...accentValues]));
  return {
    definition,
    runtime,
    inventory,
    implemented,
    bodyBytes,
    accentBytes,
    runtimeArtBytes: bodyBytes.length + accentBytes.length,
    // Five build-side-only fields remain in the manifest/include but consume
    // no resident bytes until a later behaviour pass actually uses them.
    descriptorBytes: implemented.length * 11,
  };
}

function byteMacro(name, values) {
  return `.macro ${name}\n  .byte ${[...values].map(byteHex).join(",")}\n.endmacro`;
}

export function renderEnemyRosterCa65Include(asset) {
  const implemented = asset.implemented;
  const pursuit = asset.runtime.movementPolicy.interceptorSoftPursuit;
  const lines = [
    "; Generated by scripts/enemy-roster.mjs. Do not edit by hand.",
    ...ENEMY_ROSTER_IDS.map((id, index) => `ENEMY_ARCHETYPE_${id} = ${index}`),
    `ENEMY_ARCHETYPE_COUNT = ${ENEMY_ROSTER_IDS.length}`,
    `ENEMY_IMPLEMENTED_COUNT = ${implemented.length}`,
    `ENEMY_RELEASE_ARCHETYPE = ENEMY_ARCHETYPE_${asset.runtime.releaseArchetype}`,
    `ENEMY_FRAME_STRIDE = ${asset.runtime.frameStride}`,
    `ENEMY_ACCENT_FRAME_COUNT = ${asset.runtime.accentFrames}`,
    `ENEMY_ANIMATION_PHASE_FRAMES = ${asset.runtime.animationPhaseFrames}`,
    `ENEMY_ANIMATION_CYCLE_FRAMES = ${asset.runtime.accentFrames * asset.runtime.animationPhaseFrames}`,
    `INTERCEPTOR_TARGET_SAMPLE_INTERVAL = ${pursuit.targetSamplingIntervalFrames}`,
    `INTERCEPTOR_TARGET_DEAD_ZONE = ${pursuit.deadZoneHpos}`,
    `INTERCEPTOR_HORIZONTAL_ACCELERATION = ${pursuit.horizontalAccelerationHpos}`,
    `INTERCEPTOR_MAX_HORIZONTAL_VELOCITY = ${pursuit.maximumHorizontalVelocityHpos}`,
    `PLAYER_FIGHTER_HORIZONTAL_STEP_HPOS = ${pursuit.player_fighterReferenceSpeedHposPerFrame}`,
    `INTERCEPTOR_HORIZONTAL_STEP_HPOS = ${pursuit.movementStepHpos}`,
    `INTERCEPTOR_SPEED_NUMERATOR = ${pursuit.maximumSpeedRatioNumerator}`,
    `INTERCEPTOR_SPEED_DENOMINATOR = ${pursuit.maximumSpeedRatioDenominator}`,
    `INTERCEPTOR_WEAVE_AMPLITUDE = ${pursuit.weaveAmplitudeHpos}`,
    `INTERCEPTOR_WEAVE_PERIOD_FRAMES = ${pursuit.weavePeriodFrames}`,
    `INTERCEPTOR_ATTACK_ACTIVE_TOP = ${pursuit.attackActiveTop}`,
    `INTERCEPTOR_ATTACK_ACTIVE_BOTTOM = ${pursuit.attackActiveBottomExclusive}`,
    `ENEMY_RELEASE_VISIBLE_WIDTH = ${implemented[0].visibleWidth}`,
    `ENEMY_RELEASE_FRAME_HEIGHT = ${implemented[0].height}`,
    `ENEMY_BODY_COLOR_HOSTILE_OXBLOOD = ${byteHex(asset.runtime.colourPolicy.candidates[0].value)}`,
    `ENEMY_BODY_COLOR_HOSTILE_BURGUNDY = ${byteHex(asset.runtime.colourPolicy.candidates[1].value)}`,
    `ENEMY_BODY_COLOR_HOSTILE_SCARLET = ${byteHex(asset.runtime.colourPolicy.candidates[2].value)}`,
    `ENEMY_BODY_COLOR = ${byteHex(asset.runtime.colourPolicy.bodyValue)}`,
    `ENEMY_SCANNER_COLOR = ${byteHex(asset.runtime.colourPolicy.accentValue)}`,
    `ENEMY_WEAPON_NONE = ${ENEMY_WEAPON_PROFILES.NONE}`,
    `ENEMY_WEAPON_SINGLE_PULSE = ${ENEMY_WEAPON_PROFILES.SINGLE_PULSE}`,
    `ENEMY_PULSE_POOL_SLOTS = ${asset.runtime.weaponPolicy.singlePulse.poolSlots}`,
    `ENEMY_PULSE_ACTIVE_LIMIT = ${asset.runtime.weaponPolicy.singlePulse.activeLimit}`,
    `ENEMY_PULSE_BURST_COUNT = ${asset.runtime.weaponPolicy.singlePulse.burstCount}`,
    `ENEMY_PULSE_BURST_INTERVAL = ${asset.runtime.weaponPolicy.singlePulse.burstIntervalFrames}`,
    `ENEMY_PULSE_POST_BURST_EASY = ${asset.runtime.weaponPolicy.singlePulse.postBurstFrames[0]}`,
    `ENEMY_PULSE_POST_BURST_MEDIUM = ${asset.runtime.weaponPolicy.singlePulse.postBurstFrames[1]}`,
    `ENEMY_PULSE_POST_BURST_HARD = ${asset.runtime.weaponPolicy.singlePulse.postBurstFrames[2]}`,
    `ENEMY_PULSE_SPEED = ${asset.runtime.weaponPolicy.singlePulse.speed}`,
    `ENEMY_PULSE_HEIGHT = ${asset.runtime.weaponPolicy.singlePulse.height}`,
    `ENEMY_PULSE_WIDTH_HPOS = ${asset.runtime.weaponPolicy.singlePulse.widthHpos}`,
    `ENEMY_SINGLE_PULSE_DAMAGE = ${asset.runtime.weaponPolicy.singlePulse.damage}`,
    `ENEMY_PULSE_LIFETIME_FRAMES = ${asset.runtime.weaponPolicy.singlePulse.lifetimeFrames}`,
    `ENEMY_PULSE_COLOR = ${byteHex(asset.runtime.weaponPolicy.singlePulse.colourValue)}`,
    "",
    byteMacro("EMIT_ENEMY_FRAME_HEIGHTS", implemented.map(({ height }) => height)),
    byteMacro("EMIT_ENEMY_SIZE_MODES", implemented.map(({ sizeCode }) => sizeCode)),
    byteMacro("EMIT_ENEMY_VISIBLE_LEFT_INSETS",
      implemented.map(({ visibleLeftInset }) => visibleLeftInset)),
    byteMacro("EMIT_ENEMY_VISIBLE_WIDTHS", implemented.map(({ visibleWidth }) => visibleWidth)),
    byteMacro("EMIT_ENEMY_LOGICAL_X_MINS", implemented.map(({ logicalBounds }) => logicalBounds[0])),
    byteMacro("EMIT_ENEMY_LOGICAL_X_MAXS", implemented.map(({ logicalBounds }) => logicalBounds[1])),
    byteMacro("EMIT_ENEMY_HPOS_MINS", implemented.map(({ hposBounds }) => hposBounds[0])),
    byteMacro("EMIT_ENEMY_HPOS_MAXS", implemented.map(({ hposBounds }) => hposBounds[1])),
    byteMacro("EMIT_ENEMY_BODY_OFFSETS", implemented.map(({ index }) =>
      index * asset.runtime.frameStride)),
    byteMacro("EMIT_ENEMY_ACCENT_ROWS", implemented.map(({ accentRow }) => accentRow)),
    byteMacro("EMIT_ENEMY_ACCENT_OFFSETS", implemented.map(({ index }) =>
      index * asset.runtime.accentFrames)),
    byteMacro("EMIT_ENEMY_FRAME_COUNTS", implemented.map(({ frames }) => frames)),
    byteMacro("EMIT_ENEMY_HIT_POINTS", implemented.map(({ hitPoints }) => hitPoints)),
    byteMacro("EMIT_ENEMY_SCORES", implemented.map(({ scoreBcd }) => scoreBcd)),
    byteMacro("EMIT_ENEMY_MOVEMENT_PROFILES",
      implemented.map(({ movementProfileId }) => movementProfileId)),
    byteMacro("EMIT_ENEMY_WEAPON_PROFILES",
      implemented.map(({ weaponProfileId }) => weaponProfileId)),
    byteMacro("EMIT_ENEMY_PROJECTILE_SPAWN_Y_OFFSETS",
      implemented.map(({ projectileSpawnYOffset }) => projectileSpawnYOffset)),
    byteMacro("EMIT_ENEMY_FLAGS", implemented.map(({ flagsByte }) => flagsByte)),
    byteMacro("EMIT_ENEMY_BODY_DATA", asset.bodyBytes),
    byteMacro("EMIT_ENEMY_ACCENT_DATA", asset.accentBytes),
    "",
  ];
  return `${lines.join("\n")}\n`;
}
