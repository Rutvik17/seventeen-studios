/**
 * Read one file out of a ZIP archive. No dependencies.
 *
 * Node ships the hard part — `inflateRawSync` — and a ZIP is otherwise just a
 * directory structure appended to the end of the concatenated members. Reading
 * it here rather than installing a library keeps the SEC pipeline's dependency
 * count at zero, which matters when the whole point of `data/` is that it can
 * be rebuilt from public sources on any machine.
 *
 * Only what the 13F datasets need: no encryption, no ZIP64, no multi-disk. Each
 * of those throws rather than guessing, because a silent misread of a financial
 * archive is worse than a stop.
 */
import { inflateRawSync } from 'node:zlib';

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

/** Entries in the archive: name, compressed size, and where the data starts. */
export function listZip(buf) {
  /*
    The end-of-central-directory record is last, but a trailing comment can push
    it up to 64 KB from the end — so it is found by scanning backwards for the
    signature rather than by assuming a fixed offset.
  */
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) {
    if (buf.readUInt32LE(i) === EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('zip: no end-of-central-directory record');

  const count = buf.readUInt16LE(eocd + 10);
  let at = buf.readUInt32LE(eocd + 16);
  if (at === 0xffffffff) throw new Error('zip: ZIP64 archives are not supported');

  const entries = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(at) !== CENTRAL) throw new Error(`zip: bad central header at ${at}`);
    const flags = buf.readUInt16LE(at + 8);
    if (flags & 0x1) throw new Error('zip: encrypted archives are not supported');

    const method = buf.readUInt16LE(at + 10);
    const compressed = buf.readUInt32LE(at + 20);
    const uncompressed = buf.readUInt32LE(at + 24);
    const nameLen = buf.readUInt16LE(at + 28);
    const extraLen = buf.readUInt16LE(at + 30);
    const commentLen = buf.readUInt16LE(at + 32);
    const offset = buf.readUInt32LE(at + 42);
    const name = buf.toString('utf8', at + 46, at + 46 + nameLen);

    entries.push({ name, method, compressed, uncompressed, offset });
    at += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/** The bytes of one entry, inflated. */
export function readZipEntry(buf, entry) {
  if (buf.readUInt32LE(entry.offset) !== LOCAL) {
    throw new Error(`zip: bad local header for ${entry.name}`);
  }
  /*
    The local header repeats the name and extra fields, and its extra field
    length can DIFFER from the central directory's. Trusting the central one
    here is the classic way to land a few bytes into the data and get garbage,
    so the local header's own lengths are the ones used.
  */
  const nameLen = buf.readUInt16LE(entry.offset + 26);
  const extraLen = buf.readUInt16LE(entry.offset + 28);
  const start = entry.offset + 30 + nameLen + extraLen;
  const data = buf.subarray(start, start + entry.compressed);

  if (entry.method === 0) return data;             // stored
  if (entry.method === 8) return inflateRawSync(data); // deflate
  throw new Error(`zip: compression method ${entry.method} is not supported`);
}

/** Convenience: find an entry by name (case-insensitive) and inflate it. */
export function extract(buf, wanted) {
  const entries = listZip(buf);
  const hit = entries.find((e) => e.name.toLowerCase() === wanted.toLowerCase())
    ?? entries.find((e) => e.name.toLowerCase().endsWith(`/${wanted.toLowerCase()}`));
  if (!hit) throw new Error(`zip: no entry named ${wanted} (has ${entries.map((e) => e.name).join(', ')})`);
  return readZipEntry(buf, hit);
}
