import { readdir, writeFile, stat } from "fs/promises";
import { join, extname, basename } from "path";

export interface FileMetadata {
  id: string;
  size: number;
  lastModified: string;
}

export interface StaticDataIndex {
  entityType: string;
  count: number;
  lastGenerated: string;
  entities: string[];
  metadata: {
    totalSize: number;
    files: FileMetadata[];
  };
}

/**
 * Generate index file for a specific entity type directory
 */
export async function generateIndexForEntityType(
  entityDir: string,
  entityType: string
): Promise<void> {
  try {
    // Get all JSON files in the entity directory (excluding index.json)
    const files = await readdir(entityDir);
    const jsonFiles = files.filter(file =>
      extname(file) === ".json" && basename(file) !== "index.json"
    );

    if (jsonFiles.length === 0) {
      console.log(`⚠️  No JSON files found in ${entityType} directory`);
      return;
    }

    // Extract entity IDs from filenames (remove .json extension)
    const entityIds = jsonFiles.map(file => basename(file, ".json"));

    // Get file stats for metadata
    const fileStats: FileMetadata[] = await Promise.all(
      jsonFiles.map(async (file): Promise<FileMetadata> => {
        const filePath = join(entityDir, file);
        const stats = await stat(filePath);
        return {
          id: basename(file, ".json"),
          size: stats.size,
          lastModified: stats.mtime.toISOString()
        };
      })
    );

    // Create index content
    const indexContent: StaticDataIndex = {
      entityType,
      count: entityIds.length,
      lastGenerated: new Date().toISOString(),
      entities: entityIds.sort(), // Sorted for consistent output
      metadata: {
        totalSize: fileStats.reduce((sum, file) => sum + file.size, 0),
        files: fileStats.sort((a, b) => a.id.localeCompare(b.id))
      }
    };

    // Write index file
    const indexPath = join(entityDir, "index.json");
    await writeFile(indexPath, JSON.stringify(indexContent, null, 2));

    console.log(`✅ Generated ${entityType}/index.json with ${entityIds.length} entities`);
  } catch (error) {
    console.error(`❌ Error generating index for ${entityType}:`, error);
  }
}

/**
 * Generate all static data indexes
 */
export async function generateAllIndexes(staticDataDir: string): Promise<void> {
  try {
    const entityTypes = await readdir(staticDataDir, { withFileTypes: true });
    const directories = entityTypes.filter(dirent => dirent.isDirectory());

    console.log(`📁 Found ${directories.length} entity type directories`);

    for (const dir of directories) {
      const entityType = dir.name;
      const entityDir = join(staticDataDir, entityType);
      await generateIndexForEntityType(entityDir, entityType);
    }

    console.log("🎉 Static data indexes generated successfully");
  } catch (error) {
    console.error("❌ Error generating static data indexes:", error);
    throw error;
  }
}