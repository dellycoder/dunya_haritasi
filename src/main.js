import Globe from 'globe.gl';
import * as THREE from 'three';
import { feature } from 'topojson-client';
import 'flag-icons/css/flag-icons.min.css';
import './style.css';

import RAW_COUNTRIES from './data/countries.json';
import { createDayNightMaterial, sunPosition } from './daynight.js';
import { getWeather, describe, windDir } from './weather.js';

const BASE = import.meta.env.BASE_URL;
const asset = (p) => `${BASE}${p}`;

// ---------------------------------------------------------------------------
// Veri
// ---------------------------------------------------------------------------

// Natural Earth'te ayrı çizilen Kuzey Kıbrıs için özel kayıt
const KKTC = {
  cca2: 'CT', cca3: 'KKTC', ccn3: null,
  name: 'Kuzey Kıbrıs Türk Cumhuriyeti', nameEn: 'Northern Cyprus',
  official: 'Kuzey Kıbrıs Türk Cumhuriyeti',
  capital: 'Nicosia', capitalTr: 'Lefkoşa',
  capitalLatLng: [35.1856, 33.3823], latlng: [35.25, 33.6],
  region: 'Europe', subregion: 'Southern Europe', area: 3355, population: 382836,
  languages: ['Turkish'], currencies: [{ code: 'TRY', name: 'Turkish lira', symbol: '₺' }],
  callingCode: '+90', tld: '.ct.tr', timezone: 'Asia/Famagusta',
  independent: false, unMember: false, landlocked: false, borders: [],
};

const COUNTRIES = [...RAW_COUNTRIES, KKTC].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
const byCca2 = new Map(COUNTRIES.map((c) => [c.cca2, c]));
const byCca3 = new Map(COUNTRIES.map((c) => [c.cca3, c]));
const byCcn3 = new Map(COUNTRIES.filter((c) => c.ccn3).map((c) => [c.ccn3, c]));

// Harita geometrisinde ISO kodu olmayan bölgeler
const FEATURE_NAME_FIX = { 'Kosovo': 'XK', 'N. Cyprus': 'CT', 'Somaliland': 'SO', 'Indian Ocean Ter.': 'AU' };

const REGION_TR = {
  Africa: 'Afrika', Americas: 'Amerika', Asia: 'Asya', Europe: 'Avrupa', Oceania: 'Okyanusya', Antarctic: 'Antarktika',
};
const SUBREGION_TR = {
  'Caribbean': 'Karayipler', 'Southern Asia': 'Güney Asya', 'Middle Africa': 'Orta Afrika',
  'Northern Europe': 'Kuzey Avrupa', 'Southeast Europe': 'Güneydoğu Avrupa', 'Southern Europe': 'Güney Avrupa',
  'Western Asia': 'Batı Asya', 'South America': 'Güney Amerika', 'Polynesia': 'Polinezya',
  'Australia and New Zealand': 'Avustralya ve Yeni Zelanda', 'Central Europe': 'Orta Avrupa',
  'Eastern Africa': 'Doğu Afrika', 'Western Europe': 'Batı Avrupa', 'Western Africa': 'Batı Afrika',
  'Eastern Europe': 'Doğu Avrupa', 'Central America': 'Orta Amerika', 'North America': 'Kuzey Amerika',
  'South-Eastern Asia': 'Güneydoğu Asya', 'Southern Africa': 'Güney Afrika', 'Eastern Asia': 'Doğu Asya',
  'Northern Africa': 'Kuzey Afrika', 'Melanesia': 'Melanezya', 'Micronesia': 'Mikronezya', 'Central Asia': 'Orta Asya',
};
const REGION_COLOR = {
  Africa: [255, 170, 60], Americas: [90, 200, 140], Asia: [240, 90, 110],
  Europe: [90, 150, 255], Oceania: [180, 120, 255], Antarctic: [200, 220, 240],
};
const LANG_TR = {
  English: 'İngilizce', Turkish: 'Türkçe', French: 'Fransızca', German: 'Almanca', Spanish: 'İspanyolca',
  Portuguese: 'Portekizce', Arabic: 'Arapça', Russian: 'Rusça', Chinese: 'Çince', Japanese: 'Japonca',
  Korean: 'Korece', Italian: 'İtalyanca', Dutch: 'Felemenkçe', Greek: 'Yunanca', Persian: 'Farsça',
  'Persian (Farsi)': 'Farsça', Hindi: 'Hintçe', Urdu: 'Urduca', Bengali: 'Bengalce', Swedish: 'İsveççe',
  Norwegian: 'Norveççe', Danish: 'Danca', Finnish: 'Fince', Polish: 'Lehçe', Czech: 'Çekçe',
  Hungarian: 'Macarca', Romanian: 'Rumence', Bulgarian: 'Bulgarca', Serbian: 'Sırpça', Croatian: 'Hırvatça',
  Bosnian: 'Boşnakça', Albanian: 'Arnavutça', Ukrainian: 'Ukraynaca', Azerbaijani: 'Azerbaycan Türkçesi',
  Kazakh: 'Kazakça', Uzbek: 'Özbekçe', Turkmen: 'Türkmence', Kyrgyz: 'Kırgızca', Georgian: 'Gürcüce',
  Armenian: 'Ermenice', Hebrew: 'İbranice', Kurdish: 'Kürtçe', Malay: 'Malayca', Indonesian: 'Endonezce',
  Thai: 'Tayca', Vietnamese: 'Vietnamca', Swahili: 'Svahili', Latin: 'Latince', Irish: 'İrlandaca',
  Icelandic: 'İzlandaca', Estonian: 'Estonca', Latvian: 'Letonca', Lithuanian: 'Litvanca',
  Slovak: 'Slovakça', Slovene: 'Slovence', Macedonian: 'Makedonca', Belarusian: 'Belarusça',
  Mongolian: 'Moğolca', Pashto: 'Peştuca', Tajik: 'Tacikçe', Amharic: 'Amharca', Somali: 'Somalice',
  Filipino: 'Filipince', Maltese: 'Maltaca', Luxembourgish: 'Lüksemburgca',
};

