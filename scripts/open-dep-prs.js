#!/usr/bin/env node
const { execSync } = require('child_process');
const { env } = process;
const https = require('https');

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

if (!env.GITHUB_TOKEN) {
  console.error('GITHUB_TOKEN required to open PRs');
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const branch = `deps/manual-bump-${timestamp}`;

try {
  // update root
  const pkgPath = 'package.json';
  const pkg = JSON.parse(require('fs').readFileSync(pkgPath, 'utf8'));
  let removedOverrides = false;
  if (pkg.overrides && Object.keys(pkg.overrides).length > 0) {
    // remove overrides temporarily so ncu won't fail with EOVERRIDE
    console.log('Detected `overrides` in package.json — removing temporarily to allow dependency bump');
    delete pkg.overrides;
    require('fs').writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    removedOverrides = true;
  }

  try {
    run('npx npm-check-updates -u');
  } catch (e) {
    // try again rejecting packages that are pinned/overridden
    console.warn('ncu failed, retrying excluding commonly pinned packages');
    run('npx npm-check-updates -u --reject axios,semver,simple-update-notifier');
  }
  // update frontend
  try {
    run('npx npm-check-updates -u', { cwd: 'frontend' });
  } catch (e) {
    console.warn('ncu failed in frontend, retrying excluding pinned packages');
    run('npx npm-check-updates -u --reject axios,semver,simple-update-notifier', {
      cwd: 'frontend',
    });
  }

  // install to update lockfiles
  run('npm install --no-audit --no-fund');
  run('npm install --no-audit --no-fund', { cwd: 'frontend' });

  // create branch and commit only if there are changes
  run(`git checkout -b ${branch}`);
  run('git add package.json package-lock.json frontend/package.json frontend/package-lock.json');
  const staged = execSync('git diff --staged --name-only').toString().trim();
  if (!staged) {
    console.log('No dependency changes to commit');
    // if we removed overrides but there were no dependency bumps, restore package.json
    if (removedOverrides) {
      console.log('Restoring original package.json overrides (no changes detected)');
      // restore original from git (checkout the file)
      run('git checkout -- package.json');
    }
    process.exit(0);
  }
  // include note about overrides removal if applicable
  const commitMsg = removedOverrides
    ? 'chore(deps): bump deps (removed package.json overrides to allow bumps)'
    : 'chore(deps): manual bump via open-dep-prs script';
  run(`git commit -m "${commitMsg}"`);
  run(`git push -u origin ${branch}`);

  // create PR using GitHub API
  const remote = execSync('git config --get remote.origin.url').toString().trim();
  const match = remote.match(/[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (!match) throw new Error('Unable to parse remote origin URL');
  const owner = match[1];
  const repo = match[2];

  const postData = JSON.stringify({
    title: 'chore(deps): manual bump via script',
    head: branch,
    base: 'main',
    body: 'Automated dependency bump. Tests should run in CI.'
  });

  const options = {
    method: 'POST',
    hostname: 'api.github.com',
    path: `/repos/${owner}/${repo}/pulls`,
    headers: {
      'User-Agent': 'open-dep-prs-script',
      Authorization: `token ${env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (d) => (data += d));
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const body = JSON.parse(data);
        console.log('PR created:', body.html_url);
      } else {
        console.error('Failed to create PR:', res.statusCode, data);
        process.exit(1);
      }
    });
  });
  req.on('error', (e) => {
    console.error('Request error:', e);
    process.exit(1);
  });
  req.write(postData);
  req.end();
} catch (e) {
  console.error('Error:', e.message || e);
  process.exit(1);
}
