import { useState } from "react";
import { getHistory } from "../lib/wishes-api";

// Modale « Historique » : ouverture + chargement à la demande des dernières
// actions de la famille.
export function useHistory(pin) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  async function openHistory() {
    setOpen(true);
    setLoading(true);
    try {
      const data = await getHistory(pin);
      setItems(data.history || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
  }

  return { open, items, loading, openHistory, close };
}