const nf = new Intl.NumberFormat('tr-TR');
const nfCompact = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 });

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const fold = (s) => (s ?? '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');

const KKTC_FLAG = `<svg class="flag-svg" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#fff"/><rect y="4" width="60" height="4" fill="#e30a17"/><rect y="32" width="60" height="4" fill="#e30a17"/><circle cx="27" cy="20" r="8" fill="#e30a17"/><circle cx="29" cy="20" r="6.4" fill="#fff"/><path fill="#e30a17" d="m34.3 20 5.9-1.9-3.7 5-.1-6.2 3.6 5z"/></svg>`;

function flag(c, extra = '') {
  if (c.cca2 === 'CT') return `<span class="fi flag-custom ${extra}">${KKTC_FLAG}</span>`;
  return `<span class="fi fi-${c.cca2.toLowerCase()} ${extra}"></span>`;
}

function tzParts(tz, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(date);
  const get = (t) => +parts.find((p) => p.type === t).value;
  return { y: get('year'), mo: get('month'), d: get('day'), h: get('hour'), mi: get('minute'), s: get('second') };
}

// Verilen saat diliminin UTC'ye göre farkı (dakika)
function tzOffset(tz, date = new Date()) {
  const p = tzParts(tz, date);
  const asUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

function fmtOffset(min) {
  const sign = min >= 0 ? '+' : '−';
  const a = Math.abs(min);
  const h = Math.floor(a / 60);
  const m = a % 60;
  return `UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}

function diffText(min) {
  if (min === 0) return 'Sizinle aynı saat';
  const a = Math.abs(min);
  const h = Math.floor(a / 60);
  const m = a % 60;
  const t = `${h ? h + ' saat' : ''}${h && m ? ' ' : ''}${m ? m + ' dk' : ''}`;
  return min > 0 ? `Sizden ${t} ileri` : `Sizden ${t} geri`;
}

function safeTz(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

async function fetchJson(url, ms = 7000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Durum
// ---------------------------------------------------------------------------

const state = {
  hovered: null,
  selected: null,
  previous: null,
  flags: true,
  clouds: true,
  daynight: true,
  rotate: true,
  flagTier: -1,
  weather: null,
  weatherFor: null,
  livePopulation: new Map(),
};

// ---------------------------------------------------------------------------
// Küre
// ---------------------------------------------------------------------------

const globeEl = $('#globe');
const material = createDayNightMaterial(asset('textures/earth-blue-marble.jpg'), asset('textures/earth-night.jpg'));

const world = new Globe(globeEl, { animateIn: true })
  .width(window.innerWidth)
  .height(window.innerHeight)
  .backgroundImageUrl(asset('textures/night-sky.png'))
  .globeMaterial(material)
  .showAtmosphere(true)
  .atmosphereColor('#5aa9ff')
  .atmosphereAltitude(0.22)
  .showGraticules(false);

world.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 2));
world.controls().autoRotate = true;
world.controls().autoRotateSpeed = 0.35;
world.controls().enableDamping = true;
world.controls().dampingFactor = 0.08;
world.controls().minDistance = 115;
world.controls().maxDistance = 900;
world.pointOfView({ lat: 30, lng: 35, altitude: 2.4 });

// Güneş konumu ve kürenin dönüşü → gölgelendirici
function updateSun() {
  const { lat, lng } = sunPosition(new Date());
  material.uniforms.sunPosition.value.set(lng, lat);
}
updateSun();
world.onZoom(({ lng, lat, altitude }) => {
  material.uniforms.globeRotation.value.set(lng, lat);
  updateFlagTier(altitude);
});
{
  const { lng, lat } = world.pointOfView();
  material.uniforms.globeRotation.value.set(lng, lat);
}

// Bulut katmanı
let clouds = null;
new THREE.TextureLoader().load(asset('textures/clouds.png'), (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  clouds = new THREE.Mesh(
    new THREE.SphereGeometry(world.getGlobeRadius() * 1.006, 75, 75),
    new THREE.MeshPhongMaterial({ map: tex, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  clouds.visible = state.clouds;
  world.scene().add(clouds);
});
(function spin() {
  if (clouds) clouds.rotation.y += 0.00012;
  requestAnimationFrame(spin);
})();

// ---------------------------------------------------------------------------
// Ülke poligonları
// ---------------------------------------------------------------------------

function capColor(f) {
  if (!f.properties.country) return 'rgba(160,170,190,0.08)';
  if (f === state.selected?.feature) return 'rgba(255,200,40,0.55)';
  if (f === state.hovered) return 'rgba(255,255,255,0.32)';
  const [r, g, b] = REGION_COLOR[f.properties.country.region] ?? [200, 200, 200];
  return `rgba(${r},${g},${b},0.16)`;
}
function altitude(f) {
  if (f === state.selected?.feature) return 0.045;
  if (f === state.hovered) return 0.025;
  return 0.007;
}
function refreshPolygons() {
  world.polygonCapColor(capColor).polygonAltitude(altitude);
}

function tooltipHtml(f) {
  const c = f.properties.country;
  if (!c) return `<div class="tip"><b>${esc(f.properties.name)}</b></div>`;
  const pop = state.livePopulation.get(c.cca2) ?? c.population;
  return `<div class="tip">
    <div class="tip-head">${flag(c, 'tip-flag')}<div><b>${esc(c.name)}</b><small>${esc(REGION_TR[c.region] ?? c.region)}</small></div></div>
    <div class="tip-row"><span>Başkent</span><b>${esc(c.capitalTr ?? '—')}</b></div>
    <div class="tip-row"><span>Nüfus</span><b>${pop ? nfCompact.format(pop) : '—'}</b></div>
    <div class="tip-hint">Detaylar için tıklayın</div>
  </div>`;
}

async function loadCountries() {
  const topo = await fetchJson(asset('countries-50m.json'), 30000);
  const features = feature(topo, topo.objects.countries).features;
  for (const f of features) {
    const c = (f.id && byCcn3.get(String(f.id))) || byCca2.get(FEATURE_NAME_FIX[f.properties.name]);
    f.properties.country = c ?? null;
    if (c && !c.feature) c.feature = f;
  }
  world
    .polygonsData(features)
    .polygonCapCurvatureResolution(4)
    .polygonSideColor(() => 'rgba(90,160,255,0.18)')
    .polygonStrokeColor((f) => (f === state.selected?.feature ? '#ffd24a' : 'rgba(200,225,255,0.55)'))
    .polygonLabel(tooltipHtml)
    .polygonsTransitionDuration(350)
    .onPolygonHover((f) => {
      state.hovered = f?.properties.country ? f : null;
      globeEl.style.cursor = state.hovered ? 'pointer' : 'grab';
      refreshPolygons();
    })
    .onPolygonClick((f) => {
      const c = f.properties.country;
      if (c) selectCountry(c);
    });
  refreshPolygons();
  return features;
}

// ---------------------------------------------------------------------------
// Bayrak işaretleri
// ---------------------------------------------------------------------------

const markerEls = new Map();
function markerFor(c) {
  if (markerEls.has(c.cca2)) return markerEls.get(c.cca2);
  const el = document.createElement('button');
  el.className = 'marker';
  el.type = 'button';
  el.title = `${c.name} — ${c.capitalTr ?? ''}`;
  el.innerHTML = `<span class="marker-inner">${flag(c, 'marker-flag')}<span class="marker-stem"></span></span>`;
  el.style.pointerEvents = 'auto';
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    selectCountry(c);
  });
  markerEls.set(c.cca2, el);
  return el;
}

let capitalEl = null;
function capitalMarker(c) {
  capitalEl ??= document.createElement('div');
  capitalEl.className = 'capital-marker';
  capitalEl.innerHTML = `<span class="capital-inner"><span class="capital-star">★</span><span class="capital-name">${esc(c.capitalTr ?? c.name)}</span></span>`;
  return capitalEl;
}

// Uzaklaştıkça yalnızca büyük ülkelerin bayraklarını göster
const TIERS = [
  { maxAlt: 0.8, minArea: 0 },
  { maxAlt: 1.3, minArea: 8000 },
  { maxAlt: 1.9, minArea: 60000 },
  { maxAlt: Infinity, minArea: 250000 },
];
function updateFlagTier(alt, force = false) {
  const tier = TIERS.findIndex((t) => alt <= t.maxAlt);
  if (!force && tier === state.flagTier) return;
  state.flagTier = tier;
  renderHtmlLayer();
}

function renderHtmlLayer() {
  const minArea = TIERS[Math.max(state.flagTier, 0)].minArea;
  const items = [];
  if (state.flags) {
    for (const c of COUNTRIES) {
      if (!c.capitalLatLng || c.cca2 === 'AQ') continue;
      if (c === state.selected || (c.area ?? 0) >= minArea) {
        items.push({ kind: 'flag', c, lat: c.capitalLatLng[0], lng: c.capitalLatLng[1] });
      }
    }
  }
  if (state.selected?.capitalLatLng) {
    const c = state.selected;
    items.push({ kind: 'capital', c, lat: c.capitalLatLng[0], lng: c.capitalLatLng[1] });
  }
  world.htmlElementsData(items);
}

world
  .htmlLat('lat')
  .htmlLng('lng')
  .htmlAltitude((d) => (d.kind === 'capital' ? 0.05 : d.c === state.selected ? 0.05 : 0.012))
  .htmlElement((d) => (d.kind === 'capital' ? capitalMarker(d.c) : markerFor(d.c)))
  .htmlElementVisibilityModifier((el, visible) => {
    el.classList.toggle('is-hidden', !visible);
  })
  .htmlTransitionDuration(400);

// ---------------------------------------------------------------------------
// Halkalar ve yaylar
// ---------------------------------------------------------------------------

world
  .ringColor(() => (t) => `rgba(255,200,60,${Math.max(0, 1 - t)})`)
  .ringMaxRadius(4.5)
  .ringPropagationSpeed(2.2)
  .ringRepeatPeriod(900)
  .ringAltitude(0.012)
  .arcColor(() => ['rgba(90,170,255,0.9)', 'rgba(255,210,70,0.95)'])
  .arcStroke(0.55)
  .arcDashLength(0.45)
  .arcDashGap(0.2)
  .arcDashInitialGap(1)
  .arcDashAnimateTime(1800)
  .arcAltitudeAutoScale(0.45)
  .arcsTransitionDuration(0);

// ---------------------------------------------------------------------------
// Seçim
// ---------------------------------------------------------------------------

function flyAltitude(c) {
  const a = Math.sqrt(c.area || 1000);
  return Math.min(2.3, Math.max(0.45, 0.35 + a / 1500));
}

function selectCountry(c, { fly = true } = {}) {
  if (!c) return;
  if (state.selected && state.selected !== c) state.previous = state.selected;
  state.selected = c;
  const [lat, lng] = c.capitalLatLng ?? c.latlng;

  refreshPolygons();
  world.polygonStrokeColor(world.polygonStrokeColor());
  renderHtmlLayer();
  world.ringsData([{ lat, lng }]);

  const p = state.previous;
  if (p && p !== c) {
    const [plat, plng] = p.capitalLatLng ?? p.latlng;
    world.arcsData([{ startLat: plat, startLng: plng, endLat: lat, endLng: lng }]);
  } else {
    world.arcsData([]);
  }

  setAutoRotate(false);
  if (fly) world.pointOfView({ lat, lng, altitude: flyAltitude(c) }, 1600);

  history.replaceState(null, '', `#${c.cca2}`);
  document.title = `${c.name} · Dünya Atlası 3D`;
  openPanel(c);
}

function clearSelection() {
  state.previous = state.selected;
  state.selected = null;
  state.weather = null;
  refreshPolygons();
  world.polygonStrokeColor(world.polygonStrokeColor());
  world.ringsData([]);
  world.arcsData([]);
  renderHtmlLayer();
  closePanel();
  history.replaceState(null, '', location.pathname + location.search);
  document.title = 'Dünya Atlası 3D';
  if (state.rotate) setAutoRotate(true);
}

function setAutoRotate(on) {
  world.controls().autoRotate = on;
}

// ---------------------------------------------------------------------------
// Bilgi paneli
// ---------------------------------------------------------------------------

const panel = $('#panel');
const panelBody = $('#panel-body');
const isWide = () => window.matchMedia('(min-width: 900px)').matches;

function applyGlobeOffset() {
  const open = !panel.hidden;
  if (!open) world.globeOffset([0, 0]);
  else if (isWide()) world.globeOffset([-panel.offsetWidth / 2, 0]);
  else world.globeOffset([0, -panel.offsetHeight / 2]);
}

function openPanel(c) {
  const pop = state.livePopulation.get(c.cca2) ?? c.population;
  const density = pop && c.area ? pop / c.area : null;
  const neighbors = (c.borders ?? []).map((code) => byCca3.get(code)).filter(Boolean);
  const langs = (c.languages ?? []).map((l) => LANG_TR[l] ?? l);
  const curr = (c.currencies ?? []).map((x) => `${x.name} (${x.code}${x.symbol ? ' · ' + x.symbol : ''})`);

  panelBody.innerHTML = `
    <div class="hero">
      <div class="hero-bg">${flag(c, 'hero-bg-flag')}</div>
      <div class="hero-flag">${flag(c, 'hero-flag-img')}</div>
      <div class="hero-text">
        <span class="badge">${esc(REGION_TR[c.region] ?? c.region)}${c.subregion ? ' · ' + esc(SUBREGION_TR[c.subregion] ?? c.subregion) : ''}</span>
        <h2>${esc(c.name)}</h2>
        <p>${esc(c.official)}</p>
      </div>
    </div>

    <section class="card clock-card">
      <div class="card-title"><span>🕰️</span> ${esc(c.capitalTr ?? c.name)} yerel saati</div>
      <div class="big-clock" id="p-time">--:--:--</div>
      <div class="clock-date" id="p-date">&nbsp;</div>
      <div class="clock-meta">
        <span id="p-offset" class="pill">UTC</span>
        <span id="p-diff" class="pill pill-soft"></span>
        <span id="p-tz" class="pill pill-soft"></span>
      </div>
      <div class="sunbar" id="p-sunbar" hidden>
        <div class="sunbar-track"><div class="sunbar-fill" id="p-sunfill"></div><div class="sunbar-sun" id="p-sundot">☀️</div></div>
        <div class="sunbar-labels"><span id="p-sunrise">🌅 --:--</span><span id="p-daylen"></span><span id="p-sunset">🌇 --:--</span></div>
      </div>
    </section>

    <section class="card weather-card" id="p-weather">
      <div class="card-title"><span>🌤️</span> Hava durumu · ${esc(c.capitalTr ?? c.name)}
        <button class="refresh" id="p-refresh" title="Yenile" aria-label="Hava durumunu yenile">↻</button>
      </div>
      <div class="weather-loading"><div class="shimmer"></div><div class="shimmer short"></div></div>
    </section>

    <section class="card">
      <div class="card-title"><span>📊</span> Genel bilgiler</div>
      <div class="stats">
        <div class="stat stat-wide">
          <small>Nüfus <em id="p-pop-src">${pop ? 'Yükleniyor…' : ''}</em></small>
          <strong id="p-pop" data-value="${pop ?? 0}">${pop ? nf.format(pop) : '—'}</strong>
        </div>
        <div class="stat"><small>Başkent</small><strong>${esc(c.capitalTr ?? '—')}</strong></div>
        <div class="stat"><small>Yüzölçümü</small><strong>${c.area ? nf.format(Math.round(c.area)) + ' km²' : '—'}</strong></div>
        <div class="stat"><small>Nüfus yoğunluğu</small><strong id="p-density">${density ? nf.format(Math.round(density)) + ' kişi/km²' : '—'}</strong></div>
        <div class="stat"><small>Telefon kodu</small><strong>${esc(c.callingCode ?? '—')}</strong></div>
        <div class="stat"><small>Diller</small><strong>${esc(langs.join(', ') || '—')}</strong></div>
        <div class="stat"><small>Para birimi</small><strong>${esc(curr.join(', ') || '—')}</strong></div>
        <div class="stat"><small>İnternet uzantısı</small><strong>${esc(c.tld ?? '—')}</strong></div>
        <div class="stat"><small>Durum</small><strong>${c.unMember ? 'BM üyesi' : c.independent ? 'Bağımsız' : 'Bağımlı bölge'}${c.landlocked ? ' · Denize kıyısız' : ''}</strong></div>
      </div>
    </section>

    ${neighbors.length ? `
    <section class="card">
      <div class="card-title"><span>🧭</span> Komşu ülkeler (${neighbors.length})</div>
      <div class="chips">
        ${neighbors.map((n) => `<button class="chip" data-cca2="${n.cca2}">${flag(n, 'chip-flag')}${esc(n.name)}</button>`).join('')}
      </div>
    </section>` : ''}
  `;

  panelBody.querySelectorAll('.chip').forEach((b) =>
    b.addEventListener('click', () => selectCountry(byCca2.get(b.dataset.cca2))));
  panelBody.querySelector('#p-refresh').addEventListener('click', () => loadWeather(c, true));

  const wasHidden = panel.hidden;
  panel.hidden = false;
  panel.scrollTop = 0;
  panel.classList.remove('enter');
  void panel.offsetWidth;
  panel.classList.add('enter');
  if (wasHidden) applyGlobeOffset();

  state.weather = null;
  tickPanelClock();
  loadWeather(c);
  loadPopulation(c);
}

function closePanel() {
  panel.hidden = true;
  applyGlobeOffset();
}

function panelTz(c) {
  if (state.weatherFor === c && state.weather?.timezone) return safeTz(state.weather.timezone);
  return safeTz(c.timezone);
}

function tickPanelClock() {
  const c = state.selected;
  if (!c || panel.hidden) return;
  const tz = panelTz(c);
  const now = new Date();
  const timeEl = $('#p-time');
  if (!timeEl) return;
  timeEl.textContent = new Intl.DateTimeFormat('tr-TR', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(now);
  $('#p-date').textContent = new Intl.DateTimeFormat('tr-TR', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  const off = tzOffset(tz, now);
  $('#p-offset').textContent = fmtOffset(off);
  $('#p-diff').textContent = diffText(off - -now.getTimezoneOffset());
  $('#p-tz').textContent = tz.replace(/_/g, ' ');
  updateSunbar(tz, now);
}

function updateSunbar(tz, now) {
  const w = state.weatherFor === state.selected ? state.weather : null;
  const bar = $('#p-sunbar');
  if (!bar || !w?.daily?.sunrise?.[0]) return;
  const toMin = (iso) => {
    const [h, m] = iso.slice(11, 16).split(':').map(Number);
    return h * 60 + m;
  };
  const rise = toMin(w.daily.sunrise[0]);
  const set = toMin(w.daily.sunset[0]);
  const p = tzParts(tz, now);
  const cur = p.h * 60 + p.mi + p.s / 60;
  const pct = Math.min(1, Math.max(0, (cur - rise) / (set - rise)));
  const isDay = cur >= rise && cur <= set;
  bar.hidden = false;
  $('#p-sunfill').style.width = `${pct * 100}%`;
  const dot = $('#p-sundot');
  dot.style.left = `${pct * 100}%`;
  dot.textContent = isDay ? '☀️' : '🌙';
  $('#p-sunrise').textContent = `🌅 ${w.daily.sunrise[0].slice(11, 16)}`;
  $('#p-sunset').textContent = `🌇 ${w.daily.sunset[0].slice(11, 16)}`;
  const len = set - rise;
  $('#p-daylen').textContent = `Gün uzunluğu ${Math.floor(len / 60)} sa ${len % 60} dk`;
}

async function loadWeather(c, force = false) {
  const box = $('#p-weather');
  const [lat, lng] = c.capitalLatLng ?? c.latlng;
  if (force && box) box.classList.add('is-loading');
  try {
    const w = await getWeather(lat, lng, { force });
    if (state.selected !== c) return;
    state.weather = w;
    state.weatherFor = c;
    renderWeather(c, w);
    tickPanelClock();
  } catch (err) {
    if (state.selected !== c || !box) return;
    box.querySelector('.weather-loading, .weather-body, .weather-error')?.remove();
    box.insertAdjacentHTML('beforeend', `<div class="weather-error">⚠️ Hava durumu şu anda alınamadı. İnternet bağlantınızı kontrol edip ↻ ile tekrar deneyin.</div>`);
  } finally {
    box?.classList.remove('is-loading');
  }
}

function renderWeather(c, w) {
  const box = $('#p-weather');
  if (!box) return;
  const cur = w.current;
  const d = describe(cur.weather_code, cur.is_day === 1);
  const days = w.daily.time.slice(0, 6).map((t, i) => {
    const date = new Date(`${t}T12:00:00Z`);
    const label = i === 0 ? 'Bugün' : new Intl.DateTimeFormat('tr-TR', { weekday: 'short', timeZone: 'UTC' }).format(date);
    const dd = describe(w.daily.weather_code[i], true);
    return `<div class="fc-day" title="${esc(dd.text)}">
      <small>${label}</small><span class="fc-icon">${dd.icon}</span>
      <b>${Math.round(w.daily.temperature_2m_max[i])}°</b><em>${Math.round(w.daily.temperature_2m_min[i])}°</em>
      ${w.daily.precipitation_probability_max?.[i] != null ? `<i>💧${w.daily.precipitation_probability_max[i]}%</i>` : ''}
    </div>`;
  }).join('');
  const updated = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date());

  box.querySelector('.weather-loading, .weather-body, .weather-error')?.remove();
  box.insertAdjacentHTML('beforeend', `
    <div class="weather-body">
      <div class="wx-now">
        <div class="wx-icon">${d.icon}</div>
        <div class="wx-temp">${Math.round(cur.temperature_2m)}<sup>°C</sup></div>
        <div class="wx-desc">
          <b>${esc(d.text)}</b>
          <span>Hissedilen ${Math.round(cur.apparent_temperature)}°C</span>
          <span class="wx-minmax">↑ ${Math.round(w.daily.temperature_2m_max[0])}° · ↓ ${Math.round(w.daily.temperature_2m_min[0])}°</span>
        </div>
      </div>
      <div class="wx-grid">
        <div><small>💧 Nem</small><b>%${cur.relative_humidity_2m}</b></div>
        <div><small>💨 Rüzgâr</small><b>${Math.round(cur.wind_speed_10m)} km/s ${windDir(cur.wind_direction_10m)}</b></div>
        <div><small>🧭 Basınç</small><b>${Math.round(cur.surface_pressure)} hPa</b></div>
        <div><small>☁️ Bulutluluk</small><b>%${cur.cloud_cover}</b></div>
        <div><small>🌧️ Yağış</small><b>${cur.precipitation} mm</b></div>
        <div><small>🔆 UV endeksi</small><b>${w.daily.uv_index_max?.[0] != null ? Math.round(w.daily.uv_index_max[0]) : '—'}</b></div>
      </div>
      <div class="forecast">${days}</div>
      <div class="wx-foot">Son güncelleme ${updated} · Open-Meteo</div>
    </div>`);
}

async function loadPopulation(c) {
  const src = () => $('#p-pop-src');
  if (c.cca2 === 'CT') {
    src() && (src().textContent = '2011 sayımı');
    animatePop(c.population);
    return;
  }
  if (state.livePopulation.has(c.cca2)) {
    src() && (src().textContent = 'Güncel');
    animatePop(state.livePopulation.get(c.cca2));
    return;
  }
  try {
    const data = await fetchJson(`https://restcountries.com/v3.1/alpha/${c.cca3}?fields=population`);
    const pop = (Array.isArray(data) ? data[0] : data)?.population;
    if (!pop) throw new Error('boş');
    state.livePopulation.set(c.cca2, pop);
    if (state.selected !== c) return;
    src() && (src().textContent = 'Güncel');
    animatePop(pop);
  } catch {
    if (state.selected !== c) return;
    src() && (src().textContent = c.population ? 'Tahmini' : '');
    animatePop(c.population);
  }
}

function animatePop(target) {
  const el = $('#p-pop');
  if (!el || !target) return;
  const c = state.selected;
  const from = 0;
  const start = performance.now();
  const dur = 1100;
  const step = (t) => {
    if (state.selected !== c) return;
    const k = Math.min(1, (t - start) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = nf.format(Math.round(from + (target - from) * e));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  const dens = $('#p-density');
  if (dens && c?.area) dens.textContent = `${nf.format(Math.round(target / c.area))} kişi/km²`;
}

$('#panel-close').addEventListener('click', clearSelection);

// ---------------------------------------------------------------------------
// Arama
// ---------------------------------------------------------------------------

const searchInput = $('#search');
const suggestions = $('#suggestions');
let suggestionItems = [];
let activeIdx = -1;

const searchIndex = COUNTRIES.map((c) => ({
  c,
  keys: [c.name, c.nameEn, c.official, c.capitalTr, c.capital, c.cca2, c.cca3].filter(Boolean).map(fold),
}));

function runSearch(q) {
  const f = fold(q.trim());
  if (!f) return [];
  const scored = [];
  for (const { c, keys } of searchIndex) {
    let best = Infinity;
    keys.forEach((k, i) => {
      if (k === f) best = Math.min(best, i);
      else if (k.startsWith(f)) best = Math.min(best, 10 + i);
      else if (k.includes(f)) best = Math.min(best, 30 + i);
    });
    if (best < Infinity) scored.push([best, c]);
  }
  scored.sort((a, b) => a[0] - b[0] || (b[1].population ?? 0) - (a[1].population ?? 0));
  return scored.slice(0, 8).map((s) => s[1]);
}

function renderSuggestions(list) {
  suggestionItems = list;
  activeIdx = list.length ? 0 : -1;
  suggestions.innerHTML = list.map((c, i) => `
    <li role="option" data-i="${i}" class="${i === activeIdx ? 'active' : ''}">
      ${flag(c, 'sug-flag')}<span><b>${esc(c.name)}</b><small>${esc(c.capitalTr ?? '')}</small></span>
    </li>`).join('') || (searchInput.value.trim() ? '<li class="empty">Sonuç bulunamadı</li>' : '');
  suggestions.classList.toggle('open', !!searchInput.value.trim());
}

function pickSuggestion(i) {
  const c = suggestionItems[i];
  if (!c) return;
  searchInput.value = '';
  renderSuggestions([]);
  searchInput.blur();
  selectCountry(c);
}

searchInput.addEventListener('input', () => renderSuggestions(runSearch(searchInput.value)));
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!suggestionItems.length) return;
    activeIdx = (activeIdx + (e.key === 'ArrowDown' ? 1 : -1) + suggestionItems.length) % suggestionItems.length;
    suggestions.querySelectorAll('li').forEach((li, i) => li.classList.toggle('active', i === activeIdx));
  } else if (e.key === 'Enter') {
    pickSuggestion(activeIdx);
  } else if (e.key === 'Escape') {
    searchInput.value = '';
    renderSuggestions([]);
    searchInput.blur();
  }
});
suggestions.addEventListener('mousedown', (e) => {
  const li = e.target.closest('li[data-i]');
  if (li) {
    e.preventDefault();
    pickSuggestion(+li.dataset.i);
  }
});
searchInput.addEventListener('blur', () => setTimeout(() => suggestions.classList.remove('open'), 120));
searchInput.addEventListener('focus', () => searchInput.value.trim() && suggestions.classList.add('open'));

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== searchInput) {
    e.preventDefault();
    searchInput.focus();
  } else if (e.key === 'Escape' && document.activeElement !== searchInput && state.selected) {
    clearSelection();
  }
});

