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
