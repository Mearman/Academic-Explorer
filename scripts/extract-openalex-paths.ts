#!/usr/bin/env tsx

/**
 * OpenAlex API Path Extractor
 *
 * This script searches through OpenAlex documentation files and extracts all unique
 * API paths/URLs. It can be used both as a CLI tool and programmatically.
 *
 * CLI Usage:
 *   npx tsx scripts/extract-openalex-paths.ts [options] [directory]
 *
 * Options:
 *   --urls          Show full URLs instead of just paths
 *   --both          Show both URLs and paths
 *   --include-files Show which files contain each URL
 *   -f              Alias for --include-files
 *
 * Examples:
 *   npx tsx scripts/extract-openalex-paths.ts
 *   npx tsx scripts/extract-openalex-paths.ts --both
 *   npx tsx scripts/extract-openalex-paths.ts --include-files docs/openalex-docs
 *
 * Programmatic Usage:
 *   import { extractOpenAlexPaths } from './extract-openalex-paths.js';
 *   const result = await extractOpenAlexPaths({ searchDir: 'docs/openalex-docs' });
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface ExtractOptions {
  /**
   * Directory to search in
   */
  searchDir?: string;
  /**
   * Include file paths where URLs were found
   */
  includeFilePaths?: boolean;
  /**
   * Output format
   */
  format?: 'paths' | 'urls' | 'both';
}

interface ExtractionResult {
  /**
   * All unique API paths found
   */
  paths: string[];
  /**
   * All unique full URLs found
   */
  urls: string[];
  /**
   * Map of file paths to the URLs found in them
   */
  fileMap: Map<string, string[]>;
  /**
   * Total number of files scanned
   */
  filesScanned: number;
}

const DEFAULT_SEARCH_DIR = 'docs/openalex-docs';
const API_URL_REGEX = /https:\/\/api\.openalex\.org\/[^\s\)\]"'`]*[^\s\)\]"'`.,;]/g;

/**
 * Recursively find all .md files in a directory
 */
async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip .git directories
        if (entry.name === '.git') continue;
        const subFiles = await findMarkdownFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return files;
}

/**
 * Extract OpenAlex API URLs from file content
 */
function extractApiUrls(content: string): string[] {
  const matches = content.match(API_URL_REGEX);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Convert full URL to just the path part
 */
function urlToPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search + urlObj.hash;
  } catch {
    // If URL parsing fails, extract manually
    const match = url.match(/https:\/\/api\.openalex\.org(\/.*)$/);
    return match ? match[1] : url;
  }
}

/**
 * Main extraction function
 */
export async function extractOpenAlexPaths(options: ExtractOptions = {}): Promise<ExtractionResult> {
  const { 
    searchDir = DEFAULT_SEARCH_DIR,
    includeFilePaths = false 
  } = options;

  console.log(`Searching for OpenAlex API paths in: ${searchDir}`);
  
  // Find all markdown files
  const mdFiles = await findMarkdownFiles(searchDir);
  console.log(`Found ${mdFiles.length} markdown files`);
  
  const allUrls = new Set<string>();
  const fileMap = new Map<string, string[]>();
  let filesScanned = 0;
  
  // Process each file
  for (const filePath of mdFiles) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const urls = extractApiUrls(content);
      
      if (urls.length > 0) {
        if (includeFilePaths) {
          fileMap.set(filePath, urls);
        }
        urls.forEach(url => allUrls.add(url));
      }
      
      filesScanned++;
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
    }
  }
  
  // Convert URLs to paths and deduplicate
  const uniqueUrls = Array.from(allUrls).sort();
  const uniquePaths = Array.from(new Set(uniqueUrls.map(urlToPath))).sort();
  
  return {
    paths: uniquePaths,
    urls: uniqueUrls,
    fileMap,
    filesScanned
  };
}

/**
 * CLI interface
 */
async function cli() {
  const args = process.argv.slice(2);
  const includeFiles = args.includes('--include-files') || args.includes('-f');
  const format = args.includes('--urls') ? 'urls' : 
                args.includes('--both') ? 'both' : 'paths';
  const searchDir = args.find(arg => !arg.startsWith('-')) || DEFAULT_SEARCH_DIR;
  
  try {
    const result = await extractOpenAlexPaths({ 
      searchDir,
      includeFilePaths: includeFiles,
      format 
    });
    
    console.log(`\nScanned ${result.filesScanned} files`);
    console.log(`Found ${result.urls.length} unique URLs`);
    console.log(`Found ${result.paths.length} unique paths\n`);
    
    if (format === 'urls' || format === 'both') {
      console.log('=== FULL URLs ===');
      result.urls.forEach(url => console.log(url));
      
      if (format === 'both') {
        console.log('\n=== API PATHS ===');
      }
    }
    
    if (format === 'paths' || format === 'both') {
      result.paths.forEach(path => console.log(path));
    }
    
    if (includeFiles && result.fileMap.size > 0) {
      console.log('\n=== FILES CONTAINING URLS ===');
      for (const [filePath, urls] of result.fileMap.entries()) {
        console.log(`\n${filePath}:`);
        urls.forEach(url => console.log(`  ${url}`));
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (process.argv[1] && process.argv[1].endsWith('extract-openalex-paths.ts')) {
  cli().catch(console.error);
}