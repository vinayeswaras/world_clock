export type ClockZone = {
  /** Action name. Never change it after release, or users lose their key assignments. */
  id: string;
  /** Default key label; users can rename it in settings.json. */
  city: string;
  country: string;
  /** IANA time zone name, e.g. "Asia/Tokyo". */
  timeZone: string;
  /** Folder in the Options+ action picker; empty string lists the clock at the top level. */
  group: string;
  /** Name in the Options+ action picker. */
  pickerLabel: string;
  description: string;
  /** Background map source, used by scripts/generate-shapes.mjs to build src/shapes.ts. */
  shape: ShapeSource;
};

export type ShapeSource =
  | { kind: 'country'; iso: string; at: [lon: number, lat: number]; clip?: Box | undefined }
  | { kind: 'circuit'; circuit: string }
  | { kind: 'globe' };

/** Only the country's polygons centred inside this box are drawn (drops Alaska, overseas territories, ...). */
type Box = [west: number, south: number, east: number, north: number];

type Place = { city: string; country: string; timeZone: string };
type WorldPlace = Place & { region: string; shape: ShapeSource };
/** `circuit` is the track id in github.com/bacinger/f1-circuits. */
type Race = Place & { round: number; id: string; grandPrix: string; dates: string; circuit: string };

/** `iso` is the Natural Earth ADM0_A3 code; lon/lat marks the city on the outline. */
const country = (iso: string, lon: number, lat: number, clip?: Box): ShapeSource => ({ kind: 'country', iso, at: [lon, lat], clip });
const CONTIGUOUS_US: Box = [-125, 24, -66, 50];

const WORLD: readonly WorldPlace[] = [
  { city: 'UTC', country: 'Coordinated Universal Time', timeZone: 'UTC', region: '', shape: { kind: 'globe' } },

  { city: 'Honolulu', country: 'USA', timeZone: 'Pacific/Honolulu', region: 'Americas', shape: country('USA', -157.86, 21.31, [-161, 18, -154, 23]) },
  { city: 'Los Angeles', country: 'USA', timeZone: 'America/Los_Angeles', region: 'Americas', shape: country('USA', -118.24, 34.05, CONTIGUOUS_US) },
  { city: 'Denver', country: 'USA', timeZone: 'America/Denver', region: 'Americas', shape: country('USA', -104.99, 39.74, CONTIGUOUS_US) },
  { city: 'Chicago', country: 'USA', timeZone: 'America/Chicago', region: 'Americas', shape: country('USA', -87.63, 41.88, CONTIGUOUS_US) },
  { city: 'New York', country: 'USA', timeZone: 'America/New_York', region: 'Americas', shape: country('USA', -74.01, 40.71, CONTIGUOUS_US) },
  { city: 'Toronto', country: 'Canada', timeZone: 'America/Toronto', region: 'Americas', shape: country('CAN', -79.38, 43.65) },
  { city: 'Mexico City', country: 'Mexico', timeZone: 'America/Mexico_City', region: 'Americas', shape: country('MEX', -99.13, 19.43) },
  { city: 'São Paulo', country: 'Brazil', timeZone: 'America/Sao_Paulo', region: 'Americas', shape: country('BRA', -46.63, -23.55) },

  { city: 'London', country: 'United Kingdom', timeZone: 'Europe/London', region: 'Europe & Africa', shape: country('GBR', -0.13, 51.51) },
  { city: 'Paris', country: 'France', timeZone: 'Europe/Paris', region: 'Europe & Africa', shape: country('FRA', 2.35, 48.86, [-6, 41, 10, 52]) },
  { city: 'Berlin', country: 'Germany', timeZone: 'Europe/Berlin', region: 'Europe & Africa', shape: country('DEU', 13.4, 52.52) },
  { city: 'Lagos', country: 'Nigeria', timeZone: 'Africa/Lagos', region: 'Europe & Africa', shape: country('NGA', 3.38, 6.52) },
  { city: 'Johannesburg', country: 'South Africa', timeZone: 'Africa/Johannesburg', region: 'Europe & Africa', shape: country('ZAF', 28.05, -26.2, [16, -35, 33, -22]) },
  { city: 'Istanbul', country: 'Türkiye', timeZone: 'Europe/Istanbul', region: 'Europe & Africa', shape: country('TUR', 28.98, 41.01) },
  { city: 'Moscow', country: 'Russia', timeZone: 'Europe/Moscow', region: 'Europe & Africa', shape: country('RUS', 37.62, 55.76) },

  { city: 'Dubai', country: 'UAE', timeZone: 'Asia/Dubai', region: 'Asia & Middle East', shape: country('ARE', 55.27, 25.2) },
  { city: 'New Delhi', country: 'India', timeZone: 'Asia/Kolkata', region: 'Asia & Middle East', shape: country('IND', 77.21, 28.61) },
  { city: 'Bangkok', country: 'Thailand', timeZone: 'Asia/Bangkok', region: 'Asia & Middle East', shape: country('THA', 100.5, 13.76) },
  { city: 'Singapore', country: 'Singapore', timeZone: 'Asia/Singapore', region: 'Asia & Middle East', shape: country('SGP', 103.82, 1.35) },
  { city: 'Shanghai', country: 'China', timeZone: 'Asia/Shanghai', region: 'Asia & Middle East', shape: country('CHN', 121.47, 31.23) },
  { city: 'Tokyo', country: 'Japan', timeZone: 'Asia/Tokyo', region: 'Asia & Middle East', shape: country('JPN', 139.69, 35.69) },
  { city: 'Seoul', country: 'South Korea', timeZone: 'Asia/Seoul', region: 'Asia & Middle East', shape: country('KOR', 126.98, 37.57) },

  { city: 'Sydney', country: 'Australia', timeZone: 'Australia/Sydney', region: 'Oceania', shape: country('AUS', 151.21, -33.87, [112, -44, 154, -10]) },
  { city: 'Auckland', country: 'New Zealand', timeZone: 'Pacific/Auckland', region: 'Oceania', shape: country('NZL', 174.76, -36.85, [165, -48, 179, -34]) },
];

