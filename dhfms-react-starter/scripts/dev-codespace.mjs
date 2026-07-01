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

const localCommit = gitValue('git rev-parse --short HEAD');
const branch = gitValue('git branch --show-current');
let remoteCommit = 'unknown';

try {
  execSync('git fetch origin main --quiet', { cwd: new URL('..', import.meta.url), stdio: 'ignore' });
  remoteCommit = gitValue('git rev-parse --short origin/main');
} catch {
  remoteCommit = 'unknown';
}

console.log('');
console.log('DYKAT HSEFMS dev server');
console.log(`Commit: ${branch} ${localCommit}${remoteCommit !== 'unknown' ? ` (origin/main ${remoteCommit})` : ''}`);
if (remoteCommit !== 'unknown' && localCommit !== remoteCommit) {
  console.log('');
  console.log('WARNING: This Codespace is not running the latest origin/main.');
  console.log('Run: cd /workspaces/dhsfms && git pull');
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
