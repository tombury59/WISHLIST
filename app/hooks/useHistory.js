import { useRef, useState } from "react";
import { getHistory } from "../lib/wishes-api";

// Activité de la famille (dernières actions), chargée À LA DEMANDE.
//
// Base limitée en requêtes : on ne recharge pas si les données ont moins d'une
// minute (aller-retour entre rubriques = 0 requête). `load(true)` force.
const FRESH_MS = 60000;

export function useHistory(pin) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const loadedAt = useRef(0);

  async function load(force = false) {
    if (!force && loadedAt.current && Date.now() - loadedAt.current < FRESH_MS) return;
    setLoading(true);
    try {
      const data = await getHistory(pin);
      setItems(data.history || []);
      loadedAt.current = Date.now();
    } catch {
      /* hors ligne : on garde ce qu'on a */
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setItems([]);
    loadedAt.current = 0;
  }

  return { items, loading, load, reset };
}
