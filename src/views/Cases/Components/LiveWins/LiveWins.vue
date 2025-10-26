<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import { cutNumberNano } from "../../../../utils/useTon";

// Icons
import LiveIcon from "@/assets/icons/live.svg";
import LiveCaseText from "@/assets/images/cases-pg/live-case-text.svg";
import LiveCaseBlur from "@/assets/images/cases-pg/live-case-blur.png";
import LiveCaseTon from "@/assets/images/cases-pg/ton.svg";

const WS_URL = import.meta.env.VITE_APP_SOCKET_API_URL;
const wrapRef = ref<HTMLDivElement|null>(null);
const randomDeg = () => Math.floor(Math.random() * (11 - -13 + 1)) - 13;

type LiveItem = {
  id: number;
  image: string;
  degree: number;
  price: number;
  BGStart: string;
  BGCenter: string;
  BGEnd: string;
};

const skeleton = ref<boolean>(true);
const MAX_ITEMS = 6;

const items = ref<LiveItem[]>(
  Array.from({ length: MAX_ITEMS }, () => ({
    id: 1,
    image: "",
    degree: randomDeg(),
    price: 0,
    BGStart: "",
    BGCenter: "",
    BGEnd: "",
  }))
);

async function prependItemSmooth(it: LiveItem) {
  const el = wrapRef.value;
  const first = el?.firstElementChild as HTMLElement | null;
  const prevLeft = first?.getBoundingClientRect().left ?? 0;

  items.value.unshift(it);

  await nextTick();
  if (!el) return;
    skeleton.value = false;

  const newFirst = el.firstElementChild as HTMLElement | null;
  const newLeft = newFirst?.getBoundingClientRect().left ?? 0;

  el.scrollLeft += (newLeft - prevLeft);

  if (newFirst) {
    const w = newFirst.getBoundingClientRect().width + 8;
    el.scrollTo({ left: el.scrollLeft - w, behavior: "smooth" });
  }
}

function normalizeOne(payload: any): any | null {
  if (!payload || typeof payload !== "object") return null;

  const image =
    payload.Image ??
    payload.image ??
    payload.ModelImage ??
    payload.model_image ??
    "";

  const priceTon = cutNumberNano(payload.price_nano ?? 0) as any;

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    image,
    degree: randomDeg(),
    price: priceTon,
    BGStart: payload.BGStart ?? "#000000",
    BGCenter: payload.BGCenter ?? "#000000",
    BGEnd: payload.BGEnd ?? "#000000",
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

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts)); // 1s→2s→4s…≤30s
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay) as unknown as number;
}

function connect() {
  try { ws?.close(); } catch {}
  ws = new WebSocket(WS_URL);
  ws.addEventListener("open", () => {
    console.log("✅ [WS] Connected");
    reconnectAttempts = 0;
    startHeartbeat();
  });

  ws.addEventListener("message", async (ev) => {
    let data: any = null;
    try { data = JSON.parse(ev.data); } catch { return; }
    if (data?.type) console.log("🏷️ [WS] Event type:", data.type);
    if (data?.type === "pong" || data?.op === "pong") {
      return;
    }

    const payload =
      data?.payload ??
      data?.data ??
      data?.items ??
      data;

    if (payload && payload.type === "append") {
      const item = payload.item;
      await prependItemSmooth(normalizeOne(item));
      return;
    }

    if (Array.isArray(payload)) {
      for (let i = 0; i < payload.length; i++) {
        const it = normalizeOne(payload[i]);
        if (it) {
          await prependItemSmooth(it);
        }
      }
    } else {
      const it = normalizeOne(payload);
      if (it) {
        await prependItemSmooth(it);
      }
    }
  });

  ws.addEventListener("close", (e) => {
    console.warn("🔴 [WS] Closed:", e.code, e.reason || "(no reason)");
    stopHeartbeat();
    reconnectAttempts++;
    scheduleReconnect();
  });

  ws.addEventListener("error", (err) => {
    console.error("❌ [WS] Error:", err);
    try { ws?.close(); } catch {}
  });
}

onMounted(() => {
  connect();
});

onBeforeUnmount(() => {
  stopHeartbeat();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  try { ws?.close(); } catch {}
});
</script>

<template>
  <div class="live-wins" :class="{ skeleton: skeleton }">
    <div class="block">
      <div class="inner">
        <div class="blur"><img :src="LiveCaseBlur" alt="live case blur" /></div>
        <img class="live-icon" :src="LiveIcon" alt="live icon" />
        <img :src="LiveCaseText" alt="live case blur" />
      </div>
    </div>

    <TransitionGroup name="pop" tag="div" class="items" appear ref="wrapRef">
      <div
        class="item"
        v-for="(item, index) in items.slice(0, MAX_ITEMS)"
        :key="index"
        :style="{ 
          '--deg': `${item.degree}deg`,
          '--start-color': `${item.BGStart ?? '#000000'}`,
          '--center-color': `${item.BGCenter ?? '#000000'}`,
          '--end-color': `${item.BGEnd ?? '#000000'}`,
        }"
      >
        <div class="sk-load" v-if="skeleton"></div>
        <div class="image"><img :src="item.image" alt="gift image" /></div>
        <div class="price">
          <p>{{ item.price }}</p>
          <img :src="LiveCaseTon" alt="ton" />
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style lang="scss" src="./LiveWins.scss" scoped></style>
<style scoped>
.items{
  display:flex; gap:8px; align-items:center;
}
.items::-webkit-scrollbar{ display:none; }
.items{ scroll-snap-type:x proximity; }
.item{ scroll-snap-align:start; }
.item{
  transform: rotate(var(--deg, 0deg));
  transition: transform .45s cubic-bezier(.25,1,.5,1), opacity .35s ease, filter .35s ease;
}
.pop-enter-from{ opacity:0; transform: rotate(calc(var(--deg,0deg) - 12deg)) scale(.88); filter: blur(6px); }
.pop-enter-active{ transition: opacity .5s ease, transform .55s cubic-bezier(.22,1.1,.36,1), filter .5s ease; }
.pop-enter-to{ opacity:1; transform: rotate(var(--deg,0deg)) scale(1); filter: blur(0); }
.pop-move{ transition: transform .35s cubic-bezier(.25,1,.5,1); }
</style>