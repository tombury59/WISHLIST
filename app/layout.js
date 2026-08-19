import "./globals.css";

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
  themeColor: "#0a0a0b",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      {/* Des extensions de navigateur (gestionnaires de mots de passe, etc.)
          ajoutent parfois des attributs au <body> avant l'hydratation React,
          ce qui déclenche un faux avertissement. On le supprime ici — ça ne
          masque QUE cet attribut sur le body, pas les vrais soucis ailleurs. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
