#!/usr/bin/env -S npx tsx

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
let CONCURRENCY = 20; // Start with 20 names in parallel (will adapt)
const MIN_CONCURRENCY = 5;
const MAX_CONCURRENCY = 50;
const TLDS_TO_CHECK = ['com', 'io', 'net', 'org', 'app', 'dev', 'co.uk'];
const MAX_RETRIES = 3; // Max retries on rate limit
const INITIAL_BACKOFF_MS = 1000; // Start with 1 second backoff
const RECHECK_THRESHOLD_HOURS = 24; // Only recheck if older than 24 hours

// Adaptive concurrency tracking
let consecutiveSuccesses = 0;
let rateLimitHits = 0;

// Type definitions
interface NameEntry {
  name: string;
  type?: string;
  category?: string;
  researchScore?: number;
  meaning?: string;
  vibe?: string;
  recommendation?: string;
  rank?: number;
  availability?: {
    status?: string;
    verified?: boolean;
    'co.uk'?: boolean;
  };
}

interface Database {
  names: NameEntry[];
}

interface DomainCheckResult {
  name: string;
  availability: Record<string, boolean>;
}

interface CsvRow {
  name: string;
  type: string;
  category: string;
  researchScore: string;
  com: string;
  comChecked: string;
  io: string;
  ioChecked: string;
  net: string;
  netChecked: string;
  couk: string;
  coukChecked: string;
  dev: string;
  devChecked: string;
  app: string;
  appChecked: string;
  org: string;
  orgChecked: string;
  status: string;
  rank: string;
  meaning: string;
  vibe: string;
  recommendation: string;
}

// Helper function to check WHOIS availability with retry on rate limit
async function checkWhoisAvailability(domain: string, retryCount = 0): Promise<boolean> {
  try {
    const { stdout: output } = await execAsync(`whois ${domain}`, {
      timeout: 20000,  // Increased to 20s for heavy load conditions
      encoding: 'utf8'
    });

    let lowerOutput = output.toLowerCase();

    // Check if we got registry referral info instead of domain-specific info
    // If so, follow the referral to the authoritative WHOIS server
    const referMatch = output.match(/refer:\s+(\S+)/i);
    if (referMatch) {
      const referServer = referMatch[1];
      try {
        const { stdout: referOutput } = await execAsync(`whois -h ${referServer} ${domain}`, {
          timeout: 20000,  // Increased to 20s for heavy load conditions
          encoding: 'utf8'
        });
        lowerOutput = referOutput.toLowerCase();
      } catch {
        // If referral fails, continue with original output
      }
    }

    // Check if this is just registry information (not domain-specific)
    // Registry info has "domain: COM" (or other TLD) AND "nserver:" entries for TLD nameservers
    const hasTldDomain = /domain:\s+(app|dev|io|com|net|org)\s*$/m.test(lowerOutput);
    const hasTldNameservers = /nserver:.*gtld-servers/i.test(lowerOutput);
    const isRegistryInfo = hasTldDomain && hasTldNameservers;

    if (isRegistryInfo) {
      return true; // Registry info = domain not registered
    }

    // Patterns that indicate domain IS available
    const availablePatterns = [
      'no match for',
      'not found',
      'no entries found',
      'no data found',
      'domain not found',
      'status: available',
      'no matching record',
      'not registered',
      'available for registration',
    ];

    // Check for availability first
    if (availablePatterns.some(pattern => lowerOutput.includes(pattern))) {
      return true;
    }

    // Patterns that indicate domain is NOT available (registered)
    const registeredPatterns = [
      'registrar:',
      'domain status:',
      'creation date:',
      'registry domain id:',
      'registrant organization:',
      'name server:',
      'registered on:',
      'registration date:',
    ];

    if (registeredPatterns.some(pattern => lowerOutput.includes(pattern))) {
      return false;
    }

    // If uncertain, assume taken (safer)
    return false;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    const fullError = error instanceof Error ? error.message : String(error);

    // Check for rate limit patterns
    const rateLimitPatterns = [
      'rate limit',
      'too many requests',
      'quota exceeded',
      'try again later',
      'throttle',
    ];

    const isRateLimit = rateLimitPatterns.some(pattern => errorMessage.includes(pattern));

    // Check for timeout
    const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('timed out');

    if ((isRateLimit || isTimeout) && retryCount < MAX_RETRIES) {
      // Exponential backoff: 1s, 2s, 4s
      const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
      const reason = isRateLimit ? 'rate limit' : 'timeout';
      console.log(`  ⏳ ${reason} for ${domain}, waiting ${backoffMs}ms (retry ${retryCount + 1}/${MAX_RETRIES})...`);

      // Track rate limit hit
      if (isRateLimit) rateLimitHits++;

      // Async sleep
      await new Promise(resolve => setTimeout(resolve, backoffMs));

      // Retry
      return await checkWhoisAvailability(domain, retryCount + 1);
    }

    // Log unexpected errors
    if (!isRateLimit && !isTimeout) {
      console.log(`  ⚠️  Unexpected error for ${domain}: ${fullError}`);
    } else {
      console.log(`  ❌ Max retries exhausted for ${domain} (${fullError})`);
    }

    // On error (including exhausted retries), assume taken
    return false;
  }
}

