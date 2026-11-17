"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { avatarColor, timeAgo } from "../lib/format";
import {
  buildEndRe,
  buildTokenRe,
  linkHref,
  matchMembers,
  matchWishes,
  tokenize,
  typingQuery,
} from "../lib/richtext";
import Avatar from "./Avatar";
import Icon from "./Icon";
import ClovisArt from "./ClovisArt";

// Notes perso : une grande page que seul son auteur voit dans l'appli.
//
// Éditeur : un <textarea> au texte transparent posé sur un « miroir » qui
// affiche le même texte, mis en valeur. Les deux ont exactement la même mise en
// forme, donc le curseur tombe pile. Dans le miroir :
//   - @Prénom   : couleur de la personne, ouvre sa liste ;
//   - #Souhait  : couleur de son propriétaire, ouvre sa liste sur ce souhait ;
//   - liens     : soulignés, ouverts dans un nouvel onglet.
//
// Pas d'enregistrement automatique : bouton « Enregistrer » (ou Ctrl/Cmd+S).

export const NOTES_MAX = 10000;

export default function NotesPage({
  me,
  notes, // { text, at } | null (pas encore chargées)
  loading,
  error,
  draft,
  onDraft,
  online,
  onSave, // async () => void
  onRetry,
  onMention, // (prénom) => void
  wishes = [], // [{ id, name, member }] : souhaits citables avec #
  onWish, // (membre, idSouhait) => void
}) {
  const areaRef = useRef(null);
  const measureRef = useRef(null);
  const caretRef = useRef(null); // position du curseur à remettre après un changement
  const [suggest, setSuggest] = useState(null); // { kind, start, query, items, index }
  const [suggestPos, setSuggestPos] = useState(null);
  const [status, setStatus] = useState(""); // "", "saving", "saved", "error"

  const dirty = notes !== null && draft !== notes.text;

  // Expressions construites à partir des noms de souhaits du moment.
  const wishNamesKey = wishes.map((w) => w.name).join("\u0000");
  const { tokenRe, endRe, byName } = useMemo(() => {
    const names = wishes.map((w) => w.name);
    const byName = new Map();
    for (const w of wishes) if (!byName.has(w.name)) byName.set(w.name, w);
    return { tokenRe: buildTokenRe(names), endRe: buildEndRe(names), byName };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishNamesKey]);

  // Remet le curseur au bon endroit après un remplacement (mention, effacement).
  useLayoutEffect(() => {
    if (caretRef.current != null && areaRef.current) {
      const c = caretRef.current;
      caretRef.current = null;
      areaRef.current.setSelectionRange(c, c);
    }
  }, [draft]);

  // Un changement après un enregistrement efface le « Enregistré ».
  useEffect(() => {
    if (dirty && status === "saved") setStatus("");
  }, [dirty, status]);

  async function save() {
    if (!dirty || !online || status === "saving") return;
    setStatus("saving");
    try {
      await onSave();
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  // Position (dans l'éditeur) d'un index du texte : mesurée sur un clone caché.
  function coordsAt(index) {
    const box = measureRef.current;
    if (!box) return { top: 0, left: 0 };
    box.textContent = draft.slice(0, index);
    const mark = document.createElement("span");
    mark.textContent = "​";
    box.appendChild(mark);
    return { top: mark.offsetTop + mark.offsetHeight, left: mark.offsetLeft };
  }

  function updateSuggest(text, caret) {
    const q = typingQuery(text, caret, { wishes: wishes.length > 0 });
    if (!q) return setSuggest(null);
    const items = q.kind === "@" ? matchMembers(q.query) : matchWishes(wishes, q.query);
    if (!items.length) return setSuggest(null);
    setSuggest((cur) => ({
      ...q,
      items,
      index: cur && cur.start === q.start ? Math.min(cur.index, items.length - 1) : 0,
    }));
  }

  // La position de la liste se calcule une fois le texte affiché.
  useLayoutEffect(() => {
    setSuggestPos(suggest ? coordsAt(suggest.start) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggest?.start, draft]);

  function pick(item) {
    if (!suggest) return;
    const area = areaRef.current;
    const caret = area ? area.selectionStart : suggest.start + suggest.query.length + 1;
    const insert = suggest.kind === "@" ? `@${item} ` : `#${item.name} `;
    const next = draft.slice(0, suggest.start) + insert + draft.slice(caret);
    if (next.length > NOTES_MAX) return;
    caretRef.current = suggest.start + insert.length;
    onDraft(next);
    setSuggest(null);
    area?.focus();
  }

  function onKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      save();
      return;
    }
    if (suggest) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const d = e.key === "ArrowDown" ? 1 : -1;
        setSuggest((s) => ({ ...s, index: (s.index + d + s.items.length) % s.items.length }));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pick(suggest.items[suggest.index]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSuggest(null);
        return;
      }
    }
    // Une mention (@prénom ou #souhait) s'efface d'un coup.
    if (e.key === "Backspace") {
      const area = e.currentTarget;
      const { selectionStart: s, selectionEnd: end } = area;
      if (s !== end) return;
      const m = draft.slice(0, s).match(endRe);
      if (!m) return;
      e.preventDefault();
      caretRef.current = s - m[0].length;
      onDraft(draft.slice(0, s - m[0].length) + draft.slice(s));
      setSuggest(null);
    }
  }

  // ---------- Chargement / erreur ----------
  if (!notes) {
    return (
      <section className="page notes-page">
        <NotesHead me={me} />
        {loading || !error ? (
          <div className="empty-state empty-loading">
            <ClovisArt pose="fouille" width={120} className="empty-art" />
            <p className="empty-text">Clovis cherche tes notes…</p>
          </div>
        ) : (
          <div className="empty-state">
            <ClovisArt pose="decu" width={110} className="empty-art" />
            <p className="empty-title">Notes indisponibles</p>
            <p className="empty-text">{error}</p>
            {online && (
              <button className="btn btn-soft" onClick={onRetry}>
                Réessayer
              </button>
            )}
          </div>
        )}
      </section>
    );
  }

  const parts = tokenize(draft, tokenRe);
  const near = draft.length > NOTES_MAX * 0.9;

  return (
    <section className="page notes-page">
      <NotesHead me={me} />

      <div className="card notes-card">
        <div className="notes-editor">
          {/* Le miroir : même texte, mis en valeur et cliquable. */}
          <div className="notes-text notes-mirror" aria-hidden="true">
            {parts.map((p, i) => {
              if (typeof p === "string") return p;
              if (p.url) {
                // Nouvel onglet : la note reste ouverte, rien n'est perdu.
                return (
                  <a
                    key={i}
                    href={linkHref(p.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={-1}
                    className="note-link"
                    title="Ouvrir le lien"
                  >
                    {p.url}
                  </a>
                );
              }
              if (p.name) {
                return (
                  <button
                    key={i}
                    type="button"
                    tabIndex={-1}
                    className="mention"
                    style={{ "--c": avatarColor(p.name) }}
                    onClick={() => onMention(p.name)}
                    title={`Ouvrir la liste de ${p.name}`}
                  >
                    @{p.name}
                  </button>
                );
              }
              const w = byName.get(p.wish);
              return (
                <button
                  key={i}
                  type="button"
                  tabIndex={-1}
                  className="wish-ref"
                  style={{ "--c": avatarColor(w.member) }}
                  onClick={() => onWish(w.member, w.id)}
                  title={`Voir ce souhait dans la liste de ${w.member}`}
                >
                  #{p.wish}
                </button>
              );
            })}
            {"​"}
          </div>
          <textarea
            ref={areaRef}
            className="notes-text notes-area"
            value={draft}
            maxLength={NOTES_MAX}
            placeholder="Écris ce que tu veux : idées de cadeaux, tailles, rappels… Tape @ pour citer quelqu'un, # pour citer un souhait."
            spellCheck
            onChange={(e) => {
              onDraft(e.target.value);
              updateSuggest(e.target.value, e.target.selectionStart);
            }}
            onKeyDown={onKeyDown}
            onClick={(e) => updateSuggest(draft, e.currentTarget.selectionStart)}
            onBlur={() => setTimeout(() => setSuggest(null), 150)}
            aria-label="Mes notes"
          />
          {/* Clone caché qui sert à mesurer où se trouve le « @ » ou le « # ». */}
          <div ref={measureRef} className="notes-text notes-measure" aria-hidden="true" />

          {suggest && suggestPos && (
            <ul
              className={"mention-list" + (suggest.kind === "#" ? " mention-list-wide" : "")}
              role="listbox"
              style={{ top: suggestPos.top + 4, left: suggestPos.left }}
            >
              {suggest.items.map((item, i) => {
                const isWish = suggest.kind === "#";
                return (
                  <li key={isWish ? item.id : item}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === suggest.index}
                      className={"mention-option" + (i === suggest.index ? " is-on" : "")}
                      // mousedown : agit avant que le champ perde le focus
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pick(item);
                      }}
                    >
                      <Avatar name={isWish ? item.member : item} size="xs" />
                      {isWish ? (
                        <span className="mention-option-text">
                          <span className="mention-option-name">{item.name}</span>
                          <small>{item.member === me ? "Ma liste" : item.member}</small>
                        </span>
                      ) : (
                        <span>{item}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="notes-bar">
        <span className={"notes-status" + (dirty ? " is-dirty" : "")}>
          {status === "saving"
            ? "Enregistrement…"
            : status === "error"
            ? "Échec de l'enregistrement, réessaie."
            : dirty
            ? "Modifications non enregistrées"
            : status === "saved"
            ? "Enregistré ✓"
            : notes.at
            ? `Enregistré ${timeAgo(notes.at)}`
            : "Rien d'enregistré pour l'instant"}
          {near && ` · ${draft.length} / ${NOTES_MAX}`}
        </span>
        <button
          className="btn btn-primary"
          onClick={save}
          disabled={!dirty || !online || status === "saving"}
          title={online ? "Enregistrer (Ctrl+S)" : "Enregistrement possible seulement en ligne"}
        >
          <Icon name="check" size={17} strokeWidth={2.2} />
          Enregistrer
        </button>
      </div>
      {!online && <p className="hint">Hors ligne : tu pourras enregistrer au retour du réseau.</p>}
    </section>
  );
}

function NotesHead({ me }) {
  return (
    <header className="page-head">
      <span className="page-avatar notes-icon">
        <Icon name="note" size={24} />
      </span>
      <div className="page-titles">
        <h1 className="page-title">Mes notes</h1>
        <p className="page-sub">
          <Icon name="lock" size={13} className="inline-icon" /> Rien qu'à toi, {me} : personne
          d'autre ne les voit.
        </p>
      </div>
    </header>
  );
}
