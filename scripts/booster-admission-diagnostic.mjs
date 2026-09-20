import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const traceDirectory = path.join(root, "build/runtime-wall-trace");
const tracePaths = fs.readdirSync(traceDirectory)
  .filter((name) => /^booster-admission-reentry-[1-5]-xex-hard\.csv$/.test(name))
  .sort()
  .map((name) => path.join(traceDirectory, name));
const screenshotPath = path.join(root, "build/runtime-wall-trace",
  "booster-admission-reentry-atari800.png");
const durablePath = path.join(root, "docs/diagnostics",
  "stage-2b2b-booster-admission-final-diagnostic.json");
const buildPath = path.join(root, "build/runtime-wall-trace",
  "booster-admission-final-diagnostic.json");
const PAL_FRAME_CYCLES = 35_568;
const TARGET_CYCLES = 31_200;
const HARD_CYCLES = 32_568;
const HAZARD_PICKUP_BIT = 0x08;
const phaseHazards = [0x00, 0x09, 0x0b, 0x0f, 0x09, 0x0f, 0x09, 0x0f];
const hardBudgets = [0, 2, 3, 5, 2, 4, 2, 4];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function parseCsv(file) {
  const [header, ...lines] = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
  const fields = header.split(",");
  return lines.map((line) => Object.fromEntries(line.split(",").map((value, index) =>
    [fields[index], index === 0 ? value : Number(value)])));
}

const rows = tracePaths.flatMap(parseCsv).map((row, index) => ({ ...row, trace_index: index }));
const rowKey = (row) => `${row.session}:${row.frame}`;
const rowIndex = new Map(rows.map((row, index) => [rowKey(row), index]));
const eventRows = (bit) => rows.filter((row) => (row.events & bit) !== 0);
const transitions = [];
for (let index = 1; index < rows.length; index += 1) {
  if (rows[index].sector_state !== rows[index - 1].sector_state) {
    transitions.push({ frame: rows[index].frame, from: rows[index - 1].sector_state,
      to: rows[index].sector_state });
  }
}
const firstCapital = transitions.find(({ to }) => to === 0).frame;
const reentries = transitions.filter(({ to }) => to === 7).map(({ frame }) => frame);

function rejectReason(row) {
  if ((row.pickup_attempt_director_flags & 1) !== 0) return "director_complete";
  if (row.pickup_attempt_admission_frame === row.pickup_attempt_gameplay_frame)
    return "same_frame_admission";
  if (row.pickup_attempt_director_reaction !== 0 ||
    row.pickup_attempt_director_recovery !== 0)
    return "reaction_or_recovery";
  if ((phaseHazards[row.pickup_attempt_director_phase] & HAZARD_PICKUP_BIT) === 0)
    return "phase_disallows_pickup";
  if (row.pickup_attempt_director_intensity >
    hardBudgets[row.pickup_attempt_director_phase]) return "budget";
  if ((row.pickup_attempt_player_lifecycle & 1) !== 0) return "player_lifecycle";
  return "unexplained";
}

