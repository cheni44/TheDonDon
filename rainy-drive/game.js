'use strict';

// ─── Canvas ──────────────────────────────────────────────────────────────────
const canvas  = document.getElementById('gameCanvas');
const ctx     = canvas.getContext('2d');
const wrapper = document.getElementById('gameWrapper');

// applyLayout: positions wrapper and sets canvas buffer dimensions.
// On portrait mobile we rotate the wrapper -90° using exact pixel values so
// the game always renders landscape — more reliable than CSS media queries on
// iOS Safari where vw/vh inside a transformed fixed element misbehave.
function applyLayout() {
  const isMobile = navigator.maxTouchPoints > 0;
  const W = window.innerWidth, H = window.innerHeight;
  const portrait = H > W;

  if (isMobile && portrait) {
    // Wrapper: landscape box (H × W) rotated to fill the portrait screen
    Object.assign(wrapper.style, {
      position: 'fixed', top: H + 'px', left: '0px',
      right: 'auto',     bottom: 'auto',
      width: H + 'px',   height: W + 'px',
      transformOrigin: 'left top',
      transform: 'rotate(-90deg)',
    });
    canvas.width  = H;   // landscape width  = portrait height
    canvas.height = W;   // landscape height = portrait width
  } else {
    Object.assign(wrapper.style, {
      position: 'fixed', top: '0', left: '0',
      right: '0',        bottom: '0',
      width: '',         height: '',
      transformOrigin: '', transform: '',
    });
    canvas.width  = W;
    canvas.height = H;
  }
}
window.addEventListener('resize', applyLayout);
window.addEventListener('orientationchange', () => setTimeout(applyLayout, 150));
applyLayout();

// ─── Utilities ───────────────────────────────────────────────────────────────
const lerp  = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rand  = (a, b)      => a + Math.random() * (b - a);
const pick  = arr         => arr[Math.floor(Math.random() * arr.length)];

// ─── Layout (fractions of screen) ────────────────────────────────────────────
// VP_Y=0.30 → horizon higher up, more road visible (closer driver POV)
// ROAD_HW=0.64 → wider perspective, more enveloping highway feel
// ROAD_BOTTOM=0.84 → slightly larger dashboard, more cabin immersion
const VP_Y        = 0.30;
const ROAD_BOTTOM = 0.84;
const ROAD_HW     = 0.64;

const vpX  = () => canvas.width  / 2;
const vpY  = () => canvas.height * VP_Y;
const botY = () => canvas.height * ROAD_BOTTOM;

// Perspective: z=0 → horizon (far), z=1 → player (near)
function projX(roadX, z) { return vpX() + roadX * canvas.width * ROAD_HW * z; }
function projY(z)         { return vpY() + (botY() - vpY()) * z; }

// ─── Game constants ───────────────────────────────────────────────────────────
const LANES        = [-0.60, 0, 0.60];
const CAR_HALF_W   = 0.13;
const CAR_H_PX     = 100;
const HIT_Z_MIN    = 0.80;
const HIT_Z_MAX    = 1.05;
const HIT_X_THRESH = CAR_HALF_W + 0.12;
const CAR_COLORS   = [
  '#c0392b','#e74c3c','#2980b9','#3498db',
  '#16a085','#1abc9c','#8e44ad','#9b59b6',
  '#d35400','#e67e22','#7f8c8d','#95a5a6',
];

// ─── Vehicle type definitions (個性化車輛) ────────────────────────────────────
// minLaneIdx: 0=可用全部車道, 1=不能用最左側車道(大卡車/遊覽車)
const VEHICLE_TYPES = [
  { type:'sedan',    label:'轎車',   baseKph:100, kphRange:10, minLaneIdx:0,
    wMult:1.00, hMult:1.00, weight:5,
    colors:['#c0392b','#e74c3c','#2980b9','#3498db','#16a085','#8e44ad','#d35400','#1a1a2e','#2c3e50'],
    brands:['Toyota','Honda','BMW','Benz','Audi','Nissan','Lexus','Kia'] },
  { type:'sports',   label:'跑車',   baseKph:120, kphRange:20, minLaneIdx:0,
    wMult:1.18, hMult:0.70, weight:2,
    colors:['#c0392b','#e74c3c','#f39c12','#8e44ad','#e67e22','#f1c40f','#1a1a2e'],
    brands:['Ferrari','Porsche','Lambo','BMW M','Benz AMG','Audi R8'] },
  { type:'van',      label:'貨車',   baseKph:90,  kphRange:5,  minLaneIdx:0,
    wMult:1.12, hMult:1.40, weight:3,
    colors:['#bdc3c7','#95a5a6','#7f8c8d','#d5d8dc','#aab7b8','#e8e8e8'],
    brands:['Ford','Isuzu','Toyota','Mercedes','Mitsubishi'] },
  { type:'bigtruck', label:'大卡車', baseKph:100, kphRange:10, minLaneIdx:1,
    wMult:1.52, hMult:2.20, weight:2,
    colors:['#aab7b8','#85929e','#626567','#d5d8dc','#f0b27a','#2c3e50'],
    brands:['Volvo','Scania','MAN','Benz','DAF'] },
  { type:'bus',      label:'遊覽車', baseKph:95,  kphRange:15, minLaneIdx:1,
    wMult:1.38, hMult:2.05, weight:2,
    colors:['#d4e6f1','#a9cce3','#f1948a','#82e0aa','#f8c471','#85c1e9','#eeeeee'],
    brands:['Mercedes','MAN','Setra','Volvo','NEOPLAN'] },
];
function pickVehicleType() {
  const total = VEHICLE_TYPES.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const t of VEHICLE_TYPES) { r -= t.weight; if (r <= 0) return t; }
  return VEHICLE_TYPES[0];
}

// ─── Web Audio rain & thunder ────────────────────────────────────────────────
let audioCtx = null, rainGainNode = null, masterGainNode = null, noiseBuf = null;

function initAudio() {
  if (audioCtx) { audioCtx.resume(); return; }
  try {
    audioCtx       = new (window.AudioContext || window.webkitAudioContext)();
    masterGainNode = audioCtx.createGain();
    masterGainNode.gain.value = 0.82;
    masterGainNode.connect(audioCtx.destination);

    // Long noise buffer for variety
    const rate = audioCtx.sampleRate;
    noiseBuf   = audioCtx.createBuffer(1, rate * 8, rate);
    const d    = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    rainGainNode = audioCtx.createGain();
    rainGainNode.gain.value = 1.1;

    // ── Car-cabin reverb: small-room delay + feedback ──────────────────────
    // Simulates the enclosed resonance of the car interior
    const cabDelay = audioCtx.createDelay(0.20);
    cabDelay.delayTime.value = 0.058;   // 58 ms room reflection
    const cabFB    = audioCtx.createGain(); cabFB.gain.value = 0.20; // 20% feedback
    const cabWet   = audioCtx.createGain(); cabWet.gain.value = 0.30; // wet mix
    cabDelay.connect(cabFB); cabFB.connect(cabDelay); // feedback loop
    cabDelay.connect(cabWet); cabWet.connect(masterGainNode);

    // Low-cut to remove sub-bass rumble that muddies indoor sound
    const hiPass = audioCtx.createBiquadFilter();
    hiPass.type = 'highpass'; hiPass.frequency.value = 55;

    rainGainNode.connect(hiPass);
    hiPass.connect(cabDelay);          // wet path → reverb
    hiPass.connect(masterGainNode);    // dry path

    function addLayer(type, freq, Q, vol) {
      const src = audioCtx.createBufferSource();
      src.buffer = noiseBuf; src.loop = true;
      const flt = audioCtx.createBiquadFilter();
      flt.type = type; flt.frequency.value = freq;
      if (Q !== null) flt.Q.value = Q;
      const gn = audioCtx.createGain(); gn.gain.value = vol;
      src.connect(flt); flt.connect(gn); gn.connect(rainGainNode);
      src.start();
    }
    // In-car rain profile (heard through metal roof & glass, muffled):
    addLayer('bandpass',  340, 2.8, 0.42);   // heavy drumming on metal roof
    addLayer('bandpass',  620, 2.2, 0.30);   // secondary hood/pillars tap
    addLayer('bandpass',  950, 3.0, 0.18);   // muffled windshield glass patter
    addLayer('lowpass',   160, null, 0.22);  // cabin ambient low-frequency body
    addLayer('lowpass',    55, null, 0.10);  // wind pressure buffet (sub-bass)
  } catch(e) { console.warn('Audio unavailable:', e); }
}