// Helper function to check a single TLD for a name
async function checkSingleTldAvailability(name: string, tld: string): Promise<boolean> {
  const domain = `${name.toLowerCase()}.${tld}`;
  return await checkWhoisAvailability(domain);
}

// Helper function to check if a domain needs rechecking
function needsRecheck(lastUpdated: string): boolean {
  if (!lastUpdated) return true; // No timestamp = needs check

  try {
    const lastCheck = new Date(lastUpdated);
    const now = new Date();
    const hoursSinceCheck = (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60);
    return hoursSinceCheck >= RECHECK_THRESHOLD_HOURS;
  } catch {
    return true; // Invalid timestamp = needs check
  }
}

// Helper function to escape CSV values
function escapeCsv(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Helper to format availability
function formatAvailable(available: boolean | undefined): string {
  if (available === true) return '✅';
  if (available === false) return '❌';
  return '?';
}

// Helper to write CSV
function writeCsv(csvPath: string, rows: Map<string, CsvRow>): void {
  const header = [
    'Name',
    'Type',
    'Category',
    'Research Score',
    '.com',
    '.com Checked',
    '.io',
    '.io Checked',
    '.net',
    '.net Checked',
    '.co.uk',
    '.co.uk Checked',
    '.dev',
    '.dev Checked',
    '.app',
    '.app Checked',
    '.org',
    '.org Checked',
    'Status',
    'Rank',
    'Meaning',
    'Vibe',
    'Recommendation'
  ].join(',');

  const csvRows = Array.from(rows.values()).map(row => {
    return [
      escapeCsv(row.name),
      escapeCsv(row.type),
      escapeCsv(row.category),
      row.researchScore,
      row.com,
      row.comChecked,
      row.io,
      row.ioChecked,
      row.net,
      row.netChecked,
      row.couk,
      row.coukChecked,
      row.dev,
      row.devChecked,
      row.app,
      row.appChecked,
      row.org,
      row.orgChecked,
      escapeCsv(row.status),
      row.rank,
      escapeCsv(row.meaning),
      escapeCsv(row.vibe),
      escapeCsv(row.recommendation)
    ].join(',');
  });

  const csv = [header, ...csvRows].join('\n');
  fs.writeFileSync(csvPath, csv, 'utf8');
}

// Helper to parse CSV
function parseCsv(csvContent: string): Map<string, CsvRow> {
  const lines = csvContent.trim().split('\n');
  const rows = new Map<string, CsvRow>();

  if (lines.length <= 1) return rows; // Empty or header only

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Simple CSV parsing (handles quoted fields)
    const columns: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];

      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          current += '"';
          j++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        columns.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    columns.push(current);

    if (columns.length >= 23) {
      const name = columns[0].replace(/^"|"$/g, '');
      rows.set(name, {
        name,
        type: columns[1],
        category: columns[2],
        researchScore: columns[3],
        com: columns[4],
        comChecked: columns[5],
        io: columns[6],
        ioChecked: columns[7],
        net: columns[8],
        netChecked: columns[9],
        couk: columns[10],
        coukChecked: columns[11],
        dev: columns[12],
        devChecked: columns[13],
        app: columns[14],
        appChecked: columns[15],
        org: columns[16],
        orgChecked: columns[17],
        status: columns[18],
        rank: columns[19],
        meaning: columns[20],
        vibe: columns[21],
        recommendation: columns[22]
      });
    }
  }

  return rows;
}

