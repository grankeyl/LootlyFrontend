<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { cutNumberNano } from "../../../../utils/useTon";

import * as APIMarket from "../../../../api/market";

// Icons
import TonWhiteIcon from "@/assets/icons/ton-white.svg";
import BasketIcon from "@/assets/icons/basket.svg";

const emit = defineEmits<{
  (e: "gifts-count", count: number): void;
}>();

const props = defineProps<{
  scrollEl?: any;
}>();

let io: IntersectionObserver | null = null;

const skeleton = ref(true);

const giftsSentinel = ref<HTMLDivElement|null>(null);
const giftsLoadingMore = ref(false);
const giftsHasMore = ref(true);
const giftsStatus = ref("all");
const giftsLimit = ref(20);
const giftsOffset = ref(0);
const gifts = ref<any[]>(
  Array.from({ length: 10 }, () => ({
    id: 1,
    image: "",
    name: "",
    price_nano: 1_000_000_000,
    BGStart: "",
    BGCenter: "",
    BGEnd: "",
    symbol: "",
  }))
);

async function getGifts(initial = false) {
  if (giftsLoadingMore.value || (!giftsHasMore.value && !initial)) return;

  giftsLoadingMore.value = true;
  if (initial) {
    skeleton.value = true;
    gifts.value = [];
    giftsOffset.value = 0;
    giftsHasMore.value = true;
  }

  const res = await APIMarket.items(
    giftsStatus.value,
    giftsLimit.value,
    giftsOffset.value
  ).catch(() => null);

  if (!res) {
    giftsLoadingMore.value = false;
    skeleton.value = false;
    return;
  }

  const items: any[] = res.items ?? [];
  gifts.value.push(...items);
  giftsOffset.value += items.length;

  if (res.total_all != null) {
    giftsHasMore.value = gifts.value.length < res.total_all;
    emit("gifts-count", res.total_all);
  } else {
    // Фоллбек
    giftsHasMore.value = items.length === giftsLimit.value;
  }

  giftsLoadingMore.value = false;
  skeleton.value = false;
}

function resolveRoot(): Element | null {
  const el = props.scrollEl?.value ?? props.scrollEl ?? null;
  return el instanceof Element ? el : null;
}

function setupObserver() {
  if (!giftsSentinel.value) return;
  io?.disconnect();

  io = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (giftsLoadingMore.value || !giftsHasMore.value) continue;
        io?.unobserve(entry.target);
        (async () => {
          await getGifts(false);
          await nextTick();
          await autoDrainIfStillVisible();
          if (giftsSentinel.value && giftsHasMore.value) {
            io?.observe(giftsSentinel.value);
          }
        })();
      }
    },
    {
      root: resolveRoot(),
      rootMargin: "0px 0px 1200px 0px",
      threshold: 0,
    }
  );

  io.observe(giftsSentinel.value);
}

let ro: ResizeObserver | null = null;
let scrollOff: (() => void) | null = null;
let resizeOff: (() => void) | null = null;

function nearBottom(gap = 600) {
  const root = resolveRoot();
  if (root) {
    const el = root as HTMLElement;
    return el.scrollTop + el.clientHeight >= el.scrollHeight - gap;
  }
  return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - gap;
}

function attachScrollFallback() {
  const root = resolveRoot();
  let tick = false;
  const onScroll = () => {
    if (tick) return;
    tick = true;
    requestAnimationFrame(async () => {
      tick = false;
      if (!giftsLoadingMore.value && giftsHasMore.value && nearBottom(700)) {
        await getGifts(false);
        await nextTick();
        autoDrainIfStillVisible();
      }
    });
  };

  if (root) {
    root.addEventListener("scroll", onScroll, { passive: true });
    scrollOff = () => root.removeEventListener("scroll", onScroll);
  } else {
    window.addEventListener("scroll", onScroll, { passive: true });
    scrollOff = () => window.removeEventListener("scroll", onScroll);
  }
}

function isSentinelVisible(): boolean {
  if (!giftsSentinel.value) return false;
  const root = resolveRoot();
  const sRect = giftsSentinel.value.getBoundingClientRect();

  if (root) {
    const rRect = (root as Element).getBoundingClientRect();
    return sRect.top <= rRect.bottom;
  }
  return sRect.top <= window.innerHeight;
}

function needsMoreToFill(buffer = 200): boolean {
  const root = resolveRoot();
  if (root) {
    const el = root as HTMLElement;
    return el.scrollHeight < el.clientHeight + buffer;
  }
  const doc = document.documentElement;
  return doc.scrollHeight < window.innerHeight + buffer;
}

async function topUpViewport(maxPages = 10) {
  let pages = 0;
  while (
    giftsHasMore.value &&
    !giftsLoadingMore.value &&
    needsMoreToFill(120) &&
    pages < maxPages
  ) {
    await getGifts(false);
    await nextTick();
    pages++;
  }
}

async function autoDrainIfStillVisible() {
  await topUpViewport(10);
  while (
    !giftsLoadingMore.value &&
    giftsHasMore.value &&
    isSentinelVisible()
  ) {
    await getGifts(false);
    await nextTick();
    await topUpViewport(5);
  }
}

onMounted(async () => {
  await nextTick();
  await getGifts(true);
  await nextTick();
  await topUpViewport(12);
  setupObserver();

  const list = document.querySelector(".gifts .items") as HTMLElement | null;
  if (list) {
    ro = new ResizeObserver(() => autoDrainIfStillVisible());
    ro.observe(list);
  }

  attachScrollFallback();
  const onResize = () => {
    topUpViewport(8);
  };
  window.addEventListener('resize', onResize, { passive: true });
  resizeOff = () => window.removeEventListener('resize', onResize as any);

  await nextTick();
  autoDrainIfStillVisible();
});

onBeforeUnmount(() => {
  if (io && giftsSentinel.value) io.unobserve(giftsSentinel.value);
  io?.disconnect();
  io = null;

  ro?.disconnect();
  ro = null;

  scrollOff?.();
  scrollOff = null;
  resizeOff?.();
  resizeOff = null;
});
</script>

<template>
  <div class="gifts">
    <div class="items">
      <div v-if="skeleton" class="item" v-for="(_, index) in gifts" :key="index">
        <div class="sk-load" v-if="skeleton"></div>
      </div>
      <div v-if="!skeleton" class="item" v-for="(item, index) in gifts" :key="index">
        <div
          class="background upg"
          :style="{
            '--start-color': item.bg_start,
            '--center-color': item.bg_center,
            '--end-color': item.bg_end,
          }"
        ></div>
        <div class="model">
          <div class="upg">
            <div class="image">
              <img :src="item.image" alt="model" />
            </div>
          </div>
        </div>
        <div class="name">
          <h4>{{ item.name }}</h4>
        </div>
        <div class="buttons">
          <button>
            <h4>{{ cutNumberNano(item.price_nano) }}</h4>
            <img :src="TonWhiteIcon" alt="ton" />
          </button>
          <button>
            <img :src="BasketIcon" alt="basket" />
          </button>
        </div>
      </div>

      <div v-if="!skeleton && giftsLoadingMore" class="loading-more">
        <div class="sk-load"></div>
      </div>

      <div ref="inventorySentinel" class="sentinel"></div>
    </div>
  </div>
</template>

<style lang="scss" src="./Gifts.scss" scoped></style>