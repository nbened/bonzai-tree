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

    // Check if we have uncommitted changes
    let hasChanges = false;
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf-8' });
      hasChanges = status.trim().length > 0;
    } catch (e) {
      // Ignore errors checking status
    }

    let savedToBranch = null;

    if (hasChanges) {
      // Get current branch name
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
      
      // Create a save branch name with timestamp
      const timestamp = Date.now();
      savedToBranch = `bonzai-save-${currentBranch}-${timestamp}`;
      
      // Create new branch, add all changes, and commit
      execSync(`git checkout -b ${savedToBranch}`, { encoding: 'utf-8' });
      execSync('git add -A', { encoding: 'utf-8' });
      execSync(`git commit -m "Auto-save before switching to ${branchName}"`, { encoding: 'utf-8' });
    }

    // Now checkout the target branch
    execSync(`git checkout ${branchName}`, { encoding: 'utf-8' });

    res.json({ 
      checkedOut: branchName,
      savedToBranch: savedToBranch 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { listBurns, checkoutBranch };
