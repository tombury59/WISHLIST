import { timeAgo, avatarColor } from "../lib/format";

// Modale « Historique » : les dernières actions de la famille.
export default function HistoryModal({ items, loading, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="history-card" onClick={(e) => e.stopPropagation()}>
        <div className="history-head">
          <span className="history-title">Historique</span>
          <button className="history-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <div className="history-body">
          {loading ? (
            <p className="empty">Chargement…</p>
          ) : items.length === 0 ? (
            <p className="empty">Rien pour l'instant.</p>
          ) : (
            <ul className="history-list">
              {/* Affichage limité aux 50 dernières (la base en garde plus). */}
              {items.slice(0, 50).map((h) => {
                const who = h.type === "comment" ? h.author || "Quelqu'un" : h.member;
                const action =
                  h.type === "add"
                    ? "a ajouté"
                    : h.type === "remove"
                    ? "a retiré"
                    : "a commenté";
                return (
                  <li key={h.id} className="history-item">
                    <span className="history-main">
                      <span
                        className="history-who"
                        style={{ background: avatarColor(who) }}
                      >
                        {who}
                      </span>
                      <span className="history-action">{action}</span>
                      {h.name && <span className="history-el">{h.name}</span>}
                    </span>
                    <span className="history-time">{timeAgo(h.at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
