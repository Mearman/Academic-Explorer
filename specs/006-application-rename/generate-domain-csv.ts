#!/usr/bin/env -S npx tsx

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import dns from 'dns/promises';

const execAsync = promisify(exec);

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TLDS_TO_CHECK = ['com', 'io', 'net', 'org', 'app', 'dev', 'co.uk'];
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const RECHECK_THRESHOLD_HOURS = 24;

// Method selection: 'rdap' | 'dns' | 'whois' | 'auto'
const CHECK_METHOD: 'rdap' | 'dns' | 'whois' | 'auto' = 'auto';

// RDAP endpoints by TLD
const RDAP_SERVERS: Record<string, string> = {
  'com': 'https://rdap.verisign.com/com/v1/domain',
  'net': 'https://rdap.verisign.com/net/v1/domain',
  'org': 'https://rdap.publicinterestregistry.org/rdap/domain',
  'io': 'https://rdap.identitydigital.services/rdap/domain',
  'app': 'https://pubapi.registry.google/rdap/domain',
  'dev': 'https://pubapi.registry.google/rdap/domain',
  'co.uk': 'https://rdap.nominet.uk/uk/domain'
};

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

// Method 1: RDAP (Registration Data Access Protocol)
async function checkRdapAvailability(domain: string, tld: string, retryCount = 0): Promise<boolean> {
  const rdapServer = RDAP_SERVERS[tld];
  if (!rdapServer) {
    console.log(`  ⚠️  No RDAP server for .${tld}, falling back to WHOIS`);
    return checkWhoisAvailability(domain, retryCount);
  }

  const url = `${rdapServer}/${domain}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/rdap+json'
      },
      signal: AbortSignal.timeout(10000)
    });

    // RDAP returns 404 for available domains, 200 for registered domains
    if (response.status === 404) {
      return true; // Domain is available
    } else if (response.status === 200) {
      return false; // Domain is registered
    } else if (response.status === 429) {
      // Rate limited
      if (retryCount < MAX_RETRIES) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
        console.log(`  ⏳ RDAP rate limit for ${domain}, waiting ${backoffMs}ms (retry ${retryCount + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return await checkRdapAvailability(domain, tld, retryCount + 1);
      }
      throw new Error('RDAP rate limit exhausted');
    } else {
      console.log(`  ⚠️  Unexpected RDAP status ${response.status} for ${domain}, falling back to WHOIS`);
      return checkWhoisAvailability(domain, retryCount);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
      if (retryCount < MAX_RETRIES) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
        console.log(`  ⏳ RDAP timeout for ${domain}, waiting ${backoffMs}ms (retry ${retryCount + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return await checkRdapAvailability(domain, tld, retryCount + 1);
      }
    }

    console.log(`  ⚠️  RDAP error for ${domain}: ${errorMessage}, falling back to WHOIS`);
    return checkWhoisAvailability(domain, retryCount);
  }
}

// Method 2: DNS-based checking (fast but less accurate)
async function checkDnsAvailability(domain: string): Promise<boolean | null> {
  try {
    // Try to resolve A records
    const addresses = await dns.resolve4(domain);
    if (addresses && addresses.length > 0) {
      return false; // Domain has DNS records, likely registered
    }
  } catch (error: unknown) {
    const errorCode = (error as any).code;

    // ENOTFOUND = no DNS records = likely available
    // ENODATA = domain exists but no A records
    if (errorCode === 'ENOTFOUND') {
      // Try NS records as additional check
      try {
        const nsRecords = await dns.resolveNs(domain);
        if (nsRecords && nsRecords.length > 0) {
          return false; // Has nameservers = registered
        }
      } catch {
        return true; // No NS records either = likely available
      }
    } else if (errorCode === 'ENODATA') {
      // Domain exists but no A records - check NS
      try {
        const nsRecords = await dns.resolveNs(domain);
        return nsRecords.length === 0; // No NS = might be available
      } catch {
        return null; // Uncertain
      }
    }
  }

  return null; // Uncertain - should use another method
}

// Method 3: WHOIS (fallback method)
async function checkWhoisAvailability(domain: string, retryCount = 0): Promise<boolean> {
  try {
    const { stdout: output } = await execAsync(`whois ${domain}`, {
      timeout: 20000,
      encoding: 'utf8'
    });

    let lowerOutput = output.toLowerCase();

    // Check if we got registry referral info
    const referMatch = output.match(/refer:\s+(\S+)/i);
    if (referMatch) {
      const referServer = referMatch[1];
      try {
        const { stdout: referOutput } = await execAsync(`whois -h ${referServer} ${domain}`, {
          timeout: 20000,
          encoding: 'utf8'
        });
        lowerOutput = referOutput.toLowerCase();
      } catch {
        // If referral fails, continue with original output
      }
    }

    // Check if this is just registry information
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

    return false; // If uncertain, assume taken
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    const fullError = error instanceof Error ? error.message : String(error);

    const rateLimitPatterns = [
      'rate limit',
      'too many requests',
      'quota exceeded',
      'try again later',
      'throttle',
    ];

    const isRateLimit = rateLimitPatterns.some(pattern => errorMessage.includes(pattern));
    const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('timed out');

    if ((isRateLimit || isTimeout) && retryCount < MAX_RETRIES) {
      const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
      const reason = isRateLimit ? 'rate limit' : 'timeout';
      console.log(`  ⏳ WHOIS ${reason} for ${domain}, waiting ${backoffMs}ms (retry ${retryCount + 1}/${MAX_RETRIES})...`);

      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return await checkWhoisAvailability(domain, retryCount + 1);
    }

    if (!isRateLimit && !isTimeout) {
      console.log(`  ⚠️  Unexpected WHOIS error for ${domain}: ${fullError}`);
    } else {
      console.log(`  ❌ Max retries exhausted for ${domain} (${fullError})`);
    }

    return false; // On error, assume taken
  }
}

// Unified checking function with method selection and fallback
async function checkDomainAvailability(name: string, tld: string, method: typeof CHECK_METHOD = CHECK_METHOD): Promise<boolean | null> {
  const domain = `${name.toLowerCase()}.${tld}`;

  try {
    switch (method) {
      case 'rdap':
        return await checkRdapAvailability(domain, tld);

      case 'dns':
        const dnsResult = await checkDnsAvailability(domain);
        if (dnsResult !== null) {
          return dnsResult;
        }
        // Fall through to RDAP if DNS is uncertain
        console.log(`  ⚠️  DNS uncertain for ${domain}, trying RDAP...`);
        return await checkRdapAvailability(domain, tld);

      case 'whois':
        return await checkWhoisAvailability(domain);

      case 'auto':
      default:
        // Auto mode: Consensus-based checking (fastest to slowest)
        // Strategy: DNS (70ms) → RDAP (100ms) → WHOIS (500-1000ms)
        // Require two methods to agree before marking as taken OR available

        // Step 1: DNS check (fastest)
        const dnsCheck = await checkDnsAvailability(domain);

        // Step 2: RDAP check (fast)
        let rdapCheck: boolean | null = null;
        try {
          rdapCheck = await checkRdapAvailability(domain, tld);
        } catch {
          rdapCheck = null;
        }

        // Early exit: If both fast methods agree, return immediately
        if (dnsCheck === false && rdapCheck === false) {
          return false; // Consensus: TAKEN (DNS + RDAP agree)
        }
        if (dnsCheck === true && rdapCheck === true) {
          return true; // Consensus: AVAILABLE (DNS + RDAP agree)
        }

        // No consensus from fast methods - check WHOIS for tie-breaker (slowest)
        const whoisCheck = await checkWhoisAvailability(domain);

        // Count votes for TAKEN (false)
        const takenVotes = [
          dnsCheck === false,
          rdapCheck === false,
          whoisCheck === false
        ].filter(Boolean).length;

        // Count votes for AVAILABLE (true)
        const availableVotes = [
          dnsCheck === true,
          rdapCheck === true,
          whoisCheck === true
        ].filter(Boolean).length;

        // Require 2+ votes to reach consensus
        if (takenVotes >= 2) {
          return false; // Consensus: TAKEN (2+ methods agree)
        }

        if (availableVotes >= 2) {
          return true; // Consensus: AVAILABLE (2+ methods agree)
        }

        // No consensus - uncertain
        // Leave CSV field empty instead of defaulting
        return null;
    }
  } catch (error) {
    console.log(`  ❌ All methods failed for ${domain}, assuming taken`);
    return false;
  }
}

// Helper function to check if a domain needs rechecking
function needsRecheck(lastUpdated: string): boolean {
  if (!lastUpdated) return true;

  try {
    const lastCheck = new Date(lastUpdated);
    const now = new Date();
    const hoursSinceCheck = (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60);
    return hoursSinceCheck >= RECHECK_THRESHOLD_HOURS;
  } catch {
    return true;
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
function formatAvailable(available: boolean | null | undefined): string {
  if (available === true) return '✅';
  if (available === false) return '❌';
  if (available === null) return ''; // No consensus - leave empty
  return '?'; // Unknown/not checked yet
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

  if (lines.length <= 1) return rows;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const columns: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];

      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          current += '"';
          j++;
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
  const dbPath = path.join(__dirname, 'all-names-database.json');
  const db: Database = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  const csvPath = path.join(__dirname, 'domain-availability-matrix.csv');
  const existingRows = new Map<string, CsvRow>();

  if (fs.existsSync(csvPath)) {
    console.log('📄 Reading existing CSV...');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const parsed = parseCsv(csvContent);
    parsed.forEach((row, name) => existingRows.set(name, row));
    console.log(`   Found ${existingRows.size} existing rows\n`);
  }

  const allRows = new Map<string, CsvRow>(existingRows);
  const csvWriter = new CsvWriter();

  console.log('🔍 Starting domain availability verification...');
  console.log(`🎯 Method: ${CHECK_METHOD.toUpperCase()}`);
  if (CHECK_METHOD === 'auto') {
    console.log('   Strategy: DNS (70ms) → RDAP (100ms) → WHOIS (500ms) - consensus voting');
    console.log('   Rule: Require 2+ methods to agree (taken OR available)');
  }
  console.log(`📊 Checking ${db.names.length} names × ${TLDS_TO_CHECK.length} TLDs (${TLDS_TO_CHECK.join(', ')})`);
  console.log(`⏰ Skip check if updated within ${RECHECK_THRESHOLD_HOURS} hours\n`);

  const startTime = Date.now();
  let checked = 0;
  let skipped = 0;

  for (let i = 0; i < db.names.length; i++) {
    const name = db.names[i];
    console.log(`\n🔍 [${i + 1}/${db.names.length}] Checking all TLDs for "${name.name}"...`);
    const nameStart = Date.now();
    let nameChecks = 0;
    let nameSkips = 0;

    for (const tld of TLDS_TO_CHECK) {
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

      if (lastChecked && !needsRecheck(lastChecked)) {
        skipped++;
        nameSkips++;
        const currentValue = existingRow ?
          (tld === 'com' ? existingRow.com :
           tld === 'io' ? existingRow.io :
           tld === 'net' ? existingRow.net :
           tld === 'org' ? existingRow.org :
           tld === 'app' ? existingRow.app :
           tld === 'dev' ? existingRow.dev :
           tld === 'co.uk' ? existingRow.couk : '?') : '?';
        process.stdout.write(`  .${tld.padEnd(6)} ${currentValue} (cached)\n`);
        continue;
      }

      const available = await checkDomainAvailability(name.name, tld);
      const timestamp = new Date().toISOString();

      if (!existingRow) {
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

      csvWriter.enqueue(() => writeCsv(csvPath, allRows));

      checked++;
      nameChecks++;
      process.stdout.write(`  .${tld.padEnd(6)} ${formatAvailable(available)}\n`);
    }

    const nameDuration = ((Date.now() - nameStart) / 1000).toFixed(2);
    console.log(`  ✅ Complete in ${nameDuration}s (${nameChecks} checked, ${nameSkips} cached)`);
  }

  console.log('⏳ Waiting for all writes to complete...');
  await csvWriter.waitForCompletion();
  console.log('✅ All writes complete');

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n✅ Verification complete: ${csvPath}`);
  console.log(`⏱️  Total time: ${duration}s`);
  console.log('\n📈 Statistics:');
  console.log(`   Checks performed: ${checked}`);
  console.log(`   Checks skipped (cached): ${skipped}`);
  console.log(`   Throughput: ${(checked / parseFloat(duration)).toFixed(2)} checks/second`);
  console.log(`\n📊 Total rows in CSV: ${allRows.size}`);
}

main().catch(console.error);
