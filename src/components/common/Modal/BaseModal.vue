<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, nextTick, computed } from 'vue';
import { useModal } from './useModal';
import type { ModalOptions } from './modal.types';

const props = defineProps<{
  id: number;
  component: any;
  props?: Record<string, any>;
  options?: ModalOptions;
}>();

const { close: closeRaw, dismiss: dismissRaw } = useModal();

const isActive  = ref(false);
const isClosing = ref(false);

const layer = computed(() => props.props?._layer ?? 0);
const baseZ = computed(() => 1000 + layer.value * 2);

const overlay = ref<HTMLElement | null>(null);
const panel   = ref<HTMLElement | null>(null);

const opts: ModalOptions = {
  clickToClose: true,
  escToClose: true,
  width: 560,
  ariaLabel: 'Modal dialog',
  ...props.options,
};

function onKey(e: KeyboardEvent) {
  if (opts.escToClose && e.key === 'Escape') requestDismiss('esc');
}
function onOverlayClick(e?: MouseEvent) {
  if (!e || !opts.clickToClose) return;
  if (e.target === e.currentTarget) requestDismiss('overlay');
}

// двойной rAF — разводим кадры
function nextFrame(): Promise<void> {
  return new Promise((res: any) =>
    requestAnimationFrame(() => requestAnimationFrame(res))
  );
}

onMounted(async () => {
  document.addEventListener('keydown', onKey);
  await nextTick();

  // чистим инлайны, если были
  if (panel.value)   panel.value.style.transform = '';
  if (overlay.value) overlay.value.style.opacity = '';

  // активируем после фиксации стилей, чтобы сработал transition
  panel.value?.offsetHeight;
  await nextFrame();
  isActive.value = true;

  attachDrag();
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
  detachDrag();
});

// ждём окончания выхода по transform панели
function waitForLeave(): Promise<void> {
  return new Promise((resolve) => {
    const el = panel.value;
    if (!el) return resolve();
    const onEnd = (evt: TransitionEvent) => {
      if (evt.target === el) {
        el.removeEventListener('transitionend', onEnd);
        resolve();
      }
    };
    el.addEventListener('transitionend', onEnd);
    setTimeout(resolve, 360); // запас на слабых девайсах
  });
}

async function animateThen(cb: () => void) {
  if (isClosing.value) return;
  isClosing.value = true;
  isActive.value = false; // триггерим CSS-выход
  await waitForLeave();
  cb();
}
function requestClose(payload?: any)  { animateThen(() => closeRaw(props.id, payload)); }
function requestDismiss(reason?: any) { animateThen(() => dismissRaw(props.id, reason)); }

/* ---------------- Drag to close (нативное поведение) ---------------- */

/** ТЮНИНГ ЧУВСТВИТЕЛЬНОСТИ (под iOS/Android) */
const START_SLOP     = 10;     // пикселей — пока меньше, жест не стартует
const ANGLE_TAN_MAX  = 0.58;   // ~30°: |dx| <= |dy| * 0.58 — защита от горизонтальных жестов
const LOCK_HANDLE_PX = 9999;   // можно ограничить свайп только «сверху» панели (например 24). 9999 = везде

const CLOSE_DY       = 160;    // нужно протянуть минимум на 160px (без скорости)
const CLOSE_VY       = 0.9;    // px/ms — достаточно «быстро» потянуть вниз
const MIN_VY_DY      = 64;     // при быстром свайпе достаточно 64px
const INSTANT_DY     = 380;    // очень длинная протяжка — закрыть мгновенно

const RESIST_LIMIT   = 220;    // после этой точки сопротивление усиливается
const RESIST_K       = 0.38;   // коэффициент сопротивления

const SPRING_BACK_MS = 160;    // откат вверх
const SWIPE_EASE = (t: number) => t*t*(3 - 2*t); // smoothstep

let dragId: number | null = null;
let dragging = false;
let pending  = false;

let startX = 0;
let startY = 0;
let startT = 0;
let dy = 0;

let lastVy = 0;         // последняя оценка скорости
let vxAbsAcc = 0;       // аккумулируем |dx| для angle фильтра

// скролл внутри контента
let scrollEl: HTMLElement | null = null;

function isScrollable(el: Element | null) {
  if (!el || el === panel.value) return false;
  const style = el instanceof HTMLElement ? getComputedStyle(el) : null;
  if (!style) return false;
  if (!/(auto|scroll|overlay)/.test(style.overflowY)) return false;
  const he = el as HTMLElement;
  return he.scrollHeight > he.clientHeight;
}
function getScrollableAt(target: Element | null): HTMLElement | null {
  let el = target as HTMLElement | null;
  while (el && el !== panel.value) {
    if (isScrollable(el)) return el;
    el = el.parentElement;
  }
  return null;
}

function resist(v: number, limit = RESIST_LIMIT, k = RESIST_K) {
  if (v <= limit) return v;
  return limit + (v - limit) * k;
}

