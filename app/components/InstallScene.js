import Icon from "./Icon";

// Petite scène animée d'une étape du guide d'installation : un téléphone ou un
// écran d'ordinateur stylisé, le bouton à toucher mis en évidence (anneau qui
// pulse + doigt qui appuie), et ce qui apparaît ensuite (feuille de partage,
// menu, fenêtre de confirmation, écran d'accueil…).
// Tout est en HTML + CSS : aucune image, aucune bibliothèque.

// Le « doigt » qui vient appuyer sur l'élément mis en évidence.
const Finger = () => <span className="ig-finger" aria-hidden="true" />;

// Un bouton de barre de navigateur, mis en évidence si `on`.
function Btn({ on, children, className = "" }) {
  return (
    <span className={"ig-btn " + className + (on ? " ig-hit" : "")}>
      {children}
      {on && <Finger />}
    </span>
  );
}

// Icône de l'appli (comme sur l'écran d'accueil).
function AppIcon({ size = "md" }) {
  return (
    <span className={"ig-app ig-app-" + size}>
      <Icon name="gift" size={size === "lg" ? 22 : size === "sm" ? 10 : 15} strokeWidth={2} />
    </span>
  );
}

// Contenu factice de la page (le site, en miniature).
function FakePage() {
  return (
    <div className="ig-page" aria-hidden="true">
      <div className="ig-page-head">
        <AppIcon size="sm" />
        <span className="ig-line ig-line-title" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="ig-card">
          <span className="ig-thumb" />
          <span className="ig-lines">
            <span className="ig-line" />
            <span className="ig-line ig-line-short" />
          </span>
        </div>
      ))}
    </div>
  );
}

function Url({ host, children }) {
  return (
    <span className="ig-url">
      <span className="ig-url-text">{host}</span>
      {children}
    </span>
  );
}

// Liste de choix (feuille de partage ou menu), une ligne mise en évidence.
function Rows({ items, hit, icon }) {
  return items.map((label, i) => (
    <span key={label} className={"ig-row" + (i === hit ? " ig-row-hit" : "")}>
      {i === hit && icon && <span className="ig-row-ico">{icon}</span>}
      <span className="ig-row-label">{label}</span>
      {i === hit && <Finger />}
    </span>
  ));
}

function Overlay({ overlay, phone }) {
  if (!overlay) return null;
  switch (overlay.type) {
    case "sheet":
      return (
        <div className="ig-layer">
          <div className="ig-sheet">
            <span className="ig-grabber" />
            <Rows items={overlay.items} hit={overlay.hit} icon={<Icon name="plusSquare" size={11} />} />
          </div>
        </div>
      );
    case "menu":
      return (
        <div className="ig-layer ig-layer-clear">
          <div className="ig-menu">
            <Rows items={overlay.items} hit={overlay.hit} icon={<Icon name="install" size={11} />} />
          </div>
        </div>
      );
    case "popup":
      // Menu du bouton « ⋯ » d'iOS 26 : s'ouvre au-dessus de la barre du bas.
      return (
        <div className="ig-layer ig-layer-clear ig-layer-bottom">
          <div className="ig-menu ig-popup">
            <Rows items={overlay.items} hit={overlay.hit} icon={<Icon name="share" size={11} />} />
          </div>
        </div>
      );
    case "macmenu":
      return (
        <div className="ig-macmenu">
          <Rows items={overlay.items} hit={overlay.hit} />
        </div>
      );
    case "dialog":
      if (overlay.style === "ios") {
        return (
          <div className="ig-layer">
            <div className="ig-dialog ig-dialog-ios">
              <div className="ig-dlg-head">
                <span className="ig-dlg-cancel">Annuler</span>
                <span className="ig-dlg-action ig-hit">
                  {overlay.action}
                  <Finger />
                </span>
              </div>
              <div className="ig-dlg-app">
                <AppIcon size="lg" />
                <span className="ig-dlg-name">Souhaits</span>
              </div>
              {/* iOS 26 : interrupteur à laisser activé (plein écran). */}
              {overlay.webApp && (
                <div className="ig-dlg-toggle">
                  <span>Ouvrir comme app web</span>
                  <span className="ig-switch-on" aria-hidden="true" />
                </div>
              )}
            </div>
          </div>
        );
      }
      return (
        <div className={"ig-layer" + (phone ? "" : " ig-layer-center")}>
          <div className="ig-dialog">
            <div className="ig-dlg-app">
              <AppIcon size="lg" />
              <span className="ig-dlg-title">{overlay.title}</span>
            </div>
            <div className="ig-dlg-buttons">
              <span className="ig-dlg-cancel">Annuler</span>
              <span className="ig-dlg-primary ig-hit">
                {overlay.action}
                <Finger />
              </span>
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
}

// Écran d'accueil du téléphone : l'icône de l'appli apparaît parmi les autres.
function HomeScreen() {
  return (
    <div className="ig-home">
      <div className="ig-home-grid">
        {Array.from({ length: 15 }, (_, i) =>
          i === 6 ? (
            <span key={i} className="ig-home-slot ig-home-new">
              <AppIcon size="lg" />
              <span className="ig-home-label">Souhaits</span>
            </span>
          ) : (
            <span key={i} className="ig-home-slot">
              <span className="ig-home-icon" style={{ "--h": (i * 47) % 360 }} />
            </span>
          )
        )}
      </div>
      <div className="ig-home-dock">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="ig-home-icon" style={{ "--h": 200 + i * 40 }} />
        ))}
      </div>
    </div>
  );
}

