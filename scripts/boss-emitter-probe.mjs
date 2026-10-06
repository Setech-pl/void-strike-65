// M5b-S4b.2 (owner smoke findings, 2026-10-06): the emitter art probe - a
// review-variant transform of region 1's draft for `node scripts/build.mjs
// --emitter-art=A|B|C`, never the default build.
//
// Region 1's charset is full (1,024 B with its look tail; 30 B free): a full
// candidate emitter (its own housing and core, 3 new staged cells) is 42 B
// over, 18 B over even with the plates' damage looks shared. So the probe
// keeps today's housing and puts the candidate's weapon core into the
// emitter's two bottom-middle cells (2 new staged cells), and gives every
// plate cell one common cracked and one common broken look (plate-a's cell
// (11, 4)) to make the room: 115 codes, 1,018 of 1,024 B.
//
// Core art: 8 x 8 draft pixels (the two cells), '.' background, L COLPF0,
// G COLPF1, A colour 3 in the pf2 bank (amber), B colour 3 in the pf3 bank.

const CODE = { ".": 0, L: 1, G: 2, A: 3, B: 4 };

export const EMITTER_PROBE_CORES = Object.freeze({
  A: Object.freeze({ name: "lens projector",
    core: ["LGGGGGGL", ".LAAAAL.", ".LAAAAL.", "..LAAL..", "..LAAL..", "...AA...", "...AA...", "........"] }),
  B: Object.freeze({ name: "twin-prong focuser",
    core: ["LGL..LGL", "LGL..LGL", ".LG..GL.", ".LG..GL.", "..L..L..", "..A..A..", "........", "........"] }),
  C: Object.freeze({ name: "recessed aperture, glowing core",
    core: ["LGGGGGGL", "LG....GL", "LG.AA.GL", "LG.AA.GL", "LG....GL", ".LGGGGL.", "..LLLL..", "........"] }),
});

// Cracked (1) and broken (2), cell-local so the two core cells keep their own looks.
function damaged(grid, level) {
  return grid.map((row, y) => row.map((p, c) => {
    const x = c % 4;
    if (level === 1) return x === (y >> 1) && p !== 0 ? 0 : p;
    return (x + y) % 2 === 0 || y >= 6 ? 0 : p;
  }));
}

export const EMITTER_PROBE_PLATE_LOOK = Object.freeze({ column: 11, row: 4 });   // plate-a

// S4b.3 (owner decision 3, 2026-10-06): the emitter one row taller, its bottom
// level with the lower turrets' (gun-2, gun-4: rows 2-3). The added row is the
// housing row repeated (no new glyphs); the bottom row - the core - moves down
// one row into the recess below it (empty, decision O); plate-d stays below.
export const EMITTER_PROBE_EXTRA_ROWS = 1;

export function emitterProbeDraft(draft, key) {
  const candidate = EMITTER_PROBE_CORES[key];
  if (candidate === undefined) throw new Error(`no emitter probe ${key}`);
  const source = draft.layout.modules.find((module) => module.kind === "emitter" && module.slot === 1);
  const emitter = { ...source, height: source.height + EMITTER_PROBE_EXTRA_ROWS };
  const core = candidate.core.map((row) => [...row].map((ch) => CODE[ch]));
  const looks = { band: core, open: core, cracked: damaged(core, 1), broken: damaged(core, 2) };
  const plates = draft.layout.modules.filter((module) => module.kind === "armour");
  const images = { ...draft.images };
  for (const [name, image] of Object.entries(draft.images)) {
    if (name === "extras") continue;
    const indices = Uint8Array.from(image.indices);
    // Taller: the old bottom row moves down, the housing row fills the gap.
    const cells = (fromRow, toRow) => {
      for (let y = 0; y < 8; y += 1) {
        const from = (fromRow * 8 + y) * image.width + source.x * 4;
        indices.set(image.indices.subarray(from, from + source.width * 4), (toRow * 8 + y) * image.width + source.x * 4);
      }
    };
    cells(source.row + source.height - 1, emitter.row + emitter.height - 1);
    for (let r = source.row + 1; r < emitter.row + emitter.height - 1; r += 1) cells(source.row, r);
    // The candidate core: the emitter's bottom row, its two middle cells.
    const top = (emitter.row + emitter.height - 1) * 8, left = (emitter.x + 1) * 4;
    looks[name].forEach((row, y) => row.forEach((p, x) => { indices[(top + y) * image.width + left + x] = p; }));
    // The plates' common damage looks.
    if (name === "cracked" || name === "broken") {
      const { column, row } = EMITTER_PROBE_PLATE_LOOK;
      const source = (y, x) => image.indices[(row * 8 + y) * image.width + column * 4 + x];
      for (const plate of plates) {
        for (let r = plate.row; r < plate.row + plate.height; r += 1) {
          for (let c = plate.x; c < plate.x + plate.width; c += 1) {
            for (let y = 0; y < 8; y += 1) {
              for (let x = 0; x < 4; x += 1) indices[(r * 8 + y) * image.width + c * 4 + x] = source(y, x);
            }
          }
        }
      }
    }
    images[name] = { ...image, indices };
  }
  const modules = draft.layout.modules.map((module) => (module === source ? { ...module, height: emitter.height } : module));
  return { ...draft, images, layout: { ...draft.layout, modules, name: `${draft.layout.name} (emitter probe ${key})` } };
}
