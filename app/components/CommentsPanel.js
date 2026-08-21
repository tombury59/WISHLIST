"use client";

import { useState } from "react";

// Panneau des commentaires : latéral (desktop), en dessous (mobile carrousel)
// ou en modale (mobile liste). `variant` = "side" | "modal" | "inline".
export default function CommentsPanel({
  wish,
  member,
  me,
  variant,
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

  const withChrome = variant === "side" || variant === "modal";
  return (
    <div className={"comments comments--" + variant}>
      {withChrome && (
        <div className="comments-head">
          <span className="comments-title">{wish.name}</span>
          <button
            className="comments-close"
            onClick={onClose}
            aria-label="Fermer"
            title="Fermer"
          >
            ×
          </button>
        </div>
      )}

      <div className="comments-scroll">
        {comments.length > 0 ? (
          <ul className="comment-list">
            {comments.map((c) => (
              <li key={c.id} className="comment">
                <div className="comment-body">
                  {c.author && <span className="comment-author">{c.author}</span>}
                  <span className="comment-text">{c.text}</span>
                </div>
                {c.author === me && (
                  <button
                    className="comment-del"
                    onClick={() => onDeleteComment(member, wish.id, c)}
                    aria-label="Supprimer le commentaire"
                    title="Supprimer"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          withChrome && (
            <p className="comments-empty">Aucun commentaire pour l'instant.</p>
          )
        )}
      </div>

      <form className="comment-form" onSubmit={submit}>
        <span className="comment-as">{me} :</span>
        <input
          className="field comment-input"
          placeholder="Ajouter un commentaire…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn-primary btn-sm" disabled={sending || !text.trim()}>
          {sending ? "…" : "Envoyer"}
        </button>
      </form>
    </div>
  );
}
