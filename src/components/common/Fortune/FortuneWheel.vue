<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

export type WheelItem = {
  id: string | number;
  icon: string; // url
  type?: "win" | "lose";
  disabled?: boolean;

  fill?: string;
  opacity?: number;

  stroke?: string;
  strokeWidth?: number;

  loading?: boolean;

  gradient?: {
    kind?: "linear" | "radial";
    stops: Array<{ offset: number; color: string; opacity?: number }>;
    x1?: string; y1?: string; x2?: string; y2?: string; // linear
    cx?: string; cy?: string; r?: string; // radial
  };

  segClass?: string;
};

const props = withDefaults(
  defineProps<{
    items: WheelItem[];
    size?: number;

    spins?: number;
    durationMs?: number;

    gapDeg?: number;
    innerRadius?: number;
    ringOuter?: number;

    cornerOuterPx?: number;
    cornerInnerPx?: number;

    gapColor?: string;
    innerCapPx?: number;

    /** ✅ центр */
    centerRadiusPx?: number; // внешний радиус центра (у тебя 36)
    centerInnerRadiusPx?: number; // внутренний радиус (у тебя 31)
    centerGapPx?: number; // зазор между центром и лепестками

    pointerDeg?: number;
    phaseDeg?: number;

    modelValue?: number;

    winStroke?: string;
    winStrokeWidth?: number;
    winStrokeOpacity?: number;

    winGlow?: boolean;
  }>(),
  {
    size: 360,
    spins: 6,
    durationMs: 2800,

    gapDeg: 2.2,
    innerRadius: 0.43,
    ringOuter: 0.95,

    cornerOuterPx: 12,
    cornerInnerPx: 7,

    gapColor: "rgba(12,10,16,0.95)",
    innerCapPx: 3,

    // ✅ центр
    centerRadiusPx: 36,
    centerInnerRadiusPx: 31,
    centerGapPx: 0, // <-- вот он, крути 6..12

    pointerDeg: -90,
    phaseDeg: 0,

    winStroke: "rgba(255,255,255,0.18)",
    winStrokeWidth: 1.4,
    winStrokeOpacity: 1,
    winGlow: true,
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", v: number): void;
  (e: "spin-start"): void;
  (e: "spin-end", payload: { index: number; item: WheelItem }): void;
}>();

const count = computed(() => Math.max(1, props.items?.length || 1));
const stepDeg = computed(() => 360 / count.value);

const selectedIndex = ref<number>(
  Number.isFinite(props.modelValue) ? (props.modelValue as number) : 0
);
watch(
  () => props.modelValue,
  (v) => {
    if (Number.isFinite(v as number)) selectedIndex.value = v as number;
  }
);

const isSpinning = ref(false);
const rotationDeg = ref(0);
const transitionMs = ref(0);
const wheelEl = ref<HTMLDivElement | null>(null);

// ---------- math helpers ----------
function clampIndex(i: number) {
  const n = count.value;
  return ((i % n) + n) % n;
}
function mod360(x: number) {
  return ((x % 360) + 360) % 360;
}
function snapRotationForIndex(idx: number) {
  return -(props.phaseDeg + idx * stepDeg.value);
}
function exactFinalRotationFromCurrent(curRot: number, idx: number) {
  const curNorm = mod360(curRot);
  const base = curRot - curNorm;
  const target = snapRotationForIndex(idx);
  const targetNorm = mod360(target);
  const extraTurns = (props.spins ?? 0) * 360;
  return base + extraTurns + targetNorm;
}
function nearestIndexFromRotation(rot: number) {
  const rotNorm = mod360(rot);
  const val = (-(rotNorm) - props.phaseDeg) / stepDeg.value;
  return clampIndex(Math.round(val));
}

// ---------- geometry ----------
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function clampCornerPx(rIn: number, rOut: number, a0: number, a1: number, cornerPx: number) {
  const spanDeg = Math.abs(a1 - a0);
  const spanRad = (spanDeg * Math.PI) / 180;

  const maxByThickness = (rOut - rIn) * 0.45;
  const maxByOuterArc = rOut * spanRad * 0.45;
  const maxByInnerArc = rIn * spanRad * 0.45;

  const max = Math.max(0, Math.min(maxByThickness, maxByOuterArc, maxByInnerArc, 22));
  return Math.max(0, Math.min(cornerPx, max));
}

function roundedRingSectorPathSplit(
  cx: number,
  cy: number,
  rIn: number,
  rOut: number,
  a0: number,
  a1: number,
  cornerOut: number,
  cornerIn: number
) {
  const crOut = clampCornerPx(rIn, rOut, a0, a1, cornerOut);
  const crIn = clampCornerPx(rIn, rOut, a0, a1, cornerIn);

  if (crOut <= 0.001 && crIn <= 0.001) {
    const p0 = polar(cx, cy, rOut, a0);
    const p1 = polar(cx, cy, rOut, a1);
    const p2 = polar(cx, cy, rIn, a1);
    const p3 = polar(cx, cy, rIn, a0);
    const sweep = 1;
    const large = a1 - a0 <= 180 ? 0 : 1;
    return [
      `M ${p0.x} ${p0.y}`,
      `A ${rOut} ${rOut} 0 ${large} ${sweep} ${p1.x} ${p1.y}`,
      `L ${p2.x} ${p2.y}`,
      `A ${rIn} ${rIn} 0 ${large} ${1 - sweep} ${p3.x} ${p3.y}`,
      "Z",
    ].join(" ");
  }

  const tOut = crOut / rOut;
  const tIn = crIn / rIn;

  const a0o = a0 + (tOut * 180) / Math.PI;
  const a1o = a1 - (tOut * 180) / Math.PI;

  const a1i = a1 - (tIn * 180) / Math.PI;
  const a0i = a0 + (tIn * 180) / Math.PI;

  const O0r = polar(cx, cy, rOut - crOut, a0);
  const O1r = polar(cx, cy, rOut - crOut, a1);

  const I1r = polar(cx, cy, rIn + crIn, a1);
  const I0r = polar(cx, cy, rIn + crIn, a0);

  const O0a = polar(cx, cy, rOut, a0o);
  const O1a = polar(cx, cy, rOut, a1o);

  const I1a = polar(cx, cy, rIn, a1i);
  const I0a = polar(cx, cy, rIn, a0i);

  const span = a1 - a0;
  const largeOuter = span <= 180 ? 0 : 1;
  const largeInner = largeOuter;

  const parts: string[] = [];

  parts.push(`M ${O0r.x} ${O0r.y}`);
  if (crOut > 0.001) parts.push(`A ${crOut} ${crOut} 0 0 1 ${O0a.x} ${O0a.y}`);
  else {
    const p = polar(cx, cy, rOut, a0);
    parts.push(`L ${p.x} ${p.y}`);
  }

  parts.push(`A ${rOut} ${rOut} 0 ${largeOuter} 1 ${O1a.x} ${O1a.y}`);

  if (crOut > 0.001) parts.push(`A ${crOut} ${crOut} 0 0 1 ${O1r.x} ${O1r.y}`);
  else {
    const p = polar(cx, cy, rOut, a1);
    parts.push(`L ${p.x} ${p.y}`);
  }

  parts.push(`L ${I1r.x} ${I1r.y}`);

  if (crIn > 0.001) parts.push(`A ${crIn} ${crIn} 0 0 1 ${I1a.x} ${I1a.y}`);
  else parts.push(`L ${polar(cx, cy, rIn, a1).x} ${polar(cx, cy, rIn, a1).y}`);

  parts.push(`A ${rIn} ${rIn} 0 ${largeInner} 0 ${I0a.x} ${I0a.y}`);

  if (crIn > 0.001) parts.push(`A ${crIn} ${crIn} 0 0 1 ${I0r.x} ${I0r.y}`);
  else parts.push(`L ${polar(cx, cy, rIn, a0).x} ${polar(cx, cy, rIn, a0).y}`);

  parts.push("Z");
  return parts.join(" ");
}

type Seg = {
  i: number;
  mid: number;
  d: string;
  iconPos: { x: number; y: number };
  item: WheelItem;
  gradId: string;
};

const cx = 100;
const cy = 100;

const rOut = computed(() => 100 * (props.ringOuter ?? 0.95));

/**
 * ✅ КЛЮЧЕВО:
 * сегменты начинаются НЕ “из центра”, а от края центрального круга + отступ
 */
const rIn = computed(() => {
  const byRatio = 100 * (props.innerRadius ?? 0.43);
  const byCenter = (props.centerRadiusPx ?? 36) + (props.centerGapPx ?? 0);
  return Math.min(99, Math.max(byRatio, byCenter));
});

const segments = computed<Seg[]>(() => {
  const gap = props.gapDeg ?? 0;
  const step = stepDeg.value;
  const out: Seg[] = [];

  for (let i = 0; i < count.value; i++) {
    const item = props.items?.[i] ?? ({ id: i, icon: "" } as WheelItem);

    const mid = (props.pointerDeg ?? -90) + (props.phaseDeg ?? 0) + i * step;
    const a0 = mid - step / 2 + gap / 2;
    const a1 = mid + step / 2 - gap / 2;

    const d = roundedRingSectorPathSplit(
      cx,
      cy,
      rIn.value,
      rOut.value,
      a0,
      a1,
      props.cornerOuterPx ?? 0,
      props.cornerInnerPx ?? 0
    );

    const iconR = rIn.value + (rOut.value - rIn.value) * 0.56;
    const iconPos = polar(cx, cy, iconR, mid);

    out.push({
      i,
      mid,
      d,
      iconPos,
      item,
      gradId: `fwSegGrad_${i}`,
    });
  }

  return out;
});

// ---------- icons ----------
const ICON_PX = 52;
function iconStyle(seg: Seg) {
    const size = props.size ?? 360;
    const pxX = (seg.iconPos.x / 200) * size;
    const pxY = (seg.iconPos.y / 200) * size;
    const wobble = isSpinning.value ? 0.96 : 1;

    return {
    left: `${pxX}px`,
    top: `${pxY}px`,
    width: `${ICON_PX}px`,
    height: `${ICON_PX}px`,
    transform: `
        translate(-50%, -50%)
        rotate(${-rotationDeg.value}deg)
        scale(${wobble})
    `,
    };
}

// ---------- paint ----------
function defaultFillFor(item: WheelItem) {
  return item.type === "win" ? "url(#fwWinDefault)" : "url(#fwLoseDefault)";
}
function segFill(seg: Seg) {
  const it = seg.item;
  if (it.gradient && it.gradient.stops?.length) return `url(#${seg.gradId})`;
  if (it.fill) return it.fill;
  return defaultFillFor(it);
}
function segOpacity(seg: Seg) {
  const it = seg.item;
  if (typeof it.opacity === "number") return it.opacity;
  return it.disabled ? 0.55 : 1;
}

// ---------- HARD SNAP ----------
function hardSnapToIndex(idx: number) {
  const exact = snapRotationForIndex(idx);
  const cur = rotationDeg.value;
  const curNorm = mod360(cur);
  const base = cur - curNorm;
  const exactNorm = mod360(exact);
  transitionMs.value = 0;
  rotationDeg.value = base + exactNorm;
}

function waitTransitionEnd(ms: number) {
  return new Promise<void>((resolve) => {
    const el = wheelEl.value;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      if (el) el.removeEventListener("transitionend", onEnd);
      resolve();
    };

    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== "transform") return;
      finish();
    };

    if (el) el.addEventListener("transitionend", onEnd);
    window.setTimeout(finish, ms + 140);
  });
}

