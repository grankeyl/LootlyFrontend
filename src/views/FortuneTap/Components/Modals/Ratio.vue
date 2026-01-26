<template>
  <div
    ref="rootEl"
    class="ratio"
    :class="{ dragging, disabled: props.disabled }"
    role="slider"
    :aria-valuemin="minValue"
    :aria-valuemax="maxValue"
    :aria-valuenow="leftValue"
    aria-label="ratio"
    tabindex="0"
    @pointerdown="onPointerDown"
    @keydown="onKeyDown"
  >
    <div ref="trackEl" class="track">
      <!-- LEFT BAR -->
      <div
        class="bar left"
        :class="{ capOnly: leftBarPx <= 0.5 }"
        :style="{ width: leftBarPx + 'px' }"
      >
        <div class="inLabel leftIn" :class="{ show: leftInside }">
          <span class="name leftName">{{ leftLabel }}</span>
          <span class="pct leftPct">{{ leftText }}</span>
        </div>
      </div>

      <!-- RIGHT BAR -->
      <div
        class="bar right"
        :class="{ capOnly: rightBarPx <= 0.5 }"
        :style="{ width: rightBarPx + 'px' }"
      >
        <div class="inLabel rightIn" :class="{ show: rightInside }">
          <span class="pct rightPct">{{ rightText }}</span>
          <span class="name rightName">{{ rightLabel }}</span>
        </div>
      </div>

      <!-- OUTSIDE LABELS -->
      <div
        class="outLabel leftOut"
        :class="{ show: !leftInside }"
        :style="{ left: leftOutX + 'px', top: leftOutTop + 'px' }"
      >
        <span class="name leftName">{{ leftLabel }}</span>
        <span class="pct leftPct">{{ leftText }}</span>
      </div>

      <div
        class="outLabel rightOut"
        :class="{ show: !rightInside }"
        :style="{ left: rightOutX + 'px', top: rightOutTop + 'px' }"
      >
        <span class="pct rightPct">{{ rightText }}</span>
        <span class="name rightName">{{ rightLabel }}</span>
      </div>

      <!-- HANDLE -->
      <div class="handle" :style="{ left: handleLeftPx + 'px' }" @pointerdown.stop="onPointerDown">
        <div class="handlePill"></div>
      </div>

      <!-- GAP -->
      <div class="gap" :style="{ left: gapLeftPx + 'px', width: gapPx + 'px' }"></div>

      <!-- SIZERS -->
      <div class="sizers">
        <div ref="leftSizerEl" class="sizer">
          <span class="name leftName">{{ leftLabel }}</span>
          <span class="pct leftPct">{{ leftText }}</span>
        </div>

        <div ref="rightSizerEl" class="sizer">
          <span class="pct rightPct">{{ rightText }}</span>
          <span class="name rightName">{{ rightLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, nextTick, ref, watch } from "vue";
import { useTranslation } from "i18next-vue";

const { t } = useTranslation();

type Props = {
  modelValue: number;

  /** min/max from backend */
  minValue?: number; // default 0.00001
  maxValue?: number; // default 99

  /** snapping */
  step?: number; // default 0.1
  decimals?: number; // default 1 (если захочешь фиксировать)

  leftLabel?: string;
  rightLabel?: string;

  heightPx?: number;
  radiusPx?: number;

  handleWidthPx?: number;
  gapPx?: number;

  /** label switch logic */
  hysteresisPx?: number;

  /** visual cosmetics for edges */
  capPx?: number; // end-caps width (beauty on edges)
  edgePadPx?: number; // keep handle/gap away from hard edge
  curveK?: number; // middle is wider with bigger K (2..6 usually)

  disabled?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  minValue: 0.00001,
  maxValue: 99,

  step: 0.1,
  decimals: 1,

  // IMPORTANT: тут НЕЛЬЗЯ использовать t(), потому что withDefaults хоистится
  leftLabel: "",
  rightLabel: "",

  heightPx: 52,
  radiusPx: 10,
  handleWidthPx: 36,
  gapPx: 10,

  hysteresisPx: 10,

  capPx: 12,
  edgePadPx: 6,
  curveK: 3.4,

  disabled: false,
});

const emit = defineEmits<{
  (e: "update:modelValue", v: number): void;
  (e: "change", v: number): void;
}>();

const trackEl = ref<HTMLElement | null>(null);

const leftSizerEl = ref<HTMLElement | null>(null);
const rightSizerEl = ref<HTMLElement | null>(null);

