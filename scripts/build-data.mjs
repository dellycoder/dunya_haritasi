// Ülke verisini birden fazla açık kaynaktan birleştirip src/data/countries.json üretir.
// Kullanım: npm run data
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const countries = require('world-countries/countries.json');
const ct = require('countries-and-timezones');
const cities = require('cities.json/cities.json');
const populations = require('country-json/src/country-by-population.json');

// Birden fazla saat dilimi olan ülkelerde başkentin saat dilimi
const CAPITAL_TZ = {
  AR: 'America/Argentina/Buenos_Aires', AU: 'Australia/Sydney', BR: 'America/Sao_Paulo',
  CA: 'America/Toronto', CL: 'America/Santiago', CN: 'Asia/Shanghai', CD: 'Africa/Kinshasa',
  CY: 'Asia/Nicosia', DE: 'Europe/Berlin', EC: 'America/Guayaquil', ES: 'Europe/Madrid',
  FM: 'Pacific/Pohnpei', GL: 'America/Nuuk', ID: 'Asia/Jakarta', KZ: 'Asia/Almaty',
  KI: 'Pacific/Tarawa', MX: 'America/Mexico_City', MH: 'Pacific/Majuro', MN: 'Asia/Ulaanbaatar',
  MY: 'Asia/Kuala_Lumpur', NZ: 'Pacific/Auckland', PG: 'Pacific/Port_Moresby', PT: 'Europe/Lisbon',
  PS: 'Asia/Hebron', PF: 'Pacific/Tahiti', RU: 'Europe/Moscow', UA: 'Europe/Kyiv',
  US: 'America/New_York', UZ: 'Asia/Tashkent', VN: 'Asia/Bangkok', TF: 'Indian/Kerguelen',
  UM: 'Pacific/Wake', AQ: 'Antarctica/McMurdo',
};

// Başkentlerin Türkçe adları (farklı yazılanlar)
const CAPITAL_TR = {
  'Moscow': 'Moskova', 'Athens': 'Atina', 'Washington D.C.': 'Washington', 'Beijing': 'Pekin',
  'Rome': 'Roma', 'Vienna': 'Viyana', 'Brussels': 'Brüksel', 'Copenhagen': 'Kopenhag',
  'Lisbon': 'Lizbon', 'Warsaw': 'Varşova', 'Prague': 'Prag', 'Bucharest': 'Bükreş',
  'Belgrade': 'Belgrad', 'Nicosia': 'Lefkoşa', 'Tbilisi': 'Tiflis', 'Baku': 'Bakü',
  'Tehran': 'Tahran', 'Baghdad': 'Bağdat', 'Damascus': 'Şam', 'Beirut': 'Beyrut',
  'Jerusalem': 'Kudüs', 'Cairo': 'Kahire', 'Tunis': 'Tunus', 'Algiers': 'Cezayir',
  'Tripoli': 'Trablus', 'Riyadh': 'Riyad', 'Kuwait City': 'Kuveyt', 'Doha': 'Doha',
  'Abu Dhabi': 'Abu Dabi', 'Muscat': 'Maskat', "Sana'a": 'Sana', 'Kabul': 'Kabil',
  'Tashkent': 'Taşkent', 'Ashgabat': 'Aşkabat', 'Dushanbe': 'Duşanbe', 'Bishkek': 'Bişkek',
  'Ulan Bator': 'Ulan Batur', 'Tokyo': 'Tokyo', 'Seoul': 'Seul', 'Pyongyang': 'Pyongyang',
  'New Delhi': 'Yeni Delhi', 'Kathmandu': 'Katmandu', 'Dhaka': 'Dakka', 'Mexico City': 'Meksiko',
  'Havana': 'Havana', 'Brasília': 'Brasilia', 'Bogotá': 'Bogota', 'Asunción': 'Asunción',
  'Kyiv': 'Kiev', 'Chișinău': 'Kişinev', 'Minsk': 'Minsk', 'Vilnius': 'Vilnius',
  'Sofia': 'Sofya', 'Skopje': 'Üsküp', 'Tirana': 'Tiran', 'Podgorica': 'Podgorica',
  'Sarajevo': 'Saraybosna', 'Zagreb': 'Zagreb', 'Budapest': 'Budapeşte', 'Bern': 'Bern',
  'Luxembourg': 'Lüksemburg', 'Monaco': 'Monako', 'Vatican City': 'Vatikan', 'Valletta': 'Valletta',
  'Reykjavik': 'Reykjavik', 'Stockholm': 'Stokholm', 'Helsinki': 'Helsinki', 'Oslo': 'Oslo',
  'Addis Ababa': 'Addis Ababa', 'Khartoum': 'Hartum', 'Mogadishu': 'Mogadişu', 'Rabat': 'Rabat',
  'Singapore': 'Singapur', 'Kuala Lumpur': 'Kuala Lumpur', 'Manila': 'Manila', 'Hanoi': 'Hanoi',
  'Bangkok': 'Bangkok', 'Canberra': 'Canberra', 'Wellington': 'Wellington', 'Yerevan': 'Erivan',
  'Astana': 'Astana', 'Islamabad': 'İslamabad', 'Amman': 'Amman', 'Manama': 'Manama',
  'Ramallah': 'Ramallah', 'City of Victoria': 'Victoria', 'Gibraltar': 'Cebelitarık',
  'Djibouti': 'Cibuti', 'Guatemala City': 'Guatemala', 'Panama City': 'Panama',
  'Kingston': 'Kingston', 'Nuuk': 'Nuuk', 'Paris': 'Paris', 'London': 'Londra',
  'Berlin': 'Berlin', 'Madrid': 'Madrid', 'Amsterdam': 'Amsterdam', 'Dublin': 'Dublin',
};

