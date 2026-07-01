import { writeFileSync } from 'node:fs';

const requiredVars = [
  'VITE_ENABLE_REAL_INTEGRATIONS',
  'VITE_POWERAUTOMATE_FLOW_GET_EMPLOYEES',
  'VITE_POWERAUTOMATE_FLOW_GET_SITES',
  'VITE_POWERAUTOMATE_FLOW_GET_VEHICLES',
  'VITE_POWERAUTOMATE_FLOW_CREATE_VEHICLE',
  'VITE_POWERAUTOMATE_FLOW_UPLOAD_EVIDENCE',
  'VITE_POWERAUTOMATE_FLOW_OCR_DOCUMENT',
];

const optionalVars = [
  'VITE_POWERAUTOMATE_FLOW_UPDATE_VEHICLE',
  'VITE_POWERAUTOMATE_FLOW_GET_EMPLOYEE_DOCUMENTS',
  'VITE_POWERAUTOMATE_FLOW_GET_VEHICLE_DOCUMENTS',
  'VITE_POWERAUTOMATE_FLOW_UPLOAD_EMPLOYEE_DOCUMENT',
];

const allVars = [...requiredVars, ...optionalVars];
const urlVars = allVars.filter((name) => name.startsWith('VITE_POWERAUTOMATE_FLOW_'));

function readSecret(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function printStatus(name, value) {
  console.log(`${name}: ${value ? 'SET' : 'MISSING'}`);
}

const values = new Map();
let hasError = false;

for (const name of requiredVars) {
  const value = readSecret(name);
  printStatus(name, value);

  if (!value) {
    hasError = true;
    continue;
  }

  if (urlVars.includes(name) && !value.startsWith('https://')) {
    console.error(`${name}: INVALID_NON_HTTPS`);
    hasError = true;
    continue;
  }

  values.set(name, value);
}

for (const name of optionalVars) {
  const value = readSecret(name);
  printStatus(name, value);

  if (!value) {
    continue;
  }

  if (urlVars.includes(name) && !value.startsWith('https://')) {
    console.error(`${name}: INVALID_NON_HTTPS`);
    hasError = true;
    continue;
  }

  values.set(name, value);
}

if (hasError) {
  console.error('Refusing to write .env.local because required secrets are missing or invalid.');
  process.exit(1);
}

const body = [
  '# Generated from environment variables / Codespaces secrets.',
  '# Do not commit this file.',
  ...requiredVars.map((name) => `${name}=${values.get(name)}`),
  ...optionalVars.filter((name) => values.has(name)).map((name) => `${name}=${values.get(name)}`),
  '',
].join('\n');

writeFileSync('.env.local', body, { encoding: 'utf8' });
console.log('.env.local generated.');
