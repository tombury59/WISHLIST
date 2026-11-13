import Avatar from "./Avatar";
import Icon from "./Icon";

// Barre de navigation du bas (téléphone) : 4 rubriques accessibles au pouce.
export default function BottomNav({ me, section, giftCount, onGo }) {
  const item = (key, label, icon) => (
    <button
      className={"tabbar-item" + (section === key ? " is-active" : "")}
      onClick={() => onGo(key)}
      aria-current={section === key ? "page" : undefined}
    >
      <span className="tabbar-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <nav className="tabbar" aria-label="Rubriques">
      {item("lists", "Listes", <Icon name="list" size={22} />)}
      {item(
        "gifts",
        "À offrir",
        <>
          <Icon name="gift" size={22} />
          {giftCount > 0 && <span className="tabbar-badge">{giftCount}</span>}
        </>
      )}
      {item("activity", "Activité", <Icon name="clock" size={22} />)}
      {item("account", "Compte", <Avatar name={me} size="xs" />)}
    </nav>
  );
}
