import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateBuildDirectory } from "./formats.mjs";
import {
  runtimeArtifactDescriptor,
  runtimeArtifactSet,
  validateRuntimeEvidenceBinding,
} from "./runtime-evidence.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");

try {
  const { manifest } = validateBuildDirectory(rootDirectory);
  if (manifest.buildVariant !== "release" ||
      manifest.runtimeEvidence?.status !== "final-bound") {
    throw new Error("Final verify rejects candidate artifacts without bound runtime evidence");
  }
  const reportPath = path.join(rootDirectory, "docs", "runtime-wall-trace.json");
  const reportBytes = fs.readFileSync(reportPath);
  const report = JSON.parse(reportBytes);
  const artifacts = runtimeArtifactSet({
    boot: fs.readFileSync(path.join(rootDirectory, "dist", "void-strike-65-boot.bin")),
    atr: fs.readFileSync(path.join(rootDirectory, "dist", "void-strike-65.atr")),
  });
  validateRuntimeEvidenceBinding(report, artifacts);
  if (report.gate?.passed !== true) throw new Error("Runtime wall trace failed its current gate");
  const reportDescriptor = runtimeArtifactDescriptor("docs/runtime-wall-trace.json", reportBytes);
  if (manifest.runtimeEvidence.reportSha256 !== reportDescriptor.sha256) {
    throw new Error("Final manifest is not bound to the current runtime wall trace");
  }
  console.log("Void Strike 65 artifacts are internally consistent.");
  console.log(`  payload : ${manifest.payloadBytes} bytes`);
  console.log(`  sectors : ${manifest.bootSectors}`);
  console.log(`  load    : $${manifest.loadAddress.toString(16)}`);
  console.log(`  start   : $${manifest.startAddress.toString(16)}`);
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
