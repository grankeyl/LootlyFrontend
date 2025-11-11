<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { gsap } from "gsap";
import { cutNumber } from "../../../../utils/useTon";

// Images
import GameBgSymbolsImage from "@/assets/images/crash-pg/game-bg-symbols.png";
import RocketImage from "@/assets/images/crash-pg/rocket.png";
import Lottie from "../../../../components/Lottie.vue";

type Stage = 'loading' | 'prepare' | 'playing' | 'completed';

const emit = defineEmits<{
  (e:'SetGameX', payload: number): void
}>();
const props = defineProps<{ 
  GameStatus: string,
  GameBettingEtaMs: number,
  GameX: number,
  GameOnline: number,
}>();

const gameStage = ref<Stage>(props.GameStatus as Stage);
const gamePrepareTime = ref(props.GameBettingEtaMs || 7);
const gamePrepareTimeInterval = ref<number | null>(null);

const realX = ref(1);
const gamePlayingX = ref(1);

type PathMode = 'expo' | 'bezier' | 'noisy';
const PATH_MODE: PathMode = 'expo';

const fillPathRef = ref<SVGPathElement|null>(null);
const pathD = ref<string>('');

let lineTween: gsap.core.Timeline | null = null;
let lastTweenTarget = 1;
let playingTween: gsap.core.Tween | null = null;
let displayObj = { v: 1 };
const crashAt = ref(0);
const lastTS = ref(0);
let tickerAdded = false;

// refs
const windWrapRef = ref<HTMLDivElement|null>(null);
// состояние ветра
let windTickerAdded = false;
let windAcc = 0; // накопленный путь в px
// базовые параметры
const WIND_BASE_PX_S = 110;    // базовая скорость (px/сек)
const WIND_FACTOR_MAX = 6;     // ограничим рост скорости
const WIND_IDLE_FACTOR = 0.6;  // во время prepare ветер слабее
let windTick: (() => void) | null = null;

const valueRef = ref<HTMLParagraphElement | null>(null);

/* ===== Линия (SVG) через MASK ===== */
const stageRef    = ref<HTMLDivElement | null>(null);
const svgRef      = ref<SVGSVGElement | null>(null);
const pathRef     = ref<SVGPathElement | null>(null);
const maskRectRef = ref<SVGRectElement | null>(null);

// сверху рядом с остальными refs
const rocketRef = ref<HTMLDivElement|null>(null);
const rocketImgRef = ref<HTMLImageElement|null>(null);
const flameRef = ref<HTMLDivElement|null>(null);
let pathLen = 0;
// flame jitter tween
let flameJitterTw: gsap.core.Tween | null = null;

// подгони под свой спрайт
const ROCKET_W = 123;
const ROCKET_H = 123;
const NOSE_OFFSET = 0; // если нужно сместить нос чуть вперёд

const GROWTH_PER_SEC = 0.08;
const MAX_DT = 0.12;

const boomRef = ref<HTMLDivElement|null>(null);

let flameTl: gsap.core.Timeline | null = null;
let swayTl: gsap.core.Timeline | null = null;

function startFlame() {
  if (flameTl) { flameTl.kill(); flameTl = null; }
  if (swayTl)  { swayTl.kill();  swayTl  = null; }

  const flameEl = rocketRef.value?.querySelector('.flame') as HTMLElement | null;
  const innerEl = rocketRef.value?.querySelector('.rocket-inner') as HTMLElement | null;

  if (flameEl) {
    flameTl = gsap.timeline({ repeat: -1 });
    flameTl
      .to(flameEl, { scaleY: 1.35, scaleX: 1.08, opacity: 1, duration: 0.09, ease: "power1.inOut" })
      .to(flameEl, { scaleY: 0.85, scaleX: 0.95, opacity: 0.75, duration: 0.10, ease: "power1.inOut" })
      .to(flameEl, { scaleY: 1.20, scaleX: 1.02, opacity: 0.9,  duration: 0.08, ease: "power1.inOut" });

    if (flameJitterTw) { flameJitterTw.kill(); flameJitterTw = null; }
    flameJitterTw = gsap.to(flameEl, {
      duration: 0.2, repeat: -1, yoyo: true, ease: "sine.inOut",
      onUpdate() {
        const rx = 1 + (Math.random() - 0.5) * 0.06;
        const ry = 1 + (Math.random() - 0.5) * 0.10;
        flameEl.style.transform = `translateX(-50%) scale(${rx}, ${ry})`;
      }
    });
  }

  if (innerEl) {
    // микро-качка корпуса (не конфликтует с поворотом траектории, т.к. это дочерний слой)
    swayTl = gsap.timeline({ repeat: -1, yoyo: true });
    swayTl
      .to(innerEl, { rotation: 2, scale: 1,  y: -1.5, duration: 0.45, ease: "sine.inOut" })
      .to(innerEl, { rotation: -2, scale: 1.1, y:  1.5, duration: 0.45, ease: "sine.inOut" });
  }
}

