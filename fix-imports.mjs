import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      yield path;
    }
  }
}

async function fixImports(filePath) {
  const content = await readFile(filePath, 'utf-8');
  // Fix imports: add .js extension to relative imports without extensions
  const fixed = content.replace(
    /from\s+(['"])(\.\.[\/\\][^'"]+|\.\/[^'"]+)(?<!\.js|\.ts|\.json)\1/g,
    (match, quote, path) => {
      // Don't add .js if it already ends with .ts (type imports)
      if (path.endsWith('.ts')) return match;
      return `from ${quote}${path}.js${quote}`;
    }
  );

  if (content !== fixed) {
    await writeFile(filePath, fixed, 'utf-8');
    return true;
  }
  return false;
}

const srcDir = 'packages/utils/src';
let count = 0;
let fixed = 0;

for await (const filePath of walk(srcDir)) {
  count++;
  if (await fixImports(filePath)) {
    fixed++;
    console.log(`Fixed: ${filePath}`);
  }
}

console.log(`\nProcessed ${count} files, fixed ${fixed} files`);
