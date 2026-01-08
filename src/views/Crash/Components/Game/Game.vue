<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed, onUnmounted } from "vue";
import { gsap } from "gsap";
import { cutNumber } from "../../../../utils/useTon";

// Images
import GameBgSymbolsImage from "@/assets/images/crash-pg/game-bg-symbols.png";
import RocketImage from "@/assets/images/crash-pg/rocket.png";
import Lottie from "../../../../components/Lottie.vue";
import TelegramModule from "../../../../hooks/useTelegram";

type Stage = "loading" | "prepare" | "playing" | "completed";

const emit = defineEmits<{
  (e: "SetGameX", payload: number): void;
}>();
const props = defineProps<{
  GameStatus: string;
  GameBettingEtaMs: number;
  GameX: number;
  GameOnline: number;
  GameLastCrashes: any;
}>();

const gameStage = ref<Stage>(props.GameStatus as Stage);
const gamePrepareTime = ref(props.GameBettingEtaMs || 7);
const gamePrepareTimeInterval = ref<number | null>(null);

const realX = ref(1);
const gamePlayingX = ref(1);

type PathMode = "expo" | "bezier" | "noisy";
const PATH_MODE: PathMode = "expo";

const fillPathRef = ref<SVGPathElement | null>(null);
const pathD = ref<string>("");

let lineTween: gsap.core.Timeline | null = null;
let lastTweenTarget = ref(1);
let playingTween: gsap.core.Tween | null = null;
let displayObj = { v: 1 };
const crashAt = ref(0);

const windWrapRef = ref<HTMLDivElement | null>(null);
let windAcc = 0; // накопленный путь в px
const WIND_BASE_PX_S = 110; // базовая скорость (px/сек)
const WIND_FACTOR_MAX = 6;
const WIND_IDLE_FACTOR = 0.6; // во время prepare ветер слабее
let windActive = false;

const valueRef = ref<HTMLParagraphElement | null>(null);

const stageRef = ref<HTMLDivElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
const pathRef = ref<SVGPathElement | null>(null);
const maskRectRef = ref<SVGRectElement | null>(null);

const rocketRef = ref<HTMLDivElement | null>(null);
const rocketImgRef = ref<HTMLImageElement | null>(null);
const flameRef = ref<HTMLDivElement | null>(null);
let pathLen = 0;

const ROCKET_W = 123;
const ROCKET_H = 123;
const NOSE_OFFSET = 0;

const GROWTH_PER_SEC = 0.08;
const MAX_DT = 0.12;

const boomRef = ref<HTMLDivElement | null>(null);

let flameTl: gsap.core.Timeline | null = null;
let swayTl: gsap.core.Timeline | null = null;

const wobbleRef = ref<HTMLDivElement | null>(null);

const headRef = ref<SVGCircleElement | null>(null);

const mountedOnce = ref(false);
const prevStage = ref<Stage>("loading");

const timerDigitRef = ref<HTMLSpanElement | null>(null);

/* ===== Master ticker (один на всё) ===== */
let masterTickerAdded = false;
let masterTick: (() => void) | null = null;
let tickerLast = performance.now();

function n(t: number, f = 1, p = 0) {
  return (
    Math.sin(t * f + p) * 0.5 +
    Math.sin(t * 1.7 * f + p * 1.3) * 0.3 +
    Math.sin(t * 2.3 * f + p * 2.1) * 0.2
  );
}

function currentWindSpeed(): number {
  const x = Math.max(1, gamePlayingX.value);
  const factor = Math.min(1 + 0.75 * Math.log2(x), WIND_FACTOR_MAX);
  const stageK = gameStage.value === "prepare" ? WIND_IDLE_FACTOR : 1;
  return WIND_BASE_PX_S * factor * stageK;
}

