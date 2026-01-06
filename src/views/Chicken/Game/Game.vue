<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { gsap } from "gsap";
import * as PIXI from "pixi.js";

import lottie from "lottie-web";
import type { AnimationItem } from "lottie-web";

import coinUrl from "@/assets/chicken/coin-gray.png?url";
import coinPrimaryUrl from "@/assets/chicken/coin-primary.png?url";
import coinLoseUrl from "@/assets/chicken/coin-lose.png?url";
import coinWinUrl from "@/assets/chicken/coin-win.png?url";
import pipeUrl from "@/assets/chicken/pipe.png?url";
import chickenUrl from "@/assets/chicken/chicken.png?url";
import chickenDeadUrl from "@/assets/chicken/chicken-dead.png?url";
import stoneUrl from "@/assets/chicken/stone.png?url";
import nestUrl from "@/assets/chicken/nest.png?url";
import nestHdUrl from "@/assets/chicken/nest-hd.png?url";

// @ts-ignore
import fireJson from "@/assets/chicken/fire.json";

const emit = defineEmits<{
  (e: "clear-game"): void;
  (e: "set-game-step-processed", payload: boolean): void;
}>();

const props = defineProps<{
  gameStep: number;
  loading: boolean;
  modeRatios: any[];
}>();

const wrapRef = ref<HTMLDivElement | null>(null);

// ===== design =====
const DESIGN_W = 395;
const DESIGN_H = 450;
const EXTRA_BOTTOM_PX = 220;
const SAFE_BOTTOM = 30;

const BOTTOM_ANCHOR_PX = 450;
const DESKTOP_Y_OFFSET_PX = 100;
const MOBILE_Y_OFFSET_PX = 20;

const CHICKEN_X_OFFSET = -5;
const DESIRED_SCREEN_X = 70;
const CAMERA_PAD = 60;

// ===== state =====
let app: PIXI.Application | null = null;

let viewport: PIXI.Container | null = null;
let world: PIXI.Container | null = null;

let pipeTexture: PIXI.Texture | null = null;
let coinTexture: PIXI.Texture | null = null;
let coinPrimaryTexture: PIXI.Texture | null = null;
let coinLoseTexture: PIXI.Texture | null = null;
let coinWinTexture: PIXI.Texture | null = null;
let chickenTexture: PIXI.Texture | null = null;
let chickenDeadTexture: PIXI.Texture | null = null;
let stoneTexture: PIXI.Texture | null = null;
let nestTexture: PIXI.Texture | null = null;
let nestHdTexture: PIXI.Texture | null = null;

let chicken: PIXI.Sprite | null = null;
let pipes: PIXI.Sprite[] = [];
let coins: PIXI.Container[] = [];

let busy = false;
let inputLocked = false;
let step = 0;

// resize helpers
let ro: ResizeObserver | null = null;
let vvCleanup: (() => void) | null = null;

let lastW = 0;
let lastH = 0;

// layout throttle
let layoutRaf: number | null = null;
let mounted = false;

// tweens
let coinTweens: gsap.core.Tween[] = [];
let coinWinTween: gsap.core.Tween | null = null;

// cashout/reset protection
let resetInProgress = false;

// ===== horizontal pan (drag) =====
let dragging = false;
let dragStartScreenX = 0;
let dragStartWorldX = 0;
let lastMoveX = 0;
let lastMoveT = 0;
let velX = 0;
let inertiaTween: gsap.core.Tween | null = null;

const isLoading = ref(true);

// start progress
const START_AT_COIN = ref(props.gameStep ?? 0);

// ===== multipliers =====
const DEFAULT_MULTIPLIERS = [1.99, 2.99, 4.99, 7.99, 12.99, 20.99];

function normalizeRatios(v: any): number[] {
  const arr = Array.isArray(v) ? v : [];
  const nums = arr.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
  return nums.length ? nums : DEFAULT_MULTIPLIERS;
}

const multipliers = computed<number[]>(() => normalizeRatios(props.modeRatios));
const m = () => multipliers.value;

const texturesLoaded = ref(false);

function syncLoading() {
  isLoading.value = props.loading || !texturesLoaded.value;
}

