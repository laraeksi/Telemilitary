import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

function Registration(){
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const passwordRules = [
    "At least 8 characters",
    "At least 1 uppercase letter",
    "At least 1 lowercase letter",
    "At least 1 number",
  ];

  function getPasswordError(value) {
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

    const passwordError = getPasswordError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    
 const res = await fetch("/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: username,
    password: password
  })
  });

  const data = await res.json();

  if (res.ok && data.ok){
    navigate("/dashboard");
  }

  else {
    setError(data.error?.message || "Registration failed.");
  }

 
    
  }


 return (

  <main style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 40 }}>New Designer Registration</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Please enter your new designer details.
      </p>
      <ul style={{ marginTop: 0, paddingLeft: 18, opacity: 0.8 }}>
        {passwordRules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>

       {error && <p style={{ color: "red" }}>{error}</p>}

              <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, maxWidth: 360 }}>
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>
      
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

        

        <Link to="/designer">
          <button type="button">Back</button>
        </Link>
      </form>
    </main>





);

}


export default Registration;
