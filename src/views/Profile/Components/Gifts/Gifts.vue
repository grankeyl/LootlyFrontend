<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch, computed } from "vue";
import { cutNumberNano } from "../../../../utils/useTon";
import { Icon } from "../../../../components/Icon";
import * as APICases from "../../../../api/cases";
import TonWhiteIcon from "@/assets/icons/ton-white.svg";
import { getImgSvg } from "../../../../utils/useApp";

type Gift = any;

const emit = defineEmits<{
  (e: 'open-modal', payload: Gift): void
  (e: 'inventory-set', value: any[]): void
  (e: 'inventory-count', value: number): void
}>();

const props = defineProps<{
  scrollEl?: any;         // HTMLElement | Ref<HTMLElement|null>
  inventory?: any[];      // начальные данные (опционально)
  status?: string;        // фильтр, по умолчанию 'all'
  pageSize?: number;      // лимит на страницу, по умолчанию 20
}>();

/* ================== STATE ================== */
const status = computed(() => props.status ?? "all");
const limit  = computed(() => Math.max(1, props.pageSize ?? 20));

const items = ref<any[]>(props.inventory ?? []);
const total = ref<number | null>(null);
const offset = ref(0);
const hasMore = ref(true);
const loading = ref(false);
const skeleton = ref(true);

const sentinel = ref<HTMLDivElement|null>(null);
const containerEl = ref<HTMLElement|null>(null); // .gifts .items
let io: IntersectionObserver | null = null;
let ro: ResizeObserver | null = null;
let scrollOff: (() => void) | null = null;

let reqId = 0; // защита от гонок

/* ================== HELPERS ================== */
function getPassedEl(): HTMLElement | null {
  const passed = props.scrollEl && ('value' in props.scrollEl ? props.scrollEl.value : props.scrollEl);
  return passed instanceof Element ? (passed as HTMLElement) : null;
}

function getScrollable(el: Element | null): HTMLElement | null {
  const isScrollable = (n: Element | null) => {
    if (!n) return false;
    const cs = getComputedStyle(n);
    const oy = cs.overflowY;
    return (oy === 'auto' || oy === 'scroll') && (n as HTMLElement).scrollHeight > (n as HTMLElement).clientHeight;
  };

  // сначала проверяем сам элемент
  if (isScrollable(el)) return el as HTMLElement;

  // затем поднимаемся вверх
  let node: Element | null = el?.parentElement ?? null;
  while (node && node !== document.body) {
    if (isScrollable(node)) return node as HTMLElement;
    node = node.parentElement;
  }
  return null;
}

const root = ref<HTMLElement | null>(null);
function pickRoot() {
  root.value =
    getPassedEl() ??
    getScrollable(containerEl.value) ??
    getScrollable(sentinel.value) ??   // 👈 если скроллер — сама .items
    null;
}

function nearBottom(gap = 600) {
  const r = root.value;
  if (r) return r.scrollTop + r.clientHeight >= r.scrollHeight - gap;
  return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - gap;
}

/* ================== DATA ================== */
async function load(initial = false) {
  if (loading.value || (!hasMore.value && !initial)) return;

  const my = ++reqId;
  loading.value = true;
  if (initial) {
    skeleton.value = true;
    items.value = [];
    offset.value = 0;
    hasMore.value = true;
    total.value = null;
    emit("inventory-set", items.value);
  }

  const res = await APICases
    .inventory(status.value, limit.value, offset.value)
    .catch(() => null);

  if (my !== reqId) return; // пришёл устаревший ответ

  if (!res) {
    loading.value = false;
    skeleton.value = false;
    return;
  }

  const batch: any[] = res.items ?? [];
  items.value.push(...batch);
  emit("inventory-set", items.value);

  offset.value += batch.length;

  const t = (res.total_all ?? res.total ?? null) as number | null;
  if (t != null) {
    total.value = t;
    hasMore.value = items.value.length < t;
    emit("inventory-count", t);
  } else {
    hasMore.value = batch.length === limit.value;
  }

  loading.value = false;
  skeleton.value = false;
}

/* ================== AUTOFILL ================== */
function needsMoreToFill(buffer = 120) {
  const r = root.value;
  if (r) return r.scrollHeight < r.clientHeight + buffer;
  return document.documentElement.scrollHeight < window.innerHeight + buffer;
}

