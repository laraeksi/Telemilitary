// This page handles designer registration and basic validation.
// Validates password rules before sending to the API.
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiUrl } from "../api/base";

function Registration(){
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Human-readable rules for the UI list.
  const passwordRules = [
    "At least 8 characters",
    "At least 1 uppercase letter",
    "At least 1 lowercase letter",
    "At least 1 number",
  ];

  function getPasswordError(value) {
    // Rules are checked in order for clearer feedback.
    if (value.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (!/[A-Z]/.test(value)) {
      return "Password must include at least one uppercase letter.";
    }
    if (!/[a-z]/.test(value)) {
      return "Password must include at least one lowercase letter.";
    }
    if (!/\d/.test(value)) {
      return "Password must include at least one number.";
    }
    return "";
  }


 async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Block submit if rules fail.
    const passwordError = getPasswordError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    
    try {
      const res = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username,
          password: password
        })
      });

      // Parse JSON safely in case of errors.
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        navigate("/dashboard");
        return;
      }

      setError(data?.error?.message || "Registration failed.");
    } catch (err) {
      setError("Unable to reach the server.");
      console.error(err);
    }
  }


 return (

  <main className="page">
      <div className="page__content">
        <section className="panel">
          <h1 className="panel__title">New Designer Registration</h1>
          <p className="panel__subtitle">
        Please enter your new designer details.
      </p>
          <ul className="rule-list">
        {passwordRules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
          </ul>

          {error && <p className="alert">{error}</p>}

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

         
        
        <div className="form-actions">
          <button type="submit">Continue</button> 
          <Link to="/designer">
            <button type="button" data-variant="ghost">Back</button>
          </Link>
        </div>
      </form>
        </section>
      </div>
    </main>





);

}


export default Registration;
