// Home menu plus telemetry consent dialog.
// Prompts for telemetry consent before play.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Modal from "../components/Modal";

const CONSENT_KEY = "telemetry_consent_v1";

function Menu() {
  const [consentMode, setConsentMode] = useState("none"); // "ask" | "info" | "none"

  useEffect(() => {
    // Restore previous consent choice if it exists.
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "no") {
      setConsentMode("info");
    } else if (stored === "yes") {
      setConsentMode("none");
    } else {
      setConsentMode("ask");
    }
  }, []);

  function acceptConsent() {
    // Persist consent for future sessions.
    localStorage.setItem(CONSENT_KEY, "yes");
    setConsentMode("none");
  }

  function declineConsent() {
    // Remember opt-out.
    localStorage.setItem(CONSENT_KEY, "no");
    setConsentMode("info");
  }

  function closeInfo() {
    // Hide the info-only modal.
    setConsentMode("none");
  }

  return (
    <main className="page">
      <div className="page__content">
        <section className="panel hero">
          <h1 className="hero__title">Memory Match</h1>
          <p className="hero__subtitle">Choose your role to continue</p>
          <p className="hero__subtitle" style={{ fontSize: 13, opacity: 0.75, marginTop: 8 }}>
            We only collect anonymous gameplay telemetry for balancing. No personal data is used or shared.
          </p>

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

      {consentMode !== "none" && (
        <Modal title={consentMode === "ask" ? "Telemetry Consent" : "Telemetry Notice"}>
          {consentMode === "ask" ? (
            <>
              <p>
                This game collects anonymous gameplay telemetry (time, moves, and resource usage) so we can
                improve balance and difficulty. No personal data is collected or shared.
              </p>
              <p>Do you consent to telemetry collection?</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                <button type="button" onClick={acceptConsent}>Yes, I agree</button>
                <button type="button" onClick={declineConsent}>No thanks</button>
              </div>
              <p style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
                If you decline, you can still play without telemetry.
              </p>
            </>
          ) : (
            <>
              <p>
                You chose not to share telemetry. You can still play, and no gameplay data will be collected.
              </p>
              <p>This is a telemetry game, but your selection disables data collection.</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                <button type="button" onClick={closeInfo}>Continue</button>
              </div>
            </>
          )}
        </Modal>
      )}
    </main>
  );
}

export default Menu;
