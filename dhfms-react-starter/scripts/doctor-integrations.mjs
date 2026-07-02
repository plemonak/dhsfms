import { existsSync, readFileSync } from 'node:fs';

const requiredVars = [
  'VITE_ENABLE_REAL_INTEGRATIONS',
  'VITE_POWERAUTOMATE_FLOW_GET_EMPLOYEES',
  'VITE_POWERAUTOMATE_FLOW_GET_SITES',
  'VITE_POWERAUTOMATE_FLOW_GET_VEHICLES',
  'VITE_POWERAUTOMATE_FLOW_CREATE_EMPLOYEE',
  'VITE_POWERAUTOMATE_FLOW_CREATE_VEHICLE',
  'VITE_POWERAUTOMATE_FLOW_UPLOAD_EVIDENCE',
  'VITE_POWERAUTOMATE_FLOW_OCR_DOCUMENT',
];

const optionalVars = [
  'VITE_POWERAUTOMATE_FLOW_UPDATE_VEHICLE',
  'VITE_POWERAUTOMATE_FLOW_GET_EMPLOYEE_DOCUMENTS',
  'VITE_POWERAUTOMATE_FLOW_GET_VEHICLE_DOCUMENTS',
  'VITE_POWERAUTOMATE_FLOW_UPLOAD_EMPLOYEE_DOCUMENT',
  'VITE_POWERAUTOMATE_FLOW_GET_SPECIALTY_MATRIX',
  'VITE_POWERAUTOMATE_FLOW_GET_PPE_ISSUES',
];

const flowChecks = [
  ['GET_EMPLOYEES', 'VITE_POWERAUTOMATE_FLOW_GET_EMPLOYEES'],
  ['GET_SITES', 'VITE_POWERAUTOMATE_FLOW_GET_SITES'],
  ['GET_VEHICLES', 'VITE_POWERAUTOMATE_FLOW_GET_VEHICLES'],
];

// Read-only flows: safe να τα καλέσουμε για έλεγχο σχήματος δεδομένων χωρίς παρενέργειες.
// Το PPE_ISSUE_PDF/CREATE_PPE_ISSUE/CANCEL_PPE_ISSUE ΔΕΝ μπαίνουν εδώ γιατί έχουν πραγματικές
// παρενέργειες (φτιάχνουν PDF/εγγραφές) — γι' αυτά ελέγχουμε μόνο ότι το URL υπάρχει.
const optionalFlowChecks = [
  ['GET_SPECIALTY_MATRIX', 'VITE_POWERAUTOMATE_FLOW_GET_SPECIALTY_MATRIX'],
  ['GET_PPE_ISSUES', 'VITE_POWERAUTOMATE_FLOW_GET_PPE_ISSUES'],
];

function loadEnvLocal() {
  if (!existsSync('.env.local')) {
    return;
  }

  const content = readFileSync('.env.local', 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const index = trimmed.indexOf('=');
    const name = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    if (!process.env[name]) {
      process.env[name] = value;
    }
  }
}

function readEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function unwrapPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const record = asRecord(payload);
  for (const key of ['value', 'items', 'records', 'data', 'body']) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }
    if (candidate && typeof candidate === 'object') {
      const nested = unwrapPayload(candidate);
      if (nested.length > 0) {
        return nested;
      }
    }
  }

  return Object.keys(record).length > 0 ? [record] : [];
}

function pick(record, names) {
  for (const name of names) {
    const value = record[name];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return undefined;
}

function display(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(display).filter(Boolean).join(' / ');
  }
  const record = asRecord(value);
  return display(pick(record, ['Value', 'Title', 'Name', 'DisplayName', 'name']));
}

