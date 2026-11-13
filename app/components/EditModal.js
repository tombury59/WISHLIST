"use client";

import { useState } from "react";

// Popup de modification d'un souhait (nom + lien).
export default function EditModal({ wish, onCancel, onSave }) {
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
      <form className="sheet dialog" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3 className="dialog-title">Modifier le souhait</h3>
        <label className="add-field">
          <span className="label">Nom</span>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de l'objet"
            required
            autoFocus
          />
        </label>
        <label className="add-field">
          <span className="label">Lien (facultatif)</span>
          <input
            className="field"
            type="text"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://…"
          />
        </label>
        <div className="dialog-actions">
          <button type="button" className="btn btn-quiet" onClick={onCancel}>
            Annuler
          </button>
          <button className="btn btn-primary" disabled={!name.trim()}>
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
