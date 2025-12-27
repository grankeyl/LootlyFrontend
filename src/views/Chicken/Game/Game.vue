<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import * as PIXI from "pixi.js";
import { gsap } from "gsap";

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

import lottie, { type AnimationConfigWithData, type CanvasRendererConfig } from "lottie-web";

// @ts-ignore
import fireAnim from "@/assets/chicken/fire.json";

const wrapRef = ref<HTMLDivElement | null>(null);

const DESIGN_W = 395;
const DESIGN_H = 450;

const EXTRA_BOTTOM_PX = 220;
const SAFE_BOTTOM = 110;
// насколько приподнять всю сцену относительно низа контейнера (чтобы не залезала под UI)

const BOTTOM_ANCHOR_PX = 450;

// выравнивание курицы относительно трубы (в jumpTo у тебя было -5)
const CHICKEN_X_OFFSET = -5;

// куда на экране хотим ставить курицу (px в координатах world)
const DESIRED_SCREEN_X = 70;
// небольшой запас, чтобы не упираться в края при clamping
const CAMERA_PAD = 60;

// ===== стартовая позиция (1..multipliers.length). 1 = первая монета, 2 = вторая и т.д.
// Хочешь стартовать на второй монетке -> поставь 2.
const START_AT_COIN = 0;

let app: PIXI.Application | null = null;
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
let ro: ResizeObserver | null = null;
let rafId: number | null = null;
let vvCleanup: (() => void) | null = null;

let lastCanvasW = 0;
let lastCanvasH = 0;

let viewport: PIXI.Container | null = null;
let world: PIXI.Container | null = null;

let chicken: PIXI.Sprite | null = null;
let pipes: PIXI.Sprite[] = [];
let coins: PIXI.Container[] = [];

let busy = false;
let inputLocked = false;
let step = 0;

const multipliers = [1.99, 2.99, 4.99, 7.99, 12.99, 20.99];

// coin anim tweens
let coinTweens: gsap.core.Tween[] = [];
let coinWinTween: gsap.core.Tween | null = null;

type FireFx = {
  sprite: PIXI.Sprite;
  canvas: HTMLCanvasElement;
  anim: any;
  holder: HTMLDivElement;
  tick: () => void;
  destroy: () => void;
};

let fireFx: FireFx | null = null;

function destroyFire() {
  if (!fireFx) return;
  fireFx.destroy();
  fireFx = null;
}

// создаёт лотти-огонь и вешает его в world
function spawnFireAt(x: number, y: number) {
  if (!app || !world) return;

  destroyFire();

  const holder = document.createElement("div");
  holder.style.position = "absolute";
  holder.style.left = "-10000px";
  holder.style.top = "-10000px";
  holder.style.width = "200px";
  holder.style.height = "200px";
  holder.style.pointerEvents = "none";
  holder.style.opacity = "0";
  document.body.appendChild(holder);

  // свой canvas (важно: задаём size ДО lottie.loadAnimation)
  const canvas = document.createElement("canvas");
  canvas.width = 115;
  canvas.height = 115;
  holder.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    holder.remove();
    return;
  }

  // @ts-ignore
  const config: AnimationConfigWithData<"canvas"> = {
    animationData: fireAnim,
    renderer: "canvas",
    loop: true,
    autoplay: true,
    rendererSettings: {
      context: ctx,
      clearCanvas: true,
      // @ts-ignore
      preserveAspectRatio: "xMidYMid meet",
    } as CanvasRendererConfig,
  };

  const anim = lottie.loadAnimation(config);
  anim.play();

  const tex = PIXI.Texture.from(canvas);
  const spr = new PIXI.Sprite(tex);
  spr.anchor.set(0.5, 1);
  spr.x = x;
  spr.y = y;
  spr.zIndex = 2000;

  spr.width = 110;
  spr.height = 110;

  // плавное появление: fade + pop + лёгкий подъём
  spr.alpha = 0;
  spr.scale.set(0.85);
  spr.y = y + 10;

  world.addChild(spr);

  gsap.to(spr, { alpha: 1, duration: 0.18, ease: "power2.out" });
  gsap.to(spr.scale, { x: 1, y: 1, duration: 0.22, ease: "back.out(2)" });
  gsap.to(spr, { y, duration: 0.22, ease: "power2.out" });

  const tick = () => {
    // PIXI v8
    const src: any = (tex as any).source;
    if (src && typeof src.update === "function") {
      src.update();
      return;
    }
    // PIXI v7 fallback
    const bt: any = (tex as any).baseTexture;
    if (bt && typeof bt.update === "function") bt.update();
  };

  const destroy = () => {
    try {
      anim.destroy();
    } catch {}
    try {
      tex.destroy(true);
    } catch {}
    try {
      // @ts-ignore
      spr.destroy({ children: true, texture: false, baseTexture: false });
    } catch {}
    try {
      holder.remove();
    } catch {}
  };

  fireFx = { sprite: spr, canvas, anim, holder, tick, destroy };
}

