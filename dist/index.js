#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const BONZAI_DIR = 'bonzai';
const SPECS_FILE = 'specs.md';
const DEFAULT_SPECS = `# Bonzai Specs

Define your cleanup requirements below. btrim will follow these instructions.

## Example:
- Remove unused imports
- Delete files matching pattern "*.tmp"
- Clean up console.log statements
`;
function init() {
    const currentDir = process.cwd();
    const bonzaiPath = (0, path_1.join)(currentDir, BONZAI_DIR);
    const specsPath = (0, path_1.join)(bonzaiPath, SPECS_FILE);
    if ((0, fs_1.existsSync)(bonzaiPath)) {
        console.log(`📁 ${BONZAI_DIR}/ already exists`);
        return;
    }
    (0, fs_1.mkdirSync)(bonzaiPath, { recursive: true });
    (0, fs_1.writeFileSync)(specsPath, DEFAULT_SPECS);
    console.log(`📁 Created ${BONZAI_DIR}/ folder with specs.md`);
    console.log(`📝 Edit ${BONZAI_DIR}/specs.md to define your cleanup rules`);
    console.log(`🔥 Run 'btrim' to start a cleanup session`);
}
init();
