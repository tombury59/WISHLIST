"use client";

// Bandeau affiché quand l'appareil est hors ligne. Rappelle ce qui reste
// possible (réactions, ordre) et combien de modifs attendent la synchro.
export default function OfflineBanner({ pending = 0 }) {
  return (
    <div className="offline-banner" role="status">
      <span className="offline-dot" aria-hidden="true" />
      <span>
        Hors ligne — réactions et ordre synchronisés au retour
        {pending > 0 ? ` · ${pending} en attente` : ""}.
      </span>
    </div>
  );
}
