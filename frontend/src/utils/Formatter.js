const FMT_NUM  = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const FMT_DEC2 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function guard(n) { return n == null || !isFinite(Number(n)); }

export function fmtKm(n) {
  if (guard(n)) return "—";
  return FMT_DEC2.format(Number(n)) + " km";
}

export function fmtKm2(n) {
  if (guard(n)) return "—";
  return FMT_DEC2.format(Number(n)) + " km²";
}

export function fmtNum(n) {
  if (guard(n)) return "—";
  return FMT_NUM.format(Math.round(Number(n)));
}

export function fmtSeg(n) {
  if (guard(n)) return "—";
  const v = Number(n);
  if (v < 60)   return FMT_DEC2.format(v)        + " seg";
  if (v < 3600) return FMT_DEC2.format(v / 60)   + " min";
  return              FMT_DEC2.format(v / 3600)   + " hs";
}

export function fmtHoras(h) {
  if (guard(h)) return "—";
  const v    = Number(h);
  const hrs  = Math.floor(v);
  const mins = Math.round((v - hrs) * 60);
  return mins === 0
    ? `${hrs} h`
    : `${hrs} h ${String(mins).padStart(2, "0")} min`;
}