function startPrepare() {
  gamePrepareTime.value = props.GameBettingEtaMs || 7;

  if (gamePrepareTimeInterval.value) window.clearInterval(gamePrepareTimeInterval.value);
  gamePrepareTimeInterval.value = window.setInterval(() => {
    if (gamePrepareTime.value <= 0) {
      window.clearInterval(gamePrepareTimeInterval.value!);
      gamePrepareTimeInterval.value = null;
      // startPlaying();
      return;
    }
    gamePrepareTime.value--;
  }, 1000);
}

function runLineReveal(duration = 2) {
  const w = svgRef.value!.clientWidth || 320;
  if (!maskRectRef.value) return;
  if (lineTween) { lineTween.kill(); lineTween = null; }

  gsap.set(maskRectRef.value, { attr: { width: 0 } });

  const common = {
    onUpdate: () => { placeRocketByMaskWidth(); placeHeadFXByMaskWidth?.(); }
  } as const;

  lineTween = gsap.timeline()
    .to(
      maskRectRef.value,
      { attr: { width: w }, ease: "power2.out", duration: duration * 0.45, ...common }
    );
}

async function startPlaying() {
  gameStage.value = props.GameStatus as Stage;
  realX.value = 1; gamePlayingX.value = 1; displayObj.v = 1; lastTweenTarget = 1;
  if (playingTween) { playingTween.kill(); playingTween = null; }
  crashAt.value = 10000;
  lastTS.value = performance.now();

  await nextTick();
  if (rocketImgRef.value) gsap.set(rocketImgRef.value, { opacity: 1 });
  if (flameRef.value) {
    gsap.set(flameRef.value, { opacity: 1 });
    gsap.killTweensOf(flameRef.value);
  }

  buildPath();
  runLineReveal();
  startFlame();
  startWobble();
  startWind();

  if (!tickerAdded) {
    gsap.ticker.add(onTick);
    tickerAdded = true;
  }
}

function pulseValue() {
  if (!valueRef.value) return;
  gsap.fromTo(valueRef.value, { scale: 1 }, { scale: 1.07, duration: 0.24, ease: "power1.out", yoyo: true, repeat: 1 });
}

function onTick() {
  if (gameStage.value !== 'playing') return;
  const now = performance.now(); const dt = Math.min((now - lastTS.value) / 1000, MAX_DT); lastTS.value = now;
  const next = realX.value * Math.exp(GROWTH_PER_SEC * dt);
  realX.value = Math.min(next, crashAt.value);
}

function placeRocketByMaskWidth() {
  if (!svgRef.value || !maskRectRef.value || !pathRef.value || !rocketRef.value) return;
  const w = svgRef.value.clientWidth || Number(svgRef.value.getAttribute('width')) || 320;
  const maskW = parseFloat(maskRectRef.value.getAttribute('width') || '0');
  const x = Math.max(0, Math.min(w, maskW));

  const { p, angle } = getPointAtX(x + NOSE_OFFSET);
  const deg = (angle * 180) / Math.PI;

  // центрируем див ракеты относительно её центра
  rocketRef.value.style.transform =
    `translate(${p.x - ROCKET_W/2}px, ${p.y - ROCKET_H/2}px) rotate(${deg}deg)`;
}

