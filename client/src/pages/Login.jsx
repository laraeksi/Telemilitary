import { useState } from "react";
import "../styles/login.css";


function Login({ onLogin }) {
  const [role, setRole] = useState("player");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleContinue() {
    const result = onLogin({ role, password });

    if (!result.success) {
      setError(result.message || "Access denied");
    }
  }

  return (
    <main className="login">
      <h1>Memory Match Game</h1>
      <p>Select how you want to continue</p>

      <fieldset className="login__roles">
        <legend>Choose role</legend>

        <label>
          <input
            type="radio"
            name="role"
            value="player"
            checked={role === "player"}
            onChange={() => {
              setRole("player");
              setError("");
            }}
          />
          <strong>Player</strong>
          <span className="hint">Play the game (no login required)</span>
        </label>

        <label>
          <input
            type="radio"
            name="role"
            value="designer"
            checked={role === "designer"}
            onChange={() => {
              setRole("designer");
              setError("");
            }}
          />
          <strong>Designer</strong>
          <span className="hint">Access telemetry dashboard</span>
        </label>
      </fieldset>

      {role === "designer" && (
        <div className="login__password">
          <label htmlFor="password">Designer password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter designer password"
          />
        </div>
      )}

      {error && <p className="login__error">{error}</p>}

      <button
        type="button"
        onClick={handleContinue}
        disabled={role === "designer" && password.length === 0}
      >
        Continue
      </button>
    </main>
  );
}

export default Login;
