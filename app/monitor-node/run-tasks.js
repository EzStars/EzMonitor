#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const baseDir = __dirname;

// Task 1: Create directories
console.log('========== Running create-dirs.js ==========');
const dirs = [
  'src/monitor',
  'src/monitor/dto',
  'src/monitor/interfaces',
  'src/monitor/services',
  'src/monitor/controllers',
  'src/monitor/entities'
];

dirs.forEach(dir => {
  const fullPath = path.join(baseDir, dir);
  fs.mkdirSync(fullPath, { recursive: true });
  console.log(`Created: ${fullPath}`);
});

console.log('All directories created successfully!');
console.log('');

// Task 2: Install dependencies
console.log('========== Installing dependencies with pnpm ==========');
try {
  console.log('Running: pnpm add class-validator class-transformer');
  const output = execSync('pnpm add class-validator class-transformer', {
    cwd: baseDir,
    stdio: 'inherit'
  });
  console.log('Dependencies installed successfully!');
} catch (error) {
  console.error('Error installing dependencies:', error.message);
  process.exit(1);
}
