import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { compile } from "sass";

/*
  The design files other sites read at fixed addresses under /design/ (issue #32).
  Every file is built here from its source — tokens.scss and the Fontsource packages —
  so nothing published is a copy edited by hand. The endpoints in src/pages/design/
  only serve these bytes, and tests/design.test.mjs imports this module directly,
  which is why it uses no path alias and no relative import.
*/

const root = process.cwd();

// Only the two weights the site loads (--weight-body, --weight-display); a reader
// of fonts.css uses these two voices and synthesises no other.
const FONTS = [
  { family: "Figtree", slug: "figtree", weight: 400 },
  { family: "Gabarito", slug: "gabarito", weight: 700 },
] as const;

const fontPackage = (slug: string) => path.join(root, "node_modules", "@fontsource", slug);
const fontFileName = (font: (typeof FONTS)[number]) =>
  `${font.slug}-latin-${font.weight}-normal.woff2`;
const licenceFileName = (font: (typeof FONTS)[number]) => `${font.slug}-OFL.txt`;

export interface DesignFile {
  /** Path under /design/, also the key in the manifest. */
  path: string;
  contentType: string;
  bytes: Uint8Array;
}

const utf8 = (text: string) => new TextEncoder().encode(text);

function tokensCss(): DesignFile {
  const { css } = compile(path.join(root, "src", "styles", "tokens.scss"));
  return { path: "tokens.css", contentType: "text/css; charset=utf-8", bytes: utf8(`${css}\n`) };
}

function fontsCss(): DesignFile {
  const rules = FONTS.map(
    (font) => `@font-face {
  font-family: "${font.family}";
  font-style: normal;
  font-weight: ${font.weight};
  font-display: swap;
  src: url("fonts/${fontFileName(font)}") format("woff2");
}
`,
  );
  return {
    path: "fonts.css",
    contentType: "text/css; charset=utf-8",
    bytes: utf8(rules.join("\n")),
  };
}

function fontFiles(): DesignFile[] {
  return FONTS.flatMap((font) => [
    {
      path: `fonts/${fontFileName(font)}`,
      contentType: "font/woff2",
      bytes: readFileSync(path.join(fontPackage(font.slug), "files", fontFileName(font))),
    },
    {
      // Each package's LICENSE is the SIL Open Font License with the font's copyright line,
      // which the licence requires to travel with every redistributed copy.
      path: `fonts/${licenceFileName(font)}`,
      contentType: "text/plain; charset=utf-8",
      bytes: readFileSync(path.join(fontPackage(font.slug), "LICENSE")),
    },
  ]);
}

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

export interface DesignManifest {
  commit: string;
  files: { path: string; bytes: number; sha256: string }[];
}

export function manifestFor(files: DesignFile[], commit: string): DesignManifest {
  return {
    commit,
    files: files.map((file) => ({
      path: file.path,
      bytes: file.bytes.byteLength,
      sha256: sha256(file.bytes),
    })),
  };
}

let cached: DesignFile[] | undefined;

/** Every published file except the manifest, built once per process. */
export function designFiles(): DesignFile[] {
  cached ??= [tokensCss(), fontsCss(), ...fontFiles()];
  return cached;
}

/** The commit the build runs on: the Deploy job checks out the commit Validate approved. */
export const buildCommit = () =>
  execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();

export function designFile(filePath: string): DesignFile {
  const file = designFiles().find((candidate) => candidate.path === filePath);
  if (!file) throw new Error(`No design file at ${filePath}`);
  return file;
}

export const designResponse = (file: DesignFile) =>
  new Response(new Uint8Array(file.bytes), { headers: { "Content-Type": file.contentType } });
