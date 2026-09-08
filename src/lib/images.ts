/** Responsive image settings shared by every place a project image renders. */
import type { Project } from "./projects";

/** Cards above the fold load eagerly so the first paint carries them. */
const EAGER_CARD_COUNT = 2;

export const isEagerCard = (index: number) => index < EAGER_CARD_COUNT;

/** Widths cover 1x to 3x screens for a card that is about 30rem wide at most. */
export const cardImageWidths = [640, 960, 1280, 1600, 2000];

export type CardImageFit = NonNullable<Project["image"]>["fit"];

// What a card image actually measures, mirrored from the CSS that sizes it.
// The container caps at --container below ultrawide and --container-wide from
// it; the grid runs one, two and three columns with a --space-4 gap; the card
// pads --space-4 on each side. The decisions live in tokens.scss,
// _breakpoints.scss, ProjectGrid.scss and ProjectCard.scss — these strings only
// describe what those produce, so the browser stops guessing from the viewport.
const CARD_PADDING = "2rem";
const CARD_PADDING_BOTH = "4rem";
const ICON_RATIO = 0.45;
const ICON_MIN = "8rem";
const ICON_MAX = "14rem";

/** The card's own width at each column count. */
const cardWidths = {
  ultrawide: "((96rem - 4rem) / 3)",
  tablet: "min(50vw - 2rem, 31rem)",
  phone: "92vw",
} as const;

/** How much of that width each kind of artwork occupies. */
const artWidth: Record<CardImageFit, (card: string) => string> = {
  // A screenshot's negative right margin gives one padding inset back.
  cover: (card) => `calc(${card} - ${CARD_PADDING})`,
  object: (card) => `calc(${card} - ${CARD_PADDING_BOTH})`,
  // An icon is --card-icon-size: a share of the box, floored and capped.
  contain: (card) =>
    `clamp(${ICON_MIN}, calc((${card} - ${CARD_PADDING_BOTH}) * ${ICON_RATIO}), ${ICON_MAX})`,
};

/** The `sizes` hint for one card image, which differs by how the art is fitted. */
export function cardImageSizes(fit: CardImageFit): string {
  const width = artWidth[fit];
  return [
    `(min-width: 112rem) ${width(cardWidths.ultrawide)}`,
    `(min-width: 48rem) ${width(cardWidths.tablet)}`,
    width(cardWidths.phone),
  ].join(", ");
}

/** Screenshots carry text; anything below this quality shows as smearing. */
export const imageQuality = 92;

export const heroImageWidths = [640, 960, 1280, 1600];
export const heroImageSizes = "(min-width: 64rem) 60rem, 92vw";
