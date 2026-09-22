#!/usr/bin/env node
/**
 * Membuat ikon PWA (PNG 192 & 512) tanpa dependensi image processing.
 * Menggambar langsung per piksel lalu meng-encode PNG dengan zlib bawaan Node.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/icons');
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];

/** Bentuk hati (kurva implisit) dinormalisasi pada rentang -1..1. */
function insideHeart(x, y) {
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y <= 0;
}

function render(size) {
  const px = Buffer.alloc(size * size * 4);
  const radius = size * 0.22;
  const cream = [253, 243, 231];
  const blush = [251, 226, 233];
  const sky = [219, 238, 250];
  const sage = [95, 158, 136];
  const light = [253, 248, 243];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const t = (x / size + y / size) / 2;
      let color = t < 0.55 ? mix(cream, blush, t / 0.55) : mix(blush, sky, (t - 0.55) / 0.45);
      let alpha = 255;

      // sudut membulat
      const dx = Math.min(x, size - 1 - x);
      const dy = Math.min(y, size - 1 - y);
      if (dx < radius && dy < radius) {
        const d = Math.hypot(radius - dx, radius - dy);
        if (d > radius) alpha = 0;
        else if (d > radius - 1.5) alpha = Math.round(255 * (radius - d) / 1.5);
      }

      // hati
      const hx = (x - size / 2) / (size * 0.34);
      const hy = -(y - size * 0.46) / (size * 0.34);
      if (insideHeart(hx, hy)) {
        color = sage;
        // mata & senyum
        const eyeR = size * 0.033;
        const leftEye = Math.hypot(x - size * 0.4, y - size * 0.445);
        const rightEye = Math.hypot(x - size * 0.6, y - size * 0.445);
        const smile = Math.hypot(x - size / 2, y - size * 0.47);
        const smileBand = smile > size * 0.105 && smile < size * 0.14 && y > size * 0.5;
        if (leftEye < eyeR || rightEye < eyeR || smileBand) color = light;
      }

      px[i] = Math.round(color[0]);
      px[i + 1] = Math.round(color[1]);
      px[i + 2] = Math.round(color[2]);
      px[i + 3] = alpha;
    }
  }
  return encodePng(size, size, px);
}

for (const size of [192, 512]) {
  writeFileSync(resolve(outDir, `icon-${size}.png`), render(size));
  console.log(`public/icons/icon-${size}.png dibuat`);
}
