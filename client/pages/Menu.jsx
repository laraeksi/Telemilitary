import { Link } from "react-router-dom";

function Menu() {
  return (
    <main>
      <h1>Memory Match Game</h1>
      <Link to="/game">
        <button>Start Game</button>
      </Link>
    </main>
  );
}

export default Menu;
