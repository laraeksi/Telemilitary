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

    
    const res = await fetch(apiUrl("/api/auth/login"), {
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
    <main className="page">
      <div className="page__content">
        <section className="panel">
          <h1 className="panel__title">Designer Access</h1>
          <p className="panel__subtitle">
            Enter your designer details or <Link to="/register">register here</Link>.
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
              <button type="submit">Continue</button>
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
