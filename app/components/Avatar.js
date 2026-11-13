import { avatarColor } from "../lib/format";

// Pastille d'un membre : initiale sur sa couleur. `size` = sm | md | lg | xl.
export default function Avatar({ name, size = "md", color, className = "" }) {
  return (
    <span
      className={`avatar avatar-${size} ${className}`}
      style={{ background: color || avatarColor(name) }}
      aria-hidden="true"
    >
      {name?.[0] || "?"}
    </span>
  );
}
