import { Link } from "react-router-dom";

function Menu() {
  return (
    <main className="page">
      <div className="page__content">
        <section className="panel hero">
          <h1 className="hero__title">Memory Match</h1>
          <p className="hero__subtitle">Choose your role to continue</p>

          <div className="action-row">
            <Link to="/difficulty">
              <button type="button">Player</button>
            </Link>

            <Link to="/designer">
              <button type="button" data-variant="ghost">
                Designer
              </button>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Menu;
