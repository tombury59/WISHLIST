import { avatarColor } from "../lib/format";
import { linkHref, tokenize } from "../lib/richtext";

// Texte avec liens cliquables et @prénoms colorés (commentaires…).
// `onMention(prénom)` : ouvre la liste de la personne.
export default function RichText({ text, onMention, className = "" }) {
  return (
    <span className={className}>
      {tokenize(text).map((p, i) =>
        typeof p === "string" ? (
          p
        ) : p.url ? (
          <a
            key={i}
            href={linkHref(p.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="note-link"
          >
            {p.url}
          </a>
        ) : p.name ? (
          <button
            key={i}
            type="button"
            className="mention"
            style={{ "--c": avatarColor(p.name) }}
            onClick={() => onMention?.(p.name)}
            title={`Ouvrir la liste de ${p.name}`}
          >
            @{p.name}
          </button>
        ) : (
          // Pas de #souhait dans les commentaires : texte simple.
          `#${p.wish}`
        )
      )}
    </span>
  );
}
