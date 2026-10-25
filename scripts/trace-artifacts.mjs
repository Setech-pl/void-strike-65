// Where a wall-trace run reads its build and writes its traces.
//
// A default run reads dist/ and build/ and writes build/runtime-wall-trace/;
// its full form is what docs/runtime-wall-trace.json is made of. A debug-route
// build (docs/plans/director-4.6.md §7, `--level=N[:sector=M]`) lives whole in
// build/level-N-sM/, and `--artifacts=build/level-N-sM` points a FOCUSED run
// at it: inputs from that directory, output to its own runtime-wall-trace/,
// and nothing that writes docs/. Such a run is diagnostic only and is never
// release evidence (roadmap 4.6 step 4, phase 0).
import path from "node:path";

// M5b-S4b (owner decision Q10): the laser fixture's debug-route builds too.
// S5-1 (plan s5-boss-regions §5): and the boss-region routes.
// feat/boss-r1-tuning: and the boss comparison variants' routes.
// feat/boss-escort-flow: and the escort variants' routes.
// M6: and the VOID LANCE's comparison routes (journal §BG: the readiness
// indicator; stage 1b's comparisons are gone since the owner's pick, journal §BL).
const DEBUG_ROUTE_VARIANT = /^(?:boss-variant-[a-z0-9]+-|escort-variant-[a-z0-9]+-|field-variant-[ab]-)?(?:laser-fixture-[24]-|laser-tier-[124]-)?(?:boss-region-[2-4]-)?level-\d+-s\d+$/;
// The flags a diagnostic run may carry. Every other mode either writes docs/
// (boot smoke, menu raster, capital/player collision, the full run) or reuses
// a default-build trace.
// L2 variant aliases and --reuse-existing-traces are diagnostic-only;
// these allowances never qualify release evidence.
const DIAGNOSTIC_FLAGS = ["--artifacts=", "--only-session=", "--atari800-source=",
  "--prepare", "--smoke-frames=", "--smoke-difficulty=", "--active-frames=",
  "--force-overlay-restore", "--hit-trace", "--reuse-existing-traces"];

export function traceArtifactLayout(rootDirectory, artifacts) {
  if (artifacts === undefined) {
    return {
      variant: null,
      distDirectory: path.join(rootDirectory, "dist"),
      inputDirectory: path.join(rootDirectory, "build"),
      outputDirectory: path.join(rootDirectory, "build", "runtime-wall-trace"),
    };
  }
  const directory = path.resolve(rootDirectory, artifacts);
  const variant = path.basename(directory);
  if (path.dirname(directory) !== path.join(rootDirectory, "build") ||
      !(DEBUG_ROUTE_VARIANT.test(variant) || variant === 'l2-capital-960' || variant === 'l2-main-control')) {
    throw new Error(`--artifacts=${artifacts} is not a debug-route build; ` +
      "it must name build/level-N-sM (node scripts/build.mjs --level=N[:sector=M])");
  }
  return {
    variant,
    distDirectory: directory,
    inputDirectory: directory,
    outputDirectory: path.join(directory, "runtime-wall-trace"),
  };
}

export function assertDiagnosticRun(layout, manifest, argv) {
  if (layout.variant === null) return;
  if (manifest.buildVariant !== layout.variant && !(layout.variant === 'l2-main-control' && manifest.buildVariant === 'level-1-s1' && !manifest.l2)) {
    throw new Error(`the manifest in build/${layout.variant}/ names ` +
      `${JSON.stringify(manifest.buildVariant)}, not ${layout.variant}`);
  }
  if (!argv.some((argument) => argument.startsWith("--only-session="))) {
    throw new Error("a debug-route run must be focused: pass --only-session=<id>");
  }
  // Reuse is an L2 diagnostic allowance, never a general debug-route mode.
  // Keep the ordinary route assertion that forbids it; L2 replays are labelled.
  if(argv.includes("--reuse-existing-traces") &&
     !(layout.variant==='l2-capital-960'||layout.variant==='l2-main-control'||
       (manifest.l2&&argv.some(a=>a.startsWith('--only-session=l2-')))))
    throw new Error('--reuse-existing-traces is not allowed outside L2 diagnostic runs');
  for (const argument of argv.filter((value) => value.startsWith("--"))) {
    if (!DIAGNOSTIC_FLAGS.some((flag) => flag.endsWith("=")
      ? argument.startsWith(flag) : argument === flag)) {
      throw new Error(`${argument} is not allowed on a debug-route run`);
    }
  }
}
