import { Phone, ExternalLink } from "lucide-react";

const EXPEDIENTE_NUM = "N° 2024-00312-CBA";
const CONTACTO       = "134 — SIFEBU";
const ESTADO         = "BÚSQUEDA ACTIVA";

function FotoRectangular({ nombre }) {
  const iniciales = (nombre || "?")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-24 h-24 bg-slate-800 rounded border border-slate-600 flex-shrink-0 flex flex-col items-center justify-center overflow-hidden">
      <span className="text-2xl font-bold text-slate-500 leading-none select-none">{iniciales}</span>
      <span className="text-[8px] font-mono text-slate-700 mt-1 uppercase tracking-widest">foto</span>
    </div>
  );
}

export default function MissingPersonCard({ datosVictima }) {
  const {
    nombre         = "—",
    edad           = "—",
    sexo           = "—",
    ultimaVezVista = "—",
    vestimenta     = "—",
    ubicacion      = "—",
  } = datosVictima ?? {};

  return (
    <div className="card !p-4 flex flex-col gap-0">

      {/* ── Expediente + estado ─────────────────────────────── */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-700/40">
        <p className="text-[9px] font-mono text-slate-600 tracking-wider">{EXPEDIENTE_NUM}</p>
        <span className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">{ESTADO}</span>
        </span>
      </div>

      {/* ── Foto rectangular + datos ────────────────────────── */}
      <div className="flex items-start gap-3 pb-3 border-b border-slate-700/40">
        <FotoRectangular nombre={nombre} />
        <div className="flex flex-col flex-1 min-w-0">
          <p className="text-[10px] uppercase text-slate-500 tracking-widest mb-0.5">Nombre</p>
          <p className="text-sm font-bold text-slate-100 leading-tight break-words">{nombre}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="bg-slate-800 text-slate-300 text-xs font-semibold px-2 py-1 rounded-md border border-slate-700 font-mono">
              {edad} años
            </span>
            <span className="bg-slate-800 text-slate-300 text-xs font-semibold px-2 py-1 rounded-md border border-slate-700">
              {sexo}
            </span>
          </div>
        </div>
      </div>

      {/* ── Campos del caso ─────────────────────────────────── */}
      <div className="flex flex-col divide-y divide-slate-700/30">
        <div className="py-2.5">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">Último avistamiento</p>
          <span className="font-mono text-slate-300 text-xs">{ultimaVezVista}</span>
        </div>
        <div className="py-2.5">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">Vestimenta / Señas</p>
          <span className="text-slate-400 text-xs leading-relaxed">{vestimenta}</span>
        </div>
        <div className="py-2.5">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">Ubicación de referencia</p>
          <span className="text-slate-300 text-xs leading-snug">{ubicacion}</span>
        </div>
      </div>

      {/* ── Contacto ────────────────────────────────────────── */}
      <div className="pt-3 mt-0.5 border-t border-slate-700/40 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Phone size={13} className="text-cyan-400/60 shrink-0" />
          <span className="text-sm font-bold text-cyan-400 font-mono tracking-tight">{CONTACTO}</span>
        </div>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="flex items-center justify-center gap-1.5 bg-transparent hover:bg-white/[0.04] border border-slate-700/50 hover:border-slate-600/60 text-slate-400 hover:text-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-all duration-200"
        >
          <ExternalLink size={12} />
          Ver Circular Oficial
        </a>
      </div>

      <p className="text-center text-[9px] text-slate-800 uppercase tracking-widest font-mono mt-3 pt-3 border-t border-slate-700/30">
        Sistema AlertAR · SIFEBU · Unicast SMSC
      </p>
    </div>
  );
}
