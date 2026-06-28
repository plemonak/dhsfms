/**
 * SharePoint provider placeholder.
 *
 * In the next phase this file will replace MockDataProvider and use PnPjs/SPFx context
 * to read/write the existing SharePoint lists and document libraries.
 *
 * Target lists/libraries:
 * - Employees
 * - Contractors
 * - Sites
 * - TrainingSessions
 * - TrainingAttendance
 * - MedicalCertificates
 * - EmployeeLicenses
 * - PPEIssuances
 * - Vehicles
 * - Assets
 * - Evidence libraries
 */
export class SharePointProviderNotConnectedYet {
  constructor() {
    // Intentionally left as a placeholder; the adapter falls back to mock data unless the
    // SharePoint integration is explicitly configured via environment variables.
  }

  async createListItem(payload: { listName: string; item: Record<string, unknown> }) {
    console.info('SharePoint list item placeholder', payload);
    return { id: Date.now(), status: 'mock-fallback' };
  }

  async getListItems(listName: string) {
    console.info('SharePoint list read placeholder', listName);
    return [];
  }
}
