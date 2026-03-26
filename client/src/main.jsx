/**
 * Frontend entrypoint.
 *
 * This is where React mounts into the single `<div id="root">` in `index.html`.
 * We also load global CSS here so it applies to every page.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import "./styles/global.css";


// Grab the mount node once (single-page app root).
const rootNode = document.getElementById('root');
// Mount React into the root node.
createRoot(rootNode).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
