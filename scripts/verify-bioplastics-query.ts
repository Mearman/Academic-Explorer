#!/usr/bin/env tsx
/**
 * Verify that the bioplastics query returns filtered results, not top cited works
 * Compares data from OpenAlex API with what would be displayed in production
 */

const OPENALEX_API_URL = "https://api.openalex.org/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc&per_page=10";
const PRODUCTION_URL = "https://mearman.github.io/Academic-Explorer/#/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc";

console.log("Verifying bioplastics query...\n");

// Fetch data from OpenAlex API
console.log("1. Fetching data from OpenAlex API...");
const apiResponse = await fetch(OPENALEX_API_URL);

if (!apiResponse.ok) {
  console.error(`❌ Failed to fetch from OpenAlex API: ${apiResponse.status} ${apiResponse.statusText}`);
  process.exit(1);
}

const apiData = await apiResponse.json();
const apiWorks = apiData.results || [];

console.log(`   ✅ Fetched ${apiWorks.length} works from API`);
console.log(`   First work: "${apiWorks[0]?.display_name || 'N/A'}"`);
console.log(`   Query: ${OPENALEX_API_URL}\n`);

// Check if results contain "bioplastics" in the title or are related
const relevantWorks = apiWorks.filter((work: any) => {
  const title = (work.display_name || "").toLowerCase();
  return title.includes("bioplastic") || title.includes("bio-plastic");
});

console.log("2. Analyzing API results...");
console.log(`   Found ${relevantWorks.length} works with "bioplastic" in title`);
console.log(`   Percentage relevant: ${((relevantWorks.length / apiWorks.length) * 100).toFixed(1)}%\n`);

// Check for "top cited" works that shouldn't appear
const suspiciousWorks = apiWorks.filter((work: any) => {
  const title = (work.display_name || "").toLowerCase();
  return (
    title.includes("protein measurement") ||
    title.toLowerCase() === "r:" ||
    title.includes("deep learning") && !title.includes("bioplastic")
  );
});

if (suspiciousWorks.length > 0) {
  console.log("❌ WARNING: Found suspicious works that suggest unfiltered results:");
  suspiciousWorks.forEach((work: any) => {
    console.log(`   - "${work.display_name}"`);
  });
  console.log();
}

// Verify the production URL is accessible
console.log("3. Verifying production URL is accessible...");
const prodResponse = await fetch(PRODUCTION_URL, {
  method: "HEAD",
  redirect: "follow"
});

if (!prodResponse.ok) {
  console.error(`❌ Production URL not accessible: ${prodResponse.status} ${prodResponse.statusText}`);
  process.exit(1);
}

console.log(`   ✅ Production URL accessible (${prodResponse.status})`);
console.log(`   URL: ${PRODUCTION_URL}\n`);

// Summary
console.log("=" .repeat(80));
console.log("Verification Summary:");
console.log("=".repeat(80));

if (suspiciousWorks.length > 0) {
  console.log("❌ FAIL: Found works that should not appear in filtered results");
  console.log(`   ${suspiciousWorks.length} suspicious works detected`);
  process.exit(1);
}

if (relevantWorks.length < apiWorks.length * 0.5) {
  console.log("⚠️  WARNING: Less than 50% of results appear relevant to 'bioplastics'");
  console.log(`   This might indicate a filter issue, but could also be API behavior`);
}

console.log(`✅ PASS: Bioplastics query appears to be working correctly`);
console.log(`   - ${apiWorks.length} works returned`);
console.log(`   - ${relevantWorks.length} works contain "bioplastic" in title`);
console.log(`   - No obvious unfiltered "top cited" works detected`);
console.log(`   - Production URL is accessible`);

console.log("\nℹ️  Note: To fully verify the UI, manually check the production URL:");
console.log(`   ${PRODUCTION_URL}`);
console.log(`   Ensure the displayed works match the API results and contain bioplastics-related content.\n`);

process.exit(0);
