// Clovis, le furet de l'appli (illustrations dans /public/clovis, PNG légers).
// Il se place au bord d'une bulle (tuto, « Psssttt ») :
//   pose="peek"  : il dépasse de derrière la bulle, pattes posées sur le bord ;
//   pose="wave"  : il salue, assis sur la bulle ;
//   pose="dance" : il bondit de joie (la « danse de guerre » du furet).
// `at` = coin de la bulle : "top-left" | "top-right" | "bottom-left" | "bottom-right"
// (en bas, il est suspendu la tête en bas, comme un furet qui se faufile).

const SRC = {
  peek: "/clovis/clovis-bord.png",
  wave: "/clovis/clovis-coucou.png",
  dance: "/clovis/clovis-bond.png",
};
const SIZE = {
  peek: [420, 299],
  wave: [410, 420],
  dance: [420, 305],
};

export default function Clovis({ pose = "peek", at = "top-right", className = "" }) {
  const [w, h] = SIZE[pose] || SIZE.peek;
  return (
    <span className={`clovis clovis-${pose} clovis-${at} ${className}`} aria-hidden="true">
      <span className="clovis-inner">
        <img className="clovis-img" src={SRC[pose] || SRC.peek} width={w} height={h} alt="" decoding="async" draggable="false" />
      </span>
    </span>
  );
}

// Hauteur (px) que Clovis occupe au-dessus / au-dessous de la bulle : sert à
// garder la bulle assez loin des bords de l'écran.
export const CLOVIS_ROOM = { peek: 44, wave: 84, dance: 84 };
