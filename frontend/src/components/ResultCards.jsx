import { formatNum, colorCobertura, bgCobertura, formatTiempoExtendido } from "../utils/calculos";
import { fmtKm, fmtKm2, fmtNum } from "../utils/Formatter";

function StatCard({ label, value, sub, accentClass, glowClass }) {
  return (
    <div className="card flex flex-col gap-1.5">
      <p className="card-header">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-3xl font-bold font-mono leading-none tracking-tight ${accentClass || "text-white"} ${glowClass || ""}`}>
          {value}
        </span>
      </div>
      {sub && <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{sub}</p>}
    </div>
  );
}

function CoverageBar({ pct, profugo }) {
  return (
    <div className="mt-1.5">
      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            profugo ? "bg-red-500 animate-pulse" : bgCobertura(pct)
          }`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function FieldTag({ label }) {
  return (
    <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-500 block mb-0.5">
      {label}
    </span>
  );
}

export default function ResultCards({ resultado }) {
  if (!resultado) return null;

  const {
    escenario, provincia, densidad,
    tMin, tiempoTotal,
    fase, radioEfectivo, radioMaxProvincia, area,
    dispositivos,
    dispositivosTotal   = dispositivos,
    dispositivosUnicast = dispositivos,
    maxCompatibles, cobertura, dEscape, contiene,
    profugoInterjurisdiccional = false,
    modoGeovallado = "NORMAL", pctDescarte = 0,
    capProvincia = 0,
  } = resultado;

  const tDisplay = tiempoTotal ?? tMin ?? 0;
  const tStr     = formatTiempoExtendido(tDisplay);
  const densStr  = densidad < 10
    ? densidad.toFixed(2)
    : Math.round(densidad).toLocaleString("es-AR");
  const radioCapado = radioMaxProvincia && radioEfectivo >= radioMaxProvincia * 0.99;

  const escapePct = radioEfectivo > 0
    ? Math.min((dEscape / radioEfectivo) * 100, 100)
    : 0;
  const escapeRatioPct = radioEfectivo > 0
    ? Math.min((dEscape / radioEfectivo) * 100, 999).toFixed(1)
    : "0.0";

  const latenciaSMSC = Math.ceil(dispositivosUnicast / 1000);

  return (
    <div className="flex flex-col gap-5">

      {/* ── Contexto de simulación ─────────────────────────────── */}
      <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl px-4 py-3 shadow-xl shadow-black/40">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
          <span>
            <span className="text-slate-600">Provincia:</span>{" "}
            <span className="text-slate-100 font-semibold">{provincia.nombre}</span>
          </span>
          <span>
            <span className="text-slate-600">Escenario:</span>{" "}
            <span className="text-slate-100 font-semibold">{escenario.nombre}</span>
          </span>
          <span>
            <span className="text-slate-600">Densidad:</span>{" "}
            <span className="text-cyan-400 font-semibold font-mono tracking-tight">{densStr} hab/km²</span>
          </span>
          <span>
            <span className="text-slate-600">t =</span>{" "}
            <span className="text-slate-100 font-semibold font-mono">{tStr}</span>
          </span>
          <span>
            <span className="text-slate-600">Fase activa:</span>{" "}
            <span className="font-semibold" style={{ color: profugoInterjurisdiccional ? "#ef4444" : fase.color }}>
              {profugoInterjurisdiccional ? "FALLA — Prófugo Interjurisdiccional" : fase.label}
            </span>
          </span>
          {modoGeovallado === "CRÍTICO" && !profugoInterjurisdiccional && (
            <span>
              <span className="text-slate-600">Geovallado:</span>{" "}
              <span className="text-cyan-400 font-semibold">VÍAS CRÍTICAS</span>
            </span>
          )}
        </div>
      </div>

      {/* ── ALERTA CRÍTICA: Prófugo Interjurisdiccional ──────────── */}
      {profugoInterjurisdiccional && (
        <div className="border-2 border-red-500/50 bg-red-950/30 rounded-2xl px-4 py-4 breach-banner">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-red-500" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1.5">
                ✗ PRÓFUGO INTERJURISDICCIONAL — Protocolo Unicast Colapsado
              </p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="bg-red-500/[0.08] rounded-xl px-3 py-2 border border-red-500/20">
                  <p className="text-[9px] text-red-600 uppercase tracking-wider font-bold mb-0.5">D_escape</p>
                  <p className="font-mono font-bold text-red-400 tracking-tight">{fmtKm(dEscape)}</p>
                </div>
                <div className="bg-red-500/[0.08] rounded-xl px-3 py-2 border border-red-500/20">
                  <p className="text-[9px] text-red-600 uppercase tracking-wider font-bold mb-0.5">R_max_prov</p>
                  <p className="font-mono font-bold text-red-400 tracking-tight">{fmtKm(capProvincia)}</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
                El objetivo abandonó la jurisdicción provincial en t = {tStr}.{" "}
                <span className="text-red-400 font-bold">Capacidad Unicast excedida.</span>{" "}
                La red SMSC argentina no soporta emisión interprovincial.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Geovallado Crítico ──────────────────────────────────── */}
      {modoGeovallado === "CRÍTICO" && !profugoInterjurisdiccional && (
        <div className="border border-cyan-500/20 bg-cyan-500/[0.03] rounded-2xl px-4 py-3">
          <p className="text-[10px] font-bold text-cyan-500/80 uppercase tracking-widest mb-1">
            Geovallado de Vías Críticas Activo
          </p>
          <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
            R_alerta &gt; 100 km — Descartado{" "}
            <span className="text-amber-400 font-bold">{pctDescarte}%</span> del área rural inactiva.
            Concentrado en{" "}
            <span className="text-cyan-400 font-bold tracking-tight">{fmtNum(dispositivosUnicast)}</span>{" "}
            nodos viales (peajes, rutas nacionales, fronteras).
          </p>
        </div>
      )}

      {/* ── KPI Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">

        <StatCard
          label="Radio Dinámico R(t)"
          value={fmtKm(radioEfectivo)}
          sub={`R₀ = ${escenario.radioBaseEfectivo} km · K_geo = ${escenario.kGeo}${radioCapado ? " · cap prov." : ""}${profugoInterjurisdiccional ? " · BLOQUEADO" : ""}`}
          accentClass={profugoInterjurisdiccional ? "text-red-400" : "text-cyan-400"}
          glowClass={profugoInterjurisdiccional ? "kpi-glow-red" : "kpi-glow"}
        />

        <StatCard
          label="Área de Cobertura"
          value={fmtKm2(area)}
          sub="A = π · R(t)²"
          accentClass="text-blue-400"
        />

        <div className="card flex flex-col gap-1.5">
          <p className="card-header">Dispositivos en Perímetro</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-mono leading-none tracking-tight text-slate-300">
              {fmtNum(dispositivosTotal)}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
            Total área 360°
          </p>
        </div>

        <div className="card flex flex-col gap-1.5">
          <p className="card-header">Objetivos Unicast</p>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-3xl font-bold font-mono leading-none tracking-tight ${
              profugoInterjurisdiccional ? "text-red-400 kpi-glow-red" : "text-emerald-400 kpi-glow-green"
            }`}>
              {fmtNum(dispositivosUnicast)}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
            {profugoInterjurisdiccional
              ? "Sin efecto — fuga interjurisdicc."
              : modoGeovallado === "CRÍTICO"
              ? `Filtrado en rutas · ETA: ${latenciaSMSC} seg`
              : `Sin filtrado vial · ETA: ${latenciaSMSC} seg`}
          </p>
        </div>

        <div className="card flex flex-col gap-1.5 col-span-2">
          <p className="card-header">Cobertura Provincial</p>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-4xl font-bold font-mono leading-none tracking-tight ${
              profugoInterjurisdiccional ? "text-red-400 kpi-glow-red" : colorCobertura(cobertura)
            }`}>
              {cobertura.toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">%</span>
            {profugoInterjurisdiccional && (
              <span className="text-[9px] text-red-600 font-mono ml-2">pero D_escape ya no está en la provincia</span>
            )}
          </div>
          <CoverageBar pct={cobertura} profugo={profugoInterjurisdiccional} />
          <p className="text-[11px] text-slate-600 mt-0.5">
            {profugoInterjurisdiccional
              ? "100% provincial alertado — el sujeto ya escapó del territorio"
              : "Umbral objetivo: ≥ 85%"}
          </p>
        </div>

      </div>

      {/* ── Estado de contención del escape ────────────────────── */}
      <div
        className={`card border-2 transition-all duration-300 ${
          profugoInterjurisdiccional
            ? "border-red-500/50 bg-red-950/30"
            : contiene
            ? "border-emerald-500/40 bg-gradient-to-br from-emerald-950/60 to-teal-950/40"
            : "border-rose-500/40 bg-gradient-to-br from-rose-950/60 to-red-950/40"
        }`}
      >
        <div className={`text-xl font-bold tracking-tight mb-4 ${
          profugoInterjurisdiccional
            ? "text-red-400 kpi-glow-red"
            : contiene
            ? "text-emerald-400 kpi-glow-green"
            : "text-rose-500 kpi-glow-rose"
        }`}>
          {profugoInterjurisdiccional
            ? "✗ CONTENCIÓN: IMPOSIBLE — PRÓFUGO"
            : (contiene ? "✓  CONTENCIÓN: ASEGURADA" : "✗  CONTENCIÓN: VULNERADA")}
        </div>

        {/* Barra Dinámica de Persecución */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] mb-1.5">
            <span className="text-slate-500 uppercase tracking-widest font-bold">Dinámica de Persecución</span>
            <span className={`font-mono font-bold tracking-tight ${
              profugoInterjurisdiccional ? "text-red-400" : (contiene ? "text-emerald-400" : "text-rose-400")
            }`}>
              {escapeRatioPct}% del radio
            </span>
          </div>
          <div className="relative h-3 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.06]">
            <div className="absolute inset-0 bg-emerald-500/10 rounded-full" />
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                profugoInterjurisdiccional
                  ? "bg-red-500 animate-pulse"
                  : contiene ? "bg-emerald-500/70" : "bg-rose-500 animate-pulse"
              }`}
              style={{ width: `${Math.min(escapePct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] mt-1 text-slate-600 font-mono">
            <span>D_escape: {fmtKm(dEscape)}</span>
            <span>R_alerta: {fmtKm(radioEfectivo)}</span>
          </div>
        </div>

        {/* Métricas detalladas */}
        <div className="flex flex-wrap items-start gap-4">
          <div>
            <FieldTag label="Radio AlertAR" />
            <span className="text-white font-semibold font-mono text-sm tracking-tight">{fmtKm(radioEfectivo)}</span>
          </div>
          <div>
            <FieldTag label="Desplazamiento estimado" />
            <span className={`font-semibold font-mono text-sm tracking-tight ${
              profugoInterjurisdiccional ? "text-red-400" : (contiene ? "text-emerald-300" : "text-rose-400")
            }`}>
              {fmtKm(dEscape)}
            </span>
            <p className="text-[9px] text-slate-600 mt-0.5 font-mono">
              V: {escenario.velEfectiva} km/h
            </p>
          </div>
          <div>
            <FieldTag label="Velocidad de escape" />
            <span className="text-white font-semibold font-mono text-sm tracking-tight">{escenario.velEfectiva} km/h</span>
          </div>
          {profugoInterjurisdiccional && (
            <div>
              <FieldTag label="Límite provincial" />
              <span className="text-red-400 font-semibold font-mono text-sm tracking-tight">{fmtKm(capProvincia)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Canal alternativo ──────────────────────────────────── */}
      {escenario.canalAlt && (
        <div className="card border-amber-500/30 bg-amber-500/[0.04]">
          <p className="card-header text-amber-500/80">Canal Alternativo Activo</p>
          <p className="text-sm text-amber-300">{escenario.canalAlt}</p>
        </div>
      )}
    </div>
  );
}