function buildPath() {
  if (!stageRef.value || !svgRef.value || !pathRef.value) return;

  const w = Math.max(200, stageRef.value.clientWidth || 320);
  const h = Math.max(200, stageRef.value.clientHeight || 240);
  svgRef.value.setAttribute("viewBox", `0 0 ${w} ${h}`);

  let d = '';

  if (PATH_MODE === 'expo') {
    // экспонента вверх: вначале полого, к концу резко
    const samples = Math.max(160, Math.floor(w * 0.8));
    const k = 2.2; // крутизна
    const norm = Math.expm1(k); // e^k - 1
    d = `M 0 ${h}`;
    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const yNorm = Math.expm1(k * (1 - t)) / norm; // 1..0
      const x = t * w;
      const y = yNorm * h;
      d += ` L ${x} ${y}`;
    }
  }

  if (PATH_MODE === 'bezier') {
    // одна элегантная кубическая кривая Безье
    const x0 = 0,   y0 = h;
    const x1 = w*0.25, y1 = h*0.65;
    const x2 = w*0.60, y2 = h*0.25;
    const x3 = w,   y3 = 0;
    d = `M ${x0} ${y0} C ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`;
  }

  if (PATH_MODE === 'noisy') {
    // “живая” линия: базовая ease + лёгкие синус-пульсации (без рваных краёв)
    const samples = Math.max(220, Math.floor(w * 1.1));
    d = `M 0 ${h}`;
    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const base = 1 - t*t*t; // cubic-out
      const wiggle = Math.sin(t * Math.PI * 2.2) * (1 - t) * 0.08; // затухает к концу
      const x = t * w;
      const y = Math.max(0, Math.min(h, (base + wiggle) * h));
      d += ` L ${x} ${y}`;
    }
  }

  pathRef.value!.setAttribute("d", d);
  pathD.value = `${d} L ${w} ${h} L 0 ${h} Z`; // замыкаем вниз, чтобы фон заполнил под линией
  pathLen = pathRef.value!.getTotalLength();

  placeRocketByMaskWidth();
  placeHeadFXByMaskWidth?.();
}

const headRef = ref<SVGCircleElement|null>(null);

// позиция блика повторяет кончик (как у ракеты)
function placeHeadFXByMaskWidth() {
  if (!svgRef.value || !maskRectRef.value || !pathRef.value || !headRef.value) return;
  const w = svgRef.value.clientWidth || Number(svgRef.value.getAttribute('width')) || 320;
  const maskW = parseFloat(maskRectRef.value.getAttribute('width') || '0');
  const x = Math.max(0, Math.min(w, maskW));
  const { p } = getPointAtX(x + NOSE_OFFSET);
  headRef.value.setAttribute('cx', String(p.x));
  headRef.value.setAttribute('cy', String(p.y));
}

function getPointAtX(xTarget: number) {
  const path = pathRef.value!;
  let lo = 0, hi = pathLen, i = 0;
  while (i++ < 30) {                      // достаточно точно
    const mid = (lo + hi) / 2;
    const p = path.getPointAtLength(mid);
    if (p.x < xTarget) lo = mid; else hi = mid;
  }
  const p1 = path.getPointAtLength(lo);
  const p2 = path.getPointAtLength(Math.min(lo + 0.5, pathLen)); // для угла
  return { p: p1, angle: Math.atan2(p2.y - p1.y, p2.x - p1.x) };
}

const wobbleRef = ref<HTMLDivElement|null>(null);
let wobbleTickerAdded = false;

function n(t: number, f = 1, p = 0) {
  // мягкий квазинойс из нескольких синусов
  return Math.sin(t*f + p) * 0.5 + Math.sin(t*1.7*f + p*1.3) * 0.3 + Math.sin(t*2.3*f + p*2.1) * 0.2;
}

function startWobble() {
  if (wobbleTickerAdded) return;
  wobbleTickerAdded = true;
  const t0 = performance.now();
  gsap.ticker.add(wobbleTick);
  function wobbleTick() {
    if (!wobbleRef.value) return;
    if (gameStage.value === 'prepare') { gsap.set(wobbleRef.value, { x:0, y:0, rotation:0, skewX:0, skewY:0, scale:1 }); return; }

    const t = (performance.now() - t0) / 1000;

    const ax = 13;    // px по X
    const ay = 9;    // px по Y
    const aR = 1.2;  // deg поворот
    const aK = 0.4;  // deg лёгкий skew
    const aS = 0.016;// масштаб дыхания

    const x = n(t, 0.55, 0.4) * ax;
    const y = n(t, 0.7,  1.1) * ay;
    const r = n(t, 0.38, 2.0) * aR;
    const kx = n(t, 0.9,  0.2) * aK;
    const ky = n(t, 0.72, 1.6) * aK;
    const s = 1 + n(t, 0.33, 0.8) * aS;

    gsap.set(wobbleRef.value, { x, y, rotation: r, skewX: kx, skewY: ky, scale: s, transformOrigin: "50% 100%" });
  }
}