export default function InstallScene({ scene, host = "souhaits.app" }) {
  const { device, bar, hit, overlay } = scene;

  // ---------------- Téléphone ----------------
  if (device === "phone") {
    if (overlay?.type === "home") {
      return (
        <div className="ig-device ig-phone">
          <div className="ig-screen">
            <HomeScreen />
          </div>
        </div>
      );
    }
    return (
      <div className="ig-device ig-phone">
        <div className="ig-screen">
          <div className="ig-status">
            <span>9:41</span>
            <span className="ig-status-icons" />
          </div>

          {bar === "android-top" && (
            <div className="ig-bar ig-bar-top">
              <Btn>
                <Icon name="home" size={12} />
              </Btn>
              <Url host={host} />
              <Btn on={hit === "menu"}>
                <Icon name="more" size={13} />
              </Btn>
            </div>
          )}
          {bar === "ios-top-share" && (
            <div className="ig-bar ig-bar-top">
              <Url host={host}>
                <Btn on={hit === "share"} className="ig-btn-in">
                  <Icon name="share" size={12} />
                </Btn>
              </Url>
            </div>
          )}

          <FakePage />

          {bar === "ios-bottom" && (
            <div className="ig-bottom">
              <Url host={host} />
              <div className="ig-bar ig-bar-bottom">
                <Btn>
                  <Icon name="chevronLeft" size={13} />
                </Btn>
                <Btn>
                  <Icon name="chevronRight" size={13} />
                </Btn>
                <Btn on={hit === "share"}>
                  <Icon name="share" size={13} />
                </Btn>
                <Btn>
                  <Icon name="book" size={12} />
                </Btn>
                <Btn>
                  <Icon name="tabs" size={12} />
                </Btn>
              </div>
            </div>
          )}
          {/* iOS 26 (Safari « compact ») : retour | [menu de la page · adresse · ↻] |
              onglets, en verre dépoli au-dessus de la page. Partager se trouve
              dans le menu de la page (les lignes à gauche de l'adresse). */}
          {bar === "ios26-compact" && (
            <div className="ig-glass-bar">
              <Btn className="ig-glass ig-glass-dim">
                <Icon name="chevronLeft" size={12} />
              </Btn>
              <span className="ig-glass ig-glass-url">
                <Btn on={hit === "pageMenu"} className="ig-btn-in">
                  <Icon name="pageMenu" size={11} />
                </Btn>
                <span className="ig-url-text">{host}</span>
                <Icon name="reload" size={10} />
              </span>
              <Btn className="ig-glass">
                <Icon name="tabs" size={11} />
              </Btn>
            </div>
          )}
          {(bar === "samsung-bottom" || bar === "firefox-bottom") && (
            <div className="ig-bottom">
              {bar === "firefox-bottom" && <Url host={host} />}
              <div className="ig-bar ig-bar-bottom">
                <Btn>
                  <Icon name="chevronLeft" size={13} />
                </Btn>
                <Btn>
                  <Icon name="chevronRight" size={13} />
                </Btn>
                <Btn>
                  <Icon name={bar === "samsung-bottom" ? "home" : "plus"} size={12} />
                </Btn>
                <Btn>
                  <Icon name="tabs" size={12} />
                </Btn>
                <Btn on={hit === "menu"}>
                  <Icon name="bars" size={13} />
                </Btn>
              </div>
            </div>
          )}

          <Overlay overlay={overlay} phone />
        </div>
      </div>
    );
  }

  // ---------------- Ordinateur ----------------
  return (
    <div className="ig-device ig-desktop">
      {bar === "mac" && (
        <div className="ig-macbar">
          <span className="ig-mac-apple" />
          <b>Safari</b>
          <span className={"ig-mac-item" + (hit === "file" || overlay?.type === "macmenu" ? " ig-mac-open" : "")}>
            Fichier
            {hit === "file" && <Finger />}
          </span>
          <span className="ig-mac-item">Édition</span>
          <span className="ig-mac-item">Présentation</span>
        </div>
      )}
      <div className={"ig-window" + (bar === "app" ? " ig-window-app" : "")}>
        {bar === "app" ? (
          <div className="ig-win-title">
            <span className="ig-dots" />
            <AppIcon size="sm" />
            <span>Souhaits</span>
          </div>
        ) : (
          <div className="ig-bar ig-bar-top ig-bar-desktop">
            <span className="ig-dots" />
            <Btn>
              <Icon name="chevronLeft" size={12} />
            </Btn>
            <Url host={host}>
              {bar === "browser" && (
                <Btn on={hit === "install"} className="ig-btn-in">
                  <Icon name="install" size={12} />
                </Btn>
              )}
            </Url>
            <Btn>
              <Icon name="more" size={12} />
            </Btn>
          </div>
        )}
        <FakePage />
        {overlay?.type === "dialog" && <Overlay overlay={overlay} />}
      </div>
      {overlay?.type === "macmenu" && <Overlay overlay={overlay} />}
      {bar === "app" && scene.dock !== false && (
        <div className="ig-dock">
          {[0, 1, 2].map((i) => (
            <span key={i} className="ig-home-icon" style={{ "--h": 190 + i * 50 }} />
          ))}
          <span className="ig-dock-new">
            <AppIcon size="md" />
          </span>
        </div>
      )}
    </div>
  );
}