// Single heavy raindrop thudding on metal roof
function playRoofDrop() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    const flt = audioCtx.createBiquadFilter();
    flt.type = 'lowpass'; flt.frequency.value = 480;
    osc.type = 'sine';
    const t = audioCtx.currentTime;
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(75, t + 0.14);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.45 + (g?.rainIntensity ?? 1) * 0.25, t + 0.006);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(flt); flt.connect(env); env.connect(masterGainNode);
    osc.start(t); osc.stop(t + 0.28);
  } catch(_) {}
}

function updateAudioIntensity() {
  if (!rainGainNode || !audioCtx) return;
  rainGainNode.gain.setTargetAtTime(
    clamp(g.rainIntensity * 0.95, 0.4, 2.2), audioCtx.currentTime, 0.5);
}

function playThunder() {
  if (!audioCtx) return;
  try {
    const rate = audioCtx.sampleRate;
    const dur  = 2.8 + Math.random() * 2.2;
    const tbuf = audioCtx.createBuffer(1, Math.ceil(rate * (dur + 0.6)), rate);
    const td   = tbuf.getChannelData(0);
    for (let i = 0; i < td.length; i++) td[i] = Math.random() * 2 - 1;

    const src  = audioCtx.createBufferSource(); src.buffer = tbuf;
    const flt  = audioCtx.createBiquadFilter();
    flt.type   = 'lowpass'; flt.frequency.value = 155;
    const env  = audioCtx.createGain();
    const t    = audioCtx.currentTime;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(3.0, t + 0.04);
    env.gain.setValueAtTime(3.0, t + 0.04 + Math.random() * 0.25);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(flt); flt.connect(env); env.connect(masterGainNode);
    src.start(t); src.stop(t + dur + 0.1);
  } catch(_) {}
}

// ─── Blinker sound (方向燈聲音) ───────────────────────────────────────────────
function playBlinkerTick(highTone) {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = highTone ? 1320 : 880;
    const t = audioCtx.currentTime;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.10, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
    osc.connect(env); env.connect(masterGainNode);
    osc.start(t); osc.stop(t + 0.08);
  } catch(_) {}
}

// ─── Tilt control ─────────────────────────────────────────────────────────────
let tiltX = 0, tiltEnabled = false;
function handleTilt(e) {
  if (!g?.alive) { tiltX = 0; return; }
  const gamma = e.gamma ?? 0;
  const DEAD = 4, MAX = 28;
  tiltX = Math.abs(gamma) < DEAD
    ? 0
    : clamp((Math.abs(gamma) - DEAD) / (MAX - DEAD), 0, 1) * Math.sign(gamma);
}
async function requestTiltPermission() {
  if (typeof DeviceOrientationEvent === 'undefined') return;
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      if (await DeviceOrientationEvent.requestPermission() === 'granted') {
        window.addEventListener('deviceorientation', handleTilt);
        tiltEnabled = true;
      }
    } catch(_) {}
  } else {
    window.addEventListener('deviceorientation', handleTilt);
    tiltEnabled = true;
  }
}

// ─── Wind system ─────────────────────────────────────────────────────────────
const wind = { vx: -12, nextGust: rand(2, 5), gustTimer: 0, gustStrength: 0 };
function resetWind() { wind.vx = -12; wind.nextGust = rand(2,5); wind.gustTimer = 0; wind.gustStrength = 0; }
function updateWind(dt) {
  wind.nextGust -= dt;
  if (wind.nextGust <= 0) {
    wind.gustStrength = rand(1.2, 3.2);
    wind.gustTimer    = rand(1.5, 5.0);
    wind.nextGust     = rand(4, 12);
  }
  if (wind.gustTimer > 0) { wind.gustTimer -= dt; wind.vx = lerp(wind.vx, -wind.gustStrength * 20, dt * 3); }
  else                     { wind.vx = lerp(wind.vx, -12, dt * 0.8); }
}

// ─── State ───────────────────────────────────────────────────────────────────
let g = {}, running = false, lastTime = 0, bestScore = 0;

function initGame() {
  resetWind();
  g = {
    playerX: 0, playerVX: 0,
    cars: [],
    rainFar: [], rainMid: [], rainNear: [],
    wsDrop: [], wsSheets: [], rainCurtains: [],
    splashes: [],
    puddles: [
      { x: -0.28, z: 0.52, w: 0.20, d: 0.050 },
      { x:  0.50, z: 0.66, w: 0.24, d: 0.065 },
      { x: -0.58, z: 0.80, w: 0.28, d: 0.070 },
      { x:  0.12, z: 0.38, w: 0.17, d: 0.040 },
      { x: -0.08, z: 0.72, w: 0.14, d: 0.035 },
    ],
    score: 0, speed: 1, throttle: 1.0, wiperSpeedMult: 1.0,
    rainIntensity: 1.6, intensityTarget: 1.6, intensityTimer: 0,
    alive: true, time: 0, spawnT: 0,
    wiperA: -0.45, wiperDir: 1,
    lightning: 0, lightningNext: rand(3, 8),
    blinkerDir: 0, blinkerFlash: 0, blinkerOn: false,
    blinkerFlashCount: 0, blinkerAutoOff: 0,
    keys: {},
  };

  for (let i = 0; i < 640; i++) g.rainFar.push(newRainFar(true));
  for (let i = 0; i < 340; i++) g.rainMid.push(newRainMid(true));
  for (let i = 0; i < 150; i++) g.rainNear.push(newRainNear(true));
  for (let i = 0; i < 42;  i++) g.wsDrop.push(newWsDrop(true));
  for (let i = 0; i < 5;   i++) g.rainCurtains.push(newRainCurtain(true));
}

