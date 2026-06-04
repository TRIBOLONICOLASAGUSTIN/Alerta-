import { useState, useCallback } from "react";

const API = "/api";

export function useSimulacion() {
  const [resultado, setResultado] = useState(null);
  const [comparacion, setComparacion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const simular = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/simular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setResultado(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const comparar = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/comparar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setComparacion(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { resultado, comparacion, loading, error, simular, comparar };
}
