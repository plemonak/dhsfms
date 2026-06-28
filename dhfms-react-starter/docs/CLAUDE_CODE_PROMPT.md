# Prompt for Claude Code / Cursor / Copilot Agent

You are working on the DYKAT HSEFMS React/TypeScript codebase.

Important context:
- The user is not a programmer.
- Keep the app simple, readable and modular.
- Do not create huge single-file code.
- Use reusable components.
- Preserve the DYKAT red/navy enterprise visual style.
- The backend will be SharePoint lists and document libraries.
- Power Automate flows may remain where practical.
- The current data provider is mock data; replace it gradually with SharePoint services.
- Do not break existing pages when adding new modules.

Primary goal:
Build a professional HSE & Fleet Management System with modules for personnel, training, PPE, medical certificates, licenses, vehicles, sites, subcontractors, equipment, SmartDocs, QR and dashboards.

Development rules:
1. Use TypeScript types from src/types/models.ts.
2. Add reusable UI to src/components.
3. Add pages to src/pages.
4. Add SharePoint/data logic to src/services.
5. Do not hardcode page-specific layout when it can be a reusable component.
6. Keep the app responsive for mobile/tablet/desktop.
7. Every new screen must be navigable from App.tsx.
8. Every feature should first work with mock data, then be connected to SharePoint.
