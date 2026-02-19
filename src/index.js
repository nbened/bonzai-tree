#!/usr/bin/env node
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ENABLED_LOOPS } from './loops.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BONZAI_DIR = 'bonzai';
const TEMPLATE_DIR = join(__dirname, 'payload-bonzai');

function showHelp() {
  console.log(`
Usage: npx bonzai-tree [option]

Options:
  (no option)   Initialize and launch bonzai
  --help        Show this help message`);
}

function init() {
  const currentDir = process.cwd();
  const bonzaiPath = join(currentDir, BONZAI_DIR);

  if (existsSync(bonzaiPath)) {
    console.log(`${BONZAI_DIR}/ already exists`);
    return;
  }

  mkdirSync(bonzaiPath, { recursive: true });
  copyFileSync(join(TEMPLATE_DIR, 'config.json'), join(bonzaiPath, 'config.json'));
  console.log(`Created ${BONZAI_DIR}/ folder with config.json`);
}

async function main() {
  const args = process.argv.slice(2);
  const flag = args[0];

  if (flag === '--help') {
    showHelp();
    return;
  }

  // Init if needed, then launch server
  init();

  if (ENABLED_LOOPS.includes('visualization') || ENABLED_LOOPS.includes('backend')) {
    const { main: configMain } = await import('./bconfig.js');
    return configMain?.();
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