// ---------- API: spin ----------
async function spinTo(index: number) {
  const idx = clampIndex(index);
  const item = props.items[idx];
  if (!item || item.disabled) return false;
  if (isSpinning.value) return false;

  isSpinning.value = true;
  emit("spin-start");

  // стартовый рывок
    transitionMs.value = 120;
    rotationDeg.value += 12;

    await nextTick();

    // основная прокрутка
    transitionMs.value = props.durationMs ?? 2400;
    rotationDeg.value = exactFinalRotationFromCurrent(rotationDeg.value, idx);

  selectedIndex.value = idx;
  emit("update:modelValue", idx);

  await waitTransitionEnd(props.durationMs ?? 2400);

  const realIdx = nearestIndexFromRotation(rotationDeg.value);
  selectedIndex.value = realIdx;
  emit("update:modelValue", realIdx);

  await nextTick();
  hardSnapToIndex(realIdx);

  // micro bounce
rotationDeg.value -= 1.2;
await nextTick();
requestAnimationFrame(() => {
  transitionMs.value = 220;
  rotationDeg.value += 1.2;
});

  isSpinning.value = false;
  emit("spin-end", { index: realIdx, item: props.items[realIdx] });
  return true;
}

function spinRandom() {
  const enabled = props.items
    .map((it, i) => ({ it, i }))
    .filter((x) => x.it && !x.it.disabled)
    .map((x) => x.i);

  if (!enabled.length) return Promise.resolve(false);

  const idx = enabled[Math.floor(Math.random() * enabled.length)];
  return spinTo(idx);
}

