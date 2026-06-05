// Datos INDEC Censo 2022 — 24 provincias argentinas
// poblacion: habitantes | superficie: km²
const PROVINCIAS = [
  { id: "bsas",         nombre: "Buenos Aires",          poblacion: 17521141, superficie: 307571  },
  { id: "caba",         nombre: "CABA",                  poblacion: 3120612,  superficie: 200     },
  { id: "catamarca",    nombre: "Catamarca",              poblacion: 415438,   superficie: 102602  },
  { id: "chaco",        nombre: "Chaco",                  poblacion: 1143201,  superficie: 99633   },
  { id: "chubut",       nombre: "Chubut",                 poblacion: 618994,   superficie: 224686  },
  { id: "cordoba",      nombre: "Córdoba",                poblacion: 3978984,  superficie: 165321  },
  { id: "corrientes",   nombre: "Corrientes",             poblacion: 1120801,  superficie: 88199   },
  { id: "entrerios",    nombre: "Entre Ríos",             poblacion: 1426426,  superficie: 78781   },
  { id: "formosa",      nombre: "Formosa",                poblacion: 605193,   superficie: 72066   },
  { id: "jujuy",        nombre: "Jujuy",                  poblacion: 770881,   superficie: 53219   },
  { id: "lapampa",      nombre: "La Pampa",               poblacion: 358428,   superficie: 143440  },
  { id: "larioja",      nombre: "La Rioja",               poblacion: 393531,   superficie: 89680   },
  { id: "mendoza",      nombre: "Mendoza",                poblacion: 2014533,  superficie: 148827  },
  { id: "misiones",     nombre: "Misiones",               poblacion: 1261294,  superficie: 29801   },
  { id: "neuquen",      nombre: "Neuquén",                poblacion: 664057,   superficie: 94078   },
  { id: "rionegro",     nombre: "Río Negro",              poblacion: 747610,   superficie: 203013  },
  { id: "salta",        nombre: "Salta",                  poblacion: 1424397,  superficie: 155488  },
  { id: "sanjuan",      nombre: "San Juan",               poblacion: 781217,   superficie: 89651   },
  { id: "sanluis",      nombre: "San Luis",               poblacion: 508328,   superficie: 76748   },
  { id: "santacruz",    nombre: "Santa Cruz",             poblacion: 333473,   superficie: 243943  },
  { id: "santafe",      nombre: "Santa Fe",               poblacion: 3556522,  superficie: 133007  },
  { id: "santiago",     nombre: "Santiago del Estero",    poblacion: 978313,   superficie: 136351  },
  { id: "tierradelfuego", nombre: "Tierra del Fuego",     poblacion: 187226,   superficie: 21571   },
  { id: "tucuman",      nombre: "Tucumán",                poblacion: 1694656,  superficie: 22524   },
];

function getDensidad(provinciaId) {
  const p = PROVINCIAS.find((x) => x.id === provinciaId);
  if (!p) return 100;
  return p.poblacion / p.superficie;
}

module.exports = { PROVINCIAS, getDensidad };
