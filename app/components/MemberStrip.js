"use client";

import { useEffect, useRef } from "react";
import { MEMBERS } from "../lib/members";
import Avatar from "./Avatar";

// Bandeau horizontal des membres (téléphone / tablette) : « Moi » en premier,
// puis la famille. Le membre sélectionné est ramené dans la zone visible.
export default function MemberStrip({ me, active, counts, onSelect }) {
  const order = [me, ...MEMBERS.filter((m) => m !== me)];
  const activeRef = useRef(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [active]);

  return (
    <nav className="strip" aria-label="Listes de la famille" data-tour="family">
      {order.map((m) => (
        <button
          key={m}
          ref={m === active ? activeRef : null}
          className={"strip-item" + (m === active ? " is-active" : "")}
          onClick={() => onSelect(m)}
          aria-current={m === active ? "true" : undefined}
        >
          <span className="strip-avatar">
            <Avatar name={m} size="lg" />
            {counts[m] > 0 && <span className="strip-count">{counts[m]}</span>}
          </span>
          <span className="strip-name">{m === me ? "Moi" : m}</span>
        </button>
      ))}
    </nav>
  );
}
