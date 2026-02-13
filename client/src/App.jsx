import { BrowserRouter, Routes, Route } from "react-router-dom";
import Menu from "./pages/Menu";
import Game from "./pages/Game";
import DesignerLogin from "./pages/DesignerLogin";
import Dashboard from "./pages/Dashboard";
import DifficultySelect from "./pages/DifficultySelect";
import Registration from "./pages/Registration";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/difficulty" element={<DifficultySelect />} />
        <Route path="/game" element={<Game />} />
        <Route path="/designer" element={<DesignerLogin />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/register" element={<Registration />} />
      </Routes>
    </BrowserRouter>
  );
}


export default App;
