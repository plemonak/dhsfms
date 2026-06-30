# Project AEGIS / DYKAT HSEFMS Handoff

## Repo

- Repo: `plemonak/dhsfms`
- App folder: `/workspaces/dhsfms/dhfms-react-starter`
- App: React + Vite
- Dev port: `5180`
- Dev command: `npm run dev -- --host 0.0.0.0 --port 5180 --strictPort`
- Build command: `npm run build`

## Current Product State

- Internal HSE/Fleet management system for DYKAT.
- Main modules exist:
  - Employees
  - Sites / Εργοτάξια
  - Vehicles & Machinery / Οχήματα & Μηχανήματα
  - Vehicle profile
  - Training
  - PPE
  - Evidence documents
  - OCR through Power Automate + Google Vision

## Vehicle State

- `VehicleFormPage` exists.
- `VehicleProfilePage` exists.
- Vehicle module exists with fields including:
  - `id`
  - `code`
  - `plate`
  - `type`
  - `chassisNumber`
  - `manufacturer`
  - `model`
  - `owner`
  - `siteId`
  - `status`
  - `isImmobilized`
  - `insuranceExpiry`
  - `kteoExpiry`
  - `emissionsCardExpiry`
  - `liftingCertificateExpiry`
- Vehicle profile supports edit navigation and shows larger, grid-based basic detail fields.
- Vehicle edit is wired in the app and data provider. SharePoint persistence requires `VITE_POWERAUTOMATE_FLOW_UPDATE_VEHICLE`; do not silently claim a permanent SharePoint save without that flow.
- Vehicle document evidence should use the SharePoint list `VehicleDocuments` when available.
- The upload evidence flow should create a `VehicleDocuments` list item and attach the uploaded PDF/file to that item.

## OCR State

- Initial vehicle registration OCR exists.
- Vehicle license / VIN evidence OCR exists.
- OCR tries to extract plate/license number, chassis number, manufacturer, model and category.
- Manufacturer OCR can remain manual if extraction is imperfect.

## Insurance OCR Workflow

- `VehicleProfilePage` supports document upload for:
  - Άδεια κυκλοφορίας or Άδεια Μηχανήματος Έργου
  - Ασφάλεια
  - ΚΤΕΟ for regular vehicles that are not immobilized
  - Κάρτα Καυσαερίων for regular vehicles that are not immobilized
  - Τέλη κυκλοφορίας for regular vehicles that are not immobilized
  - Δήλωση ακινησίας only when `isImmobilized` is true
  - Πιστοποιητικό Ανυψωτικής Ικανότητας only for lifting machinery categories such as cranes, aerial platforms, forklifts/telehandlers
  - Άλλο έγγραφο
- Insurance OCR should read:
  - Έναρξη Ασφάλισης
  - Λήξη Ασφάλισης
- The insurance document must match the selected vehicle by plate/license number or chassis number.
- The user must always confirm or correct insurance start/expiry dates before registration.
- The system must not automatically mark insurance as final without user confirmation.
- JPG should work.
- PDF should be supported through the OCR flow. Google Vision `images:annotate` is not enough for PDFs; use a proper PDF/file OCR route or convert the first page to image before OCR.

## Required Real Integration Env Vars

- `VITE_ENABLE_REAL_INTEGRATIONS`
- `VITE_POWERAUTOMATE_FLOW_GET_EMPLOYEES`
- `VITE_POWERAUTOMATE_FLOW_GET_SITES`
- `VITE_POWERAUTOMATE_FLOW_GET_VEHICLES`
- `VITE_POWERAUTOMATE_FLOW_CREATE_VEHICLE`
- `VITE_POWERAUTOMATE_FLOW_UPLOAD_EVIDENCE`
- `VITE_POWERAUTOMATE_FLOW_OCR_DOCUMENT`
- `VITE_SHAREPOINT_LIST_VEHICLE_DOCUMENTS` defaults to `VehicleDocuments`

If `VITE_POWERAUTOMATE_FLOW_GET_VEHICLES` is set but `VITE_POWERAUTOMATE_FLOW_CREATE_VEHICLE` is missing, new vehicles will not be saved to SharePoint. The UI must show an error instead of silently falling back to mock creation.

Vehicle create/read flows must map these SharePoint columns:

- `VIN` -> app `chassisNumber`
- `Make` -> app `manufacturer`
- `Model` -> app `model`

Generated flow packages for this mapping:

- `DHFMS_CreateVehicle_VIN_Make_Model_20260630.zip`
- `DHFMS_GetVehicles_VIN_Make_Model_20260630.zip`

## Known Mistakes To Avoid

- Do not trust env blindly. Verify flow outputs with `npm run doctor:integrations` before UI debugging.
- `GET_SITES` was previously pointed at the Employees flow.
- `GET_VEHICLES` was previously pointed at the Sites flow.
- `GET_SITES` should return records like `{ id, name, phase, status, coordinates }`.
- `GET_VEHICLES` should return records like `{ id, code, plate, type, owner, siteId, status, insuranceExpiry, kteoExpiry }`.
- `GET_EMPLOYEES` should return employee records, not sites or vehicles.
- Do not commit `dist`.
- Do not commit `.env.local`.
- Do not expose full Power Automate URLs in logs, docs or commits.
- If local Vite is 200 and Codespaces forwarded URL is 404, stop tunnel debugging and move to a new Codespace after preserving completed work.

## Current Unfinished Issues

- Validate real Power Automate flow wiring with `npm run doctor:integrations` whenever Codespaces secrets are available.
- Keep Sites mapping tolerant of SharePoint field names: `Title`, `name`, `Name`, `SiteName`, `siteName`.
- Keep insurance OCR confirmation mandatory before saving insurance dates.
