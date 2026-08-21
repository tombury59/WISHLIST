"use client";

import { useState } from "react";

// Formulaire d'ajout d'un souhait (sur sa propre liste). L'état du champ est
// local ; `onAdd(name, link)` déclenche l'ajout côté parent.
export default function AddForm({ onAdd }) {
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await onAdd(trimmed, link.trim());
      setName("");
      setLink("");
    } catch {
      /* ignore : l'ajout sera retenté au besoin par l'utilisateur */
    } finally {
      setAdding(false);
    }
  }

  return (
    <form className="add-form" onSubmit={handleSubmit}>
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
  );
}
