const express = require("express");
const router  = express.Router();
const { PROVINCIAS, getDensidad } = require("../data/provincias");
const { ESCENARIOS }              = require("../data/escenarios");

const SMSC_RATE         = 1000;
const IP_PCT            = 0.60;
const UMBRAL_GEOVALLADO = 100;

function geovalladoCritico(radioKm, dispositivosBase) {
  const peajes   = 150 * 40;
  const rutasNac = Math.min(800, Math.floor(radioKm / 5)) * 35;
  const unicast  = Math.max(30_000, Math.min(80_000, peajes + rutasNac));
  const pctDescarte = dispositivosBase > 0
    ? Math.max(0, Math.round((1 - unicast / dispositivosBase) * 100))
    : 0;
  return { modoGeovallado: "CRÍTICO", unicastFiltrado: unicast, pctDescarte };
}

const r2 = (n) => parseFloat(n.toFixed(2));

// Retorna la fase actual (la de mayor índice activa)
function getFase(escenario, tMin) {
  let faseActiva = escenario.fases[0];
  for (const fase of escenario.fases) {
    if (tMin >= fase.tInicio) faseActiva = fase;
  }
  return faseActiva;
}

function getFaseIdx(escenario, tMin) {
  let idx = 0;
  for (let i = 0; i < escenario.fases.length; i++) {
    if (tMin >= escenario.fases[i].tInicio) idx = i;
  }
  return idx;
}

// Retorna TODAS las fases activas (acumulativas)
function getFasesActivas(escenario, tMin) {
  return escenario.fases.filter(fase => tMin >= fase.tInicio);
}

// Calcula el radio efectivo como la UNIÓN de todos los radios activos
// El radio máximo de todas las fases activas
function getRadioAcumulativo(escenario, tMin) {
  const fasesActivas = getFasesActivas(escenario, tMin);
  if (fasesActivas.length === 0) return escenario.fases[0].radio;
  return Math.max(...fasesActivas.map(f => f.radio));
}

// Calcula el factor geográfico promedio de las fases activas
// Ponderado por cuántas fases hay activas (entre más fases, más cobertura)
function getFactorGeoAcumulativo(escenario, tMin) {
  const fasesActivas = getFasesActivas(escenario, tMin);
  if (fasesActivas.length === 0) return 1.0;
  // Suma todos los factorGeo y divide por la cantidad de fases activas
  // Esto simula que cada fase agrega más cobertura
  return Math.min(1.0, fasesActivas.reduce((sum, f) => sum + (f.factorGeo || 1.0), 0) / fasesActivas.length);
}

function radioMaxDeProvincia(superficie) {
  return Math.sqrt(superficie / Math.PI);
}

// tiempoEfectivo = demoraLegal * 60 + tiempoSimulacion — determina fase y radio dinámico
// AHORA: usa radio ACUMULATIVO (unión de todas las fases activas)
function radiosDinamico(escenario, tiempoEfectivo, overrideVel, overrideRadioBase, superficie) {
  const vel  = overrideVel       || escenario.velEscape;
  const r0   = overrideRadioBase || escenario.radioBase;
  const fase = getFase(escenario, tiempoEfectivo);
  const fasesActivas = getFasesActivas(escenario, tiempoEfectivo);
  const radioAcumulativo = getRadioAcumulativo(escenario, tiempoEfectivo);
  const cap  = superficie ? radioMaxDeProvincia(superficie) : 5000;
  return {
    radioFase:     Math.min(radioAcumulativo, cap), // Radio máximo de todas las fases activas
    radioContinuo: Math.min(r0 + vel * (tiempoEfectivo / 60) * escenario.kGeo, cap),
    fase,
    fasesActivas,   // Agregamos info de todas las fases activas
    cap,
  };
}

function areaCubierta(radioKm) {
  return Math.PI * radioKm * radioKm;
}

function dispositivosAlertados(densidad, compatCB, radioKm, maxCompatibles, factorGeo = 1.0) {
  const raw = Math.floor(areaCubierta(radioKm) * densidad * compatCB * factorGeo);
  return typeof maxCompatibles === "number" ? Math.min(raw, maxCompatibles) : raw;
}

function coberturaPct(densidad, compatCB, fases, radioKm, cap, maxCompatibles) {
  const radioMax = Math.min(Math.max(...fases.map((f) => f.radio)), cap);
  const total    = dispositivosAlertados(densidad, compatCB, radioMax, maxCompatibles, 1.0);
  if (total === 0) return 0;
  return Math.min(99.9, (dispositivosAlertados(densidad, compatCB, radioKm, maxCompatibles, 1.0) / total) * 100);
}

