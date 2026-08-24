"use client";

import { useState } from "react";
import { avatarColor, COLOR_PALETTE } from "../lib/format";

const MIN_LEN = 4;

// Page « Mon compte ». S'ouvre par une révélation en cercle partant de l'icône
// (en haut à gauche) et remplissant l'écran ; se referme en sens inverse.
export default function AccountPage({
  me,
  online = true,
  biometricAvailable,
  biometricEnrolled,
  onPickColor,
  onChangePin,
  onEnrollBiometric,
  onClearCache,
  onChangeProfile,
  onLogout,
  onClose,
}) {
  const [closing, setClosing] = useState(false);

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

  function close() {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 380); // laisse jouer l'animation de fermeture
  }

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
    <div className={"account" + (closing ? " account--closing" : "")}>
      <div className="account-inner">
        <header className="account-head">
          <div className="account-id">
            <span className="account-avatar" style={{ background: color }}>
              {me[0]}
            </span>
            <div>
              <h1 className="account-name">{me}</h1>
              <p className="account-sub">Mon compte</p>
            </div>
          </div>
          <button className="account-close" onClick={close} aria-label="Fermer" title="Fermer">
            ×
          </button>
        </header>

        {/* Couleur */}
        <section className="account-section">
          <h2 className="account-section-title">Ma couleur</h2>
          <div className="color-grid">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                className={"color-dot" + (c === color ? " color-dot--on" : "")}
                style={{ background: c }}
                onClick={() => pickColor(c)}
                disabled={!online || colorBusy}
                aria-label={"Choisir " + c}
              />
            ))}
          </div>
          {!online && <p className="account-note">Modifiable seulement en ligne.</p>}
        </section>

        {/* Code */}
        <section className="account-section">
          <h2 className="account-section-title">Changer mon code</h2>
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
              className="btn-primary"
              disabled={!online || pinBusy || newPin.length < MIN_LEN}
            >
              {pinBusy ? "…" : "Enregistrer le code"}
            </button>
          </form>
          {pinMsg && <p className="account-note">{pinMsg}</p>}
          {!online && <p className="account-note">Modifiable seulement en ligne.</p>}
        </section>

        {/* Biométrie */}
        {biometricAvailable && (
          <section className="account-section">
            <h2 className="account-section-title">Biométrie</h2>
            <button className="account-btn" onClick={toggleBio} disabled={!online || bioBusy}>
              {bioBusy
                ? "…"
                : biometricEnrolled
                ? "🔒 Actualiser la biométrie"
                : "🔒 Activer la biométrie"}
            </button>
            {bioMsg && <p className="account-note">{bioMsg}</p>}
            {!online && <p className="account-note">Activation possible seulement en ligne.</p>}
          </section>
        )}

        {/* Cache hors ligne */}
        <section className="account-section">
          <h2 className="account-section-title">Données hors ligne</h2>
          <button className="account-btn" onClick={clearCache} disabled={cacheBusy}>
            {cacheBusy
              ? "…"
              : cacheConfirm
              ? "Confirmer — vider le cache ?"
              : "Vider le cache local"}
          </button>
          <p className="account-note">
            Efface les listes mises en cache et les modifs en attente sur cet
            appareil. {online ? "Tout est rechargé depuis le serveur." : "À faire de préférence en ligne."}
          </p>
          {cacheMsg && <p className="account-note">{cacheMsg}</p>}
        </section>

        {/* Profil / session */}
        <section className="account-section">
          <button className="account-btn" onClick={onChangeProfile}>
            Changer de profil
          </button>
          <button
            className="account-btn account-btn--danger"
            onClick={onLogout}
            style={{ marginTop: 10 }}
          >
            Se déconnecter
          </button>
        </section>
      </div>
    </div>
  );
}
