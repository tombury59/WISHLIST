// Écran du code (PIN). Purement présentationnel : l'état et la logique de
// connexion vivent dans useAuth.
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function Gate({ pin, error, loading, onDigit, onBackspace, onSubmit }) {
  return (
    <main className="gate">
      <div className="gate-card">
        <h1 className="gate-title">Liste de souhaits</h1>
        <p className="gate-sub">Entre le code de la famille</p>

        <div className={"pin-dots" + (error ? " pin-dots-error" : "")}>
          {pin.length === 0 ? (
            <span className="pin-hint">- - - -</span>
          ) : (
            Array.from(pin).map((_, i) => <span key={i} className="pin-dot" />)
          )}
        </div>

        <div className="error-slot">
          {error && <span className="error">{error}</span>}
        </div>

        <div className="keypad">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              className="key"
              onPointerDown={(e) => {
                e.preventDefault();
                onDigit(k);
              }}
            >
              {k}
            </button>
          ))}
          <button
            type="button"
            className="key key-ghost"
            onPointerDown={(e) => {
              e.preventDefault();
              onBackspace();
            }}
            aria-label="Effacer"
          >
            ⌫
          </button>
          <button
            type="button"
            className="key"
            onPointerDown={(e) => {
              e.preventDefault();
              onDigit("0");
            }}
          >
            0
          </button>
          <button
            type="button"
            className="key key-enter"
            onClick={onSubmit}
            disabled={loading || !pin}
            aria-label="Valider"
          >
            {loading ? "…" : "→"}
          </button>
        </div>
      </div>
    </main>
  );
}
