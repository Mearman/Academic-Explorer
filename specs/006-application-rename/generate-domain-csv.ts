#!/usr/bin/env -S npx tsx

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DELAY_MS = 1000; // 1 second delay between WHOIS checks
const TLDS_TO_CHECK = ['com', 'io', 'net', 'org', 'app', 'dev'];

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

// Helper function to check WHOIS availability
function checkWhoisAvailability(domain: string): boolean {
  try {
    const output = execSync(`whois ${domain}`, {
      timeout: 10000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const lowerOutput = output.toLowerCase();

    // Check if this is just registry information (not domain-specific)
    const isRegistryInfo = /domain:\s+(app|dev|io|com|net|org)\s*$/m.test(lowerOutput);
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
  } catch (error) {
    // On error, assume taken
    return false;
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

// Read the JSON database
const dbPath = path.join(__dirname, 'all-names-database.json');
const db: Database = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log('🔍 Starting WHOIS verification...');
console.log(`⏱️  Delay: ${DELAY_MS}ms between checks`);
console.log(`📊 Checking ${db.names.length} names × ${TLDS_TO_CHECK.length} TLDs`);
console.log(`⏳ Estimated time: ~${Math.ceil((db.names.length * TLDS_TO_CHECK.length * DELAY_MS) / 1000 / 60)} minutes\n`);

// CSV header
const header = [
  'Name',
  'Type',
  'Category',
  'Research Score',
  '.com',
  '.io',
  '.net',
  '.co.uk',
  '.dev',
  '.app',
  '.org',
  'Status',
  'Rank',
  'Meaning',
  'Vibe',
  'Recommendation'
].join(',');

const rows: string[] = [];
let fullyAvailable = 0;
let partiallyAvailable = 0;
let allTaken = 0;

for (let i = 0; i < db.names.length; i++) {
  const name = db.names[i];
  console.log(`[${i + 1}/${db.names.length}] Checking: ${name.name}`);

  // Check WHOIS for each TLD
  const availability: Record<string, boolean> = {};

  for (const tld of TLDS_TO_CHECK) {
    const domain = `${name.name.toLowerCase()}.${tld}`;
    availability[tld] = checkWhoisAvailability(domain);

    if (DELAY_MS > 0) {
      execSync(`sleep ${DELAY_MS / 1000}`, { stdio: 'ignore' });
    }
  }

  // Calculate availability count
  const availableCount = Object.values(availability).filter(v => v).length;

  // Determine status
  let status: string;
  if (availableCount === TLDS_TO_CHECK.length) {
    status = 'fully-available';
    fullyAvailable++;
  } else if (availableCount > 0) {
    status = 'partial';
    partiallyAvailable++;
  } else {
    status = 'taken';
    allTaken++;
  }

  console.log(`✅ ${name.name}: ${availableCount}/${TLDS_TO_CHECK.length} available\n`);

  // Build CSV row
  const row = [
    escapeCsv(name.name),
    escapeCsv(name.type),
    escapeCsv(name.category),
    name.researchScore || '',
    formatAvailable(availability.com),
    formatAvailable(availability.io),
    formatAvailable(availability.net),
    formatAvailable(name.availability?.['co.uk']), // From existing data
    formatAvailable(availability.dev),
    formatAvailable(availability.app),
    formatAvailable(availability.org),
    escapeCsv(status),
    name.rank || '',
    escapeCsv(name.meaning),
    escapeCsv(name.vibe),
    escapeCsv(name.recommendation)
  ].join(',');

  rows.push(row);
}

// Write CSV
const csv = [header, ...rows].join('\n');
const outputPath = path.join(__dirname, 'domain-availability-matrix.csv');
fs.writeFileSync(outputPath, csv, 'utf8');

console.log(`\n✅ CSV generated: ${outputPath}`);
console.log('\n📈 Final statistics:');
console.log(`   Total names: ${db.names.length}`);
console.log(`   Fully available: ${fullyAvailable}`);
console.log(`   Partially available: ${partiallyAvailable}`);
console.log(`   All taken: ${allTaken}`);
