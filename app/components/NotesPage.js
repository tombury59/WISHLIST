"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MEMBERS } from "../lib/members";
import { avatarColor, timeAgo } from "../lib/format";
import Avatar from "./Avatar";
import Icon from "./Icon";
import ClovisArt from "./ClovisArt";

// Notes perso : une grande page que seul son auteur voit dans l'appli.
//
// Éditeur : un <textarea> au texte transparent posé sur un « miroir » qui
// affiche le même texte, avec les @prénoms colorés (couleur de la personne).
// Les deux ont exactement la même mise en forme, donc le curseur tombe pile.
// Les @prénoms du miroir sont cliquables (ouvrent la liste de la personne).
//
// Pas d'enregistrement automatique : bouton « Enregistrer » (ou Ctrl/Cmd+S).

export const NOTES_MAX = 10000;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// @Prénom complet, pas suivi d'une autre lettre (« @Tomate » n'est pas Tom).
const MENTION_RE = new RegExp(
  `@(${MEMBERS.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`,
  "gu"
);
const MENTION_AT_END = new RegExp(`@(${MEMBERS.map(escapeRe).join("|")})$`, "u");

// Comparaison sans accents ni majuscules (« @be » propose Béné et Betty).
const norm = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Texte -> morceaux (texte brut / mention), pour le miroir.
function splitMentions(text) {
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(MENTION_RE)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ name: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// « @pré » en cours de frappe juste avant le curseur ?
function mentionQuery(text, caret) {
  const m = text.slice(0, caret).match(/(^|\s)@([\p{L}]{0,12})$/u);
  if (!m) return null;
  return { start: caret - m[2].length - 1, query: m[2] };
}

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
}) {
  const areaRef = useRef(null);
  const measureRef = useRef(null);
  const caretRef = useRef(null); // position du curseur à remettre après un changement
  const [suggest, setSuggest] = useState(null); // { start, query, items, index, top, left }
  const [status, setStatus] = useState(""); // "", "saving", "saved", "error"

  const dirty = notes !== null && draft !== notes.text;

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
    const q = mentionQuery(text, caret);
    if (!q) return setSuggest(null);
    const items = MEMBERS.filter((n) => norm(n).startsWith(norm(q.query)));
    if (!items.length) return setSuggest(null);
    setSuggest((cur) => ({
      ...q,
      items,
      index: cur && cur.start === q.start ? Math.min(cur.index, items.length - 1) : 0,
    }));
  }

  // La position de la liste se calcule une fois le texte affiché.
  const [suggestPos, setSuggestPos] = useState(null);
  useLayoutEffect(() => {
    setSuggestPos(suggest ? coordsAt(suggest.start) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggest?.start, draft]);

  function pick(name) {
    if (!suggest) return;
    const area = areaRef.current;
    const caret = area ? area.selectionStart : suggest.start + suggest.query.length + 1;
    const insert = `@${name} `;
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
    // Une mention s'efface d'un coup.
    if (e.key === "Backspace") {
      const area = e.currentTarget;
      const { selectionStart: s, selectionEnd: end } = area;
      if (s !== end) return;
      const m = draft.slice(0, s).match(MENTION_AT_END);
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

  const parts = splitMentions(draft);
  const near = draft.length > NOTES_MAX * 0.9;

  return (
    <section className="page notes-page">
      <NotesHead me={me} />

      <div className="card notes-card">
        <div className="notes-editor">
          {/* Le miroir : même texte, @prénoms colorés et cliquables. */}
          <div className="notes-text notes-mirror" aria-hidden="true">
            {parts.map((p, i) =>
              typeof p === "string" ? (
                p
              ) : (
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
              )
            )}
            {"​"}
          </div>
          <textarea
            ref={areaRef}
            className="notes-text notes-area"
            value={draft}
            maxLength={NOTES_MAX}
            placeholder="Écris ce que tu veux : idées de cadeaux, tailles, rappels… Tape @ pour citer quelqu'un."
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
          {/* Clone caché qui sert à mesurer où se trouve le « @ ». */}
          <div ref={measureRef} className="notes-text notes-measure" aria-hidden="true" />

          {suggest && suggestPos && (
            <ul
              className="mention-list"
              role="listbox"
              style={{ top: suggestPos.top + 4, left: suggestPos.left }}
            >
              {suggest.items.map((name, i) => (
                <li key={name}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === suggest.index}
                    className={"mention-option" + (i === suggest.index ? " is-on" : "")}
                    // mousedown : agit avant que le champ perde le focus
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(name);
                    }}
                  >
                    <Avatar name={name} size="xs" />
                    <span>{name}</span>
                  </button>
                </li>
              ))}
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