function startMasterTicker() {
  if (masterTickerAdded) return;
  masterTickerAdded = true;
  tickerLast = performance.now();

  masterTick = () => {
    const now = performance.now();
    const dt = (now - tickerLast) / 1000;
    tickerLast = now;

    // рост X
    if (gameStage.value === "playing") {
      const safeDt = Math.min(dt, MAX_DT);
      const next = realX.value * Math.exp(GROWTH_PER_SEC * safeDt);
      realX.value = Math.min(next, crashAt.value);
    }

    // ветер
    if (windActive && windWrapRef.value) {
      const wrap = windWrapRef.value;
      const oneTileW = wrap.scrollWidth / 2 || 313;
      windAcc = (windAcc + currentWindSpeed() * dt) % oneTileW;
      const x = -oneTileW + windAcc;
      gsap.set(wrap, { x });
    }

    // wobble (только во время игры)
    if (wobbleRef.value && gameStage.value === "playing") {
      const t = now / 1000;

      const ax = 13;
      const ay = 9;
      const aR = 1.2;
      const aK = 0.4;
      const aS = 0.016;

      const x = n(t, 0.55, 0.4) * ax;
      const y = n(t, 0.7, 1.1) * ay;
      const r = n(t, 0.38, 2.0) * aR;
      const kx = n(t, 0.9, 0.2) * aK;
      const ky = n(t, 0.72, 1.6) * aK;
      const s = 1 + n(t, 0.33, 0.8) * aS;

      gsap.set(wobbleRef.value, {
        x,
        y,
        rotation: r,
        skewX: kx,
        skewY: ky,
        scale: s,
        transformOrigin: "50% 100%",
      });
    }
  };

  gsap.ticker.add(masterTick);
}

function stopMasterTicker() {
  if (!masterTickerAdded) return;
  masterTickerAdded = false;
  if (masterTick) {
    gsap.ticker.remove(masterTick);
    masterTick = null;
  }
}

/* ===== Flame & rocket ===== */
function startFlame() {
  if (flameTl) {
    flameTl.kill();
    flameTl = null;
  }
  if (swayTl) {
    swayTl.kill();
    swayTl = null;
  }

  const flameEl = rocketRef.value?.querySelector(".flame") as HTMLElement | null;
  const innerEl = rocketRef.value?.querySelector(
    ".rocket-inner"
  ) as HTMLElement | null;

  if (flameEl) {
    flameTl = gsap.timeline({ repeat: -1, yoyo: true });
    flameTl
      .to(flameEl, {
        scaleX: 1.06,
        scaleY: 1.15,
        duration: 0.18,
        ease: "sine.inOut",
      })
      .to(flameEl, {
        scaleX: 0.96,
        scaleY: 0.9,
        duration: 0.22,
        ease: "sine.inOut",
      });
  }

  if (innerEl) {
    swayTl = gsap.timeline({ repeat: -1, yoyo: true });
    swayTl
      .to(innerEl, {
        rotation: 2,
        scale: 1,
        y: -1.5,
        duration: 0.45,
        ease: "sine.inOut",
      })
      .to(innerEl, {
        rotation: -2,
        scale: 1.1,
        y: 1.5,
        duration: 0.45,
        ease: "sine.inOut",
      });
  }
}

/* ===== Prepare ===== */
function startPrepare() {
  gamePrepareTime.value = props.GameBettingEtaMs || 3;

  if (gamePrepareTimeInterval.value)
    window.clearInterval(gamePrepareTimeInterval.value);
  gamePrepareTimeInterval.value = window.setInterval(() => {
    if (gamePrepareTime.value <= 0) {
      window.clearInterval(gamePrepareTimeInterval.value!);
      gamePrepareTimeInterval.value = null;
      return;
    }
    gamePrepareTime.value--;
    TelegramModule.useMediumHaptic();
  }, 1000);
}

onUnmounted(() => {
  gamePrepareTimeInterval.value = null as any;
});

/* ===== Path / rocket placement ===== */
function getPointAtX(xTarget: number) {
  const path = pathRef.value!;
  let lo = 0,
    hi = pathLen,
    i = 0;
  while (i++ < 30) {
    const mid = (lo + hi) / 2;
    const p = path.getPointAtLength(mid);
    if (p.x < xTarget) lo = mid;
    else hi = mid;
  }
  const p1 = path.getPointAtLength(lo);
  const p2 = path.getPointAtLength(Math.min(lo + 0.5, pathLen));
  return { p: p1, angle: Math.atan2(p2.y - p1.y, p2.x - p1.x) };
}

