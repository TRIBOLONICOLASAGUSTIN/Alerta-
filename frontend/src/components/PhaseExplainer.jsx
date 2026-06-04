import { formatNum } from "../utils/calculos";

const FASES_INFO = [
  {
    idx:         0,
    titulo:      "FASE 1 — Activación Local",
    badge:       "F1",
    colorBg:     "bg-cyan-500/[0.06]",
    colorBorder: "border-cyan-500/30",
    colorText:   "text-cyan-400",
    colorDot:    "bg-cyan-500",
    colorNum:    "text-cyan-400",
    operativo:   "Activación de celdas en la zona epicentro. El radio de alerta cubre el área inmediata al último punto de localización registrado.",
    tecnico:     "CBE WRITE-REPLACE enviado a los CBC de las operadoras (Claro, Personal, Movistar). Cobertura concentrada en antenas del área local. Latencia fija: 3.22 seg.",
  },
  {
    idx:         1,
    titulo:      "FASE 2 — Ampliación Regional",
    badge:       "F2",
    colorBg:     "bg-amber-500/[0.06]",
    colorBorder: "border-amber-500/30",
    colorText:   "text-amber-400",
    colorDot:    "bg-amber-500",
    colorNum:    "text-amber-400",
    operativo:   "Integración masiva de celdas. La alerta se extiende a rutas provinciales, peajes y áreas aledañas. Radio expandido agresivamente para superar la distancia de escape.",
    tecnico:     "CBC actualiza todas las antenas en radio regional (≥ 500 km). Cola de mensajes SMS unicast en crecimiento masivo. Geovallado estratégico al 10% de densidad.",
  },
  {
    idx:         2,
    titulo:      "FASE 3 — Alerta Provincial/Nacional",
    badge:       "F3",
    colorBg:     "bg-rose-500/[0.06]",
    colorBorder: "border-rose-500/30",
    colorText:   "text-rose-400",
    colorDot:    "bg-rose-500",
    colorNum:    "text-rose-400",
    operativo:   "Activación del sistema provincial SIFEBU al máximo. R_alerta alcanza el tope del límite territorial. 100% de dispositivos compatibles en la provincia notificados.",
    tecnico:     "Broadcast simultáneo a toda la red celular provincial (radio capeado al equivalente circular de la provincia). Dispositivos = maxCompatibles. Cobertura 100%.",
  },
  {
    idx:         3,
    titulo:      "FALLA — Prófugo Interjurisdiccional",
    badge:       "F!",
    colorBg:     "bg-red-950/40",
    colorBorder: "border-red-500/60",
    colorText:   "text-red-400",
    colorDot:    "bg-red-500",
    colorNum:    "text-red-400",
    operativo:   "PROTOCOLO VULNERADO. El tiempo transcurrido fue suficiente para que el sujeto escape del límite territorial provincial. La red Unicast argentina no puede emitir alerta interprovincial sin colapsar.",
    tecnico:     "D_escape superó R_max_prov. R_alerta bloqueado en el límite provincial (irrompible). La tecnología Unicast queda ineficaz. Se requiere coordinación nacional fuera del sistema.",
  },
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-5 h-5 text-emerald-400 shrink-0" stroke="currentColor" strokeWidth="2">
      <path d="M3 8.5L6.5 12 13 5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function AlertIcon({ breach = false }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={`w-5 h-5 shrink-0 ${breach ? "text-red-500" : "text-rose-500"}`} stroke="currentColor" strokeWidth="2">
      <path d="M8 3v5M8 11v1" strokeLinecap="round"/>
      <circle cx="8" cy="8" r="7"/>
    </svg>
  );
}