// ─── Factories ───────────────────────────────────────────────────────────────
function newRainFar(init = false) {
  return {
    x: rand(0, canvas.width),
    y: init ? rand(0, canvas.height * 0.82) : rand(-28, canvas.height * (VP_Y + 0.10)),
    vy: rand(10, 20), len: rand(5, 16), alpha: rand(0.14, 0.34),
  };
}
function newRainMid(init = false) {
  return {
    x: rand(0, canvas.width),
    y: init ? rand(0, canvas.height) : -22,
    vy: rand(20, 38), len: rand(16, 38), alpha: rand(0.25, 0.58),
  };
}
function newRainNear(init = false) {
  return {
    x: rand(0, canvas.width),
    y: init ? rand(0, canvas.height) : -32,
    vy: rand(36, 62), len: rand(40, 82), alpha: rand(0.40, 0.75),
  };
}
function newWsDrop(init = false) {
  return {
    x:         rand(canvas.width * 0.10, canvas.width * 0.90),
    y:         init ? rand(canvas.height * 0.06, canvas.height * 0.80)
                    : rand(canvas.height * 0.06, canvas.height * 0.54),
    size:      rand(2, 7),
    phase:     (init && Math.random() < 0.40) ? 'streak' : 'idle',
    idleTimer: rand(0.12, 1.6),
    vy: 0, drift: rand(-14, 14),
    trail: [],
  };
}
function newRainCurtain(init = false) {
  return {
    x:     init ? rand(0, canvas.width) : (Math.random() < 0.5 ? -500 : canvas.width + 500),
    w:     rand(180, 480),
    speed: rand(45, 120) * (Math.random() < 0.5 ? -1 : 1),
    alpha: rand(0.07, 0.22),
  };
}
function spawnCar() {
  const vtype = pickVehicleType();
  // 大卡車/遊覽車 不占最左側車道 (minLaneIdx=1 → 只能用 LANES[1], LANES[2])
  const availableLanes = LANES.slice(vtype.minLaneIdx);
  const lane = pick(availableLanes);
  if (g.cars.some(c => Math.abs(c.x - lane) < 0.05 && c.z < 0.18)) return;
  const kph = vtype.baseKph + (Math.random() * 2 - 1) * vtype.kphRange;
  g.cars.push({
    x: lane, z: 0.02,
    color: pick(vtype.colors),
    brand: pick(vtype.brands),
    type:  vtype.type,
    label: vtype.label,
    kph,
    wMult: vtype.wMult,
    hMult: vtype.hMult,
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────
function update(dt) {
  if (!g.alive) return;
  dt = Math.min(dt, 0.05);
  g.time  += dt;
  g.score  = Math.floor(g.time * 12 * Math.max(0.5, g.throttle));
  g.speed  = 1 + g.time * 0.035;

  if (g.keys.speedUp)   g.throttle       = Math.min(2.0, g.throttle       + dt * 0.7);
  if (g.keys.speedDown) g.throttle       = Math.max(0.4, g.throttle       - dt * 0.7);
  if (g.keys.wiperUp)   g.wiperSpeedMult = Math.min(3.0, g.wiperSpeedMult + dt * 1.5);
  if (g.keys.wiperDown) g.wiperSpeedMult = Math.max(0.3, g.wiperSpeedMult - dt * 1.5);

  g.intensityTimer -= dt;
  if (g.intensityTimer <= 0) {
    g.intensityTarget = rand(1.0, 2.8);
    g.intensityTimer  = rand(3, 10);
  }
  g.rainIntensity = lerp(g.rainIntensity, g.intensityTarget, dt * 0.45);

  updateAudioIntensity();
  updateWind(dt);
  updatePlayer(dt);
  updateCars(dt);
  updateRain(dt);
  updateWindshield(dt);
  updateWipers(dt);
  updateLightning(dt);
  updateSplashes(dt);
}

function updatePlayer(dt) {
  const ACCEL = 5.0, DECEL = 6;
  let ax = 0;
  const goLeft  = g.keys['ArrowLeft']  || g.keys['a'] || g.keys['A'] || g.keys.touchLeft;
  const goRight = g.keys['ArrowRight'] || g.keys['d'] || g.keys['D'] || g.keys.touchRight;
  if (goLeft)  ax -= ACCEL;
  if (goRight) ax += ACCEL;
  ax += tiltX * ACCEL * 1.1;

  // ── 方向燈邏輯 ──────────────────────────────────────────────────────────────
  const wantLeft  = goLeft  || tiltX < -0.22;
  const wantRight = goRight || tiltX >  0.22;
  if (wantLeft && !wantRight) {
    if (g.blinkerDir !== -1) { g.blinkerDir = -1; g.blinkerFlash = 0; g.blinkerFlashCount = 0; }
    g.blinkerAutoOff = 1.5;
  } else if (wantRight && !wantLeft) {
    if (g.blinkerDir !== 1)  { g.blinkerDir =  1; g.blinkerFlash = 0; g.blinkerFlashCount = 0; }
    g.blinkerAutoOff = 1.5;
  } else {
    if (g.blinkerAutoOff > 0) {
      g.blinkerAutoOff = Math.max(0, g.blinkerAutoOff - dt);
      if (g.blinkerAutoOff === 0) g.blinkerDir = 0;
    }
  }
  if (g.blinkerDir !== 0) {
    const CYCLE = 0.72;
    g.blinkerFlash += dt;
    const wasOn = g.blinkerOn;
    g.blinkerOn = (g.blinkerFlash % CYCLE) < CYCLE * 0.5;
    if (g.blinkerOn && !wasOn) { g.blinkerFlashCount++; playBlinkerTick(g.blinkerFlashCount % 2 === 1); }
  } else {
    g.blinkerOn = false;
  }

  g.playerVX += ax * dt;
  g.playerVX *= Math.exp(-DECEL * dt);
  g.playerX   = clamp(g.playerX + g.playerVX * dt, -0.78, 0.78);
}

function updateCars(dt) {
  g.spawnT -= dt;
  if (g.spawnT <= 0) {
    spawnCar();
    g.spawnT = Math.max(0.4, rand(1.4, 2.4) / (g.speed * g.throttle));
  }
  // 玩家目前車速 (km/h)，用於計算與其他車輛的相對速度
  const playerKph = (80 + g.speed * 38) * g.throttle;
  for (let i = g.cars.length - 1; i >= 0; i--) {
    const c = g.cars[i];
    // 速差越大 → 相對接近越快；跑車接近較慢，貨車/慢車接近較快
    const baseSpd = 0.52 * g.speed * g.throttle;
    const speedFactor = clamp(1 + (playerKph - c.kph) / 60, 0.12, 3.0);
    c.z += baseSpd * speedFactor * dt;
    // 碰撞閾值依車寬縮放
    const hitThresh = CAR_HALF_W * c.wMult + CAR_HALF_W * 0.85;
    if (c.z >= HIT_Z_MIN && c.z <= HIT_Z_MAX && Math.abs(c.x - g.playerX) < hitThresh) {
      g.alive = false; showGameOver(); return;
    }
    if (c.z > 1.15) g.cars.splice(i, 1);
  }
}

function updateRain(dt) {
  const sp = g.speed * g.throttle, ri = g.rainIntensity;

  // Wrap horizontally instead of random-respawn, so rain stays evenly distributed
  for (const r of g.rainFar) {
    r.x += wind.vx * dt * 60 * 0.22;
    r.y += r.vy * dt * 60 * sp * ri * 0.50;
    if      (r.y > canvas.height * (VP_Y + 0.12)) { Object.assign(r, newRainFar()); }
    else if (r.x < -50)                { r.x = canvas.width  + 50; }
    else if (r.x > canvas.width + 50)  { r.x = -50; }
  }
  for (const r of g.rainMid) {
    r.x += wind.vx * dt * 60 * 0.58;
    r.y += r.vy * dt * 60 * sp * ri;
    if      (r.y > canvas.height + 30) { Object.assign(r, newRainMid()); }
    else if (r.x < -60)                { r.x = canvas.width  + 60; }
    else if (r.x > canvas.width + 60)  { r.x = -60; }
  }
  for (const r of g.rainNear) {
    r.x += wind.vx * dt * 60;
    r.y += r.vy * dt * 60 * sp * ri * 1.1;
    if      (r.y > canvas.height + 45) { Object.assign(r, newRainNear()); }
    else if (r.x < -80)                { r.x = canvas.width  + 80; }
    else if (r.x > canvas.width + 80)  { r.x = -80; }
  }
  for (const c of g.rainCurtains) {
    c.x += c.speed * dt;
    if (c.x >  canvas.width + c.w + 300) c.x = -c.w - 300;
    if (c.x < -c.w - 300)                c.x =  canvas.width + c.w + 300;
  }
  if (Math.random() < dt * 28 * ri)
    g.splashes.push({ x: rand(-0.88, 0.88), z: rand(0.18, 0.95), t: 0, life: rand(0.14, 0.38) });

  // Random heavy drops thumping on metal roof
  if (Math.random() < dt * 3.5 * ri) playRoofDrop();
}

function updateWindshield(dt) {
  if (Math.random() < g.rainIntensity * 5.0 * dt && g.wsDrop.length < 80)
    g.wsDrop.push(newWsDrop(false));

  for (let i = g.wsDrop.length - 1; i >= 0; i--) {
    const d = g.wsDrop[i];
    if (d.phase === 'idle') {
      d.idleTimer -= dt;
      if (d.idleTimer <= 0) { d.phase = 'streak'; d.vy = rand(90, 270) * g.rainIntensity; }
    } else {
      d.y += d.vy * dt; d.x += d.drift * dt;
      d.trail.push({ x: d.x, y: d.y });
      if (d.trail.length > 26) d.trail.shift();
      if (d.y > canvas.height * ROAD_BOTTOM + 22) g.wsDrop.splice(i, 1);
    }
  }
  if (Math.random() < g.rainIntensity * 0.8 * dt && g.wsSheets.length < 7)
    g.wsSheets.push({ y: canvas.height * 0.065, speed: rand(100, 280), alpha: rand(0.06, 0.20), h: rand(8, 28) });
  for (let i = g.wsSheets.length - 1; i >= 0; i--) {
    g.wsSheets[i].y += g.wsSheets[i].speed * dt;
    if (g.wsSheets[i].y > canvas.height * ROAD_BOTTOM) g.wsSheets.splice(i, 1);
  }
  clearWiperDrops();
}

function clearWiperDrops() {
  const W = canvas.width, H = canvas.height;
  const pivY = botY() + H * 0.020, len = W * 0.44;
  for (const d of g.wsDrop) {
    if (d.phase === 'streak') continue;
    if (isNearBlade(d.x, d.y, W*0.14, pivY,  g.wiperA, len) ||
        isNearBlade(d.x, d.y, W*0.86, pivY, -g.wiperA, len))
      { d.phase = 'streak'; d.vy = rand(150, 320); }
  }
}
function isNearBlade(px, py, bx, by, angle, len) {
  const ex = bx+Math.sin(angle)*len, ey = by-Math.cos(angle)*len;
  const dx = ex-bx, dy = ey-by, l2 = dx*dx+dy*dy;
  if (!l2) return false;
  const t = clamp(((px-bx)*dx+(py-by)*dy)/l2, 0, 1);
  return Math.hypot(px-(bx+t*dx), py-(by+t*dy)) < 22;
}

function updateWipers(dt) {
  // Sweep from -0.45 (outer edge, behind A-pillar) to +0.85 (past centre)
  const spd = Math.PI * 1.1 * Math.sqrt(g.speed) * g.wiperSpeedMult;
  g.wiperA += g.wiperDir * spd * dt;
  if (g.wiperA >  0.85) { g.wiperA =  0.85; g.wiperDir = -1; }
  if (g.wiperA < -0.45) { g.wiperA = -0.45; g.wiperDir =  1; }
}

function updateLightning(dt) {
  g.lightningNext -= dt;
  if (g.lightningNext <= 0) {
    g.lightning     = 0.20;
    g.lightningNext = rand(3, 11) / g.rainIntensity;
    playThunder();
  }
  if (g.lightning > 0) g.lightning = Math.max(0, g.lightning - dt * 5);
}
function updateSplashes(dt) {
  for (let i = g.splashes.length - 1; i >= 0; i--) {
    g.splashes[i].t += dt;
    if (g.splashes[i].t > g.splashes[i].life) g.splashes.splice(i, 1);
  }
}

// ─── Draw: Sky ───────────────────────────────────────────────────────────────
function drawSky() {
  const W = canvas.width, H = canvas.height, vy = vpY();
  const sky = ctx.createLinearGradient(0, 0, 0, vy);
  sky.addColorStop(0,    '#030710');
  sky.addColorStop(0.55, '#09121e');
  sky.addColorStop(1,    '#122030');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, vy + 2);

  for (let i = 0; i < 5; i++) {
    const my = vy * (0.15 + i * 0.18);
    const mb = ctx.createLinearGradient(0, my-H*0.08, 0, my+H*0.08);
    mb.addColorStop(0,   'rgba(14,30,48,0)');
    mb.addColorStop(0.5, `rgba(20,44,66,${0.13 + i*0.04 + g.rainIntensity*0.05})`);
    mb.addColorStop(1,   'rgba(14,30,48,0)');
    ctx.fillStyle = mb; ctx.fillRect(0, my-H*0.08, W, H*0.16);
  }
  const fog = ctx.createLinearGradient(0, vy-H*0.15, 0, vy+H*0.09);
  fog.addColorStop(0,    'rgba(10,24,42,0)');
  fog.addColorStop(0.55, `rgba(34,62,92,${0.58 + g.rainIntensity*0.22})`);
  fog.addColorStop(1,    'rgba(10,24,42,0)');
  ctx.fillStyle = fog; ctx.fillRect(0, vy-H*0.15, W, H*0.24);
}

// ─── Draw: Road (all content shifted by -playerX for first-person perspective)
function drawRoad() {
  const W = canvas.width, vx = vpX(), vy = vpY(), by = botY(), rw = W * ROAD_HW;
  const pOff = g.playerX;  // FIX: offset everything by player position

  // Road surface (shape fixed, content shifts)
  const road = ctx.createLinearGradient(vx, vy, vx, by);
  road.addColorStop(0, '#151515'); road.addColorStop(1, '#252525');
  ctx.fillStyle = road;
  ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(vx+rw, by); ctx.lineTo(vx-rw, by); ctx.closePath(); ctx.fill();

  drawRoadWaterChannels(vx, vy, by, rw, pOff);
  drawPuddles(pOff);

  const sheen = ctx.createLinearGradient(vx, vy, vx, by);
  sheen.addColorStop(0,    'rgba(55,105,180,0)');
  sheen.addColorStop(0.65, `rgba(55,105,180,${0.09 + g.rainIntensity*0.06})`);
  sheen.addColorStop(1,    `rgba(88,148,215,${0.20 + g.rainIntensity*0.10})`);
  ctx.fillStyle = sheen;
  ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(vx+rw, by); ctx.lineTo(vx-rw, by); ctx.closePath(); ctx.fill();

  drawSplashRings(pOff);

  // Lane dividers shifted by playerX
  for (const lx of [-1/3, 1/3]) {
    for (let i = 0; i < 18; i++) {
      const z0 = i/18, z1 = (i+0.46)/18;
      ctx.strokeStyle = 'rgba(192,192,192,0.50)';
      ctx.lineWidth = Math.max(0.5, 2*z1);
      ctx.beginPath();
      ctx.moveTo(projX(lx - pOff, z0), projY(z0));
      ctx.lineTo(projX(lx - pOff, z1), projY(z1));
      ctx.stroke();
    }
  }
  ctx.strokeStyle = 'rgba(215,215,215,0.65)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(vx+rw, by); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(vx-rw, by); ctx.stroke();
}

function drawRoadWaterChannels(vx, vy, by, rw, pOff) {
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const z = 0.22 + i * 0.10;
    const cy = vy + (by - vy) * z;
    const hw = rw * z;
    ctx.strokeStyle = `rgba(150,200,240,${(0.06 + g.rainIntensity*0.04) * (0.4 + Math.random()*0.6)})`;
    ctx.lineWidth = Math.max(0.5, z * 3);
    ctx.beginPath();
    ctx.moveTo(vx - hw*0.85, cy); ctx.lineTo(vx + hw*0.85, cy);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPuddles(pOff) {
  for (const p of g.puddles) {
    const cx = projX(p.x - pOff, p.z), cy = projY(p.z);
    const pw = p.w * canvas.width * ROAD_HW * p.z;
    const ph = p.d * canvas.height * p.z * 0.5;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, cy, pw, ph, 0, 0, Math.PI*2);
    const gr = ctx.createRadialGradient(cx, cy-ph*0.3, 0, cx, cy, Math.max(pw, ph));
    gr.addColorStop(0,   `rgba(108,162,230,${0.32 + g.rainIntensity*0.12})`);
    gr.addColorStop(0.7,  'rgba(70,120,200,0.16)');
    gr.addColorStop(1,    'rgba(50,90,170,0)');
    ctx.fillStyle = gr; ctx.fill(); ctx.restore();
  }
}

function drawSplashRings(pOff) {
  for (const s of g.splashes) {
    const cx = projX(s.x - pOff, s.z), cy = projY(s.z);
    const p = s.t / s.life, r = 18 * s.z * p;
    ctx.strokeStyle = `rgba(200,230,255,${(1-p)*0.52*s.z})`;
    ctx.lineWidth = Math.max(0.5, 1.8*s.z);
    ctx.beginPath(); ctx.ellipse(cx, cy, r, r*0.28, 0, 0, Math.PI*2); ctx.stroke();
  }
}

// ─── Draw: Rain ──────────────────────────────────────────────────────────────
function drawRainLayer(arr, color, lw, cap) {
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  const ri = Math.min(cap, g.rainIntensity);
  for (const r of arr) {
    ctx.globalAlpha = r.alpha * ri;
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x + wind.vx*(r.len/r.vy), r.y + r.len);
    ctx.stroke();
  }
  ctx.restore();
}
function drawRainCurtains() {
  ctx.save();
  for (const c of g.rainCurtains) {
    const alpha = c.alpha * g.rainIntensity;
    const gr = ctx.createLinearGradient(c.x - c.w/2, 0, c.x + c.w/2, 0);
    gr.addColorStop(0,   'rgba(185,215,248,0)');
    gr.addColorStop(0.5, `rgba(185,215,248,${alpha})`);
    gr.addColorStop(1,   'rgba(185,215,248,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(c.x - c.w/2, 0, c.w, canvas.height * ROAD_BOTTOM);
  }
  ctx.restore();
}

// ─── Draw: Car spray (fan widening toward camera) ────────────────────────────
function drawCarSpray(c) {
  const { x: rx, z, wMult, hMult } = c;
  if (z < 0.10) return;
  const pOff = g.playerX;
  const cx = projX(rx - pOff, z), cy = projY(z);
  const w  = CAR_HALF_W * 2 * canvas.width * ROAD_HW * z * wMult;
  const h  = CAR_H_PX * z * hMult;
  const op = Math.min(1,(z-0.10)/0.35) * 0.55 * g.rainIntensity * Math.min(g.throttle, 1.6);
  if (op < 0.01) return;
  ctx.save();
  const spH = h * 1.2, spW = w * 2.2;
  const gr = ctx.createLinearGradient(cx, cy, cx, cy + spH);
  gr.addColorStop(0,    `rgba(190,225,255,${op*0.55})`);
  gr.addColorStop(0.35, `rgba(190,225,255,${op*0.22})`);
  gr.addColorStop(1,    'rgba(190,225,255,0)');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.moveTo(cx-w*0.44, cy); ctx.lineTo(cx-spW/2, cy+spH);
  ctx.lineTo(cx+spW/2, cy+spH); ctx.lineTo(cx+w*0.44, cy);
  ctx.closePath(); ctx.fill(); ctx.restore();
}

// ─── Per-type car draw helpers ────────────────────────────────────────────────
// Shared: draw brand label on rear of vehicle
function drawBrandLabel(cx, cy, w, h, brand, yFrac) {
  if (w < 18) return;
  ctx.save();
  const fs = clamp(Math.round(w * 0.20), 7, 26);
  ctx.font          = `bold ${fs}px Arial, sans-serif`;
  ctx.textAlign     = 'center';
  ctx.textBaseline  = 'middle';
  ctx.shadowColor   = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur    = 3;
  ctx.fillStyle     = 'rgba(225,225,225,0.82)';
  ctx.fillText(brand, cx, cy - h * yFrac);
  ctx.restore();
}

function drawSedan(cx, cy, w, h, color, z, brand) {
  // ── Trunk (lower ~35%) ─────────────────────────────────────────────────────
  ctx.fillStyle = color;
  ctx.fillRect(cx-w/2, cy-h, w, h);
  // Slightly darker roof panel (upper 32%)
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.fillRect(cx-w*0.36, cy-h, w*0.72, h*0.32);
  // Rear window (dark glass)
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.fillRect(cx-w*0.30, cy-h*0.98, w*0.60, h*0.22);
  ctx.fillStyle = 'rgba(100,165,225,0.40)';
  ctx.fillRect(cx-w*0.26, cy-h*0.95, w*0.52, h*0.15);
  // Trunk panel divider line
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = Math.max(0.5, z * 1.2);
  ctx.beginPath(); ctx.moveTo(cx-w*0.50, cy-h*0.38); ctx.lineTo(cx+w*0.50, cy-h*0.38); ctx.stroke();
  // Taillights
  ctx.shadowColor = '#ff1100'; ctx.shadowBlur = 14*z*(1+g.rainIntensity*0.4);
  ctx.fillStyle = '#ff2200';
  ctx.fillRect(cx-w*0.50, cy-h*0.22, w*0.16, h*0.10);
  ctx.fillRect(cx+w*0.34, cy-h*0.22, w*0.16, h*0.10);
  // Center brake line
  ctx.fillStyle = 'rgba(255,50,0,0.55)';
  ctx.fillRect(cx-w*0.15, cy-h*0.20, w*0.30, h*0.04);
  ctx.shadowBlur = 0;
  // Chrome bumper strip
  ctx.fillStyle = 'rgba(200,200,200,0.32)';
  ctx.fillRect(cx-w*0.46, cy-h*0.04, w*0.92, h*0.03);
  // Roof shine
  const shine = ctx.createLinearGradient(cx, cy-h, cx, cy-h*0.58);
  shine.addColorStop(0, 'rgba(255,255,255,0.22)'); shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine; ctx.fillRect(cx-w/2, cy-h, w, h*0.44);
  drawBrandLabel(cx, cy, w, h, brand, 0.56);
}

function drawSportsCar(cx, cy, w, h, color, z, brand) {
  // Main body (very low, wide)
  ctx.fillStyle = color;
  ctx.fillRect(cx-w/2, cy-h, w, h);
  // Tiny rear windshield slot
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.fillRect(cx-w*0.42, cy-h, w*0.84, h*0.26);
  ctx.fillStyle = 'rgba(100,185,255,0.50)';
  ctx.fillRect(cx-w*0.34, cy-h*0.97, w*0.68, h*0.14);
  // Ducktail spoiler
  ctx.fillStyle = 'rgba(0,0,0,0.50)';
  ctx.fillRect(cx-w*0.48, cy-h*1.00, w*0.96, h*0.06);
  // Wide LED-style taillight strip
  ctx.shadowColor = '#ff1100'; ctx.shadowBlur = 18*z*(1+g.rainIntensity*0.4);
  ctx.fillStyle = '#ff2200';
  ctx.fillRect(cx-w*0.50, cy-h*0.18, w*0.24, h*0.08);
  ctx.fillRect(cx+w*0.26, cy-h*0.18, w*0.24, h*0.08);
  // LED connector strip
  ctx.fillStyle = 'rgba(255,40,0,0.70)';
  ctx.fillRect(cx-w*0.26, cy-h*0.17, w*0.52, h*0.04);
  ctx.shadowBlur = 0;
  // Diffuser (black bottom panel)
  ctx.fillStyle = 'rgba(10,10,10,0.70)';
  ctx.fillRect(cx-w*0.48, cy-h*0.11, w*0.96, h*0.11);
  // Exhaust pipes
  ctx.fillStyle = '#888';
  ctx.beginPath(); ctx.ellipse(cx-w*0.22, cy-h*0.05, w*0.04, h*0.03, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx+w*0.22, cy-h*0.05, w*0.04, h*0.03, 0, 0, Math.PI*2); ctx.fill();
  const shine = ctx.createLinearGradient(cx, cy-h, cx, cy-h*0.62);
  shine.addColorStop(0, 'rgba(255,255,255,0.32)'); shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine; ctx.fillRect(cx-w/2, cy-h, w, h*0.38);
  drawBrandLabel(cx, cy, w, h, brand, 0.46);
}

function drawVan(cx, cy, w, h, color, z, brand) {
  // Cargo body (upper ~58%) – plain box
  ctx.fillStyle = color;
  ctx.fillRect(cx-w*0.46, cy-h, w*0.92, h*0.58);
  // Cargo rear door seam (center vertical)
  ctx.strokeStyle = 'rgba(0,0,0,0.30)';
  ctx.lineWidth = Math.max(0.5, z * 1.2);
  ctx.beginPath(); ctx.moveTo(cx, cy-h); ctx.lineTo(cx, cy-h*0.42); ctx.stroke();
  // Cargo door handle
  ctx.strokeStyle = 'rgba(180,180,180,0.50)';
  ctx.lineWidth = Math.max(0.5, z * 1.5);
  ctx.beginPath(); ctx.moveTo(cx-w*0.08, cy-h*0.55); ctx.lineTo(cx+w*0.08, cy-h*0.55); ctx.stroke();
  // Cab body (lower ~42%)
  ctx.fillStyle = color;
  ctx.fillRect(cx-w/2, cy-h*0.44, w, h*0.44);
  // Cab window
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.fillRect(cx-w*0.38, cy-h*0.43, w*0.76, h*0.24);
  ctx.fillStyle = 'rgba(100,165,225,0.42)';
  ctx.fillRect(cx-w*0.30, cy-h*0.41, w*0.60, h*0.17);
  // Divider bar between cab and cargo
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(cx-w/2, cy-h*0.45, w, h*0.04);
  // Taillights
  ctx.shadowColor = '#ff1100'; ctx.shadowBlur = 11*z*(1+g.rainIntensity*0.4);
  ctx.fillStyle = '#ff2200';
  ctx.fillRect(cx-w*0.50, cy-h*0.14, w*0.15, h*0.10);
  ctx.fillRect(cx+w*0.35, cy-h*0.14, w*0.15, h*0.10);
  ctx.shadowBlur = 0;
  const shine = ctx.createLinearGradient(cx, cy-h, cx, cy-h*0.56);
  shine.addColorStop(0, 'rgba(255,255,255,0.17)'); shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine; ctx.fillRect(cx-w/2, cy-h, w, h*0.44);
  drawBrandLabel(cx, cy, w, h, brand, 0.76);
}

function drawBigTruck(cx, cy, w, h, color, z, brand) {
  // ── Trailer (far / upper 65%) ─────────────────────────────────────────────
  ctx.fillStyle = '#6b7880';
  ctx.fillRect(cx-w*0.46, cy-h, w*0.92, h*0.65);
  // Trailer door seams
  ctx.strokeStyle = 'rgba(30,30,30,0.60)';
  ctx.lineWidth = Math.max(0.6, z * 1.8);
  ctx.beginPath(); ctx.moveTo(cx, cy-h); ctx.lineTo(cx, cy-h*0.35); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx-w*0.44, cy-h*0.50); ctx.lineTo(cx+w*0.44, cy-h*0.50); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx-w*0.44, cy-h*0.76); ctx.lineTo(cx+w*0.44, cy-h*0.76); ctx.stroke();
  // Trailer reflector strips (orange/white)
  ctx.fillStyle = 'rgba(255,165,0,0.60)';
  ctx.fillRect(cx-w*0.44, cy-h*0.685, w*0.92, h*0.014);
  ctx.fillRect(cx-w*0.44, cy-h*0.825, w*0.92, h*0.014);
  // Brand text on trailer door
  drawBrandLabel(cx, cy, w, h, brand, 0.82);
  // ── Cab (near / lower 36%) ────────────────────────────────────────────────
  ctx.fillStyle = color;
  ctx.fillRect(cx-w/2, cy-h*0.37, w, h*0.37);
  // Cab top air deflector
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(cx-w*0.42, cy-h*0.37, w*0.84, h*0.06);
  // Cab windshield
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.fillRect(cx-w*0.32, cy-h*0.33, w*0.64, h*0.18);
  ctx.fillStyle = 'rgba(100,165,225,0.40)';
  ctx.fillRect(cx-w*0.25, cy-h*0.31, w*0.50, h*0.13);
  // Big taillights
  ctx.shadowColor = '#ff1100'; ctx.shadowBlur = 20*z*(1+g.rainIntensity*0.4);
  ctx.fillStyle = '#ff2200';
  ctx.fillRect(cx-w*0.50, cy-h*0.15, w*0.18, h*0.12);
  ctx.fillRect(cx+w*0.32, cy-h*0.15, w*0.18, h*0.12);
  ctx.shadowBlur = 0;
  // Mudflaps
  ctx.fillStyle = 'rgba(20,20,20,0.65)';
  ctx.fillRect(cx-w*0.50, cy-h*0.08, w*0.18, h*0.08);
  ctx.fillRect(cx+w*0.32, cy-h*0.08, w*0.18, h*0.08);
}

