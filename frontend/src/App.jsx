
import { useState, useEffect, useRef } from 'react';

/* ══════════════════════════════════════════════════════════════════════════
   ALERTA SOFÍA — SIMULADOR UNICAST / GEOVALLADO TÁCTICO / QoS
   Investigación Tecnológica UTN FRSF 2024-2025
   Ref: Res. ENACOM 1387/2025 · Res. Min. Seg. 208/2019 · Ley 26.061
   SMPP v3.4 · GSMA IR.33 · INDEC Censo 2022
══════════════════════════════════════════════════════════════════════════ */

// ── Constantes SMSC ──────────────────────────────────────────────────────
const SMSC_TPS = 3_000;   // Contrato B2B enterprise Estado-Agregador

// ── Constantes SMS por tipo de infraestructura (Geovallado P1) ──────────
const SMS_PEAJE      = 150;
const SMS_TERMINAL   = 800;
const SMS_AEROPUERTO = 1_200;
const SMS_PUERTO     = 400;

// ── Modelo difusión logística de Bass ────────────────────────────────────
const CAU_META   = 0.15;
const CAU_IG     = 0.10;
const CAU_TV     = 0.60;
const K_META     = 4;
const K_IG       = 4;
const K_TV       = 3;
const TV_LAT_MIN = 5;
const MULTIPLICADOR = 1;  // 1 seg real = 1 seg del reloj
const SIM_ACCEL     = MULTIPLICADOR;
const TICK_MS       = 100;
const SEGUNDOS_SIMULADOS_POR_TICK = (TICK_MS / 1000) * MULTIPLICADOR;

// ── Modelo expansión territorial ─────────────────────────────────────────
const LAMBDA = 0.835;     // λ = 0.835 h⁻¹ → T₂ ≈ 50 min

/* ══════════════════════════════════════════════════════════════════════════
   DIRECTIVA 1 — CÁLCULO TIEMPO TRANSCURRIDO (función exacta)
══════════════════════════════════════════════════════════════════════════ */
const calcularTHoras = (fecha, hora) => {
  if (!fecha || !hora) return 0;
  const iso = fecha + 'T' + hora + ':00';
  const desaparicion = new Date(iso);
  if (isNaN(desaparicion.getTime())) return 0;
  const diffMs = new Date().getTime() - desaparicion.getTime();
  return diffMs > 0 ? diffMs / 3600000 : 0;
};

/* ══════════════════════════════════════════════════════════════════════════
   DIRECTIVA 2 — 24 JURISDICCIONES CON EFECTIVOS E INFRAESTRUCTURA EXACTOS
   Fuente efectivos: Min. Seguridad Nación · Fuente infra: VIALIDAD/CNRT/ANAC/AGP
   Población: INDEC Censo 2022
══════════════════════════════════════════════════════════════════════════ */
const PROVINCIAS = [
  {
    nombre: 'Buenos Aires', poblacion: 17521141, radioKm: 312,
    efectivos: { policia: 54000, gendarmeria: 22500, sifebu: 13500 },
    infra: { peajes: 47, terminales: 8, aeropuertos: 3, puertos: 2 },
  },
  {
    nombre: 'CABA', poblacion: 3120612, radioKm: 8,
    efectivos: { policia: 16800, gendarmeria: 7000, sifebu: 4200 },
    infra: { peajes: 12, terminales: 3, aeropuertos: 1, puertos: 1 },
  },
  {
    nombre: 'Catamarca', poblacion: 415438, radioKm: 220,
    efectivos: { policia: 1800, gendarmeria: 750, sifebu: 450 },
    infra: { peajes: 2, terminales: 1, aeropuertos: 1, puertos: 0 },
  },
  {
    nombre: 'Chaco', poblacion: 1204541, radioKm: 200,
    efectivos: { policia: 3000, gendarmeria: 1250, sifebu: 750 },
    infra: { peajes: 4, terminales: 2, aeropuertos: 1, puertos: 0 },
  },
  {
    nombre: 'Chubut', poblacion: 618994, radioKm: 500,
    efectivos: { policia: 2100, gendarmeria: 875, sifebu: 525 },
    infra: { peajes: 4, terminales: 2, aeropuertos: 2, puertos: 1 },
  },
  {
    nombre: 'Córdoba', poblacion: 3978984, radioKm: 300,
    efectivos: { policia: 10800, gendarmeria: 4500, sifebu: 2700 },
    infra: { peajes: 18, terminales: 4, aeropuertos: 1, puertos: 0 },
  },
  {
    nombre: 'Corrientes', poblacion: 1120801, radioKm: 200,
    efectivos: { policia: 2880, gendarmeria: 1200, sifebu: 720 },
    infra: { peajes: 5, terminales: 2, aeropuertos: 1, puertos: 1 },
  },
  {
    nombre: 'Entre Ríos', poblacion: 1385961, radioKm: 200,
    efectivos: { policia: 3300, gendarmeria: 1375, sifebu: 825 },
    infra: { peajes: 8, terminales: 3, aeropuertos: 1, puertos: 2 },
  },
  {
    nombre: 'Formosa', poblacion: 605193, radioKm: 200,
    efectivos: { policia: 1680, gendarmeria: 700, sifebu: 420 },
    infra: { peajes: 2, terminales: 1, aeropuertos: 1, puertos: 0 },
  },
  {
    nombre: 'Jujuy', poblacion: 770881, radioKm: 150,
    efectivos: { policia: 2400, gendarmeria: 1000, sifebu: 600 },
    infra: { peajes: 3, terminales: 2, aeropuertos: 1, puertos: 0 },
  },
  {
    nombre: 'La Pampa', poblacion: 358428, radioKm: 350,
    efectivos: { policia: 1500, gendarmeria: 625, sifebu: 375 },
    infra: { peajes: 3, terminales: 1, aeropuertos: 1, puertos: 0 },
  },
  {
    nombre: 'La Rioja', poblacion: 384607, radioKm: 220,
    efectivos: { policia: 1680, gendarmeria: 700, sifebu: 420 },
    infra: { peajes: 2, terminales: 1, aeropuertos: 1, puertos: 0 },
  },
  {
    nombre: 'Mendoza', poblacion: 2014533, radioKm: 200,
    efectivos: { policia: 4800, gendarmeria: 2000, sifebu: 1200 },
    infra: { peajes: 8, terminales: 3, aeropuertos: 1, puertos: 0 },
  },
  {
    nombre: 'Misiones', poblacion: 1261294, radioKm: 150,
    efectivos: { policia: 2700, gendarmeria: 1125, sifebu: 675 },
    infra: { peajes: 4, terminales: 2, aeropuertos: 1, puertos: 1 },
  },
  {
    nombre: 'Neuquén', poblacion: 664057, radioKm: 300,
    efectivos: { policia: 2400, gendarmeria: 1000, sifebu: 600 },
    infra: { peajes: 5, terminales: 2, aeropuertos: 1, puertos: 0 },
  },
  {
    nombre: 'Río Negro', poblacion: 747610, radioKm: 350,
    efectivos: { policia: 2280, gendarmeria: 950, sifebu: 570 },
    infra: { peajes: 6, terminales: 3, aeropuertos: 2, puertos: 1 },
  },
  {
    nombre: 'Salta', poblacion: 1424397, radioKm: 250,
    efectivos: { policia: 3900, gendarmeria: 1625, sifebu: 975 },
    infra: { peajes: 5, terminales: 2, aeropuertos: 1, puertos: 0 },
  },
  {
    nombre: 'San Juan', poblacion: 781217, radioKm: 200,
    efectivos: { policia: 2100, gendarmeria: 875, sifebu: 525 },
    infra: { peajes: 4, terminales: 1, aeropuertos: 1, puertos: 0 },
  },
  {
    nombre: 'San Luis', poblacion: 508328, radioKm: 200,
    efectivos: { policia: 1500, gendarmeria: 625, sifebu: 375 },
    infra: { peajes: 4, terminales: 1, aeropuertos: 1, puertos: 0 },
  },
  {
    nombre: 'Santa Cruz', poblacion: 274794, radioKm: 600,
    efectivos: { policia: 1200, gendarmeria: 500, sifebu: 300 },
    infra: { peajes: 2, terminales: 2, aeropuertos: 2, puertos: 1 },
  },
  {
    nombre: 'Santa Fe', poblacion: 3536418, radioKm: 250,
    efectivos: { policia: 9600, gendarmeria: 4000, sifebu: 2400 },
    infra: { peajes: 12, terminales: 3, aeropuertos: 2, puertos: 2 },
  },
  {
    nombre: 'Santiago del Estero', poblacion: 978313, radioKm: 250,
    efectivos: { policia: 2700, gendarmeria: 1125, sifebu: 675 },
    infra: { peajes: 4, terminales: 2, aeropuertos: 1, puertos: 0 },
  },
  {
    nombre: 'Tierra del Fuego', poblacion: 187226, radioKm: 200,
    efectivos: { policia: 540, gendarmeria: 225, sifebu: 135 },
    infra: { peajes: 1, terminales: 1, aeropuertos: 1, puertos: 1 },
  },
  {
    nombre: 'Tucumán', poblacion: 1769087, radioKm: 100,
    efectivos: { policia: 4200, gendarmeria: 1750, sifebu: 1050 },
    infra: { peajes: 6, terminales: 2, aeropuertos: 1, puertos: 0 },
  },
];

const CONTEXTOS = [
  { value: 'pueblo',         label: 'Pueblo / Rural',       r0: 20 },
  { value: 'ciudad_mediana', label: 'Ciudad mediana',        r0:  5 },
  { value: 'ciudad_grande',  label: 'Ciudad grande',         r0:  2 },
  { value: 'frontera',       label: 'Zona fronteriza',       r0: 10 },
  { value: 'sin_cobertura',  label: 'Sin cobertura celular', r0: 30 },
];

/* ══════════════════════════════════════════════════════════════════════════
   LÓGICA MATEMÁTICA PURA
══════════════════════════════════════════════════════════════════════════ */

function calcRadioExp(tHoras, r0) {
  return r0 * Math.exp(LAMBDA * tHoras);
}

function getFaseInfo(radioKm, radioProvKm) {
  if (radioKm < 20)          return { num: 1, label: 'FASE 1 — Zona inmediata',      color: '#06b6d4' };
  if (radioKm < radioProvKm) return { num: 2, label: 'FASE 2 — Expansión regional',  color: '#f59e0b' };
  return                            { num: 3, label: 'FASE 3 — Cobertura provincial', color: '#ef4444' };
}

function logisticDiffusion(tSimH, limite, k, offsetH = 0) {
  const t = Math.max(0, tSimH - offsetH);
  return t <= 0 ? 0 : limite * (1 - Math.exp(-k * t));
}

