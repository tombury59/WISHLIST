"use client";

import { useEffect, useState } from "react";
import { GUIDES, PLATFORM_CHOICES } from "../lib/install";
import Icon from "./Icon";
import InstallScene from "./InstallScene";

const STEP_MS = 3800; // durée d'une étape en lecture automatique

// Fenêtre « Installer l'appli » : le guide animé pour l'appareil détecté,
// étape par étape (lecture automatique, ou à la main avec les flèches).
// On peut choisir un autre appareil — pratique pour aider quelqu'un d'autre.
export default function InstallGuide({ platform: detected, canPrompt, onPrompt, onClose }) {
  const [platform, setPlatform] = useState(detected in GUIDES ? detected : "other");
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);
  const [host, setHost] = useState("souhaits.app");

  const guide = GUIDES[platform] || GUIDES.other;
  const steps = guide.steps;
  const current = steps[step];

  useEffect(() => {
    setHost(window.location.host || "souhaits.app");
    // Pas de lecture automatique si l'utilisateur préfère moins d'animations.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setAuto(false);
  }, []);

  // Lecture automatique, en boucle.
  useEffect(() => {
    if (!auto || steps.length < 2) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % steps.length), STEP_MS);
    return () => clearTimeout(t);
  }, [auto, step, steps.length]);

  // Échap pour fermer.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function goTo(i) {
    setAuto(false); // l'utilisateur reprend la main
    setStep((i + steps.length) % steps.length);
  }

  function choose(p) {
    setPlatform(p);
    setStep(0);
    setAuto(true);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="sheet ig-guide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ig-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ig-guide-head">
          <div>
            <h3 id="ig-title" className="dialog-title">
              Installer l'appli
            </h3>
            <p className="ig-guide-platform">{guide.label}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer" title="Fermer">
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Navigateur qui sait installer en un clic (Chrome, Edge, Android). */}
        {canPrompt && (
          <button className="btn btn-primary btn-block ig-oneclick" onClick={onPrompt}>
            <Icon name="install" size={18} />
            Installer en un clic
          </button>
        )}

        {guide.unsupported ? (
          <div className="ig-unsupported">
            <span className="empty-icon">
              <Icon name="install" size={28} />
            </span>
            <p>{guide.unsupported}</p>
          </div>
        ) : (
          <>
            {/* La clé relance les animations de la scène à chaque étape. */}
            <div className="ig-stage" key={platform + step}>
              <InstallScene scene={current.scene} host={host} />
            </div>

            <div className="ig-step" aria-live="polite">
              <span className="ig-step-n">
                {step + 1}/{steps.length}
              </span>
              <p className="ig-step-text">{current.text}</p>
            </div>

            <div className="ig-nav">
              <button
                className="icon-btn"
                onClick={() => goTo(step - 1)}
                aria-label="Étape précédente"
              >
                <Icon name="chevronLeft" size={20} />
              </button>
              <div className="ig-dots-nav">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    className={"ig-dot" + (i === step ? " is-on" : "")}
                    onClick={() => goTo(i)}
                    aria-label={`Étape ${i + 1}`}
                    aria-current={i === step ? "step" : undefined}
                  >
                    {/* Barre de progression de l'étape en cours (lecture auto). */}
                    {i === step && auto && (
                      <span className="ig-dot-fill" style={{ animationDuration: STEP_MS + "ms" }} />
                    )}
                  </button>
                ))}
              </div>
              <button
                className="icon-btn"
                onClick={() => goTo(step + 1)}
                aria-label="Étape suivante"
              >
                <Icon name="chevronRight" size={20} />
              </button>
            </div>

            {guide.note && <p className="ig-note">{guide.note}</p>}
          </>
        )}

        <label className="ig-switch">
          <span>Pas le bon appareil ?</span>
          <select value={platform} onChange={(e) => choose(e.target.value)}>
            {!PLATFORM_CHOICES.some(([k]) => k === platform) && (
              <option value={platform}>{guide.label}</option>
            )}
            {PLATFORM_CHOICES.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
