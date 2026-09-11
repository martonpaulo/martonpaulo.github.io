import { inflateSync } from "node:zlib";

/**
 * Unpacks a WOFF 1.0 file into the plain TrueType/OpenType font inside it.
 *
 * The share images need it. satori can read WOFF, but it inflates the tables
 * with fflate, and fflate is pinned to 0.8 through an override in package.json
 * (GHSA-px8p-9vwx-vf98). Under 0.8 the WOFF path fails silently: the build
 * succeeds and every glyph is drawn as a missing-glyph box. Handing satori the
 * unpacked font skips that path, so the security pin stays and the text renders.
 *
 * Format: https://www.w3.org/TR/WOFF/ — a 44-byte header, a 20-byte directory
 * entry per table, then each table, zlib-compressed when that makes it smaller.
 */
export function woffToSfnt(woff: Buffer): Buffer {
  if (woff.toString("latin1", 0, 4) !== "wOFF") {
    throw new Error("Not a WOFF 1.0 file");
  }
  const flavor = woff.readUInt32BE(4);
  const numTables = woff.readUInt16BE(12);

  const tables = Array.from({ length: numTables }, (_, index) => {
    const entry = 44 + index * 20;
    const offset = woff.readUInt32BE(entry + 4);
    const compressedLength = woff.readUInt32BE(entry + 8);
    const length = woff.readUInt32BE(entry + 12);
    const stored = woff.subarray(offset, offset + compressedLength);
    return {
      tag: woff.readUInt32BE(entry),
      checksum: woff.readUInt32BE(entry + 16),
      data: compressedLength < length ? inflateSync(stored) : stored,
    };
  });

  // The sfnt header's binary-search fields, as the OpenType spec defines them.
  let entrySelector = 0;
  while (2 ** (entrySelector + 1) <= numTables) entrySelector++;
  const searchRange = 2 ** entrySelector * 16;

  const header = Buffer.alloc(12 + numTables * 16);
  header.writeUInt32BE(flavor, 0);
  header.writeUInt16BE(numTables, 4);
  header.writeUInt16BE(searchRange, 6);
  header.writeUInt16BE(entrySelector, 8);
  header.writeUInt16BE(numTables * 16 - searchRange, 10);

  const parts: Buffer[] = [header];
  let offset = header.length;
  tables.forEach((table, index) => {
    const entry = 12 + index * 16;
    header.writeUInt32BE(table.tag, entry);
    header.writeUInt32BE(table.checksum, entry + 4);
    header.writeUInt32BE(offset, entry + 8);
    header.writeUInt32BE(table.data.length, entry + 12);
    // Every table starts on a four-byte boundary.
    const padding = (4 - (table.data.length % 4)) % 4;
    parts.push(table.data, Buffer.alloc(padding));
    offset += table.data.length + padding;
  });

  return Buffer.concat(parts);
}
