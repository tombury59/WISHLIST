"use client";

import { useState } from "react";
import { avatarColor, COLOR_PALETTE } from "../lib/format";
import Avatar from "./Avatar";
import Icon from "./Icon";

const MIN_LEN = 4;

// Rubrique « Mon compte » : couleur, code, biométrie, données hors ligne,
// changement de profil et déconnexion.
export default function AccountPage({
  me,
  online = true,
  wishCount = 0,
  giftCount = 0,
  biometricAvailable,
  biometricEnrolled,
  onPickColor,
  onChangePin,
  onEnrollBiometric,
  onClearCache,
  onChangeProfile,
  onLogout,
}) {
  // Couleur
  const [color, setColor] = useState(avatarColor(me));
  const [colorBusy, setColorBusy] = useState(false);

  // Changement de code
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinMsg, setPinMsg] = useState("");

  // Biométrie
  const [bioBusy, setBioBusy] = useState(false);
  const [bioMsg, setBioMsg] = useState("");

  // Cache local
  const [cacheConfirm, setCacheConfirm] = useState(false);
  const [cacheBusy, setCacheBusy] = useState(false);
  const [cacheMsg, setCacheMsg] = useState("");

  async function pickColor(c) {
    setColor(c);
    setColorBusy(true);
    try {
      await onPickColor(c);
    } catch {
      /* ignore : on garde l'affichage optimiste */
    } finally {
      setColorBusy(false);
    }
  }

  async function savePin(e) {
    e.preventDefault();
    setPinMsg("");
    if (!/^\d{4,12}$/.test(newPin)) {
      setPinMsg("Le code doit faire 4 à 12 chiffres.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinMsg("Les deux codes ne correspondent pas.");
      return;
    }
    setPinBusy(true);
    try {
      await onChangePin(newPin);
      setNewPin("");
      setConfirmPin("");
      setPinMsg("Code mis à jour ✓");
    } catch {
      setPinMsg("Échec. Réessaie.");
    } finally {
      setPinBusy(false);
    }
  }

  async function clearCache() {
    if (!cacheConfirm) {
      setCacheConfirm(true);
      return;
    }
    setCacheBusy(true);
    setCacheMsg("");
    try {
      await onClearCache();
      setCacheMsg("Cache vidé ✓");
    } catch {
      setCacheMsg("Échec.");
    } finally {
      setCacheBusy(false);
      setCacheConfirm(false);
    }
  }

  async function toggleBio() {
    setBioMsg("");
    setBioBusy(true);
    try {
      await onEnrollBiometric();
      setBioMsg(biometricEnrolled ? "Biométrie actualisée ✓" : "Biométrie activée ✓");
    } catch (e) {
      setBioMsg(e?.name === "NotAllowedError" ? "Annulé." : "Échec.");
    } finally {
      setBioBusy(false);
    }
  }

  return (
    <section className="page page-narrow">
      <header className="account-hero">
        <Avatar name={me} size="xl" color={color} />
        <div>
          <h1 className="page-title">{me}</h1>
          <p className="page-sub">
            {wishCount} souhait{wishCount > 1 ? "s" : ""} dans ta liste · {giftCount}{" "}
            cadeau{giftCount > 1 ? "x" : ""} à offrir
          </p>
        </div>
      </header>

      {/* Couleur */}
      <div className="card account-card">
        <h2 className="card-title">Ma couleur</h2>
        <p className="card-text">Elle t'identifie partout : listes, commentaires, activité.</p>
        <div className="color-grid">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              className={"color-dot" + (c === color ? " is-on" : "")}
              style={{ background: c }}
              onClick={() => pickColor(c)}
              disabled={!online || colorBusy}
              aria-label={"Choisir la couleur " + c}
              aria-pressed={c === color}
            />
          ))}
        </div>
        {!online && <p className="note">Modifiable seulement en ligne.</p>}
      </div>

      {/* Code */}
      <div className="card account-card">
        <h2 className="card-title">Mon code</h2>
        <p className="card-text">Le code qui protège ton profil (4 à 12 chiffres).</p>
        <form className="account-form" onSubmit={savePin}>
          <input
            className="field"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            placeholder="Nouveau code"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
            maxLength={12}
            disabled={!online || pinBusy}
          />
          <input
            className="field"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            placeholder="Confirmer le code"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
            maxLength={12}
            disabled={!online || pinBusy}
          />
          <button
            className="btn btn-primary"
            disabled={!online || pinBusy || newPin.length < MIN_LEN}
          >
            {pinBusy ? "…" : "Enregistrer le code"}
          </button>
        </form>
        {pinMsg && <p className="note">{pinMsg}</p>}
        {!online && <p className="note">Modifiable seulement en ligne.</p>}
      </div>

      {/* Biométrie */}
      {biometricAvailable && (
        <div className="card account-card">
          <h2 className="card-title">Biométrie</h2>
          <p className="card-text">
            Ouvre ton profil avec l'empreinte ou le visage sur cet appareil, sans
            taper ton code.
          </p>
          <button className="btn btn-soft btn-block" onClick={toggleBio} disabled={!online || bioBusy}>
            <Icon name="lock" size={17} />
            {bioBusy
              ? "…"
              : biometricEnrolled
              ? "Actualiser la biométrie"
              : "Activer la biométrie"}
          </button>
          {bioMsg && <p className="note">{bioMsg}</p>}
          {!online && <p className="note">Activation possible seulement en ligne.</p>}
        </div>
      )}

      {/* Cache hors ligne */}
      <div className="card account-card">
        <h2 className="card-title">Données hors ligne</h2>
        <p className="card-text">
          Efface les listes mises en cache et les modifications en attente sur cet
          appareil.{" "}
          {online ? "Tout est rechargé depuis le serveur." : "À faire de préférence en ligne."}
        </p>
        <button className="btn btn-soft btn-block" onClick={clearCache} disabled={cacheBusy}>
          {cacheBusy ? "…" : cacheConfirm ? "Confirmer — vider le cache ?" : "Vider le cache local"}
        </button>
        {cacheMsg && <p className="note">{cacheMsg}</p>}
      </div>

      {/* Profil / session */}
      <div className="account-actions">
        <button className="btn btn-soft btn-block" onClick={onChangeProfile}>
          <Icon name="user" size={17} />
          Changer de profil
        </button>
        <button className="btn btn-danger-soft btn-block" onClick={onLogout}>
          <Icon name="logout" size={17} />
          Se déconnecter
        </button>
      </div>
    </section>
  );
}
