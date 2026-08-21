import PinPad from "./PinPad";

// Écran du code famille (entrée dans l'appli). L'état et la logique de
// connexion vivent dans useAuth ; l'affichage est délégué au PinPad partagé.
export default function Gate({ pin, error, loading, onDigit, onBackspace, onSubmit }) {
  return (
    <PinPad
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
