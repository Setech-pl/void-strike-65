import fs from "node:fs";
import { canonicalPlayfield } from "./playfield.mjs";

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function integer(value, name, minimum, maximum) {
  invariant(Number.isInteger(value) && value >= minimum && value <= maximum,
    `${name} must be an integer from ${minimum} through ${maximum}`);
  return value;
}

function byte(value) {
  return `$${(value & 0xff).toString(16).padStart(2, "0").toUpperCase()}`;
}

export function loadEntityEffectsDefinition(sourcePath) {
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const definition = {
    ...source,
    coordinateSystem: {
      gameplayTopScanline: canonicalPlayfield.entityTop,
      gameplayBottomExclusive: canonicalPlayfield.gameplayBottom,
      logicalRows: canonicalPlayfield.ringRows,
    },
    weaponPickupRapidFire: {
      ...source.weaponPickupRapidFire,
      spawnTopScanline: canonicalPlayfield.activeImageTop,
      activationTopScanline: canonicalPlayfield.entityTop,
      releaseTopScanline: canonicalPlayfield.gameplayBottom,
    },
  };
  invariant(definition.formatVersion === 1, "Unsupported entity-effects formatVersion");
  const coordinates = definition.coordinateSystem;
  integer(coordinates?.gameplayTopScanline, "coordinateSystem.gameplayTopScanline", 0, 255);
  integer(coordinates?.gameplayBottomExclusive,
    "coordinateSystem.gameplayBottomExclusive", 1, 256);
  integer(coordinates?.logicalRows, "coordinateSystem.logicalRows", 1, 32);
  invariant(coordinates.gameplayTopScanline === 24,
    "Entity gameplay must begin below the divider at scanline 24");
  invariant(coordinates.gameplayBottomExclusive === 240,
    "Entity gameplay must end after scanline 239");
  invariant(coordinates.logicalRows === 27 &&
    coordinates.gameplayBottomExclusive - coordinates.gameplayTopScanline ===
      coordinates.logicalRows * 8,
  "Entity coordinates must describe exactly 27 eight-scanline ring rows");

  const pools = definition.pools;
  invariant(pools?.interactiveSlots === 4, "Interactive pool must contain four slots");
  invariant(pools.interactiveActiveLimit === 2,
    "Debris and the reserved weapon-pickup slot must coexist");
  invariant(pools.effectSlots === 6 && pools.effectActiveLimit === 5,
    "Debris destruction must reserve one core and four fragment effect slots");
  invariant(pools.stateAddress === 0x8000 && pools.stateBytes === 0x100,
    "Entity/effects state must occupy only $8000-$80FF");
  invariant(pools.codeAddress === 0x9100 && pools.codeReservedBytes === 0x0f00,
    "ENTITY_CODE must occupy only $9100-$9FFF");

  const spawn = definition.spawn;
  integer(spawn?.initialDelayFrames, "spawn.initialDelayFrames", 1, 255);
  integer(spawn?.repeatDelayFrames, "spawn.repeatDelayFrames", 1, 255);
  integer(spawn?.rngSeed, "spawn.rngSeed", 1, 255);
  integer(spawn?.corridorFirstColumn, "spawn.corridorFirstColumn", 0, 39);
  integer(spawn?.corridorEndColumnExclusive,
    "spawn.corridorEndColumnExclusive", 1, 40);
  integer(spawn?.safeFirstColumn, "spawn.safeFirstColumn", 0, 39);
  integer(spawn?.safeEndColumnExclusive, "spawn.safeEndColumnExclusive", 1, 40);

  const motion = definition.debrisMotion;
  integer(motion?.verticalStepNumerator,
    "debrisMotion.verticalStepNumerator", 1, 255);
  integer(motion?.verticalStepDenominator,
    "debrisMotion.verticalStepDenominator", 1, 255);
  invariant(motion.verticalStepNumerator === 3 && motion.verticalStepDenominator === 5,
    "Debris vertical movement must retain its deterministic 3/5 world-row cadence");
  integer(motion?.horizontalStepWorldRows,
    "debrisMotion.horizontalStepWorldRows", 1, 255);
  integer(motion?.maximumHorizontalSteps,
    "debrisMotion.maximumHorizontalSteps", 0, 255);
  invariant(Array.isArray(motion?.trajectories) && motion.trajectories.length === 3,
    "Debris motion must define exactly three trajectories");
  const expectedTrajectories = [
    ["straight", 0], ["slight-left", -4], ["slight-right", 4],
  ];
  motion.trajectories.forEach((trajectory, index) => {
    invariant(trajectory?.id === expectedTrajectories[index][0],
      `debrisMotion.trajectories[${index}] has the wrong id`);
    integer(trajectory.vxSignedHpos,
      `debrisMotion.trajectories[${index}].vxSignedHpos`, -128, 127);
    invariant(trajectory.vxSignedHpos === expectedTrajectories[index][1],
      `${trajectory.id} must use ${expectedTrajectories[index][1]} signed HPOS`);
  });
  invariant(Array.isArray(motion.trajectorySelector) &&
    motion.trajectorySelector.length === 4,
  "Two-bit trajectory selector must contain four deterministic entries");
  const trajectoryIds = new Set(motion.trajectories.map(({ id }) => id));
  invariant(motion.trajectorySelector.every((id) => trajectoryIds.has(id)),
    "Trajectory selector references an unknown profile");
  invariant(trajectoryIds.size === new Set(motion.trajectorySelector).size,
    "Trajectory selector must make all three profiles reachable");

  const verticalStepsToDespawn =
    (coordinates.gameplayBottomExclusive - coordinates.gameplayTopScanline) / 8;
  const worldEventsToDespawn = Math.ceil(
    verticalStepsToDespawn * motion.verticalStepDenominator / motion.verticalStepNumerator,
  );
  invariant(motion.maximumHorizontalSteps <=
    Math.floor((worldEventsToDespawn - 1) / motion.horizontalStepWorldRows),
  "Maximum horizontal steps must remain bounded within the complete visible path");
  invariant(spawn.safeFirstColumn ===
    spawn.corridorFirstColumn + motion.maximumHorizontalSteps,
  "Safe spawn left edge must absorb the complete slight-left trajectory");
  invariant(spawn.safeEndColumnExclusive ===
    spawn.corridorEndColumnExclusive - motion.maximumHorizontalSteps - 1,
  "Safe spawn right edge must absorb the complete slight-right trajectory");
  invariant(spawn.safeEndColumnExclusive - spawn.safeFirstColumn === 3,
    "Two-cell debris spawn reduction requires exactly three safe columns");

  const visuals = definition.debrisVisuals;
  invariant(visuals?.tumbleWorldRowsPerPhase === 1,
    "Debris tumbling must toggle on every visible world-row advance");
  invariant(Array.isArray(visuals.variants) && visuals.variants.length === 2,
    "Debris must define exactly two visual variants");
  invariant(visuals.variants.map(({ id }) => id).join(",") ===
    "armour-shard,truss-fragment",
  "Debris variants must retain their stable identities");
  const debrisOccupancies = [];
  for (const [variantIndex, variant] of visuals.variants.entries()) {
    invariant(Array.isArray(variant.phases) && variant.phases.length === 2,
      `debrisVisuals.variants[${variantIndex}] must contain two phases`);
    for (const [phaseIndex, glyphs] of variant.phases.entries()) {
      invariant(Array.isArray(glyphs) && glyphs.length === 2,
        `debrisVisuals.variants[${variantIndex}].phases[${phaseIndex}] must contain two glyphs`);
      const occupiedPixels = [];
      const selectors = [];
      glyphs.forEach((rows, glyphIndex) => {
        invariant(Array.isArray(rows) && rows.length === 8,
          `debrisVisuals variant ${variantIndex} phase ${phaseIndex} glyph ${glyphIndex} must contain eight rows`);
        rows.forEach((row, rowIndex) => integer(row,
          `debrisVisuals.variants[${variantIndex}].phases[${phaseIndex}][${glyphIndex}][${rowIndex}]`,
          0, 255));
        rows.forEach((row, y) => {
          for (let pixel = 0; pixel < 4; pixel += 1) {
            const selector = row >> (6 - pixel * 2) & 3;
            if (selector !== 0) {
              selectors.push(selector);
              const x = glyphIndex * 8 + pixel * 2;
              occupiedPixels.push([x, y], [x + 1, y]);
            }
          }
        });
      });
      const ys = occupiedPixels.map(([, y]) => y);
      invariant(Math.max(...ys) - Math.min(...ys) + 1 >= 6,
        `debrisVisuals variant ${variantIndex} phase ${phaseIndex} must use at least six rows`);
      invariant(glyphs.every((rows) => rows.some((row) => row !== 0)),
        `debrisVisuals variant ${variantIndex} phase ${phaseIndex} must use both glyph cells`);
      invariant(selectors.every((selector) => selector === 1 || selector === 2),
        `debrisVisuals variant ${variantIndex} phase ${phaseIndex} must use only white and steel`);
      invariant(selectors.filter((selector) => selector === 1).length >= 8 &&
        selectors.filter((selector) => selector === 2).length >= 8,
      `debrisVisuals variant ${variantIndex} phase ${phaseIndex} must retain clear white and steel fields`);
      invariant(selectors.length >= 36 && selectors.length <= 44,
        `debrisVisuals variant ${variantIndex} phase ${phaseIndex} must contain 36-44 lit ANTIC pixels`);
      debrisOccupancies.push(selectors.length);
    }
    invariant(JSON.stringify(variant.phases[0]) !== JSON.stringify(variant.phases[1]),
      `debrisVisuals variant ${variantIndex} phases must remain visibly distinct`);
  }
  invariant(Math.max(...debrisOccupancies) - Math.min(...debrisOccupancies) <= 6,
    "Debris phase occupancy spread must not exceed six ANTIC pixels");

  const destruction = definition.debrisDestruction;
  invariant(destruction?.hitFlashFrames === 2,
    "Debris hit flash must last exactly two PAL frames");
  invariant(destruction.coreFrames >= 4 && destruction.coreFrames <= 6,
    "Debris explosion core must last four through six PAL frames");
  invariant(destruction.fragmentFrames >= 28 && destruction.fragmentFrames <= 32,
    "Debris fragments must last twenty-eight through thirty-two PAL frames");
  invariant(destruction.fragmentCount === 4,
    "Debris destruction must emit exactly four fragments");
  integer(destruction.fragmentLocalXSpeedHpos,
    "debrisDestruction.fragmentLocalXSpeedHpos", 1, 8);
  integer(destruction.fragmentLocalYSpeedScanlines,
    "debrisDestruction.fragmentLocalYSpeedScanlines", 1, 8);
  invariant(Array.isArray(destruction.fragmentPhases) &&
    destruction.fragmentPhases.length === 2,
  "Debris fragments must define exactly two visual phases");
  for (const [phaseIndex, rows] of destruction.fragmentPhases.entries()) {
    invariant(Array.isArray(rows) && rows.length === 8,
      `debrisDestruction.fragmentPhases[${phaseIndex}] must contain eight rows`);
    let litPixels = 0;
    for (const [rowIndex, row] of rows.entries()) {
      integer(row, `debrisDestruction.fragmentPhases[${phaseIndex}][${rowIndex}]`, 0, 255);
      for (let shift = 0; shift < 8; shift += 2) {
        const selector = row >> shift & 3;
        if (selector !== 0) {
          invariant(selector === 3,
            `fragment phase ${phaseIndex} must use the yellow/red switchable selector`);
          litPixels += 1;
        }
      }
    }
    invariant(litPixels >= 4 && litPixels <= 7,
      `fragment phase ${phaseIndex} must contain four through seven ANTIC pixels`);
  }

  const pickup = definition.weaponPickupRapidFire;
  invariant(pickup?.slot === 1,
    "Rapid Fire must own the fixed interactive slot one");
  invariant(pickup.qualifiedKillsPerDrop === 3 && pickup.pendingFrames === 30,
    "Rapid Fire must enter pending after three qualified kills for thirty frames");
  invariant(pickup.movementNumerator === 1 && pickup.movementDenominator === 2,
    "Rapid Fire pickup must retain one-half world speed");
  invariant(pickup.fineMotionDenominator === 5 && pickup.verticalPhaseCount === 8 &&
    pickup.maximumFootprintRows === 3,
  "Every pickup must use eight scanline phases in a bounded two-by-three compositor");
  invariant(pickup.spawnTopScanline === 8 &&
    pickup.activationTopScanline === coordinates.gameplayTopScanline &&
    pickup.releaseTopScanline === coordinates.gameplayBottomExclusive,
  "Every pickup must spawn fully above, activate at the playfield top, and release only " +
    "after its top edge leaves the playfield");
  invariant(pickup.widthHpos === 8 && pickup.heightScanlines === 16,
    "Rapid Fire capsule must occupy exactly two-by-two ANTIC 4 cells");
  invariant(Array.isArray(pickup.glyphs) && pickup.glyphs.length === 4 &&
    pickup.glyphs.every((rows) => Array.isArray(rows) && rows.length === 8),
  "Rapid Fire must use exactly four eight-row glyphs for its two-by-two footprint");
  pickup.glyphs.flat().forEach((row, index) =>
    integer(row, `weaponPickupRapidFire.glyphs[${index}]`, 0, 255));
  const selectors = pickup.glyphs.flatMap((rows) => rows.flatMap((row) =>
    [6, 4, 2, 0].map((shift) => row >> shift & 3)));
  invariant(selectors.filter(Boolean).length >= 75 &&
    selectors.includes(0) && selectors.includes(2) && selectors.includes(3) &&
    !selectors.includes(1),
  "Rapid Fire glyphs must use only COLBK cut-outs, steel outline and yellow fill");
  invariant(JSON.stringify(pickup.palette) === JSON.stringify({
    outlineRegister: "COLPF1", outlineValue: 0x84,
    fillRegister: "COLPF2", fillValue: 0x1e,
    letterRegister: "COLBK", letterValue: 0x00,
  }), "Rapid Fire must use the accepted static steel/yellow/black palette");

  const spreadPickup = definition.weaponPickupSpreadShot;
  invariant(Array.isArray(spreadPickup?.glyphs) && spreadPickup.glyphs.length === 4 &&
    spreadPickup.glyphs.every((rows) => Array.isArray(rows) && rows.length === 8),
  "Spread Shot must use exactly four eight-row glyphs for its two-by-two footprint");
  spreadPickup.glyphs.flat().forEach((row, index) =>
    integer(row, `weaponPickupSpreadShot.glyphs[${index}]`, 0, 255));
  const spreadSelectors = spreadPickup.glyphs.flatMap((rows) => rows.flatMap((row) =>
    [6, 4, 2, 0].map((shift) => row >> shift & 3)));
  invariant(spreadSelectors.filter(Boolean).length >= 90 &&
    spreadSelectors.includes(0) && spreadSelectors.includes(2) &&
    spreadSelectors.includes(3) && !spreadSelectors.includes(1),
  "Spread Shot glyphs must use black cut-outs, steel corners and a dense red casing");
  invariant(JSON.stringify(spreadPickup.palette) === JSON.stringify({
    outlineRegister: "COLPF1", outlineValue: 0x84,
    casingRegister: "COLPF3", casingValue: 0x46,
    symbolRegister: "COLBK", symbolValue: 0x00,
  }), "Spread Shot must use the existing static steel/red/black palette");

  const shieldPickup = definition.weaponPickupShield;
  invariant(Array.isArray(shieldPickup?.glyphs) && shieldPickup.glyphs.length === 4 &&
    shieldPickup.glyphs.every((rows) => Array.isArray(rows) && rows.length === 8),
  "Shield must use exactly four eight-row glyphs for its two-by-two footprint");
  shieldPickup.glyphs.flat().forEach((row, index) =>
    integer(row, `weaponPickupShield.glyphs[${index}]`, 0, 255));
  const shieldSelectors = shieldPickup.glyphs.flatMap((rows) => rows.flatMap((row) =>
    [6, 4, 2, 0].map((shift) => row >> shift & 3)));
  invariant(shieldSelectors.filter(Boolean).length >= 75 &&
    shieldSelectors.includes(0) && shieldSelectors.includes(1) &&
    shieldSelectors.includes(2) && !shieldSelectors.includes(3),
  "Shield glyphs must use black cut-outs, white fill and steel outline only");
  invariant(JSON.stringify(shieldPickup.palette) === JSON.stringify({
    outlineRegister: "COLPF1", outlineValue: 0x84,
    fillRegister: "COLPF0", fillValue: 0x0e,
    symbolRegister: "COLBK", symbolValue: 0x00,
  }), "Shield must use the static steel/white/black palette");

  invariant(Array.isArray(definition.archetypes) && definition.archetypes.length === 1,
    "First slice must contain exactly one archetype");
  const archetype = definition.archetypes[0];
  invariant(archetype.id === "neutral-debris" && archetype.type === 1,
    "First archetype must be neutral-debris type 1");
  for (const name of [
    "initialState", "flags", "updateProfile", "renderProfile", "collisionCategory",
    "widthHpos", "heightScanlines", "contactDamageUnits", "movementNumerator",
    "movementDenominator", "lifetime", "hitPoints", "spawnPolicy", "sfxEventId",
  ]) integer(archetype[name], `archetypes[0].${name}`, 0, 255);
  integer(archetype.initialVx, "archetypes[0].initialVx", -128, 127);
  integer(archetype.initialVy, "archetypes[0].initialVy", -128, 127);
  invariant(archetype.widthHpos === 8 && archetype.heightScanlines === 8,
    "First debris must occupy exactly two horizontal ANTIC 4 cells");
  invariant((archetype.flags & 0x02) !== 0,
    "Two-cell debris must set the MULTICELL entity flag");
  invariant((archetype.flags & 0x08) !== 0,
    "Neutral debris must set the SHOOTABLE entity flag");
  invariant(archetype.contactDamageUnits === 1,
    "First debris contact must cause one HULL unit of damage");
  invariant(archetype.hitPoints === 3,
    "Both debris variants must start with exactly three hit points");
  invariant(archetype.initialVx === 0 && archetype.initialVy === 8 &&
    archetype.movementNumerator === motion.verticalStepNumerator &&
    archetype.movementDenominator === motion.verticalStepDenominator &&
    archetype.lifetime === 0,
    "Debris descriptor defaults must retain the 3/5 accumulator origin");
  return definition;
}

