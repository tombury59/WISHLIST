"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useEmblaCarousel from "embla-carousel-react";
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

  // Mode d'affichage : "list" (liste) ou "carousel" (carrousel). LOCAL, retenu
  // dans le navigateur.
  const [view, setView] = useState("list");

  // Quel souhait a ses commentaires ouverts (un seul à la fois). Sur desktop
  // ils s'affichent dans le panneau latéral, sur mobile en dessous (ou en
  // modale en vue liste, voir plus bas).
  const [openComments, setOpenComments] = useState(null);

  // Petit écran ? (aligné sur le breakpoint CSS 820px).
  const [isMobile, setIsMobile] = useState(false);
  const [active, setActive] = useState(MEMBER_NAMES[0]);
  const [wishes, setWishes] = useState({});
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [adding, setAdding] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [confirmData, setConfirmData] = useState(null); // { message, action }
  const [editData, setEditData] = useState(null); // { member, wish }

  const pinRef = useRef("");
  useEffect(() => {
    pinRef.current = pin;
  }, [pin]);

  // Suivi de la taille d'écran pour choisir où afficher les commentaires.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 819px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

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
    const savedView = localStorage.getItem("family-view");
    if (savedView === "carousel" || savedView === "list") setView(savedView);
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

  // Change le mode d'affichage et le retient dans le navigateur.
  function changeView(v) {
    setView(v);
    localStorage.setItem("family-view", v);
  }

  const toggleComments = (id) =>
    setOpenComments((cur) => (cur === id ? null : id));
  const openCommentsFor = (id) => setOpenComments(id);
  const closeComments = () => setOpenComments(null);

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
    const timer = setInterval(refresh, 15000);
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

  // Ouvre la popup de modification.
  function requestEditWish(member, wish) {
    setEditData({ member, wish });
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
              <button
                key={k}
                type="button"
                className="key"
                onPointerDown={(e) => {
                  e.preventDefault();
                  pushDigit(k);
                }}
              >
                {k}
              </button>
            ))}
            <button
              type="button"
              className="key key-ghost"
              onPointerDown={(e) => {
                e.preventDefault();
                setPin((p) => p.slice(0, -1));
              }}
              aria-label="Effacer"
            >
              ⌫
            </button>
            <button
              type="button"
              className="key"
              onPointerDown={(e) => {
                e.preventDefault();
                pushDigit("0");
              }}
            >
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

  // Props communes à chaque souhait (liste ou carrousel).
  const itemProps = {
    member: active,
    me,
    canEdit: isMine,
    onDelete: requestDeleteWish,
    onRequestEdit: requestEditWish,
    onToggleHighlight: toggleHighlight,
    onAddComment: addComment,
    onDeleteComment: requestDeleteComment,
    onToggleReaction: toggleReaction,
    openCommentsId: openComments,
    onToggleComments: toggleComments,
    onOpenComments: openCommentsFor,
  };

  // Le souhait dont les commentaires sont ouverts (pour le panneau latéral).
  const commentWish = list.find((w) => w.id === openComments) || null;

  // Sur petit écran EN VUE LISTE, les commentaires s'ouvrent dans une modale
  // (plutôt qu'en bas de la liste, où ils passaient inaperçus s'il y a beaucoup
  // d'objets). En carrousel et sur desktop : comportement inchangé.
  const commentsInModal = isMobile && view === "list";

  return (
    <main className="app">
      <div
        className={
          "app-main" + (commentWish && !commentsInModal ? " has-comments" : "")
        }
      >
        <div className="app-col">
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
              onClick={() => {
                setActive(m);
                setOpenComments(null);
              }}
            >
              {m}
              {count > 0 && <span className="tab-count">{count}</span>}
            </button>
          );
        })}
      </nav>

        <div className="panel-row">
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
          <>
            <ViewSwitch view={view} onChange={changeView} />
            {view === "carousel" ? (
              <WishCarousel list={list} highlights={highlights} itemProps={itemProps} />
            ) : (
              <ul className="wish-list">
                {list.map((w) => (
                  <WishItem
                    key={w.id}
                    wish={w}
                    variant="list"
                    highlighted={highlights.includes(w.id)}
                    {...itemProps}
                  />
                ))}
              </ul>
            )}
          </>
        )}
        </section>

        {/* Toujours présent (vide quand fermé) pour que l'ouverture s'anime.
            Vide aussi quand les commentaires passent en modale. */}
        <aside className="comment-side">
          {commentWish && !commentsInModal && (
            <CommentsPanel
              key={commentWish.id}
              wish={commentWish}
              member={active}
              me={me}
              variant="side"
              onAddComment={addComment}
              onDeleteComment={requestDeleteComment}
              onClose={closeComments}
            />
          )}
        </aside>
        </div>
        </div>
      </div>

      {/* Petit écran + vue liste : commentaires dans une modale. */}
      {commentWish && commentsInModal && (
        <div className="overlay" onClick={closeComments}>
          <div
            className="comment-modal-wrap"
            onClick={(e) => e.stopPropagation()}
          >
            <CommentsPanel
              key={commentWish.id}
              wish={commentWish}
              member={active}
              me={me}
              variant="modal"
              onAddComment={addComment}
              onDeleteComment={requestDeleteComment}
              onClose={closeComments}
            />
          </div>
        </div>
      )}

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

      {editData && (
        <EditModal
          wish={editData.wish}
          onCancel={() => setEditData(null)}
          onSave={(name, link) => {
            editWish(editData.member, editData.wish.id, name, link);
            setEditData(null);
          }}
        />
      )}
    </main>
  );
}