function FaseTimeline({ faseActualIdx, escenario, profugoInterjurisdiccional }) {
  const fases = escenario?.fases ?? [];
  return (
    <div className="flex flex-col gap-0">
      {FASES_INFO.map((f, i) => {
        const esFalla = profugoInterjurisdiccional && f.idx === 3;
        const activa  = profugoInterjurisdiccional ? esFalla : (i === faseActualIdx);
        const pasada  = profugoInterjurisdiccional ? (f.idx !== 3) : (i < faseActualIdx);
        const faseData = fases[i];
        return (
          <div key={f.idx} className="flex gap-3">
            <div className="flex flex-col items-center w-6 shrink-0">
              <div
                className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all duration-500 ${
                  activa
                    ? `${f.colorDot} border-white/20 shadow-lg`
                    : pasada
                    ? "bg-slate-700 border-slate-600"
                    : "bg-transparent border-slate-800"
                }`}
              >
                <span className={`text-[7px] font-bold ${activa ? "text-white" : "text-slate-600"}`}>
                  {i < 3 ? i + 1 : "!"}
                </span>
              </div>
              {i < FASES_INFO.length - 1 && (
                <div className={`w-0.5 flex-1 min-h-[28px] ${pasada || activa ? "bg-slate-700" : "bg-slate-800/60"}`} />
              )}
            </div>
            <div className={`pb-4 flex-1 min-w-0 transition-opacity duration-300 ${activa ? "opacity-100" : "opacity-40"}`}>
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${activa ? f.colorText : "text-slate-600"}`}>
                  {f.titulo}
                </span>
                {activa && (
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${f.colorBg} ${f.colorText} border ${f.colorBorder} font-bold uppercase tracking-wider`}>
                    {esFalla ? "FALLA" : "ACTIVA"}
                  </span>
                )}
              </div>
              {faseData && f.idx < 3 ? (
                <p className="text-[10px] text-slate-700 font-mono">
                  t ≥ {faseData.tInicio < 60 ? `${faseData.tInicio} min` : `${faseData.tInicio / 60} h`}
                  {" · "}R = {faseData.radio >= 1000 ? `${(faseData.radio / 1000).toFixed(0)}k` : faseData.radio} km
                </p>
              ) : f.idx === 3 ? (
                <p className="text-[10px] text-slate-700 font-mono">D_escape &gt; R_max_prov</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PhaseExplainer({ resultado }) {
  if (!resultado) return null;

  const {
    escenario, tMin, tiempoTotal,
    radioEfectivo, dispositivos, contiene, maxCompatibles,
    faseIdx = 0, factorGeo = 1.0,
    profugoInterjurisdiccional = false,
    capProvincia = 0, dEscape = 0,
  } = resultado;

  const info   = profugoInterjurisdiccional ? FASES_INFO[3] : (FASES_INFO[faseIdx] ?? FASES_INFO[0]);
  const maxComp = resultado.maxCompatiblesTotal ?? maxCompatibles;
  const pctCompatibles = maxComp > 0 ? Math.min(100, (dispositivos / maxComp) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">

      {/* ── Notificación de fase activa ────────────────────── */}
      <div className={`card ${info.colorBg} border-2 ${info.colorBorder} transition-all duration-500 ${
        profugoInterjurisdiccional ? "breach-banner" : ""
      }`}>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] ${info.colorText} bg-slate-950/50 border ${info.colorBorder} rounded-full px-2 py-0.5`}>
            <span className={`w-1.5 h-1.5 rounded-full ${info.colorDot} ${profugoInterjurisdiccional ? "animate-ping" : "animate-pulse"}`} />
            [SISTEMA] {info.badge}
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${info.colorText}`}>
            {info.titulo}
          </span>
        </div>

        <p className="text-[12px] text-slate-300 leading-relaxed mb-3">
          {info.operativo}
        </p>

        <div className="bg-white/[0.03] rounded-xl px-3 py-2 border border-white/[0.06]">
          <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-1 font-bold">Detalle técnico</p>
          <p className="text-[11px] text-slate-500 leading-relaxed font-mono">
            {info.tecnico}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-white/[0.03] rounded-xl px-3 py-2 border border-white/[0.06]">
            <p className="text-[9px] text-slate-600 uppercase tracking-wider font-bold mb-0.5">Radio activo</p>
            <p className={`font-mono font-bold text-sm tracking-tight ${info.colorNum}`}>
              {radioEfectivo.toFixed(2)} km
            </p>
            {profugoInterjurisdiccional && (
              <p className="text-[8px] text-red-600 font-mono mt-0.5">BLOQUEADO — límite prov.</p>
            )}
          </div>
          <div className="bg-white/[0.03] rounded-xl px-3 py-2 border border-white/[0.06]">
            <p className="text-[9px] text-slate-600 uppercase tracking-wider font-bold mb-0.5">Notificados</p>
            <p className={`font-mono font-bold text-sm tracking-tight ${info.colorNum}`}>
              {formatNum(dispositivos)}
            </p>
          </div>
        </div>

        {profugoInterjurisdiccional && (
          <div className="mt-3 flex items-start gap-2.5 bg-red-500/[0.08] border border-red-500/30 rounded-xl px-3 py-2.5">
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-red-400 shrink-0 mt-0.5" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z" />
            </svg>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-red-400 mb-0.5">
                Capacidad Unicast excedida
              </p>
              <p className="text-[11px] text-slate-400 leading-snug font-mono">
                D_escape = {dEscape.toFixed(1)} km · R_max_prov = {capProvincia.toFixed(1)} km
              </p>
              <p className="text-[10px] text-red-500/70 mt-1 leading-snug">
                El sujeto abandonó la jurisdicción. La red Unicast colapsaría si se intenta cubrir otras provincias.
              </p>
            </div>
          </div>
        )}

        {!profugoInterjurisdiccional && faseIdx >= 1 && (
          <div className="mt-3 flex items-start gap-2.5 bg-amber-500/[0.06] border border-amber-500/20 rounded-xl px-3 py-2.5">
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 2C6.686 2 4 4.686 4 8c0 4.5 6 10 6 10s6-5.5 6-10c0-3.314-2.686-6-6-6z" strokeLinejoin="round"/>
              <circle cx="10" cy="8" r="2"/>
            </svg>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400 mb-0.5">
                Estrategia de Difusión
              </p>
              <p className="text-[11px] text-slate-400 leading-snug">
                Geovallado Estratégico — Rutas / Peajes / Fronteras
                {" · "}Factor de densidad: {(factorGeo * 100).toFixed(0)}% de la población del área
              </p>
            </div>
          </div>
        )}

        {maxComp > 0 && (
          <div className="mt-2.5">
            <div className="flex justify-between text-[9px] mb-1">
              <span className="text-slate-600 uppercase tracking-wider font-bold">Cobertura compatibles</span>
              <span className={`${info.colorText} font-mono font-bold`}>{pctCompatibles.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  profugoInterjurisdiccional
                    ? "bg-red-500 animate-pulse"
                    : pctCompatibles >= 95 ? "bg-emerald-500" : pctCompatibles >= 60 ? info.colorDot : "bg-rose-500"
                }`}
                style={{ width: `${pctCompatibles}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Línea de tiempo operativa ──────────────────────── */}
      <div className="card">
        <p className="card-header">Línea de tiempo operativa</p>
        <FaseTimeline
          faseActualIdx={faseIdx}
          escenario={escenario}
          profugoInterjurisdiccional={profugoInterjurisdiccional}
        />
      </div>

      {/* ── Estado de contención ───────────────────────────── */}
      <div className={`card border transition-all duration-500 ${
        profugoInterjurisdiccional
          ? "border-red-500/50 bg-red-950/30"
          : contiene
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-rose-500/30 bg-rose-500/5"
      }`}>
        <div className="flex items-start gap-3">
          {contiene && !profugoInterjurisdiccional ? <CheckIcon /> : <AlertIcon breach={profugoInterjurisdiccional} />}
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${
              profugoInterjurisdiccional ? "text-red-400" : (contiene ? "text-emerald-400" : "text-rose-500")
            }`}>
              {profugoInterjurisdiccional
                ? "Contención: Imposible — Protocolo Vulnerado"
                : (contiene ? "Contención: Asegurada" : "Contención: Vulnerada")}
            </p>
            <p className="text-[10px] text-slate-600 leading-snug">
              {profugoInterjurisdiccional
                ? "D_escape > R_max_prov — el sujeto abandonó la jurisdicción provincial. El tiempo transcurrido volvió la tecnología Unicast ineficaz."
                : contiene
                ? "R_alerta ≥ D_escape — el perímetro de alerta supera la distancia de desplazamiento del sujeto."
                : "D_escape > R_alerta — el sujeto puede haber traspasado el perímetro de contención activo."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
