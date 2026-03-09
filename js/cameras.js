/**
 * ============================================================
 *  YEY cam — CAMARAS
 *  Edita este archivo para agregar, cambiar u ocultar camaras.
 *
 *  CAMPOS:
 *  ───────
 *  id          → Numero unico. No repitas.
 *  title       → Nombre visible en la web.
 *  description → Texto del hero (1-2 lineas).
 *  country     → Pais de la camara.
 *  region      → "Asia" | "Europa" | "America" | "Africa" | "Oceania"
 *  category    → "Ciudad" | "Naturaleza" | "Mar" | "General"
 *  url         → Link del stream:
 *                  YouTube:  https://www.youtube.com/embed/VIDEO_ID?autoplay=1&mute=1&controls=1&rel=0
 *                  HLS:      https://ejemplo.com/stream.m3u8
 *                  Video:    https://ejemplo.com/video.mp4
 *  thumb       → Miniatura. YouTube: https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg
 *  live        → true = badge EN VIVO | false = sin badge
 *  featured    → true = aparece en el hero principal
 *  active      → false = oculta la camara sin borrarla
 * ============================================================
 */

const CAMERAS = [

  // ── ASIA ──────────────────────────────────────────────────
  {
    id: 1,
    title: "Shibuya Crossing",
    description: "El cruce peatonal mas transitado del mundo. Mas de 2,500 personas cruzan cada vez que cambia el semaforo.",
    country: "Japon",
    region: "Asia",
    category: "Ciudad",
    url: "https://www.youtube.com/embed/ydYDqZQpim8?autoplay=1&mute=1&controls=1&rel=0",
    thumb: "https://img.youtube.com/vi/ydYDqZQpim8/maxresdefault.jpg",
    live: true,
    featured: true,
    active: true
  },
  {
    id: 2,
    title: "Bosque de Bambu, Kyoto",
    description: "Arashiyama al amanecer. Canas de bambu de 20 metros creando un tunel de silencio.",
    country: "Japon",
    region: "Asia",
    category: "Naturaleza",
    url: "https://www.youtube.com/embed/vB5bS0wkgxg?autoplay=1&mute=1&controls=1&rel=0",
    thumb: "https://img.youtube.com/vi/vB5bS0wkgxg/maxresdefault.jpg",
    live: false,
    featured: false,
    active: true
  },
  {
    id: 3,
    title: "Playa Maldivas",
    description: "Aguas turquesa en el Oceano Indico. El paraiso existe y esta aqui.",
    country: "Maldivas",
    region: "Asia",
    category: "Mar",
    url: "https://www.youtube.com/embed/JxzzhDPHm_E?autoplay=1&mute=1&controls=1&rel=0",
    thumb: "https://img.youtube.com/vi/JxzzhDPHm_E/maxresdefault.jpg",
    live: true,
    featured: true,
    active: true
  },

  // ── EUROPA ────────────────────────────────────────────────
  {
    id: 4,
    title: "Trafalgar Square",
    description: "El corazon historico de Londres. La columna de Nelson vigila la plaza desde 1843.",
    country: "Reino Unido",
    region: "Europa",
    category: "Ciudad",
    url: "https://www.youtube.com/embed/oFGuA7KwKS8?autoplay=1&mute=1&controls=1&rel=0",
    thumb: "https://img.youtube.com/vi/oFGuA7KwKS8/maxresdefault.jpg",
    live: false,
    featured: false,
    active: true
  },
  {
    id: 5,
    title: "Costa Amalfi",
    description: "Acantilados de colores, limoneros y el Mar Tirreno en su estado mas puro.",
    country: "Italia",
    region: "Europa",
    category: "Mar",
    url: "https://www.youtube.com/embed/dqWS5s3BFNM?autoplay=1&mute=1&controls=1&rel=0",
    thumb: "https://img.youtube.com/vi/dqWS5s3BFNM/maxresdefault.jpg",
    live: true,
    featured: false,
    active: true
  },
  {
    id: 6,
    title: "Canal de Venecia",
    description: "Gondolas, palacios y la laguna veneciana al atardecer. La ciudad sobre el agua.",
    country: "Italia",
    region: "Europa",
    category: "Ciudad",
    url: "https://www.youtube.com/embed/q_yM9Xm-W3Y?autoplay=1&mute=1&controls=1&rel=0",
    thumb: "https://img.youtube.com/vi/q_yM9Xm-W3Y/maxresdefault.jpg",
    live: true,
    featured: false,
    active: true
  },
  {
    id: 7,
    title: "Alpes Suizos",
    description: "Cumbres nevadas, valles verdes y silencio absoluto. Naturaleza en estado puro.",
    country: "Suiza",
    region: "Europa",
    category: "Naturaleza",
    url: "https://www.youtube.com/embed/XNiJBPHhkv0?autoplay=1&mute=1&controls=1&rel=0",
    thumb: "https://img.youtube.com/vi/XNiJBPHhkv0/maxresdefault.jpg",
    live: true,
    featured: true,
    active: true
  },
  {
    id: 8,
    title: "Plaza Roja",
    description: "El centro historico de Moscu. La catedral de San Basilio y la historia de Rusia.",
    country: "Rusia",
    region: "Europa",
    category: "Ciudad",
    url: "https://www.youtube.com/embed/JLMl9KhIUk0?autoplay=1&mute=1&controls=1&rel=0",
    thumb: "https://img.youtube.com/vi/JLMl9KhIUk0/maxresdefault.jpg",
    live: false,
    featured: false,
    active: true
  },
  {
    id: 9,
    title: "Glaciares de Islandia",
    description: "La isla de fuego y hielo. Glaciares milenarios y auroras boreales.",
    country: "Islandia",
    region: "Europa",
    category: "Naturaleza",
    url: "https://www.youtube.com/embed/QTZR-5Y8BNI?autoplay=1&mute=1&controls=1&rel=0",
    thumb: "https://img.youtube.com/vi/QTZR-5Y8BNI/maxresdefault.jpg",
    live: true,
    featured: false,
    active: true
  },

  // ── AMERICA ───────────────────────────────────────────────
  {
    id: 10,
    title: "Times Square",
    description: "El corazon de Nueva York. Luces de neon, anuncios gigantes y millones de personas.",
    country: "Estados Unidos",
    region: "America",
    category: "Ciudad",
    url: "https://www.youtube.com/embed/1EiC9bvVGnk?autoplay=1&mute=1&controls=1&rel=0",
    thumb: "https://img.youtube.com/vi/1EiC9bvVGnk/maxresdefault.jpg",
    live: true,
    featured: true,
    active: true
  },
  {
    id: 11,
    title: "Manhattan desde el aire",
    description: "El skyline mas reconocible del mundo visto desde las alturas de noche.",
    country: "Estados Unidos",
    region: "America",
    category: "Ciudad",
    url: "https://www.youtube.com/embed/2bMHKE9ynBE?autoplay=1&mute=1&controls=1&rel=0",
    thumb: "https://img.youtube.com/vi/2bMHKE9ynBE/maxresdefault.jpg",
    live: true,
    featured: false,
    active: true
  },

  // ── AFRICA ────────────────────────────────────────────────
  {
    id: 12,
    title: "Abrevadero de Kenia",
    description: "Elefantes, jirafas y leones en la sabana africana. La naturaleza mas salvaje.",
    country: "Kenia",
    region: "Africa",
    category: "Naturaleza",
    url: "https://www.youtube.com/embed/wnDTQLyGXAQ?autoplay=1&mute=1&controls=1&rel=0",
    thumb: "https://img.youtube.com/vi/wnDTQLyGXAQ/maxresdefault.jpg",
    live: true,
    featured: true,
    active: true
  },
  {
    id: 13,
    title: "Sahara al amanecer",
    description: "Dunas infinitas y el silencio del desierto mas grande del mundo.",
    country: "Marruecos",
    region: "Africa",
    category: "Naturaleza",
    url: "https://www.youtube.com/embed/WnU2BVBaLHE?autoplay=1&mute=1&controls=1&rel=0",
    thumb: "https://img.youtube.com/vi/WnU2BVBaLHE/maxresdefault.jpg",
    live: false,
    featured: false,
    active: true
  },

  // ── OCEANIA ───────────────────────────────────────────────
  {
    id: 14,
    title: "Gran Barrera de Coral",
    description: "El ecosistema marino mas grande del planeta, visible desde el espacio.",
    country: "Australia",
    region: "Oceania",
    category: "Naturaleza",
    url: "https://www.youtube.com/embed/zXh4dCkUBiY?autoplay=1&mute=1&controls=1&rel=0",
    thumb: "https://img.youtube.com/vi/zXh4dCkUBiY/maxresdefault.jpg",
    live: true,
    featured: false,
    active: true
  },
  {
    id: 15,
    title: "Opera de Sydney",
    description: "La silueta mas iconica de Australia reflejada en el Puerto de Sydney.",
    country: "Australia",
    region: "Oceania",
    category: "Ciudad",
    url: "https://www.youtube.com/embed/sFjE8DWqoaM?autoplay=1&mute=1&controls=1&rel=0",
    thumb: "https://img.youtube.com/vi/sFjE8DWqoaM/maxresdefault.jpg",
    live: true,
    featured: false,
    active: true
  },
  {
    id: 16,
    title: "Playa Bondi",
    description: "La playa urbana mas famosa de Australia. Olas perfectas y sol de Sydney.",
    country: "Australia",
    region: "Oceania",
    category: "Mar",
    url: "https://www.youtube.com/embed/9Cf-e1JlX00?autoplay=1&mute=1&controls=1&rel=0",
    thumb: "https://img.youtube.com/vi/9Cf-e1JlX00/maxresdefault.jpg",
    live: false,
    featured: false,
    active: true
  }

];