export function compileEntityEffects(definition) {
  const archetype = definition.archetypes[0];
  const descriptor = Uint8Array.from([
    archetype.initialState,
    archetype.flags,
    archetype.updateProfile,
    archetype.renderProfile,
    archetype.collisionCategory,
    archetype.widthHpos,
    archetype.heightScanlines,
    archetype.contactDamageUnits,
    archetype.initialVx,
    archetype.initialVy,
    archetype.movementNumerator,
    archetype.movementDenominator,
    archetype.lifetime,
    archetype.hitPoints,
    archetype.spawnPolicy,
    archetype.sfxEventId,
  ]);
  invariant(descriptor.length === 16, "Entity archetype descriptor must remain 16 bytes");
  const glyphs = Uint8Array.from(
    definition.debrisVisuals.variants.flatMap(({ phases }) =>
      phases.flatMap((phase) => phase.flat())),
  );
  invariant(glyphs.length === 64, "Two 2x1 debris variants must compile to eight glyphs");
  const effectGlyphs = Uint8Array.from(definition.debrisDestruction.fragmentPhases.flat());
  invariant(effectGlyphs.length === 16,
    "Two fragment phases must compile to exactly two glyphs");
  const trajectoryVx = Uint8Array.from(definition.debrisMotion.trajectorySelector.map((id) =>
    definition.debrisMotion.trajectories.find((trajectory) => trajectory.id === id).vxSignedHpos));
  const pickupGlyphs = Uint8Array.from(definition.weaponPickupRapidFire.glyphs.flat());
  const spreadPickupGlyphs = Uint8Array.from(definition.weaponPickupSpreadShot.glyphs.flat());
  const shieldPickupGlyphs = Uint8Array.from(definition.weaponPickupShield.glyphs.flat());
  const pickupPhaseBank = Uint8Array.from([
    pickupGlyphs, spreadPickupGlyphs, shieldPickupGlyphs,
  ].flatMap((source) => {
    const phases = [];
    for (let phase = 0; phase < 8; phase += 1) {
      const output = new Uint8Array(48);
      for (let sourceY = 0; sourceY < 16; sourceY += 1) {
        const destinationY = phase + sourceY;
        const destinationRow = Math.floor(destinationY / 8);
        const destinationByte = destinationY & 7;
        for (let column = 0; column < 2; column += 1) {
          const sourceGlyph = (sourceY >= 8 ? 2 : 0) + column;
          output[destinationRow * 16 + column * 8 + destinationByte] =
            source[sourceGlyph * 8 + (sourceY & 7)];
        }
      }
      phases.push(...output);
    }
    return phases;
  }));
  invariant(pickupPhaseBank.length === 3 * 8 * 6 * 8,
    "Pickup phase bank must contain three types, eight phases and six glyphs");
  return Object.freeze({
    ...definition,
    descriptor,
    glyphs,
    effectGlyphs,
    pickupGlyphs,
    spreadPickupGlyphs,
    shieldPickupGlyphs,
    pickupPhaseBank,
    trajectoryVx,
  });
}