// D_escape = V × (demoraLegal + tiempoSimulacion / 60)
// demoraLegalHoras: horas que tardó el juez en autorizar el protocolo
// En t=0 de simulación, el secuestrador ya se desplazó demoraLegalHoras horas
function distanciaEscape(velKmh, tiempoSimulacionMin, demoraLegalHoras = 0) {
  return velKmh * (demoraLegalHoras + tiempoSimulacionMin / 60);
}

function metricasRed(dispositivos) {
  const dispositivosIP    = Math.floor(dispositivos * IP_PCT);
  const dispositivosSMS   = dispositivos - dispositivosIP;
  const tiempoUnicastSeg  = dispositivos    / SMSC_RATE;
  const tiempoSMSFallback = dispositivosSMS / SMSC_RATE;
  return {
    totalDispositivos:    dispositivos,
    dispositivosIP,
    dispositivosSMS,
    smscRate:             SMSC_RATE,
    tiempoUnicastSeg,
    tiempoSMSFallback,
    tiempoUnicastMin:     tiempoUnicastSeg / 60,
    superaUmbral:         tiempoSMSFallback > 120,
    complejidadUnicast:   "O(n)",
  };
}

function kpisValidacion(escenario, densidad, tiempoEfectivo, cap, maxCompatibles, profugo) {
  const fase  = getFase(escenario, tiempoEfectivo);
  const r     = Math.min(fase.radio, cap);
  const cov   = profugo
    ? 100.0
    : coberturaPct(densidad, escenario.compatCB, escenario.fases, r, cap, maxCompatibles);
  const covF1 = coberturaPct(
    densidad, escenario.compatCB, escenario.fases,
    Math.min(escenario.fases[0].radio, cap), cap, maxCompatibles
  );
  const latOk    = !escenario.sinCobertura;
  const f2Activa = tiempoEfectivo >= escenario.fases[1].tInicio;
  return [
    { kpi: "Latencia SMSC → antena",         resultado: latOk ? "3.22 seg" : "N/A",         criterio: "≤ 10 seg",           estado: latOk ? "PASS" : "N/A"       },
    { kpi: "Cobertura Fase 1",               resultado: `${covF1.toFixed(1)}%`,              criterio: "≥ 85%",              estado: covF1 >= 85 ? "PASS" : "FAIL" },
    { kpi: "Cobertura fase activa",          resultado: `${cov.toFixed(1)}%`,                criterio: "≥ 85%",              estado: cov >= 85 ? "PASS" : "FAIL"   },
    { kpi: "Modo silencio superado",         resultado: "98.4%",                             criterio: "≥ 98%",              estado: "PASS"                        },
    { kpi: "Sin internet / saldo",           resultado: latOk ? "100%" : "N/A",              criterio: "100%",               estado: latOk ? "PASS" : "N/A"        },
    { kpi: "Expansión F1→F2 automática",     resultado: f2Activa ? "18 seg" : "Pendiente",   criterio: "≤ 30 seg",           estado: f2Activa ? "PASS" : "—"       },
    { kpi: "Contención Interjurisdicc.",     resultado: profugo ? "FUGA DETECTADA" : "OK",   criterio: "D_esc < R_max prov.", estado: profugo ? "FAIL" : "PASS"     },
  ];
}

router.get("/provincias", (req, res) => res.json(PROVINCIAS));
router.get("/escenarios", (req, res) => res.json(Object.values(ESCENARIOS)));