function killCoinTweens() {
  coinTweens.forEach((t) => t.kill());
  coinTweens = [];
  coinWinTween?.kill();
  coinWinTween = null;
}

// ---------- textures fallback ----------
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

// ---------- coin idle animation ----------
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

// ---------- helpers ----------
function updateAppHeight() {
  // Делает «честную» высоту для мобилок/вебвью, где 100vh прыгает из-за адресной строки.
  // Ставим CSS-переменную в px и используем её в .wrap.
  const vv = window.visualViewport;
  const h = Math.floor(vv?.height ?? window.innerHeight);
  document.documentElement.style.setProperty("--app-height", `${h}px`);
}

function clampWorldX(x: number) {
  // world.x так, чтобы курица оставалась в видимой зоне и не улетала за экран.
  // pipes[0] — стартовая (невидимая) труба, pipes[last] — последняя.
  if (!pipes.length) return x;

  const firstX = pipes[0].x;
  const lastX = pipes[pipes.length - 1].x;

  // хотим, чтобы chickenScreenX = world.x + chicken.x ~= DESIRED_SCREEN_X
  // => world.x ~= DESIRED_SCREEN_X - chicken.x
  // но ограничиваем так, чтобы крайние трубы не уходили слишком далеко.
  const minX = DESIRED_SCREEN_X - lastX - CAMERA_PAD;
  const maxX = DESIRED_SCREEN_X - firstX + CAMERA_PAD;

  return Math.max(minX, Math.min(maxX, x));
}

// ---------- layout ----------
function layout() {
  if (!app || !wrapRef.value || !viewport) return;

  const el = wrapRef.value;
  const rect = el.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));

  // реальная видимая высота (через --app-height), rect.height уже ок
  const css = getComputedStyle(el);
  const pb = Math.floor(parseFloat(css.paddingBottom || "0")); // safe-area в px

  // ВАЖНО: доступная высота под игру — без нижнего padding
  const h = Math.max(1, Math.floor(rect.height - pb));

  const MAX_SCALE = 1;
  const canvasH = h + EXTRA_BOTTOM_PX;

  if (w !== lastCanvasW || canvasH !== lastCanvasH) {
    app.renderer.resize(w, canvasH);
    lastCanvasW = w;
    lastCanvasH = canvasH;
  }

  const s = Math.min(MAX_SCALE, w / DESIGN_W);
  viewport.scale.set(s);

  // якорь снизу: добавляем pb, чтобы на iPhone/вебвью низ не "уползал"
  viewport.x = 0;
  viewport.y = Math.round(h - DESIGN_H * s - (BOTTOM_ANCHOR_PX + pb));

  app.stage.hitArea = new PIXI.Rectangle(0, 0, w, canvasH);
}

