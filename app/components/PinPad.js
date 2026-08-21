"use client";

import { useEffect } from "react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

// Pavé numérique réutilisable (code famille ET code par profil). Présentationnel
// : l'état du code et la validation vivent chez le parent. Gère aussi le clavier
// physique tant qu'il est monté (un seul PinPad affiché à la fois).
export default function PinPad({
  title,
  subtitle,
  pin,
  error,
  loading = false,
  canSubmit,
  onDigit,
  onBackspace,
  onSubmit,
  footer,
}) {
  const submitEnabled = canSubmit ?? (!loading && pin.length > 0);

  useEffect(() => {
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) onDigit(e.key);
      else if (e.key === "Backspace") onBackspace();
      else if (e.key === "Enter") {
        if (submitEnabled) onSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDigit, onBackspace, onSubmit, submitEnabled]);

  return (
    <main className="gate">
      <div className="gate-card">
        <h1 className="gate-title">{title}</h1>
        {subtitle && <p className="gate-sub">{subtitle}</p>}

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
            disabled={!submitEnabled}
            aria-label="Valider"
          >
            {loading ? "…" : "→"}
          </button>
        </div>

        {footer}
      </div>
    </main>
  );
}
