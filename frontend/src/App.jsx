
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
const SIM_ACCEL  = 60;    // 1 s real = 1 min simulado

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
  const diffMs = Date.now() - desaparicion.getTime();
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
      background:   'rgba(15,23,42,0.95)',
      border:       '1px solid #1e293b',
      borderTop:    accent ? `2px solid ${accent}` : '1px solid #1e293b',
      borderRadius: 8,
      padding:      12,
      minWidth:     0,
      boxShadow:    '0 2px 16px rgba(0,0,0,0.35)',
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
function BannerAlerta({ running, faseInfo, radioKm, tEfectivo, provNom }) {
  if (!running) return null;
  const { num, color } = faseInfo;
  const text =
    num === 1
      ? `⚡ ALERTA SOFÍA ACTIVA — Búsqueda local en curso · Radio: ${radioKm.toFixed(1)} km · ${fmtHM(tEfectivo)} transcurridas`
      : num === 2
        ? `⚠ ALERTA SOFÍA — Expansión regional activa · Radio: ${radioKm.toFixed(1)} km · Tiempo: ${fmtHM(tEfectivo)}`
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
function Radar({ radioKm, radioProvKm, faseInfo, running, elapsed }) {
  const vr      = radioProvKm * 1.18;
  const step    = smartGridStep(vr);
  const vb      = `${-vr} ${-vr} ${vr * 2} ${vr * 2}`;
  const mc      = faseInfo.color;
  const cob     = faseInfo.num >= 3;

  const gridRings = [];
  for (let r = step; r <= vr * 1.02; r += step) gridRings.push(r);

  const sweepDeg = (elapsed * 6) % 360;
  const sweepRad = (sweepDeg - 90) * Math.PI / 180;
  const sx = vr * Math.cos(sweepRad);
  const sy = vr * Math.sin(sweepRad);
  const alertRings = running ? [radioKm * 0.33, radioKm * 0.66, radioKm] : [];

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
          {running && !cob && (
            <line x1={0} y1={0} x2={sx} y2={sy} stroke={mc} strokeWidth={vr * 0.006} opacity={0.4}/>
          )}
          {alertRings.map((r, i) => (
            <circle key={i} cx={0} cy={0} r={r}
              fill={`${mc}${['0d','16','22'][i]}`} stroke={mc}
              strokeWidth={vr * (i === 2 ? 0.008 : 0.004)}
              opacity={[0.4, 0.65, 1][i]}
              style={{ transition:'r 1.5s cubic-bezier(.4,0,.2,1)' }}/>
          ))}
          {running && (
            <text x={radioKm * 0.707 + vr * 0.022} y={-radioKm * 0.707 - vr * 0.022}
              fill={mc} fontSize={vr * 0.068} fontFamily="monospace" fontWeight="bold">
              R={radioKm.toFixed(1)}km
            </text>
          )}
          {running && (
            <text x={0} y={vr * 0.88}
              fill={cob ? mc : '#475569'} fontSize={vr * 0.052}
              textAnchor="middle" fontFamily="monospace" fontWeight={cob ? 'bold' : 'normal'}>
              {cob ? '✓ COBERTURA PROVINCIAL COMPLETA' : faseInfo.label}
            </text>
          )}
          <circle cx={0} cy={0} r={vr * 0.025} fill="#ef4444"/>
          <circle cx={0} cy={0} r={vr * 0.055} fill="none" stroke="#ef4444"
            strokeWidth={vr * 0.005} opacity={running ? 0.45 : 0.15}/>
          <text x={0} y={vr * 0.105} fill="#ef4444" fontSize={vr * 0.043}
            textAnchor="middle" fontFamily="monospace">PUNTO DE DESAPARICIÓN</text>
          {!running && (
            <text x={0} y={vr * 0.35} fill="#1e293b" fontSize={vr * 0.07}
              textAnchor="middle" fontFamily="monospace">STANDBY — aguardando activación</text>
          )}
        </svg>
      </div>
      <div style={{ display:'flex', gap:6, marginTop:5, flexWrap:'wrap', justifyContent:'center' }}>
        {!running && <Badge text="SIN ACTIVAR"         color="#334155"/>}
        {running   && <Badge text={`FASE ${faseInfo.num}`} color={mc}/>}
        {running && cob && <Badge text="COBERTURA TOTAL" color="#ef4444" blink/>}
        {running && faseInfo.num === 1 && <Badge text="ZONA INMEDIATA"      color="#06b6d4"/>}
        {running && faseInfo.num === 2 && <Badge text="EXPANSIÓN REGIONAL"  color="#f59e0b"/>}
        {running && <Badge text={`t_sim=${fmtHM(elapsed / SIM_ACCEL)}`} color="#334155"/>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   EXPEDIENTE CARD
══════════════════════════════════════════════════════════════════════════ */
function ExpedienteCard({ nombre, edadNum, genero, provincia, hora, fecha, contexto, r0, tEfectivo, tReal, running }) {
  const color  = running ? '#f59e0b' : '#334155';
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
            <Badge text={running ? 'BÚSQUEDA ACTIVA' : 'EN ESPERA'} color={color} blink={running}/>
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
              background:   running
                ? 'linear-gradient(135deg, rgba(239,68,68,0.09) 0%, rgba(239,68,68,0.04) 100%)'
                : 'rgba(15,23,42,0.5)',
              border:       `1px solid ${running ? 'rgba(239,68,68,0.28)' : '#1e293b'}`,
              borderRadius: 6,
              transition:   'all 0.4s',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <div style={{ fontSize:8, color:'#64748b', letterSpacing:'0.12em', textTransform:'uppercase', fontWeight:600 }}>
                  ⏱ Tiempo desde desaparición
                </div>
                {running && tReal === 0 && (
                  <span style={{ fontSize:7, color:'#f59e0b', border:'1px solid rgba(245,158,11,0.3)', borderRadius:3, padding:'1px 5px' }}>
                    SIM
                  </span>
                )}
              </div>
              <div className={`timer-display ${running ? 'timer-active' : 'timer-idle'}`}>
                {fmtHMS(tEfectivo)}
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
function PanelQoS({ provincia, totalEfectivos, destinatariosP1, tiempoP0, tiempoP1, tP01, provPoblacion, elapsed, qos }) {
  const p0Done   = tiempoP0 > 0 && elapsed >= tiempoP0;
  const p1Done   = tP01 > 0 && elapsed >= tP01;
  const p2Active = tP01 > 0 && elapsed >  tP01;
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
      <div style={blockStyle('#22c55e', p0Done || elapsed > 0)}>
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
              : elapsed > 0
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
      <div style={blockStyle('#06b6d4', p1Done || elapsed >= tiempoP0)}>
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
              : elapsed >= tiempoP0
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
function PanelMulticanal({ smsDespachados, provPoblacion, elapsed, running, totalEfectivos, destinatariosP1 }) {
  const mc     = calcMulticanal(running ? elapsed : 0, provPoblacion);
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
          Aceleración demo ×{SIM_ACCEL} · t_sim={fmtHM(elapsed / SIM_ACCEL)} · Valores conservadores.
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
   SIMULADOR APP MI ARGENTINA — VISTA DEL CIUDADANO
══════════════════════════════════════════════════════════════════════════ */
function SimuladorMiArgentina({
  running, showPush, setShowPush,
  provinciaNom, hora, fecha, contexto, genero,
  ciudadanoScreen, setCiudadanoScreen,
}) {
  const ctxLabel   = CONTEXTOS.find(c => c.value === contexto)?.label ?? contexto;
  const horaLabel  = hora  || '—';
  const fechaLabel = fmtFechaDisplay(fecha);

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

  return (
    <div className="ciudadano-view">
      <div className="phone-outer">
        <div className="phone-mockup">

          {/* ── Barra de estado ── */}
          <div className="phone-status-bar">
            <span>{clockStr}</span>
            <span className="phone-status-icons">
              <svg width="12" height="8" viewBox="0 0 12 8" fill="currentColor" style={{ opacity:0.7 }}>
                <rect x="0" y="3" width="2" height="5" rx="0.5"/><rect x="3" y="2" width="2" height="6" rx="0.5"/>
                <rect x="6" y="1" width="2" height="7" rx="0.5"/><rect x="9" y="0" width="2" height="8" rx="0.5"/>
              </svg>
              <svg width="15" height="8" viewBox="0 0 15 8" fill="currentColor" style={{ opacity:0.7 }}>
                <rect x="0" y="2" width="13" height="6" rx="1" fillOpacity="0.3" stroke="currentColor" strokeWidth="0.8"/>
                <rect x="1" y="3" width="9" height="4" rx="0.5"/>
                <rect x="13.5" y="3.5" width="1" height="3" rx="0.5"/>
              </svg>
            </span>
          </div>

          {/* ── Push notification ── */}
          {showPush && (
            <div className="push-notification" onClick={() => { setCiudadanoScreen('alerta'); setShowPush(false); }}>
              <div className="push-notification__app">
                <span className="push-notification__icon">🇦🇷</span>
                <span className="push-notification__name">Mi Argentina</span>
                <span className="push-notification__time">ahora</span>
              </div>
              <div className="push-notification__title">⚠️ ALERTA SOFÍA</div>
              <div className="push-notification__body">
                Búsqueda urgente en <strong>{provinciaNom || 'provincia seleccionada'}</strong>. Tocá para ver detalles.
              </div>
            </div>
          )}

          {/* ── Pantalla principal ── */}
          <div className="phone-screen">
            {ciudadanoScreen === 'home' ? (

              /* ─── Mi Argentina Home ─── */
              <div className="mi-argentina-app">
                <div className="mi-argentina-header">
                  <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
                    <circle cx="20" cy="20" r="18" fill="white" stroke="#e0f4fc" strokeWidth="1"/>
                    <path d="M20 4 L22 14 L20 13 L18 14 Z M20 36 L22 26 L20 27 L18 26 Z M4 20 L14 22 L13 20 L14 18 Z M36 20 L26 22 L27 20 L26 18 Z" fill="#75cef0"/>
                    <circle cx="20" cy="20" r="7" fill="#00AEEF"/>
                    <circle cx="20" cy="20" r="3" fill="#75cef0"/>
                  </svg>
                  <span className="mi-argentina-title">Mi Argentina</span>
                </div>
                <div className="mi-argentina-body">
                  <div className="mi-argentina-greeting">Hola, Ciudadano 👋</div>
                  <div className="mi-argentina-subtitle">¿Qué querés hacer hoy?</div>
                  <div className="mi-argentina-grid">
                    {[
                      { icon: '🚗', label: 'Mis Vehículos' },
                      { icon: '📅', label: 'Mis Turnos' },
                      { icon: '💉', label: 'Cred. Vacunación' },
                      { icon: '🪪', label: 'DNI Digital' },
                      { icon: '🏥', label: 'Mi Salud' },
                      { icon: '📄', label: 'Mis Trámites' },
                    ].map(({ icon, label }) => (
                      <div key={label} className="mi-argentina-tile">
                        <span className="mi-argentina-tile__icon">{icon}</span>
                        <span className="mi-argentina-tile__label">{label}</span>
                      </div>
                    ))}
                  </div>
                  {running && (
                    <div className="mi-argentina-alerta-banner" onClick={() => setCiudadanoScreen('alerta')}>
                      ⚠️ Alerta Sofía activa en {provinciaNom} — Toca para ver detalles
                    </div>
                  )}
                </div>
              </div>

            ) : (

              /* ─── Alerta Sofía Screen ─── */
              <div className="alerta-sofia-screen">
                <div className="alerta-sofia-header">
                  <button className="alerta-sofia-back" onClick={() => setCiudadanoScreen('home')}>
                    ← Volver
                  </button>
                  <span>⚠️ Alerta Sofía</span>
                </div>
                <div className="alerta-sofia-body">
                  <div className="alerta-sofia-photo-placeholder">
                    <svg width="56" height="72" viewBox="0 0 56 72" fill="#aaa">
                      <circle cx="28" cy="18" r="14"/>
                      <path d="M2 72 C2 48 54 48 54 72Z"/>
                    </svg>
                    <div className="alerta-sofia-photo-label">Foto del menor</div>
                  </div>
                  <div className="alerta-sofia-urgente">BÚSQUEDA URGENTE</div>
                  <div className="alerta-sofia-provincia">{provinciaNom || '—'}</div>
                  <div className="alerta-sofia-datos">
                    <div className="alerta-sofia-dato">
                      <span className="alerta-sofia-dato__label">Género</span>
                      <span className="alerta-sofia-dato__value">{genero || '—'}</span>
                    </div>
                    <div className="alerta-sofia-dato">
                      <span className="alerta-sofia-dato__label">Desaparición</span>
                      <span className="alerta-sofia-dato__value">{horaLabel} · {fechaLabel}</span>
                    </div>
                    <div className="alerta-sofia-dato">
                      <span className="alerta-sofia-dato__label">Contexto</span>
                      <span className="alerta-sofia-dato__value">{ctxLabel}</span>
                    </div>
                    <div className="alerta-sofia-dato">
                      <span className="alerta-sofia-dato__label">Protocolo</span>
                      <span className="alerta-sofia-dato__value">Ley 26.061 · CONASNAF</span>
                    </div>
                  </div>
                  <a href="tel:134" className="alerta-sofia-btn-llamar">
                    📞 LLAMAR AL 134
                  </a>
                  <div className="alerta-sofia-nota">
                    Si ves al menor, no lo acerques. Llamá al 134 de inmediato.
                  </div>
                </div>
              </div>

            )}
          </div>

          {/* ── Indicador home ── */}
          <div className="phone-home-indicator"/>
        </div>
      </div>

      {/* ── Info panel debajo del teléfono ── */}
      <div className="ciudadano-info">
        <div className="ciudadano-info__title">SIMULADOR APP MI ARGENTINA</div>
        <div className="ciudadano-info__body">
          {running
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

  // ── Estado simulación ──────────────────────────────────────────────────
  const [running,        setRunning]        = useState(false);
  const [elapsed,        setElapsed]        = useState(0);
  const [tReal,          setTReal]          = useState(0);
  const [smsDespachados, setSmsDespachados] = useState(0);
  const [logs,           setLogs]           = useState([]);

  // ── Estado vista dual ──────────────────────────────────────────────────
  const [activeView,      setActiveView]      = useState('operador');
  const [ciudadanoScreen, setCiudadanoScreen] = useState('home');
  const [showPush,        setShowPush]        = useState(false);

  const clockRef  = useRef(null);
  const simRef    = useRef(null);
  const loggedRef = useRef({});

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

  // ── tEfectivo: tiempo real + tiempo simulado ───────────────────────────
  const tEfectivo  = Math.max(0, tReal) + (running ? elapsed / SIM_ACCEL : 0);
  const radioKmRaw = calcRadioExp(tEfectivo, r0);
  const radioKm    = Math.min(radioKmRaw, radioProvKm);
  const faseInfo   = getFaseInfo(radioKm, radioProvKm);

  const puedeIniciar = !edadInvalida && !running
    && !!nombre.trim() && !!provinciaNom && !!hora && !!fecha && !!genero;

  const qos = calcQoS(elapsed, provPoblacion, totalEfectivos, tiempoP0, destinatariosP1, tiempoP1);

  // ── Push notification al ciudadano cuando arranca la simulación ────────
  useEffect(() => {
    if (running) {
      setShowPush(true);
    } else {
      setShowPush(false);
      setCiudadanoScreen('home');
    }
  }, [running]);

  // ── Reloj real con calcularTHoras — setInterval cada 1000ms ───────────
  useEffect(() => {
    clearInterval(clockRef.current);
    if (!hora || !fecha) { setTReal(0); return; }
    const tick = () => setTReal(calcularTHoras(fecha, hora));
    tick();
    clockRef.current = setInterval(tick, 1000);
    return () => clearInterval(clockRef.current);
  }, [hora, fecha]);

  // ── Iniciar alerta ─────────────────────────────────────────────────────
  function iniciar() {
    if (!puedeIniciar) return;

    const pop         = provPoblacion;
    const rprov       = radioProvKm;
    const provNom     = provincia?.nombre ?? '?';
    const capHora     = hora;
    const capFech     = fecha;
    const curR0       = r0;

    // Capturar valores dinámicos por provincia en el momento del arranque
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

    setRunning(true);
    setElapsed(0);
    setSmsDespachados(0);
    setLogs([]);
    loggedRef.current = {};

    simRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;

        // t=0: arranque del protocolo
        if (!loggedRef.current.start) {
          loggedRef.current.start = true;
          const tH    = calcularTHoras(capFech, capHora);
          const tSimH = 0 / SIM_ACCEL;
          const rInit = Math.min(calcRadioExp(Math.max(0, tH) + tSimH, curR0), rprov);
          setLogs(l => [...l,
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

        // Latencia TV/Radio
        if (next >= TV_LAT_MIN && !loggedRef.current.tv) {
          loggedRef.current.tv = true;
          setLogs(l => [...l,
            `[DIFUSIÓN] TV/Radio: latencia humana ~5min cumplida. k=${K_TV} h⁻¹, CAU=${CAU_TV * 100}%, L=${fmtK(CAU_TV * pop)}.`,
          ]);
        }

        // P0 completo → VLR-MOCK → inicio P1
        if (next >= capTiempoP0 && !loggedRef.current.p1start) {
          loggedRef.current.p1start = true;
          const tH    = calcularTHoras(capFech, capHora);
          const tSimH = next / SIM_ACCEL;
          const tEf   = Math.max(0, tH) + tSimH;
          const curR  = Math.min(calcRadioExp(tEf, curR0), rprov);
          setLogs(l => [...l,
            `[P0] COMPLETADO: ${fmt(capTotalEf)} efectivos en ${capTiempoP0}s ✓`,
            `[VLR-MOCK] Simulación: ${fmt(capDestP1)} dispositivos · ${peajes} peajes, ${terminales} terminales${aeropuertos > 0 ? ', ' + aeropuertos + ' aeropuertos' : ''}${puertos > 0 ? ', ' + puertos + ' puertos' : ''} · R=${curR.toFixed(1)}km`,
            `[VLR-MOCK] AVISO: acceso VLR real requiere habilitación ENACOM/operadoras (Res. 208/2019).`,
            `[P1] priority_flag=1: Geovallado Táctico iniciado`,
          ]);
        }

        // P1 completo → inicio P2
        if (next >= capTP01 && !loggedRef.current.p2start) {
          loggedRef.current.p2start = true;
          setLogs(l => [...l,
            `[P1] COMPLETADO: ${fmt(capDestP1)} civiles en ${capTiempoP1}s ✓`,
            `[P2] priority_flag=2: Difusión provincial background iniciada`,
            `[P2] Iniciando difusión provincial: ${fmtK(pop)} SMS · ETA: ~${invMin} min`,
            `[DIFUSIÓN] Curvas logísticas Meta/IG alcanzando asíntota N(t)→L. Modelo estable.`,
          ]);
        }

        // P2: progreso cada 15 s
        if (next > capTP01 && (next - capTP01) % 15 === 0) {
          const p2sent = Math.min((next - capTP01) * SMSC_TPS, pop);
          const p2rem  = Math.max(0, pop - p2sent);
          const eta    = p2rem > 0 ? Math.ceil(p2rem / SMSC_TPS / 60) : 0;
          setLogs(l => [...l,
            `[P2] ${fmt(p2sent)} / ${fmtK(pop)} · Restantes: ${fmtK(p2rem)} · ETA: ${eta}min`,
          ]);
        }

        setSmsDespachados(
          calcQoS(next, pop, capTotalEf, capTiempoP0, capDestP1, capTiempoP1).dispatched
        );
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
          {running && activeView !== 'ciudadano' && (
            <span className="view-tab__alert-dot"/>
          )}
        </button>
      </div>

      {/* ── Vista Ciudadano ──────────────────────────────────────────── */}
      {activeView === 'ciudadano' && (
        <SimuladorMiArgentina
          running={running}
          showPush={showPush}
          setShowPush={setShowPush}
          provinciaNom={provinciaNom}
          hora={hora}
          fecha={fecha}
          contexto={contexto}
          genero={genero}
          ciudadanoScreen={ciudadanoScreen}
          setCiudadanoScreen={setCiudadanoScreen}
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
        running={running}
        faseInfo={faseInfo}
        radioKm={radioKm}
        tEfectivo={tEfectivo}
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
          <Card accent={running ? '#22c55e' : '#334155'}>
            <SLabel>DATOS DEL EXPEDIENTE</SLabel>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>

              <div>
                <label>Nombre completo del menor</label>
                <input
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  disabled={running}
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
                    disabled={running}
                    placeholder="0–17"
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
                  padding:'6px 10px', background:'rgba(239,68,68,0.08)',
                  border:'1px solid rgba(239,68,68,0.4)', borderRadius:6,
                  fontSize:10, color:'#ef4444', lineHeight:1.4,
                }}>
                  ✗ El protocolo aplica estrictamente a menores de 18 años (Ley 26.061)
                </div>
              )}

              <div>
                <label>Provincia de desaparición</label>
                <select value={provinciaNom} onChange={e => setProvinciaNom(e.target.value)} disabled={running}>
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
                    disabled={running}
                  />
                </div>
                <div>
                  <label>Fecha de desaparición</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={e => setFecha(e.target.value)}
                    disabled={running}
                  />
                </div>
              </div>

              <div>
                <label>Tipo de contexto geográfico</label>
                <select value={contexto} onChange={e => setContexto(e.target.value)} disabled={running}>
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
                  disabled={!puedeIniciar}
                  style={{
                    flex:1, padding:'9px 0',
                    background:    puedeIniciar ? 'rgba(34,197,94,0.15)' : 'rgba(30,41,59,0.4)',
                    border:        `1px solid ${puedeIniciar ? '#22c55e' : '#1e293b'}`,
                    color:         puedeIniciar ? '#22c55e' : '#475569',
                    borderRadius:  7, fontSize:11, fontWeight:800,
                    letterSpacing: '0.1em',
                    cursor:        puedeIniciar ? 'pointer' : 'not-allowed',
                    textTransform: 'uppercase', fontFamily:'inherit', transition:'all 0.2s',
                  }}
                >
                  {running ? '● ALERTA ACTIVA' : 'INICIAR ALERTA'}
                </button>
                {running && (
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
            tEfectivo={tEfectivo} tReal={tReal} running={running}
          />

          <PanelQoS
            provincia={provincia}
            totalEfectivos={totalEfectivos}
            destinatariosP1={destinatariosP1}
            tiempoP0={tiempoP0}
            tiempoP1={tiempoP1}
            tP01={tP01}
            provPoblacion={provPoblacion}
            elapsed={elapsed}
            qos={qos}
          />

          <ConsolaTactica logs={logs}/>
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
            accent={running ? faseInfo.color : '#1e293b'}
            style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column' }}
          >
            <Radar
              radioKm={radioKm}
              radioProvKm={radioProvKm}
              faseInfo={faseInfo}
              running={running}
              elapsed={elapsed}
            />
          </Card>

          <PanelMulticanal
            smsDespachados={smsDespachados}
            provPoblacion={provPoblacion}
            elapsed={elapsed}
            running={running}
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
