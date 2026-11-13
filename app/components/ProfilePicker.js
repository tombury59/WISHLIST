"use client";

import { useEffect, useState } from "react";
import { MEMBERS } from "../lib/members";
import Avatar from "./Avatar";
import { hasUserPinHash } from "../lib/offline-store";
import ClovisArt from "./ClovisArt";

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
        <div className="profiles-mascot">
          <ClovisArt pose="bord" width={128} />
        </div>
        <h1 className="profiles-title">Qui es-tu ?</h1>
        <p className="gate-sub">Choisis ton profil pour ouvrir ta liste.</p>

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
                <Avatar name={m} size="xl" className="profile-avatar" />
                <span className="profile-name">{busy ? "…" : m}</span>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
