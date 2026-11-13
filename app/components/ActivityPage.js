import { timeAgo, dayLabel } from "../lib/format";
import Avatar from "./Avatar";
import Icon from "./Icon";
import RefreshButton from "./RefreshButton";
import ClovisArt from "./ClovisArt";

// « Activité » : les dernières actions de la famille, regroupées par jour.
export default function ActivityPage({ items, loading, online, onRefresh }) {
  // Affichage limité aux 50 dernières (la base en garde davantage).
  const shown = items.slice(0, 50);

  // Regroupe par jour en conservant l'ordre (du plus récent au plus ancien).
  const days = [];
  for (const h of shown) {
    const label = dayLabel(h.at);
    const last = days[days.length - 1];
    if (last && last.label === label) last.items.push(h);
    else days.push({ label, items: [h] });
  }

  return (
    <section className="page">
      <header className="page-head">
        <span className="page-icon">
          <Icon name="clock" size={24} />
        </span>
        <div className="page-titles">
          <h1 className="page-title">Activité</h1>
          <p className="page-sub">Ce qui a bougé dans les listes récemment.</p>
        </div>
        {online && (
          <div className="page-tools">
            <RefreshButton onRefresh={onRefresh} />
          </div>
        )}
      </header>

      {loading && shown.length === 0 ? (
        <div className="empty-state empty-loading">
          <ClovisArt pose="fouille" width={120} className="empty-art" />
          <p className="empty-text">Clovis fouille dans les nouvelles…</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty-state">
          <ClovisArt pose="sieste" width={130} className="empty-art" />
          <p className="empty-title">Rien pour l'instant</p>
          <p className="empty-text">
            {online
              ? "Les ajouts, retraits et commentaires s'afficheront ici."
              : "L'activité n'est pas disponible hors ligne."}
          </p>
        </div>
      ) : (
        days.map((day) => (
          <div key={day.label} className="activity-day">
            <h2 className="activity-date">{day.label}</h2>
            <ul className="card activity-list">
              {day.items.map((h) => {
                const who = h.type === "comment" ? h.author || "Quelqu'un" : h.member;
                const onOther = h.type === "comment" && h.member && h.member !== who;
                return (
                  <li key={h.id} className="activity-item">
                    <Avatar name={who} size="sm" />
                    <div className="activity-body">
                      <p className="activity-line">
                        <strong>{who}</strong>{" "}
                        {h.type === "add"
                          ? "a ajouté"
                          : h.type === "remove"
                          ? "a retiré"
                          : "a commenté"}{" "}
                        {h.name && <span className="activity-el">{h.name}</span>}
                        {onOther && <span className="activity-ctx"> · liste de {h.member}</span>}
                      </p>
                      {h.type === "comment" && h.text && (
                        <p className="activity-quote">{h.text}</p>
                      )}
                    </div>
                    <time className="activity-time">{timeAgo(h.at)}</time>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