// ===== utils =====
function isMobileDevice() {
  return (
    window.matchMedia?.("(pointer: coarse)")?.matches ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
}

function updateAppHeight() {
  const vv = window.visualViewport;
  const h = Math.floor(vv?.height ?? window.innerHeight) - 100;
  document.documentElement.style.setProperty("--app-height", `${h}px`);
}

function scheduleLayout() {
  if (layoutRaf != null) return;
  layoutRaf = requestAnimationFrame(() => {
    layoutRaf = null;
    layout();
  });
}

function killCoinTweens() {
  coinTweens.forEach((t) => t.kill());
  coinTweens = [];
  coinWinTween?.kill();
  coinWinTween = null;
}

function clampWorldX(x: number) {
  if (!pipes.length) return x;
  const firstX = pipes[0].x;
  const lastX = pipes[pipes.length - 1].x;
  const minX = DESIRED_SCREEN_X - lastX - CAMERA_PAD;
  const maxX = DESIRED_SCREEN_X - firstX + CAMERA_PAD;
  return Math.max(minX, Math.min(maxX, x));
}

function killInertia() {
  inertiaTween?.kill();
  inertiaTween = null;
}

function worldSetX(x: number) {
  if (!world) return;
  world.x = clampWorldX(x);
  // обновим огонь, если он сейчас видим (при панорамировании)
  if (lastFireWorld && fireRef.value && fireRef.value.style.display !== "none") {
    const p = worldToScreen(lastFireWorld.x, lastFireWorld.y);
    fireRef.value.style.left = `${p.x}px`;
    fireRef.value.style.top = `${p.y}px`;
  }
}

// ===== fallback textures (if assets fail) =====
function makePipeTexture(renderer: PIXI.Renderer) {
  const g = new PIXI.Graphics();
  g.roundRect(0, 0, 90, 118, 22).fill(0x2a2a2f);
  g.roundRect(6, 6, 78, 106, 18).fill(0x3a3a42);
  g.roundRect(10, 10, 70, 98, 16).fill({ color: 0x000000, alpha: 0.12 });
  // @ts-ignore
  return renderer.generateTexture(g, { resolution: 2 });
}

function makeCoinTexture(renderer: PIXI.Renderer) {
  const g = new PIXI.Graphics();
  g.circle(0, 0, 74).fill(0x6a6a70);
  g.circle(0, 0, 66).fill(0x4b4b52);
  g.circle(0, 0, 58).fill(0x9a9aa2);
  g.moveTo(-40, -55);
  g.lineTo(45, 50);
  g.stroke({ width: 18, color: 0xffffff, alpha: 0.12, cap: "round" });
  g.circle(0, 0, 58).stroke({ width: 6, color: 0x000000, alpha: 0.22 });
  // @ts-ignore
  return renderer.generateTexture(g, { resolution: 2 });
}

function makeChickenTexture(renderer: PIXI.Renderer) {
  const g = new PIXI.Graphics();
  g.ellipse(0, 0, 46, 34).fill(0xffffff);
  g.ellipse(18, -10, 18, 16).fill(0xffffff);

  g.circle(8, -18, 10).fill(0xf4e3b5).stroke({ width: 3, color: 0xd2c29a });
  g.circle(28, -18, 10).fill(0xf4e3b5).stroke({ width: 3, color: 0xd2c29a });
  g.circle(12, -18, 3).fill(0x1a1a1a);
  g.circle(32, -18, 3).fill(0x1a1a1a);

  g.roundRect(16, -10, 20, 14, 6).fill(0xf2b243).stroke({ width: 3, color: 0xd5932d });

  g.roundRect(10, -44, 14, 16, 6).fill(0xd34a3f);
  g.roundRect(22, -46, 14, 18, 6).fill(0xd34a3f);

  g.roundRect(-28, -4, 22, 16, 10).fill(0xf2f2f2).stroke({ width: 2, color: 0xe0e0e0 });

  // @ts-ignore
  return renderer.generateTexture(g, { resolution: 2 });
}

// ===== lottie fire (DOM overlay) =====
const fireRef = ref<HTMLDivElement | null>(null);
let fireAnim: AnimationItem | null = null;
let lastFireWorld: { x: number; y: number } | null = null;

function initFireLottie() {
  if (!fireRef.value || fireAnim) return;

  fireAnim = lottie.loadAnimation({
    container: fireRef.value,
    renderer: "svg",
    loop: true,
    autoplay: false,
    animationData: fireJson as any,
  });

  fireRef.value.style.opacity = "0";
  fireRef.value.style.display = "none";
}

function worldToScreen(x: number, y: number) {
  if (!viewport || !world) return { x: 0, y: 0 };
  const s = viewport.scale.x;
  const sx = viewport.x + (world.x + x) * s;
  const sy = viewport.y + (world.y + y) * s;
  return { x: sx, y: sy };
}

function showFireAtWorldPosLottie(x: number, y: number) {
  if (!fireRef.value) return;
  initFireLottie();

  lastFireWorld = { x, y };

  const p = worldToScreen(x, y);
  fireRef.value.style.left = `${p.x}px`;
  fireRef.value.style.top = `${p.y}px`;

  fireRef.value.style.display = "block";
  requestAnimationFrame(() => {
    if (!fireRef.value) return;
    fireRef.value.style.opacity = "1";
  });

  fireAnim?.goToAndPlay(0, true);
}

function hideFireLottie(immediate = false) {
  if (!fireRef.value) return;

  if (immediate) {
    fireRef.value.style.opacity = "0";
    fireRef.value.style.display = "none";
    fireAnim?.stop();
    return;
  }

  fireRef.value.style.opacity = "0";
  setTimeout(() => {
    if (!fireRef.value) return;
    fireRef.value.style.display = "none";
    fireAnim?.stop();
  }, 120);
}

// ===== coin anim =====
function startCoinIdle(c: PIXI.Container, i: number) {
  const coin = (c as any).coinSprite as PIXI.Sprite | undefined;
  const sparkle = (c as any).sparkle as PIXI.Graphics | undefined;
  if (!coin) return;

  coinTweens.push(
    gsap.to(c, {
      y: c.y - (6 + (i % 3) * 2),
      duration: 0.9 + (i % 4) * 0.12,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
      delay: i * 0.05,
    })
  );

  coinTweens.push(
    gsap.to(c.scale, {
      x: 1.04,
      y: 1.04,
      duration: 1.1 + (i % 3) * 0.15,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
      delay: 0.12 + i * 0.03,
    })
  );

  coinTweens.push(
    gsap.to(c, {
      rotation: (i % 2 ? 1 : -1) * 0.035,
      duration: 1.3 + (i % 5) * 0.08,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
      delay: i * 0.04,
    })
  );

  if (sparkle) {
    coinTweens.push(
      gsap.to(sparkle, {
        alpha: 0.45,
        duration: 0.22,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        delay: 0.4 + (i % 6) * 0.18,
        repeatDelay: 0.9 + (i % 4) * 0.25,
      })
    );
    coinTweens.push(
      gsap.to(sparkle, {
        rotation: Math.PI * 2,
        duration: 2.8 + (i % 4) * 0.35,
        repeat: -1,
        ease: "none",
        delay: i * 0.05,
      })
    );
  }
}

function playCoinWin(coinC: PIXI.Container) {
  const sparkle = (coinC as any).sparkle as PIXI.Graphics | undefined;
  coinWinTween?.kill();

  coinWinTween = gsap.timeline() as any;
  (coinWinTween as any)
    .to(coinC.scale, { x: 1.18, y: 1.18, duration: 0.12, ease: "power2.out" }, 0)
    .to(coinC.scale, { x: 1.02, y: 1.02, duration: 0.16, ease: "power2.out" }, 0.12)
    .to(coinC, { rotation: coinC.rotation + 0.08, duration: 0.12, ease: "power2.out" }, 0)
    .to(coinC, { rotation: coinC.rotation, duration: 0.18, ease: "power2.out" }, 0.12);

  if (sparkle) {
    gsap.to(sparkle, { alpha: 1, duration: 0.08, ease: "power2.out" });
    gsap.to(sparkle.scale, { x: 1.25, y: 1.25, duration: 0.16, ease: "power2.out" });
    gsap.to(sparkle, { alpha: 0.2, duration: 0.22, ease: "power2.out", delay: 0.1 });
    gsap.to(sparkle.scale, { x: 1, y: 1, duration: 0.22, ease: "power2.out", delay: 0.1 });
  }
}

// ===== textures sync =====
function syncCoinTextures() {
  if (!coinTexture) return;

  const removeLabel = (coinC: PIXI.Container) => {
    const lbl = (coinC as any).label as PIXI.Text | undefined | null;
    if (!lbl) return;
    try {
      coinC.removeChild(lbl);
    } catch {}
    try {
      lbl.destroy();
    } catch {}
    (coinC as any).label = null;
  };

  for (let i = 0; i < coins.length; i++) {
    const c = coins[i];
    const spr = c ? ((c as any).coinSprite as PIXI.Sprite | undefined) : undefined;
    if (!spr) continue;

    if (i < step - 1) {
      spr.texture = coinWinTexture ?? coinTexture;
      removeLabel(c);
    } else if (i === step - 1) {
      spr.texture = coinPrimaryTexture ?? coinTexture;
    } else {
      spr.texture = coinTexture;
    }
  }
}

// ===== layout =====
function layout() {
  if (!app || !wrapRef.value || !viewport) return;

  const el = wrapRef.value;
  const rect = el.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));

  const css = getComputedStyle(el);
  const pb = Math.floor(parseFloat(css.paddingBottom || "0"));
  const h = Math.max(1, Math.floor(rect.height - pb));

  if (w === lastW && h === lastH) return;
  lastW = w;
  lastH = h;

  const canvasH = h + EXTRA_BOTTOM_PX;
  app.renderer.resize(w, canvasH);

  const s = Math.min(1, w / DESIGN_W);
  viewport.scale.set(s);
  viewport.x = 0;

  const baseY = Math.round(h - DESIGN_H * s - (BOTTOM_ANCHOR_PX + pb));
  const deviceY = isMobileDevice() ? MOBILE_Y_OFFSET_PX : DESKTOP_Y_OFFSET_PX;
  viewport.y = baseY + deviceY;

  applyCoinYOffset();

  app.stage.hitArea = new PIXI.Rectangle(0, 0, w, canvasH);

  // keep lottie fire glued to world pos on resize
  if (lastFireWorld && fireRef.value && fireRef.value.style.display !== "none") {
    const p = worldToScreen(lastFireWorld.x, lastFireWorld.y);
    fireRef.value.style.left = `${p.x}px`;
    fireRef.value.style.top = `${p.y}px`;
  }
}

