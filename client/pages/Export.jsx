/**
 * Pseudocode:
 * 1) Trigger CSV download.
 * 2) Call GET /export/events.csv.
 */

export const ExportPage = () => (
  <main className="export-page">
    <h1>Export</h1>
    <p>Download telemetry data for external analysis.</p>
    <button type="button">Export CSV</button>
    {/* TODO: Hook up to GET /export/events.csv */}
  </main>
);