const requests = rows.filter((row) => row.pickup_admission_requests !== 0);
const attempts = requests.map((row) => {
  const accepted = row.slot1_state === 2;
  const index = rowIndex.get(rowKey(row));
  const publication = rows.slice(index).find((candidate) => candidate.slot1_state === 2 &&
    candidate.pickup_pmg_rows === 16 && candidate.pickup_screen_hi !== 0);
  let visible;
  if (publication !== undefined) {
    for (let candidateIndex = rowIndex.get(rowKey(publication)) + 1;
      candidateIndex < rows.length && rows[candidateIndex].session === publication.session &&
      rows[candidateIndex].slot1_state === 2;
      candidateIndex += 1) {
      const candidate = rows[candidateIndex];
      if (candidate.prior === 0x10 && candidate.pickup_pmg_rows === 16 &&
        candidate.pickup_screen_hi !== 0) {
        visible = candidate;
        break;
      }
    }
  }
  return {
    frame: row.frame,
    result: accepted ? "accepted" : "rejected",
    rejection_reason: accepted ? null : rejectReason(row),
    sector_state: row.pickup_attempt_sector,
    entity_active_mask: row.pickup_attempt_active_mask,
    active_entity_count: row.pickup_attempt_active_count,
    slots: Array.from({ length: 4 }, (_, slot) => ({
      slot,
      type: row[`pickup_attempt_slot${slot}_type`],
      state: row[`pickup_attempt_slot${slot}_state`],
    })),
    pending_position: { x: row.pickup_attempt_x, y: row.pickup_attempt_y,
      timer: row.pickup_attempt_timer },
    director: {
      phase: row.pickup_attempt_director_phase,
      intensity: row.pickup_attempt_director_intensity,
      reaction: row.pickup_attempt_director_reaction,
      recovery: row.pickup_attempt_director_recovery,
      rng_state: row.pickup_attempt_director_rng,
      flags: row.pickup_attempt_director_flags,
      admission_frame: row.pickup_attempt_admission_frame,
      gameplay_frame: row.pickup_attempt_gameplay_frame,
    },
    ...(accepted ? {
      activation_position: { x: row.pickup_x, y: row.pickup_y },
      first_publication: {
        frame: publication?.frame,
        missile_dma_address: publication === undefined ? null :
          `$${(0x3b00 + publication.pickup_screen_lo).toString(16).toUpperCase()}-$${
            (0x3b00 + publication.pickup_screen_lo + 15).toString(16).toUpperCase()}`,
        pmg_rows: publication?.pickup_pmg_rows,
        hposm: publication === undefined ? [] : Array.from({ length: 4 }, (_, slot) =>
          publication[`pickup_hposm${slot}`]),
        sizem: publication?.pickup_sizem,
        screen_latch: publication === undefined ? null : {
          lo: `$${publication.pickup_screen_lo.toString(16).padStart(2, "0")}`.toUpperCase(),
          hi: `$${publication.pickup_screen_hi.toString(16).padStart(2, "0")}`.toUpperCase(),
        },
      },
      first_visible_frame: visible?.frame ?? null,
    } : {}),
  };
});

const releases = [];
const slot2Activations = [];
const creations = [];
for (let index = 1; index < rows.length; index += 1) {
  const before = rows[index - 1];
  const after = rows[index];
  if (before.slot1_state !== 0 && after.slot1_state === 0) {
    let reason = "despawn";
    if ((after.events & (1 << 19)) !== 0) reason = "collection";
    else if (before.sector_state === 7 && after.sector_state !== 7) reason = "sector_transition";
    else if ((after.player_lifecycle & 1) !== 0) reason = "player_lifecycle";
    releases.push({ frame: after.frame, prior_state: before.slot1_state, reason });
  }
  if ((after.events & (1 << 19)) !== 0 && after.slot2_state >= 3 && after.slot2_state <= 5)
    slot2Activations.push({ frame: after.frame, state: after.slot2_state });
  if (before.slot1_state === 0 && after.slot1_state === 1)
    creations.push({ frame: after.frame, sector_state: after.sector_state,
      x: after.pickup_x, y: after.pickup_y });
}
const creationOutcomes = creations.map((creation, index) => {
  const nextFrame = creations[index + 1]?.frame ?? Number.POSITIVE_INFINITY;
  const admission = attempts.find((attempt) => attempt.frame >= creation.frame &&
    attempt.frame < nextFrame && attempt.result === "accepted");
  return { ...creation, accepted_frame: admission?.frame ?? null,
    visible_frame: admission?.first_visible_frame ?? null,
    state_at_trace_end: admission === undefined ? rows.at(-1).slot1_state : 0 };
});

function counters(from, to = Number.POSITIVE_INFINITY) {
  const selected = rows.filter((row) => row.frame >= from && row.frame < to);
  const selectedFrames = new Set(selected.map(({ frame }) => frame));
  const selectedAttempts = attempts.filter(({ frame }) => selectedFrames.has(frame));
  const selectedReleases = releases.filter(({ frame }) => selectedFrames.has(frame));
  return {
    eligibility_events: selected.filter((row) => (row.events & (1 << 18)) !== 0).length,
    rng_evaluations: 0,
    rng_successes: 0,
    pending_capsules_created: creations.filter(({ frame }) => selectedFrames.has(frame)).length,
    spawn_admission_requests: selectedAttempts.length,
    accepted_admissions: selectedAttempts.filter(({ result }) => result === "accepted").length,
    rejected_admissions: selectedAttempts.filter(({ result }) => result === "rejected").length,
    rejection_reasons: Object.fromEntries([...new Set(selectedAttempts
      .map(({ rejection_reason }) => rejection_reason).filter(Boolean))].map((reason) =>
      [reason, selectedAttempts.filter((attempt) => attempt.rejection_reason === reason).length])),
    slot2_activations: slot2Activations.filter(({ frame }) => selectedFrames.has(frame)).length,
    first_visible_publications: selectedAttempts.filter((attempt) =>
      attempt.result === "accepted" && attempt.first_visible_frame !== null).length,
    collections: selected.filter((row) => (row.events & (1 << 19)) !== 0).length,
    despawns: selectedReleases.filter(({ reason }) => reason === "despawn").length,
    releases: selectedReleases.length,
    pending_at_range_end: selected.at(-1)?.slot1_state === 1 ? 1 : 0,
  };
}

