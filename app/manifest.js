// Manifeste de l'appli installable (PWA). Next ajoute automatiquement le lien
// <link rel="manifest"> dans les pages.
export default function manifest() {
  return {
    name: "Liste de souhaits",
    short_name: "Souhaits",
    description: "Les souhaits de toute la famille, au même endroit.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
