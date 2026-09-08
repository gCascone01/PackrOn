import type { Itinerary, Stop, StopCategory } from "./types"
import type { Locale } from "./i18n"

let idCounter = 0
const uid = (prefix: string) => `${prefix}-${(idCounter++).toString(36)}`

export function buildRoadTripItinerary(): Itinerary {
  idCounter = 0
  return {
    mode: "road",
    title: "Anello dell'Europa Centrale",
    subtitle: "Vienna · Wachau · Bratislava · Moravia meridionale",
    origin: "Vienna, Austria",
    loop: true,
    vehicle: { type: "diesel", consumption: 6.5, fuelPrice: 1.72 },
    tollNotices: [
      { id: "n1", country: "Austria", label: "Vignetta Austria 10 giorni (obbligatoria)", cost: 11.5, kind: "vignette" },
      { id: "n2", country: "Slovacchia", label: "Vignetta Slovacchia 10 giorni", cost: 12, kind: "vignette" },
      { id: "n3", country: "Rep. Ceca", label: "Vignetta digitale Cechia 10 giorni", cost: 17, kind: "vignette" },
      { id: "n4", country: "Austria", label: "Pedaggio tunnel / tratte speciali (stima)", cost: 14, kind: "toll" },
    ],
    days: [
      {
        id: uid("day"),
        dayNumber: 1,
        title: "Vienna imperiale",
        distanceKm: 22,
        stops: [
          stop("Palazzo di Schönbrunn", "Reggia asburgica con giardini barocchi.", "cultura", "09:00", "2h 30m", "Parcheggio P1 a pagamento, 3,60 €/h", 48.1855, 16.3122),
          stop("Centro storico & Duomo di Santo Stefano", "Passeggiata tra Graben, Kärntner e la cattedrale gotica.", "citta", "12:30", "3h", "Garage Am Hof (interrato)", 48.2085, 16.3735),
          stop("Prater al tramonto", "Ruota panoramica storica e viale alberato.", "panorama", "18:00", "1h 30m", "Riesenradplatz, parcheggio gratuito serale", 48.2166, 16.3958),
        ],
      },
      {
        id: uid("day"),
        dayNumber: 2,
        title: "Valle della Wachau",
        distanceKm: 118,
        stops: [
          stop("Abbazia di Melk", "Monastero benedettino affacciato sul Danubio.", "cultura", "09:30", "1h 45m", "Parcheggio bus/auto ai piedi dell'abbazia", 48.2281, 15.3327),
          stop("Vigneti di Spitz", "Strada del vino tra terrazzamenti sul fiume.", "natura", "12:00", "1h", "Aree di sosta panoramiche B3", 48.3667, 15.4139),
          stop("Dürnstein", "Borgo con rovine del castello di Riccardo Cuor di Leone.", "borgo", "14:30", "2h", "Parcheggio P2 fuori dal borgo pedonale", 48.3959, 15.5222),
        ],
      },
      {
        id: uid("day"),
        dayNumber: 3,
        title: "Bratislava, capitale sul Danubio",
        distanceKm: 96,
        stops: [
          stop("Castello di Devín", "Rovine a strapiombo sulla confluenza Danubio-Morava.", "panorama", "09:45", "1h 30m", "Parcheggio ai piedi della rocca", 48.1739, 16.9793),
          stop("Castello di Bratislava", "Fortezza bianca con vista sulla città vecchia.", "cultura", "12:00", "1h 30m", "Garage sotto il castello", 48.1420, 17.1000),
          stop("Città vecchia & Michael's Gate", "Vicoli, caffè storici e la porta medievale.", "citta", "15:00", "2h 30m", "Parcheggio Eurovea", 48.1440, 17.1090),
        ],
      },
      {
        id: uid("day"),
        dayNumber: 4,
        title: "Moravia meridionale",
        distanceKm: 132,
        stops: [
          stop("Mikulov", "Cittadina barocca tra le colline dei vigneti.", "borgo", "10:00", "1h 30m", "Parcheggio Náměstí (centrale)", 48.8055, 16.6383),
          stop("Castello di Lednice", "Residenza neogotica e parco patrimonio UNESCO.", "cultura", "12:30", "2h", "Ampio parcheggio del parco", 48.8010, 16.8050),
          stop("Palava — riserva naturale", "Sentiero panoramico tra rocce calcaree e steppa.", "natura", "16:00", "1h 30m", "Area sosta trailhead Klentnice", 48.8722, 16.6392),
        ],
      },
      {
        id: uid("day"),
        dayNumber: 5,
        title: "Rientro panoramico a Vienna",
        distanceKm: 108,
        stops: [
          stop("Laa an der Thaya", "Terme e caffè di confine per una pausa lenta.", "sosta", "10:00", "1h", "Parcheggio terme gratuito", 48.7222, 16.3886),
          stop("Cantina di Poysdorf", "Degustazione veloce lungo la Weinstrasse.", "food", "12:00", "1h 15m", "Cortile della cantina", 48.6667, 16.6333),
          stop("Vienna — rientro", "Chiusura dell'anello nel punto di partenza.", "citta", "15:30", "—", "Deposito auto / hotel", 48.2082, 16.3738),
        ],
      },
    ],
  }
}

