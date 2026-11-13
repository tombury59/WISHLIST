import { normalizeUrl, hostOf } from "../lib/format";
import Avatar from "./Avatar";
import Icon from "./Icon";
import LinkThumb from "./LinkThumb";

// « À offrir » : tous les cadeaux que J'AI réservés, regroupés par personne.
// C'est la liste de courses de Noël / d'anniversaire. Elle est construite à
// partir de données déjà chargées (souhaits + réservations) : 0 requête en plus.
//
// `groups` = [{ member, items: [{ wish, at }] }]
export default function GiftsPage({ groups, online, onUnreserve, onOpenList }) {
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section className="page">
      <header className="page-head">
        <span className="page-icon">
          <Icon name="gift" size={24} />
        </span>
        <div className="page-titles">
          <h1 className="page-title">À offrir</h1>
          <p className="page-sub">
            {total === 0
              ? "Les cadeaux que tu réserves apparaissent ici."
              : `${total} cadeau${total > 1 ? "x" : ""} réservé${total > 1 ? "s" : ""} — invisible pour la personne concernée.`}
          </p>
        </div>
      </header>

      {total === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">
            <Icon name="gift" size={30} />
          </span>
          <p className="empty-title">Rien de réservé pour l'instant</p>
          <p className="empty-text">
            Ouvre la liste de quelqu'un et touche « Réserver » sur le cadeau que
            tu comptes offrir. Les autres verront qu'il est pris — pas la
            personne à qui il est destiné.
          </p>
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.member} className="card gift-group">
            <button className="gift-group-head" onClick={() => onOpenList(g.member)}>
              <Avatar name={g.member} size="md" />
              <span className="gift-group-name">Pour {g.member}</span>
              <span className="gift-group-link">
                Voir sa liste <Icon name="chevronRight" size={16} />
              </span>
            </button>
            <ul className="gift-list">
              {g.items.map(({ wish }) => (
                <li key={wish.id} className="gift-row">
                  {wish.link ? (
                    <LinkThumb link={wish.link} />
                  ) : (
                    <span className="thumb thumb-empty">
                      <Icon name="gift" size={20} />
                    </span>
                  )}
                  <div className="wish-body">
                    {wish.link ? (
                      <a
                        className="wish-name wish-name-link"
                        href={normalizeUrl(wish.link)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {wish.name}
                      </a>
                    ) : (
                      <span className="wish-name">{wish.name}</span>
                    )}
                    <span className="wish-meta">
                      {wish.disabled ? (
                        <span className="tag">Déjà reçu d'après {g.member}</span>
                      ) : (
                        wish.link && hostOf(wish.link)
                      )}
                    </span>
                  </div>
                  {online && (
                    <button
                      className="btn btn-quiet btn-sm"
                      onClick={() => onUnreserve(g.member, wish.id)}
                    >
                      Annuler
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
