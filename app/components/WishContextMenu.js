"use client";

import { createPortal } from "react-dom";
import { REACTIONS } from "../lib/reactions";
import { normalizeUrl } from "../lib/format";
import { copyToClipboard } from "../lib/clipboard";

// Menu contextuel d'un souhait (clic droit PC / bouton ☰ mobile).
//
// Rendu via un portail vers <body> : sinon, dans le carrousel, le `transform`
// des diapos casse le `position: fixed` et le `overflow: hidden` le rognerait.
export default function WishContextMenu({
  pos,
  wish,
  member,
  me,
  canEdit,
  online = true,
  onClose,
  onOpenComments,
  onRequestEdit,
  onDelete,
  onSetDisabled,
  onToggleReaction,
  canReserve = false,
  reservation = null,
  onReserve,
  onUnreserve,
}) {
  const reactions = wish.reactions || {};

  function run(action) {
    action();
    onClose();
  }

  return createPortal(
    <>
      <div
        className="reaction-backdrop"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        className="ctx-menu"
        style={{ left: pos.x, top: pos.y }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* Catégorie : lien & copie */}
        {wish.link && (
          <button
            type="button"
            className="ctx-item"
            onClick={() =>
              run(() => window.open(normalizeUrl(wish.link), "_blank", "noopener"))
            }
          >
            Ouvrir le lien
          </button>
        )}
        <button
          type="button"
          className="ctx-item"
          onClick={() => run(() => copyToClipboard(wish.name))}
        >
          Copier le nom
        </button>
        {wish.link && (
          <button
            type="button"
            className="ctx-item"
            onClick={() => run(() => copyToClipboard(normalizeUrl(wish.link)))}
          >
            Copier le lien
          </button>
        )}

        {/* Catégorie : actions (indisponibles hors ligne) */}
        {online && (
          <>
            <div className="ctx-sep" />
            <button
              type="button"
              className="ctx-item"
              onClick={() => run(() => onOpenComments(wish.id))}
            >
              Commenter
            </button>
            {/* Réservation (liste de quelqu'un d'autre uniquement) */}
            {canReserve &&
              (wish.disabled && !reservation ? null : !reservation ? (
                <button
                  type="button"
                  className="ctx-item"
                  onClick={() => run(() => onReserve(member, wish.id))}
                >
                  Réserver ce cadeau
                </button>
              ) : reservation.by === me ? (
                <button
                  type="button"
                  className="ctx-item"
                  onClick={() => run(() => onUnreserve(member, wish.id))}
                >
                  Annuler ma réservation
                </button>
              ) : (
                <button type="button" className="ctx-item" disabled>
                  Réservé par {reservation.by}
                </button>
              ))}
          </>
        )}

        {/* Catégorie : modifier / supprimer (sa propre liste, en ligne) */}
        {canEdit && online && (
          <>
            <div className="ctx-sep" />
            <button
              type="button"
              className="ctx-item"
              onClick={() => run(() => onRequestEdit(member, wish))}
            >
              Modifier
            </button>
            <button
              type="button"
              className="ctx-item"
              onClick={() =>
                run(() => onSetDisabled(member, wish.id, !wish.disabled))
              }
            >
              {wish.disabled ? "Remettre dans la liste" : "Marquer comme déjà reçu"}
            </button>
            <button
              type="button"
              className="ctx-item ctx-item-danger"
              onClick={() => run(() => onDelete(member, wish))}
            >
              Supprimer
            </button>
          </>
        )}

        <div className="ctx-sep" />

        {/* Catégorie : réactions */}
        <div className="ctx-reactions">
          {REACTIONS.map((r) => {
            const mine = (reactions[r] || []).includes(me);
            return (
              <button
                key={r}
                type="button"
                className={"reaction-choice" + (mine ? " reaction-choice-on" : "")}
                onClick={() => run(() => onToggleReaction(member, wish.id, r))}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>
    </>,
    document.body
  );
}