function normalizeEmployee(item) {
  const record = asRecord(item);
  const firstName = display(pick(record, ['firstName', 'FirstName', 'GivenName']));
  const lastName = display(pick(record, ['lastName', 'LastName', 'Surname']));
  const fullName = display(pick(record, ['fullName', 'FullName', 'Title', 'EmployeeName', 'DisplayName']));

  return {
    id: display(pick(record, ['id', 'ID'])),
    employeeNo: display(pick(record, ['employeeNo', 'EmployeeNo', 'EmployeeID', 'EmployeeNumber'])),
    fullName: fullName ?? [lastName, firstName].filter(Boolean).join(' '),
    position: display(pick(record, ['position', 'Position', 'JobTitle'])),
    company: display(pick(record, ['company', 'Company'])),
    siteId: display(pick(record, ['siteId', 'SiteId', 'SiteID'])),
  };
}

function normalizeSite(item) {
  const record = asRecord(item);
  return {
    id: display(pick(record, ['id', 'ID'])),
    name: display(pick(record, ['name', 'Name', 'Title', 'SiteName', 'siteName'])),
    phase: display(pick(record, ['phase', 'Phase'])),
    status: display(pick(record, ['status', 'Status'])),
    coordinates: display(pick(record, ['coordinates', 'Coordinates'])),
  };
}

function normalizeVehicle(item) {
  const record = asRecord(item);
  return {
    id: display(pick(record, ['id', 'ID'])),
    code: display(pick(record, ['code', 'Code', 'VehicleCode', 'Title'])),
    plate: display(pick(record, ['plate', 'Plate', 'LicensePlate', 'RegistrationNumber'])),
    type: display(pick(record, ['type', 'Type', 'VehicleType'])),
    owner: display(pick(record, ['owner', 'Owner'])),
    siteId: display(pick(record, ['siteId', 'SiteId', 'SiteID'])),
    status: display(pick(record, ['status', 'Status'])),
    insuranceExpiry: display(pick(record, ['insuranceExpiry', 'InsuranceExpiry'])),
    kteoExpiry: display(pick(record, ['kteoExpiry', 'KteoExpiry', 'KTEOExpiry'])),
  };
}

function hasAny(record, names) {
  return names.some((name) => record[name] !== undefined && record[name] !== null && String(record[name]).trim() !== '');
}

function looksLikeEmployee(item) {
  const record = asRecord(item);
  return hasAny(record, ['employeeNo', 'EmployeeNo', 'EmployeeID', 'EmployeeNumber', 'firstName', 'FirstName', 'lastName', 'LastName', 'position', 'Position', 'JobTitle', 'FullName']);
}

function looksLikeVehicle(item) {
  const record = asRecord(item);
  return hasAny(record, ['plate', 'Plate', 'LicensePlate', 'RegistrationNumber', 'chassisNumber', 'ChassisNumber', 'VIN', 'insuranceExpiry', 'InsuranceExpiry', 'kteoExpiry', 'KteoExpiry']);
}

function looksLikeSite(item) {
  const record = asRecord(item);
  return hasAny(record, ['phase', 'Phase', 'coordinates', 'Coordinates', 'SiteName', 'siteName']) ||
    (hasAny(record, ['Title', 'Name', 'name']) && !looksLikeEmployee(item) && !looksLikeVehicle(item));
}

function looksLikeSpecialtyMatrix(item) {
  const record = asRecord(item);
  return hasAny(record, ['specialty', 'Specialty', 'ppeCategory', 'PPECategory', 'isMandatory', 'IsMandatory']);
}

function looksLikePpeIssue(item) {
  const record = asRecord(item);
  return hasAny(record, ['employeeId', 'EmployeeId', 'Employee', 'issuedBy', 'IssuedBy', 'ppeItemsSummary', 'PPEItemsSummary']);
}

function majority(items, predicate) {
  if (items.length === 0) {
    return false;
  }
  return items.filter(predicate).length / items.length >= 0.6;
}

async function callFlow(label, url) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  console.log(`${label}: HTTP ${response.status}`);
  const payload = await response.json().catch(() => ({}));
  return unwrapPayload(payload);
}

loadEnvLocal();

let hasError = false;

for (const name of requiredVars) {
  const value = readEnv(name);
  console.log(`${name}: ${value ? 'SET' : 'MISSING'}`);
  if (!value) {
    hasError = true;
  }
  if (name.startsWith('VITE_POWERAUTOMATE_FLOW_') && value && !value.startsWith('https://')) {
    console.warn(`${name}: INVALID_NON_HTTPS`);
    hasError = true;
  }
}

