import { useState, useEffect, useRef } from 'react';

/* ─────────────────────────────────────────────────────────────────
   CONSTANTES
───────────────────────────────────────────────────────────────── */
const SMSC_TPS = 1000;
const P0_SMS   = 15_000;
const P1_SMS   = 40_000;
const P0_SECS  = P0_SMS / SMSC_TPS;
const P1_SECS  = P1_SMS / SMSC_TPS;
const P01_SECS = P0_SECS + P1_SECS;

const PROVINCIAS = [
  { id:'bsas', nombre:'Buenos Aires',         poblacion:17_000_000, radioProvinciaKm:300 },
  { id:'caba', nombre:'CABA',                  poblacion: 3_100_000, radioProvinciaKm:  8 },
  { id:'cba',  nombre:'Córdoba',               poblacion: 3_800_000, radioProvinciaKm:300 },
  { id:'sf',   nombre:'Santa Fe',              poblacion: 3_500_000, radioProvinciaKm:250 },
  { id:'mza',  nombre:'Mendoza',               poblacion: 2_000_000, radioProvinciaKm:200 },
  { id:'tuc',  nombre:'Tucumán',               poblacion: 1_700_000, radioProvinciaKm:100 },
  { id:'sal',  nombre:'Salta',                 poblacion: 1_500_000, radioProvinciaKm:250 },
  { id:'mis',  nombre:'Misiones',              poblacion: 1_300_000, radioProvinciaKm:150 },
  { id:'chac', nombre:'Chaco',                 poblacion: 1_200_000, radioProvinciaKm:200 },
  { id:'er',   nombre:'Entre Ríos',            poblacion: 1_300_000, radioProvinciaKm:200 },
  { id:'ctes', nombre:'Corrientes',            poblacion: 1_100_000, radioProvinciaKm:200 },
  { id:'sde',  nombre:'Santiago del Estero',   poblacion: 1_000_000, radioProvinciaKm:250 },
  { id:'sj',   nombre:'San Juan',              poblacion:   780_000, radioProvinciaKm:200 },
  { id:'juj',  nombre:'Jujuy',                 poblacion:   770_000, radioProvinciaKm:150 },
  { id:'rn',   nombre:'Río Negro',             poblacion:   750_000, radioProvinciaKm:350 },
  { id:'nqn',  nombre:'Neuquén',               poblacion:   700_000, radioProvinciaKm:300 },
  { id:'form', nombre:'Formosa',               poblacion:   620_000, radioProvinciaKm:200 },
  { id:'chbt', nombre:'Chubut',                poblacion:   620_000, radioProvinciaKm:500 },
  { id:'sl',   nombre:'San Luis',              poblacion:   500_000, radioProvinciaKm:200 },
  { id:'cat',  nombre:'Catamarca',             poblacion:   420_000, radioProvinciaKm:250 },
  { id:'lr',   nombre:'La Rioja',              poblacion:   380_000, radioProvinciaKm:200 },
  { id:'lp',   nombre:'La Pampa',              poblacion:   360_000, radioProvinciaKm:350 },
  { id:'sc',   nombre:'Santa Cruz',            poblacion:   280_000, radioProvinciaKm:600 },
  { id:'tf',   nombre:'Tierra del Fuego',      poblacion:   180_000, radioProvinciaKm:200 },
];

const CONTEXTOS = [
  { value:'pueblo',         label:'Pueblo / Rural',        r0:20 },
  { value:'ciudad_mediana', label:'Ciudad mediana',         r0: 5 },
  { value:'ciudad_grande',  label:'Ciudad grande',          r0: 2 },
  { value:'frontera',       label:'Zona fronteriza',        r0:10 },
  { value:'sin_cobertura',  label:'Sin cobertura celular',  r0:30 },
];

