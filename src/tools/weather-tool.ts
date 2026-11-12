import type { Tool } from "@/tools/tool-registry";
import { useSettingsStore } from "@/stores/settings-store";
import { fetchForecast, formatWeather, geocodePlace, parseWeatherQuery, placeLabel } from "@/tools/weather";

/**
 * Current weather or tomorrow's forecast for a named place, from Open-Meteo. It needs the internet, so it
 * follows the same switch as web search (Settings > Web search): off means nothing is sent.
 */
export const weatherTool: Tool = {
  name: "weather.current",
  description: "Current weather or tomorrow's forecast for a city. Requires internet.",
  // Longer phrases score higher than search.web's "what's the current" (scoreToolMatch prefers the longest match),
  // so "What's the current weather in London?" comes here, not to web search.
  keywords: [
    "weather",
    "what's the current weather",
    "what is the current weather",
    "what's the weather",
    "what is the weather",
    "current weather",
    "today's weather",
    "weather today",
    "weather tomorrow",
    "weather in",
    "weather like",
    "weather forecast",
    "temperature in",
    "temperature outside",
    "how hot is it",
    "how cold is it",
    "will it rain",
    "is it raining",
    "going to rain",
    "need an umbrella",
  ],
  params: { optional: ["query", "location"] },
  execute: async (params) => {
    if (!useSettingsStore.getState().webSearchEnabled) {
      return {
        ok: false,
        message: "Weather needs the internet, and web search is turned off. Turn it on in OfflineMate's Settings tab to get the weather.",
        errorCode: "PERMISSION_DENIED",
      };
    }
    // Prefer the user's own words; the planner's "location" arg is a fallback.
    const fromText = parseWeatherQuery(params.text || params.query || "");
    const place = fromText.place ?? (params.location?.trim() || null);
    if (!place) {
      return {
        ok: false,
        message: 'Which place? Try "What\'s the weather in London?"',
        errorCode: "PARSE_FAILURE",
      };
    }
    try {
      const geo = await geocodePlace(place);
      if (!geo) {
        return { ok: false, message: `I couldn't find a place called "${place}". Try adding the country.`, errorCode: "PARSE_FAILURE" };
      }
      const forecast = await fetchForecast(geo);
      return {
        ok: true,
        message: formatWeather(geo, forecast, fromText.tomorrow),
        payload: { location: placeLabel(geo), source: "open-meteo" },
      };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      const network =
        err.name === "AbortError" || /network|fetch|timed? ?out/i.test(err.message);
      return {
        ok: false,
        message: network
          ? "Internet unavailable. Weather needs a connection; check it and try again."
          : `Couldn't get the weather: ${err.message}`,
        errorCode: network ? "NETWORK_UNAVAILABLE" : "UNKNOWN",
        retryable: true,
      };
    }
  },
};
