// This page shows the designer login form and calls the API.
// Uses local state and calls /api/auth/login.
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiUrl } from "../api/base";

function DesignerLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); 
  

  async function handleSubmit(e) {
    e.preventDefault();
    // Clear any previous error state.
    setError("");

    // Quick local fallback for the demo account.
    const TEST_USERNAME = "designer";
    const TEST_PASSWORD = "1234";

    // Allow a hard-coded demo login.
    if (username === TEST_USERNAME && password === TEST_PASSWORD) {
      sessionStorage.setItem("dashboard_role", "designer");
      navigate("/dashboard");
      return;
    }

    try {
      // Attempt real backend login.
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username,
          password: password
        })
      });

      const data = await res.json().catch(() => null);

      // Navigate only on a successful login response.
      if (res.ok && data?.ok) {
        sessionStorage.setItem("dashboard_role", "designer");
        navigate("/dashboard");
        return;
      }

      setError(data?.error?.message || "Invalid credentials. Please try again.");
    } catch (err) {
      setError("Unable to reach the server.");
      console.error(err);
    }
  }

  return (
    <main className="page">
      <div className="page__content">
        <section className="panel">
          <h1 className="panel__title">Dashboard Access</h1>
          <p className="panel__subtitle">
            Sign in as a designer to edit and manage the dashboard, or use viewer mode for read-only access.
          </p>
          <p className="panel__subtitle" style={{ marginTop: 8 }}>
            Need a designer account? <Link to="/register">Register here</Link>.
          </p>
          <p className="panel__subtitle" style={{ marginTop: 8 }}>
            <Link
              to="/dashboard"
              onClick={() => {
                sessionStorage.setItem("dashboard_role", "viewer");
              }}
            >
              Continue as Viewer (read-only dashboard)
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="form" style={{ maxWidth: 420 }}>
            <label className="field">
              Username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
        
            <label className="field">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {error && <p className="alert">{error}</p>}

            <div className="form-actions">
              <button type="submit">Sign in as Designer</button>
              <Link to="/">
                <button type="button" data-variant="ghost">Back</button>
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default DesignerLogin;