onMounted(() => startPrepare());

onBeforeUnmount(() => {
  if (gamePrepareTimeInterval.value) window.clearInterval(gamePrepareTimeInterval.value);
  if (tickerAdded) gsap.ticker.remove(onTick);
  if (lineTween) { lineTween.kill(); lineTween = null; }
  if (flameTl) { flameTl.kill(); flameTl = null; }
  if (swayTl)  { swayTl.kill();  swayTl  = null; }
  if (wobbleTickerAdded) { gsap.ticker.remove((gsap.ticker as any)._listeners.at(-1)); } // защитно
  stopWind();
  if (flameJitterTw) { flameJitterTw.kill(); flameJitterTw = null; }
  gsap.killTweensOf(flameRef.value);
  window.removeEventListener("resize", buildPath);
});

function currentWindSpeed(): number {
  const x = Math.max(1, gamePlayingX.value);
  const factor = Math.min(1 + 0.75 * Math.log2(x), WIND_FACTOR_MAX);
  const stageK = (gameStage.value === 'prepare') ? WIND_IDLE_FACTOR : 1;
  return WIND_BASE_PX_S * factor * stageK;
}

function startWind() {
  if (windTickerAdded) return;
  windTickerAdded = true;
  let last = performance.now();

  windTick = () => {
    const wrap = windWrapRef.value;
    if (!wrap) return;

    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;

    const oneTileW = wrap.scrollWidth / 2 || 313;
    windAcc = (windAcc + currentWindSpeed() * dt) % oneTileW;

    const x = -oneTileW + windAcc;
    gsap.set(wrap, { x });
  };
  gsap.ticker.add(windTick);
}

function stopWind() {
  if (!windTickerAdded) return;
  windTickerAdded = false;

  if (windTick) {
    gsap.ticker.remove(windTick);
    windTick = null;
  }

  if (windWrapRef.value) {
    windWrapRef.value.style.opacity = '0';
    gsap.set(windWrapRef.value, { x: 0 });
  }
}

function crashNow() {
  // if (gameStage.value !== 'playing') return;
  if (playingTween) { playingTween.kill(); playingTween = null; }
  gsap.killTweensOf(displayObj);
  stopWind();
  if (svgRef.value) gsap.fromTo(svgRef.value, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "back.out(2)" });
  if (valueRef.value) gsap.fromTo(valueRef.value, { scale: 1 }, { scale: 1.47, duration: 0.24, ease: "power1.out", yoyo: true, repeat: 1 });
  if (flameTl) { flameTl.kill(); flameTl = null; }
  if (flameJitterTw) { flameJitterTw.kill(); flameJitterTw = null; }
  if (flameRef.value) {
    gsap.killTweensOf(flameRef.value);
    gsap.to(flameRef.value, { opacity: 0, duration: 0.3, ease: "power1.out" });
  }
  if (rocketImgRef.value) {
    gsap.to(rocketImgRef.value, { opacity: 0, duration: 0.3, ease: "power1.out" });
  }
  // emit('SetGameX', 0);
  window.setTimeout(() => startPrepare(), 2500);
}

watch(() => gameStage.value, (v) => {
  if (v === 'prepare' && wobbleRef.value) {
    gsap.to(wobbleRef.value, { x:0, y:0, rotation:0, skewX:0, skewY:0, scale:1, duration:0.3, ease:"sine.out" });
  }
  if (v === 'playing' && windWrapRef.value) {
    windAcc += 30;
  }
});

onMounted(() => {
  if (props.GameStatus === 'prepare') { startPrepare(); }
  if (props.GameStatus === 'playing') { startPlaying(); }
  if (props.GameStatus === 'completed') { 
    crashNow(); 
  }
});

watch(() => props.GameStatus, (v) => {
  gameStage.value = v as Stage;
  if (v === 'prepare') { startPrepare(); }
  if (v === 'playing') { startPlaying(); }
  if (v === 'completed') { 
    crashNow();
  }
});

watch(() => props.GameX, (v) => {
  pulseValue();
  gamePlayingX.value = v;
});

// рядом с другими refs
const timerDigitRef = ref<HTMLSpanElement|null>(null);

