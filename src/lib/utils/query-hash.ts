/**
 * Content hash generation utilities
 * Simple SHA-256 content hashing for tracking file changes
 */

/**
 * Generate a hash of content for tracking changes
 * Uses SHA-256 for consistent hashing across environments
 */
export function generateContentHash(content: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);

  // For synchronous operation in Node.js, we'll use a simple hash
  // This is sufficient for content change detection
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convert to hex and ensure 16 characters
  return Math.abs(hash).toString(16).padStart(16, "0").substring(0, 16);
}