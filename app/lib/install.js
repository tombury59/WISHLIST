// Aide à l'installation de l'appli (écran d'accueil / Dock / fenêtre dédiée).
// Tout se passe dans le navigateur : aucune requête serveur.

// Appareil + navigateur de l'utilisateur, d'après le « user agent ».
export function detectPlatform() {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";

  // Navigateur intégré à une autre appli (Facebook, Instagram…) : impossible
  // d'installer depuis là, il faut d'abord ouvrir la page dans le navigateur.
  if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|musical_ly|TikTok/i.test(ua)) return "inapp";

  // iPadOS se présente comme un Mac : on le reconnaît à son écran tactile.
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) {
    if (/CriOS/.test(ua)) return "ios-chrome";
    if (/EdgiOS/.test(ua)) return "ios-chrome"; // même parcours que Chrome
    if (/FxiOS/.test(ua)) return "ios-firefox";
    // Safari 26 (iOS 26) : nouvelle barre « compacte », le bouton Partager est
    // caché dans le menu de la page (icône ☰ à gauche de l'adresse). Le numéro de version de Safari figure dans le user
    // agent (« Version/26.0 »). L'iPad garde sa barre en haut : ancien guide.
    const safari = Number((ua.match(/Version\/(\d+)/) || [])[1] || 0);
    const iPad = /iPad/.test(ua) || iPadOS;
    if (safari >= 26 && !iPad) return "ios-safari-26";
    return "ios-safari";
  }
  if (/Android/i.test(ua)) {
    if (/SamsungBrowser/i.test(ua)) return "android-samsung";
    if (/Firefox/i.test(ua)) return "android-firefox";
    return "android-chrome"; // Chrome, Edge, Brave, Opera…
  }
  if (/Firefox\//.test(ua)) return "desktop-firefox";
  if (/Edg\/|Chrome\/|Chromium\//.test(ua)) return "desktop-chromium";
  if (/Macintosh/.test(ua) && /Safari\//.test(ua)) return "mac-safari";
  return "other";
}

// L'appli est-elle déjà ouverte en mode installé ?
export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: window-controls-overlay)").matches ||
    window.navigator.standalone === true
  );
}

// Téléphone / tablette (pour décider d'afficher le bandeau d'invitation).
export function isTouchPlatform(p) {
  return /^(ios|android)-/.test(p) || p === "inapp";
}

// Choix proposés dans « Pas le bon appareil ? ».
export const PLATFORM_CHOICES = [
  ["ios-safari-26", "iPhone (iOS 26)"],
  ["ios-safari", "iPhone (iOS 18 et avant) / iPad"],
  ["android-chrome", "Android"],
  ["android-samsung", "Samsung (Internet)"],
  ["desktop-chromium", "Ordinateur (Chrome, Edge)"],
  ["mac-safari", "Mac (Safari)"],
];

// --- Guides pas à pas -------------------------------------------------------
// Chaque étape décrit une petite scène animée (voir InstallScene) :
//   device  : "phone" | "desktop"
//   bar     : barre(s) du navigateur à dessiner
//   hit     : bouton de la barre à mettre en évidence (« touche ici »)
//   overlay : élément qui apparaît (feuille, menu, fenêtre, écran d'accueil…)

const IOS_SHEET = ["Copier", "Ajouter aux favoris", "Sur l'écran d'accueil", "Imprimer"];
const IOS_CONFIRM = { type: "dialog", style: "ios", action: "Ajouter" };
const HOME = { type: "home" };