const dragging = ref(false);
let pointerId: number | null = null;

const trackW = ref(1);

const leftNeedW = ref(0);
const rightNeedW = ref(0);

const leftInsideState = ref(true);
const rightInsideState = ref(true);

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

function roundToStep(v: number) {
  const s = Math.max(1e-12, props.step);
  return Math.round(v / s) * s;
}

function autoDecimals(v: number) {
  const av = Math.abs(v);
  if (av >= 10) return 1;
  if (av >= 1) return 1;
  if (av >= 0.1) return 2;
  if (av >= 0.01) return 3;
  if (av >= 0.001) return 4;
  return 5;
}

function formatVal(v: number) {
  const d = Math.min(4, autoDecimals(v));
  const s = v.toFixed(d);
  return `${s.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1")}%`;
}

const minValue = computed(() => Math.min(props.minValue, props.maxValue));
const maxValue = computed(() => Math.max(props.minValue, props.maxValue));

function clampStrict(v: number) {
  return clamp(roundToStep(v), minValue.value, maxValue.value);
}

const leftValue = computed(() => clampStrict(props.modelValue));
const rightValue = computed(() => clampStrict(maxValue.value + minValue.value - leftValue.value)); // symmetric

// ✅ лейблы с i18n — уже в setup, можно спокойно дергать t()
const leftLabel = computed(() => props.leftLabel || t("fortuneTap.modals.gift.ratio.win"));
const rightLabel = computed(() => props.rightLabel || t("fortuneTap.modals.gift.ratio.lose"));

const leftText = computed(() => formatVal(leftValue.value));
const rightText = computed(() => formatVal(rightValue.value));

function measureTrack() {
  if (!trackEl.value) return;
  const r = trackEl.value.getBoundingClientRect();
  trackW.value = Math.max(1, r.width);
}

function measureLabels() {
  const lp = leftSizerEl.value?.getBoundingClientRect().width ?? 0;
  const rp = rightSizerEl.value?.getBoundingClientRect().width ?? 0;

  leftNeedW.value = Math.ceil(lp + 20 + 8);
  rightNeedW.value = Math.ceil(rp + 20 + 8);
}

async function measureAll() {
  measureTrack();
  await nextTick();
  measureLabels();
  updateInsideStates();
}

let ro: ResizeObserver | null = null;

onMounted(async () => {
  await measureAll();

  ro = new ResizeObserver(() => measureAll());
  if (trackEl.value) ro.observe(trackEl.value);
  window.addEventListener("resize", measureAll, { passive: true });
});

onBeforeUnmount(() => {
  if (ro && trackEl.value) ro.unobserve(trackEl.value);
  ro = null;
  window.removeEventListener("resize", measureAll);
  detachDocListeners();
});

watch([leftText, rightText, leftLabel, rightLabel], async () => {
  await nextTick();
  measureLabels();
  updateInsideStates();
});

/**
 * Non-linear mapping:
 * u in [0..1] is normalized value
 * t in [0..1] is normalized position, stretched in the middle (more pixels)
 */
function atanh(x: number) {
  const xx = clamp(x, -0.999999999, 0.999999999);
  return 0.5 * Math.log((1 + xx) / (1 - xx));
}

function valueU() {
  const span = maxValue.value - minValue.value;
  return span <= 0 ? 0.5 : (leftValue.value - minValue.value) / span;
}

function uToT(u: number) {
  const k = Math.max(0.01, props.curveK);
  const a = Math.tanh(k / 2);
  return 0.5 + Math.tanh(k * (u - 0.5)) / (2 * a);
}

function tToU(t: number) {
  const k = Math.max(0.01, props.curveK);
  const a = Math.tanh(k / 2);
  return 0.5 + atanh((2 * t - 1) * a) / k;
}

const usableW = computed(() => trackW.value);
const handleW = computed(() => props.handleWidthPx);
const gapPx = computed(() => props.gapPx);

const edgePad = computed(() => Math.max(0, props.edgePadPx));
const movableW = computed(() => Math.max(1, usableW.value - edgePad.value * 2));

const tPos = computed(() => uToT(clamp(valueU(), 0, 1))); // [0..1]
const handleCenterPx = computed(() => edgePad.value + movableW.value * tPos.value);

const handleLeftPx = computed(() =>
  clamp(handleCenterPx.value - handleW.value / 2, 0, usableW.value - handleW.value)
);

