import { ChartPlaceholder } from "../components/ChartPlaceholder";
import { TablePlaceholder } from "../components/TablePlaceholder";

/**
 * Pseudocode:
 * 1) Fetch metrics for easy/balanced/hard.
 * 2) Render a comparison chart + table.
 */

export const DashboardComparePage = () => (
  <main className="dashboard-compare-page">
    <h1>Compare Configs</h1>
    <ChartPlaceholder title="Easy vs Balanced vs Hard" description="Config comparison chart" />
    <TablePlaceholder
      title="Config comparison table"
      columns={["Config", "Completion", "Avg time", "Fails"]}
    />
  </main>
);
