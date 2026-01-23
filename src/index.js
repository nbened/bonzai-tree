#!/usr/bin/env node
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BONZAI_DIR = 'bonzai';
const TEMPLATE_DIR = join(__dirname, '..', 'payload-bonzai');

function init() {
  const currentDir = process.cwd();
  const bonzaiPath = join(currentDir, BONZAI_DIR);

  if (existsSync(bonzaiPath)) {
    console.log(`📁 ${BONZAI_DIR}/ already exists`);
    return;
  }

  mkdirSync(bonzaiPath, { recursive: true });
  copyFileSync(join(TEMPLATE_DIR, 'config.json'), join(bonzaiPath, 'config.json'));
  console.log(`📁 Created ${BONZAI_DIR}/ folder with config.json`);
  console.log(`📝 Edit ${BONZAI_DIR}/config.json to configure your burn rules`);
  console.log(`🔥 Run 'bburn' to analyze your codebase`);
  console.log('');
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│                                                             │');
  console.log('│   🌳 Run `bgraph` to configure provider, frequency & more   │');
  console.log('│                                                             │');
  console.log('└─────────────────────────────────────────────────────────────┘');
}

init();
