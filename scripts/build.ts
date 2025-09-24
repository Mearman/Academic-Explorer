#!/usr/bin/env tsx

import { EventEmitter } from 'events';
import { spawn } from 'child_process';

// Increase EventEmitter max listeners globally
EventEmitter.defaultMaxListeners = 20;

// Also set it for process specifically
process.setMaxListeners(20);

console.log('✅ Max listeners increased to 20');

// Execute the build command
const child = spawn('npx', ['nx', 'run-many', '-t', 'build'], {
  stdio: 'inherit'
});

child.on('close', (code) => {
  process.exit(code || 0);
});