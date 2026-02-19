const fs = require('fs');
const path = require('path');
const { ROOT } = require('../config');

function detectClaudeHandler(req, res) {
  try {
    // Check if CLAUDE.md exists at repo root
    const claudeMdPath = path.join(ROOT, 'CLAUDE.md');
    const claudeMd = fs.existsSync(claudeMdPath) ? 'CLAUDE.md' : null;

    // Scan .claude/skills/ recursively for .md files
    const skills = [];
    const skillsDir = path.join(ROOT, '.claude', 'skills');

    if (fs.existsSync(skillsDir)) {
      (function scanDir(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.md')) {
            skills.push(path.relative(ROOT, fullPath));
          }
        }
      })(skillsDir);
    }

    res.json({ claudeMd, skills });
  } catch (e) {
    res.status(500).send(e.message);
  }
}

module.exports = detectClaudeHandler;
