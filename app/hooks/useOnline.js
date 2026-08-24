import { useEffect, useState } from "react";

// État réseau (en ligne / hors ligne), tenu à jour par les événements du
// navigateur. Initialisé à `true` pour éviter un écart au rendu serveur ;
// l'effet corrige immédiatement au montage.
export function useOnline() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}
