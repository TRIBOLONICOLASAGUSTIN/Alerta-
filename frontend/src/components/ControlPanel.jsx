import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SlidersHorizontal, Settings2, Play, RotateCcw, FileText } from "lucide-react";
import { PROVINCIAS_DATA } from "../data/provincias";

const API = "/api";

function formatTiempoTotal(min) {
  if (min === 0) return "0 min";
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}min`);
  return parts.join(" ");
}

function PanelHeader({ icon: Icon, children, accent = "cyan" }) {
  const colors = { cyan: "text-cyan-500/80", amber: "text-amber-500/80", rose: "text-rose-500/80" };
  return (
    <div className={`flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] uppercase mb-4 ${colors[accent] ?? colors.cyan}`}>
      {Icon && <Icon size={13} className="shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5 block">
      {children}
    </label>
  );
}

export default function ControlPanel({
  onSimular, onComparar, loading,
  tiempoTotal,
  datosVictima, setDatosVictima,
}) {
  const [escenarios,    setEscenarios]    = useState([]);
  const [provinciaId,   setProvinciaId]   = useState("cordoba");
  const [escenarioId,   setEscenarioId]   = useState("ciudad");
  const [overrideVel,   setOverrideVel]   = useState("");
  const [overrideRadio, setOverrideRadio] = useState("");
  const [edadStr,       setEdadStr]       = useState(String(datosVictima?.edad ?? 0));

  const provData     = PROVINCIAS_DATA.find((p) => p.id === provinciaId);
  const densidad     = provData ? (provData.poblacion / provData.superficie).toFixed(2) : "—";
  const escActual    = escenarios.find((e) => e.id === escenarioId);
  const capProvincia = provData ? Math.sqrt(provData.superficie / Math.PI).toFixed(0) : null;

  const edadNum   = parseInt(edadStr) || 0;
  const edadError = edadNum >= 18;

  useEffect(() => {
    fetch(`${API}/escenarios`).then((r) => r.json()).then(setEscenarios).catch(() => {});
  }, []);

  useEffect(() => {
    setEdadStr(String(datosVictima?.edad ?? 0));
  }, [datosVictima?.edad]);

  function handleVictima(field, value) {
    setDatosVictima(prev => ({ ...prev, [field]: value }));
  }

  function handleEdadChange(e) {
    const str = e.target.value;
    setEdadStr(str);
    const n = parseInt(str);
    if (!isNaN(n) && n >= 0 && n < 18) {
      handleVictima("edad", n);
    }
  }

  function handleEdadBlur() {
    const n = Math.min(Math.max(parseInt(edadStr) || 0, 0), 17);
    setEdadStr(String(n));
    handleVictima("edad", n);
  }

  function buildParams() {
    return {
      provinciaId,
      escenarioId,
      tiempoTotal,
      overrideVel:       overrideVel   !== "" ? Number(overrideVel)   : undefined,
      overrideRadioBase: overrideRadio !== "" ? Number(overrideRadio) : undefined,
    };
  }

  return (
    <aside className="flex flex-col gap-4 w-full">

      {/* ── Datos de la Víctima ─────────────────────────────── */}
      <div className="card !p-5">
        <PanelHeader icon={FileText}>Datos de la Víctima</PanelHeader>
        <div className="flex flex-col gap-3">

          <div>
            <FieldLabel>Nombre completo</FieldLabel>
            <input
              type="text"
              value={datosVictima?.nombre ?? ""}
              onChange={(e) => handleVictima("nombre", e.target.value)}
              className="input-field"
              placeholder="Nombre y apellido"
            />
          </div>

          <div>
            <FieldLabel>Foto de la víctima</FieldLabel>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    handleVictima("foto", event.target?.result);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="input-field"
            />
            {datosVictima?.foto && (
              <div className="mt-2 w-full h-24 rounded border border-slate-600 overflow-hidden bg-slate-800">
                <img
                  src={datosVictima.foto}
                  alt="Foto de la víctima"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Edad</FieldLabel>
              <input
                type="number"
                min={0} max={17}
                value={edadStr}
                onChange={handleEdadChange}
                onBlur={handleEdadBlur}
                className={edadError ? "input-field-error" : "input-field"}
                placeholder="0–17"
              />
              {edadError && (
                <p className="text-[9px] text-red-400 font-semibold mt-1 leading-snug">
                  El protocolo Alerta Sofía aplica estrictamente a menores de 18 años.
                </p>
              )}
            </div>
            <div>
              <FieldLabel>Sexo</FieldLabel>
              <select
                className="select-field"
                value={datosVictima?.sexo ?? "Femenino"}
                onChange={(e) => handleVictima("sexo", e.target.value)}
              >
                <option>Femenino</option>
                <option>Masculino</option>
                <option>Otro</option>
              </select>
            </div>
          </div>

          <div>
            <FieldLabel>Última vez vista</FieldLabel>
            <input
              type="text"
              value={datosVictima?.ultimaVezVista ?? ""}
              onChange={(e) => handleVictima("ultimaVezVista", e.target.value)}
              className="input-field"
              placeholder="Fecha y hora estimada"
            />
          </div>

          <div>
            <FieldLabel>Vestimenta / Señas</FieldLabel>
            <textarea
              value={datosVictima?.vestimenta ?? ""}
              onChange={(e) => handleVictima("vestimenta", e.target.value)}
              className="input-field resize-none"
              rows={2}
              placeholder="Descripción de vestimenta y rasgos visibles"
            />
          </div>

          <div>
            <FieldLabel>Última ubicación conocida</FieldLabel>
            <input
              type="text"
              value={datosVictima?.ubicacion ?? ""}
              onChange={(e) => handleVictima("ubicacion", e.target.value)}
              className="input-field"
              placeholder="Dirección / localidad"
            />
          </div>

        </div>
      </div>

      {/* ── Parámetros ───────────────────────────────────────── */}
      <div className="card !p-5">
        <PanelHeader icon={SlidersHorizontal}>Parámetros</PanelHeader>

        <div className="flex flex-col gap-5">
          {/* Provincia */}
          <div>
            <FieldLabel>Provincia (INDEC 2022)</FieldLabel>
            <select
              className="select-field"
              value={provinciaId}
              onChange={(e) => setProvinciaId(e.target.value)}
            >
              {PROVINCIAS_DATA.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            {provData && (
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {[
                  { val: densidad,                                           unit: "hab/km²"    },
                  { val: (provData.poblacion / 1_000_000).toFixed(2) + "M", unit: "habitantes" },
                  { val: `≤${capProvincia} km`,                             unit: "R_max prov" },
                ].map(({ val, unit }) => (
                  <div key={unit} className="bg-white/[0.03] rounded-xl py-1.5 px-1.5 text-center border border-white/[0.06]">
                    <div className="font-mono text-xs font-bold text-slate-300 leading-tight">{val}</div>
                    <div className="text-slate-600 text-[9px] mt-0.5">{unit}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Escenario */}
          <div>
            <FieldLabel>Escenario operativo</FieldLabel>
            <select
              className="select-field"
              value={escenarioId}
              onChange={(e) => setEscenarioId(e.target.value)}
            >
              {escenarios.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
            {escActual && (
              <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">{escActual.descripcion}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Parámetros Avanzados ─────────────────────────────── */}
      <div className="card !p-5">
        <PanelHeader icon={Settings2}>Parámetros Avanzados</PanelHeader>
        <div className="flex flex-col gap-3">
          <div>
            <FieldLabel>Velocidad de escape (km/h)</FieldLabel>
            <input
              type="number" min={1} max={300}
              value={overrideVel}
              onChange={(e) => setOverrideVel(e.target.value)}
              className="input-field"
              placeholder={escActual ? `Escenario: ${escActual.velEscape} km/h` : "Valor por defecto"}
            />
          </div>
          <div>
            <FieldLabel>Radio base R₀ (km)</FieldLabel>
            <input
              type="number" min={1} max={500}
              value={overrideRadio}
              onChange={(e) => setOverrideRadio(e.target.value)}
              className="input-field"
              placeholder={escActual ? `Escenario: ${escActual.radioBase} km` : "Valor por defecto"}
            />
          </div>
          {(overrideVel || overrideRadio) && (
            <button
              className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-cyan-400 transition-all duration-200"
              onClick={() => { setOverrideVel(""); setOverrideRadio(""); }}
            >
              <RotateCcw size={11} />
              Restaurar valores del escenario
            </button>
          )}
        </div>
      </div>

      {/* ── Acciones ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <motion.button
          className="btn-primary"
          onClick={() => onSimular(buildParams())}
          disabled={loading || tiempoTotal === 0}
          whileHover={!loading && tiempoTotal > 0 ? { scale: 1.02 } : {}}
          whileTap={!loading && tiempoTotal > 0 ? { scale: 0.98 } : {}}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Calculando...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Play size={14} />
              Simular — {formatTiempoTotal(tiempoTotal)}
            </span>
          )}
        </motion.button>

        <motion.button
          className="btn-secondary"
          onClick={() => onComparar({ provinciaId, tiempoTotal })}
          disabled={loading}
          whileHover={!loading ? { scale: 1.02 } : {}}
          whileTap={!loading ? { scale: 0.98 } : {}}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          Comparar todos los escenarios
        </motion.button>
      </div>
    </aside>
  );
}
