import { execSync, spawn } from 'node:child_process';

const port = process.env.DHFMS_DEV_PORT ?? '5180';
const host = '0.0.0.0';
const codespaceName = process.env.CODESPACE_NAME;
const forwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? 'app.github.dev';

function gitValue(command, fallback = 'unknown') {
  try {
    return execSync(command, { cwd: new URL('..', import.meta.url), stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || fallback;
  } catch {
    return fallback;
  }
}

const repoRoot = new URL('..', import.meta.url);
const branch = gitValue('git branch --show-current');
const beforePullCommit = gitValue('git rev-parse --short HEAD');

console.log('');
console.log('DYKAT HSEFMS dev server');

if (branch === 'main') {
  try {
    execSync('git pull --ff-only origin main', { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    const afterPullCommit = gitValue('git rev-parse --short HEAD');
    if (afterPullCommit !== beforePullCommit) {
      console.log(`Ενημερώθηκε στην τελευταία έκδοση (${beforePullCommit} -> ${afterPullCommit}).`);
    } else {
      console.log(`Ήδη στην τελευταία έκδοση (${afterPullCommit}).`);
    }
  } catch (error) {
    console.log('');
    console.log('WARNING: Automatic git pull failed (πιθανό τοπικές αλλαγές ή conflict).');
    console.log(String(error?.message ?? error).split('\n').slice(0, 4).join('\n'));
    console.log('Run manually: git pull');
  }
} else {
  console.log(`Branch: ${branch} (${beforePullCommit}) — automatic pull skipped (not main).`);
}

console.log(`Local: http://localhost:${port}/`);

if (codespaceName) {
  console.log(`Codespaces: https://${codespaceName}-${port}.${forwardingDomain}/`);
} else {
  console.log('Codespaces: not detected in this environment.');
}

console.log('');

const child = spawn('vite', ['--host', host, '--port', port, '--strictPort'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
