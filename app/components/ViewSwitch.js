// Sélecteur de vue : carrousel / liste.
export default function ViewSwitch({ view, onChange }) {
  return (
    <div className="view-switch" role="group" aria-label="Mode d'affichage">
      <button
        type="button"
        className={"view-opt" + (view === "carousel" ? " is-active" : "")}
        onClick={() => onChange("carousel")}
        aria-label="Vue carrousel"
        title="Carrousel"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="5" width="14" height="14" rx="2.5" />
        </svg>
      </button>
      <button
        type="button"
        className={"view-opt" + (view === "list" ? " is-active" : "")}
        onClick={() => onChange("list")}
        aria-label="Vue liste"
        title="Liste"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
        </svg>
      </button>
    </div>
  );
}
