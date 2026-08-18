"use client";

import { useEffect, useState } from "react";
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

  // Au chargement : si un code est déjà mémorisé, on se reconnecte.
  useEffect(() => {
    const saved = sessionStorage.getItem("family-pin");
    if (saved) {
      setPin(saved);
      tryLogin(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    } finally {
      setLoading(false);
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
        headers: {
          "Content-Type": "application/json",
          "x-family-pin": pin,
        },
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

  async function handleDelete(member, id) {
    // Optimiste : on retire tout de suite de l'écran.
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

  // ---------- ÉCRAN DU CODE ----------
  if (!authed) {
    return (
      <main className="gate">
        <div className="gate-card">
          <h1 className="gate-title">Liste de souhaits</h1>
          <p className="gate-sub">Entre le code de la famille</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              tryLogin(pin);
            }}
          >
            <input
              className="pin-input"
              type="password"
              inputMode="numeric"
              autoFocus
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            {error && <div className="error">{error}</div>}
            <button className="btn-primary" disabled={loading || !pin}>
              {loading ? "…" : "Entrer"}
            </button>
          </form>
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
              <li key={w.id} className="wish">
                <span className="wish-name">{w.name}</span>
                <div className="wish-actions">
                  {w.link && (
                    <a
                      className="wish-link"
                      href={normalizeUrl(w.link)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Voir le lien
                    </a>
                  )}
                  <button
                    className="wish-del"
                    onClick={() => handleDelete(active, w.id)}
                    aria-label="Supprimer"
                    title="Supprimer"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function normalizeUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return "https://" + url;
}
