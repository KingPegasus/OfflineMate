/**
 * Weather from Open-Meteo (https://open-meteo.com): free, no account or API key. Only the place name the user
 * asked about is sent (to the geocoding API), then its coordinates (to the forecast API). No device location.
 * Pure helpers here; the tool wrapper with the Settings gate is in weather-tool.ts.
 */

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 10000;

/** Words that describe the question, not the place: "what's the weather like in London today?" → "London". */
const NOT_PLACE = new Set([
  "what", "what's", "whats", "is", "the", "weather", "like", "current", "currently", "today", "today's", "todays",
  "tonight", "tomorrow", "tomorrow's", "now", "right", "forecast", "temperature", "temp", "how", "hot", "cold", "warm",
  "it", "will", "rain", "raining", "going", "to", "be", "in", "for", "at", "around", "outside", "please", "tell", "me",
  "give", "check", "get", "show", "a", "an", "of", "this", "morning", "afternoon", "evening", "week", "weekend",
  "there", "do", "i", "need", "umbrella", "an", "and", "with", "your", "my",
]);
const TRAILING_TIME = /\s+(?:today|tonight|tomorrow|now|right now|currently|this (?:morning|afternoon|evening|week|weekend)|please)\b.*$/i;

export interface WeatherQuery {
  place: string | null;
  tomorrow: boolean;
}

/** Pull the place and the day out of a weather question. */
export function parseWeatherQuery(text: string): WeatherQuery {
  const clean = text.normalize("NFKC").replace(/[‘’ʼ]/g, "'").replace(/[?!.]+\s*$/, "").trim();
  const tomorrow = /\btomorrow\b/i.test(clean);
  // "… in London", "… for New York, US today": the place follows the last preposition.
  const prep = clean.match(/\b(?:in|for|at|around)\s+([A-Za-zÀ-ɏ][\wÀ-ɏ .,'-]*)$/i);
  if (prep) {
    const place = prep[1].replace(TRAILING_TIME, "").replace(/[\s,]+$/, "").trim();
    if (place && !NOT_PLACE.has(place.toLowerCase())) return { place: titleCase(place), tomorrow };
  }
  // "London weather", "weather Paris tomorrow": drop the question words and keep what's left.
  const words = clean.split(/\s+/).filter((w) => !NOT_PLACE.has(w.toLowerCase().replace(/[^a-z'À-ɏ]/g, "")));
  const rest = words.join(" ").replace(/^[\s,]+|[\s,]+$/g, "");
  if (rest && words.length <= 4) return { place: titleCase(rest), tomorrow };
  return { place: null, tomorrow };
}

function titleCase(s: string): string {
  return s.replace(/\b([a-zà-ɏ])/g, (m) => m.toUpperCase());
}

/** WMO weather interpretation codes, as Open-Meteo returns them. */
export function describeWeatherCode(code: number): string {
  if (code === 0) return "clear sky";
  if (code === 1) return "mainly clear";
  if (code === 2) return "partly cloudy";
  if (code === 3) return "overcast";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 55) return "drizzle";
  if (code === 56 || code === 57) return "freezing drizzle";
  if (code === 61) return "light rain";
  if (code === 63) return "rain";
  if (code === 65) return "heavy rain";
  if (code === 66 || code === 67) return "freezing rain";
  if (code === 71) return "light snow";
  if (code === 73) return "snow";
  if (code === 75) return "heavy snow";
  if (code === 77) return "snow grains";
  if (code === 80) return "light showers";
  if (code === 81) return "showers";
  if (code === 82) return "heavy showers";
  if (code === 85 || code === 86) return "snow showers";
  if (code === 95) return "thunderstorms";
  if (code === 96 || code === 99) return "thunderstorms with hail";
  return "mixed conditions";
}

const round = (n: number) => Math.round(n);
const toF = (c: number) => round((c * 9) / 5 + 32);

export interface GeoResult {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

export interface Forecast {
  current: { temperature_2m: number; apparent_temperature: number; weather_code: number; wind_speed_10m: number };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
    weather_code: number[];
  };
}

export function placeLabel(geo: GeoResult): string {
  return geo.country && geo.country !== geo.name ? `${geo.name}, ${geo.country}` : geo.name;
}

/** "London, United Kingdom: 14°C (57°F), partly cloudy. Feels like 12°C, wind 18 km/h. Today 9–15°C, 20% chance of rain." */
export function formatWeather(geo: GeoResult, f: Forecast, tomorrow: boolean): string {
  const place = placeLabel(geo);
  const day = tomorrow ? 1 : 0;
  const lo = round(f.daily.temperature_2m_min[day]!), hi = round(f.daily.temperature_2m_max[day]!);
  const pop = f.daily.precipitation_probability_max[day];
  const rain = pop == null ? "" : `, ${round(pop)}% chance of rain`;
  if (tomorrow) {
    return `${place} tomorrow: ${describeWeatherCode(f.daily.weather_code[1]!)}, ${lo}–${hi}°C (${toF(lo)}–${toF(hi)}°F)${rain}.`;
  }
  const c = f.current;
  return (
    `${place}: ${round(c.temperature_2m)}°C (${toF(c.temperature_2m)}°F), ${describeWeatherCode(c.weather_code)}. ` +
    `Feels like ${round(c.apparent_temperature)}°C, wind ${round(c.wind_speed_10m)} km/h. Today ${lo}–${hi}°C${rain}.`
  );
}

async function getJson<T>(url: string, fetchImpl: typeof fetch): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Weather service error ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Find the place. "Portland, US" prefers a match in that country or region. */
export async function geocodePlace(place: string, fetchImpl: typeof fetch = fetch): Promise<GeoResult | null> {
  const [name, hint] = place.split(",").map((s) => s.trim());
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(name!)}&count=5&language=en&format=json`;
  const data = await getJson<{ results?: (GeoResult & { country_code?: string })[] }>(url, fetchImpl);
  const results = data.results ?? [];
  if (hint) {
    const h = hint.toLowerCase();
    const match = results.find((r) =>
      [r.country, r.admin1, r.country_code].some((v) => typeof v === "string" && v.toLowerCase().startsWith(h)),
    );
    if (match) return match;
  }
  return results[0] ?? null;
}

export async function fetchForecast(geo: GeoResult, fetchImpl: typeof fetch = fetch): Promise<Forecast> {
  const url =
    `${FORECAST_URL}?latitude=${geo.latitude}&longitude=${geo.longitude}` +
    "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m" +
    "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code" +
    "&timezone=auto&forecast_days=2";
  return getJson<Forecast>(url, fetchImpl);
}