// ---------- scene ----------
function buildScene() {
  if (!app || !world) return;

  killCoinTweens();
  destroyFire();

  world.removeChildren();
  pipes = [];
  coins = [];
  chicken = null;
  step = 0; // временно, ниже выставим старт по START_AT_COIN

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

  // @ts-ignore
  const stone = new PIXI.Sprite(stoneTexture);
  stone.width = 181;
  stone.height = 179;
  stone.anchor.set(0.5);
  stone.x = 56;
  stone.y = baseY + 82;
  world.addChild(stone);

  // @ts-ignore
  const nest = new PIXI.Sprite(nestTexture);
  nest.width = 100;
  nest.height = 49;
  nest.anchor.set(0.5);
  nest.x = 75;
  nest.y = baseY - 8;
  world.addChild(nest);

  // @ts-ignore
  const nestHd = new PIXI.Sprite(nestHdTexture);
  nestHd.width = 92;
  nestHd.height = 33;
  nestHd.anchor.set(0.5);
  nestHd.x = 75;
  nestHd.y = baseY - 5;
  nestHd.zIndex = 1000;

  // const nest = new PIXI.Sprite(nestTexture);
  // nest.width = 100;
  // nest.height = 49;
  // nest.anchor.set(0.5);
  // nest.x = 75;
  // nest.y = DESIGN_H / 1.38;
  // world.addChild(nest);

  // const nestHd = new PIXI.Sprite(nestHdTexture);
  // nestHd.width = 92;
  // nestHd.height = 33;
  // nestHd.anchor.set(0.5);
  // nestHd.x = 75;
  // nestHd.y = DESIGN_H / 1.38;
  // nestHd.zIndex = 1000;

  const pipeTex = pipeTexture ?? makePipeTexture(app.renderer);
  const coinTex = coinTexture ?? makeCoinTexture(app.renderer);
  const chickenTex = chickenTexture ?? makeChickenTexture(app.renderer);

  const x0 = 82;
  const gap = 125;
  const pipesCount = multipliers.length + 1;

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
      coin.width = 85;
      coin.height = 85;
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

      // @ts-ignore
      const label = new PIXI.Text({
        text: `${multipliers[Math.min(i - 1, multipliers.length - 1)].toFixed(2)}x`,
        style: {
          fontFamily: "SFRounded",
          fontSize: 20,
          fill: 0xffffff,
          fontWeight: "600",
          dropShadow: true,
          dropShadowColor: 0x000000,
          dropShadowAlpha: 0.5,
          dropShadowBlur: 6,
          dropShadowDistance: 2,
        },
      });
      label.anchor.set(0.5);
      label.zIndex = 4;
      (c as any).label = label;

      c.addChild(coin, sparkle, label);
      c.x = p.x;
      c.y = p.y - 250;

      world.addChild(c);
      coins.push(c);
    }
  }

  chicken = new PIXI.Sprite(chickenTex);
  chicken.anchor.set(0.5, 1);
  chicken.x = 76 + CHICKEN_X_OFFSET;
  chicken.y = baseY + 6;
  chicken.rotation = 0;
  chicken.width = 90;
  chicken.height = 90;
  chicken.alpha = 1;
  world.addChild(chicken);

  world.addChild(nestHd);

  // ===== старт на нужной монетке одной переменной START_AT_COIN =====
  // step = количество уже пройденных (выигранных) монет.
  // Если START_AT_COIN = 2, значит первые 2 монеты уже "пройдены",
  // курица стоит на трубе №2, следующий прыжок будет на монету №3.
  const startCoin = Math.max(0, Math.min(START_AT_COIN, multipliers.length));
  step = startCoin;

  // переносим курицу на нужную трубу (pipes[1] = 1-я монета, pipes[2] = 2-я ...)
  if (startCoin > 0 && pipes[startCoin]) {
    chicken.x = pipes[startCoin].x + CHICKEN_X_OFFSET

    if (step === 0) {
      chicken.y = baseY + 6;
    } else {
      chicken.y = baseY + 18;
    }
  }

  syncCoinTextures();

  // подсветить текущую (последнюю пройденную) как при выигрыше
  const activeIdx = step - 1;
  if (activeIdx >= 0) {
    const active = coins[activeIdx];
    if (active) {
      // короткий "поп" как при win
      playCoinWin(active);
      // и чуть-чуть поджечь искру, чтобы было видно сразу
      const sparkle = (active as any).sparkle as PIXI.Graphics | undefined;
      if (sparkle) {
        sparkle.alpha = Math.max(sparkle.alpha, 0.25);
      }
    }
  }

  // сдвинуть камеру под стартовую позицию
  requestAnimationFrame(() => {
    if (!world || !chicken) return;
    // snap (без твина), но корректно уводим камеру к нужной трубе
    world.x = clampWorldX(DESIRED_SCREEN_X - chicken.x);
  });

  coins.forEach((c, idx) => startCoinIdle(c, idx));
}