function placeRocketByMaskWidth() {
  if (
    !svgRef.value ||
    !maskRectRef.value ||
    !pathRef.value ||
    !rocketRef.value
  )
    return;
  const w =
    svgRef.value.clientWidth ||
    Number(svgRef.value.getAttribute("width")) ||
    320;
  const maskW = parseFloat(maskRectRef.value.getAttribute("width") || "0");
  const x = Math.max(0, Math.min(w, maskW));

  const { p, angle } = getPointAtX(x + NOSE_OFFSET);
  const deg = (angle * 180) / Math.PI;

  rocketRef.value.style.transform = `translate(${
    p.x - ROCKET_W / 2
  }px, ${p.y - ROCKET_H / 2}px) rotate(${deg}deg)`;
}

function placeHeadFXByMaskWidth() {
  if (!svgRef.value || !maskRectRef.value || !pathRef.value || !headRef.value)
    return;
  const w =
    svgRef.value.clientWidth ||
    Number(svgRef.value.getAttribute("width")) ||
    320;
  const maskW = parseFloat(maskRectRef.value.getAttribute("width") || "0");
  const x = Math.max(0, Math.min(w, maskW));
  const { p } = getPointAtX(x + NOSE_OFFSET);
  headRef.value.setAttribute("cx", String(p.x));
  headRef.value.setAttribute("cy", String(p.y));
}

function buildPath() {
  if (!stageRef.value || !svgRef.value || !pathRef.value) return;

  const w = Math.max(200, stageRef.value.clientWidth || 320);
  const h = Math.max(200, stageRef.value.clientHeight || 240);
  svgRef.value.setAttribute("viewBox", `0 0 ${w} ${h}`);

  let d = "";

  if (PATH_MODE === "expo") {
    const samples = Math.max(160, Math.floor(w * 0.8));
    const k = 2.2;
    const norm = Math.expm1(k);
    d = `M 0 ${h}`;
    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const yNorm = Math.expm1(k * (1 - t)) / norm; // 1..0
      const x = t * w;
      const y = yNorm * h;
      d += ` L ${x} ${y}`;
    }
  }

  if (PATH_MODE === "bezier") {
    const x0 = 0,
      y0 = h;
    const x1 = w * 0.25,
      y1 = h * 0.65;
    const x2 = w * 0.6,
      y2 = h * 0.25;
    const x3 = w,
      y3 = 0;
    d = `M ${x0} ${y0} C ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`;
  }

  if (PATH_MODE === "noisy") {
    const samples = Math.max(220, Math.floor(w * 1.1));
    d = `M 0 ${h}`;
    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const base = 1 - t * t * t;
      const wiggle = Math.sin(t * Math.PI * 2.2) * (1 - t) * 0.08;
      const x = t * w;
      const y = Math.max(0, Math.min(h, (base + wiggle) * h));
      d += ` L ${x} ${y}`;
    }
  }

  pathRef.value!.setAttribute("d", d);
  pathD.value = `${d} L ${w} ${h} L 0 ${h} Z`;
  pathLen = pathRef.value!.getTotalLength();

  placeRocketByMaskWidth();
  placeHeadFXByMaskWidth();
}

/* ===== Wind ===== */
function startWind() {
  windActive = true;
  if (windWrapRef.value) {
    windWrapRef.value.style.opacity = "1";
  }
}

function stopWind() {
  windActive = false;

  if (windWrapRef.value) {
    windWrapRef.value.style.opacity = "0";
    gsap.set(windWrapRef.value, { x: 0 });
  }
}

/* ===== Line reveal ===== */
function runLineReveal(duration = 2) {
  const w = svgRef.value!.clientWidth || 320;
  if (!maskRectRef.value) return;
  if (lineTween) {
    lineTween.kill();
    lineTween = null;
  }

  gsap.set(maskRectRef.value, { attr: { width: 0 } });

  const common = {
    onUpdate: () => {
      placeRocketByMaskWidth();
      placeHeadFXByMaskWidth();
    },
  } as const;

  lineTween = gsap
    .timeline()
    .to(maskRectRef.value, {
      attr: { width: w },
      ease: "power2.out",
      duration: duration * 0.45,
      ...common,
    });
}

/* ===== Game flow ===== */
const lastCrashes = computed(() => {
  if (!props.GameLastCrashes) return [];
  return [...props.GameLastCrashes].slice(-12).reverse();
});

