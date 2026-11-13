"use client";

import { normalizeUrl, hostOf } from "../lib/format";
import Avatar from "./Avatar";
import Icon from "./Icon";
import LinkThumb from "./LinkThumb";

// Miniature d'un cadeau (aperçu du lien, sinon icône).
function Thumb({ wish }) {
  return wish.link ? (
    <LinkThumb link={wish.link} />
  ) : (
    <span className="thumb thumb-empty">
      <Icon name="gift" size={20} />
    </span>
  );
}

// Nom (cliquable si lien) + ligne d'info.
function Body({ wish, meta }) {
  return (
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
      {meta && <span className="wish-meta">{meta}</span>}
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name="gift" size={30} />
      </span>
      <p className="empty-title">{title}</p>
      <p className="empty-text">{text}</p>
    </div>
  );
}

// Rubrique « Cadeaux », en deux onglets :
//  - « À offrir » : les cadeaux que J'AI réservés, regroupés par personne
//    (ma liste de courses) ;
//  - « Reçus »    : mes souhaits que j'ai marqués « déjà reçu ».
// Tout est construit à partir des données déjà chargées : 0 requête en plus.
//
// `groups`   = [{ member, items: [{ wish, at }] }]
// `received` = [wish]
export default function GiftsPage({
  groups,
  received,
  tab = "give", // onglet affiché : "give" | "received" (piloté par le parent)
  onTab,
  online,
  onUnreserve,
  onRestore,
  onOpenList,
}) {
  const setTab = onTab;
  const toGive = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section className="page">
      <header className="page-head">
        <span className="page-icon">
          <Icon name="gift" size={24} />
        </span>
        <div className="page-titles">
          <h1 className="page-title">Cadeaux</h1>
          <p className="page-sub">
            {tab === "give"
              ? "Ce que tu as prévu d'offrir — invisible pour les personnes concernées."
              : "Les souhaits de ta liste que tu as déjà reçus."}
          </p>
        </div>
      </header>

      <div className="filter" role="tablist" aria-label="Cadeaux">
        <button
          role="tab"
          aria-selected={tab === "give"}
          className={"chip" + (tab === "give" ? " is-on" : "")}
          onClick={() => setTab("give")}
        >
          À offrir <span className="chip-n">{toGive}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === "received"}
          className={"chip" + (tab === "received" ? " is-on" : "")}
          onClick={() => setTab("received")}
        >
          Reçus <span className="chip-n">{received.length}</span>
        </button>
      </div>

      {/* ---------- À OFFRIR ---------- */}
      {tab === "give" &&
        (toGive === 0 ? (
          <EmptyState
            title="Rien de réservé pour l'instant"
            text="Ouvre la liste de quelqu'un et touche « Réserver » sur le cadeau que tu comptes offrir. Les autres verront qu'il est pris — pas la personne à qui il est destiné."
          />
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
                    <Thumb wish={wish} />
                    <Body
                      wish={wish}
                      meta={
                        wish.disabled ? (
                          <span className="tag">Déjà reçu d'après {g.member}</span>
                        ) : (
                          wish.link && hostOf(wish.link)
                        )
                      }
                    />
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
        ))}

      {/* ---------- REÇUS ---------- */}
      {tab === "received" &&
        (received.length === 0 ? (
          <EmptyState
            title="Aucun cadeau reçu pour l'instant"
            text="Quand tu reçois un cadeau de ta liste, ouvre son menu (⋮) et choisis « Marquer comme déjà reçu » : il quitte ta liste, arrive ici et n'est plus proposé aux autres."
          />
        ) : (
          <ul className="card gift-list">
            {received.map((wish) => (
              <li key={wish.id} className="gift-row">
                <Thumb wish={wish} />
                <Body wish={wish} meta={wish.link && hostOf(wish.link)} />
                {online && (
                  <button
                    className="btn btn-quiet btn-sm"
                    onClick={() => onRestore(wish.id)}
                    title="Le remettre dans ta liste de souhaits"
                  >
                    Remettre
                  </button>
                )}
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}
