// Utilidades matemáticas del lado cliente — espejo de la lógica del backend
// Usadas para feedback inmediato en UI sin esperar respuesta de la API

export function areaCubierta(radioKm) {
  return Math.PI * radioKm * radioKm;
}

export function distanciaEscape(velKmh, tMin) {
  return velKmh * (tMin / 60);
}

export function formatNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString("es-AR");
}

export function formatArea(km2) {
  if (km2 >= 1_000_000) return `${(km2 / 1_000_000).toFixed(2)}M km²`;
  if (km2 >= 1_000)     return `${(km2 / 1_000).toFixed(2)}k km²`;
  return `${km2.toFixed(2)} km²`;
}

export function formatTiempo(seg) {
  if (seg < 60) return `${seg.toFixed(1)} seg`;
  if (seg < 3600) return `${(seg / 60).toFixed(1)} min`;
  return `${(seg / 3600).toFixed(2)} hs`;
}

export function colorCobertura(pct) {
  if (pct >= 85) return "text-emerald-400";
  if (pct >= 60) return "text-amber-400";
  return "text-red-400";
}

export function bgCobertura(pct) {
  if (pct >= 85) return "bg-emerald-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-red-500";
}

export function radioMaxProvincia(superficie) {
  return Math.sqrt(superficie / Math.PI);
}

export function formatTiempoExtendido(totalMin) {
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export { fmtKm, fmtKm2, fmtNum as fmtNumFmt, fmtSeg, fmtHoras } from './Formatter.js';