export const GUIDES = {
  "ios-safari-26": {
    label: "iPhone · Safari (iOS 26)",
    note: "Tu vois directement le bouton Partager en bas (réglage « Bas » ou « Haut » de Safari) ? Touche-le et passe à l'étape 3.",
    steps: [
      {
        text: "Dans la barre du bas, touche l'icône ☰ à gauche de l'adresse.",
        scene: { device: "phone", bar: "ios26-compact", hit: "pageMenu" },
      },
      {
        text: "Choisis « Partager ».",
        scene: {
          device: "phone",
          bar: "ios26-compact",
          overlay: { type: "popup", items: ["Partager", "Ajouter aux favoris", "Ajouter un signet", "Nouvel onglet"], hit: 0 },
        },
      },
      {
        text: "Fais défiler et choisis « Sur l'écran d'accueil ».",
        scene: { device: "phone", bar: "ios26-compact", overlay: { type: "sheet", items: IOS_SHEET, hit: 2 } },
      },
      {
        text: "Laisse « Ouvrir comme app web » activé, puis touche « Ajouter ».",
        scene: { device: "phone", bar: "ios26-compact", overlay: { ...IOS_CONFIRM, webApp: true } },
      },
      {
        text: "C'est prêt ! Ouvre « Souhaits » depuis ton écran d'accueil.",
        scene: { device: "phone", overlay: HOME },
      },
    ],
  },

  "ios-safari": {
    label: "iPhone (iOS 18 et avant) / iPad · Safari",
    steps: [
      {
        text: "Touche le bouton Partager, en bas de l'écran (en haut sur iPad).",
        scene: { device: "phone", bar: "ios-bottom", hit: "share" },
      },
      {
        text: "Fais défiler et choisis « Sur l'écran d'accueil ».",
        scene: { device: "phone", bar: "ios-bottom", overlay: { type: "sheet", items: IOS_SHEET, hit: 2 } },
      },
      {
        text: "Touche « Ajouter », en haut à droite.",
        scene: { device: "phone", bar: "ios-bottom", overlay: IOS_CONFIRM },
      },
      {
        text: "C'est prêt ! Ouvre « Souhaits » depuis ton écran d'accueil.",
        scene: { device: "phone", overlay: HOME },
      },
    ],
  },

  "ios-chrome": {
    label: "iPhone / iPad · Chrome ou Edge",
    note: "Nécessite iOS 16.4 ou plus récent. Sinon, ouvre cette page dans Safari.",
    steps: [
      {
        text: "Touche le bouton Partager, dans la barre d'adresse en haut.",
        scene: { device: "phone", bar: "ios-top-share", hit: "share" },
      },
      {
        text: "Choisis « Sur l'écran d'accueil ».",
        scene: { device: "phone", bar: "ios-top-share", overlay: { type: "sheet", items: IOS_SHEET, hit: 2 } },
      },
      {
        text: "Touche « Ajouter », en haut à droite.",
        scene: { device: "phone", bar: "ios-top-share", overlay: IOS_CONFIRM },
      },
      {
        text: "C'est prêt ! Ouvre « Souhaits » depuis ton écran d'accueil.",
        scene: { device: "phone", overlay: HOME },
      },
    ],
  },

  "ios-firefox": {
    label: "iPhone / iPad · Firefox",
    note: "Nécessite iOS 16.4 ou plus récent. Sinon, ouvre cette page dans Safari.",
    steps: [
      {
        text: "Touche le menu ☰, en bas à droite.",
        scene: { device: "phone", bar: "firefox-bottom", hit: "menu" },
      },
      {
        text: "Choisis « Partager ».",
        scene: {
          device: "phone",
          bar: "firefox-bottom",
          overlay: { type: "sheet", items: ["Nouvel onglet", "Favoris", "Partager", "Paramètres"], hit: 2 },
        },
      },
      {
        text: "Puis « Sur l'écran d'accueil ».",
        scene: { device: "phone", bar: "firefox-bottom", overlay: { type: "sheet", items: IOS_SHEET, hit: 2 } },
      },
      {
        text: "Touche « Ajouter » : c'est prêt !",
        scene: { device: "phone", overlay: HOME },
      },
    ],
  },

  "android-chrome": {
    label: "Android · Chrome",
    steps: [
      {
        text: "Touche le menu ⋮, en haut à droite.",
        scene: { device: "phone", bar: "android-top", hit: "menu" },
      },
      {
        text: "Choisis « Installer l'application » (ou « Ajouter à l'écran d'accueil »).",
        scene: {
          device: "phone",
          bar: "android-top",
          overlay: {
            type: "menu",
            items: ["Nouvel onglet", "Historique", "Partager…", "Installer l'application", "Paramètres"],
            hit: 3,
          },
        },
      },
      {
        text: "Confirme avec « Installer ».",
        scene: { device: "phone", bar: "android-top", overlay: { type: "dialog", title: "Installer l'appli ?", action: "Installer" } },
      },
      {
        text: "C'est prêt ! « Souhaits » est sur ton écran d'accueil.",
        scene: { device: "phone", overlay: HOME },
      },
    ],
  },

  "android-samsung": {
    label: "Android · Samsung Internet",
    steps: [
      {
        text: "Touche le menu ☰, en bas à droite.",
        scene: { device: "phone", bar: "samsung-bottom", hit: "menu" },
      },
      {
        text: "Choisis « Ajouter page à ».",
        scene: {
          device: "phone",
          bar: "samsung-bottom",
          overlay: { type: "sheet", items: ["Favoris", "Ajouter page à", "Partager", "Paramètres"], hit: 1 },
        },
      },
      {
        text: "Puis « Écran d'accueil ».",
        scene: {
          device: "phone",
          bar: "samsung-bottom",
          overlay: { type: "sheet", items: ["Favoris", "Raccourcis rapides", "Écran d'accueil"], hit: 2 },
        },
      },
      {
        text: "Confirme avec « Ajouter ».",
        scene: { device: "phone", bar: "samsung-bottom", overlay: { type: "dialog", title: "Ajouter à l'écran d'accueil ?", action: "Ajouter" } },
      },
      {
        text: "C'est prêt ! « Souhaits » est sur ton écran d'accueil.",
        scene: { device: "phone", overlay: HOME },
      },
    ],
  },

  "android-firefox": {
    label: "Android · Firefox",
    steps: [
      {
        text: "Touche le menu ⋮.",
        scene: { device: "phone", bar: "android-top", hit: "menu" },
      },
      {
        text: "Choisis « Installer » (ou « Ajouter à l'écran d'accueil »).",
        scene: {
          device: "phone",
          bar: "android-top",
          overlay: { type: "menu", items: ["Nouvel onglet", "Favoris", "Installer", "Paramètres"], hit: 2 },
        },
      },
      {
        text: "Confirme avec « Ajouter ».",
        scene: { device: "phone", bar: "android-top", overlay: { type: "dialog", title: "Ajouter à l'écran d'accueil ?", action: "Ajouter" } },
      },
      {
        text: "C'est prêt ! « Souhaits » est sur ton écran d'accueil.",
        scene: { device: "phone", overlay: HOME },
      },
    ],
  },

  "desktop-chromium": {
    label: "Ordinateur · Chrome ou Edge",
    note: "Pas d'icône dans la barre d'adresse ? Ouvre le menu ⋮ du navigateur et cherche « Installer ».",
    steps: [
      {
        text: "Clique sur l'icône d'installation, à droite de la barre d'adresse.",
        scene: { device: "desktop", bar: "browser", hit: "install" },
      },
      {
        text: "Confirme avec « Installer ».",
        scene: { device: "desktop", bar: "browser", overlay: { type: "dialog", title: "Installer l'appli ?", action: "Installer" } },
      },
      {
        text: "C'est prêt : Souhaits s'ouvre dans sa propre fenêtre.",
        scene: { device: "desktop", bar: "app", dock: false },
      },
    ],
  },

  "mac-safari": {
    label: "Mac · Safari",
    note: "Nécessite macOS Sonoma (14) ou plus récent.",
    steps: [
      {
        text: "Dans la barre des menus, ouvre « Fichier ».",
        scene: { device: "desktop", bar: "mac", hit: "file" },
      },
      {
        text: "Choisis « Ajouter au Dock… ».",
        scene: {
          device: "desktop",
          bar: "mac",
          overlay: { type: "macmenu", items: ["Nouvelle fenêtre", "Ouvrir le fichier…", "Ajouter au Dock…", "Imprimer…"], hit: 2 },
        },
      },
      {
        text: "Confirme avec « Ajouter ».",
        scene: { device: "desktop", bar: "mac", overlay: { type: "dialog", title: "Ajouter au Dock", action: "Ajouter" } },
      },
      {
        text: "C'est prêt : Souhaits est dans ton Dock.",
        scene: { device: "desktop", bar: "app" },
      },
    ],
  },

  "desktop-firefox": {
    label: "Ordinateur · Firefox",
    unsupported:
      "Firefox ne permet pas d'installer d'appli sur ordinateur. Ouvre cette page dans Chrome ou Edge, ou installe-la sur ton téléphone.",
    steps: [],
  },

  inapp: {
    label: "Navigateur d'une autre appli",
    unsupported:
      "Tu as ouvert le lien depuis une autre appli (Facebook, Instagram…). Ouvre son menu (⋯) et choisis « Ouvrir dans le navigateur » (Safari ou Chrome), puis reviens ici.",
    steps: [],
  },

  other: {
    label: "Ton navigateur",
    unsupported:
      "Ce navigateur ne semble pas permettre l'installation. Essaie Safari sur iPhone, Chrome sur Android, ou Chrome / Edge sur ordinateur.",
    steps: [],
  },
};
