// The README's PAL timing chart (docs/plans/showcase-atr.md §3.2).
//
//   npm run showcase:chart
//
// Reads docs/media/timing-history.json, checks every value against the
// committed file it cites (git show <commit>:<path>), and writes
// docs/media/showcase/timing-history.svg. Two panels share the milestone axis,
// one measure each — never a second y-scale. Output is deterministic: the same
// data gives the same bytes.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
export const CHART_DATA_PATH = "docs/media/timing-history.json";
export const CHART_PATH = "docs/media/showcase/timing-history.svg";
const manifestPath = path.join(rootDirectory, "docs", "media", "manifest.json");

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const formatCycles = (value) => value.toLocaleString("en-US");

function committedFile(commit, filePath) {
  const result = spawnSync("git", ["show", `${commit}:${filePath}`], {
    cwd: rootDirectory, encoding: "utf8", maxBuffer: 256 * 1024 * 1024,
  });
  invariant(result.status === 0, `git show ${commit}:${filePath} failed: ${result.stderr}`);
  return result.stdout;
}

// Every value must be found in its source as committed; nothing is drawn
// from a figure the repository does not hold.
export function verifySources(data, { read = committedFile } = {}) {
  const check = (where, value, source) => {
    invariant(source && typeof source === "object", `${where}: no source`);
    const text = read(source.commit, source.path);
    if (source.kind === "trace") {
      const found = source.json_path.split(".").reduce((node, key) => node?.[key], JSON.parse(text));
      invariant(found === value,
        `${where}: ${source.path}@${source.commit} ${source.json_path} is ${found}, not ${value}`);
    } else {
      invariant(source.kind === "status", `${where}: unknown source kind ${source.kind}`);
      invariant(text.includes(source.quote),
        `${where}: the quote is not in ${source.path}@${source.commit}`);
      invariant(source.quote.includes(formatCycles(value)),
        `${where}: the quote does not contain ${formatCycles(value)}`);
    }
  };
  for (const [name, threshold] of Object.entries(data.thresholds)) {
    check(`threshold ${name}`, threshold.value, threshold.source);
  }
  for (const point of data.points) {
    for (const measure of ["fence_margin", "dma_on_max"]) {
      if (point[measure] !== null) check(`${point.label} ${measure}`, point[measure].value, point[measure].source);
    }
  }
}

const escapeXml = (text) => String(text)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");

