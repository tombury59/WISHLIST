"use client";

import { useEffect, useState } from "react";
import { MEMBERS } from "../lib/members";
import { avatarColor } from "../lib/format";
import { hasUserPinHash } from "../lib/offline-store";

// « Qui es-tu ? » — choix du profil, à la Netflix.
// Au clic sur un profil, le parent tente d'abord la biométrie (si ce profil est
// enrôlé sur l'appareil) puis retombe sur le code. Ici on gère juste l'état
// « occupé » du profil cliqué et le grisage hors ligne.
export default function ProfilePicker({ onChoose, online = true, enrolledMembers = [] }) {
  const [busyMember, setBusyMember] = useState(null);

  // Profils déverrouillables hors ligne : ceux qui ont une empreinte de code
  // locale OU une clé biométrique enrôlée sur cet appareil.
  const [pinMembers, setPinMembers] = useState(null);
  useEffect(() => {
    setPinMembers(MEMBERS.filter((m) => hasUserPinHash(m)));
  }, []);

  async function pick(m) {
    if (busyMember) return;
    setBusyMember(m);
    try {
      await onChoose(m);
    } finally {
      setBusyMember(null);
    }
  }

  return (
    <main className="gate">
      <div className="profiles">
        <h1 className="profiles-title">Qui es-tu ?</h1>

        <div className="profile-grid">
          {MEMBERS.map((m) => {
            const unlockable =
              (pinMembers !== null && pinMembers.includes(m)) ||
              enrolledMembers.includes(m);
            const locked = !online && pinMembers !== null && !unlockable;
            const busy = busyMember === m;
            return (
              <button
                key={m}
                type="button"
                className={
                  "profile-tile" +
                  (locked ? " profile-tile--locked" : "") +
                  (busy ? " profile-tile--busy" : "")
                }
                onClick={() => pick(m)}
                disabled={locked || Boolean(busyMember)}
                title={locked ? "Indisponible hors ligne sur cet appareil" : undefined}
              >
                <span className="profile-avatar" style={{ background: avatarColor(m) }}>
                  {m[0]}
                </span>
                <span className="profile-name">{busy ? "…" : m}</span>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
