import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { model } from '../model.js';
import { SITE, SEASONS, solarPosition, daylightTimes, clockTime, isBlocked } from './solar.js';

const $ = id => document.getElementById(id);
const state = { season: SEASONS[1], minute: 960, playing: false, top: false, lastFrame: 0 };
const blocker = { enabled: true, height: 100, distance: 60, bearing: 285, width: 40, observerHeight: 58 };
const compassNames = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
const sunColor = new THREE.Color(0xffc978);
let renderer, camera, controls, scene, sun, sunTiles, roomLabels = [];
let floorSamples = [], lastTileKey = '';
const floorMeshes = [], shadowCasters = [];
const roomNames = { '12': '客餐厅', '7': '主卧', '3': '次卧', '4': '卫生间', '13': '餐厨' };
const tileSize = 0.32;

function directionName(azimuth) { return compassNames[Math.round(azimuth / 45) % 8]; }
function sunVector({ azimuth, elevation }) {
  const az = azimuth * Math.PI / 180;
  const el = elevation * Math.PI / 180;
  // The user's balcony direction is approximately NW: model -Z = NW, +X = NE.
  return new THREE.Vector3(Math.sin(az + Math.PI / 4) * Math.cos(el), Math.sin(el), Math.sin(az - Math.PI / 4) * Math.cos(el));
}

function geometry(data) {
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(data.position, 3));
  result.setIndex(data.index);
  result.computeVertexNormals();
  return result;
}

function shadowWallGeometry(data) {
  // The arc is the open balcony edge in the reference model. Its full-height
  // shell would falsely block all light, so only its low part casts shadows.
  const indices = [];
  for (let i = 0; i < data.index.length; i += 3) {
    const triangle = data.index.slice(i, i + 3);
    const points = triangle.map(n => data.position.slice(n * 3, n * 3 + 3));
    const centroid = points.reduce((sum, p) => [sum[0] + p[0] / 3, sum[1] + p[1] / 3, sum[2] + p[2] / 3], [0, 0, 0]);
    if (points.every(p => p[1] > 2.7)) continue; // top cap is a drawing surface, not an indoor roof shadow
    if (centroid[2] < -3.85 && centroid[0] > 0.3 && centroid[1] > 1.1) continue;
    indices.push(...triangle);
  }
  return geometry({ position: data.position, index: indices });
}

function init3D() {
  try {
    const mount = $('scene');
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    mount.append(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-7, 7, 7, -7, 0.1, 100);
    camera.position.set(12, 16, 18);
    camera.lookAt(0, 0, 0);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0.1);
    controls.minZoom = 0.7; controls.maxZoom = 3.2;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.enablePan = false;
    controls.update();
    controls.addEventListener('change', render);

    scene.add(new THREE.HemisphereLight(0xeaf4ff, 0xd0b999, 1.35));
    sun = new THREE.DirectionalLight(sunColor, 4.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(innerWidth < 700 ? 1024 : 2048, innerWidth < 700 ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 13, bottom: -13, near: 1, far: 55 });
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.015;
    sun.target.position.set(0, 0, 0);
    scene.add(sun, sun.target);
    const cut = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1.28);
    const shadowOnly = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide });
    for (const data of model) {
      const floor = data.name.includes('RoomGround');
      const glass = /window|door_(0|12)$/.test(data.name);
      const wall = data.name === '1-Wall';
      const material = new THREE.MeshStandardMaterial({
        color: floor ? ({'0':0xaebbb6,'7':0xbac4bf,'3':0xc0c9c3,'4':0xb9c8c6,'12':0xbcc7c2,'13':0xb5c2bc}[data.name.split('-').pop()] || 0xbcc7c2) : glass ? 0xa9d1cf : wall ? 0xf2ede3 : 0xc4b49c,
        roughness: floor ? 0.94 : 0.75, metalness: 0, side: THREE.DoubleSide,
        transparent: glass, opacity: glass ? 0.32 : 1,
        depthWrite: !glass,
        clippingPlanes: floor ? [] : [cut],
      });
      const mesh = new THREE.Mesh(geometry(data), material);
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      if (floor) {
        mesh.position.y = 0.006;
        mesh.userData.room = data.name.split('-').pop();
        floorMeshes.push(mesh);
        const roof = new THREE.Mesh(geometry(data), shadowOnly);
        roof.position.y = 2.8;
        roof.castShadow = true;
        roof.updateMatrixWorld();
        scene.add(roof);
        shadowCasters.push(roof);
      }
      scene.add(mesh);
      if (!floor && !glass) {
        const caster = new THREE.Mesh(wall ? shadowWallGeometry(data) : geometry(data), shadowOnly);
        caster.castShadow = true;
        scene.add(caster);
        shadowCasters.push(caster);
      }
    }
    buildSunlitFloor();
    const plinth = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.11 }));
    plinth.rotation.x = -Math.PI / 2; plinth.position.y = -0.015; plinth.receiveShadow = true; scene.add(plinth);

    const labelLayer = document.createElement('div');
    labelLayer.className = 'room-label-layer';
    $('scene-wrap').append(labelLayer);
    for (const [name, at] of [['主卧', [-1.7, 0.06, -2.2]], ['次卧', [-2.3, 0.06, 0.5]], ['客餐厅', [2.05, 0.06, 0.1]], ['主阳台', [2.05, 0.06, -4.1]]]) {
      const element = document.createElement('span'); element.textContent = name; labelLayer.append(element);
      roomLabels.push({ element, point: new THREE.Vector3(...at) });
    }
    new ResizeObserver(resize).observe(mount);
    resize();
  } catch (error) {
    console.error('3D unavailable:', error);
    $('scene').hidden = true;
    $('webgl-fallback').hidden = false;
  }
}

