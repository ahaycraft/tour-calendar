// Regenerates the iOS PWA launch images in public/splash/ and prints the
// `startupImage` array to paste into src/lib/apple-splash-screens.ts.
//
// Run with:  node scripts/gen-splash.mjs
//
// Each image is the Woodshed icon (public/icon-512.png) centered on a #09090b
// field — the same colour as the manifest `background_color` — so the launch
// screen matches the app's dark chrome. iOS Safari ignores the web manifest for
// launch screens and instead matches `<link rel="apple-touch-startup-image">`
// by an exact device-width/device-height/-webkit-device-pixel-ratio media
// query, so there is one asset per device resolution per orientation.

import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public/splash");
const SRC_ICON = path.join(ROOT, "public/icon-512.png");
const BG = { r: 0x09, g: 0x09, b: 0x0b, alpha: 1 }; // #09090b

// One entry per unique (device-width, device-height, dpr) combination iOS
// Safari matches. Portrait pixel size is w*r x h*r; the landscape asset swaps
// those dimensions while the media query keeps the same device-width/
// device-height and only flips the orientation keyword.
const DEVICES = [
  { w: 320, h: 568, r: 2 }, // iPhone SE (1st gen), 5s
  { w: 375, h: 667, r: 2 }, // iPhone SE (2nd/3rd gen), 8, 7, 6s
  { w: 414, h: 736, r: 3 }, // iPhone 8 Plus, 7 Plus, 6s Plus
  { w: 375, h: 812, r: 3 }, // iPhone X, XS, 11 Pro, 12 mini, 13 mini
  { w: 414, h: 896, r: 2 }, // iPhone XR, 11
  { w: 414, h: 896, r: 3 }, // iPhone XS Max, 11 Pro Max
  { w: 390, h: 844, r: 3 }, // iPhone 12, 12 Pro, 13, 13 Pro, 14
  { w: 428, h: 926, r: 3 }, // iPhone 12 Pro Max, 13 Pro Max, 14 Plus
  { w: 393, h: 852, r: 3 }, // iPhone 14 Pro, 15, 15 Pro, 16
  { w: 430, h: 932, r: 3 }, // iPhone 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  { w: 402, h: 874, r: 3 }, // iPhone 16 Pro
  { w: 440, h: 956, r: 3 }, // iPhone 16 Pro Max
  { w: 768, h: 1024, r: 2 }, // iPad mini, iPad Air (9.7"), iPad 5th/6th gen
  { w: 810, h: 1080, r: 2 }, // iPad 7th/8th/9th gen (10.2")
  { w: 834, h: 1112, r: 2 }, // iPad Air (3rd gen), iPad Pro 10.5"
  { w: 820, h: 1180, r: 2 }, // iPad 10th gen, iPad Air (10.9"), iPad Air 11" M2
  { w: 834, h: 1194, r: 2 }, // iPad Pro 11"
  { w: 1024, h: 1366, r: 2 }, // iPad Pro 12.9"
  { w: 1032, h: 1376, r: 2 }, // iPad Air 13" M2, iPad Pro 13" M4
];

async function render(pxW, pxH) {
  const iconSize = Math.min(460, Math.round(Math.min(pxW, pxH) * 0.32));
  const icon = await sharp(SRC_ICON)
    .resize(iconSize, iconSize, { fit: "contain" })
    .png()
    .toBuffer();
  return sharp({
    create: { width: pxW, height: pxH, channels: 4, background: BG },
  })
    .composite([{ input: icon, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

await mkdir(OUT_DIR, { recursive: true });

const entries = [];
for (const { w, h, r } of DEVICES) {
  const pW = w * r;
  const pH = h * r;
  const baseMedia =
    `(device-width: ${w}px) and (device-height: ${h}px) and ` +
    `(-webkit-device-pixel-ratio: ${r})`;

  const portraitName = `apple-splash-${pW}x${pH}.png`;
  await writeFile(path.join(OUT_DIR, portraitName), await render(pW, pH));
  entries.push({
    url: `/splash/${portraitName}`,
    media: `${baseMedia} and (orientation: portrait)`,
  });

  const landscapeName = `apple-splash-${pH}x${pW}.png`;
  await writeFile(path.join(OUT_DIR, landscapeName), await render(pH, pW));
  entries.push({
    url: `/splash/${landscapeName}`,
    media: `${baseMedia} and (orientation: landscape)`,
  });
}

const ts = entries
  .map((e) => `  { url: "${e.url}", media: "${e.media}" },`)
  .join("\n");

console.log(`Wrote ${entries.length} splash images to ${OUT_DIR}\n`);
console.log(ts);