router.post("/simular", (req, res) => {
  const {
    provinciaId, escenarioId,
    overrideVel, overrideRadioBase,
  } = req.body;

  // tiempoTotal: minutos de simulación DESPUÉS de emitida la alerta (t=0 = botón presionado)
  const tiempoTotal  = Math.max(0, Number(req.body.tiempoTotal ?? req.body.tMin ?? 120));
  // demoraLegal: horas que tardó la autorización judicial (el secuestrador se movió en ese tiempo)
  const demoraLegal  = Math.max(0, Number(req.body.demoraLegal ?? 0));
  // Tiempo efectivo = demora convertida a minutos + tiempo de simulación
  const tiempoEfectivo = demoraLegal * 60 + tiempoTotal;

  const escenario = ESCENARIOS[escenarioId];
  if (!escenario) return res.status(400).json({ error: "Escenario inválido" });

  const provincia = PROVINCIAS.find((p) => p.id === provinciaId);
  if (!provincia)  return res.status(400).json({ error: "Provincia inválida" });

  const densidad = getDensidad(provinciaId);
  const vel      = overrideVel       || escenario.velEscape;
  const r0       = overrideRadioBase || escenario.radioBase;

  const maxCompatibles = Math.floor(provincia.poblacion * escenario.compatCB);
  const capProvincia   = radioMaxDeProvincia(provincia.superficie);

  // La fase y el radio se calculan sobre tiempoEfectivo
  // Efecto clave: si demoraLegal=8h, el sistema arranca en Fase 3 directamente
  const { radioFase, radioContinuo, cap, fasesActivas } = radiosDinamico(
    escenario, tiempoEfectivo, overrideVel, overrideRadioBase, provincia.superficie
  );

  const faseIdx   = getFaseIdx(escenario, tiempoEfectivo);
  const fase      = escenario.fases[faseIdx];
  // ACUMULATIVO: factor geo es la suma ponderada de todas las fases activas
  const factorGeo = getFactorGeoAcumulativo(escenario, tiempoEfectivo);

  // D_escape al momento de la simulación incluye el tiempo que el secuestrador
  // ya lleva desplazándose desde que comenzó el crimen
  const dEscape = r2(distanciaEscape(vel, tiempoTotal, demoraLegal));

  const profugoInterjurisdiccional = dEscape > capProvincia;

  let radioEfectivo, dispositivosTotal, contiene;

  if (profugoInterjurisdiccional) {
    radioEfectivo     = r2(capProvincia);
    dispositivosTotal = maxCompatibles;
    contiene          = false;
  } else {
    radioEfectivo     = r2(Math.min(radioFase, capProvincia));
    dispositivosTotal = dispositivosAlertados(
      densidad, escenario.compatCB, radioEfectivo, maxCompatibles, factorGeo
    );
    contiene = radioEfectivo >= dEscape;
  }

  let modoGeovallado      = "NORMAL";
  let dispositivosUnicast = dispositivosTotal;
  let pctDescarte         = 0;

  if (radioEfectivo > UMBRAL_GEOVALLADO && !profugoInterjurisdiccional) {
    const geo           = geovalladoCritico(radioEfectivo, dispositivosTotal);
    modoGeovallado      = geo.modoGeovallado;
    dispositivosUnicast = geo.unicastFiltrado;
    pctDescarte         = geo.pctDescarte;
  }

  const dispositivos = dispositivosUnicast;

  const area      = r2(areaCubierta(radioEfectivo));
  const cobertura = profugoInterjurisdiccional
    ? r2(100.0)
    : r2(coberturaPct(densidad, escenario.compatCB, escenario.fases, radioEfectivo, cap, maxCompatibles));

  const redMetrics       = metricasRed(dispositivos);
  const tSeg             = tiempoTotal * 60;
  const mensajesEnviados = Math.min(redMetrics.dispositivosSMS, Math.floor(tSeg * SMSC_RATE));
  const colaRestante     = Math.max(0, redMetrics.dispositivosSMS - mensajesEnviados);
  const latenciaSMSC     = redMetrics.tiempoSMSFallback;

  // Serie temporal para auto-play
  // paso fijo de 30min para resolución adecuada en la animación
  const pasoSerie = Number(req.body.seriesPaso) || (tiempoTotal <= 120 ? 5 : tiempoTotal <= 360 ? 10 : 30);
  const serie = [];
  for (let t = 0; t <= Math.max(tiempoTotal, 360); t += pasoSerie) {
    const tEf  = demoraLegal * 60 + t;
    const { radioFase: rf, fasesActivas: fasesT } = radiosDinamico(
      escenario, tEf, overrideVel, overrideRadioBase, provincia.superficie
    );
    // ACUMULATIVO: factor geo depende del número de fases activas
    const factorT    = getFactorGeoAcumulativo(escenario, tEf);
    const rfCapped   = r2(Math.min(rf, capProvincia));
    const dispT      = dispositivosAlertados(densidad, escenario.compatCB, rfCapped, maxCompatibles, factorT);
    const dEscapeT   = r2(distanciaEscape(vel, t, demoraLegal));
    const profugoT   = dEscapeT > capProvincia;
    const faseIdxT   = getFaseIdx(escenario, tEf);
    serie.push({
      t,
      radio:        rfCapped,
      area:         r2(areaCubierta(rfCapped)),
      dispositivos: dispT,
      cobertura:    r2(coberturaPct(densidad, escenario.compatCB, escenario.fases, rfCapped, cap, maxCompatibles)),
      dEscape:      dEscapeT,
      contiene:     !profugoT && rfCapped >= dEscapeT,
      profugo:      profugoT,
      faseIdx:      faseIdxT,
      fasesActivas: fasesT, // Agregamos info de fases activas
    });
  }

  const kpis    = kpisValidacion(escenario, densidad, tiempoEfectivo, cap, maxCompatibles, profugoInterjurisdiccional);
  const latencia = escenario.sinCobertura
    ? {
        "SIFEBU → SMSC AlertAR":   "N/A (sin red IP)",
        "SMSC → Pasarela SMS":     "N/A (sin red celular)",
        "Pasarela → Antenas":      "N/A",
        "Antenas → Dispositivos":  "N/A",
        "Canal alternativo":       "~15 seg (radio VHF/FM)",
        TOTAL:                     "~15 seg (canal alternativo)",
      }
    : {
        "SIFEBU → SMSC AlertAR":   "0.82 seg",
        "SMSC → Pasarela SMS":     "1.40 seg",
        "Pasarela → Antenas":      "0.68 seg",
        "Antenas → Dispositivos":  "0.32 seg",
        TOTAL:                     "3.22 seg",
      };

  res.json({
    escenario:  { ...escenario, velEfectiva: vel, radioBaseEfectivo: r0 },
    provincia, densidad,
    tiempoTotal,
    tMin:          tiempoTotal,
    demoraLegal,
    tiempoEfectivo,
    fase, faseIdx, factorGeo,
    profugoInterjurisdiccional,
    esFase4:       profugoInterjurisdiccional,
    radioEfectivo,
    radioContinuo: r2(radioContinuo),
    radioMaxProvincia: r2(capProvincia),
    capProvincia:      r2(capProvincia),
    area,
    dispositivos,
    dispositivosTotal,
    dispositivosUnicast,
    maxCompatibles,
    maxCompatiblesTotal: maxCompatibles,
    dispositivosIP:    redMetrics.dispositivosIP,
    dispositivosSMS:   redMetrics.dispositivosSMS,
    modoGeovallado,
    pctDescarte,
    cobertura,
    dEscape,
    contiene,
    mensajesEnviados,
    colaRestante,
    latenciaSMSC,
    kpis, latencia, redMetrics, serie,
  });
});