function drawBus(cx, cy, w, h, color, z, brand) {
  // Main body
  ctx.fillStyle = color;
  ctx.fillRect(cx-w/2, cy-h, w, h);
  // Roof radius hint (slightly darker top strip)
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.fillRect(cx-w/2, cy-h, w, h*0.06);
  // Two rows of windows
  const winW = w * 0.13, winH = h * 0.14;
  for (let row = 0; row < 2; row++) {
    const winTop = cy - h * (0.94 - row * 0.20);
    for (let i = 0; i < 5; i++) {
      const wx = cx - w*0.44 + i * (w*0.88/4) - winW/2;
      ctx.fillStyle = 'rgba(0,0,0,0.38)';   ctx.fillRect(wx,   winTop,   winW,   winH);
      ctx.fillStyle = 'rgba(100,165,225,0.35)'; ctx.fillRect(wx+1, winTop+1, winW-2, winH-2);
    }
  }
  // Horizontal brand stripe
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  ctx.fillRect(cx-w*0.48, cy-h*0.52, w*0.96, h*0.06);
  // Brand
  drawBrandLabel(cx, cy, w, h, brand, 0.66);
  // Taillights (wide, bus-style)
  ctx.shadowColor = '#ff1100'; ctx.shadowBlur = 15*z*(1+g.rainIntensity*0.4);
  ctx.fillStyle = '#ff2200';
  ctx.fillRect(cx-w*0.50, cy-h*0.18, w*0.22, h*0.10);
  ctx.fillRect(cx+w*0.28, cy-h*0.18, w*0.22, h*0.10);
  ctx.fillStyle = 'rgba(255,80,0,0.55)';
  ctx.fillRect(cx-w*0.28, cy-h*0.17, w*0.56, h*0.04);
  ctx.shadowBlur = 0;
  const shine = ctx.createLinearGradient(cx, cy-h, cx, cy-h*0.66);
  shine.addColorStop(0, 'rgba(255,255,255,0.18)'); shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine; ctx.fillRect(cx-w/2, cy-h, w, h*0.35);
}

