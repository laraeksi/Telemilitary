// Entry point that mounts the React app.
// Loads global styles and renders <App />.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import "./styles/global.css";


// Fetch the mount node once.
const rootNode = document.getElementById('root');
// Mount React into the single root node.
createRoot(rootNode).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