router.post("/comparar", (req, res) => {
  const tiempoTotal  = Math.max(0, Number(req.body.tiempoTotal ?? req.body.tMin ?? 120));
  const demoraLegal  = Math.max(0, Number(req.body.demoraLegal ?? 0));
  const tiempoEfectivo = demoraLegal * 60 + tiempoTotal;

  const provincia = PROVINCIAS.find((p) => p.id === req.body.provinciaId);
  if (!provincia) return res.status(400).json({ error: "Provincia inválida" });

  const densidad     = getDensidad(req.body.provinciaId);
  const capProvincia = radioMaxDeProvincia(provincia.superficie);

  const comparacion = Object.values(ESCENARIOS).map((escenario) => {
    const maxCompatibles = Math.floor(provincia.poblacion * escenario.compatCB);
    const { radioFase, cap, fasesActivas } = radiosDinamico(escenario, tiempoEfectivo, null, null, provincia.superficie);
    // ACUMULATIVO: factor geo depende del número de fases activas
    const factorGeo       = getFactorGeoAcumulativo(escenario, tiempoEfectivo);
    const radioFaseCapped = r2(Math.min(radioFase, capProvincia));
    const dispTotal       = dispositivosAlertados(densidad, escenario.compatCB, radioFaseCapped, maxCompatibles, factorGeo);
    const cov             = coberturaPct(densidad, escenario.compatCB, escenario.fases, radioFaseCapped, cap, maxCompatibles);
    const dEsc            = r2(distanciaEscape(escenario.velEscape, tiempoTotal, demoraLegal));
    const profugo         = dEsc > capProvincia;

    let dispositivosUnicast = dispTotal;
    let modoGeovallado      = "NORMAL";
    let pctDescarte         = 0;

    if (radioFaseCapped > UMBRAL_GEOVALLADO && !profugo) {
      const geo           = geovalladoCritico(radioFaseCapped, dispTotal);
      dispositivosUnicast = geo.unicastFiltrado;
      modoGeovallado      = geo.modoGeovallado;
      pctDescarte         = geo.pctDescarte;
    }

    return {
      escenario:                  escenario.nombre,
      radio:                      radioFaseCapped,
      dispositivos:               dispositivosUnicast,
      dispositivosTotal:          dispTotal,
      dispositivosUnicast,
      modoGeovallado,
      pctDescarte,
      cobertura:                  cov,
      dEscape:                    dEsc,
      contiene:                   !profugo && radioFaseCapped >= dEsc,
      profugoInterjurisdiccional: profugo,
      velEscape:                  escenario.velEscape,
    };
  });

  res.json({ provincia, tMin: tiempoTotal, tiempoTotal, demoraLegal, comparacion });
});

module.exports = router;
