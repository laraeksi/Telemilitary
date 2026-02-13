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
        <main style={{ padding: 20 }}>
        <h1 style={{ marginBottom: 8 }}>Select difficulty</h1>
        <p style={{ marginTop: 0, opacity: 0.7 }}>
            Prototype: 2 stages per difficulty
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
            <button type="button" onClick={() => choose("easy")}>Easy</button>
            <button type="button" onClick={() => choose("balanced")}>Balanced</button>
            <button type="button" onClick={() => choose("hard")}>Hard</button>
        </div>
        </main>
    );
}