let rafScheduled = false;
function scheduleFrame() {
  if (rafScheduled) return;
  rafScheduled = true;
  requestAnimationFrame(() => {
    rafScheduled = false;
    applyDragStyles(dy);
  });
}

function applyDragStyles(offset: number) {
  const el = panel.value, ov = overlay.value;
  if (!el || !ov) return;
  el.style.transform = `translate3d(-50%, ${offset}px, 0)`;
  ov.style.opacity   = String(Math.max(0, Math.min(1, 1 - offset / 360)));
}
function clearDragStyles() {
  const el = panel.value, ov = overlay.value;
  if (el) el.style.transform = '';
  if (ov) ov.style.opacity = '';
}

function resetGesture() {
  pending = false;
  dragging = false;
  dragId = null;
  dy = 0;
  lastVy = 0;
  vxAbsAcc = 0;
  scrollEl = null;
}

function inertialDismissRAF(dyStart: number, vy: number) {
  if (isClosing.value) return;
  isClosing.value = true;

  const el = panel.value!, ov = overlay.value!;
  const screen = window.innerHeight;
  const end = Math.max(dyStart + screen * 1.05, dyStart + 560);
  const dist = end - dyStart;
  const dur = Math.max(260, Math.min(520, 220 + dist * 0.32 + Math.abs(vy) * 240));

  el.classList.add('swiping');
  ov.classList.add('swiping', 'perf-no-blur');

  let t0: number | null = null;
  const step = (ts: number) => {
    if (t0 == null) t0 = ts;
    const p = Math.min(1, (ts - t0) / dur);
    const k = SWIPE_EASE(p);
    const y = dyStart + dist * k;
    const a = Math.max(0, Math.min(1, 1 - y / 360));
    const el2 = panel.value, ov2 = overlay.value;
    if (el2) el2.style.transform = `translate3d(-50%, ${y}px, 0)`;
    if (ov2) ov2.style.opacity   = String(a);
    if (p < 1) requestAnimationFrame(step);
    else {
      el.classList.remove('swiping');
      ov.classList.remove('swiping', 'perf-no-blur');
      dismissRaw(props.id, 'swipe');
    }
  };
  requestAnimationFrame(step);
}

function springBack() {
  const el = panel.value!, ov = overlay.value!;
  ov.classList.add('perf-no-blur');

  el.classList.add('swiping');
  el.style.transition = `transform ${SPRING_BACK_MS}ms cubic-bezier(.2,.9,.2,1.05)`;
  el.style.transform  = `translate3d(-50%, 0, 0)`;
  ov.style.transition = `opacity ${SPRING_BACK_MS}ms cubic-bezier(.2,.9,.2,1.05)`;
  ov.style.opacity    = '1';

  setTimeout(() => {
    el.style.transition = '';
    ov.style.transition = '';
    el.classList.remove('swiping');
    ov.classList.remove('swiping', 'perf-no-blur');
    clearDragStyles();
  }, SPRING_BACK_MS);
}

function onPD(e: PointerEvent) {
  if (isClosing.value) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  // игнор мультитач
  if ((e as any).isPrimary === false) return;

  const tgt = e.target as HTMLElement | null;
  // явно запретили свайп
  if (tgt && (tgt.closest('[data-no-swipe]') || tgt.closest('.no-swipe'))) return;

  // ограничение «зоны захвата» сверху панели (как в нативных шитах)
  if (panel.value) {
    const rect = panel.value.getBoundingClientRect();
    if (e.clientY < rect.top || e.clientY > rect.top + LOCK_HANDLE_PX) return;
  }

  dragId = e.pointerId;
  startX = e.clientX;
  startY = e.clientY;
  startT = performance.now();
  dy = 0;
  lastVy = 0;
  vxAbsAcc = 0;

  scrollEl = getScrollableAt(tgt);
  pending = true;
  dragging = false;
}

