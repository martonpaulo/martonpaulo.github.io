/** Responsive image settings shared by every place a project image renders. */

/** Cards above the fold load eagerly so the first paint carries them. */
const EAGER_CARD_COUNT = 2;

export const isEagerCard = (index: number) => index < EAGER_CARD_COUNT;

/** Widths cover 1x to 3x screens for a card that is about 30rem wide at most. */
export const cardImageWidths = [640, 960, 1280, 1600, 2000];
export const cardImageSizes = "(min-width: 112rem) 24rem, (min-width: 48rem) 45vw, 92vw";

/** Screenshots carry text; anything below this quality shows as smearing. */
export const imageQuality = 92;

export const heroImageWidths = [640, 960, 1280, 1600];
export const heroImageSizes = "(min-width: 64rem) 60rem, 92vw";
