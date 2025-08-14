#!/usr/bin/env node

/**
 * Quick diagnostic script to identify the works page loading issue
 * Uses simple HTTP requests to avoid memory issues with full E2E tests
 */

const http = require('http');
const { spawn } = require('child_process');

const BASE_URL = 'http://localhost:3001';
const WORK_ID = 'W2741809807';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkServer() {
  return new Promise((resolve) => {
    const req = http.get(BASE_URL, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(5000);
  });
}

async function checkWorksPage() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE_URL}/works/${WORK_ID}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: body.substring(0, 1000),
          hasContent: body.includes('mantine-Card-root') || body.includes('Academic Explorer'),
          isLoading: body.includes('animate-pulse'),
        });
      });
    });
    req.on('error', (error) => resolve({ error: error.message }));
    req.setTimeout(10000);
  });
}

async function testOpenAlexAPI() {
  const https = require('https');
  return new Promise((resolve) => {
    const req = https.get(`https://api.openalex.org/works/${WORK_ID}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            hasData: !!data.id,
            title: data.title || data.display_name,
          });
        } catch (e) {
          resolve({ error: 'Invalid JSON response' });
        }
      });
    });
    req.on('error', (error) => resolve({ error: error.message }));
    req.setTimeout(10000);
  });
}

async function main() {
  console.log('🔍 Quick Diagnostic for Works Page Loading Issue');
  console.log('================================================\n');

  // Test 1: Check OpenAlex API directly
  console.log('1. Testing OpenAlex API directly...');
  const apiResult = await testOpenAlexAPI();
  if (apiResult.error) {
    console.log(`   ❌ API Error: ${apiResult.error}`);
  } else {
    console.log(`   ✅ API Response: ${apiResult.statusCode}`);
    console.log(`   📊 Has Data: ${apiResult.hasData}`);
    console.log(`   📝 Title: ${apiResult.title || 'N/A'}`);
  }

  // Test 2: Check if dev server is running
  console.log('\n2. Checking development server...');
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log('   ❌ Server not running. Please start with: pnpm dev');
    return;
  }
  console.log('   ✅ Server is running');

  // Test 3: Check works page response
  console.log('\n3. Testing works page response...');
  const pageResult = await checkWorksPage();
  if (pageResult.error) {
    console.log(`   ❌ Page Error: ${pageResult.error}`);
  } else {
    console.log(`   📄 Status Code: ${pageResult.statusCode}`);
    console.log(`   🎯 Has Content: ${pageResult.hasContent}`);
    console.log(`   ⏳ Is Loading: ${pageResult.isLoading}`);
    
    if (pageResult.statusCode === 200) {
      console.log('   📄 First 200 chars of response:');
      console.log(`   "${pageResult.body.substring(0, 200)}..."`);
    }
  }

  // Test 4: Check if it's a timing issue
  console.log('\n4. Testing after delay (simulating user wait)...');
  await sleep(5000);
  const delayedResult = await checkWorksPage();
  
  if (delayedResult.error) {
    console.log(`   ❌ Delayed test error: ${delayedResult.error}`);
  } else {
    console.log(`   ⏳ Still Loading: ${delayedResult.isLoading}`);
    console.log(`   🎯 Has Content: ${delayedResult.hasContent}`);
  }

  // Summary
  console.log('\n📋 DIAGNOSTIC SUMMARY');
  console.log('====================');
  
  if (apiResult.hasData && serverRunning) {
    if (pageResult.isLoading && delayedResult.isLoading) {
      console.log('❌ ISSUE CONFIRMED: Page stuck in loading state');
      console.log('   - OpenAlex API is working ✅');
      console.log('   - Server is running ✅');
      console.log('   - Page responds but stuck loading ❌');
      console.log('   - Likely React state management issue');
    } else if (pageResult.hasContent) {
      console.log('✅ Page appears to be working correctly');
    } else {
      console.log('⚠️  Page loading but unclear state');
    }
  } else {
    console.log('❌ Underlying infrastructure issues detected');
  }

  console.log('\nTo run full E2E tests: pnpm test:e2e:diagnose');
}

main().catch(console.error);