const gapLeftPx = computed(() => clamp(handleCenterPx.value - gapPx.value / 2, 0, usableW.value));
const leftBarPx = computed(() => clamp(gapLeftPx.value, 0, usableW.value));

const rightBarPx = computed(() => {
  const rightStart = clamp(handleCenterPx.value + gapPx.value / 2, 0, usableW.value);
  return clamp(usableW.value - rightStart, 0, usableW.value);
});

function updateInsideStates() {
  const h = props.hysteresisPx;

  if (leftInsideState.value) {
    if (leftBarPx.value < leftNeedW.value - h) leftInsideState.value = false;
  } else {
    if (leftBarPx.value > leftNeedW.value + h) leftInsideState.value = true;
  }

  if (rightInsideState.value) {
    if (rightBarPx.value < rightNeedW.value - h) rightInsideState.value = false;
  } else {
    if (rightBarPx.value > rightNeedW.value + h) rightInsideState.value = true;
  }
}

watch([leftBarPx, rightBarPx, leftNeedW, rightNeedW], () => updateInsideStates());

const leftInside = computed(() => leftInsideState.value);
const rightInside = computed(() => rightInsideState.value);

const leftOutW = computed(() => (leftSizerEl.value?.getBoundingClientRect().width ?? 0) + 8);
const rightOutW = computed(() => (rightSizerEl.value?.getBoundingClientRect().width ?? 0) + 8);

const OUT_TOP = -36;
const OUT_TOP_2 = -14;

const leftOutXRaw = computed(() =>
  clamp(handleCenterPx.value - leftOutW.value / 2, 0, Math.max(0, usableW.value - leftOutW.value))
);

const rightOutXRaw = computed(() =>
  clamp(handleCenterPx.value - rightOutW.value / 2, 0, Math.max(0, usableW.value - rightOutW.value))
);

const overlap = computed(() => {
  if (leftInside.value || rightInside.value) return false;
  const l1 = leftOutXRaw.value;
  const r1 = l1 + leftOutW.value;
  const l2 = rightOutXRaw.value;
  const r2 = l2 + rightOutW.value;
  return r1 + 12 > l2 && r2 + 12 > l1;
});

const leftOutX = computed(() => leftOutXRaw.value);
const rightOutX = computed(() => rightOutXRaw.value);

const leftOutTop = computed(() => OUT_TOP);
const rightOutTop = computed(() => (overlap.value ? OUT_TOP_2 : OUT_TOP));

function pxToValue(clientX: number) {
  if (!trackEl.value) return leftValue.value;
  const r = trackEl.value.getBoundingClientRect();
  const x = clamp(clientX - r.left, 0, r.width);

  const t = movableW.value <= 0 ? 0.5 : clamp((x - edgePad.value) / movableW.value, 0, 1);
  const u = clamp(tToU(t), 0, 1);

  const span = maxValue.value - minValue.value;
  const raw = span <= 0 ? minValue.value : minValue.value + u * span;

  return clampStrict(raw);
}

function setValue(v: number, isFinal = false) {
  const nv = clampStrict(v);
  emit("update:modelValue", nv);
  if (isFinal) emit("change", nv);
}

function attachDocListeners() {
  document.addEventListener("pointermove", onDocMove, { passive: false });
  document.addEventListener("pointerup", onDocUp, { passive: false });
  document.addEventListener("pointercancel", onDocUp, { passive: false });
}
function detachDocListeners() {
  document.removeEventListener("pointermove", onDocMove as any);
  document.removeEventListener("pointerup", onDocUp as any);
  document.removeEventListener("pointercancel", onDocUp as any);
}

function onPointerDown(e: PointerEvent) {
  if (props.disabled) return;
  dragging.value = true;
  pointerId = e.pointerId;
  (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);

  setValue(pxToValue(e.clientX), false);

  attachDocListeners();
  e.preventDefault();
}

function onDocMove(e: PointerEvent) {
  if (!dragging.value) return;
  if (pointerId !== null && e.pointerId !== pointerId) return;
  setValue(pxToValue(e.clientX), false);
  e.preventDefault();
}

function onDocUp(e: PointerEvent) {
  if (!dragging.value) return;
  if (pointerId !== null && e.pointerId !== pointerId) return;

  dragging.value = false;
  pointerId = null;
  detachDocListeners();
  setValue(pxToValue(e.clientX), true);
  e.preventDefault();
}

