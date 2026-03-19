// Difficulty selection page for the player.
// Saves the chosen difficulty before starting the game.
import { useNavigate } from "react-router-dom";
import { trackEvent } from "../telemetry/events";

export default function DifficultySelect() {
    const navigate = useNavigate();

    function choose(configId) {
        // backend validator expects config_id in enum: easy/balanced/hard
        localStorage.setItem("telemetry_config_id_v1", configId);

        // start at stage 1 for telemetry defaults
        localStorage.setItem("stage_Id", "1");

        // Log difficulty selection to telemetry.
        trackEvent("settings_change", {
            stageId:1,
            setting_key: "difficulty",
            setting_value: configId
        });
        // Move into the game view.
        navigate("/game");
    }

    return (
        <main className="page">
        <div className="page__content">
            <section className="panel hero">
            <h1 className="hero__title">Select difficulty</h1>
            <p className="hero__subtitle">Play through 10 stages per difficulty</p>

            <div className="action-row">
                {/* Quick buttons for difficulty */}
                <button type="button" onClick={() => choose("easy")}>Easy</button>
                <button type="button" onClick={() => choose("balanced")}>Balanced</button>
                <button type="button" onClick={() => choose("hard")}>Hard</button>
            </div>
            </section>
        </div>
        </main>
    );
}