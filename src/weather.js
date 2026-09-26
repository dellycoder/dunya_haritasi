// Open-Meteo (anahtarsız, ücretsiz) üzerinden güncel hava durumu
const API = 'https://api.open-meteo.com/v1/forecast';

// WMO hava durumu kodları → Türkçe açıklama ve simge [gündüz, gece]
const CODES = {
  0: ['Açık', '☀️', '🌙'],
  1: ['Çoğunlukla açık', '🌤️', '🌙'],
  2: ['Parçalı bulutlu', '⛅', '☁️'],
  3: ['Kapalı', '☁️', '☁️'],
  45: ['Sisli', '🌫️', '🌫️'],
  48: ['Kırağılı sis', '🌫️', '🌫️'],
  51: ['Hafif çisenti', '🌦️', '🌧️'],
  53: ['Çisenti', '🌦️', '🌧️'],
  55: ['Yoğun çisenti', '🌧️', '🌧️'],
  56: ['Donan çisenti', '🌧️', '🌧️'],
  57: ['Yoğun donan çisenti', '🌧️', '🌧️'],
  61: ['Hafif yağmur', '🌦️', '🌧️'],
  63: ['Yağmurlu', '🌧️', '🌧️'],
  65: ['Şiddetli yağmur', '🌧️', '🌧️'],
  66: ['Donan yağmur', '🌧️', '🌧️'],
  67: ['Şiddetli donan yağmur', '🌧️', '🌧️'],
  71: ['Hafif kar', '🌨️', '🌨️'],
  73: ['Karlı', '🌨️', '🌨️'],
  75: ['Yoğun kar', '❄️', '❄️'],
  77: ['Kar taneleri', '🌨️', '🌨️'],
  80: ['Hafif sağanak', '🌦️', '🌧️'],
  81: ['Sağanak yağış', '🌧️', '🌧️'],
  82: ['Şiddetli sağanak', '⛈️', '⛈️'],
  85: ['Kar sağanağı', '🌨️', '🌨️'],
  86: ['Yoğun kar sağanağı', '❄️', '❄️'],
  95: ['Gök gürültülü fırtına', '⛈️', '⛈️'],
  96: ['Dolu ile fırtına', '⛈️', '⛈️'],
  99: ['Şiddetli dolu ile fırtına', '⛈️', '⛈️'],
};

export function describe(code, isDay = true) {
  const [text, day, night] = CODES[code] ?? ['Bilinmiyor', '🌡️', '🌡️'];
  return { text, icon: isDay ? day : night };
}

const DIRS = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
export const windDir = (deg) => DIRS[Math.round(deg / 45) % 8];

const cache = new Map();
const TTL = 10 * 60 * 1000;

export async function getWeather(lat, lng, { force = false } = {}) {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const hit = cache.get(key);
  if (!force && hit && Date.now() - hit.at < TTL) return hit.data;

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    current: [
      'temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'is_day',
      'weather_code', 'wind_speed_10m', 'wind_direction_10m', 'surface_pressure',
      'precipitation', 'cloud_cover',
    ].join(','),
    daily: [
      'weather_code', 'temperature_2m_max', 'temperature_2m_min',
      'sunrise', 'sunset', 'precipitation_probability_max', 'uv_index_max',
    ].join(','),
    timezone: 'auto',
    forecast_days: 6,
  });
  const res = await fetch(`${API}?${params}`);
  if (!res.ok) throw new Error(`Hava durumu alınamadı (${res.status})`);
  const data = await res.json();
  cache.set(key, { at: Date.now(), data });
  return data;
}
