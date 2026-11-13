"use client";

import { useState } from "react";
import { REACTIONS } from "../lib/reactions";
import { normalizeUrl, hostOf } from "../lib/format";
import Avatar from "./Avatar";
import Icon from "./Icon";
import LinkThumb from "./LinkThumb";
import WishContextMenu from "./WishContextMenu";

const MENU_W = 232;

// Un souhait — en ligne (variant "list") ou en carte (variant "card").
// Les commentaires ouverts sont pilotés par le parent (un seul à la fois).
export default function WishItem({
  wish,
  member,
  me,
  canEdit,
  variant = "list",
  position = 0, // rang dans la liste affichée (repli si `ranks` est absent)
  ranks = null, // { wishId: rang réel } — stable même quand la liste est filtrée
  onDelete,
  onSetDisabled,
  onRequestEdit,
  onToggleReaction,
  openCommentsId,
  onToggleComments,
  onOpenComments,
  online = true,
  // Réservation (seulement sur la liste de quelqu'un d'autre).
  canReserve = false,
  reservations = null, // { wishId: { by, at } } pour la liste affichée
  onReserve,
  onUnreserve,
  // Glisser-déposer (fournis seulement en vue liste sur SA propre liste).
  dragRef,
  dragStyle,
  dragAttributes,
  dragListeners,
  isDragging,
}) {
  const open = openCommentsId === wish.id;

  // Souhait désactivé par son propriétaire (cadeau déjà reçu) : grisé, sans
  // rang, non réservable.
  const disabled = Boolean(wish.disabled);
  const rank = disabled ? 0 : ranks?.[wish.id] || position;

  // Menu contextuel : `menu` = position { x, y } où l'afficher, ou null.
  const [menu, setMenu] = useState(null);

  // Rebond de l'icône commentaire au clic (classe basculée, remise à zéro en
  // fin d'animation pour pouvoir rejouer — pas de `key` qui la doublerait sous
  // React StrictMode).
  const [commentBump, setCommentBump] = useState(false);

  const comments = wish.comments || [];
  const reactions = wish.reactions || {};
  const hasReactions = REACTIONS.some((r) => (reactions[r] || []).length > 0);

  // Réservation de ce souhait : null si libre (ou si c'est ma propre liste).
  const reservation = canReserve ? reservations?.[wish.id] || null : null;
  const reservedByMe = reservation?.by === me;
  const reservedByOther = Boolean(reservation) && !reservedByMe;
  const showReserve = canReserve && (reservation || (online && !disabled));

  // Ouvre le menu à (x, y), en le gardant dans l'écran.
  function openAt(x, y) {
    const h = 420;
    const px = Math.max(8, Math.min(x, window.innerWidth - MENU_W - 8));
    const py = Math.max(8, Math.min(y, window.innerHeight - h - 8));
    setMenu({ x: px, y: py });
  }

  function openMenu(e) {
    e.preventDefault();
    openAt(e.clientX, e.clientY);
  }

  // Ouverture par un bouton : menu juste sous le bouton, aligné à droite.
  function openMenuFromButton(e) {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    openAt(r.right - MENU_W, r.bottom + 6);
  }

  const host = wish.link ? hostOf(wish.link) : "";

  // Rang : médaille or / argent / bronze pour le podium, numéro discret ensuite.
  const rankEl =
    rank > 0 ? (
      <span
        className={"rank" + (rank <= 3 ? " rank-" + rank : "")}
        title={rank <= 3 ? "Dans le top 3 des envies" : undefined}
      >
        {rank}
      </span>
    ) : disabled ? (
      <span className="rank rank-done" title="Déjà reçu">
        <Icon name="check" size={13} strokeWidth={2.6} />
      </span>
    ) : null;

  // Nom + site du lien + étiquette « Reçu ».
  const bodyEl = (
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
      {(host || disabled) && (
        <span className="wish-meta">
          {disabled && <span className="tag">Déjà reçu</span>}
          {host && (
            <span className="wish-host">
              {host} <Icon name="external" size={11} strokeWidth={2} />
            </span>
          )}
        </span>
      )}
    </div>
  );

  // Les boutons commentaires et menu — partagés.
  const controls = (
    <div className="wish-controls">
      <button
        type="button"
        className={"icon-btn wish-comment-btn" + (open ? " is-open" : "")}
        onClick={() => {
          setCommentBump(true);
          onToggleComments(wish.id);
        }}
        aria-label={open ? "Cacher les commentaires" : "Afficher les commentaires"}
        title="Commentaires"
      >
        <svg
          className={"wish-comment-icon" + (commentBump ? " is-bump" : "")}
          onAnimationEnd={() => setCommentBump(false)}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M20 12C20 16.4183 16.4183 20 12 20C10.5937 20 9.27223 19.6372 8.12398 19C7.53267 18.6719 4.48731 20.4615 3.99998 20C3.44096 19.4706 5.4583 16.6708 5.07024 16C4.38956 14.8233 3.99999 13.4571 3.99999 12C3.99999 7.58172 7.58171 4 12 4C16.4183 4 20 7.58172 20 12Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
        {comments.length > 0 && (
          <span className="wish-comment-count">{comments.length}</span>
        )}
      </button>
      <button
        type="button"
        className="icon-btn"
        onClick={openMenuFromButton}
        aria-label="Plus d'actions"
        title="Plus d'actions"
      >
        <Icon name="more" size={20} />
      </button>
    </div>
  );

  // Pied : réactions posées (+ bouton pour réagir) et réservation.
  const footEl = (hasReactions || showReserve) && (
    <div className="wish-foot">
      <div className="reaction-bar">
        {REACTIONS.filter((r) => (reactions[r] || []).length > 0).map((r) => {
          const who = reactions[r] || [];
          const mine = who.includes(me);
          return (
            <button
              key={r}
              type="button"
              className={"reaction-badge" + (mine ? " is-on" : "")}
              onClick={() => onToggleReaction(member, wish.id, r)}
              title={who.join(", ")}
            >
              <span className="reaction-emoji">{r}</span>
              <span className="reaction-count">{who.length}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="reaction-add"
          onClick={openMenuFromButton}
          aria-label="Réagir"
          title="Réagir"
        >
          <Icon name="smilePlus" size={16} />
        </button>
      </div>

      {/* Réservation : jamais affichée à la personne dont c'est la liste. */}
      {showReserve &&
        (reservedByOther ? (
          <span className="reserve reserve-other">
            <Avatar name={reservation.by} size="xs" />
            Réservé par {reservation.by}
          </span>
        ) : reservedByMe ? (
          <button
            type="button"
            className="reserve reserve-mine"
            disabled={!online}
            onClick={() => onUnreserve(member, wish.id)}
            title="Annuler ma réservation"
          >
            <Icon name="check" size={15} strokeWidth={2.4} />
            <span className="reserve-on">Réservé par toi</span>
            <span className="reserve-off">Annuler</span>
          </button>
        ) : (
          <button
            type="button"
            className="reserve reserve-free"
            onClick={() => onReserve(member, wish.id)}
          >
            <Icon name="gift" size={15} />
            Réserver
          </button>
        ))}
    </div>
  );

  const thumbEl = (big) =>
    wish.link ? (
      <LinkThumb link={wish.link} big={big} />
    ) : (
      <span className={"thumb thumb-empty" + (big ? " thumb-big" : "")}>
        <Icon name="gift" size={big ? 44 : 20} strokeWidth={big ? 1.2 : 1.8} />
      </span>
    );

  return (
    <li
      ref={dragRef}
      style={dragStyle}
      {...dragAttributes}
      {...dragListeners}
      className={
        "wish" +
        (variant === "card" ? " wish-as-card" : "") +
        (isDragging ? " is-dragging" : "") +
        (reservedByOther ? " is-reserved" : "") +
        (reservedByMe ? " is-mine" : "") +
        (disabled ? " is-disabled" : "") +
        (rank >= 1 && rank <= 3 ? " is-top is-top-" + rank : "")
      }
    >
      {variant === "card" ? (
        <div className="wish-card" onContextMenu={openMenu}>
          <div className="wish-card-media">
            {thumbEl(true)}
            {rankEl}
          </div>
          <div className="wish-card-main">
            {bodyEl}
            {controls}
          </div>
        </div>
      ) : (
        <div className="wish-row" onContextMenu={openMenu}>
          {dragListeners && (
            <span className="wish-grip" aria-hidden="true" title="Glisser pour classer">
              <Icon name="grip" size={16} />
            </span>
          )}
          {rankEl}
          {thumbEl(false)}
          {bodyEl}
          {controls}
        </div>
      )}

      {footEl}

      {menu && (
        <WishContextMenu
          pos={menu}
          wish={wish}
          member={member}
          me={me}
          canEdit={canEdit}
          online={online}
          onClose={() => setMenu(null)}
          onOpenComments={onOpenComments}
          onRequestEdit={onRequestEdit}
          onDelete={onDelete}
          onSetDisabled={onSetDisabled}
          onToggleReaction={onToggleReaction}
          canReserve={canReserve}
          reservation={reservation}
          onReserve={onReserve}
          onUnreserve={onUnreserve}
        />
      )}
    </li>
  );
}
