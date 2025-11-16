<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { cutNumberNano } from "../../../../utils/useTon";
import * as APIMarket from "../../../../api/market";
import TonWhiteIcon from "@/assets/icons/ton-white.svg";
import { getImgSvg } from "../../../../utils/useApp";
import TelegramModule from "../../../../hooks/useTelegram";

type Gift = any;

const emit = defineEmits<{
  (e: "gifts-count", count: number): void;
  (e: "open-modal", payload: Gift): void;
}>();

const props = defineProps<{ scrollEl?: Element | { value?: Element|null } | null }>();

/** --- state --- */
const skeleton = ref(true);
const items = ref<Gift[]>(Array.from({ length: 10 }, () => ({
  id: 1,
  bg_start: "",
  bg_center: "",
  bg_end: "",
  image: "",
  name: "",
  price_nano: 1_000_000_000,
})));
const hasMore = ref(true);
const loading = ref(false);
const limit = 20;
const offset = ref(0);

/** гонки и отмена */
let inFlight = 0;

/** наблюдатели/отписки */
const sentinel = ref<HTMLDivElement|null>(null);
let io: IntersectionObserver | null = null;
let ro: ResizeObserver | null = null;
let scrollOff: (() => void) | null = null;

/** утилиты */
const rootEl = () => {
  const el = (props.scrollEl as any)?.value ?? props.scrollEl ?? null;
  return el instanceof Element ? el : null;
};

function atBottomGap(gap = 600) {
  const root = rootEl();
  if (root) {
    const el = root as HTMLElement;
    return el.scrollTop + el.clientHeight >= el.scrollHeight - gap;
  }
  const doc = document.documentElement;
  return window.scrollY + window.innerHeight >= doc.scrollHeight - gap;
}

function sentinelVisible(): boolean {
  if (!sentinel.value) return false;
  const rect = sentinel.value.getBoundingClientRect();
  const root = rootEl();
  const bottom = root ? (root as HTMLElement).getBoundingClientRect().bottom : window.innerHeight;
  return rect.top <= bottom;
}

/** API */
async function fetchPage(initial = false) {
  if (loading.value) return;
  if (!hasMore.value && !initial) return;

  loading.value = true;
  const token = ++inFlight;
  try {
    if (initial) {
      skeleton.value = true;
      offset.value = 0;
      hasMore.value = true;
    }

    const res = await APIMarket.items("all", limit, offset.value).catch(() => null);
    // если прилетела другая, более свежая загрузка — игнорим
    if (token !== inFlight) return;

    if (!res) {
      hasMore.value = false;
      return;
    }

    const page: Gift[] = res.items ?? [];
    const withFlags = page.map(g => ({ ...g, _imgLoaded: false }));

    if (initial) items.value = withFlags;
    else items.value.push(...withFlags);

    offset.value += page.length;

    if (typeof res.total_all === "number") {
      hasMore.value = items.value.length < res.total_all;
      emit("gifts-count", res.total_all);
    } else {
      hasMore.value = page.length === limit;
    }
  } finally {
    if (token === inFlight) {
      loading.value = false;
      // небольшая задержка, чтобы убрать скелетон после отрисовки
      setTimeout(() => (skeleton.value = false), 120);
    }
  }
}

/** авто-долив: пока низ пустой — подкачиваем страницы */
async function topUpViewport(maxLoops = 8) {
  let loops = 0;
  // сначала доливаем, если контент ниже высоты окна
  while (hasMore.value && !loading.value && loops < maxLoops) {
    const need = needsMore();
    if (!need) break;
    await fetchPage(false);
    await nextTick();
    loops++;
  }
  // затем пока виден sentinel — продолжаем подкачку
  while (hasMore.value && !loading.value && sentinelVisible() && loops < maxLoops) {
    await fetchPage(false);
    await nextTick();
    loops++;
  }
}

function needsMore(buffer = 120) {
  const root = rootEl();
  if (root) return (root as HTMLElement).scrollHeight < (root as HTMLElement).clientHeight + buffer;
  const doc = document.documentElement;
  return doc.scrollHeight < window.innerHeight + buffer;
}

/** наблюдатели */
function setupIO() {
  if (!sentinel.value) return;
  io?.disconnect();

  io = new IntersectionObserver(async entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      if (loading.value || !hasMore.value) continue;
      await fetchPage(false);
      await nextTick();
      topUpViewport(5);
    }
  }, { root: rootEl(), rootMargin: "0px 0px 800px 0px", threshold: 0 });

  io.observe(sentinel.value);
}

function setupResizeAndScrollFallback() {
  const container = rootEl();
  // подстраиваемся под изменение размеров списка
  const list = (container ?? document.querySelector(".gifts .items")) as HTMLElement | null;
  if (list) {
    ro?.disconnect();
    ro = new ResizeObserver(() => topUpViewport(3));
    ro.observe(list);
  }

  // фоллбек, если IO не сработал
  const onScroll = () => {
    if (!loading.value && hasMore.value && atBottomGap(700)) {
      fetchPage(false).then(() => nextTick().then(() => topUpViewport(3)));
    }
  };

  if (container) {
    container.addEventListener("scroll", onScroll, { passive: true });
    scrollOff = () => container.removeEventListener("scroll", onScroll);
  } else {
    window.addEventListener("scroll", onScroll, { passive: true });
    scrollOff = () => window.removeEventListener("scroll", onScroll);
  }
}

/** публичное */
function openItem(g: Gift) { 
  TelegramModule.useLightHaptic();
  emit("open-modal", g); 
}

async function reload() { 
  await fetchPage(true); 
  await nextTick(); 
  await topUpViewport(10);
}

onMounted(async () => {
  await reload();
  setupIO();
  setupResizeAndScrollFallback();
  await nextTick();
  topUpViewport(10);
});

onBeforeUnmount(() => {
  io?.disconnect(); io = null;
  ro?.disconnect(); ro = null;
  scrollOff?.(); scrollOff = null;
});
</script>

<template>
  <div class="gifts">
    <div class="items" :class="{ skeleton }">
      <div class="item" v-for="(item, i) in items" :key="item.id ?? i" @click="openItem(item)">
        <div class="background upg"
             :style="{ '--start-color': item.bg_start, '--center-color': item.bg_center, '--end-color': item.bg_end }" />
        <div class="sk-load" v-if="skeleton"></div>
        <div class="model">
          <div class="upg">
            <div class="image">
              <img
                :src="getImgSvg(item.image)"
                alt="model"
                @load="item._imgLoaded = true"
                @error="item._imgLoaded = true"
                :class="{ 'img-loaded': item._imgLoaded }"
              />
            </div>
          </div>
        </div>
        <div class="name"><h4>{{ item.name }}</h4></div>
        <div class="buttons">
          <button><h4>{{ cutNumberNano(item.price_nano) }}</h4><img :src="TonWhiteIcon" alt="ton" /></button>
        </div>
      </div>

      <div v-if="!skeleton && loading" class="loading-more"><div class="sk-load"></div></div>
      <div ref="sentinel" class="sentinel" />
    </div>
  </div>
</template>

<style lang="scss" src="./Gifts.scss" scoped></style>
<style>
.gifts .items .item .model .image img {
  opacity: 0;
  transform: translateY(6px);
  filter: blur(6px);
  transition: opacity .28s ease, transform .28s ease, filter .32s ease;
  will-change: opacity, transform, filter;
}
.gifts .items .item .model .image img.img-loaded {
  opacity: 1;
  transform: none;
  filter: blur(0);
}
</style>