/* ─────────────────────────────────────────────────────────────────
   LÓGICA PURA
───────────────────────────────────────────────────────────────── */
function getR0(ctx) {
  return (CONTEXTOS.find(c => c.value === ctx) || { r0: 5 }).r0;
}

function calcRadioExp(tHoras, r0) {
  return r0 * Math.exp(0.835 * tHoras);
}

function getFaseInfo(radioKm, radioProvinciaKm) {
  if (radioKm < 20)               return { num:1, label:'FASE 1 — Zona inmediata',       color:'#06b6d4' };
  if (radioKm < radioProvinciaKm) return { num:2, label:'FASE 2 — Expansión regional',   color:'#f59e0b' };
  return                                 { num:3, label:'FASE 3 — Cobertura provincial',  color:'#ef4444' };
}

function smartGridStep(vr) {
  if (vr <  10) return 2;
  if (vr <  50) return 10;
  if (vr < 200) return 50;
  return 100;
}

function calcTTranscurrido(fecha, hora) {
  if (!fecha || !hora) return 0;
  const [y, mo, d] = fecha.split('-').map(Number);
  const [h, m]     = hora.split(':').map(Number);
  return Math.max(0, (Date.now() - new Date(y, mo - 1, d, h, m, 0).getTime()) / 3_600_000);
}

function calcQoS(elapsed, provPoblacion) {
  const totalSMS = P0_SMS + P1_SMS + provPoblacion;
  let dispatched, priorityFlag;

  if (elapsed <= P0_SECS) {
    dispatched   = Math.min(elapsed * SMSC_TPS, P0_SMS);
    priorityFlag = 0;
  } else if (elapsed <= P01_SECS) {
    dispatched   = P0_SMS + Math.min((elapsed - P0_SECS) * SMSC_TPS, P1_SMS);
    priorityFlag = 1;
  } else {
    dispatched   = P0_SMS + P1_SMS + Math.min((elapsed - P01_SECS) * SMSC_TPS, provPoblacion);
    priorityFlag = 2;
  }

  const encolados   = Math.max(0, totalSMS - dispatched);
  const latenciaSeg = encolados / SMSC_TPS;
  return { dispatched, encolados, priorityFlag, latenciaSeg, totalSMS };
}

function fmt(n) { return Math.round(n).toLocaleString('es-AR'); }