const SHORT_SCREEN_H = 671;

function getScreenH() {
  return Math.floor(window.visualViewport?.height ?? window.innerHeight);
}

function getCoinYOffset() {
  return getScreenH() <= SHORT_SCREEN_H ? 200 : 250;
}

let lastCoinYOffset = getCoinYOffset();

function applyCoinYOffset() {
  const off = getCoinYOffset();
  if (off === lastCoinYOffset) return;
  lastCoinYOffset = off;

  for (let i = 0; i < coins.length; i++) {
    const p = pipes[i + 1];
    const c = coins[i];
    if (!p || !c) continue;
    c.y = p.y - off;
  }
}

// ===== scene =====
function buildScene() {
  if (!app || !world) return;

  killCoinTweens();

  world.removeChildren();
  pipes = [];
  coins = [];
  chicken = null;
  step = 0;

  world.x = 0;
  world.y = 0;
  world.sortableChildren = true;
  world.alpha = 1;

  const bg = new PIXI.Graphics().rect(-2000, 0, DESIGN_W + 4000, DESIGN_H).fill(0x0d0d0f);
  world.addChild(bg);

  const floorY = DESIGN_H - SAFE_BOTTOM;

  const floor = new PIXI.Graphics()
    .roundRect(-80, floorY - 20, DESIGN_W + 160, 220, 90)
    .fill({ color: 0x0d0d0f, alpha: 0.35 });
  world.addChild(floor);

  const baseY = floorY;
  const pipeY = baseY + 110;

  const pipeTex = pipeTexture ?? makePipeTexture(app.renderer);
  const coinTex = coinTexture ?? makeCoinTexture(app.renderer);
  const chickTex = chickenTexture ?? makeChickenTexture(app.renderer);

  if (stoneTexture) {
    const stone = new PIXI.Sprite(stoneTexture);
    stone.width = 181;
    stone.height = 179;
    stone.anchor.set(0.5);
    stone.x = 56;
    stone.y = baseY + 82;
    world.addChild(stone);
  }

  if (nestTexture) {
    const nest = new PIXI.Sprite(nestTexture);
    nest.width = 100;
    nest.height = 49;
    nest.anchor.set(0.5);
    nest.x = 75;
    nest.y = baseY - 8;
    world.addChild(nest);
  }

  let nestHd: PIXI.Sprite | null = null;
  if (nestHdTexture) {
    nestHd = new PIXI.Sprite(nestHdTexture);
    nestHd.width = 92;
    nestHd.height = 33;
    nestHd.anchor.set(0.5);
    nestHd.x = 75;
    nestHd.y = baseY - 5;
    nestHd.zIndex = 1000;
  }

  const x0 = 82;
  const gap = 125;
  const pipesCount = m().length + 1;

  for (let i = 0; i < pipesCount; i++) {
    const p = new PIXI.Sprite(pipeTex);
    p.width = 90;
    p.height = 118;
    p.anchor.set(0.5, 1);
    p.x = x0 + i * gap;
    p.y = pipeY;
    p.alpha = i === 0 ? 0 : 1;
    world.addChild(p);
    pipes.push(p);

    if (i > 0) {
      const c = new PIXI.Container();

      const coin = new PIXI.Sprite(coinTex);
      coin.width = getScreenH() <= SHORT_SCREEN_H ? 70 : 85;
      coin.height = getScreenH() <= SHORT_SCREEN_H ? 70 : 85;
      coin.anchor.set(0.5);
      (c as any).coinSprite = coin;

      const sparkle = new PIXI.Graphics();
      sparkle.alpha = 0;
      sparkle.zIndex = 3;
      sparkle
        .moveTo(0, -26)
        .lineTo(6, -6)
        .lineTo(26, 0)
        .lineTo(6, 6)
        .lineTo(0, 26)
        .lineTo(-6, 6)
        .lineTo(-26, 0)
        .lineTo(-6, -6)
        .closePath()
        .fill({ color: 0xffffff, alpha: 0.22 });
      (c as any).sparkle = sparkle;

      const ratioIdx = Math.min(i - 1, m().length - 1);
      const label = new PIXI.Text({
        text: `${m()[ratioIdx].toFixed(2)}x`,
        style: {
          fontFamily: "SFRounded",
          fontSize: getScreenH() <= SHORT_SCREEN_H ? 16 : 20,
          fill: 0xffffff,
          fontWeight: "600",
          dropShadow: {
            color: 0x000000,
            alpha: 0.5,
            blur: 6,
            distance: 2,
          },
        },
      });
      label.anchor.set(0.5);
      label.zIndex = 4;
      (c as any).label = label;

      c.addChild(coin, sparkle, label);
      c.x = p.x;
      lastCoinYOffset = getCoinYOffset();
      c.y = p.y - lastCoinYOffset;

      world.addChild(c);
      coins.push(c);
    }
  }

  chicken = new PIXI.Sprite(chickTex);
  chicken.anchor.set(0.5, 1);
  chicken.x = 76 + CHICKEN_X_OFFSET;
  chicken.y = baseY + 6;
  chicken.width = 90;
  chicken.width = getScreenH() <= SHORT_SCREEN_H ? 70 : 90;
  chicken.height = getScreenH() <= SHORT_SCREEN_H ? 70 : 90;
  world.addChild(chicken);

  if (nestHd) world.addChild(nestHd);

  const startCoin = Math.max(0, Math.min(START_AT_COIN.value, m().length));
  step = startCoin;

  if (startCoin > 0 && pipes[startCoin]) {
    chicken.x = pipes[startCoin].x + CHICKEN_X_OFFSET;
    chicken.y = baseY + 18;
  }

  syncCoinTextures();

  const activeIdx = step - 1;
  if (activeIdx >= 0) {
    const active = coins[activeIdx];
    if (active) playCoinWin(active);
  }

  world.x = clampWorldX(DESIRED_SCREEN_X - chicken.x);
  coins.forEach((c, idx) => startCoinIdle(c, idx));

  hideFireLottie(true);
  lastFireWorld = null;

  killInertia();
}

