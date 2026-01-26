<!-- SlotMachine.vue -->
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";

export type SlotItem = {
  id: string | number;
  icon?: string; // url
  label?: string;
  disabled?: boolean;
};

const props = withDefaults(
  defineProps<{
    items: SlotItem[];

    reelsCount?: number;
    results?: Array<string | number>;

    itemHeightPx?: number;
    reelWidthPx?: number;

    loops?: number;
    durationMs?: number;
    staggerMs?: number;

    autoSpinOnResults?: boolean;
    disabled?: boolean;

    chance?: number;
    chanceMax?: number;

    bombId?: string | number;
    giftId?: string | number;

    giftMinRatio?: number;
    giftMaxRatio?: number;
    giftCurve?: number;

    /** ✅ сколько строк видно в барабане (3/4/5) */
    visibleRows?: number;
  }>(),
  {
    reelsCount: 3,
    itemHeightPx: 74,
    reelWidthPx: 92,

    loops: 10,
    durationMs: 1350,
    staggerMs: 220,

    autoSpinOnResults: true,
    disabled: false,

    chance: 0,
    chanceMax: 100,

    bombId: "bomb",
    giftId: "gift",

    giftMinRatio: 0.12,
    giftMaxRatio: 0.92,
    giftCurve: 1.6,

    visibleRows: 3,
  }
);

const emit = defineEmits<{
  (e: "spin-start"): void;
  (e: "reel-stop", payload: { reel: number; result: SlotItem | null }): void;
  (e: "spin-end", payload: { results: Array<SlotItem | null> }): void;
  (e: "update:results", v: Array<string | number>): void;
}>();

function sleep(ms: number) {
  return new Promise<void>((r) => window.setTimeout(r, ms));
}
function raf() {
  return new Promise<void>((r) => requestAnimationFrame(() => r()));
}
function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}
function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(n)));
}
function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

const reelsN = computed(() => clampInt(props.reelsCount ?? 3, 1, 20));
const itemH = computed(() => Math.max(28, props.itemHeightPx ?? 74));
const reelW = computed(() => Math.max(56, props.reelWidthPx ?? 92));

/** ✅ сколько строк реально показать */
const rows = computed(() => clampInt(props.visibleRows ?? 3, 1, 7));
/** ✅ индекс строки, на которую надо остановиться (центральная) */
const centerRow = computed(() => Math.floor(rows.value / 2));

const isSpinning = ref(false);

/** ====== easing (без резкостей) ====== */
const EASE_SPIN = "cubic-bezier(0.16, 1, 0.3, 1)"; // smooth, “дорого”
const EASE_SLOW = "cubic-bezier(0.22, 0.75, 0.22, 1)";

type ReelState = {
  /** posAbs = индекс элемента, который стоит в ЦЕНТРЕ */
  posAbs: number;
  /** translateY (px) */
  yPx: number;
  transitioning: boolean;
  dur: number;
  easing: string;
  tape: SlotItem[];
  spinning: boolean;
};

const reels = ref<ReelState[]>([]);

/**
 * ✅ ключ:
 * posAbs = индекс элемента, который должен быть на центральной линии
 * translateY = -(posAbs - centerRow) * itemH
 */
function posToYPx(posCenterAbs: number) {
  return -(posCenterAbs - centerRow.value) * itemH.value;
}

function resolveTargetId(result: string | number, baseItems: SlotItem[]) {
  if (!baseItems.length) return baseItems[0]?.id ?? "__empty__";
  if (typeof result === "number" && Number.isFinite(result)) {
    const idx = mod(Math.floor(result), baseItems.length);
    return baseItems[idx].id;
  }
  return result;
}

/** ---------- Weighted tape ---------- */
function pickWeighted(items: SlotItem[], weights: number[]) {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) sum += Math.max(0, weights[i] ?? 0);
  if (sum <= 0) return items[0];

  let r = Math.random() * sum;
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, weights[i] ?? 0);
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function chanceT() {
  const max = Math.max(1e-9, Number(props.chanceMax ?? 100));
  const raw = Number(props.chance ?? 0);
  const t = clamp(raw / max, 0, 1);
  return Math.pow(t, clamp(Number(props.giftCurve ?? 1.6), 0.6, 3));
}

function giftRatio() {
  const t = chanceT();
  const mn = clamp(Number(props.giftMinRatio ?? 0.12), 0, 1);
  const mx = clamp(Number(props.giftMaxRatio ?? 0.92), 0, 1);
  return clamp(mn + (mx - mn) * t, 0, 1);
}

