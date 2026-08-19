"use client";

import { useEffect, useRef, useState } from "react";
import { MEMBERS, MEMBER_NAMES, MEMBER_COLORS } from "./lib/members";
import { REACTIONS } from "./lib/reactions";

// Déconnexion automatique après 15 min sans activité (coupe le
// rafraîchissement et revient à l'écran du code).
const INACTIVITY_MS = 15 * 60 * 1000;

export default function Home() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Qui suis-je ? (profil choisi, à la Netflix). Mémorisé dans le navigateur
  // pour ne pas avoir à le resélectionner à chaque fois.
  const [me, setMe] = useState(null);

  // Objets « mis en évidence » — purement LOCAL (par appareil), stocké dans le
  // navigateur. Ne change pas l'ordre, juste un léger surlignage perso.
  const [highlights, setHighlights] = useState([]);
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
    // Profil mémorisé (identité de cet appareil).
    const savedMe = localStorage.getItem("family-me");
    if (savedMe && MEMBER_NAMES.includes(savedMe)) {
      setMe(savedMe);
      setActive(savedMe);
    }
    try {
      const h = JSON.parse(localStorage.getItem("family-highlights") || "[]");
      if (Array.isArray(h)) setHighlights(h);
    } catch {
      /* ignore */
    }
    const saved = sessionStorage.getItem("family-pin");
    if (saved) {
      setPin(saved);
      tryLogin(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Choix du profil : on le retient dans le navigateur et on ouvre sa liste.
  function chooseMe(name) {
    setMe(name);
    setActive(name);
    localStorage.setItem("family-me", name);
  }

  // Bascule la mise en évidence locale d'un objet (mémorisée par appareil).
  function toggleHighlight(id) {
    setHighlights((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("family-highlights", JSON.stringify(next));
      return next;
    });
  }

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

  // Déconnexion (inactivité) : on revient à l'écran du code, ce qui stoppe
  // aussi le rafraîchissement auto.
  function logout() {
    sessionStorage.removeItem("family-pin");
    setAuthed(false);
    setPin("");
    setHistoryOpen(false);
    setConfirmData(null);
    setError("");
  }

  // Minuteur d'inactivité : chaque interaction le remet à zéro.
  useEffect(() => {
    if (!authed) return;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(logout, INACTIVITY_MS);
    };
    const events = ["mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
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

  // Modifie le nom / lien d'un souhait (mise à jour immédiate puis envoi).
  function editWish(member, wishId, name, link) {
    setWishes((prev) => ({
      ...prev,
      [member]: (prev[member] || []).map((w) =>
        w.id === wishId ? { ...w, name, link } : w
      ),
    }));
    fetch("/api/wishes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-family-pin": pin },
      body: JSON.stringify({ op: "edit", member, wishId, name, link }),
    }).catch(() => {});
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

  // Bascule une réaction du profil courant sur un souhait. Mise à jour
  // immédiate à l'écran (optimiste) puis envoi ; on ne relit rien, la synchro
  // périodique existante s'occupe de propager aux autres appareils.
  function toggleReaction(member, wishId, reaction) {
    setWishes((prev) => ({
      ...prev,
      [member]: (prev[member] || []).map((w) => {
        if (w.id !== wishId) return w;
        const reactions = { ...(w.reactions || {}) };
        const who = reactions[reaction] || [];
        const next = who.includes(me)
          ? who.filter((n) => n !== me)
          : [...who, me];
        if (next.length === 0) delete reactions[reaction];
        else reactions[reaction] = next;
        return { ...w, reactions };
      }),
    }));
    fetch("/api/wishes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-family-pin": pin },
      body: JSON.stringify({ member, wishId, reaction, author: me }),
    }).catch(() => {});
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

  // ---------- QUI SOMMES-NOUS ? (choix du profil) ----------
  if (!me) {
    return (
      <main className="gate">
        <div className="profiles">
          <h1 className="profiles-title">Qui es-tu ?</h1>
          <div className="profile-grid">
            {MEMBERS.map((m) => (
              <button
                key={m}
                type="button"
                className="profile-tile"
                onClick={() => chooseMe(m)}
              >
                <span className="profile-avatar" style={{ background: avatarColor(m) }}>
                  {m[0]}
                </span>
                <span className="profile-name">{m}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ---------- APPLI ----------
  const list = wishes[active] || [];
  const isMine = active === me;

  return (
    <main className="app">
      <header className="app-header">
        <button
          className="me-chip"
          onClick={() => setMe(null)}
          title="Changer de profil"
        >
          <span className="me-avatar" style={{ background: avatarColor(me) }}>
            {me[0]}
          </span>
          <span className="me-name">{me}</span>
        </button>
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
        {isMine ? (
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
        ) : (
          <p className="view-note">
            Tu regardes la liste de {active}. Tu ne peux ajouter que sur la tienne.
          </p>
        )}

        {list.length === 0 ? (
          <p className="empty">Aucun souhait pour l'instant.</p>
        ) : (
          <ul className="wish-list">
            {list.map((w) => (
              <WishItem
                key={w.id}
                wish={w}
                member={active}
                me={me}
                canEdit={isMine}
                highlighted={highlights.includes(w.id)}
                onDelete={requestDeleteWish}
                onEdit={editWish}
                onToggleHighlight={toggleHighlight}
                onAddComment={addComment}
                onDeleteComment={requestDeleteComment}
                onToggleReaction={toggleReaction}
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
function WishItem({
  wish,
  member,
  me,
  canEdit,
  highlighted,
  onDelete,
  onEdit,
  onToggleHighlight,
  onAddComment,
  onDeleteComment,
  onToggleReaction,
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // Édition en ligne du nom / lien.
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(wish.name);
  const [editLink, setEditLink] = useState(wish.link || "");

  // Menu contextuel : ouvert par clic droit (PC) ou par le bouton ☰ (mobile).
  // `menu` = position { x, y } où l'afficher, ou null si fermé.
  const [menu, setMenu] = useState(null);

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

  // Ouverture par le bouton ☰ : on place le menu juste sous le bouton, aligné
  // à droite. Remplace l'ancien appui long, capricieux sur mobile (surtout sur
  // les titres-liens où le geste natif du navigateur volait l'appui).
  function openMenuFromButton(e) {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    openAt(r.right - 224, r.bottom + 6);
  }

  function pick(reaction) {
    onToggleReaction(member, wish.id, reaction);
    setMenu(null);
  }

  function startEdit() {
    setEditName(wish.name);
    setEditLink(wish.link || "");
    setEditing(true);
    setMenu(null);
  }

  function saveEdit(e) {
    e.preventDefault();
    const name = editName.trim();
    if (!name) return;
    onEdit(member, wish.id, name, editLink.trim());
    setEditing(false);
  }

  function copyText(text) {
    // Repli pour les navigateurs sans l'API presse-papier, ou si elle échoue
    // (contexte non sécurisé, refus, etc.).
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    };
    try {
      if (navigator.clipboard?.writeText) {
        // .catch gère le rejet ASYNCHRONE (sinon repli jamais appelé).
        navigator.clipboard.writeText(text).catch(fallback);
      } else {
        fallback();
      }
    } catch {
      fallback();
    }
    setMenu(null);
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
    <li className={"wish" + (highlighted ? " wish-highlight" : "")}>
      {editing ? (
        <form className="wish-edit" onSubmit={saveEdit}>
          <input
            className="field"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Nom de l'objet"
            required
            autoFocus
          />
          <input
            className="field"
            type="url"
            value={editLink}
            onChange={(e) => setEditLink(e.target.value)}
            placeholder="Lien (facultatif)"
          />
          <div className="wish-edit-actions">
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => setEditing(false)}
            >
              Annuler
            </button>
            <button className="btn-primary btn-sm" disabled={!editName.trim()}>
              Enregistrer
            </button>
          </div>
        </form>
      ) : (
        <div className="wish-row" onContextMenu={openMenu}>
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
          type="button"
          className={"wish-comment-btn" + (open ? " is-open" : "")}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Cacher les commentaires" : "Afficher les commentaires"}
          title="Commentaires"
        >
          💬
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
        {canEdit && (
          <button
            className="wish-del"
            onClick={() => onDelete(member, wish)}
            aria-label="Supprimer"
            title="Supprimer"
          >
            ×
          </button>
        )}

        {menu && (
          <>
            <div
              className="reaction-backdrop"
              onClick={(e) => {
                e.stopPropagation();
                setMenu(null);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenu(null);
              }}
            />
            <div
              className="ctx-menu"
              style={{ left: menu.x, top: menu.y }}
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
                  onClick={() => {
                    window.open(normalizeUrl(wish.link), "_blank", "noopener");
                    setMenu(null);
                  }}
                >
                  Ouvrir le lien
                </button>
              )}
              <button
                type="button"
                className="ctx-item"
                onClick={() => copyText(wish.name)}
              >
                Copier le nom de l'objet
              </button>
              {wish.link && (
                <button
                  type="button"
                  className="ctx-item"
                  onClick={() => copyText(normalizeUrl(wish.link))}
                >
                  Copier le lien de l'objet
                </button>
              )}

              <div className="ctx-sep" />

              {/* Catégorie : actions */}
              <button
                type="button"
                className="ctx-item"
                onClick={() => {
                  setOpen(true);
                  setMenu(null);
                }}
              >
                Ajouter un commentaire
              </button>
              <button
                type="button"
                className="ctx-item"
                onClick={() => {
                  onToggleHighlight(wish.id);
                  setMenu(null);
                }}
              >
                {highlighted ? "Retirer la mise en évidence" : "Mettre en évidence"}
              </button>

              {/* Catégorie : modifier / supprimer (sa propre liste) */}
              {canEdit && (
                <>
                  <div className="ctx-sep" />
                  <button
                    type="button"
                    className="ctx-item ctx-item-edit"
                    onClick={startEdit}
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="ctx-item ctx-item-danger"
                    onClick={() => {
                      onDelete(member, wish);
                      setMenu(null);
                    }}
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
                      onClick={() => pick(r)}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
        </div>
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
          )}

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
              {/* Affichage limité aux 50 dernières (la base en garde plus). */}
              {items.slice(0, 50).map((h) => {
                const who = h.type === "comment" ? h.author || "Quelqu'un" : h.member;
                const action =
                  h.type === "add"
                    ? "a ajouté"
                    : h.type === "remove"
                    ? "a retiré"
                    : "a commenté";
                return (
                  <li key={h.id} className="history-item">
                    <span className="history-main">
                      <span
                        className="history-who"
                        style={{ background: avatarColor(who) }}
                      >
                        {who}
                      </span>
                      <span className="history-action">{action}</span>
                      {h.name && <span className="history-el">{h.name}</span>}
                    </span>
                    <span className="history-time">{timeAgo(h.at)}</span>
                  </li>
                );
              })}
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

// Couleur d'avatar attribuée à chaque membre (repli gris si inconnu).
function avatarColor(name) {
  return MEMBER_COLORS[name] || "#3f3f46";
}
