// A local server of a built site, for the scripts that render it in a browser
// (scripts/layout-check.mjs, scripts/state-check.mjs). It serves files only, on a free port.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const HOST = "127.0.0.1";
const LOCAL = `http://${HOST}`;
const HTTP = { ok: 200, notFound: 404 };
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };

/** Serves `dist` and resolves to its origin and a close function. */
export async function serveDist(dist) {
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, LOCAL).pathname));
    let file = join(dist, path);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) {
      response.writeHead(HTTP.notFound).end();
      return;
    }
    response.writeHead(HTTP.ok, {
      "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    });
    createReadStream(file).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, HOST, resolve));
  return { origin: `${LOCAL}:${server.address().port}`, close: () => server.close() };
}
