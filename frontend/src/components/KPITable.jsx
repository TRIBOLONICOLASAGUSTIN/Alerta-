import { formatTiempoExtendido } from "../utils/calculos";

function Badge({ estado }) {
  if (estado === "PASS")
    return <span className="badge-pass"><span>✓</span> PASS</span>;
  if (estado === "FAIL")
    return <span className="badge-fail"><span>✗</span> FAIL</span>;
  if (estado === "—" || estado === "Pendiente")
    return <span className="badge-pending">— pendiente</span>;
  return <span className="badge-na">{estado}</span>;
}

export default function KPITable({ kpis, tMin }) {
  if (!kpis?.length) return null;

  const pass  = kpis.filter((k) => k.estado === "PASS").length;
  const fail  = kpis.filter((k) => k.estado === "FAIL").length;
  const total = kpis.filter((k) => k.estado !== "N/A" && k.estado !== "—").length;

  return (
    <div className="flex flex-col gap-4">
      {/* Resumen */}
      <div className="card !p-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <p className="card-header mb-0">
            Validación KPIs — t = {formatTiempoExtendido(tMin)}
          </p>
          <div className="flex gap-2">
            <span className="badge-pass text-sm px-3 py-1">{pass} PASS</span>
            {fail > 0 && <span className="badge-fail text-sm px-3 py-1">{fail} FAIL</span>}
            <span className="badge-na text-sm px-3 py-1">{total} evaluados</span>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8 bg-slate-800/30">
                <th className="text-left py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider">KPI</th>
                <th className="text-right py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider">Resultado</th>
                <th className="text-right py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider">Criterio</th>
                <th className="text-center py-3 px-4 text-slate-500 font-semibold uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((row, i) => (
                <tr
                  key={row.kpi}
                  className={`border-b border-white/5 last:border-0 transition-colors ${
                    row.estado === "FAIL" ? "bg-red-500/5" : ""
                  }`}
                >
                  <td className="py-3 px-4 text-slate-300">{row.kpi}</td>
                  <td className="py-3 px-4 text-right font-mono text-white font-semibold">{row.resultado}</td>
                  <td className="py-3 px-4 text-right text-slate-500 font-mono">{row.criterio}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge estado={row.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
