// Popup de confirmation (suppressions, modifications non enregistrées…).
export default function ConfirmModal({ message, onCancel, onConfirm, confirmLabel = "Supprimer" }) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="sheet dialog dialog-confirm" onClick={(e) => e.stopPropagation()}>
        <p className="dialog-message">{message}</p>
        <div className="dialog-actions">
          <button className="btn btn-quiet" onClick={onCancel}>
            Annuler
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
