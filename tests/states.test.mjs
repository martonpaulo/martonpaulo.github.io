// The interaction-state system (#45): every hover, focus, press, current and disabled look comes
// from the --state-* and --focus-* tokens in src/styles/tokens.scss, and a state change uses only
// properties the browser repaints or composites, never layout. docs/design-system.md,
// "Interaction states", is the spec this enforces.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

import { hex, ratio } from "./support/contrast.mjs";

const SRC = new URL("../src/", import.meta.url).pathname;
/** The tokens themselves, and the reduced-motion switch that turns every transition off. */
const OWNERS = ["styles/tokens.scss", "styles/motion.scss"];
const STATE = /:hover|:active|:focus|\[aria-current|:disabled|\[aria-disabled/;
/** What a state may change: paint and compositing only. */
const PAINT = new Set([
  "color",
  "background-color",
  "border-color",
  "box-shadow",
  "transform",
  "opacity",
  "outline",
  "outline-offset",
  "text-decoration",
  "text-decoration-color",
  "cursor",
]);
/** Paint properties whose value must be a state or focus token. */
const TOKENED = new Set([
  "color",
  "background-color",
  "border-color",
  "box-shadow",
  "transform",
  "opacity",
  "outline",
]);
const KEYWORDS = new Set(["none", "currentColor", "inherit", "transparent"]);
const STATE_VALUE = /var\(--(state|focus)-/;
/** A focus rule may also move a skip link into view and round its ring. */
const FOCUS_ONLY = new Set(["top", "border-radius"]);

async function styles(dir, found = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await styles(path, found);
    else if (entry.name.endsWith(".scss")) found.push(path);
  }
  return found;
}

/** Every declaration with the full selector it applies to, nesting resolved. */
function declarations(source) {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const stack = [];
  const found = [];
  let buffer = "";
  let line = 1;
  for (const char of text) {
    if (char === "\n") line++;
    if (char === "{") {
      const own = buffer.trim();
      const parent = stack.at(-1) ?? "";
      const selector = own.startsWith("@")
        ? parent
        : own
            .split(",")
            .map((part) => part.trim())
            .flatMap((part) =>
              (parent || "")
                .split(",")
                .map((outer) =>
                  part.includes("&")
                    ? part.replaceAll("&", outer.trim())
                    : `${outer.trim()} ${part}`.trim(),
                ),
            )
            .join(", ");
      stack.push(selector);
      buffer = "";
    } else if (char === "}" || char === ";") {
      const match = /^\s*([a-z-]+)\s*:\s*([\s\S]+)$/.exec(buffer);
      if (match && stack.length > 0) {
        found.push({ selector: stack.at(-1), property: match[1], value: match[2].trim(), line });
      }
      if (char === "}") stack.pop();
      buffer = "";
    } else {
      buffer += char;
    }
  }
  return found;
}

const files = (await styles(SRC)).filter((path) => !OWNERS.some((owner) => path.endsWith(owner)));
const all = await Promise.all(
  files.map(async (path) => ({
    path: path.slice(SRC.length),
    list: declarations(await readFile(path, "utf8")),
  })),
);

test("a state rule changes only paint, from the shared state tokens", () => {
  const wrong = [];
  for (const { path, list } of all) {
    for (const { selector, property, value, line } of list) {
      if (!STATE.test(selector)) continue;
      const focusOnly = !/:hover|:active/.test(selector) && FOCUS_ONLY.has(property);
      if (!PAINT.has(property) && !focusOnly) {
        wrong.push(
          `src/${path}:${line}: ${selector} { ${property} } uses a property a state may not change`,
        );
      } else if (TOKENED.has(property) && !STATE_VALUE.test(value) && !KEYWORDS.has(value)) {
        wrong.push(
          `src/${path}:${line}: ${selector} { ${property}: ${value} } is not a state token`,
        );
      }
    }
  }
  assert.deepEqual(wrong, []);
});

test("every transition is of paint properties, at the shared duration and easing", () => {
  const wrong = [];
  for (const { path, list } of all) {
    for (const { selector, property, value, line } of list.filter(
      (d) => d.property === "transition",
    )) {
      for (const part of value.split(",")) {
        const [name] = part.trim().split(/\s+/);
        const shared = part.includes("var(--state-duration)") && part.includes("var(--state-ease)");
        if (!PAINT.has(name) || !shared) {
          wrong.push(`src/${path}:${line}: ${selector} { ${property}: ${part.trim()} }`);
        }
      }
    }
  }
  assert.deepEqual(wrong, []);
});

test("the parser reads nesting and finds a raw hover colour", () => {
  const found = declarations(".a {\n  &:hover {\n    color: #fff;\n  }\n}\n");
  assert.deepEqual(found, [{ selector: ".a:hover", property: "color", value: "#fff", line: 3 }]);
});

// Each state's ink on its ground, as tokens.scss resolves them (#45): text 4.5:1, the ring 3:1.
test("every state keeps its contrast", async () => {
  const tokens = await readFile(join(SRC, "styles/tokens.scss"), "utf8");
  const colour = (name) => {
    const value = new RegExp(`--${name}:\\s*([^;]+);`).exec(tokens)?.[1].trim();
    const alias = /^var\(--([\w-]+)\)$/.exec(value ?? "")?.[1];
    return alias ? colour(alias) : hex(value);
  };
  const pairs = [
    ["state-hover-ink", "bg", 4.5],
    ["state-hover-text", "bg", 4.5],
    ["state-current-ink", "state-current-fill", 4.5],
    ["state-current-ink", "state-primary-hover-fill", 4.5],
    ["focus", "bg", 3],
  ];
  for (const [ink, ground, least] of pairs) {
    const measured = ratio(colour(ink), colour(ground));
    assert.ok(measured >= least, `--${ink} on --${ground} is ${measured.toFixed(2)}:1`);
  }
});
