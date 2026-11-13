import { Fraunces } from "next/font/google";
import "./globals.css";

// Police des titres. `next/font` la télécharge AU BUILD et la sert depuis le
// même domaine que le site (CDN Vercel) : aucune requête vers Google à
// l'exécution, pas de décalage de mise en page au chargement. Le texte courant
// reste en police système (zéro octet à charger).
const display = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-display",
});

export const metadata = {
  title: "Liste de souhaits — Famille",
  description: "Les souhaits de toute la famille, au même endroit.",
  // Ouverture en plein écran (sans barre du navigateur) sur iPhone.
  appleWebApp: {
    capable: true,
    title: "Souhaits",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Le contenu passe sous l'encoche / la barre d'accueil ; les marges de
  // sécurité sont gérées en CSS (env(safe-area-inset-*)).
  viewportFit: "cover",
  themeColor: "#0e0d0c",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={display.variable}>
      {/* Des extensions de navigateur (gestionnaires de mots de passe, etc.)
          ajoutent parfois des attributs au <body> avant l'hydratation React,
          ce qui déclenche un faux avertissement. On le supprime ici — ça ne
          masque QUE cet attribut sur le body, pas les vrais soucis ailleurs. */}
      <body suppressHydrationWarning>
        {/* Capture la proposition d'installation du navigateur (Chrome, Edge,
            Android) dès qu'elle arrive, avant même que l'appli soit prête :
            elle est reprise par useInstall pour le bouton « Installer ». */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__bip=e;window.dispatchEvent(new Event('bip-ready'));});",
          }}
        />
        {children}
      </body>
    </html>
  );
}