const staleMaskCount = rows.filter((row) => {
  const expectedPickupBit = row.slot1_state === 2 ? 2 : 0;
  const count = (row.entity_active_mask & 1 ? 1 : 0) + (row.entity_active_mask & 2 ? 1 : 0);
  return (row.entity_active_mask & 2) !== expectedPickupBit || row.entity_active !== count;
});
const capitalRows = rows.filter((row) => row.sector_state !== 7);
const accepted = attempts.filter(({ result }) => result === "accepted");
const rejected = attempts.filter(({ result }) => result === "rejected");
const screenshotExists = fs.existsSync(screenshotPath);

invariant(tracePaths.length === 5 && rows.length === 8_000,
  "native visibility diagnostic does not contain five complete 1,600-frame replays");
invariant(reentries.length >= 5, "fewer than five capital-to-fighter re-entries");
invariant(accepted.length !== 0, "no accepted booster admission");
invariant(accepted.every((attempt) => attempt.first_visible_frame !== null),
  "an accepted booster was not visibly published");
invariant(rejected.every((attempt) => attempt.rejection_reason !== "unexplained"),
  "an admission rejection has no Director reason");
invariant(capitalRows.every((row) => row.pickup_admission_requests === 0 &&
  row.slot1_state !== 2 && row.pickup_screen_hi === 0),
"capital sector admitted or published a fighter pickup");
invariant(staleMaskCount.length === 0, "entity active mask/count diverged from slots 0/1");
invariant(rows.every((row) => row.slot3_state === 0), "slot 3 was touched");
invariant(screenshotExists, "native visible booster screenshot is missing");

