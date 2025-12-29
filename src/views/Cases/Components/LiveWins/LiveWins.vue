<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch, computed } from "vue";
import { cutNumberNano } from "../../../../utils/useTon";
import { useCacheStore } from "../../../../stores/pinia-store";
import { getImgSvg } from "../../../../utils/useApp";

// Icons
import LiveIcon from "@/assets/icons/live.svg";
import LiveCaseText from "@/assets/images/cases-pg/live-case-text.svg";
import LiveCaseBlur from "@/assets/images/cases-pg/live-case-blur.png";
import LiveCaseTon from "@/assets/images/cases-pg/ton.svg";

// Sounds
// import AddSound from "@/assets/sounds/add.mp3";

const WS_URL = import.meta.env.VITE_APP_SOCKET_API_URL;
const wrapRef = ref<HTMLDivElement | { $el: HTMLDivElement } | null>(null);

const useCache = useCacheStore() as any;

const randomDeg = () => Math.floor(Math.random() * (11 - -13 + 1)) - 13;

type LiveItem = {
  id: number;
  image: string;
  degree: number;
  price: number;
  BGStart: string;
  BGCenter: string;
  BGEnd: string;
  loaded: boolean;
  failed?: boolean;
};

const skeleton = ref<boolean>(true);

const WATCHDOG_MS = 4000;
const MAX_ITEMS = 6;
const GAP = 8;

const disableSnap = ref(false);

const initialItems = Array.isArray(useCache?.LiveWinsData) && useCache.LiveWinsData.length
  ? useCache.LiveWinsData
  : Array.from({ length: 4 }, (_, i) => ({
      id: Date.now() + i,
      image: "",
      degree: randomDeg(),
      price: 0,
      BGStart: "", BGCenter: "", BGEnd: "",
      loaded: false,
    }));

const items = ref<LiveItem[]>(initialItems);
const itemsLimited = computed(() => items.value.slice(0, MAX_ITEMS));

const imgWatchdogs = new Map<number, number>();

const hasSrc = (src?: string) => {
  const s = getImgSvg(src || "");
  return Boolean(s && typeof s === "string");
};

function armWatchdog(it: LiveItem) {
  clearWatchdog(it.id);
  const tid = window.setTimeout(() => {
    const idx = items.value.findIndex(x => x.id === it.id);
    if (idx === -1) return;
    // items.value.splice(idx, 1);
    clearWatchdog(it.id);
  }, WATCHDOG_MS) as unknown as number;

  imgWatchdogs.set(it.id, tid);
}

function clearWatchdog(id: number) {
  const tid = imgWatchdogs.get(id);
  if (tid) {
    clearTimeout(tid);
    imgWatchdogs.delete(id);
  }
}

function onImgLoad(it: LiveItem) {
  const found = items.value.find(x => x.id === it.id);
  if (!found) return;
  found.loaded = true;
  found.failed = false;
  clearWatchdog(it.id);
}

function onImgError(it: LiveItem) {
  const idx = items.value.findIndex(x => x.id === it.id);
  if (idx === -1) return;

  const found = items.value[idx];
  found.loaded = false;
  found.failed = true;
  clearWatchdog(it.id);

  setTimeout(() => {
    items.value.findIndex(x => x.id === it.id);
    // if (i !== -1) items.value.splice(i, 1);
  }, 1000);
}

async function prependItemSmooth(it: LiveItem) {
  const root = wrapRef.value as any;
  const el = (root?.$el ?? root) as HTMLDivElement | null;
  if (!el) return;

  const prevScroll = el.scrollLeft;
  disableSnap.value = true;

  items.value.unshift({ ...it, loaded: false, failed: false });
  armWatchdog(it);
  await nextTick();

  await nextTick();

  const first = el.firstElementChild as HTMLElement | null;
  const w = (first?.offsetWidth || 0) + GAP;

  el.scrollLeft = prevScroll + w;

  requestAnimationFrame(() => {
    el.scrollTo({ left: el.scrollLeft - w, behavior: "smooth" });
    setTimeout(() => { disableSnap.value = false; }, 350);
  });

  if (items.value.length > MAX_ITEMS) {
    const removed = items.value.splice(MAX_ITEMS);
    removed.forEach(r => clearWatchdog(r.id));
  }

  skeleton.value = false;
}

