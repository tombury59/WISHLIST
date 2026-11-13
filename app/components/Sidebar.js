import { MEMBERS } from "../lib/members";
import Avatar from "./Avatar";
import Icon from "./Icon";

// Navigation latérale (grand écran) : ma liste, les cadeaux (à offrir / reçus),
// l'activité, puis toute la famille, et mon compte en bas.
export default function Sidebar({
  me,
  section,
  active,
  counts, // { membre: nb de souhaits actifs }
  giftCount, // nb de cadeaux que j'ai réservés (à offrir)
  onOpenList,
  onGo,
}) {
  const others = MEMBERS.filter((m) => m !== me);
  const onLists = section === "lists";

  return (
    <aside className="side">
      <div className="brand">
        <span className="brand-mark">
          <Icon name="gift" size={20} />
        </span>
        <span className="brand-text">
          <strong>Souhaits</strong>
          <small>La liste de la famille</small>
        </span>
      </div>

      <nav className="side-nav" aria-label="Rubriques">
        <button
          className={"side-item" + (onLists && active === me ? " is-active" : "")}
          onClick={() => onOpenList(me)}
        >
          <Icon name="list" size={18} />
          <span className="side-label">Ma liste</span>
          {counts[me] > 0 && <span className="count">{counts[me]}</span>}
        </button>
        <button
          className={"side-item" + (section === "gifts" ? " is-active" : "")}
          onClick={() => onGo("gifts")}
        >
          <Icon name="gift" size={18} />
          <span className="side-label">Cadeaux</span>
          {giftCount > 0 && <span className="count count-accent">{giftCount}</span>}
        </button>
        <button
          className={"side-item" + (section === "activity" ? " is-active" : "")}
          onClick={() => onGo("activity")}
        >
          <Icon name="clock" size={18} />
          <span className="side-label">Activité</span>
        </button>
      </nav>

      <p className="side-title">La famille</p>
      <nav className="side-nav side-members" aria-label="Listes de la famille">
        {others.map((m) => (
          <button
            key={m}
            className={"side-item" + (onLists && active === m ? " is-active" : "")}
            onClick={() => onOpenList(m)}
          >
            <Avatar name={m} size="sm" />
            <span className="side-label">{m}</span>
            {counts[m] > 0 && <span className="count">{counts[m]}</span>}
          </button>
        ))}
      </nav>

      <button
        className={"side-item side-account" + (section === "account" ? " is-active" : "")}
        onClick={() => onGo("account")}
      >
        <Avatar name={me} size="sm" />
        <span className="side-label">
          {me}
          <small>Mon compte</small>
        </span>
      </button>
    </aside>
  );
}
