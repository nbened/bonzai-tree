const fs = require('fs');
const path = require('path');
const { ROOT } = require('../config');

function detectClaudeHandler(req, res) {
  try {
    // Check if CLAUDE.md exists at repo root
    const claudeMdPath = path.join(ROOT, 'CLAUDE.md');
    const claudeMd = fs.existsSync(claudeMdPath) ? 'CLAUDE.md' : null;

    // Scan both .claude/skills/ and .claude/commands/ for .md files
    const skills = [];
    const dirs = [
      path.join(ROOT, '.claude', 'skills'),
      path.join(ROOT, '.claude', 'commands'),
    ];

    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          skills.push(path.relative(ROOT, fullPath));
        }
      }
    }

    for (const dir of dirs) {
      if (fs.existsSync(dir)) scanDir(dir);
    }

    res.json({ claudeMd, skills });
  } catch (e) {
    res.status(500).send(e.message);
  }
}

module.exports = detectClaudeHandler;
