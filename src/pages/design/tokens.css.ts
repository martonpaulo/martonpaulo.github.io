import type { APIRoute } from "astro";

import { designFile, designResponse } from "../../lib/design";

// The site's tokens compiled from src/styles/tokens.scss, for other sites to read.
export const GET: APIRoute = () => designResponse(designFile("tokens.css"));
