import "./globals.css";

export const metadata = {
  title: "Liste de souhaits — Famille",
  description: "Les souhaits de toute la famille, au même endroit.",
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
      <body>{children}</body>
    </html>
  );
}
