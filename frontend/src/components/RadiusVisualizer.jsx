import { motion } from "framer-motion";
import { formatNum, formatTiempoExtendido } from "../utils/calculos";
import { fmtKm, fmtNum } from "../utils/Formatter";

const SMSC_RATE = 1000;

// ── SVG con viewBox en coordenadas km ───────────────────────────────────────
function RadarSVG({
  radioEfectivo, dEscape, escenario, contiene,
  radioMaxProvincia, profugoInterjurisdiccional,
}) {
  const maxKm = Math.max(radioEfectivo, dEscape, radioMaxProvincia || 0, 1);
  const pad   = maxKm * 1.30;

  const ts    = pad * 0.030;
  const tsBig = pad * 0.038;

  const refRings = [0.33, 0.66, 1.0].map((f) => ({
    r: pad * f * (1 / 1.30),
    km: (maxKm * f).toFixed(0),
  }));

  const fases = escenario?.fases || [];

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${pad * 2} ${pad * 2}`}
      className="w-full h-full"
      style={{ maxHeight: "100%" }}
      aria-label="Radar AlertAR — 360°"
    >
      <defs>
        <radialGradient id="alertFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#f59e0b" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
        </radialGradient>
        <radialGradient id="escapeFillBreach" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ef4444" stopOpacity="0.00" />
          <stop offset="70%"  stopColor="#ef4444" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.12" />
        </radialGradient>
        <filter id="glow-amber" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={pad * 0.012} result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow-escape" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={pad * 0.008} result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow-prov" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={pad * 0.005} result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <rect x={-pad} y={-pad} width={pad * 2} height={pad * 2} fill="#060f1e" />

      {profugoInterjurisdiccional && (
        <rect
          x={-pad} y={-pad} width={pad * 2} height={pad * 2}
          fill="rgba(239,68,68,0.05)"
          className="radar-breach-overlay"
        />
      )}

      <line x1={0} y1={-pad} x2={0} y2={pad} stroke="#0b1f30" strokeWidth={pad * 0.002} />
      <line x1={-pad} y1={0} x2={pad} y2={0} stroke="#0b1f30" strokeWidth={pad * 0.002} />

      {refRings.map(({ r, km }) => (
        <g key={km}>
          <circle cx={0} cy={0} r={r}
            fill="none" stroke="#0e2640" strokeWidth={pad * 0.0015}
            strokeDasharray={`${r * 0.04} ${r * 0.12}`} />
          <text x={pad * 0.02} y={-r + ts}
            fill="#1a4a65" fontSize={ts} fontFamily="monospace">{km} km</text>
        </g>
      ))}

      {[
        ["N", 0,    -pad * 0.94],
        ["S", 0,     pad * 0.97],
        ["E", pad * 0.97, 0],
        ["O",-pad * 0.97, ts * 0.4],
      ].map(([l, x, y]) => (
        <text key={l} x={x} y={y} textAnchor="middle"
          fill="#0e3a4e" fontSize={ts * 0.9} fontFamily="monospace" fontWeight="bold">{l}</text>
      ))}

      {fases.map((fase) => {
        const rf = Math.min(fase.radio, pad);
        return rf > 1 ? (
          <circle key={fase.tInicio} cx={0} cy={0} r={rf}
            fill="none" stroke={fase.color} strokeWidth={pad * 0.002}
            strokeOpacity="0.20" strokeDasharray={`${rf * 0.04} ${rf * 0.09}`} />
        ) : null;
      })}

      {radioMaxProvincia > 0 && (
        <>
          <circle cx={0} cy={0} r={Math.min(radioMaxProvincia, pad * 0.98)}
            fill="rgba(148,163,184,0.03)" stroke="none" />
          <circle cx={0} cy={0} r={Math.min(radioMaxProvincia, pad * 0.98)}
            fill="none"
            stroke={profugoInterjurisdiccional ? "#ef4444" : "#94a3b8"}
            strokeWidth={profugoInterjurisdiccional ? pad * 0.004 : pad * 0.003}
            strokeDasharray={profugoInterjurisdiccional ? "none" : `${radioMaxProvincia * 0.04} ${radioMaxProvincia * 0.08}`}
            strokeOpacity={profugoInterjurisdiccional ? "0.70" : "0.45"}
            filter="url(#glow-prov)"
          />
          <text
            x={radioMaxProvincia * 0.68}
            y={-radioMaxProvincia * 0.68}
            fill={profugoInterjurisdiccional ? "#f87171" : "#64748b"}
            fontSize={ts} fontFamily="monospace"
          >
            {radioMaxProvincia.toFixed(0)} km — límite prov.
          </text>
        </>
      )}

      {dEscape > 0 && (
        <>
          {profugoInterjurisdiccional && (
            <circle cx={0} cy={0} r={Math.min(dEscape, pad * 0.98)}
              fill="url(#escapeFillBreach)" stroke="none" />
          )}
          <circle cx={0} cy={0} r={Math.min(dEscape, pad * 0.98)}
            stroke="#ef4444"
            strokeWidth={pad * (profugoInterjurisdiccional ? 0.005 : 0.004)}
            strokeDasharray={`${dEscape * 0.05} ${dEscape * 0.08}`}
            fill="none"
            strokeOpacity={profugoInterjurisdiccional ? "1.0" : "0.80"}
            filter="url(#glow-escape)"
          />
          {dEscape > pad * 0.90 && profugoInterjurisdiccional && (
            <text x={0} y={pad * 0.80} textAnchor="middle"
              fill="#ef4444" fontSize={ts} fontFamily="monospace" fontWeight="bold">
              D_escape continúa →→→
            </text>
          )}
        </>
      )}

      {radioEfectivo > 0 && (
        <motion.circle
          cx={0} cy={0} r={Math.min(radioEfectivo, pad * 0.98)}
          fill="url(#alertFill)"
          stroke={profugoInterjurisdiccional ? "#94a3b8" : "#f59e0b"}
          strokeWidth={pad * (profugoInterjurisdiccional ? 0.004 : 0.006)}
          strokeDasharray={profugoInterjurisdiccional ? `${radioEfectivo * 0.04} ${radioEfectivo * 0.08}` : "none"}
          filter={profugoInterjurisdiccional ? undefined : "url(#glow-amber)"}
          animate={profugoInterjurisdiccional
            ? { opacity: [0.4, 0.7, 0.4] }
            : { opacity: [0.85, 1, 0.85] }}
          transition={{ duration: profugoInterjurisdiccional ? 1.2 : 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {!profugoInterjurisdiccional && radioEfectivo > 0 && (
        <>
          <circle cx={0} cy={0} fill="none" stroke="#f59e0b" strokeWidth={pad * 0.004}>
            <animate attributeName="r" from={pad * 0.01} to={radioEfectivo} dur="3.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.85;0.20;0" dur="3.4s" repeatCount="indefinite" />
          </circle>
          <circle cx={0} cy={0} fill="none" stroke="#f59e0b" strokeWidth={pad * 0.003}>
            <animate attributeName="r" from={pad * 0.01} to={radioEfectivo} dur="3.4s" begin="1.13s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.70;0.12;0" dur="3.4s" begin="1.13s" repeatCount="indefinite" />
          </circle>
        </>
      )}

      {profugoInterjurisdiccional && (
        <>
          <circle cx={0} cy={0} fill="none" stroke="#ef4444" strokeWidth={pad * 0.004}>
            <animate attributeName="r" from={pad * 0.01} to={Math.min(radioEfectivo, pad * 0.97)} dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.90;0.30;0" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx={0} cy={0} fill="none" stroke="#ef4444" strokeWidth={pad * 0.002}>
            <animate attributeName="r" from={pad * 0.01} to={Math.min(radioEfectivo, pad * 0.97)} dur="1.8s" begin="0.9s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.60;0.10;0" dur="1.8s" begin="0.9s" repeatCount="indefinite" />
          </circle>
        </>
      )}

      <circle cx={0} cy={0} r={pad * 0.028} fill="rgba(239,68,68,0.15)" />
      <circle cx={0} cy={0} r={pad * 0.014} fill="#ef4444" />
      <circle cx={0} cy={0} r={pad * 0.005} fill="white" />

      {radioEfectivo > maxKm * 0.05 && (
        <text
          x={radioEfectivo * 0.55}
          y={-radioEfectivo * 0.50}
          fill={profugoInterjurisdiccional ? "#94a3b8" : "#f59e0b"}
          fontSize={ts} fontFamily="monospace" fillOpacity="0.90">
          R: {radioEfectivo.toFixed(1)} km
        </text>
      )}

      {dEscape > maxKm * 0.05 && (
        <text
          x={Math.min(dEscape, pad * 0.85) * 0.40}
          y={Math.min(dEscape, pad * 0.85) * 0.60}
          fill="#ef4444" fontSize={ts} fontFamily="monospace" fillOpacity="0.90">
          D: {dEscape.toFixed(1)} km
        </text>
      )}

      <g transform={`translate(0, ${pad * 0.92})`}>
        <rect x={-pad * 0.38} y={-tsBig * 0.9} width={pad * 0.76} height={tsBig * 1.8} rx={tsBig * 0.9}
          fill={profugoInterjurisdiccional ? "#2d0606ee" : (contiene ? "#061f12ee" : "#1c0608ee")}
          stroke={profugoInterjurisdiccional ? "#ef4444" : (contiene ? "#34d399" : "#f43f5e")}
          strokeWidth={pad * 0.002} />
        <text y={tsBig * 0.38} textAnchor="middle"
          fill={profugoInterjurisdiccional ? "#f87171" : (contiene ? "#34d399" : "#f43f5e")}
          fontSize={ts * 0.85} fontFamily="monospace" fontWeight="bold" letterSpacing="0.4">
          {profugoInterjurisdiccional
            ? "✗ PRÓFUGO INTERJURISDICCIONAL"
            : (contiene ? "✓ ALERTA CONTIENE" : "✗ ESCAPE POSIBLE")}
        </text>
      </g>
    </svg>
  );
}

function TelCard({ title, status, children }) {
  const styles = {
    ok:      "border-emerald-500/30 bg-emerald-500/5",
    danger:  "border-red-500/30     bg-red-500/5",
    warn:    "border-amber-500/30   bg-amber-500/5",
    info:    "border-cyan-500/25    bg-cyan-500/5",
    breach:  "border-red-500/50     bg-red-950/30",
    neutral: "border-white/[0.08]   bg-white/[0.03]",
  };
  return (
    <div className={`rounded-2xl border p-3 transition-all duration-500 ${styles[status] || styles.neutral}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{title}</p>
      {children}
    </div>
  );
}

