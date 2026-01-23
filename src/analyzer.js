import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Static analyzer for codebase
 * Runs ESLint, TypeScript, and custom checks based on config.json
 */

/**
 * List all files recursively, respecting common ignore patterns
 */
function listAllFiles(dir, basePath = '') {
  const ignorePatterns = ['node_modules', '.git', '.DS_Store', 'dist', 'build', 'coverage', 'bonzai'];
  let results = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);

      if (ignorePatterns.some(p => entry.name === p) || entry.name.startsWith('.')) {
        continue;
      }

      if (entry.isDirectory()) {
        results = results.concat(listAllFiles(fullPath, relativePath));
      } else {
        results.push({
          path: relativePath,
          fullPath: fullPath
        });
      }
    }
  } catch (e) {
    // Directory access error, skip
  }

  return results;
}

/**
 * Run ESLint to detect unused imports and variables
 */
function runEslintAnalysis(rootDir) {
  const issues = [];

  try {
    execSync('which eslint', { encoding: 'utf-8', stdio: 'pipe' });
  } catch {
    return { issues, skipped: true, reason: 'ESLint not installed' };
  }

  try {
    const result = execSync(
      `eslint "${rootDir}" --format json --rule "no-unused-vars: error" 2>/dev/null || true`,
      { encoding: 'utf-8', stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 }
    );

    if (result.trim()) {
      const eslintOutput = JSON.parse(result);

      for (const file of eslintOutput) {
        for (const msg of file.messages || []) {
          if (msg.ruleId && msg.ruleId.includes('no-unused')) {
            issues.push({
              file: path.relative(rootDir, file.filePath),
              line: msg.line,
              message: msg.message,
              rule: msg.ruleId
            });
          }
        }
      }
    }
  } catch (e) {
    return { issues, skipped: true, reason: 'ESLint analysis failed' };
  }

  return { issues, skipped: false };
}

/**
 * Run TypeScript compiler to check for unused locals
 */
function runTypeScriptAnalysis(rootDir) {
  const issues = [];
  const tsconfigPath = path.join(rootDir, 'tsconfig.json');

  if (!fs.existsSync(tsconfigPath)) {
    return { issues, skipped: true, reason: 'No tsconfig.json found' };
  }

  try {
    execSync('which tsc', { encoding: 'utf-8', stdio: 'pipe' });
  } catch {
    return { issues, skipped: true, reason: 'TypeScript not installed' };
  }

  try {
    const result = execSync(
      `cd "${rootDir}" && tsc --noEmit --noUnusedLocals --noUnusedParameters 2>&1 || true`,
      { encoding: 'utf-8', stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 }
    );

    const lines = result.split('\n');
    const errorRegex = /^(.+)\((\d+),(\d+)\):\s*error\s+TS(\d+):\s*(.+)$/;

    for (const line of lines) {
      const match = line.match(errorRegex);
      if (match) {
        const [, filePath, lineNum, , errorCode, message] = match;
        // TS6133 = unused variable, TS6196 = unused parameter
        if (['6133', '6196', '6198'].includes(errorCode)) {
          issues.push({
            file: path.relative(rootDir, filePath),
            line: parseInt(lineNum, 10),
            message: message,
            rule: `TS${errorCode}`
          });
        }
      }
    }
  } catch (e) {
    return { issues, skipped: true, reason: 'TypeScript analysis failed' };
  }

  return { issues, skipped: false };
}

/**
 * Check files against line limit
 */
function checkLineLimits(files, config) {
  const issues = [];
  const cfg = config.lineLimit || {};

  if (!cfg.enabled) {
    return { issues, skipped: true, reason: 'Disabled in config' };
  }

  const maxLines = cfg.limit || 500;

  for (const file of files) {
    // Skip non-code files
    if (file.path.endsWith('.json') || file.path.endsWith('.lock') || file.path.endsWith('.css')) {
      continue;
    }

    try {
      const content = fs.readFileSync(file.fullPath, 'utf-8');
      const lineCount = content.split('\n').length;

      if (lineCount > maxLines) {
        issues.push({
          file: file.path,
          count: lineCount,
          limit: maxLines
        });
      }
    } catch (e) {
      // Can't read file, skip
    }
  }

  issues.sort((a, b) => b.count - a.count);
  return { issues, skipped: false, prompt: cfg.prompt };
}

/**
 * Check folders against item limit
 */
function checkFolderLimits(files, config) {
  const issues = [];
  const cfg = config.folderLimit || {};

  if (!cfg.enabled) {
    return { issues, skipped: true, reason: 'Disabled in config' };
  }

  const maxItems = cfg.limit || 20;
  const folderCounts = {};

  for (const file of files) {
    const dir = path.dirname(file.path);
    if (!folderCounts[dir]) {
      folderCounts[dir] = 0;
    }
    folderCounts[dir]++;
  }

  for (const [folder, count] of Object.entries(folderCounts)) {
    if (count > maxItems) {
      issues.push({
        file: folder,
        count: count,
        limit: maxItems
      });
    }
  }

  issues.sort((a, b) => b.count - a.count);
  return { issues, skipped: false, prompt: cfg.prompt };
}

/**
 * Check for missing test files
 */
