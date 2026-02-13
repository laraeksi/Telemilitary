import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

function DesignerLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); 
  

  async function handleSubmit(e) {
    e.preventDefault();

    
    const res = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: username,
    password: password
  })
  });

   const TEST_USERNAME = "designer";
  const TEST_PASSWORD = "1234";

  if (username === TEST_USERNAME && password === TEST_PASSWORD) {
  
    navigate("/dashboard");
  }

 const data = await res.json();

 try{
 if (res.ok && data.ok ){

  navigate("/dashboard");
  
}

  else {
    
    setError(data.error.message);
    //console.error(error)
    
  }
}

 catch(err){
  setError("Network failure.")
  console.error(err)
 }



    // FRONTEND PLACEHOLDER:
    // Call backend: POST /api/designer/login
    // For now, just allows navigation so we can build the dashboard UI.

    
    
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 40 }}>Designer Access</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Enter your designer details or <Link to="/register">Register here</Link>
      </p>

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

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit">Continue</button>

        

        <Link to="/">
          <button type="button">Back</button>
        </Link>
      </form>
    </main>
  );
}

export default DesignerLogin;
