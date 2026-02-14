import { useNavigate } from "react-router-dom";
import { trackEvent } from "../telemetry/events";

export default function DifficultySelect() {
    const navigate = useNavigate();

    function choose(configId) {
        // backend validator expects config_id in enum: easy/balanced/hard
        localStorage.setItem("telemetry_config_id_v1", configId);

        // start at stage 1 for telemetry defaults
        localStorage.setItem("stage_Id", "1");

        trackEvent("settings_change", {
            stageId:1,
            setting_key: "difficulty",
            setting_value: configId
        });
        navigate("/game");
    }

    return (
        <main className="page">
        <div className="page__content">
            <section className="panel hero">
            <h1 className="hero__title">Select difficulty</h1>
            <p className="hero__subtitle">Prototype: 2 stages per difficulty</p>

            <div className="action-row">
                <button type="button" onClick={() => choose("easy")}>Easy</button>
                <button type="button" onClick={() => choose("balanced")}>Balanced</button>
                <button type="button" onClick={() => choose("hard")}>Hard</button>
            </div>
            </section>
        </div>
        </main>
    );
}