function fmtHMS(tHoras) {
  const h = Math.floor(tHoras);
  const m = Math.floor((tHoras - h) * 60);
  const s = Math.floor(((tHoras - h) * 60 - m) * 60);
  return `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
}

function fmtHM(tHoras) {
  const h = Math.floor(tHoras);
  const m = Math.floor((tHoras - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/* ─────────────────────────────────────────────────────────────────
   COMPONENTES ATÓMICOS
───────────────────────────────────────────────────────────────── */
function Card({ children, style: extra = {} }) {
  return (
    <div style={{
      background: 'rgba(15,23,42,0.9)',
      border: '1px solid #1e293b',
      borderRadius: 10,
      padding: 12,
      minWidth: 0,
      ...extra,
    }}>
      {children}
    </div>
  );
}

function SLabel({ children, color }) {
  return (
    <div style={{
      fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase',
      color: color || '#475569', marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function TRow({ label, value, color }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '4px 0', borderBottom: '1px solid #0f172a', minWidth: 0, gap: 8,
    }}>
      <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 10, fontWeight: 700, color: color || '#f1f5f9',
        fontFamily: 'monospace', textAlign: 'right', minWidth: 0, wordBreak: 'break-all',
      }}>
        {value}
      </span>
    </div>
  );
}

function Badge({ text, color, blink }) {
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
      color, border: `1px solid ${color}60`, borderRadius: 3,
      padding: '2px 6px', whiteSpace: 'nowrap',
      animation: blink ? 'poc-blink 1.4s infinite' : 'none',
    }}>
      {text}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────
   RADAR SVG — coordenadas km, viewBox paramétrico
───────────────────────────────────────────────────────────────── */
function Radar({ radioKm, radioProvinciaKm, faseInfo, running, elapsed }) {
  const vr   = Math.max(5, radioKm * 1.3);
  const step = smartGridStep(vr);
  const vb   = `${-vr} ${-vr} ${vr * 2} ${vr * 2}`;

  const mainColor = faseInfo.color;

  const gridRings = [];
  for (let r = step; r <= vr * 1.1; r += step) gridRings.push(r);

  const sweepDeg = (elapsed * 3) % 360;
  const sweepRad = (sweepDeg - 90) * Math.PI / 180;
  const sx = vr * Math.cos(sweepRad);
  const sy = vr * Math.sin(sweepRad);

  const alertRings = running ? [radioKm * 0.33, radioKm * 0.66, radioKm] : [];
  const showProv   = faseInfo.num >= 2 || vr > radioProvinciaKm * 0.4;
  const cobertura  = faseInfo.num >= 3;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minHeight: 0 }}>
      <div style={{ fontSize: 9, letterSpacing: '0.2em', color: '#334155', marginBottom: 6, textTransform: 'uppercase' }}>
        RADAR DINÁMICO — ZONA DE ALERTA
      </div>

      <div style={{ flex: 1, minHeight: 0, width: '100%', overflow: 'hidden' }}>
        <svg viewBox={vb} style={{ width: '100%', height: '100%' }}>
          {/* Fondo */}
          <rect x={-vr} y={-vr} width={vr * 2} height={vr * 2} fill="#020617" />

          {/* Grid auto-adaptativo */}
          {gridRings.map(r => (
            <g key={r}>
              <circle
                cx={0} cy={0} r={r}
                fill="none" stroke="#0f172a"
                strokeWidth={vr * 0.003}
                strokeDasharray={`${vr * 0.015} ${vr * 0.025}`}
              />
              <text
                x={r * 0.707 + vr * 0.01}
                y={-r * 0.707 - vr * 0.005}
                fill="#1e293b" fontSize={vr * 0.055} fontFamily="monospace"
              >{r}km</text>
            </g>
          ))}

          {/* Ejes */}
          <line x1={0} y1={-vr * 0.95} x2={0} y2={vr * 0.95}  stroke="#0f172a" strokeWidth={vr * 0.002} />
          <line x1={-vr * 0.95} y1={0} x2={vr * 0.95} y2={0}  stroke="#0f172a" strokeWidth={vr * 0.002} />

          {/* Límite provincial */}
          {showProv && (
            <circle
              cx={0} cy={0} r={radioProvinciaKm}
              fill={cobertura ? `${mainColor}12` : 'none'}
              stroke="#334155"
              strokeWidth={vr * 0.004}
              strokeDasharray={`${vr * 0.04} ${vr * 0.02}`}
              opacity={0.8}
            />
          )}

          {/* Sweepline */}
          {running && (
            <line
              x1={0} y1={0} x2={sx} y2={sy}
              stroke={mainColor} strokeWidth={vr * 0.006} opacity={0.5}
            />
          )}

          {/* Anillos de alerta */}
          {alertRings.map((r, i) => (
            <circle
              key={i} cx={0} cy={0} r={r}
              fill={`${mainColor}${['0d', '16', '22'][i]}`}
              stroke={mainColor}
              strokeWidth={vr * (i === 2 ? 0.008 : 0.004)}
              opacity={[0.4, 0.65, 1][i]}
              style={{ transition: 'r 1.5s cubic-bezier(.4,0,.2,1)' }}
            />
          ))}

          {/* Etiqueta radio */}
          {running && (
            <text
              x={radioKm * 0.707 + vr * 0.025}
              y={-radioKm * 0.707 - vr * 0.025}
              fill={mainColor} fontSize={vr * 0.07}
              fontFamily="monospace" fontWeight="bold"
            >
              R={radioKm.toFixed(1)}km
            </text>
          )}

          {/* Etiqueta fase */}
          {running && (
            <text
              x={0} y={vr * 0.9}
              fill={cobertura ? mainColor : '#475569'}
              fontSize={vr * 0.055}
              textAnchor="middle" fontFamily="monospace"
              fontWeight={cobertura ? 'bold' : 'normal'}
            >
              {cobertura ? '✓ COBERTURA PROVINCIAL COMPLETA' : faseInfo.label}
            </text>
          )}

          {/* Punto central */}
          <circle cx={0} cy={0} r={vr * 0.025} fill="#ef4444" />
          <circle
            cx={0} cy={0} r={vr * 0.055}
            fill="none" stroke="#ef4444" strokeWidth={vr * 0.005}
            opacity={running ? 0.45 : 0.15}
          />
          <text
            x={0} y={vr * 0.105}
            fill="#ef4444" fontSize={vr * 0.045}
            textAnchor="middle" fontFamily="monospace"
          >PUNTO DE DESAPARICIÓN</text>

          {!running && (
            <text
              x={0} y={vr * 0.35}
              fill="#1e293b" fontSize={vr * 0.07}
              textAnchor="middle" fontFamily="monospace"
            >STANDBY — aguardando activación</text>
          )}
        </svg>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {!running && <Badge text="SIN ACTIVAR" color="#334155" />}
        {running && <Badge text={`FASE ${faseInfo.num}`} color={mainColor} />}
        {running && cobertura && <Badge text="COBERTURA TOTAL" color="#ef4444" blink />}
        {running && faseInfo.num === 1 && <Badge text="ZONA INMEDIATA" color="#06b6d4" />}
        {running && faseInfo.num === 2 && <Badge text="EXPANSIÓN REGIONAL" color="#f59e0b" />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   EXPEDIENTE CARD
───────────────────────────────────────────────────────────────── */
function ExpedienteCard({ nombre, edadNum, genero, provinciaId, hora, fecha, tTranscurrido, running }) {
  const prov   = PROVINCIAS.find(p => p.id === provinciaId);
  const color  = running ? '#f59e0b' : '#334155';
  const estado = running ? 'BÚSQUEDA ACTIVA' : 'EN ESPERA';

  return (
    <Card>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ width: 3, borderRadius: 3, background: color, flexShrink: 0, transition: 'background 0.4s' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 6 }}>
            <div>
              <div style={{ fontSize: 8, letterSpacing: '0.15em', color: '#475569' }}>SIFEBU — EXPEDIENTE</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#f1f5f9' }}>ALERTA SOFÍA</div>
            </div>
            <Badge text={estado} color={color} blink={running} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
            {[
              { l: 'Nombre',    v: nombre || '—' },
              { l: 'Edad',      v: !isNaN(edadNum) && edadNum > 0 ? `${edadNum} años` : '—', warn: edadNum >= 18 },
              { l: 'Género',    v: genero   || '—' },
              { l: 'Provincia', v: prov ? prov.nombre : '—' },
            ].map(({ l, v, warn }) => (
              <div key={l}>
                <div style={{ fontSize: 8, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</div>
                <div style={{
                  fontSize: 11, fontWeight: 600,
                  color: warn ? '#ef4444' : '#f1f5f9',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {v}
                </div>
              </div>
            ))}
          </div>

          {(hora || fecha) && (
            <div style={{
              padding: '6px 8px',
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: 5,
            }}>
              <div style={{ fontSize: 8, color: '#64748b', marginBottom: 2 }}>
                TIEMPO TRANSCURRIDO DESDE DESAPARICIÓN
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: running ? '#ef4444' : '#f59e0b', fontFamily: 'monospace' }}>
                {fmtHMS(tTranscurrido)}
              </div>
            </div>
          )}

          <div style={{ marginTop: 6, fontSize: 8, color: '#1e293b' }}>
            ALERTA·AR v2.1 · SMSC-UNICAST · {new Date().toLocaleDateString('es-AR')}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PANEL DIFUSIÓN MULTICANAL
───────────────────────────────────────────────────────────────── */
function PanelMulticanal({ smsDespachados, provPoblacion }) {
  const META_EST = 500_000;
  const IG_EST   = 200_000;
  const TV_EST   = 2_000_000;
  const total    = smsDespachados + META_EST + IG_EST + TV_EST;
  const inviableMin = Math.round(provPoblacion / 1000 / 60);

  function CanalRow({ label, sub, value, color }) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '5px 8px', borderRadius: 5, marginBottom: 4, minWidth: 0,
        background: 'rgba(15,23,42,0.6)', border: '1px solid #0f172a',
      }}>
        <div style={{ minWidth: 0, marginRight: 8 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
          {sub && <div style={{ fontSize: 8, color: '#475569' }}>{sub}</div>}
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color, fontFamily: 'monospace', flexShrink: 0 }}>
          {fmt(value)}
        </span>
      </div>
    );
  }

  return (
    <Card>
      <SLabel>DIFUSIÓN MULTICANAL — SMS + MEDIOS + REDES</SLabel>
      <CanalRow label="SMS Unicast Despachados"  sub="SMSC · QoS activa"  value={smsDespachados} color="#22c55e" />
      <CanalRow label="Redes Meta / ICMEC"        sub="est. a los 5 min"   value={META_EST}       color="#3b82f6" />
      <CanalRow label="Instagram institucional"   sub="est. a los 5 min"   value={IG_EST}         color="#a855f7" />
      <CanalRow label="TV y Radio adheridos"      sub="est. a los 10 min"  value={TV_EST}         color="#f59e0b" />

      <div style={{
        marginTop: 8, padding: '6px 8px',
        background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>TOTAL NOTIFICADOS</span>
        <span style={{ fontSize: 13, fontWeight: 900, color: '#22c55e', fontFamily: 'monospace' }}>{fmt(total)}</span>
      </div>

      <div style={{
        marginTop: 6, padding: '5px 8px',
        background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 5,
        fontSize: 9, color: '#94a3b8', lineHeight: 1.5,
      }}>
        Cobertura masiva Unicast <strong style={{ color: '#ef4444' }}>sin QoS</strong>:{' '}
        <strong style={{ color: '#ef4444' }}>{inviableMin} min</strong> (inviable en tiempo real)
      </div>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────
   CONSOLA TÁCTICA
───────────────────────────────────────────────────────────────── */
function ConsolaTactica({ logs }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        fontSize: 9, letterSpacing: '0.2em', color: '#16a34a',
        padding: '7px 12px', borderBottom: '1px solid #0f172a',
        background: 'rgba(0,0,0,0.5)',
      }}>
        CONSOLA TÁCTICA — SIFEBU
      </div>
      <div
        ref={scrollRef}
        style={{
          background: '#000', height: 130, overflowY: 'auto',
          padding: '8px 10px', fontFamily: 'monospace', fontSize: 10, lineHeight: 1.6,
        }}
      >
        {logs.length === 0 && (
          <span style={{ color: '#16a34a', opacity: 0.35 }}>
            Esperando activación...<span style={{ animation: 'poc-cursor 1s infinite' }}>_</span>
          </span>
        )}
        {logs.map((line, i) => (
          <div
            key={i}
            style={{
              color: line.startsWith('[VLR') ? '#f59e0b' : '#22c55e',
              marginBottom: 1, wordBreak: 'break-word',
            }}
          >
            {line}
          </div>
        ))}
        {logs.length > 0 && (
          <span style={{ color: '#16a34a', animation: 'poc-cursor 1s infinite' }}>_</span>
        )}
      </div>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────
   COMPONENTE PRINCIPAL
───────────────────────────────────────────────────────────────── */
const GeovalladoPoc = () => {
  /* Formulario */
  const [nombre,      setNombre]      = useState('');
  const [edad,        setEdad]        = useState('');
  const [genero,      setGenero]      = useState('');
  const [provinciaId, setProvinciaId] = useState('');
  const [hora,        setHora]        = useState('');
  const [fecha,       setFecha]       = useState('');
  const [contexto,    setContexto]    = useState('ciudad_grande');

  /* Simulación */
  const [running,        setRunning]        = useState(false);
  const [elapsed,        setElapsed]        = useState(0);
  const [tTranscurrido,  setTTranscurrido]  = useState(0);
  const [smsDespachados, setSmsDespachados] = useState(0);
  const [logs,           setLogs]           = useState([]);

  const clockRef  = useRef(null);
  const simRef    = useRef(null);
  const loggedRef = useRef({});

  /* Datos derivados */
  const edadNum       = parseInt(edad, 10);
  const edadInvalida  = !isNaN(edadNum) && edadNum > 0 && edadNum >= 18;
  const prov          = PROVINCIAS.find(p => p.id === provinciaId);
  const r0            = getR0(contexto);
  const radioKm       = calcRadioExp(tTranscurrido, r0);
  const radioProvKm   = prov ? prov.radioProvinciaKm : 300;
  const provPoblacion = prov ? prov.poblacion : 1_000_000;
  const faseInfo      = getFaseInfo(radioKm, radioProvKm);
  const puedeIniciar  = !edadInvalida && !running && !!nombre.trim() && !!provinciaId && !!hora && !!fecha && !!genero;

  /* Reloj en vivo */
  useEffect(() => {
    clearInterval(clockRef.current);
    if (!hora || !fecha) { setTTranscurrido(0); return; }
    const tick = () => setTTranscurrido(calcTTranscurrido(fecha, hora));
    tick();
    clockRef.current = setInterval(tick, 1000);
    return () => clearInterval(clockRef.current);
  }, [hora, fecha]);

  /* Simulación QoS */
  function iniciar() {
    if (!puedeIniciar) return;

    const pop    = prov ? prov.poblacion : 1_000_000;
    const invMin = Math.round(pop / 1000 / 60);

    setRunning(true);
    setElapsed(0);
    setSmsDespachados(0);
    setLogs([]);
    loggedRef.current = {};

    simRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;

        if (!loggedRef.current.p0start) {
          loggedRef.current.p0start = true;
          setLogs(l => [...l,
            '[SYS] Alerta Sofía activada. Expediente cargado en SIFEBU.',
            `[SYS] priority_flag=0: Procesando Fuerzas de Seguridad (${fmt(P0_SMS)} SMS)...`,
          ]);
        }
        if (next >= P0_SECS && !loggedRef.current.p1start) {
          loggedRef.current.p1start = true;
          setLogs(l => [...l,
            `[SYS] priority_flag=0: Completado en ${P0_SECS}s.`,
            '[VLR-MOCK] Simulación de respuesta VLR: 40.000 dispositivos en celdas activas (zona de escape).',
            '[SYS] priority_flag=1: Iniciando Geovallado Táctico...',
          ]);
        }
        if (next >= P01_SECS && !loggedRef.current.p2start) {
          loggedRef.current.p2start = true;
          setLogs(l => [...l,
            `[SYS] priority_flag=1: Completado en ${P1_SECS}s.`,
            `[SYS] priority_flag=2: Iniciando difusión provincial en background (${fmt(pop)} SMS)...`,
            `[SYS] Estimación difusión total: ${invMin} minutos. Sistema estable.`,
          ]);
        }

        const qos = calcQoS(next, pop);
        setSmsDespachados(qos.dispatched);
        return next;
      });
    }, 1000);
  }

  function resetear() {
    clearInterval(simRef.current);
    setRunning(false);
    setElapsed(0);
    setSmsDespachados(0);
    setLogs([]);
    loggedRef.current = {};
  }

  useEffect(() => () => {
    clearInterval(simRef.current);
    clearInterval(clockRef.current);
  }, []);

  const qos            = calcQoS(elapsed, provPoblacion);
  const estadoRedColor = qos.priorityFlag <= 1 ? '#22c55e' : '#f59e0b';

  /* Estilos de inputs/selects/labels scoped al wrapper para no pisar Tailwind */
  const scopedStyles = `
    .poc-geovallado input,
    .poc-geovallado select {
      background: rgba(15,23,42,0.95);
      border: 1px solid #1e293b;
      color: #f1f5f9;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 12px;
      width: 100%;
      outline: none;
      font-family: inherit;
      transition: border-color 0.2s;
    }
    .poc-geovallado input:focus,
    .poc-geovallado select:focus { border-color: #3b82f6; }
    .poc-geovallado input:disabled,
    .poc-geovallado select:disabled { opacity: 0.4; cursor: not-allowed; }
    .poc-geovallado select option { background: #0f172a; }
    .poc-geovallado label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #64748b;
      display: block;
      margin-bottom: 4px;
    }
    .poc-geovallado ::-webkit-scrollbar { width: 4px; }
    .poc-geovallado ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
    .poc-geovallado ::-webkit-scrollbar-track { background: transparent; }
    @keyframes poc-blink  { 0%,100%{ opacity:1 } 50%{ opacity:0.2 } }
    @keyframes poc-cursor { 0%,100%{ opacity:1 } 50%{ opacity:0   } }
  `;

  return (
    <>
      <style>{scopedStyles}</style>

      <div
        className="poc-geovallado"
        style={{
          background: '#020617',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f1f5f9',
          fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{
          textAlign: 'center', padding: '8px 24px 7px', flexShrink: 0,
          borderBottom: '1px solid #0f172a', background: 'rgba(2,6,23,0.95)',
        }}>
          <div style={{ fontSize: 8, letterSpacing: '0.35em', color: '#334155', marginBottom: 2 }}>
            PRUEBA DE CONCEPTO · UTN FRSF · INVESTIGACIÓN TECNOLÓGICA 2024
          </div>
          <h1 style={{ fontSize: 19, fontWeight: 900, letterSpacing: '0.04em', color: '#f1f5f9', lineHeight: 1.1 }}>
            ALERTA SOFÍA &nbsp;·&nbsp; SMSC UNICAST + QoS
          </h1>
        </div>

        {/* Cuerpo principal */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* ── PANEL IZQUIERDO 40% ── */}
          <div style={{
            width: '40%', overflowY: 'auto', borderRight: '1px solid #0f172a',
            padding: 12, display: 'flex', flexDirection: 'column', gap: 10,
          }}>

            {/* Formulario */}
            <Card>
              <SLabel>DATOS DEL EXPEDIENTE</SLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                <div>
                  <label>Nombre completo</label>
                  <input
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    disabled={running}
                    placeholder="Ej: Sofía Martínez"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label>Edad</label>
                    <input
                      type="number" min={0} max={99}
                      value={edad}
                      onChange={e => setEdad(e.target.value)}
                      disabled={running}
                      placeholder="Años"
                    />
                  </div>
                  <div>
                    <label>Género</label>
                    <select value={genero} onChange={e => setGenero(e.target.value)} disabled={running}>
                      <option value="">Seleccionar...</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>

                {edadInvalida && (
                  <div style={{
                    padding: '6px 10px', background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.4)',
                    borderRadius: 6, fontSize: 10, color: '#ef4444', lineHeight: 1.4,
                  }}>
                    El protocolo aplica estrictamente a menores de 18 años
                  </div>
                )}

                <div>
                  <label>Provincia</label>
                  <select value={provinciaId} onChange={e => setProvinciaId(e.target.value)} disabled={running}>
                    <option value="">Seleccionar...</option>
                    {PROVINCIAS.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label>Hora de desaparición</label>
                    <input type="time" value={hora} onChange={e => setHora(e.target.value)} disabled={running} />
                  </div>
                  <div>
                    <label>Fecha de desaparición</label>
                    <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} disabled={running} />
                  </div>
                </div>

                <div>
                  <label>Tipo de contexto</label>
                  <select value={contexto} onChange={e => setContexto(e.target.value)} disabled={running}>
                    {CONTEXTOS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                  <button
                    onClick={iniciar}
                    disabled={!puedeIniciar}
                    style={{
                      flex: 1, padding: '9px 0',
                      background: puedeIniciar ? 'rgba(34,197,94,0.15)' : 'rgba(30,41,59,0.4)',
                      border: `1px solid ${puedeIniciar ? '#22c55e' : '#1e293b'}`,
                      color: puedeIniciar ? '#22c55e' : '#475569',
                      borderRadius: 7, fontSize: 11, fontWeight: 800,
                      letterSpacing: '0.1em', cursor: puedeIniciar ? 'pointer' : 'not-allowed',
                      textTransform: 'uppercase', fontFamily: 'inherit', transition: 'all 0.2s',
                    }}
                  >
                    {running ? '● ALERTA ACTIVA' : 'INICIAR ALERTA'}
                  </button>
                  {running && (
                    <button
                      onClick={resetear}
                      style={{
                        padding: '9px 14px',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.4)',
                        color: '#ef4444', borderRadius: 7, fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      RESET
                    </button>
                  )}
                </div>
              </div>
            </Card>

            {/* Expediente */}
            <ExpedienteCard
              nombre={nombre} edadNum={edadNum} genero={genero}
              provinciaId={provinciaId} hora={hora} fecha={fecha}
              tTranscurrido={tTranscurrido} running={running}
            />

            {/* Telemetría */}
            <Card>
              <SLabel>TELEMETRÍA SMSC EN TIEMPO REAL</SLabel>
              <TRow label="TPS configurado"    value="1.000 msg/s"                                               color="#3b82f6" />
              <TRow label="Cola activa"         value={`priority_flag=${qos.priorityFlag}`}                       color={estadoRedColor} />
              <TRow label="SMS encolados"       value={fmt(qos.encolados)}                                        color="#f1f5f9" />
              <TRow label="SMS despachados"     value={fmt(smsDespachados)}                                       color="#22c55e" />
              <TRow label="Latencia estimada"   value={`${qos.latenciaSeg.toFixed(1)} seg`}                       color={qos.latenciaSeg > 120 ? '#ef4444' : '#22c55e'} />
              <TRow label="Estado de red"       value={qos.priorityFlag <= 1 ? 'PRIORIDAD ALTA' : 'BACKGROUND'}  color={estadoRedColor} />
              <TRow label="Radio R(t)"          value={`${radioKm.toFixed(2)} km`}                               color="#3b82f6" />
              <TRow label="Fase"                value={faseInfo.label.split('—')[0].trim()}                       color={faseInfo.color} />
              <TRow label="Tiempo transcurrido" value={fmtHM(tTranscurrido)}                                      color="#94a3b8" />
            </Card>

            {/* Consola táctica */}
            <ConsolaTactica logs={logs} />

          </div>

          {/* ── PANEL DERECHO 60% ── */}
          <div style={{
            width: '60%', display: 'flex', flexDirection: 'column',
            padding: 12, gap: 10, minHeight: 0,
          }}>

            {/* Radar */}
            <Card style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <Radar
                radioKm={radioKm}
                radioProvinciaKm={radioProvKm}
                faseInfo={faseInfo}
                running={running}
                elapsed={elapsed}
              />
            </Card>

            {/* Panel multicanal */}
            <PanelMulticanal smsDespachados={smsDespachados} provPoblacion={provPoblacion} />

          </div>

        </div>
      </div>
    </>
  );
};

export default GeovalladoPoc;
