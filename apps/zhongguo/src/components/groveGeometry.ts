// Geometry of the bamboo grove (BambooGrove.astro): stalks and leaf sprays. GrovePandas.astro reads the same numbers.

// x and width in px from the left of the 160px strip; node = distance between nodes;
// top = where the stalk is cut, minus 60px, so the tops do not end on one line.
export const stalks = [
  { x: 62, width: 13, node: 124, offset: 30, top: 50 },
  { x: 86, width: 11, node: 108, offset: 0, top: 0 },
  { x: 106, width: 16, node: 136, offset: 70, top: 30 },
  { x: 132, width: 12, node: 116, offset: 15, top: 80 },
];

// Leaf spray pattern: three sprays per stalk in each period.
export const leafPeriod = 1400;

export const dark = 'color-mix(in srgb, currentColor 72%, black)';

// One leaf: a narrow blade from (0,0) along +x, length l, width w.
const leaf = (l: number, w: number) =>
  `M0,0 Q${l * 0.35},${-w} ${l},0 Q${l * 0.35},${w * 0.5} 0,0Z`;

const angleOf = (dir: 1 | -1, i: number, seed: number) => (dir === 1 ? 8 + i * 14 + (seed % 7) : 172 - i * 14 - (seed % 7));
const lengthOf = (dir: 1 | -1, i: number, seed: number) => (dir === 1 ? 54 : 46) + ((seed * (i + 3)) % 22);

// A spray: leaves fanning from a node, pointing left or right and drooping.
export function spray(cx: number, cy: number, dir: 1 | -1, seed: number) {
  const leaves = [];
  const count = 4 + (seed % 2);
  for (let i = 0; i < count; i++) {
    const angle = angleOf(dir, i, seed);
    const length = lengthOf(dir, i, seed);
    leaves.push({ d: leaf(length, 5 + (i % 2)), transform: `translate(${cx} ${cy}) rotate(${angle})`, fill: i % 2 ? dark : 'currentColor' });
  }
  return leaves;
}

// The sprays of one pattern period, as BambooGrove draws them.
export const sprayAnchors = stalks.flatMap((stalk, i) =>
  [0, 1, 2].map((k) => ({
    cx: stalk.x + stalk.width / 2,
    cy: 120 + k * 420 + i * 105,
    dir: ((i + k) % 2 ? 1 : -1) as 1 | -1,
    seed: i * 3 + k + 3,
  })),
);

// Points on the flattest leaf of each spray that points into the page, where a panda can rest, for `periods` repeats.
export function leafPerches(periods: number) {
  const perches: { x: number; y: number }[] = [];
  for (let p = 0; p < periods; p++) {
    for (const { cx, cy, dir, seed } of sprayAnchors) {
      if (dir !== -1) continue;
      const a = (angleOf(dir, 0, seed) * Math.PI) / 180;
      const l = lengthOf(dir, 0, seed) * 0.3;
      perches.push({ x: Math.round(cx + Math.cos(a) * l), y: Math.round(p * leafPeriod + cy + Math.sin(a) * l) });
    }
  }
  return perches;
}

// Centre of the second stalk, a middle one, where the hanging panda grips.
export const climbX = stalks[1].x + stalks[1].width / 2;
