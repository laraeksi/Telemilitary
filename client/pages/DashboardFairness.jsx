import { ChartPlaceholder } from "../components/ChartPlaceholder";
import { TablePlaceholder } from "../components/TablePlaceholder";

/**
 * Pseudocode:
 * 1) Choose a segment to compare.
 * 2) Fetch fairness metrics.
 * 3) Render chart + table.
 */

export const DashboardFairnessPage = () => (
  <main className="dashboard-fairness-page">
    <h1>Fairness</h1>
    <label htmlFor="segment-select">Player segment</label>
    <select id="segment-select" name="segment">
      <option value="all">All</option>
      <option value="aggressive">Aggressive</option>
      <option value="cautious">Cautious</option>
    </select>
    <ChartPlaceholder title="Segment comparison" description="Completion and fail rate by segment" />
    <TablePlaceholder title="Segment stats" columns={["Segment", "Completion", "Fail rate"]} />
  </main>
);
