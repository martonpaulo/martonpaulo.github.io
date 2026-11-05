import type { APIRoute, GetStaticPaths } from "astro";

import { designFile, designFiles, designResponse } from "../../../lib/design";

// The two font files and their licences, straight from the Fontsource packages.
export const getStaticPaths: GetStaticPaths = () =>
  designFiles()
    .filter((file) => file.path.startsWith("fonts/"))
    .map((file) => ({ params: { file: file.path.slice("fonts/".length) } }));

export const GET: APIRoute = ({ params }) => designResponse(designFile(`fonts/${params.file}`));