// ...ниже, после startPrepare() или в конце script:
watch(gamePrepareTime, () => {
  if (!timerDigitRef.value) return;
  // короткий «вылет» с сильным зумом и блюром
  gsap.fromTo(
    timerDigitRef.value,
    { scale: 2.8, y: 6, opacity: 0, filter: "blur(20px)" },
    { scale: 1,   y: 0, opacity: 1, filter: "blur(0px)", duration: 0.58, ease: "back.out(2)" }
  );
});

// первый показ — тоже анимнём
onMounted(() => {
  if (timerDigitRef.value) {
    gsap.fromTo(
      timerDigitRef.value,
      { scale: 2.8, y: 6, opacity: 0, filter: "blur(20px)" },
      { scale: 1,   y: 0, opacity: 1, filter: "blur(0px)", duration: 0.58, ease: "back.out(2)" }
    );
  }
});
</script>

<template>
  <div class="game" :class="{ completed: gameStage === 'completed' }">
    <div class="game-bg-symbols" :class="{ active: gameStage !== 'prepare' }">
      <img :src="GameBgSymbolsImage" alt="bg" />
    </div>

    <div class="game-online">
      <h4>{{ props.GameOnline }} players</h4>
      <span class="online-dot" aria-hidden="true"></span>
    </div>

    <div v-if="gameStage === 'loading'" class="game-loading">
      <div class="spinner" role="status" aria-label="Loading"></div>
    </div>

    <div v-if="gameStage === 'prepare'" class="game-prepare">
      <div class="title">
        <span ref="timerDigitRef">{{ gamePrepareTime }}</span>
      </div>
    </div>

    <div v-if="gameStage === 'playing' || gameStage === 'completed'" class="game-game">
      <div class="game-value" ref="valueRef" :class="{ completed: gameStage === 'completed' }">
        <p>{{ cutNumber(gamePlayingX) }}</p>
        <span>x</span>
      </div>
      <div class="game-weerh">
        <div class="wind-viewport">
          <div class="wind-wrap" ref="windWrapRef">
            <svg 
              v-for="n in 2" 
              :key="'w'+n" 
              class="wind-svg"
              width="313"
              height="132"
              viewBox="0 0 313 132"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g style="mix-blend-mode:screen">
                <rect x="222" y="106" width="91" height="4" rx="2" fill="url(#paint0)" />
              </g>
              <g style="mix-blend-mode:screen">
                <rect y="78" width="91" height="4" rx="2" fill="url(#paint1)" />
              </g>
              <g style="mix-blend-mode:screen">
                <rect x="158" y="62" width="61" height="4" rx="2" fill="url(#paint2)" />
              </g>
              <g style="mix-blend-mode:screen">
                <rect x="175" width="93" height="4" rx="2" fill="url(#paint3)" />
              </g>
              <g style="mix-blend-mode:screen">
                <rect x="51" y="29" width="121" height="4" rx="2" fill="url(#paint4)" />
              </g>
              <g style="mix-blend-mode:screen">
                <rect x="97" y="128" width="122" height="4" rx="2" fill="url(#paint5)" />
              </g>
              <defs>
                <linearGradient id="paint0" x1="222" y1="108" x2="313" y2="108" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#FF6FDB" stop-opacity="0" />
                  <stop offset="1" stop-color="#FF6FDB" stop-opacity="0.3" />
                </linearGradient>
                <linearGradient id="paint1" x1="0" y1="80" x2="91" y2="80" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#FF6FDB" stop-opacity="0" />
                  <stop offset="1" stop-color="#FF6FDB" stop-opacity="0.3" />
                </linearGradient>
                <linearGradient id="paint2" x1="158" y1="64" x2="219" y2="64" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#FF6FDB" stop-opacity="0" />
                  <stop offset="1" stop-color="#FF6FDB" stop-opacity="0.3" />
                </linearGradient>
                <linearGradient id="paint3" x1="175" y1="2" x2="268" y2="2" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#FF6FDB" stop-opacity="0" />
                  <stop offset="1" stop-color="#FF6FDB" stop-opacity="0.3" />
                </linearGradient>
                <linearGradient id="paint4" x1="51" y1="31" x2="172" y2="31" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#FF6FDB" stop-opacity="0" />
                  <stop offset="1" stop-color="#FF6FDB" stop-opacity="0.3" />
                </linearGradient>
                <linearGradient id="paint5" x1="97" y1="130" x2="219" y2="130" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#FF6FDB" stop-opacity="0" />
                  <stop offset="1" stop-color="#FF6FDB" stop-opacity="0.3" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
      <div class="game-stage" ref="stageRef">
        <div class="stage-wobble" ref="wobbleRef">
          <svg ref="svgRef" class="traj" preserveAspectRatio="none">
            <defs>
              <!-- Маска как у тебя -->
              <mask id="revealMask">
                <rect x="0" y="0" :width="0" height="100%" fill="#000" />
                <rect ref="maskRectRef" x="0" y="0" :width="0" height="100%" fill="#fff" />
              </mask>

              <!-- Градиент линии -->
              <linearGradient id="lineGradient" x1="0" y1="1" x2="1" y2="0" gradientUnits="objectBoundingBox">
                <stop offset="0%"  stop-color="#e837bc36"/>
                <stop offset="60%" stop-color="#e837bc72"/>
                <stop offset="100%" stop-color="#E837BB"/>
              </linearGradient>

              <!-- Свечение линии -->
              <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>

              <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#E837BB" stop-opacity="0.5"/>
                <stop offset="100%" stop-color="#A90072" stop-opacity="0"/>
              </linearGradient>
            </defs>

            <path
              ref="fillPathRef"
              :d="pathD"
              :mask="'url(#revealMask)'"
              fill="url(#fillGradient)"
              opacity="0.4"
            />

            <!-- ОДНА сплошная линия под маской -->
            <path
              ref="pathRef"
              :mask="'url(#revealMask)'"
              fill="none"
              stroke="url(#lineGradient)"
              stroke-width="3"
              stroke-linecap="round"
              filter="url(#lineGlow)"
              class="traj__path"
            />
          </svg>
          <div class="rocket" ref="rocketRef">
            <div class="rocket-inner">
              <img ref="rocketImgRef" :src="RocketImage" alt="rocket" />
              <div v-if="gameStage ==='completed' " class="boom" ref="boomRef">
                <Lottie 
                  path="/animations/boom.json"
                  :loop="true"
                  :width="140" 
                  :height="140"
                />
              </div>
              <div ref="flameRef" class="flame"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Game.scss" scoped></style>