// ---------- outcome mock ----------
async function getOutcome() {
  await new Promise((r) => setTimeout(r, 90));
  return { win: Math.random() < 0.85 };
}

// ---------- jump ----------
function jumpTo(toX: number, landY: number) {
  if (!chicken) return;

  const fromX = chicken.x;
  const fromY = chicken.y;

  const endX = toX + CHICKEN_X_OFFSET;
  const endY = landY;

  const peak = Math.min(fromY, endY) - 140;

  const t = { p: 0 };
  const dur = 0.42;

  gsap.to(t, {
    p: 1,
    duration: dur,
    ease: "power2.out",
    onUpdate: () => {
      const p = t.p;
      chicken!.x = fromX + (endX - fromX) * p;

      const linY = fromY + (endY - fromY) * p;
      const arc = 4 * p * (1 - p);
      chicken!.y = linY + (peak - linY) * arc + 18;

      chicken!.rotation = -0.12 + 0.12 * p;
    },
  });
}

// ---------- camera ----------
function cameraFollow() {
  if (!world || !chicken) return;

  const targetX = clampWorldX(DESIRED_SCREEN_X - chicken.x);
  gsap.to(world, { x: targetX, duration: 0.55, ease: "power3.out" });
}

// --- camera helpers ---
function cameraShake(intensity = 6, repeats = 6) {
  if (!world) return;
  gsap.killTweensOf(world, "x");
  const baseX = world.x;
  gsap.to(world, {
    x: baseX + intensity,
    duration: 0.045,
    repeat: repeats,
    yoyo: true,
    ease: "sine.inOut",
    onComplete: () => {
      // возвращаем в исходную точку, чтобы дальше спокойно ехать
      world && (world.x = baseX);
    },
  });
}

function smoothResetToStart(onDone?: () => void) {
  if (!world) {
    buildScene();
    onDone?.();
    return;
  }

  gsap.killTweensOf(world);

  gsap
    .timeline({
      onComplete: () => {
        onDone?.();
      },
    })
    // медленнее уходим в затемнение
    .to(world, { alpha: 0, duration: 0.2, ease: "power2.inOut" })
    .to({}, { duration: 0.03 })
    .add(() => {
      destroyFire();
      buildScene();
      if (world) {
        world.x = 0;
        world.alpha = 0;
      }
    })
    // плавнее возвращаемся
    .to(world, { alpha: 1, duration: 0.2, ease: "power2.inOut" });
}

function syncCoinTextures() {
  if (!coinTexture) return;

  const removeLabel = (coinC: PIXI.Container) => {
    const lbl = (coinC as any).label as PIXI.Text | undefined | null;
    if (!lbl) return;

    try { coinC.removeChild(lbl); } catch {}
    try { lbl.destroy(); } catch {}
    (coinC as any).label = null;
  };

  for (let i = 0; i < coins.length; i++) {
    const c = coins[i];
    const spr = c ? ((c as any).coinSprite as PIXI.Sprite | undefined) : undefined;
    if (!spr) continue;

    if (i < step - 1) {
      // прошлые = WIN, текст убираем
      spr.texture = coinWinTexture ?? coinTexture;
      removeLabel(c);
    } else if (i === step - 1) {
      // актуальная (где курица) = PRIMARY, текст оставляем
      spr.texture = coinPrimaryTexture ?? coinTexture;
    } else {
      // будущие = GRAY, текст оставляем
      spr.texture = coinTexture;
    }
  }
}

