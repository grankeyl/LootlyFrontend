<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useCacheStore } from "../../../../stores/pinia-store";
import { cutNumberNano } from "../../../../utils/useTon";
import { Icon } from "../../../../components/Icon";

import * as APICases from "../../../../api/cases";

// Icons
import TonWhiteIcon from "@/assets/icons/ton-white.svg";

const emit = defineEmits<{
  (e: "open-modal"): void;
  (e: "open-modal-withdraw-gift"): void;
  (e: "inventory-count", count: number): void;
}>();

const props = defineProps<{
  scrollEl?: any;
}>();

function handleClick() {
  emit("open-modal");
}

let io: IntersectionObserver | null = null;

const skeleton = ref(true);
const useCache = useCacheStore() as any;

const inventoryAllCount = ref(0);
const inventorySentinel = ref<HTMLDivElement|null>(null);
const inventoryLoadingMore = ref(false);
const inventoryHasMore = ref(true);
const inventoryStatus = ref("all");
const inventoryLimit = ref(20);
const inventoryOffset = ref(0);
const inventory = ref<any[]>(
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

async function getInventory(initial = false) {
  if (inventoryLoadingMore.value || (!inventoryHasMore.value && !initial)) return;

  inventoryLoadingMore.value = true;
  if (initial) {
    skeleton.value = true;
    inventory.value = [];
    inventoryOffset.value = 0;
    inventoryHasMore.value = true;
  }

  const res = await APICases.inventory(
    inventoryStatus.value,
    inventoryLimit.value,
    inventoryOffset.value
  ).catch(() => null);

  if (!res) {
    inventoryLoadingMore.value = false;
    skeleton.value = false;
    return;
  }

  const items: any[] = res.items ?? [];
  inventory.value.push(...items);
  inventoryOffset.value += items.length;

  if (res.total_all != null) {
    inventoryHasMore.value = inventory.value.length < res.total_all;
    emit("inventory-count", res.total_all);
  } else {
    // Фоллбек
    inventoryHasMore.value = items.length === inventoryLimit.value;
  }

  inventoryLoadingMore.value = false;
  skeleton.value = false;
}

function resolveRoot(): Element | null {
  const el = props.scrollEl?.value ?? props.scrollEl ?? null;
  return el instanceof Element ? el : null;
}

function setupObserver() {
  if (!inventorySentinel.value) return;
  io?.disconnect();

  io = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (inventoryLoadingMore.value || !inventoryHasMore.value) continue;
        io?.unobserve(entry.target);
        (async () => {
          await getInventory(false);
          await nextTick();
          await autoDrainIfStillVisible();
          if (inventorySentinel.value && inventoryHasMore.value) {
            io?.observe(inventorySentinel.value);
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

  io.observe(inventorySentinel.value);
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
      if (!inventoryLoadingMore.value && inventoryHasMore.value && nearBottom(700)) {
        await getInventory(false);
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
  if (!inventorySentinel.value) return false;
  const root = resolveRoot();
  const sRect = inventorySentinel.value.getBoundingClientRect();

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
    inventoryHasMore.value &&
    !inventoryLoadingMore.value &&
    needsMoreToFill(120) &&
    pages < maxPages
  ) {
    await getInventory(false);
    await nextTick();
    pages++;
  }
}

async function autoDrainIfStillVisible() {
  await topUpViewport(10);
  while (
    !inventoryLoadingMore.value &&
    inventoryHasMore.value &&
    isSentinelVisible()
  ) {
    await getInventory(false);
    await nextTick();
    await topUpViewport(5);
  }
}

onMounted(async () => {
  await nextTick();
  await getInventory(true);
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
  if (io && inventorySentinel.value) io.unobserve(inventorySentinel.value);
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
  <div class="gifts" :class="{ skeleton: skeleton }">
    <div class="items blocks">
      <div v-if="skeleton" class="item" v-for="(_, index) in inventory" :key="index">
        <div class="sk-load" v-if="skeleton"></div>
      </div>
      <div v-if="!skeleton" class="item" v-for="(item, index) in inventory" :key="index" @click="handleClick">
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
              <img :src="item.reward_image" alt="model" />
            </div>
          </div>
        </div>
        <div class="button" :class="item.status">
          <button v-if="item.status && item.status === 'sold'">
            <h5>Solded</h5>
            <div class="kit-icon" v-html="Icon.Done"></div>
          </button>
          <button v-if="item.status && item.status === 'held'">
            <h5>{{ cutNumberNano(item.price_nano) }}</h5>
            <img :src="TonWhiteIcon" alt="ton-icon" />
          </button>
          <button v-if="item.status && item.status === 'used'">
            <h5>Withdrawal</h5>
          </button>
        </div>
      </div>

      <div v-if="!skeleton && inventoryLoadingMore" class="loading-more">
        <div class="sk-load"></div>
      </div>

      <div ref="inventorySentinel" class="sentinel"></div>
    </div>
  </div>
</template>

<style lang="scss" src="./Gifts.scss" scoped></style>