function buildWeightedTape(base: SlotItem[], loops: number, forceTargetId?: string | number) {
  const src = (base ?? []).filter((x) => x && !x.disabled);
  const fallback = [{ id: "__empty__", label: "" } as SlotItem];
  const pool = src.length ? src : fallback;

  const bombId = props.bombId ?? "bomb";
  const giftId = props.giftId ?? "gift";

  const hasBomb = pool.some((x) => x.id === bombId);
  const hasGift = pool.some((x) => x.id === giftId);

  const baseLen = Math.max(2, pool.length);
  const repeat = Math.max(14, (loops ?? 10) + 16);
  const total = repeat * baseLen * 2;

  const gR = giftRatio();
  const weights = pool.map((it) => {
    if (hasBomb && it.id === bombId) return Math.max(0.001, 1 - gR);
    if (hasGift && it.id === giftId) return Math.max(0.001, gR);
    return 0.15;
  });

  const out: SlotItem[] = new Array(total);
  for (let i = 0; i < total; i++) out[i] = pickWeighted(pool, weights);

  // анти-триплет
  for (let i = 2; i < total; i++) {
    if (out[i].id === out[i - 1].id && out[i].id === out[i - 2].id) {
      out[i] = pickWeighted(pool, weights);
    }
  }

  // гарантия таргета
  if (forceTargetId !== undefined) {
    const id = forceTargetId;
    const inserts = 10;
    const start = Math.floor(total * 0.55);
    for (let k = 0; k < inserts; k++) {
      const pos = start + Math.floor(Math.random() * Math.max(1, total - start));
      out[pos] = pool.find((x) => x.id === id) ?? out[pos];
    }
  }

  return out;
}

/** ищем индекс элемента, который должен оказаться В ЦЕНТРЕ */
function findNextCenterIndexById(tape: SlotItem[], startFromCenter: number, targetId: string | number) {
  for (let i = Math.max(0, startFromCenter); i < tape.length; i++) {
    if (tape[i]?.id === targetId) return i;
  }
  return -1;
}

function resetReelAroundId(reelIdx: number, landedId: string | number) {
  const base = props.items ?? [];
  const r = reels.value[reelIdx];
  if (!r) return;

  r.tape = buildWeightedTape(base, props.loops ?? 10, landedId);

  const mid = Math.floor(r.tape.length * 0.55);
  let idx = -1;

  for (let offset = 0; offset < r.tape.length; offset++) {
    const a = mid + offset;
    const b = mid - offset;
    if (a >= 0 && a < r.tape.length && r.tape[a]?.id === landedId) {
      idx = a;
      break;
    }
    if (b >= 0 && b < r.tape.length && r.tape[b]?.id === landedId) {
      idx = b;
      break;
    }
  }
  if (idx < 0) idx = mid;

  r.transitioning = false;
  r.spinning = false;
  r.easing = EASE_SPIN;
  r.posAbs = idx;
  r.yPx = posToYPx(r.posAbs);
}

function initReels() {
  const base = props.items ?? [];
  const need = reelsN.value;

  const next: ReelState[] = [];
  for (let i = 0; i < need; i++) {
    const tape = buildWeightedTape(base, props.loops ?? 10);

    const mid = Math.floor(tape.length * 0.55);
    const startCenter = clampInt(mid + Math.floor(Math.random() * 10), 0, tape.length - 1);

    next.push({
      posAbs: startCenter,
      yPx: posToYPx(startCenter),
      transitioning: false,
      dur: props.durationMs ?? 1350,
      easing: EASE_SPIN,
      tape,
      spinning: false,
    });
  }
  reels.value = next;
}

onMounted(() => initReels());

watch(
  () => [props.reelsCount, props.items, props.itemHeightPx, props.reelWidthPx, props.loops, props.visibleRows] as const,
  async () => {
    initReels();
    await nextTick();
    if (props.results?.length) hardSetResults(props.results);
  },
  { deep: true }
);

watch(
  () => [props.chance, props.chanceMax, props.giftMinRatio, props.giftMaxRatio, props.giftCurve] as const,
  () => {
    if (isSpinning.value) return;
    const base = props.items ?? [];
    for (let i = 0; i < reels.value.length; i++) {
      const r = reels.value[i];
      if (!r) continue;
      const curId = r.tape[r.posAbs]?.id ?? (base[0]?.id ?? "__empty__");
      resetReelAroundId(i, curId);
    }
  },
  { deep: true }
);

function hardSetResults(results: Array<string | number>) {
  const base = props.items ?? [];
  if (!base.length) return;

  const need = reelsN.value;
  for (let i = 0; i < need; i++) {
    const r = reels.value[i];
    if (!r) continue;
    const targetId = resolveTargetId(results[i] ?? base[0].id, base);
    resetReelAroundId(i, targetId);
  }
}

