import { spawn } from 'node:child_process';

const port = process.env.DHFMS_DEV_PORT ?? '5180';
const host = '0.0.0.0';
const codespaceName = process.env.CODESPACE_NAME;
const forwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? 'app.github.dev';

console.log('');
console.log('DYKAT HSEFMS dev server');
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
