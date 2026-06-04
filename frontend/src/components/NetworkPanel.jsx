import { formatTiempo, formatNum } from "../utils/calculos";
import { fmtSeg } from "../utils/Formatter";

function LatRow({ label, valor }) {
  const isNA    = valor?.includes("N/A");
  const isTotal = label === "TOTAL";
  return (
    <div className={`flex justify-between items-center py-2 border-b border-white/[0.05] last:border-0 ${isTotal ? "pt-3" : ""}`}>
      <span className={`text-xs ${isTotal ? "text-white font-semibold" : "text-slate-400"}`}>{label}</span>
      <span className={`text-xs font-mono tracking-tight ${isNA ? "text-slate-600" : isTotal ? "text-emerald-400 text-sm font-bold" : "text-slate-200"}`}>
        {valor}
      </span>
    </div>
  );
}

function ChannelBar({ pct, colorClass }) {
  return (
    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function formatLatenciaSMSC(seg) {
  if (!isFinite(seg) || isNaN(seg)) return "—";
  if (seg < 60)   return `${seg.toFixed(1)} seg`;
  if (seg < 3600) return `${(seg / 60).toFixed(2)} min`;
  const h = Math.floor(seg / 3600);
  const m = ((seg % 3600) / 60).toFixed(0).padStart(2, "0");
  return `${h} h ${m} min`;
}

function smsPct(seg) {
  return Math.min((seg / 3600) * 100, 100);
}

export default function NetworkPanel({ resultado, integrationLogs = [] }) {
  if (!resultado) return null;

  const {
    latencia, redMetrics,
    dispositivos, dispositivosIP, dispositivosSMS,
    faseIdx = 0, factorGeo = 1.0,
    profugoInterjurisdiccional = false,
  } = resultado;

  const tiempoSMSFallback = redMetrics?.tiempoSMSFallback ?? (dispositivosSMS / 1000);
  const tiempoSinOffload  = redMetrics?.tiempoUnicastSeg  ?? (dispositivos  / 1000);
  const superaUmbral      = tiempoSMSFallback > 120;
  const colapso           = tiempoSMSFallback > 3600;

  const smsBarPct = smsPct(tiempoSMSFallback);

  return (
    <div className="flex flex-col gap-4">

      {/* ── Latencia por salto ─────────────────────────────── */}
      <div className="card">
        <p className="card-header">Latencia de Red — SMSC Unicast</p>
        {Object.entries(latencia).map(([k, v]) => (
          <LatRow key={k} label={k} valor={v} />
        ))}
      </div>

      {/* ── Cola SMSC — Análisis de saturación ─────────────── */}
      <div className="card">
        <p className="card-header">Cola SMSC — Análisis de Saturación</p>

        {/* Banner de colapso cuando supera 1h */}
        {colapso && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                Colapso operativo del SMSC detectado
              </p>
            </div>
            <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
              La latencia de entrega SMS supera{" "}
              <span className="text-red-400 font-bold">{formatLatenciaSMSC(tiempoSMSFallback)}</span>.
              A 1.000 TPS, la infraestructura SMSC argentina no puede procesar este volumen
              en tiempo operativo útil.
            </p>
          </div>
        )}

        {/* Métricas principales: 2 columnas (eliminado Cell Broadcast) */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/[0.03] rounded-xl px-3 py-3 border border-white/[0.06] text-center">
            <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold mb-1">Mensajes en cola</p>
            <p className="font-mono font-bold text-lg text-white tracking-tight">{formatNum(dispositivosSMS ?? 0)}</p>
            <p className="text-[9px] text-slate-600 mt-0.5">40% del total</p>
          </div>
          <div className={`rounded-xl px-3 py-3 border text-center ${
            colapso
              ? "bg-red-950/30 border-red-500/30"
              : superaUmbral
              ? "bg-red-500/10 border-red-500/30"
              : "bg-amber-500/[0.05] border-amber-500/20"
          }`}>
            <p className={`text-[9px] uppercase tracking-widest font-bold mb-1 ${
              colapso || superaUmbral ? "text-red-600" : "text-amber-600"
            }`}>
              Latencia SMSC
            </p>
            <p className={`font-mono font-bold text-lg tracking-tight ${
              colapso ? "text-red-400 kpi-glow-red animate-pulse" : superaUmbral ? "text-red-400" : "text-amber-400"
            }`}>
              {formatLatenciaSMSC(tiempoSMSFallback)}
            </p>
            <p className={`text-[9px] mt-0.5 font-mono ${
              colapso ? "text-red-600 font-bold" : "text-slate-600"
            }`}>
              {colapso ? "COLAPSO OPERATIVO" : superaUmbral ? "Supera umbral (2 min)" : "Dentro del umbral"}
            </p>
          </div>
        </div>

        {/* Barra de saturación de cola */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] mb-1.5">
            <span className="text-slate-500 uppercase tracking-widest font-bold">Saturación de cola SMSC</span>
            <span className={`font-mono font-bold tracking-tight ${
              colapso ? "text-red-400" : superaUmbral ? "text-rose-400" : "text-amber-400"
            }`}>
              {smsBarPct.toFixed(1)}% de 1h operativa
            </span>
          </div>
          <div className="h-3 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.06]">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                colapso
                  ? "bg-red-500 animate-pulse"
                  : superaUmbral
                  ? "bg-rose-500"
                  : "bg-amber-500/70"
              }`}
              style={{ width: `${smsBarPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] mt-1 text-slate-700 font-mono">
            <span>0 seg</span>
            <span className="text-slate-600">umbral 2 min</span>
            <span>1 hora (operativo)</span>
          </div>
        </div>

        {/* Comparación offloading */}
        <div className="bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.06] flex items-center gap-3">
          <div className="flex-1 text-xs text-slate-500 leading-relaxed">
            Sin offloading:{" "}
            <span className="text-red-400 font-mono font-semibold tracking-tight">{formatLatenciaSMSC(tiempoSinOffload)}</span>
            {" → "}con offloading IP:{" "}
            <span className="text-emerald-400 font-mono font-semibold tracking-tight">{formatLatenciaSMSC(tiempoSMSFallback)}</span>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-slate-600 mb-0.5">Reducción real</div>
            <div className="text-lg font-bold font-mono text-emerald-400 tracking-tight">
              {tiempoSinOffload > 0 ? `${((1 - tiempoSMSFallback / tiempoSinOffload) * 100).toFixed(0)}%` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Estrategia de offloading IP/GSM ────────────────── */}
      <div className="card">
        <p className="card-header">Offloading IP / GSM — Estrategia Unicast</p>
        <p className="text-xs text-slate-500 mb-4">
          Destino total:{" "}
          <span className="text-slate-300 font-mono font-semibold tracking-tight">{formatNum(dispositivos)}</span>{" "}
          dispositivos geovallados · SMSC:{" "}
          <span className="text-slate-300 font-mono">1.000</span> SMS/seg
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">

          {/* Canal Primario: Push IP */}
          <div className="rounded-2xl p-4 border bg-emerald-500/[0.05] border-emerald-500/20">
            <div className="flex justify-between items-start mb-1">
              <div>
                <p className="text-sm font-bold text-emerald-400">Canal Primario</p>
                <p className="text-[10px] uppercase tracking-widest text-emerald-700 mt-0.5 font-semibold">Push IP · CiDi / Mi Argentina</p>
              </div>
              <span className="text-2xl font-bold font-mono text-emerald-400 kpi-glow-green tracking-tight">~2s</span>
            </div>
            <p className="text-xs text-slate-500 mb-2.5 font-mono tracking-tight">
              {formatNum(dispositivosIP ?? 0)} disp. · 60% del total
            </p>
            <ChannelBar pct={100} colorClass="bg-emerald-500" />
            <div className="mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-widest">Entrega casi instantánea</span>
            </div>
          </div>

          {/* Canal Secundario: SMS SMSC */}
          <div className={`rounded-2xl p-4 border transition-all ${
            colapso
              ? "bg-red-950/30 border-red-500/50 shadow-lg shadow-red-900/30"
              : superaUmbral
              ? "bg-red-500/10 border-red-500/40 shadow-lg shadow-red-900/20"
              : "bg-amber-500/[0.05] border-amber-500/20"
          }`}>
            <div className="flex justify-between items-start mb-1">
              <div>
                <p className={`text-sm font-bold ${colapso || superaUmbral ? "text-red-400" : "text-amber-400"}`}>
                  Canal Fallback
                </p>
                <p className={`text-[10px] uppercase tracking-widest mt-0.5 font-semibold ${colapso || superaUmbral ? "text-red-700" : "text-amber-700"}`}>
                  SMS SMSC · 1.000 TPS
                </p>
              </div>
              <span className={`text-2xl font-bold font-mono tracking-tight ${
                colapso
                  ? "text-red-400 kpi-glow-red"
                  : superaUmbral
                  ? "text-red-400"
                  : "text-amber-400 kpi-glow-amber"
              }`}>
                {formatLatenciaSMSC(tiempoSMSFallback)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2.5 font-mono tracking-tight">
              {formatNum(dispositivosSMS ?? 0)} disp. · 40% del total
            </p>
            <ChannelBar
              pct={smsBarPct}
              colorClass={colapso ? "bg-red-500 animate-pulse" : superaUmbral ? "bg-red-500/80" : "bg-amber-500/70"}
            />
            {(colapso || superaUmbral) ? (
              <div className="mt-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="text-[10px] text-red-400 font-semibold uppercase tracking-widest">
                  {colapso ? "COLAPSO OPERATIVO" : "Supera umbral de 2 min"}
                </span>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-[10px] text-amber-600 font-semibold uppercase tracking-widest">Dentro del umbral</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tráfico de APIs ────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <p className="card-header mb-0">Tráfico de APIs — Integraciones Activas</p>
          {integrationLogs.length === 0 ? (
            <span className="ml-auto text-[9px] font-mono text-slate-700">awaiting trigger...</span>
          ) : (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          )}
        </div>

        {integrationLogs.length === 0 ? (
          <div className="space-y-2">
            {["push", "sms"].map(k => (
              <div key={k} className="flex items-center gap-3 font-mono text-[11px] px-3 py-2.5 bg-white/[0.02] rounded-xl border border-white/[0.05] animate-pulse">
                <span className="text-slate-700">POST</span>
                <span className="text-slate-700 flex-1">/api/integrations/...</span>
                <span className="text-slate-800">--- ms</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {integrationLogs.map(log => {
              const is200 = log.status === 200;
              return (
                <div
                  key={log.id}
                  className={`flex items-center gap-3 font-mono text-[11px] px-3 py-2.5 rounded-xl border transition-all ${
                    is200
                      ? "bg-emerald-500/[0.04] border-emerald-500/15"
                      : "bg-amber-500/[0.04] border-amber-500/15"
                  }`}
                >
                  <span className="text-slate-600 font-bold">POST</span>
                  <span className="text-slate-300 flex-1 truncate">{log.url}</span>
                  <span className={`font-bold ${is200 ? "text-emerald-400" : "text-amber-400"}`}>
                    {log.status} {is200 ? "OK" : "Accepted"}
                  </span>
                  <span className="text-slate-600 tracking-tight">{log.duracion_ms} ms</span>
                </div>
              );
            })}
            {(() => {
              const last = integrationLogs[integrationLogs.length - 1];
              return (
                <div className="mt-2 bg-[#060d1a] rounded-xl border border-white/[0.05] px-3 py-2.5 font-mono text-[10px] text-slate-600 space-y-0.5 leading-relaxed">
                  <p className="text-slate-500 font-bold mb-1">Response preview</p>
                  {Object.entries(last.data ?? {}).slice(0, 5).map(([k, v]) => (
                    <p key={k}>
                      <span className="text-cyan-700">{k}</span>
                      <span className="text-slate-700">: </span>
                      <span className="text-slate-400">{String(v)}</span>
                    </p>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ── Geovallado Inteligente ─────────────────────────── */}
      <div className="card">
        <p className="card-header">Geovallado Inteligente — Filtro Estratégico</p>

        <div className={`flex items-start gap-3 rounded-xl px-3 py-3 border mb-4 ${
          faseIdx >= 1
            ? "bg-amber-500/[0.06] border-amber-500/20"
            : "bg-emerald-500/[0.05] border-emerald-500/20"
        }`}>
          <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${faseIdx >= 1 ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${faseIdx >= 1 ? "text-amber-400" : "text-emerald-400"}`}>
              {faseIdx >= 1 ? "Geovallado Activo — Nodos Críticos" : "Cobertura Total — Área Local"}
            </p>
            <p className="text-xs text-slate-400 leading-snug">
              {faseIdx >= 1
                ? `Seleccionando ${(factorGeo * 100).toFixed(0)}% de densidad · Rutas / Peajes / Fronteras`
                : "Fase 1: cobertura completa del área epicentro. Sin filtro estratégico."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/[0.03] rounded-xl py-2.5 border border-white/[0.06]">
            <p className="text-[9px] uppercase tracking-widest text-slate-600 mb-0.5">Factor</p>
            <p className={`font-mono font-bold text-sm tracking-tight ${faseIdx >= 1 ? "text-amber-400" : "text-emerald-400"}`}>
              {(factorGeo * 100).toFixed(0)}%
            </p>
          </div>
          <div className="bg-white/[0.03] rounded-xl py-2.5 border border-white/[0.06]">
            <p className="text-[9px] uppercase tracking-widest text-slate-600 mb-0.5">Disp. geovallados</p>
            <p className="font-mono font-bold text-sm text-slate-200 tracking-tight">{formatNum(dispositivos)}</p>
          </div>
          <div className="bg-white/[0.03] rounded-xl py-2.5 border border-white/[0.06]">
            <p className="text-[9px] uppercase tracking-widest text-slate-600 mb-0.5">Latencia SMS</p>
            <p className={`font-mono font-bold text-sm tracking-tight ${colapso ? "text-red-400 animate-pulse" : superaUmbral ? "text-red-400" : "text-emerald-400"}`}>
              {formatLatenciaSMSC(tiempoSMSFallback)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