function buildSunlitFloor() {
  const down = new THREE.Raycaster();
  const south = new THREE.Vector3(0, -1, 0);
  for (let x = -3.9 + tileSize / 2; x < 3.9; x += tileSize) {
    for (let z = -4.9 + tileSize / 2; z < 5.3; z += tileSize) {
      down.set(new THREE.Vector3(x, 1.5, z), south);
      const hit = down.intersectObjects(floorMeshes, false)[0];
      if (hit) floorSamples.push({ x, z, room: hit.object.userData.room });
    }
  }
  sunTiles = new THREE.InstancedMesh(
    new THREE.BoxGeometry(tileSize * 1.015, 0.012, tileSize * 1.015),
    new THREE.MeshBasicMaterial({ color: 0xff9825, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }),
    floorSamples.length,
  );
  sunTiles.count = 0;
  sunTiles.frustumCulled = false;
  sunTiles.renderOrder = 1;
  scene.add(sunTiles);
}

function updateSunlitFloor(position, blocked) {
  if (!sunTiles) return;
  const key = `${state.season.id}/${state.playing ? Math.round(state.minute / 4) : Math.round(state.minute)}/${blocked}`;
  if (key === lastTileKey) return;
  lastTileKey = key;
  const litRooms = {};
  let count = 0, balconyCount = 0;
  if (position.elevation > 0 && !blocked) {
    const ray = new THREE.Raycaster();
    ray.far = 100;
    const direction = sunVector(position).normalize();
    const matrix = new THREE.Matrix4();
    for (const sample of floorSamples) {
      ray.set(new THREE.Vector3(sample.x, 0.032, sample.z), direction);
      if (ray.intersectObjects(shadowCasters, false).length) continue;
      matrix.makeTranslation(sample.x, 0.027, sample.z);
      sunTiles.setMatrixAt(count++, matrix);
      if (sample.room === '0') balconyCount++;
      else litRooms[sample.room] = (litRooms[sample.room] || 0) + 1;
    }
  }
  sunTiles.count = count;
  sunTiles.instanceMatrix.needsUpdate = true;
  const names = Object.entries(litRooms).filter(([, n]) => n > 2).sort((a, b) => b[1] - a[1]).map(([id]) => roomNames[id]);
  const status = names.length ? names.join('、') + '有直射' : balconyCount ? '仅阳台有直射' : '室内暂无直射';
  if ($('lit-rooms').textContent !== status) $('lit-rooms').textContent = status;
  $('lit-rooms').closest('.light-readout').classList.toggle('empty', !count);
  $('lit-detail').textContent = blocked ? '前方高层情景遮挡了直射光' : count ? '橙色地面是此刻阳光落点' : '拖动时间寻找阳光进入的时段';
}

function resize() {
  if (!renderer) return;
  const mount = $('scene');
  const width = Math.max(mount.clientWidth, 1), height = Math.max(mount.clientHeight, 1);
  renderer.setSize(width, height, false);
  const span = width < 560 ? 15 : 12.6;
  camera.left = -span * width / height / 2;
  camera.right = span * width / height / 2;
  camera.top = span / 2; camera.bottom = -span / 2;
  camera.updateProjectionMatrix();
  render();
}

