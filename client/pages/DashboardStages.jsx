import { TablePlaceholder } from "../components/TablePlaceholder";

/**
 * Pseudocode:
 * 1) Fetch per-stage stats.
 * 2) Render a table and sparkline placeholders.
 */

export const DashboardStagesPage = () => (
  <main className="dashboard-stages-page">
    <h1>Stage Stats</h1>
    <TablePlaceholder
      title="Per-stage statistics"
      columns={["Stage", "Fail rate", "Avg time", "Retries", "Tokens"]}
    />
    {/* TODO: Add sparkline placeholders per stage. */}
  </main>
);