// ─── Draw: Cars (offset by playerX for correct first-person perspective) ──────
function drawCars() {
  const sorted = [...g.cars].sort((a, b) => a.z - b.z);
  for (const c of sorted) { drawCarSpray(c); drawCar(c); }
}
function drawCar(c) {
  const { x, z, color, type, wMult, hMult, brand } = c;
  if (z < 0.02) return;
  const pOff = g.playerX;
  const cx = projX(x - pOff, z), cy = projY(z);
  const w  = CAR_HALF_W * 2 * canvas.width * ROAD_HW * z * wMult;
  const h  = CAR_H_PX * z * hMult;
  if (w < 1 || h < 1) return;
  const fogAlpha = Math.min(1, z*1.1) / (1 + (1-z)*g.rainIntensity*0.9);
  ctx.save(); ctx.globalAlpha = Math.max(0.12, fogAlpha);
  switch (type) {
    case 'sports':   drawSportsCar(cx, cy, w, h, color, z, brand); break;
    case 'van':      drawVan     (cx, cy, w, h, color, z, brand); break;
    case 'bigtruck': drawBigTruck(cx, cy, w, h, color, z, brand); break;
    case 'bus':      drawBus     (cx, cy, w, h, color, z, brand); break;
    default:         drawSedan   (cx, cy, w, h, color, z, brand); break;
  }
  ctx.restore();
}

