/**
 * Pseudocode:
 * 1) Receive title/description props.
 * 2) Render a placeholder frame for charts.
 * 3) Replace with real chart library later.
 */

export const ChartPlaceholder = ({ title, description }) => (
  <figure className="chart-placeholder" aria-label={title}>
    <figcaption>{title}</figcaption>
    <div className="chart-frame" role="img" aria-label={description ?? title}>
      {/* TODO: Replace with chart implementation */}
      <span>Chart placeholder</span>
    </div>
  </figure>
);
