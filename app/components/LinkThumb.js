"use client";

import { useState } from "react";
import { normalizeUrl } from "../lib/format";

// Miniature d'aperçu d'un lien : l'image si le lien pointe vers une image,
// sinon l'icône (favicon) du site. Repli discret si rien ne charge.
export default function LinkThumb({ link, big }) {
  const [failed, setFailed] = useState(false);
  const url = normalizeUrl(link);
  const isImage = /\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?.*)?$/i.test(url);
  const bigCls = big ? " thumb-big" : "";

  let src = null;
  if (isImage) {
    src = url;
  } else {
    try {
      src = `https://icons.duckduckgo.com/ip3/${new URL(url).hostname}.ico`;
    } catch {
      src = null;
    }
  }

  if (!src || failed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={"thumb thumb-fallback" + bigCls}
        aria-label="Ouvrir le lien"
      >
        ↗
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={"thumb " + (isImage ? "thumb-image" : "thumb-favicon") + bigCls}
      aria-label="Ouvrir le lien"
    >
      <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
    </a>
  );
}
