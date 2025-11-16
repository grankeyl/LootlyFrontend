<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
import { gsap } from "gsap";

// Icons
import TonWhiteIcon from "@/assets/icons/ton-white.svg";
import TelegramModule from "../../../hooks/useTelegram";
import { getImgSvg } from "../../../utils/useApp";

const emit = defineEmits<{ (e: 'win', reward: any): void }>();
const props = defineProps<{ Rolling: boolean, Items: any, NeedItem: any }>() as any;


type Item = { id: number; image: string; price_ton: number, name: string, bg_start: string, bg_center: string, bg_end: string };

const items = ref<Item[]>(props.Items);

const ITEM_WIDTH = 100;
const GAP        = 16;                 // должен совпадать со стилями
const STEP       = ITEM_WIDTH + GAP;   // единый шаг
const CYCLES     = 30;

const SPIN_TIME  = 4.5;
const LOOPS      = 5;

const viewport = ref<HTMLElement|null>(null);
const track    = ref<HTMLElement|null>(null);

const renderList = ref<Item[]>([]);
const isSpinning = ref(false);
const cycleOrder = ref<Item[]>([]);

let startX = 0;
let spinTl: gsap.core.Timeline | null = null;
let currentTargetIndex = 0;

function shuffle<T>(arr: T[]): T[] {
  return arr
    .map((v) => ({ v, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ v }) => v);
}

onMounted(async () => {
  await nextTick();

  cycleOrder.value = shuffle([...items.value]);
  renderList.value = Array.from({ length: CYCLES }, () => cycleOrder.value).flat();

  alignStart();
  randomizeStart();
  scaleCells();

  window.addEventListener("resize", onResize, { passive: true });

  if (props.Rolling) {
    await nextTick();
    const item = props.NeedItem;
    console.log(item);
    if (item) rollToById(item.item_id, { loops: LOOPS, duration: SPIN_TIME });
  }
});

function randomizeStart() {
  if (!track.value) return;
  const k = Math.floor(Math.random() * items.value.length);
  gsap.set(track.value, { x: startX - k * STEP });
  scaleCells();
}

onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
});

function alignStart() {
  if (!viewport.value || !track.value) return;
  const vpW = viewport.value.clientWidth;
  startX = Math.round((vpW - STEP) / 2); // меньше субпикселей = точнее центр
  gsap.set(track.value, { x: startX });
}

function onResize() {
  alignStart();
  // защёлкиваем к шагу, чтобы не было “дребезга”
  if (track.value) {
    const x = (gsap.getProperty(track.value, "x") as number) || 0;
    const snapped = startX - Math.round((startX - x) / STEP) * STEP;
    gsap.set(track.value, { x: snapped });
  }
  scaleCells();
}

function scaleCells() {
  if (!viewport.value || !track.value) return;
  const vpRect = viewport.value.getBoundingClientRect();
  const center = vpRect.left + vpRect.width / 2;

  const cells = track.value.querySelectorAll<HTMLElement>(".cell");
  let closest: HTMLElement|null = null as any;
  let minDist = Infinity;

  cells.forEach((cell) => {
    const rect = cell.getBoundingClientRect();
    const cellCenter = rect.left + rect.width / 2;
    const dist = Math.abs(center - cellCenter);
    if (dist < minDist) { minDist = dist; closest = cell; }
  });

  cells.forEach(c => { c.style.transform = "scale(1)"; c.style.zIndex = "1"; });
  if (closest) {
    closest.style.transform = "scale(1.08)";
    closest.style.zIndex = "10";
    closest.style.opacity = "1";
  }
}

