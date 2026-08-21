import { useEffect, useState } from "react";
import { MOBILE_QUERY } from "../lib/constants";

// « Petit écran ? » — suit le breakpoint CSS pour décider où afficher les
// commentaires (panneau latéral desktop vs modale/dessous mobile).
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}
