/**
 * Pseudocode:
 * 1) Render a table shell with column headers.
 * 2) Keep a single placeholder row for now.
 * 3) Replace body with real data later.
 */

export const TablePlaceholder = ({ title, columns }) => (
  <div className="table-placeholder" aria-label={title}>
    <h3>{title}</h3>
    <table>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colSpan={columns.length}>TODO: data rows</td>
        </tr>
      </tbody>
    </table>
  </div>
);