async function fillViewport(maxPages = 10) {
  let pages = 0;
  while (!loading.value && hasMore.value && needsMoreToFill() && pages < maxPages) {
    await load(false);
    await nextTick();
    pages++;
  }
}

/* ================== OBSERVERS ================== */
function teardownIO() {
  if (io && sentinel.value) io.unobserve(sentinel.value);
  io?.disconnect();
  io = null;
}

function setupIO() {
  teardownIO();
  if (!sentinel.value) return;

  io = new IntersectionObserver(async entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      if (loading.value || !hasMore.value) continue;
      io?.unobserve(e.target);
      await load(false);
      await nextTick();
      await fillViewport(5);
      if (sentinel.value && hasMore.value) io?.observe(sentinel.value);
    }
  }, {
    root: root.value ?? null,
    rootMargin: "0px 0px 800px 0px",
    threshold: 0,
  });

  io.observe(sentinel.value);
}

function teardownScroll() {
  scrollOff?.();
  scrollOff = null;
}

function setupScroll() {
  teardownScroll();
  const target: HTMLElement | Window = root.value ?? window;
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(async () => {
      ticking = false;
      if (!loading.value && hasMore.value && nearBottom(700)) {
        await load(false);
        await nextTick();
        await fillViewport(5);
      }
    });
  };
  target.addEventListener("scroll", onScroll, { passive: true });
  scrollOff = () => target.removeEventListener("scroll", onScroll);
}

function rebindAll() {
  pickRoot();
  setupIO();
  setupScroll();
}

/* ================== LIFECYCLE ================== */
const itemsEl = ref<HTMLElement|null>(null);
onMounted(async () => {
  await nextTick();
  containerEl.value = itemsEl.value;

  rebindAll();

  await load(true);
  await nextTick();
  await fillViewport(12);

  // следим за изменением размеров списка — при «раскрытии» root может появиться
  if (containerEl.value) {
    ro = new ResizeObserver(() => {
      pickRoot();
      setupIO(); // обновить root у IO
      // скролл-таргет, как правило, не меняется после появления, но на всякий — перевесим
      setupScroll();
    });
    ro.observe(containerEl.value);
  }

  // на resize тоже переопределим root + дольём
  const onWinResize = async () => {
    rebindAll();
    await fillViewport(8);
  };
  window.addEventListener("resize", onWinResize, { passive: true });
  // сохраним для снятия:
  scrollOff = ((oldOff => {
    return () => {
      oldOff?.();
      window.removeEventListener("resize", onWinResize as any);
    };
  })(scrollOff)) as any;
});

onBeforeUnmount(() => {
  teardownIO();
  teardownScroll();
  ro?.disconnect();
  ro = null;
});

watch(() => props.inventory, (v) => {
  if (!v) return;
  items.value = v;
});

function openItem(g: Gift) { 
  if (!g) return;
  if (g.status === "sold") return;
  emit("open-modal", g); 
}
</script>

<template>
  <div class="gifts" :class="{ skeleton: skeleton }">
    <div class="items blocks" ref="itemsEl">
      <div v-if="skeleton" class="item" v-for="i in 8" :key="'sk-'+i">
        <div class="sk-load" v-if="skeleton"></div>
      </div>
      <div v-if="!skeleton" class="item" v-for="(item, index) in items" :key="index" @click="openItem(item)">
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
              <img :src="getImgSvg(item.reward_image)" alt="model" />
            </div>
          </div>
        </div>
        <div class="button" :class="item.status">
          <button v-if="item.status && item.status === 'sold'">
            <h5>{{ $t('profile.gifts.statusSold') }}</h5>
            <div class="kit-icon" v-html="Icon.Done"></div>
          </button>
          <button v-if="item.status && (item.status === 'held' || item.status === 'purchased')">
            <h5>{{ cutNumberNano(item.price_nano) }}</h5>
            <img :src="TonWhiteIcon" alt="ton-icon" />
          </button>
          <button v-if="item.status && item.status === 'used'">
            <h5>{{ $t('profile.gifts.statusUsed') }}</h5>
          </button>
        </div>
      </div>

      <div v-if="!skeleton && loading" class="loading-more">
        <div class="sk-load"></div>
      </div>

      <div ref="sentinel" class="sentinel"></div>
    </div>
  </div>
</template>

<style lang="scss" src="./Gifts.scss" scoped></style>
<style>
.sentinel { height: 1px; width: 100%; }
</style>