// Dependency-free PNG encoder: reproducible, locally generated application art.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type),
    size = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, crc]);
}
const points = [
  [112, 280],
  [188, 280],
  [230, 172],
  [286, 340],
  [328, 232],
  [400, 232],
];
function distance(x, y, a, b) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
}
for (const n of [192, 512]) {
  const raw = Buffer.alloc((n * 4 + 1) * n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const sx = (x * 512) / n,
        sy = (y * 512) / n;
      const line = points.slice(1).some((p, i) => distance(sx, sy, points[i], p) < 14);
      const dot = [points[0], points[5]].some((p) => Math.hypot(sx - p[0], sy - p[1]) < 20);
      const rgb = dot ? [255, 255, 255] : line ? [96, 219, 195] : [16, 46, 54];
      const k = y * (n * 4 + 1) + 1 + x * 4;
      raw.set([...rgb, 255], k);
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(n);
  header.writeUInt32BE(n, 4);
  header[8] = 8;
  header[9] = 6;
  writeFileSync(
    new URL(`../public/icon-${n}.png`, import.meta.url),
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}
