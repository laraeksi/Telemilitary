import { Link } from "react-router-dom";

function Menu() {
  return (
    <main style={{ padding: "20px" }}>
      <h1 style={{ marginBottom: 8 }}>Memory Match</h1>
      <p style={{ marginTop: 0, opacity: 0.7 }}>Choose your role to continue</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <Link to="/difficulty">
          <button type="button">Player</button>
        </Link>

        <Link to="/designer">
          <button type="button">Designer</button>
        </Link>
      </div>
    </main>
  );
}

export default Menu;
