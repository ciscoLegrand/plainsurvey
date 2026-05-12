import { mkdir, readdir, rm, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const srcDir = join(rootDir, "src");
const distDir = join(rootDir, "dist");
const publicEntries = [
  "src/index.js",
  "src/core/index.js",
  "src/builder/index.js",
  "src/renderer/index.js",
  "src/preview/index.js",
  "src/analytics/index.js",
  "src/analysis/index.js",
  "src/ai/index.js",
  "src/styles/index.js"
];

async function main() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  runBuild("esm", "[dir]/[name].js");
  runBuild("cjs", "[dir]/[name].cjs");
  await copyStyleAssets();
}

function runBuild(format, entryNaming) {
  const result = spawnSync(
    "bun",
    [
      "build",
      ...publicEntries,
      "--outdir",
      "dist",
      "--root",
      "src",
      "--entry-naming",
      entryNaming,
      "--format",
      format,
      "--packages",
      "external",
      "--target",
      "browser"
    ],
    {
      cwd: rootDir,
      stdio: "inherit"
    }
  );

  if (result.status !== 0) {
    throw new Error(`bun build failed for ${format}`);
  }
}

async function copyStyleAssets() {
  const stylesSourceDir = join(srcDir, "styles");
  const stylesOutputDir = join(distDir, "styles");

  await mkdir(stylesOutputDir, { recursive: true });

  const entries = await readdir(stylesSourceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".css")) {
      await copyFile(join(stylesSourceDir, entry.name), join(stylesOutputDir, entry.name));
      if (entry.name === "plainsurvey.css") {
        await copyFile(join(stylesSourceDir, entry.name), join(distDir, "styles.css"));
      }
    }

    if (entry.isDirectory() && entry.name === "themes") {
      await copyDirectory(join(stylesSourceDir, entry.name), join(stylesOutputDir, entry.name));
    }
  }
}

async function copyDirectory(sourceDir, targetDir) {
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = join(sourceDir, entry.name);
    const targetPath = join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
      continue;
    }

    if (entry.isFile()) {
      await copyFile(sourcePath, targetPath);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
