// App routes for the whole front-end.
// Central place for route definitions.
import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Menu from "./pages/Menu";
import Game from "./pages/Game";
import DesignerLogin from "./pages/DesignerLogin";
import Dashboard from "./pages/Dashboard";
import DifficultySelect from "./pages/DifficultySelect";
import Registration from "./pages/Registration";
import Styles from "./pages/Styles";

function App() {
  useEffect(() => {
    const theme = localStorage.getItem("style_theme_v1") || "classic";
    document.documentElement.dataset.theme = theme;
  }, []);
  return (
    <BrowserRouter>
      {/* Route table for the whole app */}
      <Routes>
        {/* Player-facing pages */}
        <Route path="/" element={<Menu />} />
        <Route path="/difficulty" element={<DifficultySelect />} />
        <Route path="/game" element={<Game />} />
        <Route path="/style" element={<Styles />} />
        {/* Designer-facing pages */}
        <Route path="/designer" element={<DesignerLogin />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/register" element={<Registration />} />
      </Routes>
    </BrowserRouter>
  );
}


export default App;