function render() {
  if (!renderer) return;
  renderer.render(scene, camera);
  const { width, height } = $('scene').getBoundingClientRect();
  for (const { element, point } of roomLabels) {
    const projected = point.clone().project(camera);
    const x = (projected.x * 0.5 + 0.5) * width, y = (-projected.y * 0.5 + 0.5) * height;
    element.style.left = `${x}px`; element.style.top = `${y}px`;
    element.hidden = x < 20 || x > width - 20 || y < 20 || y > height - 20;
  }
}

function currentTimes() { return daylightTimes(state.season.date, SITE); }
function updateSeason(season, initial = false) {
  state.season = season;
  const { sunrise, sunset } = currentTimes();
  state.minute = initial ? 960 : (sunrise + sunset) / 2;
  $('time-range').min = Math.ceil(sunrise);
  $('time-range').max = Math.floor(sunset);
  $('time-range').value = Math.round(state.minute);
  $('sunrise').textContent = $('chart-start').textContent = clockTime(sunrise);
  $('sunset').textContent = $('chart-end').textContent = clockTime(sunset);
  const daylight = Math.round(sunset - sunrise);
  $('day-length').textContent = `${Math.floor(daylight / 60)}时${daylight % 60}分`;
  for (const button of document.querySelectorAll('[data-season]')) {
    const active = button.dataset.season === season.id;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  }
  $('scene-status').textContent = `${season.label} · 参考日照`;
  update();
}

function update() {
  const position = solarPosition(state.season.date, state.minute, SITE);
  const blocked = isBlocked(position, blocker);
  const visible = position.elevation > 0 && !blocked;
  $('time-display').textContent = clockTime(state.minute);
  $('time-range').value = Math.round(state.minute);
  $('altitude').textContent = `${Math.max(0, position.elevation).toFixed(1)}°`;
  $('azimuth').textContent = `${position.azimuth.toFixed(0)}° ${directionName(position.azimuth)}`;
  $('sun-direction').textContent = `方位 ${position.azimuth.toFixed(0)}° · 高度 ${Math.max(0, position.elevation).toFixed(1)}°`;
  $('compass-sun').style.transform = `translate(-50%, -50%) rotate(${position.azimuth}deg) translateY(-20px)`;
  $('sun-state').textContent = blocked ? '前方高层可能遮挡' : position.elevation <= 0 ? '太阳位于地平线' : '太阳未被高层情景遮挡';
  $('sun-state').parentElement.classList.toggle('blocked', blocked);
  if (sun) {
    const vector = sunVector(position);
    sun.position.copy(vector.multiplyScalar(24));
    sun.intensity = visible ? Math.max(0.25, 4.2 * Math.min(1, Math.sin(Math.max(position.elevation, 0) * Math.PI / 180) * 2.5)) : 0;
    sun.color.setHSL(0.10, 0.72, position.elevation < 15 ? 0.57 : 0.72);
    updateSunlitFloor(position, blocked);
    render();
  }
  drawChart(position);
}

