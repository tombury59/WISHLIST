"use client";

import { useState } from "react";
import { REACTIONS } from "../lib/reactions";
import { normalizeUrl } from "../lib/format";
import LinkThumb from "./LinkThumb";
import WishContextMenu from "./WishContextMenu";

// Un souhait — en ligne (variant "list") ou en carte (variant "card").
// Les commentaires ouverts sont pilotés par le parent (un seul à la fois).
export default function WishItem({
  wish,
  member,
  me,
  canEdit,
  variant = "list",
  rank = 0, // 1, 2 ou 3 pour les trois premiers de la liste ; 0 sinon
  onDelete,
  onRequestEdit,
  onToggleReaction,
  openCommentsId,
  onToggleComments,
  onOpenComments,
  online = true,
  // Glisser-déposer (fournis seulement en vue liste sur SA propre liste).
  dragRef,
  dragStyle,
  dragAttributes,
  dragListeners,
  isDragging,
}) {
  const open = openCommentsId === wish.id;

  // Menu contextuel : `menu` = position { x, y } où l'afficher, ou null.
  const [menu, setMenu] = useState(null);

  // Rebond de l'icône commentaire au clic (classe basculée, remise à zéro en
  // fin d'animation pour pouvoir rejouer — pas de `key` qui la doublerait sous
  // React StrictMode).
  const [commentBump, setCommentBump] = useState(false);

  const comments = wish.comments || [];
  const reactions = wish.reactions || {};

  // Ouvre le menu à (x, y), en le gardant dans l'écran.
  function openAt(x, y) {
    const w = 224;
    const h = 400;
    const px = Math.max(8, Math.min(x, window.innerWidth - w - 8));
    const py = Math.max(8, Math.min(y, window.innerHeight - h - 8));
    setMenu({ x: px, y: py });
  }

  function openMenu(e) {
    e.preventDefault();
    openAt(e.clientX, e.clientY);
  }

  // Ouverture par le bouton ☰ : menu juste sous le bouton, aligné à droite.
  // Remplace l'ancien appui long, capricieux sur mobile.
  function openMenuFromButton(e) {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    openAt(r.right - 224, r.bottom + 6);
  }

  // Le nom (avec lien éventuel) — partagé entre la liste et la carte.
  const nameEl = (
    <span className="wish-name">
      {wish.link ? (
        <a
          className="wish-name-link"
          href={normalizeUrl(wish.link)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {wish.name}
        </a>
      ) : (
        wish.name
      )}
    </span>
  );

  // Les boutons 💬 (commentaires) et ☰ (menu) — partagés.
  const controls = (
    <>
      <button
        type="button"
        className={"wish-comment-btn" + (open ? " is-open" : "")}
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
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
        {comments.length > 0 && (
          <span className="wish-comment-count">{comments.length}</span>
        )}
      </button>
      <button
        type="button"
        className="wish-menu-btn"
        onClick={openMenuFromButton}
        aria-label="Ouvrir le menu"
        title="Menu"
      >
        ☰
      </button>
    </>
  );

  return (
    <li
      ref={dragRef}
      style={dragStyle}
      {...dragAttributes}
      {...dragListeners}
      className={
        "wish" +
        (variant === "card" ? " wish-cardli" : "") +
        (isDragging ? " wish-dragging" : "") +
        (rank && variant !== "card" ? " wish-rank wish-rank-" + rank : "")
      }
    >
      {variant === "card" ? (
        <div className="wish-card" onContextMenu={openMenu}>
          {rank > 0 && (
            <span className={"wish-rank-badge wish-rank-badge-" + rank}>{rank}</span>
          )}
          {wish.link ? (
            <LinkThumb link={wish.link} big />
          ) : (
            <div className="wish-card-noimg">🎁</div>
          )}
          <div className="wish-card-main">
            {nameEl}
            <div className="wish-card-controls">{controls}</div>
          </div>
        </div>
      ) : (
        <div className="wish-row" onContextMenu={openMenu}>
          {dragListeners && (
            <span className="wish-drag-handle" aria-hidden="true" title="Glisser pour réordonner">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                <circle cx="5" cy="4" r="1.4" />
                <circle cx="11" cy="4" r="1.4" />
                <circle cx="5" cy="8" r="1.4" />
                <circle cx="11" cy="8" r="1.4" />
                <circle cx="5" cy="12" r="1.4" />
                <circle cx="11" cy="12" r="1.4" />
              </svg>
            </span>
          )}
          {wish.link && <LinkThumb link={wish.link} />}
          {nameEl}
          {controls}
        </div>
      )}

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
          onToggleReaction={onToggleReaction}
        />
      )}

      {/* Badges des réactions déjà posées ; un clic bascule la tienne. */}
      {REACTIONS.some((r) => (reactions[r] || []).length > 0) && (
        <div className="reaction-bar">
          {REACTIONS.filter((r) => (reactions[r] || []).length > 0).map((r) => {
            const who = reactions[r] || [];
            const mine = who.includes(me);
            return (
              <button
                key={r}
                type="button"
                className={"reaction-badge" + (mine ? " reaction-badge-on" : "")}
                onClick={() => onToggleReaction(member, wish.id, r)}
                title={who.join(", ")}
              >
                <span className="reaction-emoji">{r}</span>
                <span className="reaction-count">{who.length}</span>
              </button>
            );
          })}
        </div>
      )}
    </li>
  );
}
