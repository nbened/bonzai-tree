const { execSync } = require('child_process');

// GET /git/burns - List all bonzai-burn branches
function listBurns(req, res) {
  try {
    // Get all bonzai-burn branches
    let branchOutput;
    try {
      branchOutput = execSync('git branch --list "bonzai-burn*"', { encoding: 'utf-8' });
    } catch (e) {
      // No matching branches
      branchOutput = '';
    }

    const branches = branchOutput
      .split('\n')
      .filter(b => b.trim())
      .map(b => b.trim().replace('* ', ''));

    if (branches.length === 0) {
      return res.json({ burns: [] });
    }

    // Get timestamp for each branch
    const burns = branches.map(branch => {
      const timestamp = execSync(`git log -1 --format=%at ${branch}`, { encoding: 'utf-8' }).trim();
      return {
        name: branch,
        timestamp: parseInt(timestamp) * 1000
      };
    });

    // Sort chronologically (oldest first)
    burns.sort((a, b) => a.timestamp - b.timestamp);

    // Get current branch
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();

    res.json({
      burns: burns.map(b => ({
        ...b,
        current: b.name === currentBranch
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// POST /git/checkout - Checkout a branch
function checkoutBranch(req, res) {
  try {
    const { branchName } = req.body;

    if (!branchName) {
      return res.status(400).json({ error: 'branchName is required' });
    }

    // Validate branch name to prevent command injection
    if (!/^[a-zA-Z0-9_\-\.\/]+$/.test(branchName)) {
      return res.status(400).json({ error: 'Invalid branch name' });
    }

    execSync(`git checkout ${branchName}`, { encoding: 'utf-8' });

    res.json({ checkedOut: branchName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// POST /git/create-branch - Create and checkout a new branch
function createBranch(req, res) {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // Validate branch name to prevent command injection
    if (!/^[a-zA-Z0-9_\-\.\/]+$/.test(name)) {
      return res.status(400).json({ error: 'Invalid branch name' });
    }

    // Check if branch already exists
    try {
      execSync(`git rev-parse --verify ${name}`, { encoding: 'utf-8', stdio: 'pipe' });
      return res.status(400).json({ error: `Branch '${name}' already exists` });
    } catch (e) {
      // Branch doesn't exist, which is what we want
    }

    execSync(`git checkout -b ${name}`, { encoding: 'utf-8' });

    res.json({ created: name, checkedOut: name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { listBurns, checkoutBranch, createBranch };
