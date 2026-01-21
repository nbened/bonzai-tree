#!/usr/bin/env node
const args = process.argv.slice(2);
const command = args[0];

if (command === 'trim' || command === 'btrim') {
  require('./btrim');
} else if (command === 'revert' || command === 'brevert') {
  require('./brevert');
} else {
  console.log(`
bonzai-burn - Git branch-based cleanup tool

Commands:
  bonzai-burn trim     Run btrim (create burn branch and cleanup)
  bonzai-burn revert   Run brevert (revert burn and return to original)

Or use directly:
  btrim                Create burn branch and run cleanup
  brevert              Revert burn and return to original branch
`);
}
