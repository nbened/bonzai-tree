const fs = require('fs');
const path = require('path');
const { ROOT } = require('../config');

function detectClaudeHandler(req, res) {
  try {
    // Check if CLAUDE.md exists at repo root
    const claudeMdPath = path.join(ROOT, 'CLAUDE.md');
    const claudeMd = fs.existsSync(claudeMdPath) ? 'CLAUDE.md' : null;

    // Scan .claude/skills/*/SKILL.md and .claude/commands/*/SKILL.md
    const skills = [];
    const dirs = [
      path.join(ROOT, '.claude', 'skills'),
      path.join(ROOT, '.claude', 'commands'),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillMd = path.join(dir, entry.name, 'SKILL.md');
        if (fs.existsSync(skillMd)) {
          skills.push(path.relative(ROOT, skillMd));
        }
      }
    }

    res.json({ claudeMd, skills });
  } catch (e) {
    res.status(500).send(e.message);
  }
}

module.exports = detectClaudeHandler;
