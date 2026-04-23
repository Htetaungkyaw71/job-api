import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const distPrismaRoot = path.resolve("dist/generated/prisma");

const relativeImportPattern = /(from\s+['"])(\.[^'"]+?)(['"])/g;

async function walk(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      await walk(entryPath);
      continue;
    }

    if (!entry.name.endsWith(".js")) {
      continue;
    }

    const content = await readFile(entryPath, "utf8");
    const rewritten = content.replace(
      relativeImportPattern,
      (_match, prefix, specifier, suffix) => {
        if (
          specifier.endsWith(".js") ||
          specifier.endsWith(".mjs") ||
          specifier.endsWith(".cjs") ||
          specifier.endsWith(".json")
        ) {
          return `${prefix}${specifier}${suffix}`;
        }

        return `${prefix}${specifier}.js${suffix}`;
      },
    );

    if (rewritten !== content) {
      await writeFile(entryPath, rewritten);
    }
  }
}

try {
  await stat(distPrismaRoot);
  await walk(distPrismaRoot);
  console.log("Patched Prisma ESM imports in dist/generated/prisma");
} catch (error) {
  if (error?.code === "ENOENT") {
    process.exit(0);
  }

  throw error;
}