// 2026 calendar as published on formula1.com (checked 30 Sep 2026): 23 rounds; the Bahrain GP runs at Sepang, Malaysia.
const F1_2026: readonly Race[] = [
  { round: 1, id: 'melbourne', grandPrix: 'Australian Grand Prix', dates: '6–8 Mar', city: 'Melbourne', country: 'Australia', timeZone: 'Australia/Melbourne', circuit: 'au-1953' },
  { round: 2, id: 'shanghai', grandPrix: 'Chinese Grand Prix', dates: '13–15 Mar', city: 'Shanghai', country: 'China', timeZone: 'Asia/Shanghai', circuit: 'cn-2004' },
  { round: 3, id: 'suzuka', grandPrix: 'Japanese Grand Prix', dates: '27–29 Mar', city: 'Suzuka', country: 'Japan', timeZone: 'Asia/Tokyo', circuit: 'jp-1962' },
  { round: 4, id: 'miami', grandPrix: 'Miami Grand Prix', dates: '1–3 May', city: 'Miami', country: 'USA', timeZone: 'America/New_York', circuit: 'us-2022' },
  { round: 5, id: 'montreal', grandPrix: 'Canadian Grand Prix', dates: '22–24 May', city: 'Montréal', country: 'Canada', timeZone: 'America/Toronto', circuit: 'ca-1978' },
  { round: 6, id: 'monaco', grandPrix: 'Monaco Grand Prix', dates: '5–7 Jun', city: 'Monaco', country: 'Monaco', timeZone: 'Europe/Monaco', circuit: 'mc-1929' },
  { round: 7, id: 'barcelona', grandPrix: 'Barcelona-Catalunya Grand Prix', dates: '12–14 Jun', city: 'Barcelona', country: 'Spain', timeZone: 'Europe/Madrid', circuit: 'es-1991' },
  { round: 8, id: 'spielberg', grandPrix: 'Austrian Grand Prix', dates: '26–28 Jun', city: 'Spielberg', country: 'Austria', timeZone: 'Europe/Vienna', circuit: 'at-1969' },
  { round: 9, id: 'silverstone', grandPrix: 'British Grand Prix', dates: '3–5 Jul', city: 'Silverstone', country: 'United Kingdom', timeZone: 'Europe/London', circuit: 'gb-1948' },
  { round: 10, id: 'spa', grandPrix: 'Belgian Grand Prix', dates: '17–19 Jul', city: 'Spa', country: 'Belgium', timeZone: 'Europe/Brussels', circuit: 'be-1925' },
  { round: 11, id: 'budapest', grandPrix: 'Hungarian Grand Prix', dates: '24–26 Jul', city: 'Budapest', country: 'Hungary', timeZone: 'Europe/Budapest', circuit: 'hu-1986' },
  { round: 12, id: 'zandvoort', grandPrix: 'Dutch Grand Prix', dates: '21–23 Aug', city: 'Zandvoort', country: 'Netherlands', timeZone: 'Europe/Amsterdam', circuit: 'nl-1948' },
  { round: 13, id: 'monza', grandPrix: 'Italian Grand Prix', dates: '4–6 Sep', city: 'Monza', country: 'Italy', timeZone: 'Europe/Rome', circuit: 'it-1922' },
  { round: 14, id: 'madrid', grandPrix: 'Spanish Grand Prix', dates: '11–13 Sep', city: 'Madrid', country: 'Spain', timeZone: 'Europe/Madrid', circuit: 'es-2026' },
  { round: 15, id: 'baku', grandPrix: 'Azerbaijan Grand Prix', dates: '24–26 Sep', city: 'Baku', country: 'Azerbaijan', timeZone: 'Asia/Baku', circuit: 'az-2016' },
  { round: 16, id: 'sepang', grandPrix: 'Bahrain Grand Prix in Malaysia', dates: '2–4 Oct', city: 'Sepang', country: 'Malaysia', timeZone: 'Asia/Kuala_Lumpur', circuit: 'my-1999' },
  { round: 17, id: 'singapore', grandPrix: 'Singapore Grand Prix', dates: '9–11 Oct', city: 'Singapore', country: 'Singapore', timeZone: 'Asia/Singapore', circuit: 'sg-2008' },
  { round: 18, id: 'austin', grandPrix: 'United States Grand Prix', dates: '23–25 Oct', city: 'Austin', country: 'USA', timeZone: 'America/Chicago', circuit: 'us-2012' },
  { round: 19, id: 'mexico_city', grandPrix: 'Mexico City Grand Prix', dates: '30 Oct–1 Nov', city: 'Mexico City', country: 'Mexico', timeZone: 'America/Mexico_City', circuit: 'mx-1962' },
  { round: 20, id: 'sao_paulo', grandPrix: 'São Paulo Grand Prix', dates: '6–8 Nov', city: 'São Paulo', country: 'Brazil', timeZone: 'America/Sao_Paulo', circuit: 'br-1940' },
  { round: 21, id: 'las_vegas', grandPrix: 'Las Vegas Grand Prix', dates: '19–21 Nov', city: 'Las Vegas', country: 'USA', timeZone: 'America/Los_Angeles', circuit: 'us-2023' },
  { round: 22, id: 'lusail', grandPrix: 'Qatar Grand Prix', dates: '27–29 Nov', city: 'Lusail', country: 'Qatar', timeZone: 'Asia/Qatar', circuit: 'qa-2004' },
  { round: 23, id: 'abu_dhabi', grandPrix: 'Abu Dhabi Grand Prix', dates: '4–6 Dec', city: 'Abu Dhabi', country: 'UAE', timeZone: 'Asia/Dubai', circuit: 'ae-2009' },
];

export const CLOCKS: readonly ClockZone[] = [
  ...WORLD.map(({ region, ...place }): ClockZone => ({
    ...place,
    // Keep this formula: existing key assignments reference these names.
    id: `clock_${place.timeZone.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    group: region,
    pickerLabel: `${place.city}, ${place.country}`,
    description: `Live time in ${place.city}, ${place.country} (${place.timeZone})`,
  })),
  ...F1_2026.map(({ round, id, grandPrix, dates, circuit, ...place }): ClockZone => ({
    ...place,
    id: `f1_${id}`,
    group: 'F1 Locations',
    pickerLabel: `R${String(round).padStart(2, '0')} ${place.city}, ${place.country}`,
    description: `2026 round ${round}: ${grandPrix}, ${dates} (${place.timeZone})`,
    shape: { kind: 'circuit', circuit },
  })),
];
