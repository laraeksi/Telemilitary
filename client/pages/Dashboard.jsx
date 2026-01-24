import { ChartPlaceholder } from "../components/ChartPlaceholder";
import { TablePlaceholder } from "../components/TablePlaceholder";

/**
 * Pseudocode:
 * 1) Fetch metrics from server (funnel, drop-off).
 * 2) Render charts/tables.
 * 3) Add filters later.
 */

export const DashboardPage = () => (
  <main className="dashboard-page">
    <h1>Designer Dashboard</h1>
    <ChartPlaceholder title="Funnel overview" description="Stage progression funnel" />
    <TablePlaceholder title="Drop-off reasons" columns={["Stage", "Fail Reason", "Rate"]} />
    <ChartPlaceholder title="Difficulty spikes" description="Fail rate and time spikes" />
  </main>
);
