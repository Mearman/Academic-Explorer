import { extractOpenAlexPaths } from './scripts/extract-openalex-paths.ts';

const result = await extractOpenAlexPaths({ searchDir: './docs/openalex-docs' });

const urlTypes = new Map();
const specialPaths = [];

result.urls.forEach(url => {
  const path = url.replace('https://api.openalex.org/', '');
  const firstSegment = path.split('/')[0].split('?')[0];

  urlTypes.set(firstSegment, (urlTypes.get(firstSegment) || 0) + 1);

  // Collect special cases
  const standardTypes = ['works', 'authors', 'sources', 'institutions', 'topics', 'publishers', 'funders', 'concepts', 'keywords'];
  const isEntityId = /^[A-Z][0-9]/.test(firstSegment);

  if (!standardTypes.includes(firstSegment) && !isEntityId) {
    specialPaths.push(path);
  }
});

console.log('URL Types and Counts:');
Array.from(urlTypes.entries()).sort((a,b) => b[1] - a[1]).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

console.log('\nSpecial/Non-standard paths:');
specialPaths.slice(0, 20).forEach(path => console.log(`  ${path}`));
if (specialPaths.length > 20) console.log(`  ... and ${specialPaths.length - 20} more`);

console.log(`\nTotal URLs: ${result.urls.length}`);
console.log(`Special paths: ${specialPaths.length}`);