function calcMulticanal(elapsed, pob) {
  const tSimH = elapsed / SIM_ACCEL;
  const tvOff = TV_LAT_MIN / 60;
  const lMeta = CAU_META * pob;
  const lIG   = CAU_IG   * pob;
  const lTV   = CAU_TV   * pob;
  return {
    meta:    Math.round(logisticDiffusion(tSimH, lMeta, K_META)),
    ig:      Math.round(logisticDiffusion(tSimH, lIG,   K_IG)),
    tvRadio: Math.round(logisticDiffusion(tSimH, lTV,   K_TV, tvOff)),
    lMeta, lIG, lTV,
    satMeta: Math.min(100, (1 - Math.exp(-K_META * tSimH)) * 100),
    satIG:   Math.min(100, (1 - Math.exp(-K_IG   * tSimH)) * 100),
    satTV:   Math.min(100, (1 - Math.exp(-K_TV * Math.max(0, tSimH - tvOff))) * 100),
  };
}

// calcQoS — firma dinámica: P0 y P1 varían por provincia
function calcQoS(elapsed, pob, p0Total, tiempoP0, p1Total, tiempoP1) {
  const tP01  = tiempoP0 + tiempoP1;
  const total = p0Total + p1Total + pob;
  let dispatched, flag;
  if (elapsed <= tiempoP0) {
    dispatched = Math.min(elapsed * SMSC_TPS, p0Total); flag = 0;
  } else if (elapsed <= tP01) {
    dispatched = p0Total + Math.min((elapsed - tiempoP0) * SMSC_TPS, p1Total); flag = 1;
  } else {
    dispatched = p0Total + p1Total + Math.min((elapsed - tP01) * SMSC_TPS, pob); flag = 2;
  }
  return {
    dispatched,
    p0d: Math.min(dispatched, p0Total),
    p1d: Math.max(0, Math.min(dispatched - p0Total, p1Total)),
    p2d: Math.max(0, dispatched - p0Total - p1Total),
    encolados:   Math.max(0, total - dispatched),
    latenciaSeg: Math.max(0, total - dispatched) / SMSC_TPS,
    flag, total,
  };
}

function estimarDispositivosVLR(radioKm, radioProvKm, pob) {
  const frac = Math.min(1, (radioKm * radioKm) / (radioProvKm * radioProvKm));
  return Math.round(pob * frac * 0.80);
}

/* ══════════════════════════════════════════════════════════════════════════
   HELPERS DE FORMATO
══════════════════════════════════════════════════════════════════════════ */
const fmt    = n => Math.round(n).toLocaleString('es-AR');
const fmtK   = n => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
                  : n >= 1_000     ? `${(n / 1_000).toFixed(1)}k`
                  : String(Math.round(n));
const fmtPct = p => `${Math.min(100, Math.max(0, p)).toFixed(1)}%`;