// ─── Draw: Lightning flash ────────────────────────────────────────────────────
function drawLightning() {
  if (g.lightning <= 0) return;
  ctx.fillStyle = `rgba(218,230,255,${((g.lightning/0.20)*0.36).toFixed(3)})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ─── Draw: Windshield drops & water sheets ────────────────────────────────────
function drawWindshieldDrops() {
  ctx.save();
  for (const d of g.wsDrop) {
    const sa = 0.22 + d.size * 0.022;
    if (d.phase === 'idle') {
      ctx.fillStyle = `rgba(126,192,255,${sa+0.06})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.size, 0, Math.PI*2); ctx.fill();
    } else if (d.trail.length > 1) {
      ctx.strokeStyle = `rgba(126,192,255,${sa})`; ctx.lineWidth = d.size*0.72;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(d.trail[0].x, d.trail[0].y);
      for (const p of d.trail) ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.fillStyle = `rgba(170,218,255,${sa+0.20})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.size*0.78, 0, Math.PI*2); ctx.fill();
    }
  }
  ctx.restore();
}
function drawWsSheets() {
  ctx.save();
  for (const s of g.wsSheets) {
    const wL = canvas.width*0.07, wR = canvas.width*0.93;
    const gr = ctx.createLinearGradient(0, s.y-2, 0, s.y+s.h+2);
    gr.addColorStop(0,   'rgba(126,192,255,0)');
    gr.addColorStop(0.5, `rgba(126,192,255,${s.alpha})`);
    gr.addColorStop(1,   'rgba(126,192,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(wL, s.y-2, wR-wL, s.h+4);
  }
  ctx.restore();
}

// ─── Draw: Wipers ─────────────────────────────────────────────────────────────
// Pivots sit just below the glass bottom (hidden behind dashboard).
// Arms sweep from behind the A-pillars across to past centre, covering
// the full windshield width.
function drawWipers() {
  const W = canvas.width, H = canvas.height;
  const pivY  = botY() + H  * 0.020;   // slightly below glass edge
  const len   = W * 0.44;              // long enough to reach centre
  drawOneWiper(W * 0.14, pivY, len,  g.wiperA);
  drawOneWiper(W * 0.86, pivY, len, -g.wiperA);
}
function drawOneWiper(px, py, len, angle) {
  const sin = Math.sin(angle), cos = Math.cos(angle);
  // Arm connector (short, thin metal)
  const ax = px + sin * len * 0.08, ay = py - cos * len * 0.08;
  // Blade tip
  const ex = px + sin * len,        ey = py - cos * len;

  ctx.save();
  ctx.lineCap = 'round';

  // Metal arm
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ax, ay); ctx.stroke();

  // Rubber blade — dark body + reflective highlight so it's visible on dark glass
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#303030';
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke();

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(150, 185, 220, 0.65)';
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke();

  ctx.restore();
}

// ─── Draw: Windshield frame & dashboard ──────────────────────────────────────
// Thicker A-pillars + rearview mirror = closer, more enclosed driver POV
function drawWindshieldFrame() {
  const W = canvas.width, H = canvas.height, by = botY();
  // Top header bar (ceiling)
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H * 0.065);
  // Left A-pillar (wider at top → feels like you're sitting inside)
  ctx.fillStyle = '#0b0b0b';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W*0.17, H*0.065);
  ctx.lineTo(W*0.068, by);
  ctx.lineTo(0, by);
  ctx.closePath(); ctx.fill();
  // Right A-pillar
  ctx.beginPath();
  ctx.moveTo(W, 0);
  ctx.lineTo(W*0.83, H*0.065);
  ctx.lineTo(W*0.932, by);
  ctx.lineTo(W, by);
  ctx.closePath(); ctx.fill();
  // Subtle A-pillar sheen (painted metal highlight)
  ctx.fillStyle = 'rgba(60,60,60,0.28)';
  ctx.beginPath();
  ctx.moveTo(W*0.14, H*0.065);
  ctx.lineTo(W*0.17, H*0.065);
  ctx.lineTo(W*0.068, by);
  ctx.lineTo(W*0.058, by);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(W*0.86, H*0.065);
  ctx.lineTo(W*0.83, H*0.065);
  ctx.lineTo(W*0.932, by);
  ctx.lineTo(W*0.942, by);
  ctx.closePath(); ctx.fill();
  // ── Rearview mirror (center top) ──────────────────────────────────────────
  const mirW = W * 0.082, mirH = H * 0.028;
  const mirX = W / 2,     mirY = H * 0.076;
  // Bracket
  ctx.fillStyle = '#181818';
  ctx.fillRect(mirX - W*0.004, H*0.042, W*0.008, mirY - H*0.042);
  // Mirror housing
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(mirX - mirW/2, mirY - mirH/2, mirW, mirH);
  // Mirror glass (dark blue-grey tint)
  ctx.fillStyle = 'rgba(75,95,130,0.35)';
  ctx.fillRect(mirX - mirW/2 + 2, mirY - mirH/2 + 2, mirW - 4, mirH - 4);
  // Vignette around windshield edges
  const vig = ctx.createRadialGradient(W/2, H*0.48, H*0.16, W/2, H*0.48, H*0.70);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, by);
}
function drawDashboard() {
  const W = canvas.width, H = canvas.height, top = botY();
  // Hood shadow fade just below glass
  const hood = ctx.createLinearGradient(0, top - H*0.05, 0, top);
  hood.addColorStop(0, 'rgba(8,8,8,0)'); hood.addColorStop(1, 'rgba(8,8,8,0.60)');
  ctx.fillStyle = hood; ctx.fillRect(0, top - H*0.05, W, H*0.05);
  // Dashboard surface
  const dash = ctx.createLinearGradient(0, top, 0, H);
  dash.addColorStop(0, '#1c1c1c'); dash.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = dash; ctx.fillRect(0, top, W, H - top);
  // Steering wheel
  const sx = W/2, sy = H*0.97, sr = W*0.072;
  ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = W*0.014;
  ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = '#1e1e1e';
  ctx.beginPath(); ctx.arc(sx, sy, sr*0.14, 0, Math.PI*2); ctx.fill();
  ctx.lineCap = 'round'; ctx.lineWidth = W*0.009;
  for (let i = 0; i < 3; i++) {
    const a = (i/3)*Math.PI*2 - Math.PI/2; ctx.strokeStyle = '#252525';
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(a)*sr*0.14, sy + Math.sin(a)*sr*0.14);
    ctx.lineTo(sx + Math.cos(a)*sr*0.88, sy + Math.sin(a)*sr*0.88);
    ctx.stroke();
  }
  // Speedometer cluster (left of steering wheel)
  const kmph = Math.round((80 + g.speed*38) * g.throttle);
  const spX = W*0.28, spY = sy - sr*0.2, spR = W*0.042;
  ctx.strokeStyle = '#252525'; ctx.lineWidth = W*0.010;
  ctx.beginPath(); ctx.arc(spX, spY, spR, 0, Math.PI*2); ctx.stroke();
  // Needle
  const needleAngle = -Math.PI*0.75 + (Math.min(kmph, 220)/220) * Math.PI*1.5;
  ctx.strokeStyle = '#dd4422'; ctx.lineWidth = W*0.005;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(spX, spY);
  ctx.lineTo(spX + Math.cos(needleAngle)*spR*0.76, spY + Math.sin(needleAngle)*spR*0.76);
  ctx.stroke();
  ctx.fillStyle = '#202020';
  ctx.beginPath(); ctx.arc(spX, spY, spR*0.12, 0, Math.PI*2); ctx.fill();
}

function drawRainHaze() {
  const a = Math.min(0.30, (g.rainIntensity-1.0)*0.10);
  if (a <= 0) return;
  ctx.fillStyle = `rgba(8,18,32,${a})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height * ROAD_BOTTOM);
}

