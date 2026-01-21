# bonzai-burn

Automated code cleanup via Claude Code on a safe git branch.

## Install

```bash
npx bonzai-burn
```

Requires: [Claude Code CLI](https://github.com/anthropics/claude-code)

## Usage

### 1. Run burn

```bash
npx bburn
```

Creates `bonzai/specs.md` on first run. Edit it to define your cleanup rules.

### 2. Review changes

```bash
git diff main
```

### 3. Accept or discard

```bash
# Accept
baccept

# Discard
brevert
```
