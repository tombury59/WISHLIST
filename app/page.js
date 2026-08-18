"use client";

import { useEffect, useRef, useState } from "react";
import { MEMBERS, MEMBER_NAMES } from "./lib/members";

export default function Home() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [active, setActive] = useState(MEMBER_NAMES[0]);
  const [wishes, setWishes] = useState({});
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [adding, setAdding] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [confirmData, setConfirmData] = useState(null); // { message, action }

  const pinRef = useRef("");
  useEffect(() => {
    pinRef.current = pin;
  }, [pin]);

  useEffect(() => {
    const saved = sessionStorage.getItem("family-pin");
    if (saved) {
      setPin(saved);
      tryLogin(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Support du clavier physique sur l'écran du code.
  useEffect(() => {
    if (authed) return;
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) pushDigit(e.key);
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
      else if (e.key === "Enter") tryLogin(pinRef.current);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  // Synchronisation auto : on recharge régulièrement pour voir les ajouts
  // des autres, sans avoir à rafraîchir la page à la main.
  useEffect(() => {
    if (!authed) return;
    const refresh = () => {
      if (document.visibilityState === "visible") {
        fetchWishes(pinRef.current).catch(() => {});
      }
    };
    const timer = setInterval(refresh, 7000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  function pushDigit(d) {
    setError("");
    setPin((p) => (p.length < 12 ? p + d : p));
  }

  function askConfirm(message, action) {
    setConfirmData({ message, action });
  }

  async function fetchWishes(code) {
    const res = await fetch("/api/wishes", {
      headers: { "x-family-pin": code },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("unauthorized");
    const data = await res.json();
    setWishes(data.wishes || {});
  }

  async function tryLogin(code) {
    if (!code || loading) return;
    setLoading(true);
    setError("");
    try {
      await fetchWishes(code);
      sessionStorage.setItem("family-pin", code);
      setAuthed(true);
    } catch {
      sessionStorage.removeItem("family-pin");
      setAuthed(false);
      setError("Code incorrect");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  async function openHistory() {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/history", {
        headers: { "x-family-pin": pin },
        cache: "no-store",
      });
      const data = await res.json();
      setHistory(data.history || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const res = await fetch("/api/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-family-pin": pin },
        body: JSON.stringify({ member: active, name: trimmed, link: link.trim() }),
      });
      if (!res.ok) throw new Error();
      const { wish } = await res.json();
      setWishes((prev) => ({
        ...prev,
        [active]: [...(prev[active] || []), wish],
      }));
      setName("");
      setLink("");
    } catch {
      setError("Impossible d'ajouter. Réessaie.");
    } finally {
      setAdding(false);
    }
  }

  async function deleteWish(member, id) {
    setWishes((prev) => ({
      ...prev,
      [member]: (prev[member] || []).filter((w) => w.id !== id),
    }));
    await fetch("/api/wishes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-family-pin": pin },
      body: JSON.stringify({ member, id }),
    }).catch(() => {});
  }

  async function addComment(member, wishId, text, author) {
    const res = await fetch("/api/wishes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-family-pin": pin },
      body: JSON.stringify({ member, wishId, text, author }),
    });
    if (!res.ok) throw new Error();
    const { comment } = await res.json();
    setWishes((prev) => ({
      ...prev,
      [member]: (prev[member] || []).map((w) =>
        w.id === wishId ? { ...w, comments: [...(w.comments || []), comment] } : w
      ),
    }));
  }

  async function deleteComment(member, wishId, commentId) {
    setWishes((prev) => ({
      ...prev,
      [member]: (prev[member] || []).map((w) =>
        w.id === wishId
          ? { ...w, comments: (w.comments || []).filter((c) => c.id !== commentId) }
          : w
      ),
    }));
    await fetch("/api/wishes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-family-pin": pin },
      body: JSON.stringify({ member, wishId, commentId }),
    }).catch(() => {});
  }

  // Demandes de suppression -> passent par la popup de confirmation.
  function requestDeleteWish(member, wish) {
    askConfirm(`Supprimer « ${wish.name} » ?`, () => deleteWish(member, wish.id));
  }

  function requestDeleteComment(member, wishId, comment) {
    askConfirm("Supprimer ce commentaire ?", () =>
      deleteComment(member, wishId, comment.id)
    );
  }

  // ---------- ÉCRAN DU CODE ----------
  if (!authed) {
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    return (
      <main className="gate">
        <div className="gate-card">
          <h1 className="gate-title">Liste de souhaits</h1>
          <p className="gate-sub">Entre le code de la famille</p>

          <div className={"pin-dots" + (error ? " pin-dots-error" : "")}>
            {pin.length === 0 ? (
              <span className="pin-hint">- - - -</span>
            ) : (
              Array.from(pin).map((_, i) => <span key={i} className="pin-dot" />)
            )}
          </div>

          <div className="error-slot">
            {error && <span className="error">{error}</span>}
          </div>

          <div className="keypad">
            {keys.map((k) => (
              <button key={k} type="button" className="key" onClick={() => pushDigit(k)}>
                {k}
              </button>
            ))}
            <button
              type="button"
              className="key key-ghost"
              onClick={() => setPin((p) => p.slice(0, -1))}
              aria-label="Effacer"
            >
              ⌫
            </button>
            <button type="button" className="key" onClick={() => pushDigit("0")}>
              0
            </button>
            <button
              type="button"
              className="key key-enter"
              onClick={() => tryLogin(pin)}
              disabled={loading || !pin}
              aria-label="Valider"
            >
              {loading ? "…" : "→"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ---------- APPLI ----------
  const list = wishes[active] || [];

  return (
    <main className="app">
      <header className="app-header">
        <span className="app-brand">Liste de souhaits</span>
        <button className="history-btn" onClick={openHistory}>
          Historique
        </button>
      </header>

      <nav className="tabs">
        {MEMBERS.map((m) => {
          const count = (wishes[m] || []).length;
          return (
            <button
              key={m}
              className={"tab" + (m === active ? " tab-active" : "")}
              onClick={() => setActive(m)}
            >
              {m}
              {count > 0 && <span className="tab-count">{count}</span>}
            </button>
          );
        })}
      </nav>

      <section className="panel">
        <form className="add-form" onSubmit={handleAdd}>
          <input
            className="field"
            placeholder="Un objet à ajouter…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="field"
            type="url"
            placeholder="Lien (facultatif)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <button className="btn-primary" disabled={adding || !name.trim()}>
            {adding ? "…" : "Ajouter"}
          </button>
        </form>

        {list.length === 0 ? (
          <p className="empty">Aucun souhait pour l'instant.</p>
        ) : (
          <ul className="wish-list">
            {list.map((w) => (
              <WishItem
                key={w.id}
                wish={w}
                member={active}
                onDelete={requestDeleteWish}
                onAddComment={addComment}
                onDeleteComment={requestDeleteComment}
              />
            ))}
          </ul>
        )}
      </section>

      {historyOpen && (
        <HistoryModal
          items={history}
          loading={historyLoading}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {confirmData && (
        <ConfirmModal
          message={confirmData.message}
          onCancel={() => setConfirmData(null)}
          onConfirm={() => {
            confirmData.action();
            setConfirmData(null);
          }}
        />
      )}
    </main>
  );
}

// ---------- UN SOUHAIT (avec commentaires) ----------
function WishItem({ wish, member, onDelete, onAddComment, onDeleteComment }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState(MEMBERS[0]);
  const [sending, setSending] = useState(false);

  const comments = wish.comments || [];

  async function submit(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      await onAddComment(member, wish.id, t, author);
      setText("");
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  }

  return (
    <li className="wish">
      <div className="wish-row">
        {wish.link && <LinkThumb link={wish.link} />}
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
        <button
          className={"comment-toggle" + (comments.length ? " has-comments" : "")}
          onClick={() => setOpen((o) => !o)}
        >
          {comments.length > 0 ? `Commentaires · ${comments.length}` : "Commenter"}
        </button>
        <button
          className="wish-del"
          onClick={() => onDelete(member, wish)}
          aria-label="Supprimer"
          title="Supprimer"
        >
          ×
        </button>
      </div>

      {open && (
        <div className="comments">
          {comments.length > 0 && (
            <ul className="comment-list">
              {comments.map((c) => (
                <li key={c.id} className="comment">
                  <div className="comment-body">
                    {c.author && <span className="comment-author">{c.author}</span>}
                    <span className="comment-text">{c.text}</span>
                  </div>
                  <button
                    className="comment-del"
                    onClick={() => onDeleteComment(member, wish.id, c)}
                    aria-label="Supprimer le commentaire"
                    title="Supprimer"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form className="comment-form" onSubmit={submit}>
            <select
              className="comment-author-select"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            >
              {MEMBERS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
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
      )}
    </li>
  );
}

// ---------- HISTORIQUE ----------
function HistoryModal({ items, loading, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="history-card" onClick={(e) => e.stopPropagation()}>
        <div className="history-head">
          <span className="history-title">Historique</span>
          <button className="history-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <div className="history-body">
          {loading ? (
            <p className="empty">Chargement…</p>
          ) : items.length === 0 ? (
            <p className="empty">Rien pour l'instant.</p>
          ) : (
            <ul className="history-list">
              {items.map((h) => (
                <li key={h.id} className="history-item">
                  <span className="history-text">{describe(h)}</span>
                  <span className="history-time">{timeAgo(h.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- CONFIRMATION ----------
function ConfirmModal({ message, onCancel, onConfirm }) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="btn-ghost" onClick={onCancel}>
            Annuler
          </button>
          <button className="btn-danger" onClick={onConfirm}>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

function describe(h) {
  if (h.type === "add") return `${h.member} a ajouté « ${h.name} »`;
  if (h.type === "remove") return `${h.member} : « ${h.name} » retiré`;
  if (h.type === "comment") {
    const who = h.author ? h.author : "Quelqu'un";
    return `${who} a commenté « ${h.name} »`;
  }
  return "Action";
}

function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d} j`;
  return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// Miniature d'aperçu d'un lien : l'image si le lien pointe vers une image,
// sinon l'icône (favicon) du site. Repli discret si rien ne charge.
function LinkThumb({ link }) {
  const [failed, setFailed] = useState(false);
  const url = normalizeUrl(link);
  const isImage = /\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?.*)?$/i.test(url);

  let src = null;
  if (isImage) {
    src = url;
  } else {
    try {
      src = `https://icons.duckduckgo.com/ip3/${new URL(url).hostname}.ico`;
    } catch {
      src = null;
    }
  }

  if (!src || failed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="thumb thumb-fallback"
        aria-label="Ouvrir le lien"
      >
        ↗
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={"thumb " + (isImage ? "thumb-image" : "thumb-favicon")}
      aria-label="Ouvrir le lien"
    >
      <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
    </a>
  );
}

function normalizeUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return "https://" + url;
}
