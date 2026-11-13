"use client";

import { useState } from "react";
import Icon from "./Icon";

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
    <form className="card add-form" onSubmit={handleSubmit}>
      <input
        className="field add-name"
        placeholder="Ajouter une envie…"
        aria-label="Nom du souhait"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <div className="add-row">
        {/* type="text" : un lien sans « https:// » est accepté (il est complété
            à l'affichage). */}
        <input
          className="field"
          type="text"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="Lien (facultatif)"
          aria-label="Lien (facultatif)"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <button className="btn btn-primary" disabled={adding || !name.trim()}>
          <Icon name="plus" size={18} strokeWidth={2.2} />
          {adding ? "Ajout…" : "Ajouter"}
        </button>
      </div>
    </form>
  );
}
