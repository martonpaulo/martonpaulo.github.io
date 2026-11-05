import type { APIRoute } from "astro";

import { designFile, designResponse } from "../../lib/design";

// The @font-face rules for the two published font files, for other sites to read.
export const GET: APIRoute = () => designResponse(designFile("fonts.css"));
