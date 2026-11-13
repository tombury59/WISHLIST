import PinPad from "./PinPad";
import ClovisArt from "./ClovisArt";

// Écran du code famille (entrée dans l'appli). L'état et la logique de
// connexion vivent dans useAuth ; l'affichage est délégué au PinPad partagé.
export default function Gate({ pin, error, loading, onDigit, onBackspace, onSubmit }) {
  return (
    <PinPad
      badge={
        // Clovis accueille ; code faux : il est déçu et secoue la tête.
        <ClovisArt
          key={error || "ok"}
          pose={error ? "decu" : "coucou"}
          width={error ? 104 : 112}
          className={error ? "is-shaking" : ""}
        />
      }
      title="Liste de souhaits"
      subtitle="Entre le code de la famille"
      pin={pin}
      error={error}
      loading={loading}
      canSubmit={!loading && pin.length > 0}
      onDigit={onDigit}
      onBackspace={onBackspace}
      onSubmit={onSubmit}
    />
  );
}
