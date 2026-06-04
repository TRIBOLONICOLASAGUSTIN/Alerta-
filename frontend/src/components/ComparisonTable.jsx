import { formatNum, formatTiempoExtendido } from "../utils/calculos";
import { fmtKm } from "../utils/Formatter";

function CovBar({ pct, profugo }) {
  const color = profugo
    ? "bg-red-500"
    : pct >= 85 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";
  const text = profugo
    ? "text-red-400"
    : pct >= 85 ? "text-emerald-400" : pct >= 60 ? "text-amber-400" : "text-red-400";
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-slate-700/80 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`text-xs font-mono font-semibold w-10 text-right tracking-tight ${text}`}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

export default function ComparisonTable({ comparacion }) {
  if (!comparacion) return null;

  const { provincia, tiempoTotal, tMin, comparacion: rows } = comparacion;
  const tDisplay = tiempoTotal ?? tMin ?? 0;

  const validRows = rows.filter(r => !r.profugoInterjurisdiccional);
  const best = validRows.length > 0
    ? validRows.reduce((a, b) => (b.cobertura > a.cobertura ? b : a), validRows[0])
    : null;
  const profugosCount = rows.filter(r => r.profugoInterjurisdiccional).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="card !p-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <p className="card-header mb-0.5">Comparación de Escenarios</p>
            <p className="text-xs text-slate-500">
              <span className="text-white font-semibold">{provincia.nombre}</span>
              {" · t = "}
              <span className="text-cyan-400 font-mono font-semibold tracking-tight">{formatTiempoExtendido(tDisplay)}</span>
            </p>
          </div>
          <div className="flex gap-2 text-xs flex-wrap">
            {best && (
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-lg px-2.5 py-1">
                Mejor: {best.escenario} ({best.cobertura.toFixed(1)}%)
              </span>
            )}
            {profugosCount > 0 && (
              <span className="bg-red-500/10 text-red-400 border border-red-500/25 rounded-lg px-2.5 py-1 font-bold">
                {profugosCount} escenario{profugosCount > 1 ? "s" : ""} en fuga interjurisdicc.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-slate-800/30">
                {["Escenario", "Radio R(t)", "Vel. Escape", "D. Escape", "Dispositivos", "Cobertura %", "Estado"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const esBest = best && r.escenario === best.escenario;
                return (
                  <tr
                    key={r.escenario}
                    className={`border-b border-white/5 last:border-0 transition-colors ${
                      r.profugoInterjurisdiccional
                        ? "bg-red-950/20 hover:bg-red-950/30"
                        : esBest
                        ? "bg-cyan-500/5 hover:bg-cyan-500/8"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {r.profugoInterjurisdiccional && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                        )}
                        {!r.profugoInterjurisdiccional && esBest && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                        )}
                        <span className={`font-medium ${r.profugoInterjurisdiccional ? "text-red-300" : "text-white"}`}>
                          {r.escenario}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-cyan-400 tracking-tight">
                      {fmtKm(r.radio)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono tracking-tight">{r.velEscape} km/h</td>
                    <td className={`py-3 px-4 font-mono font-semibold tracking-tight ${
                      r.profugoInterjurisdiccional ? "text-red-400" : "text-rose-400"
                    }`}>
                      {fmtKm(r.dEscape)}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 tracking-tight">
                      {formatNum(r.dispositivos)}
                    </td>
                    <td className="py-3 px-4">
                      <CovBar pct={r.cobertura} profugo={r.profugoInterjurisdiccional} />
                    </td>
                    <td className="py-3 px-4">
                      {r.profugoInterjurisdiccional ? (
                        <span className="font-bold text-xs text-red-400 font-mono tracking-wider">
                          ✗ PRÓFUGO
                        </span>
                      ) : r.contiene ? (
                        <span className="font-bold text-sm text-emerald-400">✓ SÍ</span>
                      ) : (
                        <span className="font-bold text-sm text-red-400">✗ NO</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-white/5 bg-slate-900/30">
          <p className="text-xs text-slate-600">
            ¿Contiene? = R(t) ≥ D_escape · PRÓFUGO = D_escape &gt; R_max_prov (límite territorial irrompible)
          </p>
        </div>
      </div>
    </div>
  );
}