// ---------- SÉLECTEUR DE VUE (liste / carrousel) ----------
function ViewSwitch({ view, onChange }) {
  return (
    <div className="view-switch" role="group" aria-label="Mode d'affichage">
      <button
        type="button"
        className={"view-opt" + (view === "carousel" ? " is-active" : "")}
        onClick={() => onChange("carousel")}
        aria-label="Vue carrousel"
        title="Carrousel"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="5" width="14" height="14" rx="2.5" />
        </svg>
      </button>
      <button
        type="button"
        className={"view-opt" + (view === "list" ? " is-active" : "")}
        onClick={() => onChange("list")}
        aria-label="Vue liste"
        title="Liste"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
        </svg>
      </button>
    </div>
  );
}

// ---------- CARROUSEL (librairie Embla) ----------
function WishCarousel({ list, highlights, itemProps }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    loop: false,
    containScroll: false, // la 1re et la dernière peuvent se centrer aussi
    dragFree: false, // un glissement = on se cale sur l'item le plus proche
  });

  // Quand la carte centrée change ET que les commentaires sont ouverts, on met
  // à jour le panneau avec ceux de la carte affichée. On lit l'état via une ref
  // pour garder le handler Embla (abonné une seule fois) toujours à jour.
  const syncRef = useRef({});
  syncRef.current = {
    openCommentsId: itemProps.openCommentsId,
    onOpenComments: itemProps.onOpenComments,
    list,
  };
  useEffect(() => {
    if (!emblaApi) return;
    if (typeof window !== "undefined") window.__embla = emblaApi; // DEBUG
    const onSelect = () => {
      const { openCommentsId, onOpenComments, list } = syncRef.current;
      if (!openCommentsId) return; // commentaires fermés -> on ne touche à rien
      const wish = list[emblaApi.selectedScrollSnap()];
      if (wish && wish.id !== openCommentsId) onOpenComments(wish.id);
    };
    emblaApi.on("select", onSelect);
    return () => emblaApi.off("select", onSelect);
  }, [emblaApi]);

  // Effet « une carte devant, les voisines en arrière » : on réduit et estompe
  // les cartes selon leur distance au centre, mis à jour à chaque frame.
  useEffect(() => {
    if (!emblaApi) return;
    const nodes = emblaApi.slideNodes();
    const run = () => {
      const progress = emblaApi.scrollProgress();
      const snaps = emblaApi.scrollSnapList();
      const span = Math.max(1, snaps.length - 1);
      snaps.forEach((snap, i) => {
        const d = Math.abs((snap - progress) * span); // 0 = au centre
        const scale = Math.max(0.8, 1 - d * 0.16);
        const opacity = Math.max(0.35, 1 - d * 0.5);
        const node = nodes[i];
        if (node) {
          node.style.transform = `scale(${scale})`;
          node.style.opacity = String(opacity);
        }
      });
    };
    run();
    emblaApi.on("scroll", run);
    emblaApi.on("reInit", run);
    return () => {
      emblaApi.off("scroll", run);
      emblaApi.off("reInit", run);
    };
  }, [emblaApi]);

  return (
    <div className="carousel">
      <button
        type="button"
        className="carousel-arrow carousel-prev"
        onClick={() => emblaApi && emblaApi.scrollPrev()}
        aria-label="Précédent"
      >
        ‹
      </button>
      <div className="embla" ref={emblaRef}>
        <div className="embla__container">
          {list.map((w) => (
            <div className="embla__slide" key={w.id}>
              <WishItem
                wish={w}
                variant="card"
                highlighted={highlights.includes(w.id)}
                {...itemProps}
              />
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="carousel-arrow carousel-next"
        onClick={() => emblaApi && emblaApi.scrollNext()}
        aria-label="Suivant"
      >
        ›
      </button>
    </div>
  );
}

// ---------- UN SOUHAIT (avec commentaires) ----------
function WishItem({
  wish,
  member,
  me,
  canEdit,
  highlighted,
  variant = "list",
  onDelete,
  onRequestEdit,
  onToggleHighlight,
  onAddComment,
  onDeleteComment,
  onToggleReaction,
  openCommentsId,
  onToggleComments,
  onOpenComments,
}) {
  // Les commentaires ouverts sont pilotés par le parent (un seul à la fois).
  const open = openCommentsId === wish.id;

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

  // Les boutons 💬 (commentaires), ☰ (menu) et × (supprimer) — partagés.
  const controls = (
    <>
      <button
        type="button"
        className={"wish-comment-btn" + (open ? " is-open" : "")}
        onClick={() => onToggleComments(wish.id)}
        aria-label={open ? "Cacher les commentaires" : "Afficher les commentaires"}
        title="Commentaires"
      >
        <svg
          className="wish-comment-icon"
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

  // Le menu contextuel (identique quel que soit l'affichage). Rendu via un
  // portail vers <body> : sinon, dans le carrousel, le `transform` des diapos
  // casse le `position: fixed` et le `overflow: hidden` le rognerait.
  const menuOverlay =
    menu &&
    createPortal(
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
            onOpenComments(wish.id);
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
              onClick={() => {
                onRequestEdit(member, wish);
                setMenu(null);
              }}
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
      </>,
      document.body
    );

  return (
    <li
      className={
        "wish" +
        (highlighted ? " wish-highlight" : "") +
        (variant === "card" ? " wish-cardli" : "")
      }
    >
      {variant === "card" ? (
        <div className="wish-card" onContextMenu={openMenu}>
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
          {wish.link && <LinkThumb link={wish.link} />}
          {nameEl}
          {controls}
        </div>
      )}

      {menuOverlay}

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

// ---------- PANNEAU DES COMMENTAIRES (en ligne mobile / latéral desktop) ----------
function CommentsPanel({
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

// ---------- MODIFICATION (popup) ----------
function EditModal({ wish, onCancel, onSave }) {
  const [name, setName] = useState(wish.name);
  const [link, setLink] = useState(wish.link || "");

  function submit(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    onSave(n, link.trim());
  }

  return (
    <div className="overlay" onClick={onCancel}>
      <div className="edit-card" onClick={(e) => e.stopPropagation()}>
        <form className="edit-form" onSubmit={submit}>
          <h3 className="edit-title">Modifier</h3>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de l'objet"
            required
            autoFocus
          />
          <input
            className="field"
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Lien (facultatif)"
          />
          <div className="confirm-actions">
            <button type="button" className="btn-ghost" onClick={onCancel}>
              Annuler
            </button>
            <button className="btn-primary" disabled={!name.trim()}>
              Enregistrer
            </button>
          </div>
        </form>
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
function LinkThumb({ link, big }) {
  const [failed, setFailed] = useState(false);
  const url = normalizeUrl(link);
  const isImage = /\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?.*)?$/i.test(url);
  const bigCls = big ? " thumb-big" : "";

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
        className={"thumb thumb-fallback" + bigCls}
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
      className={"thumb " + (isImage ? "thumb-image" : "thumb-favicon") + bigCls}
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
