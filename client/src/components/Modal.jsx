// Simple modal wrapper with inline styles.
// Used for win/lose, consent, maintainer ops.
function Modal({ title, children, className = "", zIndex = 50 }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      // Full-screen scrim.
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex,
      }}
    >
      {/* Modal content container */}
      <div
        className={`modal-content ${className}`.trim()}
        style={{
          background: "white",
          color: "#111",
          borderRadius: 14,
          padding: 24,
          width: "min(520px, 100%)",
        }}
      >
        {/* Title is optional but recommended */}
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export default Modal;
