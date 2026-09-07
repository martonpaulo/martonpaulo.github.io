/** Responsive image settings shared by every place a project image renders. */

/** Cards above the fold load eagerly so the first paint carries them. */
const EAGER_CARD_COUNT = 2;

export const isEagerCard = (index: number) => index < EAGER_CARD_COUNT;

export const cardImageWidths = [480, 720, 960, 1280];
export const cardImageSizes = "(min-width: 112rem) 30rem, (min-width: 48rem) 45vw, 90vw";

export const heroImageWidths = [640, 960, 1280, 1600];
export const heroImageSizes = "(min-width: 64rem) 60rem, 92vw";