// ===== movement + camera =====
function jumpTo(toX: number, landY: number, onDone?: () => void) {
  if (!chicken) return;

  const fromX = chicken.x;
  const fromY = chicken.y;

  const endX = toX + CHICKEN_X_OFFSET;
  const endY = landY;

  const peak = Math.min(fromY, endY) - 140;

  const t = { p: 0 };
  gsap.to(t, {
    p: 1,
    duration: 0.42,
    ease: "power2.out",
    onUpdate: () => {
      const p = t.p;
      chicken!.x = fromX + (endX - fromX) * p;

      const linY = fromY + (endY - fromY) * p;
      const arc = 4 * p * (1 - p);
      chicken!.y = linY + (peak - linY) * arc + 18;

      chicken!.rotation = -0.12 + 0.12 * p;
    },
    onComplete: () => onDone?.(),
  });
}

function cameraFollow() {
  if (!world || !chicken) return;
  gsap.killTweensOf(world);
  const targetX = clampWorldX(DESIRED_SCREEN_X - chicken.x);
  gsap.to(world, { x: targetX, duration: 0.55, ease: "power3.out" });
}

function smoothResetToStart(onDone?: () => void) {
  if (!world) {
    buildScene();
    onDone?.();
    return;
  }

  gsap.killTweensOf(world);
  gsap
    .timeline({ onComplete: onDone })
    .to(world, { alpha: 0, duration: 0.18, ease: "power2.inOut" })
    .add(() => {
      hideFireLottie(true);
      lastFireWorld = null;
      buildScene();
      if (world) world.alpha = 0;
    })
    .to(world, { alpha: 1, duration: 0.18, ease: "power2.inOut" });
}

