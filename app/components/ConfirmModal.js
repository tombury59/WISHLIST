// Popup de confirmation pour les suppressions.
export default function ConfirmModal({ message, onCancel, onConfirm }) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="sheet dialog dialog-confirm" onClick={(e) => e.stopPropagation()}>
        <p className="dialog-message">{message}</p>
        <div className="dialog-actions">
          <button className="btn btn-quiet" onClick={onCancel}>
            Annuler
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