defineExpose({ spinTo, spinRandom, isSpinning });
</script>

<template>
  <div class="fw" :style="{ width: props.size + 'px', height: props.size + 'px' }">
    <!-- pointer НЕ крутится -->
    <div class="fw-pointer" aria-hidden="true">
      <svg width="21" height="18" viewBox="0 0 21 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M0.794382 6.64766C-1.08838 3.96861 0.587214 0 3.6011 0L17.3989 0C20.4128 0 22.0884 3.96861 20.2056 6.64766L13.3067 16.4644C11.8678 18.5119 9.13219 18.5119 7.69329 16.4644L0.794382 6.64766Z"
          fill="white"
        />
      </svg>
    </div>

    <!-- ВРАЩАЕМОЕ: сегменты + иконки -->
    <div
      ref="wheelEl"
      class="fw-wheel"
      :style="{
        transform: `rotate(${rotationDeg}deg)`,
        transition: transitionMs
            ? `transform ${transitionMs}ms cubic-bezier(0.08, 0.9, 0.15, 1.02)`
            : 'none',
      }"
    >
      <svg class="fw-svg" viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <filter id="fwInnerShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feOffset dx="2" dy="3" />
            <feGaussianBlur stdDeviation="3.4" result="blur" />
            <feComposite in="blur" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="innerShadow" />
            <feColorMatrix
              in="innerShadow"
              type="matrix"
              values="
                1 0 0 0 1
                0 1 0 0 1
                0 0 1 0 1
                0 0 0 0.4 0
              "
            />
            <feComposite in2="SourceGraphic" operator="over" />
          </filter>

          <radialGradient id="fwWinDefault" cx="50%" cy="35%" r="90%">
            <stop offset="0%" stop-color="rgba(136, 20, 120, 0.85)" />
            <stop offset="55%" stop-color="rgba(92, 10, 78, 0.68)" />
            <stop offset="100%" stop-color="rgba(40, 8, 38, 0.65)" />
          </radialGradient>

          <radialGradient id="fwLoseDefault" cx="50%" cy="40%" r="100%">
            <stop offset="0%" stop-color="rgba(255, 255, 255, 0.08)" />
            <stop offset="100%" stop-color="rgba(255, 255, 255, 0.08)" />
          </radialGradient>
        </defs>

        <!-- “фон щелей” -->
        <circle cx="100" cy="100" r="100" :fill="props.gapColor" />

        <!-- сегменты -->
        <template v-for="seg in segments" :key="seg.i">
          <path
            class="fw-seg"
            :class="[
                seg.item.type === 'win' ? 'win' : 'lose',
                seg.i === selectedIndex && !isSpinning ? 'is-active' : '',
                seg.item.disabled ? 'is-disabled' : '',
            ]"
            :d="seg.d"
            :fill="segFill(seg)"
            :opacity="segOpacity(seg)"
            :filter="seg.item.type === 'lose' ? 'url(#fwInnerShadow)' : undefined"
            :stroke="seg.item.type === 'win' ? (seg.item.stroke ?? 'rgba(255,255,255,0)') : 'none'"
            :stroke-width="seg.item.strokeWidth ?? 0.9"
            :stroke-opacity="0.6"
            stroke-linejoin="round"
          />
        </template>

        <circle
            cx="100"
            cy="100"
            :r="Math.max(0, rIn - (props.innerCapPx ?? 0))"
            :fill="props.gapColor"
        />
      </svg>

      <!-- иконки (контр-вращение) -->
      <div class="fw-icons">
        <div
          v-for="seg in segments"
          :key="'ic_' + seg.i"
          class="fw-icon"
          :class="{ loading: seg.item.loading }"
          :style="{
            ...iconStyle(seg),
            opacity: seg.item.disabled ? 0.35 : 1,
          }"
        >
          <div class="load"></div>
          <img :src="seg.item.icon" alt="" draggable="false" />
        </div>
      </div>
    </div>

    <div class="fw-center" aria-hidden="true">
      <svg class="fw-center-svg" viewBox="0 0 200 200">
        <defs>
          <symbol id="centerIcon" viewBox="0 0 48 48">
            <path opacity="0.34" d="M22.9791 0C22.8755 0 22.774 5.11764e-08 22.6748 0.00223557C17.1715 0.0178842 12.9117 0.487343 9.65069 1.65875C2.26439 4.30784 0 10.5561 0 23.3008C0 41.7729 4.7603 46.5994 22.9791 46.5994C35.0353 46.5994 41.1979 44.4868 43.987 37.7043C44.977 35.2988 45.5437 32.3032 45.7972 28.6079C45.9097 26.9782 45.9604 25.2144 45.9604 23.3008C45.9604 4.82872 41.2001 0.00223557 22.9813 0.00223557L22.9791 0ZM33.2096 7.98751C32.4909 7.25873 32.4909 6.07614 33.2096 5.34512C33.9284 4.61634 35.0948 4.61634 35.8158 5.34512C39.0592 8.63357 39.0592 13.9854 35.8158 17.2738C35.4564 17.6382 34.9824 17.8216 34.5127 17.8216C34.0431 17.8216 33.569 17.6382 33.2096 17.2738C32.4909 16.5451 32.4909 15.3625 33.2096 14.6315C35.0154 12.8006 35.0154 9.81839 33.2096 7.98751ZM22.8203 7.98751C22.1015 7.25873 22.1015 6.07614 22.8203 5.34512C23.5391 4.61634 24.7055 4.61634 25.4265 5.34512C28.6698 8.63357 28.6698 13.9854 25.4265 17.2738C25.0671 17.6382 24.5952 17.8216 24.1234 17.8216C23.6516 17.8216 23.1797 17.6382 22.8203 17.2738C22.1015 16.5451 22.1015 15.3625 22.8203 14.6315C24.6261 12.8006 24.6261 9.81839 22.8203 7.98751ZM15.3128 31.4046C11.2801 31.4046 8.00145 28.0803 8.00145 23.9916C8.00145 19.9028 11.2801 16.5786 15.3128 16.5786C16.3314 16.5786 17.1538 17.4147 17.1538 18.4453C17.1538 19.4758 16.3292 20.3119 15.3128 20.3119C13.313 20.3119 11.688 21.9617 11.688 23.9893C11.688 26.017 13.313 27.6645 15.3128 27.6645C16.3314 27.6645 17.1538 28.5006 17.1538 29.5312C17.1538 30.5618 16.3292 31.4001 15.3128 31.4001V31.4046ZM37.1916 25.8046H21.7554C22.3705 26.891 22.7233 28.1452 22.7233 29.482V29.4999L22.6748 34.8786C22.6748 36.9039 24.302 38.5515 26.2996 38.5515C28.2972 38.5515 29.9266 36.9017 29.9266 34.8741V29.3635C29.9266 28.333 30.7512 27.4969 31.7677 27.4969C32.7841 27.4969 33.6109 28.333 33.6109 29.3635V34.8741C33.6109 38.9628 30.3301 42.2871 26.2996 42.2871C22.2691 42.2871 18.9883 38.9606 18.9883 34.8741V34.8674C18.9883 34.8629 18.9883 34.8584 18.9883 34.8584L19.039 29.4798C19.0368 27.4522 17.4118 25.8046 15.412 25.8046C14.3956 25.8046 13.5709 24.9685 13.5709 23.9379C13.5709 22.9074 14.3956 22.0713 15.412 22.0713H37.1916C38.2081 22.0713 39.0327 22.9074 39.0327 23.9379C39.0327 24.9685 38.2081 25.8046 37.1916 25.8046Z" fill="#C53AA2" fill-opacity="0.43"/>
          </symbol>

          <radialGradient id="fwCenter" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stop-color="#30112A" />
          </radialGradient>
        </defs>

        <circle cx="100" cy="100" :r="props.centerInnerRadiusPx" fill="url(#fwCenter)" />
        <use href="#centerIcon" x="84" y="84" width="34" height="34" />
      </svg>
    </div>
  </div>