// ===== outcome handlers =====
function beginStepGuard() {
  if (!world || !chicken) return false;
  if (busy || inputLocked) return false;
  if (step >= m().length) return false;
  busy = true;
  inputLocked = true;
  return true;
}

function endStepGuard() {
  busy = false;
  inputLocked = false;
}

/** ALWAYS WIN step */
function winStep() {
  if (!beginStepGuard()) return;

  const floorY = DESIGN_H - SAFE_BOTTOM;
  const nextIdx = Math.min(step + 1, pipes.length - 1);
  const target = pipes[nextIdx];

  hideFireLottie(true);
  lastFireWorld = null;

  jumpTo(target.x, floorY, () => {
    const coinIdx = Math.min(step, coins.length - 1);
    const coinC = coins[coinIdx];
    const coinSpr = coinC ? ((coinC as any).coinSprite as PIXI.Sprite | undefined) : undefined;

    if (coinSpr && coinPrimaryTexture) coinSpr.texture = coinPrimaryTexture;
    if (coinC) playCoinWin(coinC);

    step++;
    syncCoinTextures();
    cameraFollow();
    endStepGuard();
    emit("set-game-step-processed", false);
  });
}

/** LOSE current step (with fire lottie) */
function loseStep() {
  if (!beginStepGuard()) return;

  const floorY = DESIGN_H - SAFE_BOTTOM;
  const nextIdx = Math.min(step + 1, pipes.length - 1);
  const target = pipes[nextIdx];

  jumpTo(target.x, floorY, () => {
    showFireAtWorldPosLottie(target.x, floorY - 12);
    setTimeout(() => hideFireLottie(false), 850);

    const coinIdx = Math.min(step, coins.length - 1);
    const coinC = coins[coinIdx];
    const coinSpr = coinC ? ((coinC as any).coinSprite as PIXI.Sprite | undefined) : undefined;

    if (chicken && chickenDeadTexture) chicken.texture = chickenDeadTexture;

    if (coinC) {
      const lbl = (coinC as any).label as PIXI.Text | undefined;
      if (lbl) {
        try {
          coinC.removeChild(lbl);
        } catch {}
        try {
          lbl.destroy();
        } catch {}
        (coinC as any).label = null;
      }
    }

    if (coinSpr && coinLoseTexture) coinSpr.texture = coinLoseTexture;
    if (coinC) playCoinWin(coinC);

    const tl = gsap.timeline({
      onComplete: () => {
        smoothResetToStart(() => {
          endStepGuard();
        });
      },
    });

    if (!chicken) return;

    tl.to(chicken, { rotation: chicken.rotation + 0.06, duration: 0.08, ease: "power2.out" }, 0);
    tl.to({}, { duration: 0.12 }, 0.08);
    tl.to(chicken, { y: chicken.y + 6, duration: 0.1, ease: "power2.inOut" }, 0.08);

    tl.to(
      chicken,
      {
        x: DESIGN_W / 2.3,
        y: DESIGN_H + 200,
        rotation: chicken.rotation - 3.1,
        duration: 0.6,
        ease: "power2.in",
      },
      0.06
    );

    tl.to(chicken, { alpha: 0, duration: 0.18, ease: "power2.out" }, "-=0.14");
    tl.to({}, { duration: 0.1 }, ">");

    START_AT_COIN.value = 0;
    emit("set-game-step-processed", true);
    emit("clear-game");
  });
}

