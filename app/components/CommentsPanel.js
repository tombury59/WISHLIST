"use client";

import { useState } from "react";
import Avatar from "./Avatar";
import Icon from "./Icon";

// Panneau des commentaires : latéral (grand écran), en dessous (carrousel sur
// écran étroit) ou en modale (liste sur écran étroit).
// `variant` = "side" | "modal".
export default function CommentsPanel({
  wish,
  member,
  me,
  variant,
  online = true,
  onAddComment,
  onDeleteComment,
  onClose,
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const comments = wish.comments || [];

  async function submit(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      // Le commentaire est automatiquement à ton nom (le profil choisi).
      await onAddComment(member, wish.id, t, me);
      setText("");
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={"comments comments--" + variant}>
      <div className="comments-head">
        <div className="comments-titles">
          <span className="comments-kicker">Commentaires</span>
          <span className="comments-title">{wish.name}</span>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Fermer" title="Fermer">
          <Icon name="x" size={20} />
        </button>
      </div>

      <div className="comments-scroll">
        {comments.length > 0 ? (
          <ul className="comment-list">
            {comments.map((c) => (
              <li key={c.id} className={"comment" + (c.author === me ? " is-me" : "")}>
                <Avatar name={c.author || "?"} size="sm" />
                <div className="comment-bubble">
                  {c.author && <span className="comment-author">{c.author}</span>}
                  <span className="comment-text">{c.text}</span>
                </div>
                {c.author === me && online && (
                  <button
                    className="icon-btn icon-btn-sm comment-del"
                    onClick={() => onDeleteComment(member, wish.id, c)}
                    aria-label="Supprimer le commentaire"
                    title="Supprimer"
                  >
                    <Icon name="x" size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="comments-empty">
            Aucun commentaire. Une taille, une couleur, une précision ? Écris-la ici.
          </p>
        )}
      </div>

      {online ? (
        <form className="comment-form" onSubmit={submit}>
          <input
            className="field"
            placeholder={`Commenter en tant que ${me}…`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Ton commentaire"
          />
          <button
            className="btn btn-primary btn-icon"
            disabled={sending || !text.trim()}
            aria-label="Envoyer"
            title="Envoyer"
          >
            <Icon name="send" size={17} />
          </button>
        </form>
      ) : (
        <p className="comments-offline">Commentaires en lecture seule hors ligne.</p>
      )}
    </div>
  );
}