function onPM(e: PointerEvent) {
  if (dragId == null || e.pointerId !== dragId) return;

  const dx = e.clientX - startX;
  const rawDy = e.clientY - startY;

  // angle guard до старта
  if (pending) {
    if (Math.abs(rawDy) < START_SLOP) return;

    // горизонтальные/косые движения — отменяем
    const tan = Math.abs(dx) / Math.max(1, Math.abs(rawDy));
    if (tan > ANGLE_TAN_MAX) { resetGesture(); return; }

    // скролл внутри, если не у верхней границы — не перехватываем
    const atTop = !scrollEl || scrollEl.scrollTop <= 0;
    const pullingDown = rawDy > 0;

    if (scrollEl && scrollEl.scrollTop > 0) { resetGesture(); return; }
    if (!(pullingDown && atTop)) { resetGesture(); return; }

    // фиксируем начало драга
    const el = e.currentTarget as HTMLElement | null;
    try { el?.setPointerCapture?.(dragId); } catch {}
    el?.classList.add('dragging');
    overlay.value?.classList.add('dragging', 'perf-no-blur');
    dragging = true;
    pending = false;
    if (e.cancelable) e.preventDefault();
  }

  if (!dragging) return;

  // сопротивление вниз
  const posDy = Math.max(0, rawDy);
  dy = resist(posDy);
  scheduleFrame();

  // velocity (px/ms) — сглаженная
  const dt = Math.max(1, performance.now() - startT);
  lastVy = (e.clientY - startY) / dt;

  // защита от длинных косых свайпов уже после старта
  vxAbsAcc += Math.abs(dx);
  if (vxAbsAcc > 24 && (Math.abs(dx) / Math.max(1, Math.abs(rawDy)) > ANGLE_TAN_MAX * 1.2)) {
    // «уплыли» вбок — не закрываем, откат
    springBack();
    resetGesture();
    return;
  }

  // моментальное закрытие при большой протяжке
  if (!isClosing.value && dy > INSTANT_DY) {
    const el = e.currentTarget as HTMLElement | null;
    try { el?.releasePointerCapture?.(dragId!); } catch {}
    dragging = false;
    pending = false;
    dragId = null;
    inertialDismissRAF(dy, Math.max(lastVy, CLOSE_VY));
    if (e.cancelable) e.preventDefault();
    return;
  }

  if (e.cancelable) e.preventDefault();
}

function onPU(e: PointerEvent) {
  if (dragId == null || e.pointerId !== dragId) return;

  const el = e.currentTarget as HTMLElement | null;
  const ov = overlay.value;
  if (!dragging) { resetGesture(); return; }

  try { el?.releasePointerCapture?.(dragId); } catch {}
  el?.classList.remove('dragging');
  ov?.classList.remove('dragging');

  const rawDy = Math.max(0, e.clientY - startY);
  const vy = lastVy; // уже сглаженная

  // основное правило закрытия:
  // 1) длинная протяжка >= CLOSE_DY ИЛИ
  // 2) быстрая протяжка: dy >= MIN_VY_DY И vy >= CLOSE_VY
  const shouldClose =
    rawDy >= CLOSE_DY ||
    (rawDy >= MIN_VY_DY && vy >= CLOSE_VY);

  dragId = null;
  dragging = false;
  pending = false;

  if (shouldClose) {
    inertialDismissRAF(dy, vy);
  } else {
    springBack();
  }
}

function attachDrag() {
  const el = panel.value;
  if (!el) return;
  el.addEventListener('pointerdown', onPD as any, { capture: true, passive: true });
  el.addEventListener('pointermove', onPM as any,  { passive: false });
  el.addEventListener('pointerup', onPU as any,    { passive: false });
  el.addEventListener('pointercancel', onPU as any,{ passive: false });
}
function detachDrag() {
  const el = panel.value;
  if (!el) return;
  el.removeEventListener('pointerdown', onPD as any, { capture: true } as any);
  el.removeEventListener('pointermove', onPM as any);
  el.removeEventListener('pointerup', onPU as any);
  el.removeEventListener('pointercancel', onPU as any);
  resetGesture();
}
</script>

<template>
  <div
    class="m-overlay"
    :class="{ active: isActive }"
    :style="{ zIndex: baseZ }"
    role="presentation"
    @click="onOverlayClick"
    ref="overlay"
  />
  <div
    class="m-panel"
    :class="{ active: isActive }"
    :style="{
      zIndex: baseZ + 1,
      maxWidth: typeof opts.width === 'number' ? opts.width + 'px' : (opts.width || '')
    }"
    ref="panel"
  >
    <component
      :is="component"
      v-bind="{ ...(props?.props||{}) }"
      @close="requestClose()"
      @dismiss="requestDismiss()"
    />
  </div>
</template>

<style scoped lang="scss">
.m-overlay {
  position: fixed;
  inset: 0;
  display: grid;
  background: rgba(0,0,0,.62);
  opacity: 0;
  pointer-events: none;
  transition: opacity .18s cubic-bezier(.24,.8,.24,1);
  will-change: opacity;
  transform: translateZ(0);
  contain: paint;

  &.dragging { transition: none; }
  &.swiping  { transition: none !important; }
  &.perf-no-blur { backdrop-filter: none !important; }
  &.active { opacity: 1; pointer-events: auto; }
}

.m-panel {
  position: fixed;
  left: 50%;
  bottom: 0;
  width: min(100%, 100vw);
  transform: translate3d(-50%, 100%, 0); /* старт ниже экрана */
  background: var(--bg);
  border-top: 1px solid var(--border);
  border-radius: 16px 16px 0 0;
  color: #fff;
  transition: transform .18s cubic-bezier(.24,.9,.2,1);
  will-change: transform;
  touch-action: none; /* чтобы pointer события были стабильны */
  backface-visibility: hidden;

  &.dragging { transition: none; }
  &.swiping  { transition: none !important; }
  &.active   { transform: translate3d(-50%, 0, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .m-overlay, .m-panel { transition: none !important; }
}
</style>