function startPlaying() {
  gameStage.value = props.GameStatus as Stage;
  realX.value = 1;
  gamePlayingX.value = 1;
  displayObj.v = 1;
  lastTweenTarget.value = 1;
  if (playingTween) {
    playingTween.kill();
    playingTween = null;
  }
  crashAt.value = 10000;

  nextTick().then(() => {
    if (rocketImgRef.value) gsap.set(rocketImgRef.value, { opacity: 1 });
    if (flameRef.value) {
      gsap.set(flameRef.value, { opacity: 1 });
      gsap.killTweensOf(flameRef.value);
    }

    buildPath();
    runLineReveal();
    startFlame();
    startWind();
  });
}

function pulseValue() {
  if (!valueRef.value) return;
  gsap.fromTo(
    valueRef.value,
    { scale: 1 },
    { scale: 1.07, duration: 0.24, ease: "power1.out", yoyo: true, repeat: 1 }
  );
}

function crashNow() {
  if (playingTween) {
    playingTween.kill();
    playingTween = null;
  }
  gsap.killTweensOf(displayObj);
  stopWind();
  if (svgRef.value)
    gsap.fromTo(
      svgRef.value,
      { opacity: 1 },
      { opacity: 0, duration: 0.3, ease: "back.out(2)" }
    );
  if (valueRef.value)
    gsap.fromTo(
      valueRef.value,
      { scale: 1 },
      { scale: 1.47, duration: 0.24, ease: "power1.out", yoyo: true, repeat: 1 }
    );
  if (flameTl) {
    flameTl.kill();
    flameTl = null;
  }
  if (flameRef.value) {
    gsap.killTweensOf(flameRef.value);
    gsap.to(flameRef.value, {
      opacity: 0,
      duration: 0.3,
      ease: "power1.out",
    });
  }
  if (rocketImgRef.value) {
    gsap.to(rocketImgRef.value, {
      opacity: 0,
      duration: 0.3,
      ease: "power1.out",
    });
  }
  window.setTimeout(() => startPrepare(), 2500);
}

/* ===== Watchers / lifecycle ===== */
watch(
  () => gameStage.value,
  (v) => {
    if (v === "prepare" && wobbleRef.value) {
      gsap.to(wobbleRef.value, {
        x: 0,
        y: 0,
        rotation: 0,
        skewX: 0,
        skewY: 0,
        scale: 1,
        duration: 0.3,
        ease: "sine.out",
      });
    }
    if (v !== "playing") {
      stopWind();
    }
    if (v === "playing" && windWrapRef.value) {
      windAcc += 30;
    }
  }
);

function sleep(ms: any) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loseVibration() {
  for (let i = 0; i < 21; i++) {
    TelegramModule.useRigidHaptic();
    await sleep(24);
  }
}


onMounted(() => {
  startPrepare();
});

onMounted(() => {
  // запустить общий тикер
  startMasterTicker();

  if (props.GameStatus === "prepare") {
    mountedOnce.value = false;
    startPrepare();
    return;
  }
  if (props.GameStatus === "playing") {
    mountedOnce.value = false;
    startPlaying();
    return;
  }
  if (props.GameStatus === "completed") {
    mountedOnce.value = true;
  }
});

watch(
  () => props.GameStatus,
  (v) => {
    const from = prevStage.value;
    prevStage.value = v as Stage;
    gameStage.value = v as Stage;

    if (v === "prepare") {
      mountedOnce.value = false;
      startPrepare();
      return;
    }
    if (v === "playing") {
      mountedOnce.value = false;
      startPlaying();
      return;
    }
    if (v === "completed") {
      if (from === "playing") {
        // TelegramModule.useNotifyErrorHaptic();
        loseVibration();
        crashNow();
      } else {
        mountedOnce.value = true;
      }
    }
  }
);

watch(
  () => props.GameX,
  (v) => {
    if (!v) return gamePlayingX.value;
    pulseValue();
    gamePlayingX.value = v;
  }
);

watch(gamePrepareTime, () => {
  if (!timerDigitRef.value) return;
  gsap.fromTo(
    timerDigitRef.value,
    { scale: 2.8, y: 6, opacity: 0, filter: "blur(20px)" },
    {
      scale: 1,
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      duration: 0.58,
      ease: "back.out(2)",
    }
  );
});