// ---------------------------------------------------------------------------
// Kontroller
// ---------------------------------------------------------------------------

document.querySelectorAll('.ctrl[data-toggle]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.toggle;
    state[key] = !state[key];
    btn.classList.toggle('active', state[key]);
    if (key === 'flags') renderHtmlLayer();
    if (key === 'clouds' && clouds) clouds.visible = state.clouds;
    if (key === 'daynight') material.uniforms.enabled.value = state.daynight ? 1 : 0;
    if (key === 'rotate') setAutoRotate(state.rotate && !state.selected);
  });
});

$('.ctrl[data-action="random"]').addEventListener('click', () => {
  const pool = COUNTRIES.filter((c) => c.feature && c !== state.selected);
  selectCountry(pool[Math.floor(Math.random() * pool.length)]);
});
$('.ctrl[data-action="reset"]').addEventListener('click', () => {
  if (state.selected) clearSelection();
  world.pointOfView({ lat: 30, lng: 35, altitude: 2.4 }, 1400);
});

// ---------------------------------------------------------------------------
// Saatler
// ---------------------------------------------------------------------------

const timeFmt = (tz) => new Intl.DateTimeFormat('tr-TR', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
const localFmt = timeFmt(undefined);
const utcFmt = timeFmt('UTC');

function tick() {
  const now = new Date();
  $('#clock-local').textContent = localFmt.format(now);
  $('#clock-utc').textContent = utcFmt.format(now);
  tickPanelClock();
  updateSun();
}
tick();
setInterval(tick, 1000);

// Açık paneldeki hava durumunu 10 dakikada bir yenile
setInterval(() => {
  if (state.selected && !panel.hidden) loadWeather(state.selected, true);
}, 10 * 60 * 1000);

// ---------------------------------------------------------------------------
// Başlangıç
// ---------------------------------------------------------------------------

window.addEventListener('resize', () => {
  world.width(window.innerWidth).height(window.innerHeight);
  applyGlobeOffset();
});

$('#country-count').textContent = `${COUNTRIES.length} ülke ve bölge`;

// Küre dokusu hazır olunca veya en geç 8 sn sonra yükleme ekranını kaldır
const hideLoader = () => $('#loader').classList.add('done');
world.onGlobeReady(() => setTimeout(hideLoader, 300));
setTimeout(hideLoader, 8000);

loadCountries()
  .then(() => {
    updateFlagTier(world.pointOfView().altitude, true);
    const code = decodeURIComponent(location.hash.slice(1)).toUpperCase();
    if (byCca2.has(code)) setTimeout(() => selectCountry(byCca2.get(code)), 900);
  })
  .catch((err) => {
    console.error(err);
    $('.loader-text').textContent = 'Harita verisi yüklenemedi. Sayfayı yenileyin.';
  })
  .finally(() => setTimeout(hideLoader, 200));

window.addEventListener('hashchange', () => {
  const c = byCca2.get(location.hash.slice(1).toUpperCase());
  if (c && c !== state.selected) selectCountry(c);
});
