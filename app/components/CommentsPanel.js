"use client";

import { useRef, useState } from "react";
import { matchMembers, typingQuery } from "../lib/richtext";
import Avatar from "./Avatar";
import Icon from "./Icon";
import RichText from "./RichText";

// Panneau des commentaires : latéral (grand écran), en dessous (carrousel sur
// écran étroit) ou en modale (liste sur écran étroit).
// `variant` = "side" | "modal".
// Les commentaires affichent les liens (cliquables) et les @prénoms (colorés,
// ils ouvrent la liste de la personne) ; taper « @ » propose la famille.
export default function CommentsPanel({
  wish,
  member,
  me,
  variant,
  online = true,
  onAddComment,
  onDeleteComment,
  onClose,
  onMention, // (prénom) => void : ouvre sa liste
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [suggest, setSuggest] = useState(null); // { start, query, items, index }
  const inputRef = useRef(null);
  const comments = wish.comments || [];

  function updateSuggest(value, caret) {
    const q = typingQuery(value, caret);
    const items = q ? matchMembers(q.query) : [];
    setSuggest(items.length ? { ...q, items, index: 0 } : null);
  }

  function pick(name) {
    if (!suggest) return;
    const input = inputRef.current;
    const caret = input ? input.selectionStart : text.length;
    const insert = `@${name} `;
    const next = text.slice(0, suggest.start) + insert + text.slice(caret);
    setText(next);
    setSuggest(null);
    requestAnimationFrame(() => {
      if (!input) return;
      input.focus();
      const c = suggest.start + insert.length;
      input.setSelectionRange(c, c);
    });
  }

  function onKeyDown(e) {
    if (!suggest) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const d = e.key === "ArrowDown" ? 1 : -1;
      setSuggest((s) => ({ ...s, index: (s.index + d + s.items.length) % s.items.length }));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      pick(suggest.items[suggest.index]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSuggest(null);
    }
  }

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
                  <RichText className="comment-text" text={c.text} onMention={onMention} />
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
          {/* Suggestions « @ » : la famille, filtrée au fil de la frappe. */}
          {suggest && (
            <div className="comment-suggest" role="listbox" aria-label="Citer quelqu'un">
              {suggest.items.map((name, i) => (
                <button
                  key={name}
                  type="button"
                  role="option"
                  aria-selected={i === suggest.index}
                  className={"chip comment-suggest-chip" + (i === suggest.index ? " is-on" : "")}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(name);
                  }}
                >
                  <Avatar name={name} size="xs" />
                  {name}
                </button>
              ))}
            </div>
          )}
          <input
            ref={inputRef}
            className="field"
            placeholder={`Commenter en tant que ${me}…`}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              updateSuggest(e.target.value, e.target.selectionStart);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => setTimeout(() => setSuggest(null), 150)}
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