// ===== input =====
function tap() {
  winStep();
}

/**
 * FIXED CASHOUT:
 * - не используем beginStepGuard (он может вернуть false при step>=m().length или busy)
 * - не делаем gsap.globalTimeline.clear() (он убивал наш reset tween)
 * - аккуратно убиваем только наши твины и делаем smoothResetToStart
 */
function cashout() {
  if (!mounted) return;
  if (resetInProgress) return;
  resetInProgress = true;

  // блокируем ввод, чтобы ничего не наложилось
  busy = true;
  inputLocked = true;

  try {
    // убить инерцию/камеру/прыжки
    killInertia();
    if (world) gsap.killTweensOf(world);
    if (chicken) gsap.killTweensOf(chicken);

    // убить idle анимации монет, потом buildScene заново их стартанёт
    killCoinTweens();

    hideFireLottie(true);
    lastFireWorld = null;

    // гарантируем возврат к “живой” курице (если вдруг была dead)
    if (chicken && chickenTexture) chicken.texture = chickenTexture;
    if (chicken) {
      chicken.alpha = 1;
      chicken.rotation = 0;
    }

    // сбрасываем в старт мягко
    smoothResetToStart(() => {
      endStepGuard();
      resetInProgress = false;
    });

    START_AT_COIN.value = 0;
    emit("set-game-step-processed", true);
    emit("clear-game");
  } catch {
    endStepGuard();
    resetInProgress = false;
  }
}