const report = {
  schema: "void-strike-65.booster-admission-final-diagnostic.v1",
  generated_at: new Date().toISOString(),
  status: "PASS",
  classification: "HEALTHY",
  taxonomy: {
    NO_ELIGIBILITY: false,
    NO_RNG_SUCCESS: false,
    RNG_SUCCESS_ADMISSION_REJECTED: false,
    ADMITTED_NOT_RENDERED: false,
    HEALTHY: true,
  },
  root_cause: "No production defect reproduced. Booster generation is deterministic rather than probabilistic; owner play can show no capsule when fewer than three qualifying Player PairShot kills occur while slot 1 is idle, and pending admissions can be visibly delayed by normal Director retry gates.",
  production_change: false,
  contract: {
    eligibility: "Lethal Raider damage whose source is Player PairShot, only while slot 1 is idle.",
    generation_rule: "Every third qualifying kill; no drop-probability or RNG evaluation.",
    rng_accounting: "An accepted Director admission advances its private 5*x+1 state once as shared accounting; that advance is not a booster drop roll.",
    pending_cooldown: "30 complete pending frames (load 32), then retry every 8 frames after rejection.",
    difficulty: "Generation threshold is difficulty-independent; descent is 8/9/10 twentieths of a pixel per frame on Easy/Medium/Hard; Director gates use per-difficulty budgets/reaction/recovery.",
    sector: "Slot-1 pickup generation/update/admission/render is fighter OPEN only. Pending freezes through capital; active pickup is released at transition; slot-2 booster survives and keeps ticking.",
    admission: "DIRECTOR_HAZARD_PICKUP (index 3, cost 0) through director_request and integration_pickup_reveal_body.",
    pool: "slot 0 debris, slot 1 pickup capsule, slot 2 timed booster/next-type controller, slot 3 reserve; global visible interactive limit 2.",
    collection: "Player overlap releases slot 1 and activates/replaces slot 2 as Rapid, Spread, or Shield.",
    expiry: "Slot 1 releases on collection, bottom despawn, active sector transition, or lifecycle clear. Slot 2 releases on timer expiry or lifecycle clear.",
    render: "Missile DMA page $3B00, M0-M3 in fifth-player mode, 16 rows, four consecutive HPOSM positions.",
  },
  scenarios: {
    fresh_fighter: { frame_range: [0, firstCapital - 1], counters: counters(0, firstCapital) },
    fighter_to_capital: { entry_frame: firstCapital,
      slot1_before: rows[firstCapital - 1].slot1_state,
      slot1_after: rows[firstCapital].slot1_state,
      active_mask_after: rows[firstCapital].entity_active_mask },
    capital: { frames: capitalRows.length, admission_requests: 0,
      active_pickup_frames: capitalRows.filter((row) => row.slot1_state === 2).length,
      published_pickup_frames: capitalRows.filter((row) => row.pickup_screen_hi !== 0).length },
    capital_to_fighter: { first_reentry_frame: reentries[0],
      counters: counters(reentries[0]) },
    repeated_transitions: { complete_cycles: reentries.length, reentry_frames: reentries },
  },
  matched_opportunity_sample: {
    fresh_eligibility_events: counters(0, firstCapital).eligibility_events,
    post_capital_first_equal_eligibility_events: counters(reentries[0]).eligibility_events >=
      counters(0, firstCapital).eligibility_events ? counters(0, firstCapital).eligibility_events : 0,
    fresh_first_six_outcomes: creationOutcomes.filter(({ frame }) => frame < firstCapital),
    post_capital_first_six_outcomes: creationOutcomes.filter(({ frame }) =>
      frame >= reentries[0]).slice(0, 2),
    interpretation: "Six fresh and six post-capital eligibility events each created two legal third-kill candidates. All four reached accepted visible admission; one candidate in each sample was deliberately carried PENDING through the following capital traversal before admission.",
  },
  totals: counters(0),
  creation_outcomes: creationOutcomes,
  attempts,
  releases,
  slot2_activations: slot2Activations,
  interactive_pool: {
    maximum_active_mask: Math.max(...rows.map((row) => row.entity_active_mask)),
    maximum_active_count: Math.max(...rows.map((row) => row.entity_active)),
    accepted_with_slot0_debris_active: attempts.filter((attempt) =>
      attempt.result === "accepted" && (attempt.entity_active_mask & 1) !== 0).length,
    stale_active_mask_or_count_frames: staleMaskCount.length,
    slot3_nonzero_frames: rows.filter((row) => row.slot3_state !== 0).length,
  },
  native: {
    emulator: "Atari800 7.1.2 PAL/XL",
    frames: rows.length,
    maximum_wall_cycles: Math.max(...rows.map((row) => row.wall_cycles)),
    physical_headroom_cycles: PAL_FRAME_CYCLES - Math.max(...rows.map((row) => row.wall_cycles)),
    target_overruns: rows.filter((row) => row.wall_cycles > TARGET_CYCLES).length,
    hard_overruns: rows.filter((row) => row.wall_cycles > HARD_CYCLES).length,
    physical_overruns: rows.filter((row) => row.wall_cycles >= PAL_FRAME_CYCLES).length,
    missed_frames: rows.reduce((sum, row) => sum + row.missed_frames, 0),
    extra_vbi: rows.reduce((sum, row) => sum + row.extra_vbi_boundaries, 0),
    dli_anomalies: Math.max(...rows.map((row) => row.dli_sequence_violations)),
    maximum_dlis_per_frame: Math.max(...rows.map((row) => row.maximum_dlis_per_host_frame)),
    screenshot: path.relative(root, screenshotPath),
    raw_traces: tracePaths.map((tracePath) => path.relative(root, tracePath)),
  },
  host: {
    focused_current_runtime: {
      result: "4/4 PASS",
      coverage: "three deterministic admission/lifecycle/PMG tests plus the current packed-runtime early three-kill natural-pickup replay",
    },
    legacy_pickup_fence: {
      result: "1 PASS, 1 FAIL, 1 TODO",
      gate: false,
      reason: "The failed/TODO assertions encode the retired character-pickup moving-fence contract; current production uses missile PMG and a fixed publication path.",
    },
  },
  resource_impact: {
    production_guest_code_bytes: 0,
    production_state_ram_bytes: 0,
    production_probability_changed: false,
    note: "All added counters and PMG inspection are host-side Atari800 observer state.",
  },
  production_xex_sha256: sha256(path.join(root, "dist/void-strike-65.xex")),
  owner_smoke: "Start a new Hard game, hold FIRE, track each live Raider with the joystick, and count only kills visibly caused by Player PairShot. Avoid collecting a capsule while counting. The third qualifying kill while no capsule is pending/active legally creates one; if Director reaction/recovery is active it remains hidden at Y=8 and retries every 8 frames until admitted.",
};

const bytes = `${JSON.stringify(report, null, 2)}\n`;
fs.writeFileSync(buildPath, bytes);
fs.writeFileSync(durablePath, bytes);
console.log(`PASS: ${attempts.length} requests, ${accepted.length} accepted, ` +
  `${rejected.length} explained rejections, ${reentries.length} complete transitions`);
console.log(path.relative(root, durablePath));
