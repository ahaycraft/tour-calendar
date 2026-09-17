// One-off: derive the woodshedd_mobile app's icon/splash assets from this
// repo's existing brand mark (public/icon-512.png, icon-maskable-512.png),
// instead of leaving Expo's default template logo in place. Not meant to be
// run again on a schedule — re-run only if the source brand mark changes.
import sharp from "sharp";
import path from "node:path";

const SRC = path.join(import.meta.dirname, "../public");
const OUT = path.resolve(import.meta.dirname, "../../woodshedd_mobile/assets");

const BG = [16, 13, 11]; // sampled from icon-512.png's corner
const FG = [250, 248, 244]; // sampled from the mark itself

function luminance([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Turns a flat two-tone (dark bg / light mark) PNG into a transparent
 *  cutout of just the mark, anti-aliased at the edges, by keying on
 *  luminance distance from the known background color. */
async function extractMark(srcPath, size) {
  const { data, info } = await sharp(srcPath)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
  const bgLum = luminance(BG);
  const fgLum = luminance(FG);
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const lum = luminance([data[i], data[i + 1], data[i + 2]]);
    const t = Math.max(0, Math.min(1, (lum - bgLum) / (fgLum - bgLum)));
    out[i] = FG[0];
    out[i + 1] = FG[1];
    out[i + 2] = FG[2];
    out[i + 3] = Math.round(t * 255);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(size, size, { kernel: "lanczos3" })
    .png();
}

async function main() {
  // Main iOS icon — the source composite (bg baked in) upscaled 2x. It's
  // already a flat two-tone graphic, so a clean upscale holds up fine.
  await sharp(`${SRC}/icon-512.png`)
    .resize(1024, 1024, { kernel: "lanczos3" })
    .png()
    .toFile(`${OUT}/images/icon.png`);

  // Liquid Glass foreground layer — from the safe-padded (maskable) source,
  // since that inset was already deliberately designed. 1024 for crispness.
  await (await extractMark(`${SRC}/icon-maskable-512.png`, 1024)).toFile(
    `${OUT}/expo.icon/Assets/mark.png`
  );

  // Android adaptive icon: foreground (transparent, safe-padded), solid
  // background, and a white-silhouette monochrome layer for themed icons.
  await (await extractMark(`${SRC}/icon-maskable-512.png`, 512)).toFile(
    `${OUT}/images/android-icon-foreground.png`
  );
  await sharp({
    create: { width: 512, height: 512, channels: 3, background: { r: BG[0], g: BG[1], b: BG[2] } }
  })
    .png()
    .toFile(`${OUT}/images/android-icon-background.png`);
  const monochromeSrc = await extractMark(`${SRC}/icon-maskable-512.png`, 512).then((img) =>
    img.raw().toBuffer({ resolveWithObject: true })
  );
  const mono = Buffer.alloc(monochromeSrc.data.length);
  for (let i = 0; i < monochromeSrc.data.length; i += 4) {
    mono[i] = mono[i + 1] = mono[i + 2] = 255; // Android tints this itself
    mono[i + 3] = monochromeSrc.data[i + 3];
  }
  await sharp(mono, { raw: { width: 512, height: 512, channels: 4 } })
    .png()
    .toFile(`${OUT}/images/android-icon-monochrome.png`);

  // Splash — full-bleed (not safe-padded) transparent mark, shown centered
  // over the app's existing blue splash background.
  await (await extractMark(`${SRC}/icon-512.png`, 512)).toFile(`${OUT}/images/splash-icon.png`);

  // Web favicon — same composite as the main icon, just tiny.
  await sharp(`${SRC}/icon-512.png`)
    .resize(48, 48, { kernel: "lanczos3" })
    .png()
    .toFile(`${OUT}/images/favicon.png`);

  console.log("✓ Wrote icon/splash assets to", OUT);
  console.log(`  Brand colors — background: rgb(${BG}), mark: rgb(${FG})`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
