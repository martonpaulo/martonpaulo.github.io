import type { APIRoute } from "astro";

import { buildCommit, designFiles, manifestFor } from "../../lib/design";

// Each published design file's path, size and hash, and the commit they were built from,
// so a site that reads them can pin a version and notice drift.
export const GET: APIRoute = () =>
  new Response(`${JSON.stringify(manifestFor(designFiles(), buildCommit()), null, 2)}\n`, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
