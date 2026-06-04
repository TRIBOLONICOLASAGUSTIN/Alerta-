import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from "recharts";
import { formatTiempoExtendido } from "../utils/calculos";

const COLORS = {
  radio:     "#06b6d4",
  escape:    "#f87171",
  devs:      "#34d399",
  cobertura: "#fb923c",
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl p-3 text-xs shadow-2xl backdrop-blur">
      <p className="text-slate-400 mb-2 font-semibold font-mono">t = {formatTiempoExtendido(label)}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex justify-between gap-4" style={{ color: p.color }}>
          <span>{p.name}</span>
          <span className="font-mono font-bold">
            {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
            {p.name.includes("km") ? " km" : ""}
            {p.name.includes("%") ? "%" : ""}
            {p.name.includes("(k)") ? "k" : ""}
          </span>
        </p>
      ))}
    </div>
  );
}

function tickFormatter(v) {
  return v < 60 ? `${v}m` : v % 60 === 0 ? `${v / 60}h` : `${Math.floor(v / 60)}h${v % 60}`;
}

export default function RadarMap({ resultado }) {
  if (!resultado?.serie?.length) return null;

  const { serie, escenario } = resultado;

  const dataRadio = serie.map((p) => ({
    t: p.t,
    "Radio (km)":    parseFloat(p.radio.toFixed(1)),
    "D_escape (km)": parseFloat(p.dEscape.toFixed(1)),
  }));

  const dataCov = serie.map((p) => ({
    t: p.t,
    "Cobertura (%)": parseFloat(p.cobertura.toFixed(1)),
  }));

  const dataDevs = serie.map((p) => ({
    t: p.t,
    "Dispositivos (k)": parseFloat((p.dispositivos / 1000).toFixed(1)),
  }));

  const gridColor = "#1e293b";
  const axisColor = "#475569";

  return (
    <div className="flex flex-col gap-4">
      {/* R(t) vs D_escape */}
      <div className="card">
        <p className="card-header">R(t, ρ) vs Distancia de Escape</p>
        <p className="text-xs text-slate-600 mb-3 font-mono">
          R(t) = {escenario.radioBaseEfectivo} + {escenario.velEfectiva} · (t/60) · {escenario.kGeo}
          &nbsp;·&nbsp; D_e = {escenario.velEfectiva} · t/60
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={dataRadio} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={gridColor} />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: axisColor }} tickFormatter={tickFormatter} />
            <YAxis tick={{ fontSize: 10, fill: axisColor }} unit=" km" />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {escenario.fases?.map((f, i) => (
              <ReferenceLine key={i} x={f.tInicio} stroke={f.color} strokeDasharray="4 3" opacity={0.5} />
            ))}
            <Line type="stepAfter" dataKey="Radio (km)"    stroke={COLORS.radio}  strokeWidth={2} dot={false} />
            <Line type="linear"    dataKey="D_escape (km)" stroke={COLORS.escape} strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Cobertura % */}
      <div className="card">
        <p className="card-header">Cobertura de Dispositivos (%)</p>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={dataCov} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={gridColor} />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: axisColor }} tickFormatter={tickFormatter} />
            <YAxis tick={{ fontSize: 10, fill: axisColor }} domain={[0, 105]} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={85}
              stroke="#f87171"
              strokeDasharray="4 2"
              label={{ value: "85% objetivo", fill: "#f87171", fontSize: 9, position: "insideTopRight" }}
            />
            <Area
              type="stepAfter"
              dataKey="Cobertura (%)"
              stroke={COLORS.cobertura}
              fill={COLORS.cobertura}
              fillOpacity={0.12}
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Dispositivos */}
      <div className="card">
        <p className="card-header">Dispositivos Alertados (miles)</p>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={dataDevs} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={gridColor} />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: axisColor }} tickFormatter={tickFormatter} />
            <YAxis tick={{ fontSize: 10, fill: axisColor }} unit="k" />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="stepAfter"
              dataKey="Dispositivos (k)"
              stroke={COLORS.devs}
              fill={COLORS.devs}
              fillOpacity={0.12}
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Fases */}
      <div className="card">
        <p className="card-header">Fases de Expansión</p>
        <div className="flex flex-wrap gap-3">
          {escenario.fases?.map((f, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-2.5 py-1.5">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
              <span className="text-xs text-slate-300 font-medium">{f.label}</span>
              <span className="text-xs text-slate-600 font-mono">t ≥ {f.tInicio} min</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
