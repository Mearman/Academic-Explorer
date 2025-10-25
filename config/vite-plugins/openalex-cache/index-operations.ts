import type { IndexUpdateContext } from "./types";
import { createLogVerbose } from "./utils";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "fs";
import { join, dirname } from "path";

/**
 * Performs updates to directory index files with debouncing
 */
export async function performDirectoryIndexUpdates(
  directory: string,
  context: IndexUpdateContext
): Promise<void> {
  const logVerbose = createLogVerbose(context.verbose);

  logVerbose(`Performing index updates for directory: ${directory}`);

  // Debounce the index update operation
  context.debounceManager.debounce(
    `index-update-${directory}`,
    () => updateDirectoryIndex(directory, context)
  );
}

/**
 * Updates the index file for a directory
 */
function updateDirectoryIndex(
  directory: string,
  context: IndexUpdateContext
): void {
  const logVerbose = createLogVerbose(context.verbose);

  try {
    if (!existsSync(directory)) {
      logVerbose(`Directory does not exist: ${directory}`);
      return;
    }

    const files = readdirSync(directory, { withFileTypes: true });
    const indexData = {
      directory,
      lastUpdated: new Date().toISOString(),
      files: files
        .filter((file) => file.isFile())
        .map((file) => {
          const filePath = join(directory, file.name);
          const stats = statSync(filePath);
          return {
            name: file.name,
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
            type: getFileType(file.name),
          };
        }),
      directories: files
        .filter((file) => file.isDirectory())
        .map((dir) => ({
          name: dir.name,
          path: join(directory, dir.name),
          lastModified: statSync(join(directory, dir.name)).mtime.toISOString(),
        })),
    };

    const indexPath = join(directory, ".index.json");

    if (context.dryRun) {
      logVerbose(`[DRY RUN] Would update index: ${indexPath}`);
      logVerbose(`[DRY RUN] Index data: ${JSON.stringify(indexData, null, 2)}`);
      return;
    }

    writeFileSync(indexPath, JSON.stringify(indexData, null, 2), "utf-8");
    logVerbose(`Updated index: ${indexPath}`);
  } catch (error) {
    logVerbose(`Failed to update index for ${directory}: ${error}`);
  }
}

/**
 * Determines file type based on extension
 */
function getFileType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "json":
      return "application/json";
    case "ts":
      return "text/typescript";
    case "js":
      return "text/javascript";
    case "md":
      return "text/markdown";
    case "txt":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}