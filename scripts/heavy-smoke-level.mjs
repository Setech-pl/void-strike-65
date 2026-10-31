// Host-only override for the existing level-2/sector-5 smoke ATR. Campaign
// source, row/count/spacing and runtime mechanisms are unchanged.
export function heavySmokeLevelSource(source, level, sector) {
  if (level !== 2 || sector !== 5) return source;
  const smoke = structuredClone(source);
  smoke.sectors[5].waves[0].kind = 'armoured';
  return smoke;
}