<style scoped>
.game { position: relative; }
.game-game { position: relative; }
.game-stage {
  position: relative;
  width: 70% !important;
  max-height: 165px;
  height: 240px;
  position: absolute !important;
  bottom: 0;
  left: 0;
}
.traj {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}
.traj__path {
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.35));
  shape-rendering: geometricPrecision;
}
.game-value { position: absolute; left: 16px; top: 12px; display: flex; align-items: baseline; gap: 4px; z-index: 2; }
.game-value p { font-weight: 700; font-size: 32px; line-height: 1; }
.rocket {
  position: absolute;
  left: 0; top: 0;
  width: 123px; height: 123px;        /* под твой спрайт */
  transform-origin: 50% 50%;
  pointer-events: none;
  z-index: 2;
}
.rocket-inner {
  width: 100%; height: 100%;
  position: relative;
  transform-origin: 50% 60%;          /* центр инерции чуть ниже */
  filter: drop-shadow(0 6px 14px rgba(0,0,0,.35));
}
.rocket-inner img {
  width: 100%; height: 100%; object-fit: contain; display:block;
}
/* Пламя — градиентный эллипс с блюром, «дышит» и мерцает */
.flame {
  position: absolute;
  left: 30%; bottom: 16%;
  width: 42%; height: 42%;
  transform: translateX(-50%) scale(1, 1);
  border-radius: 50%;
  background:
    radial-gradient(50% 60% at 50% 60%,
      rgba(255, 200, 70, 0.95) 0%,
      rgba(255, 120, 30, 0.85) 40%,
      rgba(255, 60, 0, 0.65) 70%,
      rgba(255, 60, 0, 0.00) 100%);
  filter: blur(6px);
  opacity: 0.9;
  z-index: -1;
  pointer-events: none;
}
.stage-wobble {
  position: absolute;
  inset: 0;                 /* занимает всю область game-stage */
  will-change: transform;   /* плавнее */
  pointer-events: none;
}

.wind-viewport { position: absolute; inset: 0; overflow: hidden; }
.wind-wrap { display: flex; width: max-content; will-change: transform; }
.wind-svg { flex-shrink: 0; width: 313px; height: 132px; }
</style>