"use client";

import { FRAMES, clovisSrc, useSeason } from "../lib/season";

// Clovis, le furet de l'appli (illustrations dans /public/clovis, PNG légers).
// Il se place au bord d'une bulle (tuto, « Psssttt ») :
//   pose="peek"  : il dépasse de derrière la bulle, pattes posées sur le bord ;
//   pose="wave"  : il salue, assis sur la bulle ;
//   pose="dance" : il bondit de joie (la « danse de guerre » du furet) ;
//   pose="gift"  : debout sur la bulle, un cadeau dans les pattes ;
//   pose="point" : allongé sur la bulle, il montre quelque chose du doigt.
// `at` = coin de la bulle : "top-left" | "top-right" | "bottom-left" | "bottom-right"
// (en bas, il est suspendu la tête en bas, comme un furet qui se faufile).
// « peek » et « wave » ont une tenue de saison (Noël, Nouvel An, Halloween).

const ART = {
  peek: "bord",
  wave: "coucou",
  dance: "bond",
  gift: "trouve",
  point: "pointeur",
};
const SIZE = {
  peek: FRAMES.bord.size,
  wave: FRAMES.coucou.size,
  dance: [420, 305],
  gift: [358, 420],
  point: [420, 254],
};

export default function Clovis({ pose = "peek", at = "top-right", className = "" }) {
  const season = useSeason();
  const [w, h] = SIZE[pose] || SIZE.peek;
  return (
    <span className={`clovis clovis-${pose} clovis-${at} ${className}`} aria-hidden="true">
      <span className="clovis-inner">
        <img
          className="clovis-img"
          src={clovisSrc(ART[pose] || "bord", season)}
          width={w}
          height={h}
          alt=""
          decoding="async"
          draggable="false"
        />
      </span>
    </span>
  );
}

// Hauteur (px) que Clovis occupe au-dessus / au-dessous de la bulle : sert à
// garder la bulle assez loin des bords de l'écran (chapeaux de saison compris).
export const CLOVIS_ROOM = { peek: 60, wave: 100, dance: 84, gift: 90, point: 60 };