// ---------- input ----------
async function onTap() {
  if (!world || !chicken) return;
  if (busy || inputLocked) return;
  if (step >= multipliers.length) return;

  busy = true;
  inputLocked = true;

  const outcome = await getOutcome();

  const floorY = DESIGN_H - SAFE_BOTTOM;
  const target = pipes[Math.min(step + 1, pipes.length - 1)];

  // jump now
  jumpTo(target.x, floorY);

  if (outcome.win) {
    const coinC = coins[Math.min(step, coins.length - 1)];
    const coinSpr = coinC ? ((coinC as any).coinSprite as PIXI.Sprite | undefined) : undefined;

    const SWAP_DELAY_MS = 400;

    setTimeout(() => {
      // текущая монета подсвечивается как primary (текущий шаг)
      if (coinSpr && coinPrimaryTexture) coinSpr.texture = coinPrimaryTexture;
      if (coinC) playCoinWin(coinC);
    }, SWAP_DELAY_MS);

    setTimeout(() => {
      step++;
      syncCoinTextures();
      cameraFollow();
      busy = false;
      inputLocked = false;
    }, 480);
  } else {
    const coinC = coins[Math.min(step, coins.length - 1)];
    const coinSpr = coinC ? ((coinC as any).coinSprite as PIXI.Sprite | undefined) : undefined;

    const SWAP_DELAY_MS = 400;

    // показываем огонь и меняем монету/лейбл
    setTimeout(() => {
      if (chicken && chickenDeadTexture) chicken.texture = chickenDeadTexture;
      if (coinC) {
        const lbl = (coinC as any).label as PIXI.Text | undefined;
        if (lbl) {
          coinC.removeChild(lbl);
          lbl.destroy();
          (coinC as any).label = null;
        }
      }

      if (coinSpr && coinLoseTexture) coinSpr.texture = coinLoseTexture;
      if (coinC) playCoinWin(coinC);

      const losePipe = pipes[Math.min(step + 1, pipes.length - 1)];
      if (losePipe) {
        const fireY = losePipe.y - losePipe.height + 33;
        spawnFireAt(losePipe.x, fireY);
        cameraShake(5, 5);
      }
    }, SWAP_DELAY_MS);

    // плавный проигрыш + плавный ресет
    setTimeout(() => {
      if (!chicken) {
        smoothResetToStart(() => {
          busy = false;
          inputLocked = false;
        });
        return;
      }

      const tl = gsap.timeline({
        onComplete: () => {
          smoothResetToStart(() => {
            busy = false;
            inputLocked = false;
          });
        },
      });

      // маленький «ступор»
      tl.to(chicken, { rotation: chicken.rotation + 0.06, duration: 0.08, ease: "power2.out" }, 0);
      // микро-пауза + лёгкое замедление ощущения
      tl.to({}, { duration: 0.12 }, 0.08);
      tl.to(chicken, { y: chicken.y + 6, duration: 0.10, ease: "power2.inOut" }, 0.08);

      // падение
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

      // исчезновение под конец
      tl.to(chicken, { alpha: 0, duration: 0.18, ease: "power2.out" }, "-=0.14");

      // огонь мягко гасим
      if (fireFx?.sprite) {
        tl.to(fireFx.sprite, { alpha: 0, duration: 0.22, ease: "power2.in" }, "-=0.20");
      }
      // финальная пауза, чтобы fade не был резким
      tl.to({}, { duration: 0.10 }, ">");
    }, 380);
  }
}