// ─── Draw: Blinker indicator (方向燈) ─────────────────────────────────────────
function drawBlinker() {
  if (g.blinkerDir === 0) return;
  const W = canvas.width, H = canvas.height;
  const isLeft = g.blinkerDir === -1;

  // ── HUD 大箭頭 (上方顯示) ──────────────────────────────────────────────────
  ctx.save();
  const litAlpha  = g.blinkerOn ? 0.96 : 0.18;
  const sz   = W * 0.034;
  const ay   = H * 0.108;
  const ax1  = isLeft ? W * 0.300 : W * 0.700;
  const ax2  = isLeft ? W * 0.340 : W * 0.660;

  function arrowTri(ax, flip) {
    ctx.beginPath();
    if (flip) {
      ctx.moveTo(ax - sz,  ay);
      ctx.lineTo(ax,       ay - sz * 0.56);
      ctx.lineTo(ax,       ay + sz * 0.56);
    } else {
      ctx.moveTo(ax + sz,  ay);
      ctx.lineTo(ax,       ay - sz * 0.56);
      ctx.lineTo(ax,       ay + sz * 0.56);
    }
    ctx.closePath();
  }
  // 前箭頭 (全亮)
  ctx.globalAlpha = litAlpha;
  ctx.fillStyle = '#f5a520';
  if (g.blinkerOn) { ctx.shadowColor = '#f5a520'; ctx.shadowBlur = sz * 1.4; }
  arrowTri(ax1, isLeft); ctx.fill();
  ctx.shadowBlur = 0;
  // 後箭頭 (半透)
  ctx.globalAlpha = litAlpha * 0.55;
  arrowTri(ax2, isLeft); ctx.fill();
  ctx.restore();

  // ── Dashboard 小指示燈 ─────────────────────────────────────────────────────
  const dashTop = botY();
  const dashY   = dashTop + (H - dashTop) * 0.18;
  const dashX   = isLeft ? W * 0.42 : W * 0.58;
  const ds      = W * 0.016;
  ctx.save();
  ctx.globalAlpha = g.blinkerOn ? 0.92 : 0.14;
  ctx.fillStyle = '#f5a520';
  if (g.blinkerOn) { ctx.shadowColor = '#f5a520'; ctx.shadowBlur = 10; }
  ctx.beginPath();
  if (isLeft) {
    ctx.moveTo(dashX - ds, dashY);
    ctx.lineTo(dashX,      dashY - ds * 0.56);
    ctx.lineTo(dashX,      dashY + ds * 0.56);
  } else {
    ctx.moveTo(dashX + ds, dashY);
    ctx.lineTo(dashX,      dashY - ds * 0.56);
    ctx.lineTo(dashX,      dashY + ds * 0.56);
  }
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ─── Draw: HUD ───────────────────────────────────────────────────────────────
function drawHUD() {
  const W = canvas.width, H = canvas.height;
  ctx.save();
  ctx.font = `bold ${Math.round(W*0.028)}px 'Courier New',monospace`;
  ctx.fillStyle = 'rgba(152,208,255,0.88)'; ctx.textAlign = 'left';
  ctx.fillText(`▶ ${g.score} m`, W*0.085, H*0.105);
  const kph = Math.round((80 + g.speed*38) * g.throttle);
  ctx.font = `bold ${Math.round(W*0.036)}px 'Courier New',monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.textAlign = 'right';
  ctx.fillText(`${kph} km/h`, W*0.915, H*0.105);
  if (tiltEnabled && Math.abs(tiltX) > 0.06) {
    ctx.font = `${Math.round(W*0.020)}px 'Courier New',monospace`;
    ctx.fillStyle = 'rgba(175,220,255,0.55)'; ctx.textAlign = 'center';
    ctx.fillText(tiltX > 0 ? '→ 傾斜' : '傾斜 ←', W*0.5, H*0.105);
  }
  const tv = document.getElementById('throttleVal');
  if (tv) tv.textContent = g.throttle.toFixed(1) + '×';
  ctx.restore();
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSky();
  drawRainLayer(g.rainFar,  '#6a9cba', 0.5, 2.2);
  drawRainCurtains();
  drawRoad();
  drawRainLayer(g.rainMid,  '#9cc8e2', 1.0, 2.2);
  drawCars();
  drawRainLayer(g.rainNear, '#c4def0', 1.6, 2.2);
  drawRainHaze();
  drawLightning();
  drawWindshieldDrops();
  drawWsSheets();
  drawWipers();
  drawWindshieldFrame();
  drawDashboard();
  drawBlinker();
  drawHUD();
}

// ─── Game loop ────────────────────────────────────────────────────────────────
function loop(ts) {
  if (!running) return;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt); render();
  requestAnimationFrame(loop);
}

function startGame() {
  document.getElementById('gameOverScreen').classList.add('hidden');
  document.getElementById('leftControls').classList.remove('hidden');
  document.getElementById('rightControls').classList.remove('hidden');
  if (screen.orientation?.lock) screen.orientation.lock('landscape').catch(() => {});
  initGame();
  running = true; lastTime = performance.now();
  requestAnimationFrame(loop);
}
function showGameOver() {
  running = false;
  document.getElementById('leftControls').classList.add('hidden');
  document.getElementById('rightControls').classList.add('hidden');
  if (g.score > bestScore) bestScore = g.score;
  document.getElementById('finalScore').textContent = `本次距離：${g.score} 公尺`;
  document.getElementById('bestScore').textContent  = `最佳紀錄：${bestScore} 公尺`;
  document.getElementById('gameOverScreen').classList.remove('hidden');
}

// ─── Input ── FIX: preventDefault on arrow keys so browser doesn't scroll ───
window.addEventListener('keydown', e => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))
    e.preventDefault();
  if (g?.keys) g.keys[e.key] = true;
  if ((e.key === 'Enter' || e.key === ' ') &&
      !document.getElementById('gameOverScreen').classList.contains('hidden'))
    startGame();
});
window.addEventListener('keyup', e => { if (g?.keys) g.keys[e.key] = false; });

// ─── Side button bindings ─────────────────────────────────────────────────────
function bindSideBtn(id, keyName) {
  const btn = document.getElementById(id);
  if (!btn) return;
  const press = e => {
    e.preventDefault(); e.stopPropagation();
    if (g?.keys) g.keys[keyName] = true;
    btn.classList.add('pressing');
  };
  const release = e => {
    e.stopPropagation();
    if (g?.keys) g.keys[keyName] = false;
    btn.classList.remove('pressing');
  };
  ['mousedown','touchstart'].forEach(evt => btn.addEventListener(evt, press,   { passive: false }));
  ['mouseup','mouseleave','touchend','touchcancel'].forEach(evt => btn.addEventListener(evt, release));
}
bindSideBtn('btnBrake',     'speedDown');
bindSideBtn('btnLeft',      'touchLeft');
bindSideBtn('btnWiperSlow', 'wiperDown');
bindSideBtn('btnAccel',     'speedUp');
bindSideBtn('btnRight',     'touchRight');
bindSideBtn('btnWiperFast', 'wiperUp');

document.getElementById('startBtn').addEventListener('click', async () => {
  document.getElementById('startScreen').classList.add('hidden');
  initAudio();
  await requestTiltPermission();
  startGame();
});
document.getElementById('restartBtn').addEventListener('click', () => {
  initAudio();
  startGame();
});
