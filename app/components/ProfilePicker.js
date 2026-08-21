import { MEMBERS } from "../lib/members";
import { avatarColor } from "../lib/format";

// « Qui es-tu ? » — choix du profil, à la Netflix.
export default function ProfilePicker({ onChoose }) {
  return (
    <main className="gate">
      <div className="profiles">
        <h1 className="profiles-title">Qui es-tu ?</h1>
        <div className="profile-grid">
          {MEMBERS.map((m) => (
            <button
              key={m}
              type="button"
              className="profile-tile"
              onClick={() => onChoose(m)}
            >
              <span className="profile-avatar" style={{ background: avatarColor(m) }}>
                {m[0]}
              </span>
              <span className="profile-name">{m}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