function checkMissingTests(files, config) {
  const issues = [];
  const cfg = config.testCheck || {};

  if (!cfg.enabled) {
    return { issues, skipped: true, reason: 'Disabled in config' };
  }

  const patterns = cfg.patterns || {
    '.vue': '.test.js',
    '.jsx': '.test.jsx',
    '.tsx': '.test.tsx'
  };

  const testFiles = new Set(
    files
      .filter(f => f.path.includes('.test.') || f.path.includes('.spec.'))
      .map(f => f.path.toLowerCase())
  );

  for (const file of files) {
    const ext = path.extname(file.path);
    const testExt = patterns[ext];

    if (!testExt) continue;
    if (file.path.includes('.test.') || file.path.includes('.spec.')) continue;
    if (!file.path.startsWith('src/') && !file.path.startsWith('components/')) continue;

    const baseName = path.basename(file.path, ext);
    const hasTest = [...testFiles].some(t => t.includes(baseName.toLowerCase()) && t.includes('.test.'));

    if (!hasTest) {
      issues.push({
        file: file.path,
        expectedTest: `${baseName}${testExt}`
      });
    }
  }

  return { issues, skipped: false, prompt: cfg.prompt };
}

/**
 * Main analyzer function
 */
export async function analyze(rootDir = process.cwd(), config = {}) {
  const startTime = Date.now();
  const files = listAllFiles(rootDir);

  // Run all checks
  const eslint = runEslintAnalysis(rootDir);
  const typescript = runTypeScriptAnalysis(rootDir);
  const lineLimit = checkLineLimits(files, config);
  const folderLimit = checkFolderLimits(files, config);
  const missingTests = checkMissingTests(files, config);

  const duration = Date.now() - startTime;

  return {
    eslint,
    typescript,
    lineLimit,
    folderLimit,
    missingTests,
    customRequirements: config.customChecks?.requirements || null,
    filesScanned: files.length,
    durationMs: duration
  };
}

/**
 * Format analysis results for display
 */
export function formatAnalysisResults(results) {
  let output = '';
  let totalIssues = 0;

  // ESLint issues
  if (!results.eslint.skipped && results.eslint.issues.length > 0) {
    output += `🗑️  UNUSED CODE (ESLint) - ${results.eslint.issues.length} issues\n`;
    for (const issue of results.eslint.issues.slice(0, 15)) {
      output += `   ${issue.file}:${issue.line} - ${issue.message}\n`;
    }
    if (results.eslint.issues.length > 15) {
      output += `   ... and ${results.eslint.issues.length - 15} more\n`;
    }
    output += '\n';
    totalIssues += results.eslint.issues.length;
  }

  // TypeScript issues
  if (!results.typescript.skipped && results.typescript.issues.length > 0) {
    output += `🔷 UNUSED CODE (TypeScript) - ${results.typescript.issues.length} issues\n`;
    for (const issue of results.typescript.issues.slice(0, 15)) {
      output += `   ${issue.file}:${issue.line} - ${issue.message}\n`;
    }
    if (results.typescript.issues.length > 15) {
      output += `   ... and ${results.typescript.issues.length - 15} more\n`;
    }
    output += '\n';
    totalIssues += results.typescript.issues.length;
  }

  // Line limit issues
  if (!results.lineLimit.skipped && results.lineLimit.issues.length > 0) {
    output += `📏 FILES OVER LINE LIMIT - ${results.lineLimit.issues.length} files\n`;
    for (const issue of results.lineLimit.issues) {
      output += `   ${issue.file} - ${issue.count} lines (limit: ${issue.limit})\n`;
    }
    if (results.lineLimit.prompt) {
      output += `\n   → ${results.lineLimit.prompt.replace(/\{\{\s*linelimit\s*\}\}/gi, results.lineLimit.issues[0]?.limit || '')}\n`;
    }
    output += '\n';
    totalIssues += results.lineLimit.issues.length;
  }

  // Folder limit issues
  if (!results.folderLimit.skipped && results.folderLimit.issues.length > 0) {
    output += `📁 FOLDERS OVER ITEM LIMIT - ${results.folderLimit.issues.length} folders\n`;
    for (const issue of results.folderLimit.issues) {
      output += `   ${issue.file}/ - ${issue.count} items (limit: ${issue.limit})\n`;
    }
    if (results.folderLimit.prompt) {
      output += `\n   → ${results.folderLimit.prompt.replace(/\{\{\s*folderlimit\s*\}\}/gi, results.folderLimit.issues[0]?.limit || '')}\n`;
    }
    output += '\n';
    totalIssues += results.folderLimit.issues.length;
  }

  // Missing tests
  if (!results.missingTests.skipped && results.missingTests.issues.length > 0) {
    output += `🧪 MISSING TESTS - ${results.missingTests.issues.length} files\n`;
    for (const issue of results.missingTests.issues.slice(0, 10)) {
      output += `   ${issue.file} → needs ${issue.expectedTest}\n`;
    }
    if (results.missingTests.issues.length > 10) {
      output += `   ... and ${results.missingTests.issues.length - 10} more\n`;
    }
    output += '\n';
    totalIssues += results.missingTests.issues.length;
  }

  // Custom requirements
  if (results.customRequirements) {
    output += `📋 CUSTOM REQUIREMENTS\n`;
    output += `   ${results.customRequirements}\n\n`;
  }

  return { output, totalIssues };
}

export default { analyze, formatAnalysisResults };
