#!/usr/bin/env node
import { execSync } from 'child_process';

function exec(command) {
  return execSync(command, { encoding: 'utf-8', stdio: 'pipe' }).trim();
}

function execVisible(command) {
  execSync(command, { stdio: 'inherit' });
}

async function accept() {
  try {
    // Get saved metadata
    let originalBranch;
    let burnBranch;
    let madeWipCommit;

    try {
      originalBranch = exec('git config bonzai.originalBranch');
      burnBranch = exec('git config bonzai.burnBranch');
      madeWipCommit = exec('git config bonzai.madeWipCommit') === 'true';
    } catch {
      console.error('❌ No burn to accept');
      console.error('Run bburn first');
      process.exit(1);
    }

    console.log(`✅ Accepting burn changes...`);
    console.log(`   Merging: ${burnBranch} → ${originalBranch}\n`);

    // Checkout original branch
    execVisible(`git checkout ${originalBranch}`);

    // Merge burn branch into original
    execVisible(`git merge ${burnBranch} -m "Accept bonzai burn from ${burnBranch}"`);

    // If we made a WIP commit, we need to handle it
    // The merge already includes the burn changes on top of the WIP commit
    // So we can optionally squash or leave as-is
    if (madeWipCommit) {
      console.log('\n💡 Note: Your pre-burn WIP commit was preserved in the history.');
    }

    // Clean up metadata
    exec('git config --unset bonzai.originalBranch');
    exec('git config --unset bonzai.burnBranch');
    exec('git config --unset bonzai.madeWipCommit');

    console.log(`\n✓ Burn accepted and merged`);
    console.log(`Now on: ${originalBranch}`);
    console.log(`Branch kept: ${burnBranch}\n`);

  } catch (error) {
    console.error('❌ Accept failed:', error.message);
    process.exit(1);
  }
}

accept();
