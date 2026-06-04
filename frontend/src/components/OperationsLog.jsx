import { useRef, useEffect } from "react";
import { fmtNum } from "../utils/Formatter";

const NIVEL_STYLE = {
  INFO:    { dot: "bg-emerald-400",           text: "text-emerald-400/80" },
  AVISO:   { dot: "bg-amber-400",             text: "text-amber-400/80"   },
  ALERTA:  { dot: "bg-rose-400",              text: "text-rose-400/80"    },
  CRÍTICO: { dot: "bg-red-500 animate-pulse", text: "text-red-400"        },
};

function fmtHorasMin(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

function generarLogs(resultado) {
  const {
    escenario, tMin, tiempoTotal, serie = [], capProvincia = 0,
    profugoInterjurisdiccional = false,
    radioEfectivo, dEscape, dispositivos,
    dispositivosUnicast = dispositivos,
    dispositivosTotal   = dispositivos,
    modoGeovallado = "NORMAL", pctDescarte = 0,
    provincia,
  } = resultado;

  const tTotal = tiempoTotal ?? tMin ?? 0;

  const eventos = [];
  const push    = (t, nivel, msg) => eventos.push({ t, nivel, msg });

  push(0, "INFO",
    `[SYS-BOOT] AlertAR-SIFEBU v2.4 iniciado. Handshake CBE establecido. ` +
    `Celda-0 activa. R_base = ${escenario.radioBaseEfectivo} km. ` +
    `R_max_prov = ${capProvincia.toFixed(0)} km (${provincia?.nombre ?? "—"}). ` +
    `t_total = ${fmtHorasMin(tTotal)}.`
  );

  if (modoGeovallado === "CRÍTICO") {
    push(0.083, "ALERTA",
      `[GEOVALLADO-CRÍTICO] R_alerta > 100 km. ` +
      `Descartado ${pctDescarte}% área rural inactiva. ` +
      `Concentrando en ${fmtNum(dispositivosUnicast)} nodos viales (peajes, rutas nac., fronteras).`
    );
  }

  push(0.133, "INFO",
    `[SMSC-INJECT] Inyectando ${fmtNum(dispositivosUnicast)} paquetes en pasarela SMSC. ` +
    `Rate: 1.000 TPS. ETA: ${Math.ceil(dispositivosUnicast / 1000)} seg.`
  );

  if (modoGeovallado === "CRÍTICO" && dispositivosTotal > dispositivosUnicast) {
    push(0.2, "INFO",
      `[SMSC-FILTER] Total área circular: ${fmtNum(dispositivosTotal)} disp. ` +
      `Unicast reducido al ${Math.round((dispositivosUnicast / dispositivosTotal) * 100)}% ` +
      `para evitar colapso SMSC.`
    );
  }

  if (profugoInterjurisdiccional) {
    push(0.05, "CRÍTICO",
      `[FUGA-DETECTADA] D_escape = ${dEscape.toFixed(0)} km > R_max_prov = ${capProvincia.toFixed(0)} km. ` +
      `El sujeto abandonó la jurisdicción provincial en t = ${fmtHorasMin(tTotal)}.`
    );
  }

  let f2 = false, f3 = false, contenido = false, cap = false;

  for (const p of serie) {
    if (p.t > tTotal) break;

    if (!f2 && escenario.fases[1] && p.t >= escenario.fases[1].tInicio) {
      f2 = true;
      push(p.t, "AVISO",
        `[EXPAND-F2] CBE multicast a celdas regionales. R = ${p.radio.toFixed(0)} km. ` +
        `Cola SMS ampliada. Handshake con operadoras regionales.`
      );
    }
    if (!f3 && escenario.fases[2] && p.t >= escenario.fases[2].tInicio) {
      f3 = true;
      push(p.t, "ALERTA",
        `[SIFEBU-NAC] Broadcast provincial total. R = ${p.radio.toFixed(0)} km. ` +
        `Protocolo SIFEBU nivel 3 activo. R_max_prov = ${capProvincia.toFixed(0)} km — tope aplicado.`
      );
    }
    if (!cap && capProvincia > 0 && p.radio >= capProvincia * 0.98) {
      cap = true;
      push(p.t, "CRÍTICO",
        `[CAP-PROV] R_alerta saturó el LÍMITE TERRITORIAL IRROMPIBLE (${capProvincia.toFixed(0)} km). ` +
        `El sistema Unicast no puede expandirse a otras provincias sin colapsar la SMSC.`
      );
    }
    if (!contenido && !profugoInterjurisdiccional && p.dEscape > 0 && p.radio >= p.dEscape) {
      contenido = true;
      push(p.t, "INFO",
        `[CONTENCIÓN-OK] D_escape (${p.dEscape.toFixed(1)} km) dentro del perímetro. ` +
        `R_alerta = ${p.radio.toFixed(1)} km. Verificación confirmada.`
      );
    }

    if (capProvincia > 0 && p.dEscape > capProvincia && !profugoInterjurisdiccional) {
      push(p.t, "CRÍTICO",
        `[DESBORDE] D_escape (${p.dEscape.toFixed(0)} km) supera R_max_prov (${capProvincia.toFixed(0)} km). ` +
        `Sistema VULNERADO — el sujeto habría abandonado la jurisdicción.`
      );
      break;
    }
  }

  if (profugoInterjurisdiccional) {
    push(tTotal > 0 ? tTotal - 1 : 0, "CRÍTICO",
      `[PROTOCOLO-VULNERADO] D_escape FINAL = ${dEscape.toFixed(0)} km. ` +
      `R_max_prov = ${capProvincia.toFixed(0)} km. ` +
      `El sujeto superó el límite territorial provincial.`
    );
    push(tTotal, "CRÍTICO",
      `[UNICAST-COLAPSADO] La red SMSC argentina es estrictamente provincial. ` +
      `Emitir alerta interprovincial excedería capacidad: ${fmtNum(dispositivosUnicast)} msg en cola ` +
      `requieren coordinación nacional fuera del sistema.`
    );
    push(tTotal, "ALERTA",
      `[STATUS-FINAL] PRÓFUGO INTERJURISDICCIONAL. R_alerta bloqueado en ${radioEfectivo.toFixed(0)} km. ` +
      `Protocolo AlertAR/SIFEBU provincial: INEFICAZ.`
    );
  }

  return eventos.sort((a, b) => a.t - b.t);
}

export default function OperationsLog({ resultado }) {
  if (!resultado) return null;

  const logs      = generarLogs(resultado);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const lastLog = logs[logs.length - 1];
  const lastHH  = lastLog ? String(Math.floor(lastLog.t / 60)).padStart(2, "0") : "00";
  const lastMM  = lastLog ? String(Math.floor(lastLog.t % 60)).padStart(2, "0") : "00";

  const profugo = resultado?.profugoInterjurisdiccional ?? false;

  return (
    <div className={`rounded-2xl overflow-hidden border ${profugo ? "border-red-500/30" : "border-slate-700/40"}`}>
      {/* Header compacto */}
      <div className="px-3 py-2 border-b border-slate-700/40 flex items-center gap-2 bg-slate-900/60">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${profugo ? "bg-red-500 animate-ping" : "bg-amber-400 animate-pulse"}`} />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Console — AlertAR / SIFEBU
          {profugo && <span className="ml-2 text-red-400">· PROTOCOLO VULNERADO</span>}
        </p>
        <span className="ml-auto text-[9px] font-mono text-slate-600">{logs.length} eventos</span>
      </div>

      {/* Terminal */}
      <div
        ref={scrollRef}
        className={`h-36 overflow-y-auto terminal-log p-3 space-y-1.5 ${
          profugo ? "bg-[#1a0404]" : "bg-[#040d1a]"
        }`}
      >
        {logs.map((ev, i) => {
          const style = NIVEL_STYLE[ev.nivel] ?? NIVEL_STYLE.INFO;
          const hh = String(Math.floor(ev.t / 60)).padStart(2, "0");
          const mm = String(Math.floor(ev.t % 60)).padStart(2, "0");
          return (
            <div key={i} className="flex gap-2 items-start font-mono text-[10px]">
              <span className="text-slate-700 shrink-0 tabular-nums">[{hh}:{mm}]</span>
              <span className={`w-1.5 h-1.5 rounded-full mt-0.5 shrink-0 ${style.dot}`} />
              <span className={`leading-snug ${style.text}`}>{ev.msg}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1 font-mono text-[10px] pt-0.5">
          <span className="text-slate-700">[{lastHH}:{lastMM}]</span>
          <span className={`animate-pulse ml-1 ${profugo ? "text-red-500/50" : "text-amber-400/50"}`}>█</span>
        </div>
      </div>
    </div>
  );
}
