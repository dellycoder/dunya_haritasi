import * as THREE from 'three';

// Gündüz ve gece dokularını güneşin gerçek konumuna göre harmanlayan gölgelendirici
const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  #define PI 3.141592653589793
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform vec2 sunPosition;
  uniform vec2 globeRotation;
  uniform float enabled;
  varying vec3 vNormal;
  varying vec2 vUv;

  float toRad(in float a) { return a * PI / 180.0; }

  vec3 polarToCartesian(in vec2 c) {
    float theta = toRad(90.0 - c.x);
    float phi = toRad(90.0 - c.y);
    return vec3(sin(phi) * cos(theta), cos(phi), sin(phi) * sin(theta));
  }

  void main() {
    float invLon = toRad(globeRotation.x);
    float invLat = -toRad(globeRotation.y);
    mat3 rotX = mat3(1, 0, 0, 0, cos(invLat), -sin(invLat), 0, sin(invLat), cos(invLat));
    mat3 rotY = mat3(cos(invLon), 0, sin(invLon), 0, 1, 0, -sin(invLon), 0, cos(invLon));
    vec3 sunDir = rotX * rotY * polarToCartesian(sunPosition);
    float intensity = dot(normalize(vNormal), normalize(sunDir));

    vec4 dayColor = texture2D(dayTexture, vUv);
    vec4 nightColor = texture2D(nightTexture, vUv) * 1.25;
    float blend = smoothstep(-0.12, 0.12, intensity);
    vec4 color = mix(nightColor, dayColor, blend);

    // Alacakaranlık kuşağında hafif turuncu parıltı
    float dusk = 1.0 - abs(intensity) / 0.12;
    color.rgb += vec3(0.35, 0.15, 0.02) * clamp(dusk, 0.0, 1.0) * 0.25;

    gl_FragColor = mix(dayColor, color, enabled);
  }
`;

export function createDayNightMaterial(dayUrl, nightUrl) {
  const loader = new THREE.TextureLoader();
  const load = (url) => {
    const t = loader.load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: load(dayUrl) },
      nightTexture: { value: load(nightUrl) },
      sunPosition: { value: new THREE.Vector2() },
      globeRotation: { value: new THREE.Vector2() },
      enabled: { value: 1 },
    },
    vertexShader,
    fragmentShader,
  });
}

// Güneşin tam tepede olduğu noktayı (enlem/boylam) hesaplar
export function sunPosition(date = new Date()) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = (date.getTime() - start) / 864e5;
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);

  // NOAA yaklaşık formülleri
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);

  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  let lng = -(utcMinutes + eqTime - 720) / 4;
  lng = ((lng + 540) % 360) - 180;
  return { lat: decl * 180 / Math.PI, lng };
}