// ===== horizontal pan handlers =====
function canPanNow() {
  // во время прыжка/лосса/вин-степа не паним, чтобы не дёргать мир
  return !!world && !!viewport && !busy && !inputLocked && !isLoading.value;
}

function onDragStart(e: PIXI.FederatedPointerEvent) {
  if (!canPanNow()) return;
  dragging = true;
  killInertia();

  const x = e.global.x;
  dragStartScreenX = x;
  dragStartWorldX = world!.x;

  lastMoveX = x;
  lastMoveT = performance.now();
  velX = 0;
}

function onDragMove(e: PIXI.FederatedPointerEvent) {
  if (!dragging || !world || !viewport) return;

  const now = performance.now();
  const x = e.global.x;

  // dx в screen px -> world px через scale
  const dxScreen = x - dragStartScreenX;
  const s = viewport.scale.x || 1;
  const dxWorld = dxScreen / s;

  worldSetX(dragStartWorldX + dxWorld);

  // velocity
  const dt = Math.max(1, now - lastMoveT);
  velX = (x - lastMoveX) / dt; // screen px per ms
  lastMoveX = x;
  lastMoveT = now;
}

function onDragEnd() {
  if (!dragging || !world || !viewport) return;
  dragging = false;

  // инерция
  const s = viewport.scale.x || 1;
  const vWorld = (velX / s) * 1000; // world px per sec

  const abs = Math.abs(vWorld);
  if (abs < 30) return;

  const to = clampWorldX(world.x + vWorld * 0.25);
  inertiaTween = gsap.to(world, {
    x: to,
    duration: 0.6,
    ease: "power3.out",
    onUpdate: () => {
      if (lastFireWorld && fireRef.value && fireRef.value.style.display !== "none") {
        const p = worldToScreen(lastFireWorld.x, lastFireWorld.y);
        fireRef.value.style.left = `${p.x}px`;
        fireRef.value.style.top = `${p.y}px`;
      }
    },
    onComplete: () => {
      inertiaTween = null;
    },
  });
}

// expose API to parent
defineExpose({
  tap,
  winStep,
  loseStep,
  cashout,
});

// ===== mount/unmount =====
async function loadTexture(alias: string, src: string): Promise<PIXI.Texture | null> {
  try {
    PIXI.Assets.add({ alias, src });
    await PIXI.Assets.load(alias);
    return (PIXI.Assets.get(alias) as PIXI.Texture) ?? null;
  } catch {
    return null;
  }
}

onMounted(async () => {
  if (!wrapRef.value) return;
  mounted = true;
  isLoading.value = props.loading ?? true;

  updateAppHeight();

  app = new PIXI.Application();
  await app.init({
    width: 1,
    height: 1,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    antialias: true,
    backgroundAlpha: 0,
    powerPreference: "high-performance" as any,
  });

  viewport = new PIXI.Container();
  world = new PIXI.Container();
  app.stage.addChild(viewport);
  viewport.addChild(world);

  app.stage.eventMode = "static";

  // === enable pan ===
  app.stage.on("pointerdown", onDragStart);
  app.stage.on("pointermove", onDragMove);
  app.stage.on("pointerup", onDragEnd);
  app.stage.on("pointerupoutside", onDragEnd);
  app.stage.on("pointercancel", onDragEnd);

  // mount canvas UNDER overlays
  wrapRef.value.prepend(app.canvas);
  Object.assign(app.canvas.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: "100%",
    height: `calc(100% + ${EXTRA_BOTTOM_PX}px)`,
    display: "none",
    opacity: "0",
    zIndex: "0",
    transition: "opacity 220ms ease",
    pointerEvents: "auto", // важно для drag
  });

  initFireLottie();

  const [_coin, _pipe, _chicken, _chickenDead, _stone, _nest, _nestHd, _coinPrimary, _coinLose, _coinWin] =
    await Promise.all([
      loadTexture("coinGray", coinUrl),
      loadTexture("pipe", pipeUrl),
      loadTexture("chicken", chickenUrl),
      loadTexture("chickenDead", chickenDeadUrl),
      loadTexture("stone", stoneUrl),
      loadTexture("nest", nestUrl),
      loadTexture("nestHd", nestHdUrl),
      loadTexture("coinPrimary", coinPrimaryUrl),
      loadTexture("coinLose", coinLoseUrl),
      loadTexture("coinWin", coinWinUrl),
    ]);

  coinTexture = _coin;
  pipeTexture = _pipe;
  chickenTexture = _chicken;
  chickenDeadTexture = _chickenDead;
  stoneTexture = _stone;
  nestTexture = _nest;
  nestHdTexture = _nestHd;
  coinPrimaryTexture = _coinPrimary;
  coinLoseTexture = _coinLose;
  coinWinTexture = _coinWin;

  texturesLoaded.value = true;

  syncLoading();
  // buildScene();
  // scheduleLayout();

  app.ticker.addOnce(() => {
    if (!mounted) return;
    app!.canvas.style.display = "block";
    void app!.canvas.offsetHeight;
    app!.canvas.style.opacity = "1";
  });

  const vv = window.visualViewport;
  const onVV = () => {
    updateAppHeight();
    scheduleLayout();
  };
  if (vv) {
    vv.addEventListener("resize", onVV);
    vv.addEventListener("scroll", onVV);
    vvCleanup = () => {
      vv.removeEventListener("resize", onVV);
      vv.removeEventListener("scroll", onVV);
    };
  }

  ro = new ResizeObserver(() => scheduleLayout());
  ro.observe(wrapRef.value);

  window.addEventListener("resize", scheduleLayout);
});

