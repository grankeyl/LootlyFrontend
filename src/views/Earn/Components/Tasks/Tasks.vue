<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";

import * as APITasks from "../../../../api/tasks";

// Icons
import LootcoinIcon from "@/assets/icons/lootcoin.svg";
// import TonWhite from "@/assets/icons/ton-white.svg";
import ChevroneRight from "@/assets/icons/chevrone-right.svg";

// Images
// import Gifted from "@/assets/images/earn-pg/gifted.png";
import TelegramModule from "../../../../hooks/useTelegram";

type Task = any;

const props = defineProps<{ 
  scrollEl?: Element | null 
}>();

const skeleton = ref(true);
const items = ref<Task[]>(Array.from({ length: 10 }));
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

    const res = await APITasks.tasks().catch(() => null);
    if (token !== inFlight) return;

    if (!res) {
      hasMore.value = false;
      return;
    }

    const page: Task[] = res.data ?? [];
    const withFlags = page.map(g => ({ ...g, _imgLoaded: false }));

    if (initial) items.value = withFlags;
    else items.value.push(...withFlags);

    offset.value += page.length;

    if (typeof res.total_all === "number") {
      hasMore.value = items.value.length < res.total_all;
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
  const list = (container ?? document.querySelector(".tasks .others")) as HTMLElement | null;
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

function useTask() {
  const link = 'https://t.me/LootlyNews';
  TelegramModule.useLink(link);
}
</script>

<template>
  <div class="tasks" :class="{ skeleton: skeleton }">
    <!-- <div class="primary">
      <div class="sk-load" v-if="skeleton"></div>
      <div class="smb">
        <img :src="Gifted" alt="gifted" />
        <img :src="Gifted" alt="gifted" />
      </div>
      <div class="context">
        <div class="title">
          <p>Получи</p>
          <span>
            100 <img :src="LootcoinIcon" alt="lootcoin-icon" />
          </span>
          <p>за спины</p>
        </div>
        <div class="descr">
          <p>Прокрути TON в кейсах и кайфани</p>
        </div>
      </div>
      <div class="progress">
        <div class="line"></div>
        <div class="info">
          <p>80</p>
          <img :src="TonWhite" alt="ton-icon" />
          <p>200</p>
        </div>
      </div>
    </div> -->

    <div class="others">
      <div class="other" v-for="_ in items" @click="useTask">
        <div class="sk-load" v-if="skeleton"></div>
        <div class="image">
          <img src="https://i.ibb.co/3593Cj84/telegram-peer-photo-size-2-5190691857137530605-1-0-0.jpg" alt="">
        </div>
        <div class="context">
          <h4>{{ $t('earn.tasks.others.taskTitle') }}</h4>
          <span>
            <p>250</p>
            <img :src="LootcoinIcon" alt="lootcoin-icon" />
          </span>
        </div>
        <div class="mark notactive">
          <img :src="ChevroneRight" alt="chevrone-right-icon">
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Tasks.scss" scoped></style>