export function buildCityTripItinerary(): Itinerary {
  idCounter = 0
  return {
    mode: "city",
    title: "Siviglia in 3 giorni",
    subtitle: "Barrio Santa Cruz · Triana · Guadalquivir",
    origin: "Siviglia, Spagna",
    loop: false,
    vehicle: { type: "benzina", consumption: 0, fuelPrice: 0 },
    tollNotices: [],
    days: [
      {
        id: uid("day"),
        dayNumber: 1,
        title: "Cuore monumentale",
        distanceKm: 0,
        stops: [
          stop("Cattedrale & Giralda", "La più grande cattedrale gotica al mondo.", "cultura", "09:30", "2h", undefined, 37.3859, -5.9932),
          stop("Real Alcázar", "Palazzo mudéjar con giardini incantati.", "cultura", "12:30", "2h 30m", undefined, 37.3830, -5.9903),
          stop("Barrio Santa Cruz", "Vicoli imbiancati dell'antica giudecca.", "citta", "17:00", "2h", undefined, 37.3855, -5.9895),
        ],
      },
      {
        id: uid("day"),
        dayNumber: 2,
        title: "Plaza & Triana",
        distanceKm: 0,
        stops: [
          stop("Plaza de España", "Emiciclo monumentale con ceramiche azulejos.", "panorama", "10:00", "1h 30m", undefined, 37.3772, -5.9869),
          stop("Metropol Parasol", "Terrazza panoramica in legno sul centro.", "panorama", "13:00", "1h", undefined, 37.3931, -5.9903),
          stop("Quartiere di Triana", "Ceramiche, tapas e flamenco sul fiume.", "food", "20:00", "2h 30m", undefined, 37.3833, -6.0025),
        ],
      },
      {
        id: uid("day"),
        dayNumber: 3,
        title: "Lungo il Guadalquivir",
        distanceKm: 0,
        stops: [
          stop("Torre del Oro", "Torre difensiva albarrana sul fiume.", "cultura", "10:00", "45m", undefined, 37.3826, -5.9964),
          stop("Parco di María Luisa", "Giardini ombreggiati per una pausa lenta.", "natura", "12:00", "1h 30m", undefined, 37.3746, -5.9884),
          stop("Mercado Lonja del Barranco", "Street food gourmet prima della partenza.", "food", "14:30", "1h 30m", undefined, 37.3888, -6.0006),
        ],
      },
    ],
  }
}

function stop(
  name: string,
  description: string,
  category: StopCategory,
  time: string,
  duration: string,
  parking: string | undefined,
  lat: number,
  lng: number,
): Stop {
  return { id: uid("stop"), name, description, category, time, duration, parking, lat, lng }
}

const ALT_POOL_IT: Array<Omit<Stop, "id" | "lat" | "lng">> = [
  { name: "Punto panoramico locale", description: "Belvedere consigliato dagli abitanti, poca folla.", category: "panorama", time: "—", duration: "45m", parking: "Area sosta libera" },
  { name: "Museo del territorio", description: "Piccolo museo per capire storia e tradizioni.", category: "cultura", time: "—", duration: "1h", parking: "Parcheggio comunale" },
  { name: "Trattoria tipica", description: "Cucina regionale genuina a prezzi onesti.", category: "food", time: "—", duration: "1h 15m", parking: "Sosta su strada" },
  { name: "Sentiero naturalistico", description: "Anello facile tra bosco e ruscelli.", category: "natura", time: "—", duration: "1h 30m", parking: "Trailhead segnalato" },
  { name: "Borgo nascosto", description: "Frazione medievale fuori dai circuiti turistici.", category: "borgo", time: "—", duration: "1h", parking: "Piazza del paese" },
]

const ALT_POOL_EN: Array<Omit<Stop, "id" | "lat" | "lng">> = [
  { name: "Local viewpoint", description: "A lookout locals recommend, with little crowd.", category: "panorama", time: "—", duration: "45m", parking: "Free pull-off" },
  { name: "Local history museum", description: "A small museum to understand the area’s story.", category: "cultura", time: "—", duration: "1h", parking: "Town parking" },
  { name: "Local trattoria", description: "Honest regional cooking at fair prices.", category: "food", time: "—", duration: "1h 15m", parking: "Street parking" },
]

/** Deterministic-ish mock of a targeted "change stop" API returning 3 alternatives. */
export function getAlternatives(stop: Stop, locale: Locale = "it"): Stop[] {
  const pool = locale === "en" ? ALT_POOL_EN : ALT_POOL_IT
  return pool.slice(0, 3).map((alt, i) => ({
    ...alt,
    id: uid("alt"),
    time: stop.time,
    lat: stop.lat + (i - 1) * 0.012,
    lng: stop.lng + (i - 1) * 0.014,
    parking: stop.parking ? alt.parking : undefined,
  }))
}