onBeforeUnmount(() => {
  mounted = false;

  window.removeEventListener("resize", scheduleLayout);

  if (layoutRaf != null) {
    cancelAnimationFrame(layoutRaf);
    layoutRaf = null;
  }

  if (ro && wrapRef.value) {
    ro.unobserve(wrapRef.value);
    ro.disconnect();
    ro = null;
  }

  if (vvCleanup) {
    vvCleanup();
    vvCleanup = null;
  }

  killInertia();
  killCoinTweens();

  busy = false;
  inputLocked = false;
  resetInProgress = false;

  texturesLoaded.value = false;
  isLoading.value = true;

  try {
    hideFireLottie(true);
    fireAnim?.destroy();
  } catch {}
  fireAnim = null;
  lastFireWorld = null;

  try {
    if (app) {
      app.stage.off("pointerdown", onDragStart);
      app.stage.off("pointermove", onDragMove);
      app.stage.off("pointerup", onDragEnd);
      app.stage.off("pointerupoutside", onDragEnd);
      app.stage.off("pointercancel", onDragEnd);

      app.canvas.style.display = "none";
      app.canvas.style.opacity = "0";
      app.stage.removeAllListeners();
      app.destroy(true);
    }
  } catch {}

  app = null;
  viewport = null;
  world = null;

  pipes = [];
  coins = [];
  chicken = null;
});


watch(() => props.loading, syncLoading);

let sceneBuiltOnce = false;

function ratiosReady() {
  return Array.isArray(props.modeRatios) && props.modeRatios.length > 0;
}

function tryInitSceneOnce() {
  if (!mounted) return;
  if (sceneBuiltOnce) return;
  if (props.loading) return;
  if (!texturesLoaded.value) return;
  if (!ratiosReady()) return; // <- ключевое

  // стартовое положение (если есть step)
  START_AT_COIN.value = Math.max(0, Number(props.gameStep ?? 0));

  buildScene();
  scheduleLayout();
  sceneBuiltOnce = true;
}

watch([() => props.loading, () => props.modeRatios, () => props.gameStep, texturesLoaded], tryInitSceneOnce, {
  flush: "post",
});
</script>

<template>
  <div class="wrap" ref="wrapRef">
    <!-- PIXI canvas добавляется сюда через prepend -->

    <!-- Lottie fire overlay -->
    <div class="fire-lottie" ref="fireRef" aria-hidden="true"></div>

    <!-- loader MUST be above everything -->
    <div class="loading" :class="{ show: isLoading }" aria-hidden="true">
      <div class="load-icon"></div>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  width: 100%;
  height: var(--app-height, 100dvh);
  min-height: 320px;

  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;

  background: #0d0d0f;

  overflow: hidden;
  position: relative;

  /* чтобы жесты не скроллили страницу и нормально работал drag */
  touch-action: none;
}

/* Lottie fire above canvas */
.fire-lottie {
  position: absolute;
  left: 0;
  top: 0;

  width: 120px;
  height: 120px;

  transform: translate(-50%, -70%);
  pointer-events: none;
  z-index: 1;

  opacity: 0;
  transition: opacity 120ms ease;
  will-change: transform, opacity, left, top;
}

/* loader MUST be above canvas + fire */
.loading {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;

  background: #0d0d0f;

  opacity: 0;
  pointer-events: none;
  transition: opacity 220ms ease;
  transform: translateY(-150px);
  z-index: 2;
}

.loading.show {
  opacity: 1;
  pointer-events: auto;
}

.load-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 4px solid rgba(255, 255, 255, 0.18);
  border-top-color: rgba(255, 255, 255, 0.95);
  animation: spin 0.9s linear infinite;
  transform: translateZ(0);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>