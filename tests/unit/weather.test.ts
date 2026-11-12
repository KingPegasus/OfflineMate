import { routeIntent } from "@/ai/intent-router";
import { useSettingsStore } from "@/stores/settings-store";
import { selectToolFromInput } from "@/tools/tool-registry";
import { describeWeatherCode, formatWeather, geocodePlace, parseWeatherQuery, type Forecast } from "@/tools/weather";
import { weatherTool } from "@/tools/weather-tool";

// The registry imports every tool; stub their native modules (routing tests only need keywords).
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-notifications", () => ({}));
vi.mock("expo-calendar/legacy", () => ({}));
vi.mock("expo-contacts/legacy", () => ({}));
vi.mock("expo-alarm", () => ({}));
vi.mock("@/native/ios-alarms", () => ({}));
vi.mock("@/db/database", () => ({ getDb: () => ({}) }));
vi.mock("@/context/context-indexer", () => ({ indexNoteForRetrieval: vi.fn() }));

const london = { name: "London", country: "United Kingdom", admin1: "England", latitude: 51.5, longitude: -0.12 };
const forecast: Forecast = {
  current: { temperature_2m: 14.4, apparent_temperature: 12.2, weather_code: 2, wind_speed_10m: 17.6 },
  daily: {
    temperature_2m_max: [15.2, 11.6],
    temperature_2m_min: [8.7, 6.1],
    precipitation_probability_max: [20, 65],
    weather_code: [3, 61],
  },
};

/** A fetch that answers the geocoding and forecast URLs like Open-Meteo. */
function openMeteo(results: unknown[] = [london]) {
  return vi.fn(async (url: string) => ({
    ok: true,
    status: 200,
    json: async () => (url.includes("geocoding-api") ? { results } : forecast),
  })) as unknown as typeof fetch;
}

beforeEach(() => {
  useSettingsStore.setState({ webSearchEnabled: true });
});

describe("parseWeatherQuery", () => {
  it.each([
    ["What's the current weather in London?", "London", false],
    ["What’s the weather like in new york today?", "New York", false],
    ["Will it rain tomorrow in Lahore", "Lahore", true],
    ["Weather for Portland, US tomorrow", "Portland, US", true],
    ["london weather", "London", false],
    ["Paris weather tomorrow?", "Paris", true],
    ["What's the weather like?", null, false],
    ["Is it raining?", null, false],
  ])("%s → %s", (text, place, tomorrow) => {
    expect(parseWeatherQuery(text)).toEqual({ place, tomorrow });
  });
});

describe("weather wording", () => {
  it("describes WMO codes", () => {
    expect(describeWeatherCode(0)).toBe("clear sky");
    expect(describeWeatherCode(63)).toBe("rain");
    expect(describeWeatherCode(96)).toBe("thunderstorms with hail");
  });

  it("gives now, feels like, wind and today's range, in °C with °F", () => {
    expect(formatWeather(london, forecast, false)).toBe(
      "London, United Kingdom: 14°C (58°F), partly cloudy. Feels like 12°C, wind 18 km/h. Today 9–15°C, 20% chance of rain.",
    );
  });

  it("gives tomorrow's forecast when asked", () => {
    expect(formatWeather(london, forecast, true)).toBe(
      "London, United Kingdom tomorrow: light rain, 6–12°C (43–54°F), 65% chance of rain.",
    );
  });
});

describe("geocodePlace", () => {
  it('prefers the country or region after a comma ("Portland, US")', async () => {
    const oregon = { name: "Portland", country: "United States", country_code: "US", admin1: "Oregon", latitude: 45.5, longitude: -122.7 };
    const victoria = { name: "Portland", country: "Australia", country_code: "AU", admin1: "Victoria", latitude: -38.3, longitude: 141.6 };
    const fetchImpl = openMeteo([victoria, oregon]);
    await expect(geocodePlace("Portland, US", fetchImpl)).resolves.toMatchObject({ admin1: "Oregon" });
    await expect(geocodePlace("Portland", fetchImpl)).resolves.toMatchObject({ admin1: "Victoria" });
    expect(String(vi.mocked(fetchImpl).mock.calls[0]![0])).toContain("name=Portland&");
  });
});

describe("weather.current", () => {
  it("returns the real conditions from Open-Meteo", async () => {
    vi.stubGlobal("fetch", openMeteo());
    const result = await weatherTool.execute({ text: "What's the current weather in London?" });
    expect(result).toMatchObject({ ok: true, payload: { location: "London, United Kingdom", source: "open-meteo" } });
    expect(result.message).toMatch(/^London, United Kingdom: 14°C/);
    vi.unstubAllGlobals();
  });

  it("sends nothing when web search is off", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    useSettingsStore.setState({ webSearchEnabled: false });
    const result = await weatherTool.execute({ text: "Weather in London" });
    expect(result).toMatchObject({ ok: false, errorCode: "PERMISSION_DENIED" });
    expect(result.message).toContain("Settings tab");
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("asks for a place instead of guessing, and says when it can't find one", async () => {
    vi.stubGlobal("fetch", openMeteo([]));
    await expect(weatherTool.execute({ text: "What's the weather like?" })).resolves.toMatchObject({ ok: false, errorCode: "PARSE_FAILURE" });
    const missing = await weatherTool.execute({ text: "Weather in Atlantis" });
    expect(missing.message).toBe('I couldn\'t find a place called "Atlantis". Try adding the country.');
    vi.unstubAllGlobals();
  });

  it("explains a missing connection", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Network request failed"); }));
    await expect(weatherTool.execute({ text: "Weather in London" })).resolves.toMatchObject({ ok: false, errorCode: "NETWORK_UNAVAILABLE" });
    vi.unstubAllGlobals();
  });
});

describe("weather routing", () => {
  it.each(["What's the current weather in London?", "Will it rain tomorrow in Lahore", "london weather", "How hot is it in Dubai?"])(
    "%s → weather.current",
    (text) => {
      expect(routeIntent(text)).toBe("tool");
      expect(selectToolFromInput(text)?.name).toBe("weather.current");
    },
  );

  it("leaves other temperatures and forecasts alone", () => {
    expect(routeIntent("What temperature should I bake bread at?")).toBe("direct");
    expect(routeIntent("Explain how a sales forecast works")).toBe("direct");
    expect(selectToolFromInput("What's the current price of gold?")?.name).toBe("search.web");
  });
});
