// WCAG 2.2 contrast between two sRGB colours, shared by the contrast tests and scripts/state-check.mjs.
// The constants are the formula's own (https://www.w3.org/TR/WCAG22/#dfn-relative-luminance).
const SRGB = {
  max: 255,
  linearBelow: 0.03928,
  linearSlope: 12.92,
  offset: 0.055,
  scale: 1.055,
  gamma: 2.4,
};
const WEIGHTS = [0.2126, 0.7152, 0.0722];
const FLARE = 0.05;
/** Where each channel of "#rrggbb" starts, two digits each. */
const CHANNELS = [1, 3, 5];

export const hex = (value) => CHANNELS.map((i) => parseInt(value.slice(i, i + 2), 16));

export const luminance = (rgb) =>
  rgb
    .map((channel) => {
      const c = channel / SRGB.max;
      return c <= SRGB.linearBelow
        ? c / SRGB.linearSlope
        : ((c + SRGB.offset) / SRGB.scale) ** SRGB.gamma;
    })
    .reduce((sum, c, index) => sum + c * WEIGHTS[index], 0);

export const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + FLARE) / (lo + FLARE);
};