// country-json adları ile ISO kodları arasında elle eşleme
const POP_NAME_FIX = {
  'Russian Federation': 'RU', 'Congo': 'CG', 'The Democratic Republic of Congo': 'CD',
  'Ivory Coast': 'CI', 'Czech Republic': 'CZ', 'Macedonia': 'MK', 'North Korea': 'KP',
  'South Korea': 'KR', 'Swaziland': 'SZ', 'Cape Verde': 'CV', 'Holy See (Vatican City State)': 'VA',
  'Libyan Arab Jamahiriya': 'LY', 'Micronesia, Federated States of': 'FM', 'Fiji Islands': 'FJ',
  'East Timor': 'TL', 'Turkey': 'TR', 'Palestine': 'PS', 'Syria': 'SY', 'Iran': 'IR',
  'Laos': 'LA', 'Vietnam': 'VN', 'Brunei': 'BN', 'Moldova': 'MD', 'Bolivia': 'BO',
  'Venezuela': 'VE', 'Tanzania': 'TZ', 'United States': 'US', 'United Kingdom': 'GB',
  'Virgin Islands, U.S.': 'VI', 'Virgin Islands, British': 'VG', 'Falkland Islands': 'FK',
  'Saint Helena': 'SH', 'Reunion': 'RE', 'Sao Tome and Principe': 'ST', 'Curacao': 'CW',
  'Kosovo': 'XK', 'Cabo Verde': 'CV', 'Myanmar': 'MM', 'Bahamas': 'BS', 'Gambia': 'GM', 'Netherlands Antilles': null,
};

// Kaynakta bulunmayan bölgeler için yaklaşık nüfuslar
const POP_EXTRA = {
  TW: 23400000, XK: 1760000, IM: 84000, JE: 103000, GG: 64000, CW: 150000, SX: 42000,
  AX: 30000, BL: 10500, MF: 32000, BQ: 30000,
};

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

const byName = new Map();
for (const c of countries) {
  for (const n of [c.name.common, c.name.official, ...c.altSpellings]) byName.set(norm(n), c.cca2);
}
const popByCode = {};
const missing = [];
for (const { country, population } of populations) {
  if (!population) continue;
  const code = country in POP_NAME_FIX ? POP_NAME_FIX[country] : byName.get(norm(country));
  if (code) popByCode[code] = population;
  else if (code === undefined) missing.push(country);
}

// Başkent koordinatlarını GeoNames şehir verisinden bul
const cityIndex = new Map();
for (const city of cities) {
  const key = city.country + '|' + norm(city.name);
  if (!cityIndex.has(key)) cityIndex.set(key, [+city.lat, +city.lng]);
}
const CAPITAL_ALIAS = {
  'Washington D.C.': 'Washington', 'Ulan Bator': 'Ulaanbaatar', 'City of Victoria': 'Victoria',
  "Sana'a": 'Sanaa', 'El Aaiún': 'Laayoune', 'St. Peter Port': 'Saint Peter Port',
  "St. George's": "Saint George's", 'South Tarawa': 'Tarawa', 'Naypyidaw': 'Nay Pyi Taw',
  'City of San Marino': 'San Marino',
};

const out = [];
const noCap = [];
for (const c of countries) {
  const capital = c.capital?.[0] ?? null;
  let capLatLng = null;
  if (capital) {
    for (const n of [capital, CAPITAL_ALIAS[capital]].filter(Boolean)) {
      capLatLng = cityIndex.get(c.cca2 + '|' + norm(n));
      if (capLatLng) break;
    }
    if (!capLatLng) noCap.push(`${c.cca2}:${capital}`);
  }
  const tzs = ct.getCountry(c.cca2)?.timezones ?? [];
  out.push({
    cca2: c.cca2,
    cca3: c.cca3,
    ccn3: c.ccn3 || null,
    name: c.translations.tur?.common ?? c.name.common,
    nameEn: c.name.common,
    official: c.translations.tur?.official ?? c.name.official,
    capital,
    capitalTr: capital ? (CAPITAL_TR[capital] ?? capital) : null,
    capitalLatLng: capLatLng ?? c.latlng,
    latlng: c.latlng,
    region: c.region,
    subregion: c.subregion,
    area: c.area,
    population: popByCode[c.cca2] ?? POP_EXTRA[c.cca2] ?? null,
    languages: Object.values(c.languages ?? {}),
    currencies: Object.entries(c.currencies ?? {}).map(([code, v]) => ({ code, name: v.name, symbol: v.symbol })),
    callingCode: c.idd?.root ? c.idd.root + (c.idd.suffixes?.length === 1 ? c.idd.suffixes[0] : '') : null,
    tld: c.tld?.[0] ?? null,
    timezone: CAPITAL_TZ[c.cca2] ?? tzs[0] ?? 'UTC',
    independent: c.independent,
    unMember: c.unMember,
    landlocked: c.landlocked,
    borders: c.borders,
  });
}

writeFileSync(new URL('../src/data/countries.json', import.meta.url), JSON.stringify(out));
console.log(`${out.length} ülke yazıldı.`);
console.log(`Nüfusu eşleşmeyen (${missing.length}):`, missing.join(', '));
console.log(`Başkent koordinatı bulunamayan (${noCap.length}):`, noCap.join(', '));
console.log('Nüfussuz:', out.filter((c) => !c.population).map((c) => c.cca2).join(','));
