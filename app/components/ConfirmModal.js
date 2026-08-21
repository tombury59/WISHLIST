// Popup de confirmation pour les suppressions.
export default function ConfirmModal({ message, onCancel, onConfirm }) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="btn-ghost" onClick={onCancel}>
            Annuler
          </button>
          <button className="btn-danger" onClick={onConfirm}>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
