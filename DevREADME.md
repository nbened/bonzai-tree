# Dev Guide

## Test locally

```bash
node src/bburn.js
node src/baccept.js
node src/brevert.js
```

Or link globally:

```bash
npm link
bburn
baccept
brevert
```

## Publish new version

```bash
npm login
npm version patch  # pumps version number automatically
npm publish
```
