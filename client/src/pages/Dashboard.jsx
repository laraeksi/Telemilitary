import { Link } from "react-router-dom";

function Dashboard() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Designer Dashboard</h1>
      <p>Telemetry charts and simulation tools will go here.</p>

      <Link to="/">
        <button type="button">Back to Home</button>
      </Link>
    </main>
  );
}

export default Dashboard;