</template>

<style scoped lang="scss">
.fw {
  width: fit-content;
  height: fit-content;
  position: relative;
  display: grid;
  place-items: center;
  user-select: none;
  margin: auto;
}

.fw-wheel {
  position: relative;
  width: 100%;
  height: 100%;
  will-change: transform;
  transform-origin: 50% 50%;
}

.fw-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.fw-icons {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.fw-icon {
  position: absolute;
  display: grid;
  place-items: center;


  img {
    width: 48px;
    min-width: 48px;
    height: 48px;
    object-fit: contain;
    filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.35));

    @media screen and (max-height: 640px) {
      width: 38px;
      height: 38px;
      margin-top: -16px;
      margin-left: 4px;
    }
  }

  &.loading {
    img {
        display: none;
    }
    .load {
        width: 30px;
        height: 30px;
        border: 2px solid var(--bg-10);
        border-top-color: var(--color-white);
        opacity: .3;
        border-radius: 50%;
        transform-origin: center;
        animation: spin 1.2s linear infinite;
    }

    @keyframes spin{ to{ transform:rotate(360deg); } }
  }
}

/* стрелка */
.fw-pointer {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 18px;
  height: 14px;
  z-index: 5;

  svg {
    width: 18px;
    height: 14px;
    filter: drop-shadow(0 12px 16px rgba(0, 0, 0, 0.45));
  }
}

/* НЕ вращаемый центр */
.fw-center {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 4;
  pointer-events: none;
}

.fw-center-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.fw-seg.is-disabled {
  filter: saturate(0.7);
}

.fw-seg.is-active {
  animation: winPulse 1.2s ease-out;
}

@keyframes winPulse {
  0%   { filter: brightness(1); }
  40%  { filter: brightness(1.25); }
  100% { filter: brightness(1); }
}
</style>