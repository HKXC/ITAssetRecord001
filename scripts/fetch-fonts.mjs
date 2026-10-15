#!/usr/bin/env node
/**
 * Downloads the static Noto Sans Thai TTFs embedded in generated PDFs.
 *
 * The fonts are committed to the repository so a build never depends on the network, but
 * this script re-fetches them (for example after a clone that stripped binaries, or to
 * upgrade to a newer release).
 *
 * Noto Sans Thai is licensed under the SIL Open Font License 1.1 — see assets/OFL.txt.
 *
 * Usage: npm run fonts:fetch
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE =
  "https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/NotoSansThai";

const FILES = [
  { name: "NotoSansThai-Regular.ttf", url: `${BASE}/NotoSansThai-Regular.ttf` },
  { name: "NotoSansThai-Bold.ttf", url: `${BASE}/NotoSansThai-Bold.ttf` },
];

const targetDir = path.join(process.cwd(), "src", "lib", "pdf", "assets");

async function main() {
  await mkdir(targetDir, { recursive: true });

  for (const file of FILES) {
    process.stdout.write(`fetching ${file.name} … `);
    const response = await fetch(file.url);
    if (!response.ok) {
      throw new Error(`failed to download ${file.url}: HTTP ${response.status}`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.subarray(0, 4).toString("hex") !== "00010000") {
      throw new Error(`${file.name} is not a TrueType font (unexpected header)`);
    }

    const target = path.join(targetDir, file.name);
    await writeFile(target, bytes);
    console.log(`${bytes.length} bytes -> ${path.relative(process.cwd(), target)}`);
  }

  console.log("done");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