export function renderChart(data) {
  const width = 960;
  const left = 132;
  const right = 24;
  const plotWidth = width - left - right;
  const count = data.points.length;
  const x = (index) => left + plotWidth * (index + 0.5) / count;
  const releases = data.points.map((point, index) => ({ point, index }))
    .filter(({ point }) => point.release !== undefined);
  const out = [];

  const panel = ({ top, height, measure, title, note, minimum, maximum, step, lines, better }) => {
    const y = (value) => top + height - (value - minimum) / (maximum - minimum) * height;
    out.push(`<text class="panel-title" x="${left}" y="${top - 14}">${escapeXml(title)}</text>`);
    out.push(`<text class="note" x="${width - right}" y="${top - 14}" text-anchor="end">${escapeXml(note)}</text>`);
    for (let value = minimum; value <= maximum; value += step) {
      out.push(`<line class="grid" x1="${left}" x2="${width - right}" y1="${y(value)}" y2="${y(value)}"/>`);
      out.push(`<text class="tick" x="${left - 8}" y="${y(value) + 4}" text-anchor="end">${formatCycles(value)}</text>`);
    }
    for (const { value, label, kind } of lines) {
      out.push(`<line class="threshold ${kind}" x1="${left}" x2="${width - right}" y1="${y(value)}" y2="${y(value)}"/>`);
      out.push(`<text class="threshold-label" x="${left + 6}" y="${y(value) - 5}">${escapeXml(label)}</text>`);
    }
    const present = data.points.map((point, index) => ({ point, index }))
      .filter(({ point }) => point[measure] !== null);
    const path = present.map(({ point, index }, order) =>
      `${order === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point[measure].value).toFixed(1)}`).join(" ");
    out.push(`<path class="series" d="${path}"/>`);
    // Direct labels on the releases, the extremes and the last point only; a
    // label that would repeat its labelled neighbour's value is dropped.
    const values = present.map(({ point }) => point[measure].value);
    const valueAt = (index) => data.points[index][measure]?.value;
    const labelled = new Set(releases.map(({ index }) => index).filter((index) => valueAt(index) !== undefined));
    for (const index of [present[values.indexOf(Math.max(...values))].index,
      present[values.indexOf(Math.min(...values))].index, present.at(-1).index]) {
      const repeats = [index - 1, index + 1].some((neighbour) =>
        labelled.has(neighbour) && valueAt(neighbour) === valueAt(index));
      if (!repeats) labelled.add(index);
    }
    const extreme = better === "low" ? Math.max(...values) : Math.min(...values);
    for (const { point, index } of present) {
      const value = point[measure].value;
      const source = point[measure].source;
      out.push(`<circle class="marker" cx="${x(index).toFixed(1)}" cy="${y(value).toFixed(1)}" r="4.5">` +
        `<title>${escapeXml(`${point.date} ${point.label} (${point.commit}): ${formatCycles(value)} cycles — ` +
        `${source.path}@${source.commit}`)}</title></circle>`);
      if (labelled.has(index)) {
        // Labels sit on the safe side of the line, the worst point's on the other.
        const below = (better === "low") !== (value === extreme);
        out.push(`<text class="value" x="${x(index).toFixed(1)}" y="${(y(value) + (below ? 18 : -10)).toFixed(1)}" ` +
          `text-anchor="middle">${formatCycles(value)}</text>`);
      }
    }
  };

  const fenceTop = 124;
  const fenceHeight = 170;
  const dmaTop = fenceTop + fenceHeight + 70;
  const dmaHeight = 170;
  const axisY = dmaTop + dmaHeight;
  const height = axisY + 190;

  for (const { index } of releases) {
    out.push(`<rect class="release-band" x="${(x(index) - plotWidth / count / 2).toFixed(1)}" y="${fenceTop - 6}" ` +
      `width="${(plotWidth / count).toFixed(1)}" height="${axisY - fenceTop + 6}"/>`);
  }
  panel({
    top: fenceTop, height: fenceHeight, measure: "fence_margin", better: "high",
    title: "Worst line-238 fence margin", note: "cycles of slack in the worst frame — higher is safer",
    minimum: 0, maximum: 3500, step: 500,
    lines: [{ value: data.thresholds.fence_margin_go.value, label: data.thresholds.fence_margin_go.label, kind: "go" }],
  });
  panel({
    top: dmaTop, height: dmaHeight, measure: "dma_on_max", better: "low",
    title: "DMA-on maximum", note: "cycles in the heaviest traced frame — lower is safer",
    minimum: 30800, maximum: 32800, step: 400,
    lines: [
      { value: data.thresholds.dma_on_target.value, label: data.thresholds.dma_on_target.label, kind: "target" },
      { value: data.thresholds.dma_on_hard_gate.value, label: data.thresholds.dma_on_hard_gate.label, kind: "hard" },
    ],
  });
  data.points.forEach((point, index) => {
    const anchorX = x(index).toFixed(1);
    out.push(`<line class="axis" x1="${anchorX}" x2="${anchorX}" y1="${axisY}" y2="${axisY + 5}"/>`);
    out.push(`<text class="${point.release ? "release" : "tick"}" transform="translate(${anchorX},${axisY + 18}) rotate(-35)" ` +
      `text-anchor="end">${escapeXml(point.label)} <tspan class="date">${escapeXml(point.date.slice(5))}</tspan></text>`);
  });
  out.push(`<line class="axis" x1="${left}" x2="${width - right}" y1="${axisY}" y2="${axisY}"/>`);

  const style = `
    .root { --surface: #fcfcfb; --ink: #0b0b0b; --ink-2: #52514e; --ink-3: #7a7974; --grid: #e6e5e0;
      --series: #2a78d6; --band: #2a78d6; }
    @media (prefers-color-scheme: dark) {
      .root { --surface: #1a1a19; --ink: #ffffff; --ink-2: #c3c2b7; --ink-3: #96958c; --grid: #34342f;
        --series: #3987e5; --band: #3987e5; }
    }
    text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
    .surface { fill: var(--surface); }
    .title { fill: var(--ink); font-size: 20px; font-weight: 600; }
    .subtitle, .note, .date { fill: var(--ink-2); font-size: 12px; }
    .panel-title { fill: var(--ink); font-size: 14px; font-weight: 600; }
    .tick { fill: var(--ink-2); font-size: 11.5px; }
    .release { fill: var(--ink); font-size: 12px; font-weight: 600; }
    .value { fill: var(--ink); font-size: 12px; font-weight: 600; }
    .grid { stroke: var(--grid); stroke-width: 1; }
    .axis { stroke: var(--ink-3); stroke-width: 1; }
    .threshold { stroke: var(--ink-2); stroke-width: 1.5; }
    .threshold.go, .threshold.target { stroke-dasharray: 6 4; }
    .threshold-label { fill: var(--ink-2); font-size: 11.5px; }
    .series { fill: none; stroke: var(--series); stroke-width: 2; stroke-linejoin: round; }
    .marker { fill: var(--series); stroke: var(--surface); stroke-width: 2; }
    .release-band { fill: var(--band); fill-opacity: 0.08; }`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" class="root" width="${width}" height="${height}" ` +
      `viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title chart-desc">`,
    `<title id="chart-title">VOID STRIKE 65 — PAL frame budget across releases</title>`,
    `<desc id="chart-desc">${escapeXml(data.points.map((point) =>
      `${point.date} ${point.label}: fence margin ${point.fence_margin ? formatCycles(point.fence_margin.value) : "n/a"}, ` +
      `DMA-on maximum ${point.dma_on_max ? formatCycles(point.dma_on_max.value) : "n/a"}`).join("; "))}. ` +
      `Data and sources: ${CHART_DATA_PATH}.</desc>`,
    `<style>${style}\n</style>`,
    `<rect class="surface" width="${width}" height="${height}" rx="8"/>`,
    `<text class="title" x="${left}" y="38">PAL frame budget across releases</text>`,
    `<text class="subtitle" x="${left}" y="60">Atari 65XE PAL, measured in the instrumented Atari800 on the packed build. ` +
      `Shaded columns are releases.</text>`,
    `<text class="subtitle" x="${left}" y="78">Every point is cited in ${CHART_DATA_PATH}.</text>`,
    ...out,
    "</svg>",
    "",
  ].join("\n");
}

export function generateChart({ verify = true } = {}) {
  const data = JSON.parse(fs.readFileSync(path.join(rootDirectory, CHART_DATA_PATH), "utf8"));
  if (verify) verifySources(data);
  const svg = Buffer.from(renderChart(data), "utf8");
  const outputPath = path.join(rootDirectory, CHART_PATH);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, svg);
  const dataBytes = fs.readFileSync(path.join(rootDirectory, CHART_DATA_PATH));
  const entry = {
    path: CHART_PATH,
    description: "Worst line-238 fence margin and DMA-on maximum at releases and key merges, " +
      "against GO 500, the 31,200 target and the 32,568 hard gate",
    generatedBy: "scripts/showcase-timing-chart.mjs",
    data: { path: CHART_DATA_PATH, sha256: sha256(dataBytes) },
    points: data.points.length,
    bytes: svg.length,
    sha256: sha256(svg),
  };
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.charts = [entry];
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return entry;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const entry = generateChart();
  console.log(`Timing chart: ${entry.path} (${entry.points} points, every source verified, ${entry.bytes} B)`);
}