function fmtHMS(tHoras) {
  if (tHoras <= 0) return '00h 00m 00s';
  const h = Math.floor(tHoras);
  const minutosTotales = (tHoras - h) * 60;
  const m = Math.floor(minutosTotales);
  const s = Math.floor((minutosTotales - m) * 60);
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

function fmtHM(tHoras) {
  if (tHoras <= 0) return '0m';
  const h = Math.floor(tHoras);
  const m = Math.floor((tHoras - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Convierte segundos enteros → "HHh MMm SSs" (fuente única de display del timer)
function fmtSegHMS(seg) {
  const s = Math.max(0, Math.floor(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`;
}

// DD/MM/YYYY — solo para visualización, nunca para cálculo
function fmtFechaDisplay(fechaISO) {
  if (!fechaISO) return '—';
  const [y, mo, d] = fechaISO.split('-');
  if (!y || !mo || !d) return '—';
  return `${d}/${mo}/${y}`;
}

function smartGridStep(vr) {
  if (vr <  10)  return 2;
  if (vr <  50)  return 10;
  if (vr < 200)  return 50;
  if (vr < 500)  return 100;
  return 200;
}

/* ══════════════════════════════════════════════════════════════════════════
   COMPONENTES ATÓMICOS
══════════════════════════════════════════════════════════════════════════ */

function Card({ children, style: extra = {}, accent }) {
  return (
    <div style={{
      background:   'rgba(8,14,26,0.98)',
      border:       '1px solid rgba(30,41,59,0.6)',
      borderLeft:   accent ? `3px solid ${accent}` : '1px solid rgba(30,41,59,0.6)',
      borderRadius: 6,
      padding:      12,
      minWidth:     0,
      boxShadow:    '0 2px 12px rgba(0,0,0,0.4)',
      ...extra,
    }}>
      {children}
    </div>
  );
}

function SLabel({ children, color, mb = 8 }) {
  return (
    <div style={{
      fontSize:      9,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color:         color || '#475569',
      marginBottom:  mb,
      fontWeight:    600,
    }}>
      {children}
    </div>
  );
}

function Badge({ text, color, blink }) {
  return (
    <span style={{
      fontSize:      8,
      fontWeight:    700,
      letterSpacing: '0.1em',
      color,
      border:        `1px solid ${color}60`,
      borderRadius:  3,
      padding:       '2px 6px',
      whiteSpace:    'nowrap',
      display:       'inline-block',
      animation:     blink ? 'blink 1.4s infinite' : 'none',
    }}>
      {text}
    </span>
  );
}

function SatBar({ label, value, limite, sat, color }) {
  const pct = Math.min(100, Math.max(0, sat));
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:3, gap:4 }}>
        <span style={{ fontSize:9.5, color:'#94a3b8', flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {label}
        </span>
        <span style={{ fontSize:10, fontWeight:800, color, fontFamily:'monospace', flexShrink:0 }}>
          {fmtK(value)}<span style={{ fontSize:7, color:'#475569', fontWeight:400 }}> /{fmtK(limite)}</span>
        </span>
        <span style={{ fontSize:8, color:'#334155', flexShrink:0, minWidth:34, textAlign:'right' }}>
          {fmtPct(pct)}
        </span>
      </div>
      <div style={{ height:4, background:'#0f172a', borderRadius:2, overflow:'hidden' }}>
        <div style={{
          height:'100%', width:`${pct}%`, background:color, borderRadius:2,
          transition:'width 0.9s cubic-bezier(.4,0,.2,1)',
          boxShadow:`0 0 6px ${color}66`,
        }}/>
      </div>
    </div>
  );
}

function InfoRow({ label, value, warn, mono }) {
  return (
    <div>
      <div style={{ fontSize:7.5, color:'#475569', textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</div>
      <div style={{
        fontSize:     10.5,
        fontWeight:   600,
        color:        warn ? '#ef4444' : '#f1f5f9',
        fontFamily:   mono ? 'monospace' : 'inherit',
        overflow:     'hidden',
        textOverflow: 'ellipsis',
        whiteSpace:   'nowrap',
      }}>
        {value || '—'}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   BANNER DE ALERTA — 3 NIVELES
══════════════════════════════════════════════════════════════════════════ */
function BannerAlerta({ isSimulating, faseInfo, radioKm, t_horas_decimal, provNom }) {
  if (!isSimulating) return null;
  const { num, color } = faseInfo;
  const text =
    num === 1
      ? `⚡ ALERTA SOFÍA ACTIVA — Búsqueda local en curso · Radio: ${radioKm.toFixed(1)} km · ${fmtHM(t_horas_decimal)} transcurridas`
      : num === 2
        ? `⚠ ALERTA SOFÍA — Expansión regional activa · Radio: ${radioKm.toFixed(1)} km · Tiempo: ${fmtHM(t_horas_decimal)}`
        : `🚨 PROTOCOLO PROVINCIAL ACTIVO — Cobertura total ${provNom || 'provincia'} · Coordinar con fuerzas interprovinciales`;
  return (
    <div style={{
      flexShrink:   0,
      padding:      '6px 20px',
      display:      'flex',
      alignItems:   'center',
      gap:          8,
      borderBottom: `2px solid ${color}55`,
      background:   `${color}0e`,
      animation:    num === 3 ? 'breach-flash 1.8s ease-in-out infinite' : 'none',
    }}>
      <span style={{ fontSize:11, color, fontWeight:800, letterSpacing:'0.05em' }}>{text}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   RADAR SVG DINÁMICO
══════════════════════════════════════════════════════════════════════════ */
function Radar({ radioKm, radioProvKm, faseInfo, isSimulating, tiempoTranscurridoSegundos }) {
  const vr      = radioProvKm * 1.18;
  const step    = smartGridStep(vr);
  const vb      = `${-vr} ${-vr} ${vr * 2} ${vr * 2}`;
  const mc      = faseInfo.color;
  const cob     = faseInfo.num >= 3;

  const gridRings = [];
  for (let r = step; r <= vr * 1.02; r += step) gridRings.push(r);

  // sweepDeg: 1 giro completo por cada 60 s reales (= SIM_ACCEL ticks)
  const elapsedReal = tiempoTranscurridoSegundos / SIM_ACCEL;
  const sweepDeg = (elapsedReal * 6) % 360;
  const sweepRad = (sweepDeg - 90) * Math.PI / 180;
  const sx = vr * Math.cos(sweepRad);
  const sy = vr * Math.sin(sweepRad);
  const alertRings = isSimulating ? [radioKm * 0.33, radioKm * 0.66, radioKm] : [];

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1, minHeight:0 }}>
      <div style={{ fontSize:9, letterSpacing:'0.2em', color:'#334155', marginBottom:5, textTransform:'uppercase' }}>
        RADAR DINÁMICO — ZONA DE ALERTA
        <span style={{ marginLeft:8, color:'#1e293b' }}>R(t)=R₀·e^(λt) · tope=R_prov · λ={LAMBDA}h⁻¹</span>
      </div>
      <div style={{ flex:1, minHeight:0, width:'100%', overflow:'hidden' }}>
        <svg viewBox={vb} style={{ width:'100%', height:'100%' }}>
          <rect x={-vr} y={-vr} width={vr * 2} height={vr * 2} fill="#020617"/>
          {gridRings.map(r => (
            <g key={r}>
              <circle cx={0} cy={0} r={r} fill="none" stroke="#0f172a"
                strokeWidth={vr * 0.003} strokeDasharray={`${vr * 0.015} ${vr * 0.025}`}/>
              <text x={r * 0.707 + vr * 0.01} y={-r * 0.707 - vr * 0.005}
                fill="#1e293b" fontSize={vr * 0.052} fontFamily="monospace">{r}km</text>
            </g>
          ))}
          <line x1={0} y1={-vr * 0.95} x2={0} y2={vr * 0.95}  stroke="#0f172a" strokeWidth={vr * 0.002}/>
          <line x1={-vr * 0.95} y1={0}  x2={vr * 0.95} y2={0}  stroke="#0f172a" strokeWidth={vr * 0.002}/>
          <circle cx={0} cy={0} r={radioProvKm}
            fill={cob ? `${mc}18` : 'none'} stroke={mc}
            strokeWidth={vr * (cob ? 0.007 : 0.004)}
            strokeDasharray={cob ? 'none' : `${vr * 0.04} ${vr * 0.02}`}
            opacity={0.9}/>
          <text x={radioProvKm * 0.707 + vr * 0.01} y={-radioProvKm * 0.707 - vr * 0.008}
            fill={cob ? mc : '#475569'} fontSize={vr * 0.045}
            fontFamily="monospace" fontWeight={cob ? 'bold' : 'normal'}>
            {cob ? 'COBERTURA COMPLETA' : 'LÍMITE PROV.'}
          </text>
          {isSimulating && !cob && (
            <line x1={0} y1={0} x2={sx} y2={sy} stroke={mc} strokeWidth={vr * 0.006} opacity={0.4}/>
          )}
          {alertRings.map((r, i) => (
            <circle key={i} cx={0} cy={0} r={r}
              fill={`${mc}${['0d','16','22'][i]}`} stroke={mc}
              strokeWidth={vr * (i === 2 ? 0.008 : 0.004)}
              opacity={[0.4, 0.65, 1][i]}
              style={{ transition:'r 1.5s cubic-bezier(.4,0,.2,1)' }}/>
          ))}
          {isSimulating && (
            <text x={radioKm * 0.707 + vr * 0.022} y={-radioKm * 0.707 - vr * 0.022}
              fill={mc} fontSize={vr * 0.068} fontFamily="monospace" fontWeight="bold">
              R={radioKm.toFixed(1)}km
            </text>
          )}
          {isSimulating && (
            <text x={0} y={vr * 0.88}
              fill={cob ? mc : '#475569'} fontSize={vr * 0.052}
              textAnchor="middle" fontFamily="monospace" fontWeight={cob ? 'bold' : 'normal'}>
              {cob ? '✓ COBERTURA PROVINCIAL COMPLETA' : faseInfo.label}
            </text>
          )}
          <circle cx={0} cy={0} r={vr * 0.025} fill="#ef4444"/>
          <circle cx={0} cy={0} r={vr * 0.055} fill="none" stroke="#ef4444"
            strokeWidth={vr * 0.005} opacity={isSimulating ? 0.45 : 0.15}/>
          <text x={0} y={vr * 0.105} fill="#ef4444" fontSize={vr * 0.043}
            textAnchor="middle" fontFamily="monospace">PUNTO DE DESAPARICIÓN</text>
          {!isSimulating && (
            <text x={0} y={vr * 0.35} fill="#1e293b" fontSize={vr * 0.07}
              textAnchor="middle" fontFamily="monospace">STANDBY — aguardando activación</text>
          )}
        </svg>
      </div>
      <div style={{ display:'flex', gap:6, marginTop:5, flexWrap:'wrap', justifyContent:'center' }}>
        {!isSimulating && <Badge text="SIN ACTIVAR"              color="#334155"/>}
        {isSimulating   && <Badge text={`FASE ${faseInfo.num}`} color={mc}/>}
        {isSimulating && cob && <Badge text="COBERTURA TOTAL"   color="#ef4444" blink/>}
        {isSimulating && faseInfo.num === 1 && <Badge text="ZONA INMEDIATA"     color="#06b6d4"/>}
        {isSimulating && faseInfo.num === 2 && <Badge text="EXPANSIÓN REGIONAL" color="#f59e0b"/>}
        {isSimulating && <Badge text={`t_sim=${fmtHM(tiempoTranscurridoSegundos / 3600)}`} color="#334155"/>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   EXPEDIENTE CARD
══════════════════════════════════════════════════════════════════════════ */
function ExpedienteCard({ nombre, edadNum, genero, provincia, hora, fecha, contexto, r0, relojFormateado, isSimulating }) {
  const color  = isSimulating ? '#f59e0b' : '#334155';
  const ctxObj = CONTEXTOS.find(c => c.value === contexto);
  return (
    <Card accent={color}>
      <div style={{ display:'flex', gap:10 }}>
        <div style={{ width:3, borderRadius:3, background:color, flexShrink:0, transition:'background 0.4s' }}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6, gap:6 }}>
            <div>
              <div style={{ fontSize:8, letterSpacing:'0.15em', color:'#475569' }}>SIFEBU — EXPEDIENTE</div>
              <div style={{ fontSize:12, fontWeight:800, color:'#f1f5f9' }}>ALERTA SOFÍA</div>
            </div>
            <Badge text={isSimulating ? 'BÚSQUEDA ACTIVA' : 'EN ESPERA'} color={color} blink={isSimulating}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 8px', marginBottom:7 }}>
            <InfoRow label="Nombre"       value={nombre || '—'}/>
            <InfoRow label="Edad"         value={!isNaN(edadNum) && edadNum > 0 ? `${edadNum} años` : '—'} warn={edadNum >= 18}/>
            <InfoRow label="Género"       value={genero || '—'}/>
            <InfoRow label="Provincia"    value={provincia?.nombre || '—'}/>
            <InfoRow label="Fecha desap." value={fmtFechaDisplay(fecha)}/>
            <InfoRow label="Hora desap."  value={hora || '—'} mono/>
            <InfoRow label="Contexto"     value={ctxObj?.label || '—'}/>
            <InfoRow label="R₀ inicial"   value={r0 ? `${r0} km` : '—'} mono/>
          </div>
          {hora && fecha && (
            <div style={{
              padding:      '8px 10px',
              background:   isSimulating
                ? 'linear-gradient(135deg, rgba(239,68,68,0.09) 0%, rgba(239,68,68,0.04) 100%)'
                : 'rgba(15,23,42,0.5)',
              border:       `1px solid ${isSimulating ? 'rgba(239,68,68,0.28)' : '#1e293b'}`,
              borderRadius: 6,
              transition:   'all 0.4s',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <div style={{ fontSize:8, color:'#64748b', letterSpacing:'0.12em', textTransform:'uppercase', fontWeight:600 }}>
                  ⏱ Tiempo en alerta
                </div>
                {isSimulating && (
                  <span style={{ fontSize:7, color:'#06b6d4', border:'1px solid rgba(6,182,212,0.3)', borderRadius:3, padding:'1px 5px' }}>
                    SIM
                  </span>
                )}
              </div>
              <div className={`timer-display ${isSimulating ? 'timer-active' : 'timer-idle'}`}>
                {isSimulating ? relojFormateado : fmtSegHMS(0)}
              </div>
            </div>
          )}
          {provincia && (
            <div style={{ marginTop:5, fontSize:8, color:'#1e293b', lineHeight:1.5 }}>
              Pob. INDEC 2022: {fmt(provincia.poblacion)} · R_prov={provincia.radioKm} km
            </div>
          )}
          <div style={{ fontSize:7.5, color:'#0f172a', marginTop:3 }}>
            AlertAR v2.3 · SMSC-UNICAST · SMPP v3.4 · {new Date().toLocaleDateString('es-AR')}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PANEL QoS — SMSC UNICAST · datos dinámicos por provincia
   Badges: sin borde, fondos oscuros (sin verde)
══════════════════════════════════════════════════════════════════════════ */
function PanelQoS({ provincia, totalEfectivos, destinatariosP1, tiempoP0, tiempoP1, tP01, provPoblacion, elapsedReal, qos }) {
  const p0Done   = tiempoP0 > 0 && elapsedReal >= tiempoP0;
  const p1Done   = tP01 > 0 && elapsedReal >= tP01;
  const p2Active = tP01 > 0 && elapsedReal >  tP01;
  const p2Rem    = Math.max(0, provPoblacion - qos.p2d);
  const p2EtaMin = p2Rem > 0 ? Math.ceil(p2Rem / SMSC_TPS / 60) : 0;
  const p2Pct    = provPoblacion > 0 ? Math.min(100, (qos.p2d / provPoblacion) * 100) : 0;
  const invMin   = Math.round(provPoblacion / SMSC_TPS / 60);

  // Estilos de badge sin borde, fondos oscuros
  const badgeCompletado = {
    background:'#14532d', color:'#86efac', padding:'2px 8px',
    borderRadius:4, fontSize:8, fontWeight:700, whiteSpace:'nowrap',
  };
  const badgeEnviando = {
    background:'#713f12', color:'#fde68a', padding:'2px 8px',
    borderRadius:4, fontSize:8, fontWeight:700, whiteSpace:'nowrap',
    animation:'blink 1.5s infinite',
  };
  const badgeEspera = {
    background:'#1e293b', color:'#64748b', padding:'2px 8px',
    borderRadius:4, fontSize:8, fontWeight:700, whiteSpace:'nowrap',
  };

  const blockStyle = (borderColor, active) => ({
    marginBottom: 8,
    padding:      9,
    borderRadius: 6,
    background:   `${borderColor}07`,
    border:       `1px solid ${active ? borderColor + '40' : '#1e293b'}`,
    transition:   'border-color 0.5s',
  });

  return (
    <Card accent="#06b6d4">
      <SLabel>
        COLAS QoS — SMSC UNICAST · SMPP v3.4 · 3.000 TPS — Contrato B2B enterprise Estado-Agregador
      </SLabel>

      {/* ── P0 — Fuerzas de Seguridad ── */}
      <div style={blockStyle('#22c55e', p0Done || elapsedReal > 0)}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4, gap:6 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#f1f5f9', lineHeight:1.2 }}>
              PRIORIDAD MÁXIMA — Fuerzas de Seguridad
            </div>
            <div style={{ fontSize:10, color:'#64748b', fontFamily:'monospace', marginTop:2 }}>
              SMPP v3.4 · {fmt(totalEfectivos)} SMS · {tiempoP0}s
            </div>
          </div>
          <div>
            {p0Done
              ? <span style={badgeCompletado}>COMPLETADO {tiempoP0}s ✓</span>
              : elapsedReal > 0
                ? <span style={badgeEnviando}>ENVIANDO...</span>
                : <span style={badgeEspera}>EN ESPERA</span>}
          </div>
        </div>

        {provincia && [
          ['Policía provincial',              provincia.efectivos.policia],
          ['Gendarmería Nacional (zona)',      provincia.efectivos.gendarmeria],
          ['SIFEBU + Fiscalía interviniente',  provincia.efectivos.sifebu],
        ].map(([lbl, sms]) => (
          <div key={lbl} style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#64748b', marginBottom:2, paddingLeft:6 }}>
            <span>· {lbl}</span>
            <span style={{ fontFamily:'monospace', color:'#94a3b8' }}>{fmt(sms)}</span>
          </div>
        ))}

        <div style={{ marginTop:5, fontSize:8, color:'#334155' }}>
          Est. proporcional · Fuente: Min. Seguridad Nación · Censo INDEC 2022
        </div>
        {p0Done && (
          <div style={{ height:3, background:'#22c55e', borderRadius:'0 0 8px 8px', width:'100%', marginTop:8 }} />
        )}
      </div>

      {/* ── P1 — Geovallado Táctico ── */}
      <div style={blockStyle('#06b6d4', p1Done || elapsedReal >= tiempoP0)}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4, gap:6 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#f1f5f9', lineHeight:1.2 }}>
              PRIORIDAD ALTA — Geovallado Táctico
            </div>
            <div style={{ fontSize:10, color:'#64748b', fontFamily:'monospace', marginTop:2 }}>
              SMPP v3.4 · {fmt(destinatariosP1)} SMS · {tiempoP1}s
            </div>
          </div>
          <div>
            {p1Done
              ? <span style={badgeCompletado}>COMPLETADO {tiempoP1}s ✓</span>
              : elapsedReal >= tiempoP0
                ? <span style={badgeEnviando}>ENVIANDO...</span>
                : <span style={badgeEspera}>EN ESPERA</span>}
          </div>
        </div>

        {provincia && [
          ['Peajes / rutas de escape',          provincia.infra.peajes,      SMS_PEAJE],
          ['Terminales de ómnibus/transporte',  provincia.infra.terminales,  SMS_TERMINAL],
          ['Aeropuertos y accesos viales',      provincia.infra.aeropuertos, SMS_AEROPUERTO],
          ['Puertos fluviales/marítimos',       provincia.infra.puertos,     SMS_PUERTO],
        ]
          .filter(([, count]) => count > 0)
          .map(([lbl, count, smsPer]) => (
            <div key={lbl} style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#64748b', marginBottom:2, paddingLeft:6 }}>
              <span>· {lbl} ({count})</span>
              <span style={{ fontFamily:'monospace', color:'#94a3b8' }}>{fmt(count * smsPer)}</span>
            </div>
          ))}

        <div style={{ marginTop:5, fontSize:8, color:'#334155' }}>
          Infraestructura: VIALIDAD NACIONAL · CNRT · ANAC · AGP/PNA
        </div>
        {p1Done && (
          <div style={{ height:3, background:'#22c55e', borderRadius:'0 0 8px 8px', width:'100%', marginTop:8 }} />
        )}
      </div>

      {/* ── P2 — Difusión Provincial Background ── */}
      <div style={blockStyle('#f59e0b', p2Active)}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4, gap:6 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#f1f5f9', lineHeight:1.2 }}>
              DIFUSIÓN PROVINCIAL — Background
            </div>
            <div style={{ fontSize:10, color:'#64748b', fontFamily:'monospace', marginTop:2 }}>
              SMPP v3.4 · {fmtK(provPoblacion)} SMS · ETA: ~{Math.round(provPoblacion / SMSC_TPS / 60)} min
            </div>
          </div>
          <div>
            {p2Active
              ? p2Rem > 0
                ? <span style={badgeEnviando}>EN CURSO</span>
                : <span style={badgeCompletado}>COMPLETADO ✓</span>
              : <span style={badgeEspera}>EN ESPERA</span>}
          </div>
        </div>

        <div style={{ fontSize:9, color:'#94a3b8', marginBottom:6 }}>
          {p2Active
            ? <>
                <strong style={{ color:'#f59e0b', fontFamily:'monospace' }}>{fmt(qos.p2d)}</strong>
                {' '}de {fmtK(provPoblacion)} SMS despachados
                {p2Rem > 0   && <span style={{ color:'#f59e0b' }}> · ETA: ~{p2EtaMin} min</span>}
                {p2Rem === 0 && <span style={{ color:'#86efac' }}> · COMPLETADO</span>}
              </>
            : <span style={{ color:'#334155' }}>Iniciará al completar P1 (t={tP01}s)</span>}
        </div>

        <div style={{ height:5, background:'#0f172a', borderRadius:3, overflow:'hidden' }}>
          <div style={{
            height:'100%', width:`${p2Pct}%`, background:'#f59e0b',
            borderRadius:3, transition:'width 0.5s linear', boxShadow:'0 0 6px #f59e0b66',
          }}/>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:8, color:'#334155', marginTop:3 }}>
          <span>0</span>
          <span style={{ color:'#475569' }}>{p2Pct.toFixed(2)}% · 3.000 TPS</span>
          <span>{fmtK(provPoblacion)}</span>
        </div>
        <div style={{ marginTop:5, fontSize:8, color:'#1e293b' }}>
          Cobertura total sin QoS: ~{invMin} min · Con QoS P0+P1: {tP01}s
        </div>
        <div style={{ height:3, background:'#1e293b', borderRadius:'0 0 8px 8px', width:'100%', marginTop:8, overflow:'hidden' }}>
          {p2Active && (
            <div style={{
              height:'100%',
              width: (Math.min(qos.p2d / (provPoblacion || 1), 1) * 100) + '%',
              background:'#f59e0b',
              transition:'width 0.5s ease',
            }} />
          )}
        </div>
      </div>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PANEL DIFUSIÓN MULTICANAL
══════════════════════════════════════════════════════════════════════════ */
function PanelMulticanal({ smsDespachados, provPoblacion, elapsedReal, isSimulating, totalEfectivos, destinatariosP1 }) {
  const mc     = calcMulticanal(isSimulating ? elapsedReal : 0, provPoblacion);
  const total  = smsDespachados + mc.meta + mc.ig + mc.tvRadio;
  const invMin = Math.round(provPoblacion / SMSC_TPS / 60);

  return (
    <Card accent="#3b82f6">
      <SLabel>DIFUSIÓN MULTICANAL — SMS + MEDIOS + REDES SOCIALES</SLabel>

      <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'5px 8px', borderRadius:5, marginBottom:8,
        background:'rgba(15,23,42,0.6)', border:'1px solid #0f172a',
      }}>
        <div>
          <div style={{ fontSize:10, color:'#94a3b8' }}>SMS Unicast Despachados</div>
          <div style={{ fontSize:8, color:'#475569' }}>
            SMSC QoS · P0={fmt(totalEfectivos)} / P1={fmt(destinatariosP1)} / P2={fmt(provPoblacion)} (prov.)
          </div>
        </div>
        <span style={{ fontSize:11, fontWeight:800, color:'#22c55e', fontFamily:'monospace' }}>
          {fmt(smsDespachados)}
        </span>
      </div>

      <SatBar label={`Meta/ICMEC (Facebook) — CAU=${CAU_META * 100}% · k=${K_META} h⁻¹`}
        value={mc.meta}    limite={mc.lMeta}  sat={mc.satMeta} color="#3b82f6"/>
      <SatBar label={`Instagram institucional — CAU=${CAU_IG * 100}% · k=${K_IG} h⁻¹`}
        value={mc.ig}      limite={mc.lIG}    sat={mc.satIG}   color="#a855f7"/>
      <SatBar label={`TV/Radio adheridos — CAU=${CAU_TV * 100}% · k=${K_TV} h⁻¹ · lat.=${TV_LAT_MIN}min`}
        value={mc.tvRadio} limite={mc.lTV}    sat={mc.satTV}   color="#f59e0b"/>

      <div style={{
        marginTop:4, padding:'6px 8px',
        background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.2)',
        borderRadius:6, display:'flex', justifyContent:'space-between', alignItems:'center',
      }}>
        <span style={{ fontSize:10, color:'#94a3b8' }}>TOTAL NOTIFICADOS (acumulado)</span>
        <span style={{ fontSize:13, fontWeight:900, color:'#22c55e', fontFamily:'monospace' }}>{fmt(total)}</span>
      </div>

      <div style={{
        marginTop:6, padding:'7px 9px',
        background:'rgba(59,130,246,0.04)', border:'1px solid rgba(59,130,246,0.18)',
        borderRadius:5, fontSize:8, color:'#64748b', lineHeight:1.7,
      }}>
        <div>Fuente CAU: <em>Meta Transparency Report 2024</em> (DAU/MAU región LATAM).</div>
        <div>Integración Meta/ICMEC activa en Argentina desde 2019 (CONASNAF).</div>
        <div style={{ color:'#334155' }}>
          Aceleración demo ×{SIM_ACCEL} · t_sim={fmtHM(elapsedReal / 60)} · Valores conservadores.
        </div>
      </div>


      {/* Nota académica de fuentes */}
      <div style={{
        marginTop:4, padding:'5px 8px',
        background:'rgba(30,41,59,0.4)', border:'1px solid #1e293b',
        borderRadius:5, fontSize:8, color:'#334155', lineHeight:1.6,
      }}>
        Fuente CAU: Meta Transparency Report 2024 (DAU/MAU región LATAM).
        Integración Meta/ICMEC activa en Argentina desde 2019 (CONASNAF).
        Infraestructura: VIALIDAD NACIONAL · CNRT · ANAC · AGP/PNA.
        Efectivos: Min. Seguridad Nación · Censo INDEC 2022.
      </div>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CONSOLA TÁCTICA
══════════════════════════════════════════════════════════════════════════ */
function ConsolaTactica({ logs }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  function lineColor(line) {
    if (line.startsWith('[P0]'))        return '#22c55e';
    if (line.startsWith('[P1]'))        return '#06b6d4';
    if (line.startsWith('[P2]'))        return '#f59e0b';
    if (line.startsWith('[VLR-MOCK]'))  return '#f59e0b';
    if (line.startsWith('[DIFUSIÓN]'))  return '#38bdf8';
    if (line.startsWith('[WARN]') || line.startsWith('[ERR]')) return '#f87171';
    if (line.startsWith('──'))          return '#334155';
    return '#22c55e';
  }

  return (
    <Card style={{ padding:0, overflow:'hidden' }} accent="#16a34a">
      <div style={{
        fontSize:9, letterSpacing:'0.2em', color:'#16a34a',
        padding:'6px 12px', borderBottom:'1px solid #0f172a',
        background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', gap:6,
      }}>
        <span style={{
          width:6, height:6, borderRadius:'50%', background:'#16a34a',
          display:'inline-block', flexShrink:0,
          animation: logs.length > 0 ? 'blink 2s infinite' : 'none',
        }}/>
        CONSOLA TÁCTICA — SIFEBU · SMPP QoS · [VLR-MOCK]
      </div>
      <div ref={scrollRef} style={{
        background:'#000', height:160, overflowY:'auto',
        padding:'8px 10px', fontFamily:'monospace', fontSize:9.5, lineHeight:1.7,
      }}>
        {logs.length === 0 && (
          <span style={{ color:'#16a34a', opacity:0.35 }}>
            Esperando activación...<span style={{ animation:'cursor 1s infinite' }}>_</span>
          </span>
        )}
        {logs.map((line, i) => (
          <div key={i} style={{ color:lineColor(line), marginBottom:1, wordBreak:'break-word' }}>
            {line}
          </div>
        ))}
        {logs.length > 0 && <span style={{ color:'#16a34a', animation:'cursor 1s infinite' }}>_</span>}
      </div>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PANEL INTELIGENCIA EN VIVO (OSINT) — AVISTAMIENTOS CIUDADANOS
══════════════════════════════════════════════════════════════════════════ */
function PanelOSINT({ reportes, onDespachar }) {
  const hayNuevos = reportes.some(r => !r.leido);
  return (
    <Card accent={hayNuevos ? '#ef4444' : '#334155'}
      style={{ animation: hayNuevos ? 'blink 1.4s infinite' : 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <SLabel color={hayNuevos ? '#ef4444' : undefined} mb={0}>
          INTELIGENCIA EN VIVO (OSINT)
        </SLabel>
        {hayNuevos && <Badge text="NUEVO" color="#ef4444" blink/>}
      </div>
      {reportes.length === 0 ? (
        <div style={{ fontSize: 9.5, color: '#334155', textAlign: 'center', padding: '10px 0' }}>
          Sin avistamientos ciudadanos reportados
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 180, overflowY: 'auto' }}>
          {[...reportes].reverse().map(r => (
            <div key={r.id} style={{
              padding: '8px 10px', borderRadius: 6,
              background: r.leido ? 'rgba(15,23,42,0.4)' : 'rgba(239,68,68,0.07)',
              border: `1px solid ${r.leido ? '#1e293b' : 'rgba(239,68,68,0.4)'}`,
              animation: !r.leido ? 'blink 1.4s infinite' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#ef4444', letterSpacing: '0.06em' }}>
                  🚨 AVISTAMIENTO CIUDADANO
                </span>
                <span style={{ fontSize: 8, color: '#475569', fontFamily: 'monospace' }}>{r.tiempo}</span>
              </div>
              <div style={{ fontSize: 9.5, color: '#94a3b8', marginBottom: 3, lineHeight: 1.45 }}>{r.texto}</div>
              <div style={{ fontSize: 8.5, color: '#64748b', marginBottom: r.leido ? 0 : 6 }}>📍 {r.ubicacion}</div>
              {!r.leido && (
                <button
                  onClick={() => onDespachar(r.id)}
                  style={{
                    padding: '4px 10px',
                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.5)',
                    color: '#ef4444', borderRadius: 5, fontSize: 9, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Despachar Unidad ▶
                </button>
              )}
              {r.leido && (
                <div style={{ fontSize: 8, color: '#22c55e' }}>✓ Unidad despachada</div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SIMULADOR APP MI ARGENTINA — VISTA DEL CIUDADANO
   Pixel-perfect mock basado en capturas reales de la app oficial
══════════════════════════════════════════════════════════════════════════ */

/* Paleta oficial Mi Argentina */
const MA_BLUE   = '#2e3192';   // azul principal (navbar, botones)
const MA_CYAN   = '#00c0f3';   // celeste "mi" del logo

function LogoMiArgentina({ size = 18, dark = false }) {
  return (
    <span style={{ fontWeight: 900, fontSize: size, letterSpacing: '-0.01em', color: dark ? MA_BLUE : '#fff' }}>
      <span style={{ color: MA_CYAN }}>mi</span>Argentina
    </span>
  );
}

function PhoneStatusBar({ clockStr }) {
  return (
    <div className="phone-status-bar">
      <span>{clockStr}</span>
      <span className="phone-status-icons">
        <svg width="12" height="8" viewBox="0 0 12 8" fill="currentColor" style={{ opacity: 0.7 }}>
          <rect x="0" y="3" width="2" height="5" rx="0.5"/>
          <rect x="3" y="2" width="2" height="6" rx="0.5"/>
          <rect x="6" y="1" width="2" height="7" rx="0.5"/>
          <rect x="9" y="0" width="2" height="8" rx="0.5"/>
        </svg>
        <svg width="15" height="8" viewBox="0 0 15 8" fill="currentColor" style={{ opacity: 0.7 }}>
          <rect x="0" y="2" width="13" height="6" rx="1" fillOpacity="0.3" stroke="currentColor" strokeWidth="0.8"/>
          <rect x="1" y="3" width="9" height="4" rx="0.5"/>
          <rect x="13.5" y="3.5" width="1" height="3" rx="0.5"/>
        </svg>
      </span>
    </div>
  );
}

/* ── Íconos SVG monoline estilo Mi Argentina ──────────────────────────── */
function IconDocumentos() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={MA_BLUE} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
}
function IconVehiculos() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={MA_BLUE} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>;
}
function IconTrabajo() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={MA_BLUE} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>;
}
function IconSalud() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={MA_BLUE} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
}
function IconCobros() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={MA_BLUE} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>;
}
function IconTramites() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={MA_BLUE} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
}
function IconTurnos() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={MA_BLUE} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 11 18 15 14"/></svg>;
}
function IconHijos() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={MA_BLUE} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="19" cy="7" r="2"/><path d="M23 21v-1a3 3 0 0 0-3-3h-1"/></svg>;
}

const MA_SERVICES = [
  { Icon: IconDocumentos, label: 'Documentos' },
  { Icon: IconVehiculos,  label: 'Vehículos'  },
  { Icon: IconTrabajo,    label: 'Trabajo'     },
  { Icon: IconSalud,      label: 'Salud'       },
  { Icon: IconCobros,     label: 'Cobros'      },
  { Icon: IconTramites,   label: 'Trámites'    },
  { Icon: IconTurnos,     label: 'Turnos'      },
  { Icon: IconHijos,      label: 'Hijos'       },
];

/* ── Pantalla LOGIN ─────────────────────────────────────────────────────── */
const VALID_EMAIL = 'nicotribolo2005@gmail.com';
const VALID_PASS  = '12flatron34';

function LoginScreen({ onLogin, alertaPendiente }) {
  const [cuil,     setCuil]     = useState('');
  const [pass,     setPass]     = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');

  function handleSubmit() {
    const ok = cuil.trim().toLowerCase() === VALID_EMAIL && pass === VALID_PASS;
    if (!ok) {
      setError('Email o contraseña incorrectos. Verificá tus datos e intentá de nuevo.');
      return;
    }
    setError('');
    onLogin();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#fff' }}>
      {/* Header */}
      <div style={{ background: MA_BLUE, padding: '14px 18px' }}>
        <LogoMiArgentina size={20} />
      </div>

      {/* Aviso alerta pendiente */}
      {alertaPendiente && (
        <div style={{ background: '#fff3cd', borderBottom: '1px solid #f59e0b', padding: '8px 18px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span style={{ fontSize: 11, color: '#78350f', fontWeight: 600, lineHeight: 1.4 }}>
            Hay una Alerta Sofía activa. Iniciá sesión para ver los detalles.
          </span>
        </div>
      )}

      {/* Form */}
      <div style={{ flex: 1, padding: '28px 22px 18px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: '#1a1a1a', marginBottom: 22, letterSpacing: '-0.02em' }}>
          Ingresá a tu cuenta
        </div>

        {/* Email / CUIL */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#555', marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Email / CUIL</div>
          <div style={{ position: 'relative' }}>
            <input
              className={`ma-input${error ? '' : ' ma-input--focused'}`}
              value={cuil}
              onChange={e => { setCuil(e.target.value); setError(''); }}
              placeholder="tucuenta@ejemplo.com"
              autoComplete="email"
              style={error ? { borderColor: '#ef4444' } : {}}
            />
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#aaa', pointerEvents: 'none' }}>🗝</span>
          </div>
        </div>

        {/* Contraseña */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#555', marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Contraseña</div>
          <div style={{ position: 'relative' }}>
            <input
              className="ma-input"
              type={showPass ? 'text' : 'password'}
              value={pass}
              onChange={e => { setPass(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={error ? { borderColor: '#ef4444' } : {}}
            />
            <button
              onClick={() => setShowPass(p => !p)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#888', padding: 0 }}
            >
              {showPass ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 10, padding: '8px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 8, fontSize: 11, color: '#ef4444', lineHeight: 1.4 }}>
            ✗ {error}
          </div>
        )}

        <div style={{ fontSize: 11, color: MA_BLUE, fontWeight: 600, marginBottom: 18, cursor: 'pointer', textAlign: 'right' }}>
          ¿Olvidaste tu contraseña?
        </div>

        {/* Botón Ingresar */}
        <button
          onClick={handleSubmit}
          style={{
            background: MA_BLUE, color: '#fff', border: 'none', borderRadius: 50,
            padding: '13px 0', fontSize: 15, fontWeight: 800, cursor: 'pointer',
            width: '100%', letterSpacing: '0.01em', marginBottom: 28, fontFamily: 'inherit',
          }}
        >
          Ingresar
        </button>

        {/* No tenés cuenta */}
        <div style={{ borderTop: '1px solid #e8e8e8', paddingTop: 22 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a', marginBottom: 14, textAlign: 'center' }}>
            ¿No tenés cuenta?
          </div>
          <button
            style={{
              background: '#fff', border: `1.5px solid ${MA_BLUE}`, borderRadius: 50,
              padding: '11px 0', fontSize: 13, fontWeight: 700, color: MA_BLUE,
              cursor: 'pointer', width: '100%', fontFamily: 'inherit',
            }}
          >
            Creá tu cuenta
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 18px 14px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
        <LogoMiArgentina size={13} dark />
        <div style={{ fontSize: 10, color: '#aaa', display: 'flex', gap: 12 }}>
          <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>Preguntas frecuentes</span>
          <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>Términos y condiciones</span>
        </div>
      </div>
    </div>
  );
}

/* ── Pantalla DASHBOARD ─────────────────────────────────────────────────── */
function DashboardScreen({ isSimulating, nombreMenor, provinciaNom, onAlerta }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#f4f5f7' }}>
      {/* Header azul */}
      <div style={{ background: MA_BLUE, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
            <line x1="0" y1="1" x2="18" y2="1"/><line x1="0" y1="7" x2="18" y2="7"/><line x1="0" y1="13" x2="18" y2="13"/>
          </svg>
          <LogoMiArgentina size={17} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>Nicolas</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9 }}>▾</span>
        </div>
      </div>

      {/* Cuerpo scrollable */}
      <div style={{ flex: 1, padding: '16px 14px 14px', overflowY: 'auto' }}>

        {/* Greeting */}
        <div style={{ fontSize: 21, fontWeight: 900, color: '#1a1a1a', marginBottom: 4, letterSpacing: '-0.02em' }}>
          ¡Hola Nicolas!
        </div>
        <div style={{ fontSize: 11, color: '#666', marginBottom: 16, lineHeight: 1.45 }}>
          Gestioná trámites, sacá turnos, accedé a tus credenciales y recibí información personalizada.
        </div>

        {/* Feriado card (celeste pastel) */}
        <div style={{ background: '#dbeafe', borderRadius: 10, padding: '11px 13px', marginBottom: 10, display: 'flex', gap: 10 }}>
          <div style={{ fontSize: 22, flexShrink: 0 }}>📅</div>
          <div>
            <div style={{ fontSize: 9, color: '#3b82f6', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>Próximo feriado</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#1a1a1a', marginBottom: 1 }}>15 de Junio</div>
            <div style={{ fontSize: 10, color: '#444', lineHeight: 1.35 }}>17 de junio. Paso a la Inmortalidad del Gral. Don Martín Miguel de Güemes.</div>
          </div>
        </div>

        {/* Mantené tu perfil (rosa pastel) */}
        <div style={{ background: '#fce7f3', borderRadius: 10, padding: '10px 13px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(46,49,146,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MA_BLUE} strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="7" r="4"/><path d="M5.5 21a7.5 7.5 0 0 1 13 0"/>
            </svg>
          </div>
          <div style={{ fontSize: 12, color: '#831843', fontWeight: 700, textDecoration: 'underline' }}>
            Mantené tu perfil actualizado
          </div>
        </div>

        {/* Sección servicios */}
        <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', marginBottom: 10 }}>
          ¿Qué necesitás hoy?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7, marginBottom: 14 }}>
          {MA_SERVICES.map(({ Icon, label }) => (
            <div key={label} style={{
              background: '#fff', borderRadius: 10, padding: '11px 4px 9px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              boxShadow: '0 1px 3px rgba(0,0,0,0.07)', cursor: 'pointer',
            }}>
              <Icon />
              <span style={{ fontSize: 9, fontWeight: 600, color: '#333', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Banner Alerta Sofía (solo cuando hay alerta activa) */}
        {isSimulating && (
          <div
            onClick={onAlerta}
            style={{
              background: '#fff8e1', border: '1.5px solid #f59e0b', borderRadius: 10,
              padding: '11px 13px', fontSize: 11.5, color: '#78350f', fontWeight: 700,
              cursor: 'pointer', lineHeight: 1.4, display: 'flex', gap: 8, alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 2 }}>Alerta Sofía activa en {provinciaNom || 'tu provincia'}</div>
              <div style={{ fontWeight: 500, fontSize: 10.5 }}>
                Búsqueda urgente de {nombreMenor}. Tocá para ver detalles.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Pantalla ALERTA SOFÍA ──────────────────────────────────────────────── */
function AlertaScreen({ nombreMenor, provinciaNom, hora, fecha, contexto, genero, onBack, onReporte, tiempoDisplay, datosVictima }) {
  const ctxLabel   = CONTEXTOS.find(c => c.value === contexto)?.label ?? contexto;
  const horaLabel  = hora  || '—';
  const fechaLabel = fmtFechaDisplay(fecha);
  const edad       = datosVictima?.edad || '—';
  const vestimenta = datosVictima?.vestimenta || '—';
  const ultimaVezVista = datosVictima?.ultimaVezVista || '—';

  const [pantalla,    setPantalla]    = useState('alerta');
  const [descripcion, setDescripcion] = useState('');
  const [ubicacion,   setUbicacion]   = useState('');

  function enviarReporte() {
    if (!descripcion.trim()) return;
    onReporte && onReporte({
      id:       Date.now(),
      texto:    descripcion.trim(),
      ubicacion: ubicacion.trim() || `${provinciaNom || 'Argentina'} — Coordenadas aproximadas`,
      tiempo:   tiempoDisplay || '—',
      leido:    false,
    });
    setPantalla('exito');
  }

  /* Encabezado rojo reutilizable */
  function HeaderRojo({ label, onVolver }) {
    return (
      <div style={{ background: '#b91c1c', color: '#fff', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button onClick={onVolver} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '4px 9px', borderRadius: 6, fontFamily: 'inherit' }}>
          ← Volver
        </button>
        <span style={{ fontWeight: 800, fontSize: 14, flex: 1 }}>{label}</span>
      </div>
    );
  }

  /* ── Pantalla ÉXITO ── */
  if (pantalla === 'exito') {
    return (
      <div className="alerta-sofia-screen">
        <HeaderRojo label="Reporte enviado" onVolver={() => setPantalla('alerta')} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', gap: 16, textAlign: 'center', background: '#fff' }}>
          <div style={{ fontSize: 52 }}>✅</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a', lineHeight: 1.3 }}>¡Gracias por tu ayuda!</div>
          <div style={{ fontSize: 12, color: '#444', lineHeight: 1.6 }}>
            Las fuerzas de seguridad están analizando tu reporte. Tu colaboración puede salvar una vida.
          </div>
          <button
            onClick={() => setPantalla('alerta')}
            style={{ background: MA_BLUE, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 }}
          >
            Volver a la alerta
          </button>
        </div>
      </div>
    );
  }

  /* ── Pantalla FORMULARIO ── */
  if (pantalla === 'reporte') {
    return (
      <div className="alerta-sofia-screen">
        <HeaderRojo label="Reportar avistamiento" onVolver={() => setPantalla('alerta')} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12, background: '#f9fafb' }}>
          <div style={{ fontSize: 12, color: '#333', lineHeight: 1.55 }}>
            Por favor, indicá dónde y cuándo viste a <strong>{nombreMenor || 'la persona buscada'}</strong>.
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#555', marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Descripción del avistamiento *
            </div>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej: Vi a una niña con las características descriptas cerca de la plaza principal, a las 15:30 hs..."
              rows={4}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#fff', color: '#1a1a1a',
                border: '1.5px solid #d1d5db', borderRadius: 8,
                padding: '8px 10px', fontSize: 12, fontFamily: 'inherit',
                resize: 'none', lineHeight: 1.5, outline: 'none',
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#555', marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Ubicación
            </div>
            <input
              className="ma-input"
              value={ubicacion}
              onChange={e => setUbicacion(e.target.value)}
              placeholder="Ingresá la ubicación..."
            />
            <button
              onClick={() => setUbicacion(`${provinciaNom || 'Argentina'} — Coordenadas aproximadas`)}
              style={{
                marginTop: 6, padding: '7px 12px',
                background: '#f0f4ff', border: '1px solid #c7d2fe',
                borderRadius: 8, fontSize: 11, fontWeight: 600, color: MA_BLUE,
                cursor: 'pointer', fontFamily: 'inherit', width: '100%',
              }}
            >
              📍 Usar Ubicación Actual (GPS)
            </button>
          </div>
          <button
            onClick={enviarReporte}
            disabled={!descripcion.trim()}
            style={{
              background: descripcion.trim() ? '#b91c1c' : '#e5e7eb',
              color: descripcion.trim() ? '#fff' : '#9ca3af',
              border: 'none', borderRadius: 14,
              padding: '13px', fontSize: 14, fontWeight: 800,
              cursor: descripcion.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >
            🚨 ENVIAR REPORTE AL 134
          </button>
          <div style={{ fontSize: 10, color: '#888', textAlign: 'center', lineHeight: 1.5 }}>
            Tu reporte es anónimo. Los datos se transmiten encriptados a las fuerzas de seguridad.
          </div>
        </div>
      </div>
    );
  }

  /* ── Pantalla ALERTA (principal) ── */
  return (
    <div className="alerta-sofia-screen">
      <div style={{ background: '#b91c1c', color: '#fff', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '4px 9px', borderRadius: 6, fontFamily: 'inherit' }}
        >
          ← Volver
        </button>
        <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.01em', flex: 1 }}>⚠️ Alerta Sofía</span>
        <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.2)', borderRadius: 4, padding: '2px 7px', fontWeight: 700, letterSpacing: '0.08em' }}>URGENTE</span>
      </div>

      <div className="alerta-sofia-body">
        <div className="alerta-sofia-photo-placeholder">
          {datosVictima?.foto ? (
            <img
              src={datosVictima.foto}
              alt={nombreMenor}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <>
              <svg width="56" height="68" viewBox="0 0 56 68" fill="#bbb">
                <circle cx="28" cy="18" r="14"/>
                <path d="M2 68 C2 46 54 46 54 68Z"/>
              </svg>
              <div className="alerta-sofia-photo-label">Foto del menor</div>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#b91c1c', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            BÚSQUEDA URGENTE
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#1a1a1a', letterSpacing: '-0.01em', lineHeight: 1.15, marginBottom: 6 }}>
            {nombreMenor || 'Nombre no especificado'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#555', fontSize: 11.5, fontWeight: 500 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            Última vez vista en:&nbsp;<strong style={{ color: '#1a1a1a', fontWeight: 800 }}>{provinciaNom || '—'}</strong>
          </div>
        </div>

        <div className="alerta-sofia-datos">
          {[
            { label: 'Edad',         value: typeof edad === 'number' ? `${edad} años` : edad },
            { label: 'Género',       value: genero   || '—'               },
            { label: 'Desaparición', value: `${horaLabel} · ${fechaLabel}` },
            { label: 'Vestimenta',   value: vestimenta                     },
            { label: 'Contexto',     value: ctxLabel || '—'               },
            { label: 'Protocolo',    value: 'Ley 26.061 · CONASNAF'       },
          ].map(({ label, value }) => (
            <div key={label} className="alerta-sofia-dato">
              <span className="alerta-sofia-dato__label">{label}</span>
              <span className="alerta-sofia-dato__value">{value}</span>
            </div>
          ))}
        </div>

        <a href="tel:134" className="alerta-sofia-btn-llamar">
          📞 LLAMAR AL 134 — LÍNEA DIRECTA
        </a>

        <button
          onClick={() => setPantalla('reporte')}
          style={{
            width: '100%', background: '#fff', border: '1.5px solid #b91c1c',
            borderRadius: 14, padding: '12px', fontSize: 13, fontWeight: 700,
            color: '#b91c1c', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          📝 Tengo información — Reportar anónimo
        </button>

        <div className="alerta-sofia-nota">
          Si ves al menor, no lo acerques directamente.<br/>Llamá al 134 de inmediato.
        </div>
      </div>
    </div>
  );
}

/* ── Componente principal ───────────────────────────────────────────────── */
function SimuladorMiArgentina({
  isSimulating, showPush, setShowPush,
  nombreMenor, provinciaNom, hora, fecha, contexto, genero,
  ciudadanoScreen, setCiudadanoScreen,
  onReporte, tiempoDisplay, datosVictima,
}) {
  const [loggedIn,      setLoggedIn]      = useState(false);
  const [pendingAlerta, setPendingAlerta] = useState(false);
  const nombreMenorSeguro = nombreMenor?.trim() || 'menor no especificado';

  const [clockStr, setClockStr] = useState(
    () => new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  );
  useEffect(() => {
    const t = setInterval(
      () => setClockStr(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })),
      30_000
    );
    return () => clearInterval(t);
  }, []);

  function handleLoginSuccess() {
    setLoggedIn(true);
    if (pendingAlerta) {
      setCiudadanoScreen('alerta');
      setPendingAlerta(false);
      setShowPush(false);
    }
  }

  function handlePushTap() {
    if (loggedIn) {
      setCiudadanoScreen('alerta');
      setShowPush(false);
    } else {
      setPendingAlerta(true);
      setShowPush(false);
    }
  }

  /* Cuando el operador resetea, volvemos al home del teléfono (no al login) */
  const screen = !loggedIn ? 'login' : ciudadanoScreen === 'alerta' ? 'alerta' : 'home';

  return (
    <div className="ciudadano-view">
      <div className="phone-outer">
        <div className="phone-mockup">

          <PhoneStatusBar clockStr={clockStr} />

          {/* ── Push notification overlay ── */}
          {showPush && (
            <div
              className="push-notification"
              onClick={handlePushTap}
            >
              <div className="push-notification__app">
                <span className="push-notification__icon">🇦🇷</span>
                <span className="push-notification__name">Mi Argentina · Alerta Sofía</span>
                <span className="push-notification__time">ahora</span>
              </div>
              <div className="push-notification__title">⚠️ Ministerio de Seguridad — ALERTA SOFÍA</div>
              <div className="push-notification__body">
                Búsqueda urgente de <strong>{nombreMenorSeguro}</strong> en <strong>{provinciaNom || 'tu zona'}</strong>.
                Tocá para ver información vital.
              </div>
            </div>
          )}

          {/* ── Contenido de pantalla ── */}
          <div className="phone-screen">
            {screen === 'login' && (
              <LoginScreen onLogin={handleLoginSuccess} alertaPendiente={pendingAlerta || (isSimulating && !loggedIn)} />
            )}
            {screen === 'home' && (
              <DashboardScreen
                isSimulating={isSimulating}
                nombreMenor={nombreMenorSeguro}
                provinciaNom={provinciaNom}
                onAlerta={() => setCiudadanoScreen('alerta')}
              />
            )}
            {screen === 'alerta' && (
              <AlertaScreen
                nombreMenor={nombreMenorSeguro}
                provinciaNom={provinciaNom}
                hora={hora}
                fecha={fecha}
                contexto={contexto}
                genero={genero}
                onBack={() => setCiudadanoScreen('home')}
                onReporte={onReporte}
                tiempoDisplay={tiempoDisplay}
                datosVictima={datosVictima}
              />
            )}
          </div>

          <div className="phone-home-indicator"/>
        </div>
      </div>

      {/* ── Info panel ── */}
      <div className="ciudadano-info">
        <div className="ciudadano-info__title">SIMULADOR APP MI ARGENTINA</div>
        <div className="ciudadano-info__body">
          {isSimulating
            ? `Alerta activa en ${provinciaNom}. La notificación push aparece en tiempo real cuando el operador inicia la alerta.`
            : 'Iniciá la alerta desde la vista C4I — Ministerio de Seguridad para simular la recepción de la push notification.'}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   APP PRINCIPAL
══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  // ── Estado formulario ──────────────────────────────────────────────────
  const [nombre,       setNombre]       = useState('');
  const [edad,         setEdad]         = useState('');
  const [genero,       setGenero]       = useState('');
  const [provinciaNom, setProvinciaNom] = useState('');
  const [hora,         setHora]         = useState('');   // HH:MM nativo HTML
  const [fecha,        setFecha]        = useState('');   // YYYY-MM-DD nativo HTML
  const [contexto,     setContexto]     = useState('ciudad_grande');

  // ── Estado simulación ─────────────────────────────────────────────────
  const [isSimulating, setIsSimulating] = useState(false);
  const [segundosSimulados, setSegundosSimulados] = useState(0);
  const [tiempoTranscurridoInicialSeg, setTiempoTranscurridoInicialSeg] = useState(0);
  const [logs,         setLogs]         = useState([]);

  // ── Estado vista dual ──────────────────────────────────────────────────
  const [activeView,      setActiveView]      = useState('operador');
  const [ciudadanoScreen, setCiudadanoScreen] = useState('home');
  const [showPush,        setShowPush]        = useState(false);
  const [reportesCiudadanos, setReportesCiudadanos] = useState([]);

  const loggedRef     = useRef({});
  const simContextRef = useRef(null);

  // ── Derivados básicos ──────────────────────────────────────────────────
  const edadNum      = parseInt(edad, 10);
  const edadInvalida = !isNaN(edadNum) && edadNum > 0 && edadNum >= 18;
  const provincia    = PROVINCIAS.find(p => p.nombre === provinciaNom) ?? null;
  const ctxObj       = CONTEXTOS.find(c => c.value === contexto) ?? { r0: 2 };
  const r0           = ctxObj.r0;
  const radioProvKm  = provincia?.radioKm  ?? 200;
  const provPoblacion= provincia?.poblacion ?? 1_000_000;

  // ── Derivados P0/P1 por provincia ──────────────────────────────────────
  const totalEfectivos = provincia
    ? provincia.efectivos.policia + provincia.efectivos.gendarmeria + provincia.efectivos.sifebu
    : 0;
  const tiempoP0 = totalEfectivos > 0 ? Math.ceil(totalEfectivos / SMSC_TPS) : 0;

  const destinatariosP1 = provincia
    ? (provincia.infra.peajes      * SMS_PEAJE)
      + (provincia.infra.terminales  * SMS_TERMINAL)
      + (provincia.infra.aeropuertos * SMS_AEROPUERTO)
      + (provincia.infra.puertos     * SMS_PUERTO)
    : 0;
  const tiempoP1 = destinatariosP1 > 0 ? Math.ceil(destinatariosP1 / SMSC_TPS) : 0;
  const tP01     = tiempoP0 + tiempoP1;

  // ── FUENTE ÚNICA: toda la derivación de tiempo ─────────────────────────
  const segBase = Math.floor(
    (tiempoTranscurridoInicialSeg ?? 0) + segundosSimulados
  );
  const horas    = Math.floor(segBase / 3600);
  const minutos  = Math.floor((segBase % 3600) / 60);
  const segundos = segBase % 60;

  const relojFormateado =
    String(horas).padStart(2, '0') + 'h ' +
    String(minutos).padStart(2, '0') + 'm ' +
    String(segundos).padStart(2, '0') + 's';

  const elapsedReal     = segundosSimulados / MULTIPLICADOR;
  const segundosTotales = segBase;
  const t_horas_decimal = segBase / 3600;
  const radioKmRaw      = calcRadioExp(t_horas_decimal, r0);
  const radioKm         = Math.min(radioKmRaw, radioProvKm);
  const faseInfo        = getFaseInfo(radioKm, radioProvKm);
  const qos             = calcQoS(elapsedReal, provPoblacion, totalEfectivos, tiempoP0, destinatariosP1, tiempoP1);
  const smsDespachados  = isSimulating ? qos.dispatched : 0;

  const puedeIniciar = !edadInvalida && !isSimulating
    && !!nombre.trim() && !!provinciaNom && !!hora && !!fecha && !!genero;

  useEffect(() => {
    let interval;
    if (isSimulating) {
      interval = setInterval(() => {
        setSegundosSimulados(prev =>
          Number((prev + SEGUNDOS_SIMULADOS_POR_TICK).toFixed(1))
        );
      }, TICK_MS);
    }
    return () => clearInterval(interval);
  }, [isSimulating]);

  // ── Push notification al ciudadano ────────────────────────────────────
  useEffect(() => {
    if (isSimulating) {
      setShowPush(true);
    } else {
      setShowPush(false);
      setCiudadanoScreen('home');
    }
  }, [isSimulating]);

  // ── Hitos tácticos sincronizados con el acumulador de simulación ──────
  useEffect(() => {
    if (!isSimulating || !simContextRef.current) return;

    const {
      t0,
      pop,
      rprov,
      curR0,
      capTotalEf,
      capDestP1,
      capTiempoP0,
      capTiempoP1,
      capTP01,
      invMin,
      peajes,
      terminales,
      aeropuertos,
      puertos,
    } = simContextRef.current;

    const erFloor = Math.floor(elapsedReal);

    if (erFloor >= TV_LAT_MIN && !loggedRef.current.tv) {
      loggedRef.current.tv = true;
      setLogs(l => [...l,
        `[DIFUSIÓN] TV/Radio: latencia humana ~5min cumplida. k=${K_TV} h⁻¹, CAU=${CAU_TV * 100}%, L=${fmtK(CAU_TV * pop)}.`,
      ]);
    }

    if (erFloor >= capTiempoP0 && !loggedRef.current.p1start) {
      loggedRef.current.p1start = true;
      const curT = (t0 + erFloor * MULTIPLICADOR) / 3600;
      const curR = Math.min(calcRadioExp(curT, curR0), rprov);
      setLogs(l => [...l,
        `[P0] COMPLETADO: ${fmt(capTotalEf)} efectivos en ${capTiempoP0}s ✓`,
        `[VLR-MOCK] Simulación: ${fmt(capDestP1)} dispositivos · ${peajes} peajes, ${terminales} terminales${aeropuertos > 0 ? ', ' + aeropuertos + ' aeropuertos' : ''}${puertos > 0 ? ', ' + puertos + ' puertos' : ''} · R=${curR.toFixed(1)}km`,
        `[VLR-MOCK] AVISO: acceso VLR real requiere habilitación ENACOM/operadoras (Res. 208/2019).`,
        `[P1] priority_flag=1: Geovallado Táctico iniciado`,
      ]);
    }

    if (erFloor >= capTP01 && !loggedRef.current.p2start) {
      loggedRef.current.p2start = true;
      setLogs(l => [...l,
        `[P1] COMPLETADO: ${fmt(capDestP1)} civiles en ${capTiempoP1}s ✓`,
        `[P2] priority_flag=2: Difusión provincial background iniciada`,
        `[P2] Iniciando difusión provincial: ${fmtK(pop)} SMS · ETA: ~${invMin} min`,
        `[DIFUSIÓN] Curvas logísticas Meta/IG alcanzando asíntota N(t)→L. Modelo estable.`,
      ]);
    }

    if (erFloor > capTP01) {
      const p2Key = `p2_${Math.floor((erFloor - capTP01) / 15)}`;
      if ((erFloor - capTP01) % 15 === 0 && !loggedRef.current[p2Key]) {
        loggedRef.current[p2Key] = true;
        const p2sent = Math.min((erFloor - capTP01) * SMSC_TPS, pop);
        const p2rem  = Math.max(0, pop - p2sent);
        const eta    = p2rem > 0 ? Math.ceil(p2rem / SMSC_TPS / 60) : 0;
        setLogs(l => [...l,
          `[P2] ${fmt(p2sent)} / ${fmtK(pop)} · Restantes: ${fmtK(p2rem)} · ETA: ${eta}min`,
        ]);
      }
    }
  }, [isSimulating, elapsedReal]);

  // ── Iniciar alerta ─────────────────────────────────────────────────────
  function iniciar() {
    if (!puedeIniciar) return;

    const pop         = provPoblacion;
    const rprov       = radioProvKm;
    const provNom     = provincia?.nombre ?? '?';
    const curR0       = r0;
    const policia     = provincia?.efectivos.policia     ?? 0;
    const gendarmeria = provincia?.efectivos.gendarmeria ?? 0;
    const sifebu      = provincia?.efectivos.sifebu      ?? 0;
    const peajes      = provincia?.infra.peajes          ?? 0;
    const terminales  = provincia?.infra.terminales      ?? 0;
    const aeropuertos = provincia?.infra.aeropuertos     ?? 0;
    const puertos     = provincia?.infra.puertos         ?? 0;
    const capTotalEf  = totalEfectivos;
    const capDestP1   = destinatariosP1;
    const capTiempoP0 = tiempoP0;
    const capTiempoP1 = tiempoP1;
    const capTP01     = tP01;
    const invMin      = Math.round(pop / SMSC_TPS / 60);

    // Offset inicial: convierte tiempo real de desaparición en segundos simulados
    const tRealHoras = calcularTHoras(fecha, hora);
    const t0 = Math.round(tRealHoras * 3600);
    setSegundosSimulados(0);
    setTiempoTranscurridoInicialSeg(t0);
    loggedRef.current = {};
    simContextRef.current = {
      t0,
      pop,
      rprov,
      curR0,
      capTotalEf,
      capDestP1,
      capTiempoP0,
      capTiempoP1,
      capTP01,
      invMin,
      peajes,
      terminales,
      aeropuertos,
      puertos,
    };

    const rInit = Math.min(calcRadioExp(tRealHoras, curR0), rprov);
    setIsSimulating(true);
    setLogs([
      `── Alerta Sofía activada · SIFEBU Online · Res. Min. Seg. 208/2019 ──`,
      `[SYS] Expediente cargado. Protocolo Alerta Sofía iniciado (Ley 26.061).`,
      `[SYS] Provincia: ${provNom} · Pob: ${fmtK(pop)} · R_prov=${rprov}km`,
      `[SYS] R(t₀)=${rInit.toFixed(1)}km · λ=${LAMBDA}h⁻¹ · T₂≈50min`,
      `[WARN] AlertAR (Res. ENACOM 1387/2025): aprobado · NO operativo aún. Usando SMSC Unicast.`,
      `[WARN] Alerta Sofía HOY: SMS geográfico débil, sin geolocalización precisa. ~2-3 activaciones/año.`,
      `[P0] Policía prov: ${fmt(policia)} · Gendarmería: ${fmt(gendarmeria)} · SIFEBU: ${fmt(sifebu)}`,
      `[DIFUSIÓN] Meta/ICMEC: k=${K_META} h⁻¹, CAU=${CAU_META * 100}%, L=${fmtK(CAU_META * pop)}, modelo logístico activo.`,
      `[DIFUSIÓN] Instagram: k=${K_IG} h⁻¹, CAU=${CAU_IG * 100}%, L=${fmtK(CAU_IG * pop)}, integración Meta activa (AR 2019).`,
    ]);
  }

  function resetear() {
    setIsSimulating(false);
    setSegundosSimulados(0);
    setTiempoTranscurridoInicialSeg(0);
    setLogs([]);
    setReportesCiudadanos([]);
    loggedRef.current     = {};
    simContextRef.current = null;
  }

  /* ════════════════════════════════════════════════════════════════════
     RENDER — Doble Vista: Operador (C4I) / Ciudadano (Mi Argentina)
  ════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ background: '#020617', minHeight: '100vh', color: '#f1f5f9' }}>

      {/* ── Tab Switcher ─────────────────────────────────────────────── */}
      <div className="view-switcher">
        <button
          className={`view-tab${activeView === 'operador' ? ' view-tab--active' : ''}`}
          onClick={() => setActiveView('operador')}
        >
          🛡️ C4I — MINISTERIO DE SEGURIDAD
        </button>
        <button
          className={`view-tab${activeView === 'ciudadano' ? ' view-tab--active' : ''}`}
          onClick={() => setActiveView('ciudadano')}
        >
          📱 APP MI ARGENTINA
          {isSimulating && activeView !== 'ciudadano' && (
            <span className="view-tab__alert-dot"/>
          )}
        </button>
      </div>

      {/* ── Vista Ciudadano ──────────────────────────────────────────── */}
      {activeView === 'ciudadano' && (
        <SimuladorMiArgentina
          isSimulating={isSimulating}
          showPush={showPush}
          setShowPush={setShowPush}
          nombreMenor={nombre}
          provinciaNom={provinciaNom}
          hora={hora}
          fecha={fecha}
          contexto={contexto}
          genero={genero}
          ciudadanoScreen={ciudadanoScreen}
          setCiudadanoScreen={setCiudadanoScreen}
          onReporte={obj => setReportesCiudadanos(prev => [...prev, obj])}
          tiempoDisplay={relojFormateado}
          datosVictima={datosVictima}
        />
      )}

      {/* ── Vista Operador ───────────────────────────────────────────── */}
      {activeView === 'operador' && (
      <div style={{
        height:        'calc(100vh - 52px)',
        display:       'flex',
        flexDirection: 'column',
        overflow:      'hidden',
      }}>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div style={{
        textAlign:    'center',
        padding:      '7px 20px 5px',
        flexShrink:   0,
        borderBottom: '1px solid #0f172a',
        background:   'rgba(2,6,23,0.97)',
      }}>
        <div style={{ fontSize:8, letterSpacing:'0.3em', color:'#1e293b', marginBottom:1 }}>
          PRUEBA DE CONCEPTO · UTN FRSF · INVESTIGACIÓN TECNOLÓGICA 2024-2025 · Ley 26.061 · Protocolo CONASNAF
        </div>
        <h1 style={{ fontSize:17, fontWeight:900, letterSpacing:'0.04em', color:'#f1f5f9', lineHeight:1.15 }}>
          ALERTA SOFÍA &nbsp;·&nbsp; SMSC UNICAST + GEOVALLADO TÁCTICO + QoS
        </h1>
        <div style={{ fontSize:7.5, color:'#1e293b', marginTop:1, letterSpacing:'0.08em' }}>
          Tecnología: SMPP v3.4 · priority_flag 0/1/2 · [VLR-MOCK] · Difusión Logística de Bass
          · Res. ENACOM 1387/2025 · INDEC Censo 2022
        </div>
      </div>

      {/* ── Banner ───────────────────────────────────────────────────── */}
      <BannerAlerta
        isSimulating={isSimulating}
        faseInfo={faseInfo}
        radioKm={radioKm}
        t_horas_decimal={t_horas_decimal}
        provNom={provincia?.nombre ?? ''}
      />

      {/* ── Layout principal ─────────────────────────────────────────── */}
      <div style={{ display:'flex', flex:1, minHeight:0, overflow:'hidden' }}>

        {/* ════ PANEL IZQUIERDO 40% ════ */}
        <div style={{
          width:         '40%',
          overflowY:     'auto',
          borderRight:   '1px solid #0f172a',
          padding:       12,
          display:       'flex',
          flexDirection: 'column',
          gap:           10,
        }}>

          {/* Formulario */}
          <Card accent={isSimulating ? '#22c55e' : '#334155'}>
            <SLabel>DATOS DEL EXPEDIENTE</SLabel>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>

              <div>
                <label>Nombre completo del menor</label>
                <input
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  disabled={isSimulating}
                  placeholder="Ej: Sofía Martínez"
                />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <label>Edad (años)</label>
                  <input
                    type="number" min={0} max={99}
                    value={edad}
                    onChange={e => setEdad(e.target.value)}
                    disabled={isSimulating}
                    placeholder="0–17"
                  />
                </div>
                <div>
                  <label>Género</label>
                  <select value={genero} onChange={e => setGenero(e.target.value)} disabled={isSimulating}>
                    <option value="">Seleccionar...</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              {edadInvalida && (
                <div style={{
                  padding:'6px 10px', background:'rgba(239,68,68,0.08)',
                  border:'1px solid rgba(239,68,68,0.4)', borderRadius:6,
                  fontSize:10, color:'#ef4444', lineHeight:1.4,
                }}>
                  ✗ El protocolo aplica estrictamente a menores de 18 años (Ley 26.061)
                </div>
              )}

              <div>
                <label>Provincia de desaparición</label>
                <select value={provinciaNom} onChange={e => setProvinciaNom(e.target.value)} disabled={isSimulating}>
                  <option value="">Seleccionar provincia...</option>
                  {PROVINCIAS.map(p => (
                    <option key={p.nombre} value={p.nombre}>
                      {p.nombre} — {fmtK(p.poblacion)} hab.
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <label>Hora de desaparición</label>
                  <input
                    type="time"
                    value={hora}
                    onChange={e => setHora(e.target.value)}
                    disabled={isSimulating}
                  />
                </div>
                <div>
                  <label>Fecha de desaparición</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={e => setFecha(e.target.value)}
                    disabled={isSimulating}
                  />
                </div>
              </div>

              <div>
                <label>Tipo de contexto geográfico</label>
                <select value={contexto} onChange={e => setContexto(e.target.value)} disabled={isSimulating}>
                  {CONTEXTOS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {provincia && (
                <div style={{
                  padding:'5px 8px', borderRadius:5, fontSize:8.5, color:'#475569',
                  background:'rgba(15,23,42,0.5)', border:'1px solid #0f172a', lineHeight:1.6,
                }}>
                  R_prov = {provincia.radioKm} km · R₀ = {r0} km
                  · P0: {fmt(totalEfectivos)} SMS ({tiempoP0}s)
                  · P1: {fmt(destinatariosP1)} SMS ({tiempoP1}s)
                </div>
              )}

              <div style={{ display:'flex', gap:8, marginTop:2 }}>
                <button
                  onClick={iniciar}
                  disabled={!puedeIniciar || isSimulating}
                  style={{
                    flex:1, padding:'9px 0',
                    background:    puedeIniciar && !isSimulating ? 'rgba(34,197,94,0.15)' : 'rgba(30,41,59,0.4)',
                    border:        `1px solid ${puedeIniciar && !isSimulating ? '#22c55e' : '#1e293b'}`,
                    color:         puedeIniciar && !isSimulating ? '#22c55e' : '#475569',
                    borderRadius:  7, fontSize:11, fontWeight:800,
                    letterSpacing: '0.1em',
                    cursor:        puedeIniciar ? 'pointer' : 'not-allowed',
                    textTransform: 'uppercase', fontFamily:'inherit', transition:'all 0.2s',
                  }}
                >
                  {isSimulating ? '● ALERTA ACTIVA' : 'INICIAR ALERTA'}
                </button>
                {isSimulating && (
                  <button
                    onClick={resetear}
                    style={{
                      padding:'9px 14px',
                      background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.4)',
                      color:'#ef4444', borderRadius:7, fontSize:11, fontWeight:700,
                      cursor:'pointer', fontFamily:'inherit',
                    }}
                  >
                    RESET
                  </button>
                )}
              </div>
            </div>
          </Card>

          <ExpedienteCard
            nombre={nombre} edadNum={edadNum} genero={genero}
            provincia={provincia} hora={hora} fecha={fecha}
            contexto={contexto} r0={r0}
            relojFormateado={relojFormateado}
            isSimulating={isSimulating}
          />

          <PanelQoS
            provincia={provincia}
            totalEfectivos={totalEfectivos}
            destinatariosP1={destinatariosP1}
            tiempoP0={tiempoP0}
            tiempoP1={tiempoP1}
            tP01={tP01}
            provPoblacion={provPoblacion}
            elapsedReal={elapsedReal}
            qos={qos}
          />

          <ConsolaTactica logs={logs}/>

          <PanelOSINT
            reportes={reportesCiudadanos}
            onDespachar={id => setReportesCiudadanos(prev =>
              prev.map(r => r.id === id ? { ...r, leido: true } : r)
            )}
          />
        </div>

        {/* ════ PANEL DERECHO 60% ════ */}
        <div style={{
          width:         '60%',
          display:       'flex',
          flexDirection: 'column',
          padding:       12,
          gap:           10,
          minHeight:     0,
        }}>
          <Card
            accent={isSimulating ? faseInfo.color : '#1e293b'}
            style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column' }}
          >
            <Radar
              radioKm={radioKm}
              radioProvKm={radioProvKm}
              faseInfo={faseInfo}
              isSimulating={isSimulating}
              tiempoTranscurridoSegundos={segundosTotales}
            />
          </Card>

          <PanelMulticanal
            smsDespachados={smsDespachados}
            provPoblacion={provPoblacion}
            elapsedReal={elapsedReal}
            isSimulating={isSimulating}
            totalEfectivos={totalEfectivos}
            destinatariosP1={destinatariosP1}
          />
        </div>
      </div>
      </div>
      )}
    </div>
  );
}