for (const name of optionalVars) {
  const value = readEnv(name);
  console.log(`${name}: ${value ? 'SET' : 'MISSING_OPTIONAL'}`);
  if (name.startsWith('VITE_POWERAUTOMATE_FLOW_') && value && !value.startsWith('https://')) {
    console.warn(`${name}: INVALID_NON_HTTPS`);
    hasError = true;
  }
}

if (hasError) {
  console.error('Integration doctor failed before flow calls because required env vars are missing or invalid.');
  process.exit(1);
}

const results = new Map();

for (const [label, envName] of flowChecks) {
  try {
    const records = await callFlow(label, readEnv(envName));
    results.set(label, records);

    const normalized = records.slice(0, 3).map((item) => {
      if (label === 'GET_EMPLOYEES') return normalizeEmployee(item);
      if (label === 'GET_SITES') return normalizeSite(item);
      return normalizeVehicle(item);
    });

    console.log(`${label}: first 3 normalized records`);
    console.log(JSON.stringify(normalized, null, 2));
  } catch {
    console.error(`${label}: request failed`);
    hasError = true;
  }
}

const employees = results.get('GET_EMPLOYEES') ?? [];
const sites = results.get('GET_SITES') ?? [];
const vehicles = results.get('GET_VEHICLES') ?? [];

if (majority(sites, looksLikeEmployee)) {
  console.warn('GET_SITES looks like employees. Flow may be swapped.');
  hasError = true;
}

if (majority(vehicles, looksLikeSite)) {
  console.warn('GET_VEHICLES looks like sites. Flow may be swapped.');
  hasError = true;
}

if (majority(employees, looksLikeSite) || majority(employees, looksLikeVehicle)) {
  console.warn('GET_EMPLOYEES looks like sites or vehicles. Flow may be swapped.');
  hasError = true;
}

// Προαιρετικά ΜΑΠ flows — ελέγχονται μόνο αν έχουν οριστεί (χωρίς να αποτυγχάνει το doctor αν λείπουν).
for (const [label, envName] of optionalFlowChecks) {
  const url = readEnv(envName);
  if (!url) {
    continue;
  }
  try {
    const records = await callFlow(label, url);
    results.set(label, records);
    console.log(`${label}: first 3 raw records`);
    console.log(JSON.stringify(records.slice(0, 3), null, 2));
  } catch {
    console.error(`${label}: request failed`);
    hasError = true;
  }
}

const specialtyMatrix = results.get('GET_SPECIALTY_MATRIX') ?? [];
const ppeIssues = results.get('GET_PPE_ISSUES') ?? [];

if (majority(specialtyMatrix, looksLikePpeIssue)) {
  console.warn('GET_SPECIALTY_MATRIX looks like PPE issuances. Flow URL may be swapped with GET_PPE_ISSUES or PPE_ISSUE_PDF.');
  hasError = true;
}

if (majority(ppeIssues, looksLikeSpecialtyMatrix)) {
  console.warn('GET_PPE_ISSUES looks like SpecialtyMatrix rows. Flow URL may be swapped with GET_SPECIALTY_MATRIX.');
  hasError = true;
}

// Write-only ΜΑΠ flows (πραγματικές παρενέργειες) — ελέγχουμε μόνο ότι το URL υπάρχει, ΔΕΝ τα καλούμε.
for (const envName of ['VITE_POWERAUTOMATE_FLOW_CREATE_PPE_ISSUE', 'VITE_POWERAUTOMATE_FLOW_CANCEL_PPE_ISSUE', 'VITE_POWERAUTOMATE_FLOW_PPE_ISSUE_PDF']) {
  const url = readEnv(envName);
  console.log(`${envName}: ${url ? 'SET (not called — has side effects)' : 'MISSING_OPTIONAL'}`);
}

if (hasError) {
  process.exit(1);
}

console.log('Integration doctor passed.');
