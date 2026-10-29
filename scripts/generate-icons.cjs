/**
 * Generates the PWA icons (PNG) without any image dependency.
 * Run with: node scripts/generate-icons.cjs
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.resolve(__dirname, '..', 'public', 'icons');
const BG = [79, 70, 229]; // #4f46e5 (brand indigo)
const FG = [255, 255, 255];
const SS = 3; // supersampling factor for smooth edges

function roundedRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

/** Colour of the icon at normalised coordinates (0..1). */
function sample(x, y) {
  // scale keeps the glyph inside the maskable safe zone
  const s = 0.78;
  const gx = (x - 0.5) / s + 0.5;
  const gy = (y - 0.5) / s + 0.5;

  // Train body
  if (roundedRect(gx, gy, 0.3, 0.24, 0.7, 0.68, 0.08)) {
    // Windscreen
    if (roundedRect(gx, gy, 0.355, 0.3, 0.645, 0.45, 0.035)) return BG;
    // Headlights
    if (roundedRect(gx, gy, 0.355, 0.52, 0.43, 0.575, 0.02)) return BG;
    if (roundedRect(gx, gy, 0.57, 0.52, 0.645, 0.575, 0.02)) return BG;
    // Coupler notch at the bottom
    if (roundedRect(gx, gy, 0.45, 0.62, 0.55, 0.685, 0.02)) return BG;
    return FG;
  }

  // Track / rails under the train
  if (roundedRect(gx, gy, 0.24, 0.715, 0.76, 0.755, 0.02)) return FG;

  return BG;
}

function render(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const inv = 1 / (size * SS);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px * SS + sx + 0.5) * inv;
          const y = (py * SS + sy + 0.5) * inv;
          const c = sample(x, y);
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const n = SS * SS;
      const i = (py * size + px) * 4;
      pixels[i] = Math.round(r / n);
      pixels[i + 1] = Math.round(g / n);
      pixels[i + 2] = Math.round(b / n);
      pixels[i + 3] = 255;
    }
  }
  return pixels;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

function writePng(file, size) {
  const pixels = render(size);
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
  return png.length;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-32.png', 32],
];

for (const [name, size] of targets) {
  const bytes = writePng(path.join(OUT_DIR, name), size);
  console.log(`${name}: ${size}x${size}, ${bytes} bytes`);
}