export function renderEntityEffectsCa65Include(asset) {
  const { coordinateSystem: coordinates, pools, spawn,
    debrisMotion: motion, debrisVisuals: visuals, debrisDestruction: destruction,
    weaponPickupRapidFire: pickup } = asset;
  return [
    "; Generated from assets/graphics/entity-effects.json by scripts/entity-effects.mjs.",
    "; Do not edit this file by hand.",
    `ENTITY_GAMEPLAY_TOP = ${coordinates.gameplayTopScanline}`,
    `ENTITY_GAMEPLAY_BOTTOM = ${coordinates.gameplayBottomExclusive}`,
    `ENTITY_LOGICAL_ROWS = ${coordinates.logicalRows}`,
    `ENTITY_SLOT_COUNT = ${pools.interactiveSlots}`,
    `ENTITY_ACTIVE_LIMIT = ${pools.interactiveActiveLimit}`,
    `EFFECT_SLOT_COUNT = ${pools.effectSlots}`,
    `EFFECT_ACTIVE_LIMIT = ${pools.effectActiveLimit}`,
    `ENTITY_STATE_ADDRESS = $${pools.stateAddress.toString(16).toUpperCase()}`,
    `ENTITY_STATE_BYTES = $${pools.stateBytes.toString(16).toUpperCase()}`,
    `ENTITY_CODE_ADDRESS = $${pools.codeAddress.toString(16).toUpperCase()}`,
    `ENTITY_CODE_RESERVED_BYTES = $${pools.codeReservedBytes.toString(16).toUpperCase()}`,
    `ENTITY_INITIAL_SPAWN_DELAY = ${spawn.initialDelayFrames}`,
    `ENTITY_REPEAT_SPAWN_DELAY = ${spawn.repeatDelayFrames}`,
    `ENTITY_SHOT_RESPAWN_DELAY = ${spawn.repeatDelayFrames + 1}`,
    `ENTITY_RNG_SEED = $${spawn.rngSeed.toString(16).padStart(2, "0").toUpperCase()}`,
    `ENTITY_CORRIDOR_SOURCE_FIRST_COLUMN = ${spawn.corridorFirstColumn}`,
    `ENTITY_CORRIDOR_SOURCE_END_COLUMN = ${spawn.corridorEndColumnExclusive}`,
    `ENTITY_SAFE_SPAWN_FIRST_COLUMN = ${spawn.safeFirstColumn}`,
    `ENTITY_SAFE_SPAWN_END_COLUMN = ${spawn.safeEndColumnExclusive}`,
    `ENTITY_SAFE_SPAWN_COLUMNS = ${spawn.safeEndColumnExclusive - spawn.safeFirstColumn}`,
    `ENTITY_VERTICAL_STEP_NUMERATOR = ${motion.verticalStepNumerator}`,
    `ENTITY_VERTICAL_STEP_DENOMINATOR = ${motion.verticalStepDenominator}`,
    `ENTITY_HORIZONTAL_STEP_WORLD_ROWS = ${motion.horizontalStepWorldRows}`,
    `ENTITY_MAX_HORIZONTAL_STEPS = ${motion.maximumHorizontalSteps}`,
    `ENTITY_DEBRIS_VARIANT_COUNT = ${visuals.variants.length}`,
    `ENTITY_DEBRIS_PHASE_COUNT = ${visuals.variants[0].phases.length}`,
    "ENTITY_DEBRIS_GLYPHS_PER_PHASE = 2",
    `ENTITY_DEBRIS_GLYPH_COUNT = ${asset.glyphs.length / 8}`,
    `ENTITY_DEBRIS_GLYPH_BYTES = ${asset.glyphs.length}`,
    `EFFECT_FRAGMENT_GLYPH_COUNT = ${asset.effectGlyphs.length / 8}`,
    `EFFECT_FRAGMENT_GLYPH_BYTES = ${asset.effectGlyphs.length}`,
    `ENTITY_EFFECT_GLYPH_BYTES = ${asset.glyphs.length + asset.effectGlyphs.length}`,
    `WEAPON_PICKUP_GLYPH_COUNT = ${asset.pickupGlyphs.length / 8}`,
    `WEAPON_PICKUP_GLYPH_BYTES = ${asset.pickupGlyphs.length}`,
    `WEAPON_PICKUP_SPREAD_GLYPH_COUNT = ${asset.spreadPickupGlyphs.length / 8}`,
    `WEAPON_PICKUP_SPREAD_GLYPH_BYTES = ${asset.spreadPickupGlyphs.length}`,
    `WEAPON_PICKUP_SHIELD_GLYPH_COUNT = ${asset.shieldPickupGlyphs.length / 8}`,
    `WEAPON_PICKUP_SHIELD_GLYPH_BYTES = ${asset.shieldPickupGlyphs.length}`,
    `ENTITY_EFFECT_TOTAL_GLYPH_BYTES = ${asset.glyphs.length + asset.effectGlyphs.length + asset.pickupGlyphs.length + asset.spreadPickupGlyphs.length + asset.shieldPickupGlyphs.length}`,
    "ENTITY_ARCHETYPE_DESCRIPTOR_BYTES = 16",
    "ENTITY_DESC_INITIAL_STATE = 0",
    "ENTITY_DESC_FLAGS = 1",
    "ENTITY_DESC_UPDATE_PROFILE = 2",
    "ENTITY_DESC_RENDER_PROFILE = 3",
    "ENTITY_DESC_COLLISION_CATEGORY = 4",
    "ENTITY_DESC_WIDTH_HPOS = 5",
    "ENTITY_DESC_HEIGHT_SCANLINES = 6",
    "ENTITY_DESC_CONTACT_DAMAGE = 7",
    "ENTITY_DESC_INITIAL_VX = 8",
    "ENTITY_DESC_INITIAL_VY = 9",
    "ENTITY_DESC_MOVEMENT_NUMERATOR = 10",
    "ENTITY_DESC_MOVEMENT_DENOMINATOR = 11",
    "ENTITY_DESC_LIFETIME = 12",
    "ENTITY_DESC_HIT_POINTS = 13",
    "ENTITY_DESC_SPAWN_POLICY = 14",
    "ENTITY_DESC_SFX_EVENT = 15",
    "ENTITY_TYPE_DEBRIS = 1",
    "ENTITY_TYPE_WEAPON_PICKUP = 2",
    "ENTITY_STATE_ACTIVE = 1",
    "WEAPON_PICKUP_STATE_IDLE = 0",
    "WEAPON_PICKUP_STATE_PENDING = 1",
    "WEAPON_PICKUP_STATE_ACTIVE = 2",
    "WEAPON_PICKUP_STATE_RAPID = 3",
    "WEAPON_PICKUP_STATE_SPREAD = 4",
    "WEAPON_PICKUP_STATE_SHIELD = 5",
    "WEAPON_PICKUP_TYPE_RAPID = 0",
    "WEAPON_PICKUP_TYPE_SPREAD = 1",
    "WEAPON_PICKUP_TYPE_SHIELD = 2",
    "WEAPON_PICKUP_TYPE_COUNT = 3",
    "ENTITY_FLAG_WORLD_ATTACHED = $01",
    "ENTITY_FLAG_MULTICELL = $02",
    "ENTITY_FLAG_COLLIDE_PLAYER = $04",
    "ENTITY_FLAG_SHOOTABLE = $08",
    "ENTITY_FLAG_PERSIST_LIFE = $10",
    "ENTITY_FLAG_CLEAR_ON_SECTOR = $20",
    "ENTITY_COLLISION_PLAYER_DAMAGE = 1",
    `ENTITY_DEBRIS_INITIAL_FLAGS = ${byte(asset.archetypes[0].flags)}`,
    `ENTITY_DEBRIS_WIDTH_HPOS = ${asset.archetypes[0].widthHpos}`,
    `ENTITY_DEBRIS_HEIGHT_SCANLINES = ${asset.archetypes[0].heightScanlines}`,
    `ENTITY_DEBRIS_VY = ${asset.archetypes[0].initialVy}`,
    `ENTITY_DEBRIS_HP = ${asset.archetypes[0].hitPoints}`,
    `ENTITY_HIT_FLASH_FRAMES = ${destruction.hitFlashFrames}`,
    `ENTITY_HIT_FLASH_TIMER_LOAD = ${destruction.hitFlashFrames + 1}`,
    `WEAPON_PICKUP_SLOT = ${pickup.slot}`,
    "WEAPON_PICKUP_NEXT_TYPE_SLOT = 2",
    "WEAPON_BOOSTER_SLOT = 2",
    `WEAPON_PICKUP_ACTIVE_MASK = $${(1 << pickup.slot).toString(16).padStart(2, "0").toUpperCase()}`,
    `WEAPON_PICKUP_QUALIFIED_KILLS = ${pickup.qualifiedKillsPerDrop}`,
    `WEAPON_PICKUP_PENDING_FRAMES = ${pickup.pendingFrames}`,
    // The trigger occurs before the entity update and Interceptor effects are
    // materialised one frame later. Two preload ticks preserve thirty complete
    // hidden frames and make the first visible frame follow effect expiry.
    // Collision resolution precedes the entity update in the same active PAL
    // frame. One preload tick is consumed in that partial kill frame and one
    // keeps the capsule hidden until the 30-frame breakup has fully erased.
    `WEAPON_PICKUP_PENDING_TIMER_LOAD = ${pickup.pendingFrames + 2}`,
    `WEAPON_PICKUP_MOVE_NUMERATOR = ${pickup.movementNumerator}`,
    `WEAPON_PICKUP_MOVE_DENOMINATOR = ${pickup.movementDenominator}`,
    `WEAPON_PICKUP_FINE_RATE_DENOMINATOR = ${pickup.fineMotionDenominator}`,
    `WEAPON_PICKUP_VERTICAL_PHASE_COUNT = ${pickup.verticalPhaseCount}`,
    `WEAPON_PICKUP_PHASE_GLYPH_COUNT = ${pickup.maximumFootprintRows * 2}`,
    `WEAPON_PICKUP_SPAWN_TOP = ${pickup.spawnTopScanline}`,
    `WEAPON_PICKUP_ACTIVATION_TOP = ${pickup.activationTopScanline}`,
    `WEAPON_PICKUP_RELEASE_TOP = ${pickup.releaseTopScanline}`,
    `WEAPON_PICKUP_WIDTH_HPOS = ${pickup.widthHpos}`,
    `WEAPON_PICKUP_HEIGHT_SCANLINES = ${pickup.heightScanlines}`,
    "ENTITY_EVENT_WORLD_ROW_ADVANCED = $01",
    "EFFECT_TYPE_DEBRIS_CORE = 1",
    "EFFECT_TYPE_DEBRIS_FRAGMENT = 2",
    "EFFECT_STATE_ACTIVE = 1",
    "EFFECT_FLAG_MULTICELL = $02",
    `EFFECT_DEBRIS_CORE_FRAMES = ${destruction.coreFrames}`,
    `EFFECT_DEBRIS_CORE_TIMER_LOAD = ${destruction.coreFrames + 1}`,
    `EFFECT_DEBRIS_FRAGMENT_FRAMES = ${destruction.fragmentFrames}`,
    `EFFECT_DEBRIS_FRAGMENT_TIMER_LOAD = ${destruction.fragmentFrames + 1}`,
    `EFFECT_DEBRIS_FRAGMENT_COUNT = ${destruction.fragmentCount}`,
    `EFFECT_FRAGMENT_LOCAL_X_SPEED = ${destruction.fragmentLocalXSpeedHpos}`,
    `EFFECT_FRAGMENT_LOCAL_Y_SPEED = ${destruction.fragmentLocalYSpeedScanlines}`,
    "EFFECT_DEBRIS_ACTIVE_MASK = $1F",
    ".macro EMIT_ENTITY_ARCHETYPE_DESCRIPTORS",
    `    .byte ${[...asset.descriptor].map(byte).join(",")}`,
    ".endmacro",
    ".macro EMIT_ENTITY_DEBRIS_GLYPHS",
    `    .byte ${[...asset.glyphs].map(byte).join(",")}`,
    ".endmacro",
    ".macro EMIT_EFFECT_FRAGMENT_GLYPHS",
    `    .byte ${[...asset.effectGlyphs].map(byte).join(",")}`,
    ".endmacro",
    ".macro EMIT_WEAPON_PICKUP_GLYPHS",
    `    .byte ${[...asset.pickupGlyphs].map(byte).join(",")}`,
    ".endmacro",
    ".macro EMIT_WEAPON_PICKUP_SPREAD_GLYPHS",
    `    .byte ${[...asset.spreadPickupGlyphs].map(byte).join(",")}`,
    ".endmacro",
    ".macro EMIT_WEAPON_PICKUP_SHIELD_GLYPHS",
    `    .byte ${[...asset.shieldPickupGlyphs].map(byte).join(",")}`,
    ".endmacro",
    ".macro EMIT_ENTITY_TRAJECTORY_VX",
    `    .byte ${[...asset.trajectoryVx].map(byte).join(",")}`,
    ".endmacro",
    "",
  ].join("\n");
}