function ProgressBar({ pct, colorClass }) {
  return (
    <div className="h-1.5 bg-slate-700/80 rounded-full overflow-hidden my-1.5">
      <div
        className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
      />
    </div>
  );
}

export default function RadiusVisualizer({ resultado }) {
  if (!resultado) return null;

  const {
    radioEfectivo, radioMaxProvincia, dEscape,
    escenario, contiene, tMin, tiempoTotal,
    dispositivos, dispositivosTotal = dispositivos,
    dispositivosUnicast = dispositivos,
    provincia,
    modoGeovallado = "NORMAL",
    pctDescarte = 0,
    profugoInterjurisdiccional = false,
  } = resultado;

  const tDisplay = tiempoTotal ?? tMin ?? 0;

  const tSeg             = tDisplay * 60;
  const mensajesEnviados = Math.min(dispositivos, Math.floor(tSeg * SMSC_RATE));
  const colaRestante     = Math.max(0, dispositivos - mensajesEnviados);
  const pctEntregado     = dispositivos > 0 ? (mensajesEnviados / dispositivos) * 100 : 100;

  const latenciaSMSC = dispositivos / SMSC_RATE;

  const pctPoblacion = provincia.poblacion > 0
    ? (dispositivosUnicast / provincia.poblacion) * 100
    : 0;

  function formatTiempo(seg) {
    if (seg < 60)   return `${seg.toFixed(0)} seg`;
    if (seg < 3600) return `${(seg / 60).toFixed(1)} min`;
    const h = Math.floor(seg / 3600);
    const m = Math.floor((seg % 3600) / 60);
    return m > 0 ? `${h} h ${String(m).padStart(2, "0")} min` : `${h} h`;
  }

  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-2 h-2 shrink-0">
            <div className={`absolute inset-0 rounded-full ${profugoInterjurisdiccional ? "bg-red-500" : "bg-amber-500"} animate-ping opacity-40`} />
            <div className={`relative w-2 h-2 rounded-full ${profugoInterjurisdiccional ? "bg-red-500" : "bg-amber-500"}`} />
          </div>
          <span className="text-sm font-bold uppercase tracking-widest text-slate-200">Centro de Comando</span>
          <span className="text-xs font-mono text-amber-400/70 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md">AlertAR CBE</span>
          {profugoInterjurisdiccional && (
            <span className="text-xs font-mono text-red-400/90 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded-md font-bold">PROTOCOLO VULNERADO</span>
          )}
          {modoGeovallado === "CRÍTICO" && !profugoInterjurisdiccional && (
            <span className="text-xs font-mono text-cyan-400/70 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-md">GEOVALLADO VÍAS CRÍTICAS</span>
          )}
        </div>
        <div className="text-xs text-slate-500 font-mono flex gap-x-2">
          <span>t = {formatTiempoExtendido(tDisplay)}</span>
          <span className="text-slate-700">·</span>
          <span>{escenario?.nombre}</span>
          <span className="text-slate-700">·</span>
          <span>{provincia?.nombre}</span>
        </div>
      </div>

      {/* Cuerpo: SVG + telemetría */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">

        {/* SVG Radar */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <RadarSVG
              radioEfectivo={radioEfectivo}
              dEscape={dEscape}
              escenario={escenario}
              contiene={contiene}
              radioMaxProvincia={radioMaxProvincia}
              profugoInterjurisdiccional={profugoInterjurisdiccional}
            />
          </div>

          {/* Leyenda */}
          <div className="flex flex-wrap gap-1.5 mt-1 shrink-0">
            {escenario?.fases?.map((f) => (
              <div key={f.tInicio} className="flex items-center gap-1.5 text-xs bg-slate-800/50 rounded-lg px-2 py-1">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                <span className="text-slate-400">{f.label}</span>
                <span className="text-slate-600 font-mono">≥{f.tInicio}m</span>
              </div>
            ))}
            {radioMaxProvincia > 0 && (
              <div className={`flex items-center gap-1.5 text-xs rounded-lg px-2 py-1 border ${
                profugoInterjurisdiccional ? "bg-red-500/10 border-red-500/20" : "bg-slate-800/50 border-transparent"
              }`}>
                <div className={`w-2 h-2 rounded-full border shrink-0 ${profugoInterjurisdiccional ? "border-red-500" : "border-slate-400"}`} />
                <span className={profugoInterjurisdiccional ? "text-red-400 font-bold" : "text-slate-400"}>Límite prov.</span>
                <span className={`font-mono ${profugoInterjurisdiccional ? "text-red-600" : "text-slate-600"}`}>{radioMaxProvincia.toFixed(1)} km</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1">
              <div className="w-2 h-2 rounded-full bg-amber-500/50 shrink-0" />
              <span className="text-amber-500/80">R_alerta</span>
              <span className="text-amber-700 font-mono">{radioEfectivo.toFixed(1)} km</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1">
              <div className="w-2 h-2 rounded-full border border-red-500 border-dashed shrink-0" />
              <span className="text-red-400/70">D_escape</span>
              <span className="text-red-700 font-mono">{dEscape.toFixed(1)} km</span>
            </div>
          </div>
        </div>

        {/* Panel de telemetría lateral — sin comparación CB */}
        <div className="w-48 xl:w-52 shrink-0 flex flex-col gap-2 overflow-y-auto scrollbar-hide">

          <TelCard title="Cola SMSC" status={profugoInterjurisdiccional ? "breach" : (colaRestante > 0 ? "danger" : "ok")}>
            <div className="flex items-baseline gap-1.5 mb-0.5">
              <span className="text-xl font-bold font-mono text-white leading-none tracking-tight">
                {formatNum(colaRestante)}
              </span>
              <span className="text-xs text-slate-500">pend.</span>
            </div>
            <ProgressBar
              pct={pctEntregado}
              colorClass={profugoInterjurisdiccional ? "bg-red-500 animate-pulse" : pctEntregado >= 100 ? "bg-emerald-500" : "bg-amber-500"}
            />
            <div className="text-xs font-mono text-slate-500">
              {colaRestante > 0 ? `~${(colaRestante / SMSC_RATE).toFixed(0)} seg` : "✓ Completo"}
            </div>
          </TelCard>

          <TelCard title="Estado" status={profugoInterjurisdiccional ? "breach" : (contiene ? "ok" : "danger")}>
            <div className={`text-xs font-bold mb-1.5 tracking-tight ${
              profugoInterjurisdiccional ? "text-red-400" : (contiene ? "text-emerald-400" : "text-red-400")
            }`}>
              {profugoInterjurisdiccional ? "✗ PRÓFUGO" : (contiene ? "✓ CONTENIDO" : "✗ ESCAPE")}
            </div>
            <div className="text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">R_alerta:</span>
                <span className="text-amber-400 font-semibold tracking-tight">{fmtKm(radioEfectivo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">D_escape:</span>
                <span className={`font-semibold tracking-tight ${profugoInterjurisdiccional || !contiene ? "text-red-400" : "text-emerald-400"}`}>
                  {fmtKm(dEscape)}
                </span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-1">
                <span className="text-slate-500">R_max_prov:</span>
                <span className="text-slate-400 font-semibold">{fmtKm(radioMaxProvincia)}</span>
              </div>
            </div>
          </TelCard>

          <TelCard
            title="Unicast"
            status={profugoInterjurisdiccional ? "breach" : (modoGeovallado === "CRÍTICO" ? "warn" : "info")}
          >
            <div className="flex items-baseline gap-1.5 mb-0.5">
              <span className="text-xl font-bold font-mono text-white leading-none tracking-tight">
                {fmtNum(dispositivosUnicast)}
              </span>
              <span className="text-xs text-slate-500">disp.</span>
            </div>
            <ProgressBar
              pct={pctPoblacion}
              colorClass={profugoInterjurisdiccional ? "bg-red-500" : "bg-amber-500"}
            />
            <div className="text-xs font-mono text-slate-500">{pctPoblacion.toFixed(2)}% prov.</div>
            {modoGeovallado === "CRÍTICO" && !profugoInterjurisdiccional && (
              <div className="text-xs text-cyan-500/80 mt-1 font-mono">{pctDescarte}% rural desc.</div>
            )}
          </TelCard>

        </div>
      </div>
    </div>
  );
}
