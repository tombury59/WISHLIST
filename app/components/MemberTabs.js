import { MEMBERS } from "../lib/members";

// Onglets des membres, avec le nombre de souhaits de chacun.
export default function MemberTabs({ active, wishes, onSelect }) {
  return (
    <nav className="tabs">
      {MEMBERS.map((m) => {
        const count = (wishes[m] || []).length;
        return (
          <button
            key={m}
            className={"tab" + (m === active ? " tab-active" : "")}
            onClick={() => onSelect(m)}
          >
            {m}
            {count > 0 && <span className="tab-count">{count}</span>}
          </button>
        );
      })}
    </nav>
  );
}
