/**
 * Home menu page + telemetry consent.
 *
 * The game is playable either way, but we only send telemetry if the player opts in.
 * This page is where we ask for consent and store the decision for future visits.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Modal from "../components/Modal";
import { unlockAudio } from "../audio/sounds";
import { apiUrl } from "../api/base";

const CONSENT_KEY = "telemetry_consent_v1";

function Menu() {
  const [consentMode, setConsentMode] = useState("none"); // "ask" | "info" | "none"
  const [maintainerOpen, setMaintainerOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState("idle"); // "idle" | "loading" | "ok" | "error"

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

  useEffect(() => {
    if (!maintainerOpen) return;
    // When the maintainer panel opens, we ping the backend health endpoint.
    // This is just a quick "is the API running?" check for demos.
    let cancelled = false;
    fetch(apiUrl("/api/health"))
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        setHealthStatus(body && body.ok === true ? "ok" : "error");
      })
      .catch(() => {
        if (!cancelled) setHealthStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [maintainerOpen]);

  async function acceptConsent() {
    await unlockAudio();
    // Persist consent for future sessions.
    localStorage.setItem(CONSENT_KEY, "yes");
    setConsentMode("none");
  }

  async function declineConsent() {
    await unlockAudio();
    // Remember opt-out.
    localStorage.setItem(CONSENT_KEY, "no");
    setConsentMode("info");
  }

  async function closeInfo() {
    await unlockAudio();
    // Hide the info-only modal.
    setConsentMode("none");
  }

  async function openMaintainer() {
    await unlockAudio();
    setHealthStatus("loading");
    setMaintainerOpen(true);
  }

  function closeMaintainer() {
    setMaintainerOpen(false);
    setHealthStatus("idle");
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
              <button type="button" onClick={() => unlockAudio()}>Player</button>
            </Link>

            <Link to="/designer">
              <button type="button" data-variant="ghost">
                Dashboard
              </button>
            </Link>
          </div>

          <div className="action-row" style={{ marginTop: 12 }}>
            <button
              type="button"
              data-variant="ghost"
              aria-label="Maintainer and operations information"
              onClick={openMaintainer}
            >
              Maintainer / ops
            </button>
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

      {maintainerOpen && (
        <Modal title="Maintainer & operations" zIndex={60}>
          <p style={{ fontSize: 14, lineHeight: 1.5 }}>
            Maintainers run <strong>deployments</strong>, the <strong>telemetry pipeline</strong> (Flask + SQLite),
            and <strong>automated tests</strong>. This is not a login role. See the repository handover docs.
          </p>
          <p style={{ marginTop: 12, fontSize: 14 }}>
            <strong>API health</strong>{" "}
            {healthStatus === "loading" && <span aria-live="polite">Checking…</span>}
            {healthStatus === "ok" && (
              <span style={{ color: "#0a7a2f" }} aria-live="polite">
                OK (GET /api/health)
              </span>
            )}
            {healthStatus === "error" && (
              <span style={{ color: "#a30" }} aria-live="polite">
                Unreachable. Start the backend (<code>python app.py</code> in <code>backend/</code>)
              </span>
            )}
          </p>
          <ul style={{ fontSize: 14, lineHeight: 1.6, paddingLeft: 20 }}>
            <li>
              Run tests: <code>python -m pytest</code> from <code>backend/</code>
            </li>
            <li>
              Docs: <code>docs/deployment_guide.md</code>, <code>docs/maintainer-handover.md</code>
            </li>
            <li>Secrets: use environment variables (never commit keys).</li>
          </ul>
          <div style={{ marginTop: 16 }}>
            <button type="button" onClick={closeMaintainer}>
              Close
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

export default Menu;