// ---------- lifecycle ----------
onMounted(async () => {
  if (!wrapRef.value) return;

  app = new PIXI.Application();
  await app.init({
    width: 1,
    height: 1,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    antialias: true,
    backgroundAlpha: 0,
  });

  // assets
  try {
    PIXI.Assets.add({ alias: "coinGray", src: coinUrl });
    await PIXI.Assets.load("coinGray");
    coinTexture = (PIXI.Assets.get("coinGray") as PIXI.Texture) ?? null;
  } catch {
    coinTexture = null;
  }

  try {
    PIXI.Assets.add({ alias: "pipe", src: pipeUrl });
    await PIXI.Assets.load("pipe");
    pipeTexture = (PIXI.Assets.get("pipe") as PIXI.Texture) ?? null;
  } catch {
    pipeTexture = null;
  }

  try {
    PIXI.Assets.add({ alias: "chicken", src: chickenUrl });
    await PIXI.Assets.load("chicken");
    chickenTexture = (PIXI.Assets.get("chicken") as PIXI.Texture) ?? null;
  } catch {
    chickenTexture = null;
  }

  try {
    PIXI.Assets.add({ alias: "chickenDead", src: chickenDeadUrl });
    await PIXI.Assets.load("chickenDead");
    chickenDeadTexture = (PIXI.Assets.get("chickenDead") as PIXI.Texture) ?? null;
  } catch {
    chickenDeadTexture = null;
  }

  try {
    PIXI.Assets.add({ alias: "stone", src: stoneUrl });
    await PIXI.Assets.load("stone");
    stoneTexture = (PIXI.Assets.get("stone") as PIXI.Texture) ?? null;
  } catch {
    stoneTexture = null;
  }

  try {
    PIXI.Assets.add({ alias: "nest", src: nestUrl });
    await PIXI.Assets.load("nest");
    nestTexture = (PIXI.Assets.get("nest") as PIXI.Texture) ?? null;
  } catch {
    nestTexture = null;
  }

  try {
    PIXI.Assets.add({ alias: "nestHd", src: nestHdUrl });
    await PIXI.Assets.load("nestHd");
    nestHdTexture = (PIXI.Assets.get("nestHd") as PIXI.Texture) ?? null;
  } catch {
    nestHdTexture = null;
  }

  try {
    PIXI.Assets.add({ alias: "coinPrimary", src: coinPrimaryUrl });
    await PIXI.Assets.load("coinPrimary");
    coinPrimaryTexture = (PIXI.Assets.get("coinPrimary") as PIXI.Texture) ?? null;
  } catch {
    coinPrimaryTexture = null;
  }

  try {
    PIXI.Assets.add({ alias: "coinLose", src: coinLoseUrl });
    await PIXI.Assets.load("coinLose");
    coinLoseTexture = (PIXI.Assets.get("coinLose") as PIXI.Texture) ?? null;
  } catch {
    coinLoseTexture = null;
  }

  try {
    PIXI.Assets.add({ alias: "coinWin", src: coinWinUrl });
    await PIXI.Assets.load("coinWin");
    coinWinTexture = (PIXI.Assets.get("coinWin") as PIXI.Texture) ?? null;
  } catch {
    coinWinTexture = null;
  }

  wrapRef.value.appendChild(app.canvas);

  // фикс для iOS/Telegram WebView: 100vh/100dvh может отличаться от видимой высоты
  updateAppHeight();
  const vv = window.visualViewport;
  const onVV = () => {
    updateAppHeight();
    layout();
  };
  if (vv) {
    vv.addEventListener("resize", onVV);
    vv.addEventListener("scroll", onVV);
    vvCleanup = () => {
      vv.removeEventListener("resize", onVV);
      vv.removeEventListener("scroll", onVV);
    };
  }

  Object.assign(app.canvas.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: "100%",
    height: `calc(100% + ${EXTRA_BOTTOM_PX}px)`,
    display: "block",
  });

  viewport = new PIXI.Container();
  world = new PIXI.Container();

  app.stage.addChild(viewport);
  viewport.addChild(world);

  app.stage.eventMode = "static";
  app.stage.on("pointerdown", onTap);

  // тик огня
  app.ticker.add(() => {
    if (!fireFx) return;
    try {
      fireFx.tick();
    } catch (e) {
      console.error("fireFx tick error", e);
    }
  });

  buildScene();

  rafId = requestAnimationFrame(() => layout());

  ro = new ResizeObserver(() => layout());
  ro.observe(wrapRef.value);

  window.addEventListener("resize", layout);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", layout);

  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
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

  killCoinTweens();
  destroyFire();
  busy = false;
  inputLocked = false;

  if (app) {
    app.ticker.stop();
    app.destroy(true);
    app = null;
  }
});
</script>

<template>
  <div class="wrap" ref="wrapRef"></div>
</template>

<style scoped>
.wrap {
  width: 100%;

  /* честная высота: выставляется из visualViewport в --app-height */
  height: var(--app-height, 100dvh);
  min-height: 320px;

  /* учёт safe-area (iPhone, некоторые webview) */
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;

  z-index: 0;
  background: #0d0d0f;

  /* при отрицательном viewport.y верх должен обрезаться, низ остаётся прибитым */
  overflow: hidden;
  position: relative;
}
</style>