async function rollTo(targetIndex: number, opts?: { loops?: number; duration?: number }) {
  if (isSpinning.value || !track.value) return;

  currentTargetIndex = targetIndex;                // <— запоминаем
  const loops    = Math.max(1, opts?.loops ?? LOOPS);
  const duration = opts?.duration ?? SPIN_TIME;
  const total    = items.value.length;

  const currentX = (gsap.getProperty(track.value, "x") as number) || 0;
  const offsetFromStart = startX - currentX;
  const currentIndex = ((Math.round(offsetFromStart / STEP) % total) + total) % total;

  let steps = loops * total + ((targetIndex - currentIndex + total) % total);
  const distancePx = steps * STEP;
  const finalX = currentX - distancePx;

  isSpinning.value = true;

  const tl = gsap.timeline({
    defaults: { onUpdate: scaleCells },
    onComplete: () => {
      if (track.value) {
        const x = (gsap.getProperty(track.value, "x") as number) || 0;
        const snapped = startX - Math.round((startX - x) / STEP) * STEP;
        gsap.set(track.value, { x: snapped });
      }
      isSpinning.value = false;
      spinTl = null;

      const item = cycleOrder.value[currentTargetIndex];
      emit("win", {
        ...item,
        rewardItem: props.NeedItem,
      });
      TelegramModule.useHeavyHaptic();
      animateWinner();
    }
  });

  spinTl = tl;

  tl.to(track.value, {
    x: currentX - distancePx * 0.7,
    duration: duration * 0.6,
    ease: "power2.in",
  });
  tl.to(track.value, {
    x: finalX,
    duration: duration * 0.4,
    ease: "power4.out",
  });
}

async function rollToById(targetId: number, opts?: { loops?: number; duration?: number }) {
  const idx = cycleOrder.value.findIndex(it => it.id === targetId);
  if (idx === -1) return;
  await rollTo(idx, opts);
}

function animateWinner() {
  if (!viewport.value) return;
  const vpRect = viewport.value.getBoundingClientRect();
  const center = vpRect.left + vpRect.width / 2;

  const cells = viewport.value.querySelectorAll<HTMLElement>(".cell");
  let winner: HTMLElement | null = null;
  let minDist = Infinity;

  cells.forEach((cell) => {
    const rect = cell.getBoundingClientRect();
    const cellCenter = rect.left + rect.width / 2;
    const dist = Math.abs(center - cellCenter);
    if (dist < minDist) {
      minDist = dist;
      winner = cell;
    }
  });

  if (winner) {
    gsap.timeline()
      .to(winner, {
        scale: 1.7,              // сильный "БАМ"
        duration: 0.2,
        ease: "power4.out"
      })
      .to(winner, {
        scale: 1.1,                // стабилизация
        duration: 0.13,
        ease: "power2.out"
      });
  }
}

function onCardClick(idx:number){
  if (isSpinning.value) return;
  const logical = ((idx % items.value.length) + items.value.length) % items.value.length;
  rollTo(logical);
}

function skip() {
  // мгновенно докручиваем к финалу, с вызовом onComplete
  if (isSpinning.value && spinTl) {
    spinTl.progress(1, false); // false => не подавлять события, сработает onComplete
  }
}

defineExpose({ rollTo, rollToById, skip });

watch(() => props.Items, (v) => {
  items.value = v;
  cycleOrder.value = shuffle([...items.value]);
  renderList.value = Array.from({ length: CYCLES }, () => cycleOrder.value).flat();
  alignStart();
  randomizeStart();
  scaleCells();
});

watch(() => props.Rolling, (v, old) => {
  if (v && !old) {
    const item = props.NeedItem;
    if (item) {
      rollToById(item.item_id, { loops: LOOPS, duration: SPIN_TIME });
    }
  }
});
</script>

<template>
  <div class="roulette">
    <div ref="viewport" class="viewport">
      <div ref="track" class="track">
        <div
          v-for="(it, idx) in renderList"
          :key="`${it.id}-${idx}`"
          class="cell"
          @click="onCardClick(idx)"
          :style="{ 
            '--bg-start-color': it.bg_start || '#000000',
            '--bg-center-color': it.bg_center || '#000000',
            '--bg-end-color': it.bg_end || '#000000',
          }"
        >
          <img :src="getImgSvg(it.image)" alt="" />
          <div class="price">
            <p>{{ it.price_ton }}</p>
            <img :src="TonWhiteIcon" alt="ton" />
          </div>
        </div>
      </div>
    </div>

    <div class="indicator">
        <svg width="19" height="14" viewBox="0 0 19 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.2813 8.8296C19.9847 10.9133 18.4687 14 15.7419 14H3.25813C0.531287 14 -0.984722 10.9133 0.718726 8.8296L6.96059 1.19436C8.26246 -0.398121 10.7375 -0.398122 12.0394 1.19436L18.2813 8.8296Z" fill="#242426"/>
        </svg>
    </div>
  </div>
</template>

<style lang="scss" src="./Roulette.scss" scoped></style>