function normalizeOne(payload: any): LiveItem | null {
  if (!payload || typeof payload !== "object") return null;

  const rawImage =
    payload.Image ?? payload.image ?? payload.ModelImage ?? payload.model_image ?? "";

  if (!hasSrc(rawImage)) return null;

  const priceTon = Number(cutNumberNano(payload.price_nano ?? 0));
  if (!isFinite(priceTon) || priceTon <= 0) return null;

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    image: rawImage,
    degree: randomDeg(),
    price: priceTon,
    BGStart: payload.BGStart ?? "#000000",
    BGCenter: payload.BGCenter ?? "#000000",
    BGEnd: payload.BGEnd ?? "#000000",
    loaded: false,
    failed: false,
  };
}

// ---- WebSocket: keep-alive без принудительного закрытия
let ws: WebSocket | null = null;
let reconnectTimer: number | null = null;
let heartbeatTimer: number | null = null;
let reconnectAttempts = 0;

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = window.setInterval(() => {
    try { ws?.send?.(JSON.stringify({ type: "ping", t: Date.now() })); } catch {}
  }, 25000);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

let manualClose = false;

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts)); // 1s→2s→4s…≤30s
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay) as unknown as number;
}

function connect() {
  manualClose = false;
  try { ws?.close(); } catch {}
  ws = new WebSocket(WS_URL + "/live");
  ws.addEventListener("open", () => {
    console.log("✅ [WS] Connected");
    reconnectAttempts = 0;
    startHeartbeat();
  });

  ws.addEventListener("message", async (ev) => {
    let data: any = null;
    try { data = JSON.parse(ev.data); } catch { return; }
    if (data?.type) console.log("🏷️ [WS] Event type:", data.type);
    if (data?.type === "pong" || data?.op === "pong") return;

    const payload =
      data?.payload ??
      data?.data ??
      data?.items ??
      data;

    if (payload && payload.type === "append") {
      const item = normalizeOne(payload.item);
      // const sound = new Audio(AddSound);
      // sound.volume = 0.04;
      // sound.play();
      if (item) await prependItemSmooth(item);
      return;
    }

    if (Array.isArray(payload)) {
      for (let i = 0; i < payload.length; i++) {
        const it = normalizeOne(payload[i]);
        if (it) await prependItemSmooth(it);
      }
    } else {
      const it = normalizeOne(payload);
      if (it) await prependItemSmooth(it);
    }
  });

  ws.addEventListener("close", () => {
    stopHeartbeat();
    if (!manualClose) { reconnectAttempts++; scheduleReconnect(); }
  });

  ws.addEventListener("error", (err) => {
    console.error("❌ [WS] Error:", err);
    try { ws?.close(); } catch {}
  });
}

watch(itemsLimited, (val) => {
  useCache.LiveWinsData = val;
}, { deep: true });

onMounted(() => {
  if (items.value.length) skeleton.value = false;
  connect();
});

onBeforeUnmount(() => {
  manualClose = true;
  stopHeartbeat();
  if (reconnectTimer) clearTimeout(reconnectTimer);
  try { ws?.close(); } catch {}
});
</script>

<template>
  <div class="live-wins" :class="{ skeleton: skeleton }">
    <div class="block">
      <div class="inner">
        <div class="blur"><img :src="LiveCaseBlur" alt="live case blur" /></div>
        <img class="live-icon" :src="LiveIcon" alt="live icon" />
        <img :src="LiveCaseText" alt="live case text" />
      </div>
    </div>

    <TransitionGroup
      name="pop"
      tag="div"
      class="items"
      :class="{ 'no-snap': disableSnap }"
      ref="wrapRef"
    > 
      <div
        class="item"
        v-for="item in itemsLimited"
        :key="item.id"
        :style="{
          '--deg': `${item.degree}deg`,
          '--start-color': item.BGStart || '#000',
          '--center-color': item.BGCenter || '#000',
          '--end-color': item.BGEnd || '#000',
        }"
      >
        <div
          class="img-skeleton"
          v-if="!item.loaded && !item.failed"
        ></div>

        <div
          class="img-fallback"
          v-else-if="item.failed"
        ></div>
        
        <div class="image">
          <img
            v-if="!item.failed && getImgSvg(item.image)"
            :src="getImgSvg(item.image)"
            :class="{ loaded: item.loaded }"
            @load="onImgLoad(item)"
            @error="onImgError(item)"
          />
        </div>

        <div v-if="item.price" class="price">
          <p>{{ item.price }}</p>
          <img :src="LiveCaseTon" alt="ton" />
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style lang="scss" src="./LiveWins.scss" scoped></style>