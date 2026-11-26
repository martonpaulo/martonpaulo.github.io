// db/projects.json, as the scripts that record a value in it (metrics, kinds, card gradients) read
// and write it. The written file keeps two-space indentation; `pnpm format` restores its wrapping.
import { readFile, writeFile } from "node:fs/promises";

const FILE = new URL("../../db/projects.json", import.meta.url);

export const readProjects = async () => JSON.parse(await readFile(FILE, "utf8"));

export const writeProjects = (projects) =>
  writeFile(FILE, `${JSON.stringify(projects, null, 2)}\n`);
