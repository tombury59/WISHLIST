// Copie du texte dans le presse-papier, avec repli pour les navigateurs sans
// l'API presse-papier (ou si elle échoue : contexte non sécurisé, refus, etc.).
export function copyToClipboard(text) {
  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch {
      /* ignore */
    }
    document.body.removeChild(ta);
  };
  try {
    if (navigator.clipboard?.writeText) {
      // .catch gère le rejet ASYNCHRONE (sinon repli jamais appelé).
      navigator.clipboard.writeText(text).catch(fallback);
    } else {
      fallback();
    }
  } catch {
    fallback();
  }
}
