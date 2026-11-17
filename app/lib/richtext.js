// Reconnaissance des éléments « vivants » dans un texte libre (notes,
// commentaires) : liens, @prénoms et #souhaits. Tout se fait à l'affichage,
// dans le navigateur : aucune requête.
import { MEMBERS } from "./members";

export const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Comparaison sans accents ni majuscules (« @be » propose Béné et Betty).
export const norm = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Fin de mot : pas suivi d'une lettre ou d'un chiffre (« @Tomate » n'est pas Tom).
const END = String.raw`(?![\p{L}\p{N}])`;

// Lien : commence par http(s):// ou www., s'arrête au premier espace ; la
// ponctuation finale (point, virgule, parenthèse…) n'en fait pas partie.
const URL_SRC = String.raw`(?:https?:\/\/|www\.)[^\s<>"]*[^\s<>".,;:!?)\]}'»]`;
const MEMBER_SRC = `@(${MEMBERS.map(escapeRe).join("|")})${END}`;

// Noms de souhaits, du plus long au plus court (« Puzzle 1000 pièces » avant
// « Puzzle »).
function wishAlternation(wishNames) {
  return [...new Set(wishNames.filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
    .join("|");
}

// Expression qui reconnaît tout : groupe 1 = lien, 2 = prénom, 3 = souhait.
export function buildTokenRe(wishNames = []) {
  const wishes = wishAlternation(wishNames);
  const wishSrc = wishes ? `|#(${wishes})${END}` : "";
  return new RegExp(`(${URL_SRC})|${MEMBER_SRC}${wishSrc}`, "gu");
}

// Mention complète juste avant le curseur (pour l'effacer d'un coup).
export function buildEndRe(wishNames = []) {
  const wishes = wishAlternation(wishNames);
  const wishSrc = wishes ? `|#(?:${wishes})` : "";
  return new RegExp(`(?:@(?:${MEMBERS.map(escapeRe).join("|")})${wishSrc})$`, "u");
}

const DEFAULT_RE = buildTokenRe();

// Texte -> morceaux : texte brut, { url }, { name } ou { wish }.
export function tokenize(text, re = DEFAULT_RE) {
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push({ url: m[1] });
    else if (m[2]) parts.push({ name: m[2] });
    else parts.push({ wish: m[3] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// Ce qui est en cours de frappe juste avant le curseur :
//   « @pré »  -> { kind: "@", start, query }
//   « #puz »  -> { kind: "#", start, query } (espaces permis : « #puzzle 10 »)
export function typingQuery(text, caret, { wishes = false } = {}) {
  const before = text.slice(0, caret);
  let m = before.match(/(^|\s)@([\p{L}]{0,12})$/u);
  if (m) return { kind: "@", start: caret - m[2].length - 1, query: m[2] };
  if (wishes) {
    m = before.match(/(^|\s)#([^\n#@]{0,40})$/u);
    if (m) return { kind: "#", start: caret - m[2].length - 1, query: m[2] };
  }
  return null;
}

// Membres qui commencent par la saisie.
export function matchMembers(query) {
  const q = norm(query);
  return MEMBERS.filter((n) => norm(n).startsWith(q));
}

// Souhaits qui contiennent la saisie (ceux qui commencent par elle d'abord).
export function matchWishes(wishes, query, limit = 8) {
  const q = norm(query.trim());
  const scored = [];
  for (const w of wishes) {
    const n = norm(w.name);
    const i = n.indexOf(q);
    if (i === -1) continue;
    scored.push([i === 0 ? 0 : 1, w]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name, "fr"));
  return scored.slice(0, limit).map((s) => s[1]);
}

// Lien affichable -> adresse complète.
export const linkHref = (url) => (/^https?:\/\//i.test(url) ? url : "https://" + url);