onMounted(() => {
  if (timerDigitRef.value) {
    gsap.fromTo(
      timerDigitRef.value,
      { scale: 2.8, y: 6, opacity: 0, filter: "blur(20px)" },
      {
        scale: 1,
        y: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 0.58,
        ease: "back.out(2)",
      }
    );
  }
});

onBeforeUnmount(() => {
  if (gamePrepareTimeInterval.value)
    window.clearInterval(gamePrepareTimeInterval.value);
  if (lineTween) {
    lineTween.kill();
    lineTween = null;
  }
  if (flameTl) {
    flameTl.kill();
    flameTl = null;
  }
  if (swayTl) {
    swayTl.kill();
    swayTl = null;
  }
  stopWind();
  gsap.killTweensOf(flameRef.value);
  window.removeEventListener("resize", buildPath);
  stopMasterTicker();
});
</script>

<template>
  <div
    class="game"
    :class="{
      completed: gameStage === 'completed',
    }"
  >
    <div class="game-bg-symbols" :class="{ active: gameStage !== 'prepare' }">
      <img :src="GameBgSymbolsImage" alt="bg" />
    </div>

    <div class="game-info">
      <div class="latests">
        <div class="item now" :class="{ notnow: props.GameX && props.GameX > 0 }">
          <h4 v-if="(props.GameX && props.GameX > 0) && props.GameStatus !== 'completed'">
            {{ cutNumber(props.GameX) }}
          </h4>
          <h4
            v-if="
              (props.GameStatus !== 'loading' &&
              (!props.GameX || props.GameX === 0)) || props.GameStatus === 'completed'
            "
          >
            {{ $t("crash.game.now") }}
          </h4>
          <div v-if="props.GameStatus === 'loading'" class="spinner"></div>
        </div>
        <div class="item" v-for="(item, index) in lastCrashes" :key="index">
          <h4>{{ cutNumber(item) }}</h4>
        </div>
      </div>
      <div class="game-online">
        <h4>
          {{ props.GameOnline }} {{ $t("crash.game.players") }}
        </h4>
        <span class="online-dot" aria-hidden="true"></span>
      </div>
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
      <div
        class="game-value"
        ref="valueRef"
        :class="{ completed: gameStage === 'completed' }"
      >
        <p>{{ cutNumber(gamePlayingX) || 0.0 }}</p>
        <span>x</span>
      </div>

      <div v-if="!mountedOnce" class="game-weerh">
        <div class="wind-viewport">
          <div class="wind-wrap" ref="windWrapRef">
            <svg
              v-for="n in 2"
              :key="'w' + n"
              class="wind-svg"
              width="313"
              height="132"
              viewBox="0 0 313 132"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g style="mix-blend-mode: screen">
                <rect x="222" y="106" width="91" height="4" rx="2" fill="url(#paint0)" />
              </g>
              <g style="mix-blend-mode: screen">
                <rect y="78" width="91" height="4" rx="2" fill="url(#paint1)" />
              </g>
              <g style="mix-blend-mode: screen">
                <rect x="158" y="62" width="61" height="4" rx="2" fill="url(#paint2)" />
              </g>
              <g style="mix-blend-mode: screen">
                <rect x="175" width="93" height="4" rx="2" fill="url(#paint3)" />
              </g>
              <g style="mix-blend-mode: screen">
                <rect x="51" y="29" width="121" height="4" rx="2" fill="url(#paint4)" />
              </g>
              <g style="mix-blend-mode: screen">
                <rect x="97" y="128" width="122" height="4" rx="2" fill="url(#paint5)" />
              </g>
              <defs>
                <linearGradient
                  id="paint0"
                  x1="222"
                  y1="108"
                  x2="313"
                  y2="108"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stop-color="#FF6FDB" stop-opacity="0" />
                  <stop offset="1" stop-color="#FF6FDB" stop-opacity="0.3" />
                </linearGradient>
                <linearGradient
                  id="paint1"
                  x1="0"
                  y1="80"
                  x2="91"
                  y2="80"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stop-color="#FF6FDB" stop-opacity="0" />
                  <stop offset="1" stop-color="#FF6FDB" stop-opacity="0.3" />
                </linearGradient>
                <linearGradient
                  id="paint2"
                  x1="158"
                  y1="64"
                  x2="219"
                  y2="64"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stop-color="#FF6FDB" stop-opacity="0" />
                  <stop offset="1" stop-color="#FF6FDB" stop-opacity="0.3" />
                </linearGradient>
                <linearGradient
                  id="paint3"
                  x1="175"
                  y1="2"
                  x2="268"
                  y2="2"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stop-color="#FF6FDB" stop-opacity="0" />
                  <stop offset="1" stop-color="#FF6FDB" stop-opacity="0.3" />
                </linearGradient>
                <linearGradient
                  id="paint4"
                  x1="51"
                  y1="31"
                  x2="172"
                  y2="31"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stop-color="#FF6FDB" stop-opacity="0" />
                  <stop offset="1" stop-color="#FF6FDB" stop-opacity="0.3" />
                </linearGradient>
                <linearGradient
                  id="paint5"
                  x1="97"
                  y1="130"
                  x2="219"
                  y2="130"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stop-color="#FF6FDB" stop-opacity="0" />
                  <stop offset="1" stop-color="#FF6FDB" stop-opacity="0.3" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      <div v-if="!mountedOnce" class="game-stage" ref="stageRef">
        <div class="stage-wobble" ref="wobbleRef">
          <svg ref="svgRef" class="traj" preserveAspectRatio="none">
            <defs>
              <mask id="revealMask">
                <rect x="0" y="0" :width="0" height="100%" fill="#000" />
                <rect ref="maskRectRef" x="0" y="0" :width="0" height="100%" fill="#fff" />
              </mask>

              <linearGradient
                id="lineGradient"
                x1="0"
                y1="1"
                x2="1"
                y2="0"
                gradientUnits="objectBoundingBox"
              >
                <stop offset="0%" stop-color="#e837bc36" />
                <stop offset="60%" stop-color="#e837bc72" />
                <stop offset="100%" stop-color="#E837BB" />
              </linearGradient>

              <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#E837BB" stop-opacity="0.5" />
                <stop offset="100%" stop-color="#A90072" stop-opacity="0" />
              </linearGradient>
            </defs>

            <path
              ref="fillPathRef"
              :d="pathD"
              :mask="'url(#revealMask)'"
              fill="url(#fillGradient)"
              opacity="0.4"
            />

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
              <div v-if="gameStage === 'completed'" class="boom" ref="boomRef">
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
.game {
  position: relative;
}
.game-game {
  position: relative;
}
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
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
  shape-rendering: geometricPrecision;
}
.game-value {
  position: absolute;
  left: 16px;
  top: 12px;
  display: flex;
  align-items: baseline;
  gap: 4px;
  z-index: 2;
}
.game-value p {
  font-weight: 700;
  font-size: 32px;
  line-height: 1;
}
.rocket {
  position: absolute;
  left: 0;
  top: 0;
  width: 123px;
  height: 123px;
  transform-origin: 50% 50%;
  pointer-events: none;
  z-index: 2;
}
.rocket-inner {
  width: 100%;
  height: 100%;
  position: relative;
  transform-origin: 50% 60%;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.35));
}
.rocket-inner img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.flame {
  position: absolute;
  left: 30%;
  bottom: 16%;
  width: 42%;
  height: 42%;
  transform: translateX(-50%) scale(1, 1);
  border-radius: 50%;
  background: radial-gradient(
    50% 60% at 50% 60%,
    rgba(255, 200, 70, 0.95) 0%,
    rgba(255, 120, 30, 0.85) 40%,
    rgba(255, 60, 0, 0.65) 70%,
    rgba(255, 60, 0, 0) 100%
  );
  filter: blur(6px);
  opacity: 0.9;
  z-index: -1;
  pointer-events: none;
}
.stage-wobble {
  position: absolute;
  inset: 0;
  will-change: transform;
  pointer-events: none;
}

.wind-viewport {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.wind-wrap {
  display: flex;
  width: max-content;
  will-change: transform;
}
.wind-svg {
  flex-shrink: 0;
  width: 313px;
  height: 132px;
}

/* Чуть полегче на мобильных / LPM */
@media (max-width: 768px) {
  .traj__path {
    filter: none;
  }
  .flame {
    filter: blur(4px);
  }
  .rocket-inner {
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25));
  }
}
</style>