"use client";

// Bandeau affiché quand l'appareil est hors ligne. Rappelle ce qui reste
// possible (réactions, ordre) et combien de modifs attendent la synchro.
export default function OfflineBanner({ pending = 0 }) {
  return (
    <div className="offline-banner" role="status">
      <span className="offline-dot" aria-hidden="true" />
      <span>
        <strong>Hors ligne.</strong> Tu peux encore réagir et classer ta liste —
        ce sera envoyé au retour du réseau
        {pending > 0 ? ` (${pending} en attente)` : ""}.
      </span>
    </div>
  );
}