/** ---------- SPIN (главный фикс: НЕ ЗАМЕНЯЕМ tape, только append) ---------- */
async function spinToResults(results: Array<string | number>) {
  if (props.disabled) return false;
  if (isSpinning.value) return false;

  const base = props.items ?? [];
  if (!base.length) return false;

  const need = reelsN.value;
  const normalized = Array.from({ length: need }, (_, i) => results[i] ?? base[0].id);

  if (reels.value.length !== need) {
    initReels();
    await nextTick();
  }

  isSpinning.value = true;
  emit("spin-start");

  const stopped: Array<SlotItem | null> = Array.from({ length: need }, () => null);

  const t = chanceT();
  const loopsBoost = Math.round(clamp(6 - t * 3, 2, 6));
  const durBoost = clamp(1.05 + (1 - t) * 0.35, 1.0, 1.45);

  for (let i = 0; i < need; i++) {
    if (i > 0) await sleep(props.staggerMs ?? 220);

    const r = reels.value[i];
    if (!r) continue;

    const targetId = resolveTargetId(normalized[i], base);

    // ✅ НИЧЕГО не “снапим” и не меняем tape -> никаких пропаданий
    r.spinning = true;

    const baseLen = Math.max(2, base.length);
    const extraLoops = Math.max(10, (props.loops ?? 10) + loopsBoost + Math.floor(Math.random() * 3));
    const minSteps = extraLoops * baseLen * 2 + Math.floor(Math.random() * baseLen * 3);
    const searchFrom = r.posAbs + minSteps;

    // ✅ гарантируем, что tape достаточно длинный и таргет найдётся — через APPEND
    let targetAbs = findNextCenterIndexById(r.tape, searchFrom, targetId);
    let guard = 0;
    while (targetAbs < 0 && guard < 6) {
      r.tape = r.tape.concat(buildWeightedTape(base, Math.max(10, extraLoops), targetId));
      targetAbs = findNextCenterIndexById(r.tape, searchFrom, targetId);
      guard++;
    }
    if (targetAbs < 0) targetAbs = Math.min(r.tape.length - 1, searchFrom);

    const baseDur = props.durationMs ?? 1350;
    const dur = clampInt((baseDur + i * 160 + Math.floor(Math.random() * 160)) * durBoost, 900, 8500);

    // ✅ 1 гладкая анимация до цели
    r.transitioning = false;
    r.easing = EASE_SPIN;
    r.dur = 0;
    r.yPx = posToYPx(r.posAbs);
    await nextTick();
    await raf(); // фикс: чтобы transition стартовал без рывка

    r.transitioning = true;
    r.easing = EASE_SPIN;
    r.dur = dur;
    r.posAbs = targetAbs;
    r.yPx = posToYPx(r.posAbs);

    await nextTick();
    await sleep(dur + 40);

    // ✅ очень мягкая “доводка” (опционально, без скачков)
    const finalY = posToYPx(r.posAbs);
    r.transitioning = true;
    r.easing = EASE_SLOW;
    r.dur = 180;
    r.yPx = finalY + 4;
    await nextTick();
    await sleep(200);

    r.transitioning = true;
    r.easing = EASE_SLOW;
    r.dur = 220;
    r.yPx = finalY;
    await nextTick();
    await sleep(240);

    const landed = r.tape[r.posAbs] ?? null;
    const landedId = landed?.id ?? targetId;

    const winItem = base.find((x) => x.id === landedId) ?? landed ?? null;
    stopped[i] = winItem;

    emit("reel-stop", { reel: i, result: winItem });

    // ⚠️ ВАЖНО: НЕ resetReelAroundId здесь — это и даёт визуальные “скачки”.
    r.spinning = false;
  }

  // ✅ перестраиваем барабаны уже ПОСЛЕ полного спина — вообще без заметного эффекта
  for (let i = 0; i < need; i++) {
    const landedId = stopped[i]?.id ?? resolveTargetId(normalized[i], base);
    resetReelAroundId(i, landedId);
  }

  isSpinning.value = false;
  emit("spin-end", { results: stopped });
  return true;
}

async function spin() {
  const base = props.items ?? [];
  if (!base.length) return false;

  const need = reelsN.value;
  const res: Array<string | number> = Array.from({ length: need }, () => {
    const idx = Math.floor(Math.random() * base.length);
    return base[idx].id;
  });

  emit("update:results", res);
  return spinToResults(res);
}

watch(
  () => props.results,
  async (v) => {
    if (!props.autoSpinOnResults) return;
    if (!v || !v.length) return;
    await spinToResults(v);
  },
  { deep: true }
);

defineExpose({
  spin,
  spinToResults,
  hardSetResults,
  isSpinning,
});
</script>

<template>
  <div
    class="slot"
    :class="{ spinning: isSpinning, disabled: props.disabled }"
    :style="{
      '--item-h': itemH + 'px',
      '--reel-w': reelW + 'px',
      '--rows': rows,
    }"
  >
    <div class="slot-window">
      <div class="slot-reels" :style="{ gridTemplateColumns: `repeat(${reelsN}, var(--reel-w))` }">
        <div v-for="(r, i) in reels" :key="'reel_' + i" class="reel" :class="{ spinning: r.spinning }">
          <div
            class="tape"
            :style="{
              transform: `translate3d(0, ${r.yPx}px, 0)`,
              transition: r.transitioning ? `transform ${r.dur}ms ${r.easing}` : 'none',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d',
            }"
          >
            <div v-for="(it, k) in r.tape" :key="`${i}_${k}`" class="cell" :class="{ disabled: it.disabled }">
              <div class="cell-inner">
                <img v-if="it.icon" class="icon" :src="it.icon" alt="" draggable="false" />
                <div v-else class="fallback" />
              </div>
            </div>
          </div>

          <div class="win-line" />
        </div>
      </div>

      <div class="shade top" />
      <div class="shade bottom" />
      <div class="frame" />
    </div>
  </div>
</template>

<style scoped lang="scss" src="./style.scss"></style>