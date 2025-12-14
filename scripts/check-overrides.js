#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

if (pkg.overrides && Object.keys(pkg.overrides).length > 0) {
  console.error('Found `overrides` in package.json which may block automated dependency updates.');
  console.error('If you are running `npm-check-updates` and see EOVERRIDE, consider removing or adjusting `overrides` temporarily, or run dependency updates in CI.');
  console.error('\nOverrides present:\n', JSON.stringify(pkg.overrides, null, 2));
  process.exit(1);
}
console.log('No overrides detected.');
process.exit(0);