// Dedicated CSV writer service with queue
class CsvWriter {
  private queue: Array<() => void> = [];
  private processing = false;

  enqueue(writeTask: () => void) {
    this.queue.push(writeTask);
    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        task();
        // Small delay to prevent overwhelming filesystem
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    this.processing = false;
  }

  async waitForCompletion() {
    while (this.processing || this.queue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// Main execution
async function main() {
  // Read the JSON database
  const dbPath = path.join(__dirname, 'all-names-database.json');
  const db: Database = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  // Read existing CSV if it exists
  const csvPath = path.join(__dirname, 'domain-availability-matrix.csv');
  const existingRows = new Map<string, CsvRow>();

  if (fs.existsSync(csvPath)) {
    console.log('📄 Reading existing CSV...');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const parsed = parseCsv(csvContent);
    parsed.forEach((row, name) => existingRows.set(name, row));
    console.log(`   Found ${existingRows.size} existing rows\n`);
  }

  // Initialize with all existing rows (preserve everything)
  const allRows = new Map<string, CsvRow>(existingRows);

  // Create dedicated CSV writer service
  const csvWriter = new CsvWriter();

  console.log('🔍 Starting parallel WHOIS verification...');
  console.log(`⚡ Adaptive concurrency: Starting at ${CONCURRENCY} (range: ${MIN_CONCURRENCY}-${MAX_CONCURRENCY})`);
  console.log(`📊 Checking ${db.names.length} names × ${TLDS_TO_CHECK.length} TLDs (${TLDS_TO_CHECK.join(', ')})`);
  console.log(`🔄 Dynamic rate limiting: Will back off on rate limit errors`);
  console.log(`⏰ Skip check if updated within ${RECHECK_THRESHOLD_HOURS} hours\n`);

  const startTime = Date.now();
  let checked = 0;

  // Process each TLD separately - check domains SEQUENTIALLY (concurrency = 1)
  for (const tld of TLDS_TO_CHECK) {
    console.log(`\n🔍 Checking .${tld} for all ${db.names.length} domains sequentially...`);
    const tldStart = Date.now();
    let completed = 0;

    // Check domains one at a time (sequential)
    for (const name of db.names) {
      const existingRow = allRows.get(name.name);

      // Check if this TLD was recently checked
      let lastChecked = '';
      if (existingRow) {
        if (tld === 'com') lastChecked = existingRow.comChecked;
        else if (tld === 'io') lastChecked = existingRow.ioChecked;
        else if (tld === 'net') lastChecked = existingRow.netChecked;
        else if (tld === 'org') lastChecked = existingRow.orgChecked;
        else if (tld === 'app') lastChecked = existingRow.appChecked;
        else if (tld === 'dev') lastChecked = existingRow.devChecked;
        else if (tld === 'co.uk') lastChecked = existingRow.coukChecked;
      }

      // Skip if recently checked
      if (lastChecked && !needsRecheck(lastChecked)) {
        completed++;
        checked++;
        const currentValue = existingRow ?
          (tld === 'com' ? existingRow.com :
           tld === 'io' ? existingRow.io :
           tld === 'net' ? existingRow.net :
           tld === 'org' ? existingRow.org :
           tld === 'app' ? existingRow.app :
           tld === 'dev' ? existingRow.dev :
           tld === 'co.uk' ? existingRow.couk : '?') : '?';
        process.stdout.write(`  [${completed}/${db.names.length}] ${name.name}.${tld}: ${currentValue} (cached)\n`);
        continue;
      }

      const available = await checkSingleTldAvailability(name.name, tld);
      const timestamp = new Date().toISOString();

      if (!existingRow) {
        // Create new row with metadata from JSON
        allRows.set(name.name, {
          name: name.name,
          type: name.type || '',
          category: name.category || '',
          researchScore: String(name.researchScore || ''),
          com: tld === 'com' ? formatAvailable(available) : '?',
          comChecked: tld === 'com' ? timestamp : '',
          io: tld === 'io' ? formatAvailable(available) : '?',
          ioChecked: tld === 'io' ? timestamp : '',
          net: tld === 'net' ? formatAvailable(available) : '?',
          netChecked: tld === 'net' ? timestamp : '',
          couk: tld === 'co.uk' ? formatAvailable(available) : '?',
          coukChecked: tld === 'co.uk' ? timestamp : '',
          dev: tld === 'dev' ? formatAvailable(available) : '?',
          devChecked: tld === 'dev' ? timestamp : '',
          app: tld === 'app' ? formatAvailable(available) : '?',
          appChecked: tld === 'app' ? timestamp : '',
          org: tld === 'org' ? formatAvailable(available) : '?',
          orgChecked: tld === 'org' ? timestamp : '',
          status: '',
          rank: String(name.rank || ''),
          meaning: name.meaning || '',
          vibe: name.vibe || '',
          recommendation: name.recommendation || ''
        });
      } else {
        // Update existing row with this TLD's result
        if (tld === 'com') {
          existingRow.com = formatAvailable(available);
          existingRow.comChecked = timestamp;
        } else if (tld === 'io') {
          existingRow.io = formatAvailable(available);
          existingRow.ioChecked = timestamp;
        } else if (tld === 'net') {
          existingRow.net = formatAvailable(available);
          existingRow.netChecked = timestamp;
        } else if (tld === 'org') {
          existingRow.org = formatAvailable(available);
          existingRow.orgChecked = timestamp;
        } else if (tld === 'app') {
          existingRow.app = formatAvailable(available);
          existingRow.appChecked = timestamp;
        } else if (tld === 'dev') {
          existingRow.dev = formatAvailable(available);
          existingRow.devChecked = timestamp;
        } else if (tld === 'co.uk') {
          existingRow.couk = formatAvailable(available);
          existingRow.coukChecked = timestamp;
        }
      }

      // Queue write via dedicated writer service (prevents file contention)
      csvWriter.enqueue(() => writeCsv(csvPath, allRows));

      completed++;
      checked++;
      process.stdout.write(`  [${completed}/${db.names.length}] ${name.name}.${tld}: ${formatAvailable(available)}\n`);
    }

    const tldDuration = ((Date.now() - tldStart) / 1000).toFixed(2);
    console.log(`✅ .${tld} complete in ${tldDuration}s\n`);
  }

  // Wait for all queued writes to complete
  console.log('⏳ Waiting for all writes to complete...');
  await csvWriter.waitForCompletion();
  console.log('✅ All writes complete');

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n✅ Verification complete: ${csvPath}`);
  console.log(`⏱️  Total time: ${duration}s`);
  console.log('\n📈 Statistics:');
  console.log(`   Total checks performed: ${checked}`);
  console.log(`   Throughput: ${(checked / parseFloat(duration)).toFixed(2)} checks/second`);
  console.log(`\n📊 Total rows in CSV: ${allRows.size}`);
}

main().catch(console.error);
