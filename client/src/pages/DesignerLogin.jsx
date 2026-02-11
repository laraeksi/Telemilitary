import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

function DesignerLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");

  function handleSubmit(e) {
    e.preventDefault();

    // FRONTEND PLACEHOLDER:
    // Call backend: POST /api/designer/login
    // For now, just allows navigation so we can build the dashboard UI.
    navigate("/dashboard");
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Designer Access</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Enter your designer password.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, maxWidth: 360 }}>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <button type="submit">Continue</button>

        <Link to="/">
          <button type="button">Back</button>
        </Link>
      </form>
    </main>
  );
}

export default DesignerLogin;