function drawChart(position) {
  const { sunrise, sunset } = currentTimes();
  const left = 35, right = 825, bottom = 146, top = 14;
  const x = minute => left + (minute - sunrise) / (sunset - sunrise) * (right - left);
  const y = altitude => bottom - Math.max(0, altitude) / 90 * (bottom - top);
  const samples = [];
  for (let minute = sunrise; minute <= sunset; minute += (sunset - sunrise) / 180) samples.push({ minute, ...solarPosition(state.season.date, minute, SITE) });
  samples.push({ minute: sunset, ...solarPosition(state.season.date, sunset, SITE) });
  const path = samples.map((p, i) => `${i ? 'L' : 'M'}${x(p.minute).toFixed(1)},${y(p.elevation).toFixed(1)}`).join(' ');
  const area = `${path} L${right},${bottom} L${left},${bottom} Z`;
  const blocks = [];
  let start = null;
  for (const sample of samples) {
    if (isBlocked(sample, blocker) && start === null) start = sample.minute;
    if ((!isBlocked(sample, blocker) || sample === samples.at(-1)) && start !== null) {
      blocks.push(`<rect x="${x(start).toFixed(1)}" y="${top}" width="${Math.max(1, x(sample.minute) - x(start)).toFixed(1)}" height="${bottom - top}" fill="#566b72" opacity=".13"/>`);
      start = null;
    }
  }
  $('blocker-effect').textContent = !blocker.enabled ? '已关闭高层遮挡情景。' : blocks.length
    ? `${state.season.label}按当前参数约在 ${clockTime(samples.find(p => isBlocked(p, blocker)).minute)} 至 ${clockTime([...samples].reverse().find(p => isBlocked(p, blocker)).minute)} 可能受遮挡。`
    : `${state.season.label}的太阳轨迹未进入当前高层遮挡角域。`;
  const cursorX = x(state.minute), cursorY = y(position.elevation);
  $('sun-chart').innerHTML = `<defs><linearGradient id="sun-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e6aa62" stop-opacity=".34"/><stop offset="1" stop-color="#e6aa62" stop-opacity=".015"/></linearGradient></defs>
    <line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="#c9c9c0" stroke-width="1"/>
    ${[20, 40, 60, 80].map(v => `<line x1="${left}" y1="${y(v)}" x2="${right}" y2="${y(v)}" stroke="#e7e4db"/><text x="4" y="${y(v) + 4}" fill="#89918b" font-size="11">${v}°</text>`).join('')}
    ${blocks.join('')}<path d="${area}" fill="url(#sun-fill)"/><path d="${path}" fill="none" stroke="#d79148" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="${cursorX}" x2="${cursorX}" y1="${cursorY}" y2="${bottom}" stroke="#b77d48" stroke-dasharray="3 5"/><circle cx="${cursorX}" cy="${cursorY}" r="7" fill="#fff8eb" stroke="#d79148" stroke-width="3"/>`;
  $('sun-chart').setAttribute('aria-label', `${state.season.label}太阳高度曲线，${clockTime(sunrise)}日出，${clockTime(sunset)}日落，当前${clockTime(state.minute)}太阳高度${position.elevation.toFixed(1)}度`);
}

function updateBlocker() {
  blocker.enabled = $('blocker-enabled').checked;
  blocker.height = Number($('blocker-height').value);
  blocker.distance = Number($('blocker-distance').value);
  blocker.bearing = Number($('blocker-bearing').value);
  $('blocker-height-value').textContent = `${blocker.height} m`;
  $('blocker-distance-value').textContent = `${blocker.distance} m`;
  $('blocker-bearing-value').textContent = `${blocker.bearing}°`;
  $('blocker-summary').textContent = blocker.enabled ? '已考虑前方高层' : '未计前方高层';
  update();
}

function playFrame(timestamp) {
  if (!state.playing) return;
  if (state.lastFrame) state.minute += Math.min(0.06, (timestamp - state.lastFrame) / 1000) * 22;
  state.lastFrame = timestamp;
  if (state.minute >= currentTimes().sunset) { state.minute = currentTimes().sunset; togglePlay(false); }
  update();
  if (state.playing) requestAnimationFrame(playFrame);
}

function togglePlay(playing = !state.playing) {
  state.playing = playing;
  state.lastFrame = 0;
  $('play-icon').textContent = playing ? 'Ⅱ' : '▶';
  $('play-label').textContent = playing ? '暂停播放' : '播放一天';
  $('play').setAttribute('aria-label', playing ? '暂停日照动画' : '播放日出到日落动画');
  if (playing) {
    if (state.minute >= currentTimes().sunset - 1) state.minute = currentTimes().sunrise;
    requestAnimationFrame(playFrame);
  }
}

init3D();
for (const button of document.querySelectorAll('[data-season]')) button.addEventListener('click', () => { togglePlay(false); updateSeason(SEASONS.find(s => s.id === button.dataset.season)); });
$('time-range').addEventListener('input', event => { togglePlay(false); state.minute = Number(event.target.value); update(); });
$('play').addEventListener('click', () => togglePlay());
for (const id of ['blocker-enabled', 'blocker-height', 'blocker-distance', 'blocker-bearing']) $(id).addEventListener('input', updateBlocker);
$('view-reset').addEventListener('click', () => { if (!camera) return; state.top = false; camera.position.set(12, 16, 18); camera.zoom = 1; camera.updateProjectionMatrix(); controls.target.set(0, 0, 0.1); controls.update(); render(); });
$('view-top').addEventListener('click', () => { if (!camera) return; state.top = !state.top; camera.position.set(state.top ? 0.001 : 12, state.top ? 24 : 16, state.top ? 0 : 18); camera.lookAt(0, 0, 0); controls.update(); $('view-top').textContent = state.top ? '立体' : '俯视'; render(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) togglePlay(false); });
updateSeason(state.season, true);
