import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function readGitValue(command: string, fallback = 'unknown') {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || fallback;
  } catch {
    return fallback;
  }
}

const gitCommit = readGitValue('git rev-parse --short HEAD');
const gitBranch = readGitValue('git branch --show-current');

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_COMMIT__: JSON.stringify(gitCommit),
    __APP_BRANCH__: JSON.stringify(gitBranch),
    __APP_BUILT_AT__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    host: '0.0.0.0',
    port: 5180,
    strictPort: true,
    allowedHosts: true,
  },
});
