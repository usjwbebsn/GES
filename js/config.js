/**
 * ============================================================
 *  YEY cam — CONFIGURACION DEL SITIO
 *  Edita este archivo para cambiar textos, colores y ajustes
 *  generales sin tocar el HTML ni el CSS principal.
 * ============================================================
 */

const CONFIG = {

  // ── IDENTIDAD ────────────────────────────────────────────
  site: {
    name:        "YEY cam",
    tagline:     "Camaras en vivo de todo el mundo",
    description: "Naturaleza, ciudades y oceanos en tiempo real.",
    // Cuantos segundos antes de rotar la camara del hero
    heroInterval: 12
  },

  // ── PALETA DE COLORES ────────────────────────────────────
  // Cambia cualquier valor hex aqui y se aplica en todo el sitio
  colors: {
    bg:      "#000000",   // Fondo principal
    surface: "#161616",   // Tarjetas y paneles
    border:  "#2e2e2e",   // Bordes y separadores
    text:    "#f5f5f7",   // Texto principal
    muted:   "#86868b",   // Texto secundario / metadatos
    accent:  "#2997ff",   // Azul de accion (links, botones)
    success: "#30d158"    // Verde (badge EN VIVO, confirmaciones)
  },

  // ── NAVEGACION ───────────────────────────────────────────
  // Pestanas visibles en la barra de navegacion superior
  // value debe coincidir con region o categoria de cameras.js
  navTabs: [
    { label: "Inicio",      value: "all"        },
    { label: "Ciudades",    value: "Ciudad"      },
    { label: "Naturaleza",  value: "Naturaleza"  },
    { label: "Mar",         value: "Mar"         }
  ],

  // ── FILTROS (pills bajo el hero) ─────────────────────────
  pills: [
    { label: "Todo",      value: "all"      },
    { label: "Asia",      value: "Asia"     },
    { label: "Europa",    value: "Europa"   },
    { label: "America",   value: "America"  },
    { label: "Africa",    value: "Africa"   },
    { label: "Oceania",   value: "Oceania"  }
  ],

  // ── SECCIONES (shelves) ──────────────────────────────────
  // Cambia los titulos de cada seccion de carruseles
  sections: {
    live:   "En vivo ahora",
    nature: "Naturaleza",
    cities: "Ciudades del mundo",
    sea:    "Mar y oceanos",
    other:  "Otras camaras"
  }

};