function onKeyDown(e: KeyboardEvent) {
  if (props.disabled) return;
  const step = e.shiftKey ? props.step * 5 : props.step;

  if (e.key === "ArrowLeft") {
    setValue(leftValue.value - step, true);
    e.preventDefault();
  }
  if (e.key === "ArrowRight") {
    setValue(leftValue.value + step, true);
    e.preventDefault();
  }
  if (e.key === "Home") {
    setValue(minValue.value, true);
    e.preventDefault();
  }
  if (e.key === "End") {
    setValue(maxValue.value, true);
    e.preventDefault();
  }
}
</script>

<style scoped>
.ratio {
  --h: v-bind("props.heightPx + 'px'");
  --r: v-bind("props.radiusPx + 'px'");
  --handleW: v-bind("props.handleWidthPx + 'px'");
  --gap: v-bind("props.gapPx + 'px'");
  --cap: v-bind("props.capPx + 'px'");

  position: relative;
  display: block;
  width: 100%;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  outline: none;
  padding: 0 14px;
}

.ratio.disabled {
  opacity: 0.55;
  pointer-events: none;
}

.track {
  position: relative;
  width: 100%;
  height: 38px;
  margin-top: 50px;
  margin-bottom: 30px;
}

/* Bars can be 0px — but end-caps keep it pretty at edges */
.bar {
  position: absolute;
  top: 0;
  height: 38px;
  border-radius: var(--r);
  overflow: visible; /* allow caps */
  transform: translateZ(0);
  will-change: width;
}

/* caps */
.bar::after {
  content: "";
  position: absolute;
  top: 0;
  height: 100%;
  width: var(--cap);
  border-radius: var(--r);
  pointer-events: none;
  opacity: 1;
}
.left::after {
  left: 0;
  background: #d640a8;
}
.right::after {
  right: 0;
  background: #2a2029;
}

/* If width is not zero, bar body is visible; if width ~0, only cap still shows */
.left {
  left: 0;
  background: #d640a8;
}
.right {
  right: 0;
  background: #2a2029;
}

/* When width > 0, let it animate smoothly */
.ratio:not(.dragging) .bar {
  transition: width 420ms cubic-bezier(0.16, 1, 0.3, 1);
}
.ratio.dragging .bar {
  transition: none;
}

.gap {
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: calc(var(--r) - 2px);
  pointer-events: none;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.handle {
  position: absolute;
  top: 50%;
  width: var(--handleW);
  height: calc(var(--h) + 10px);
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  cursor: ew-resize;
  z-index: 5;
  will-change: left;
}

.ratio:not(.dragging) .handle {
  transition: left 420ms cubic-bezier(0.16, 1, 0.3, 1);
}
.ratio.dragging .handle {
  transition: none;
}

.handlePill {
  width: 3px;
  height: 30px;
  margin-top: 2px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}

.inLabel {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;

  opacity: 0;
  transform: translateY(-8px) scale(0.98);
  filter: blur(2px);
  transition: opacity 220ms ease, transform 220ms ease, filter 220ms ease;
  pointer-events: none;
}
.inLabel.show {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0px);
  pointer-events: auto;
}

.leftIn {
  justify-content: flex-start;
}
.rightIn {
  justify-content: flex-end;
}

.name {
  opacity: 0.35;
  font-family: "SFRounded", sans-serif;
  font-size: 18px;
  font-weight: 600;
}
.pct {
  color: #170111;
  font-family: "SFRounded", sans-serif;
  font-size: 18px;
  font-weight: 600;
}

.rightPct {
  color: rgba(255, 255, 255, 0.92);
}
.rightName {
  opacity: 0.35;
  color: rgba(255, 255, 255, 0.92);
}

.outLabel {
  position: absolute;
  display: inline-flex;
  align-items: baseline;
  gap: 10px;

  opacity: 0;
  transform: translateY(10px) scale(0.98);
  filter: blur(2px);
  transition: opacity 220ms ease, transform 220ms ease, filter 220ms ease;
  pointer-events: none;
  white-space: nowrap;
  will-change: left, top;
}
.outLabel.show {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0px);
  pointer-events: auto;
}

.leftOut .name,
.leftOut .pct,
.rightOut .name,
.rightOut .pct {
  color: #fff;
  opacity: 1;
}

.sizers {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
}
.sizer {
  position: absolute;
  top: -9999px;
  left: -9999px;
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
  white-space: nowrap;
}
</style>