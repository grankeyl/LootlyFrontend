<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { cutNumberNano } from "../../../../utils/useTon";
import { useCacheStore } from "../../../../stores/pinia-store";
import { getImgSvg } from "../../../../utils/useApp";

import * as APICases from "../../../../api/cases";

// Images
import Ton from "@/assets/images/cases-pg/ton.svg";
import Empty from "../../../../components/common/Empty/Empty.vue";

const emit = defineEmits<{ 
  (e: "open-case", payload: any): void 
  (e: "open-free-case", payload: any): void
}>();
const props = defineProps<{ ActiveTab: string }>();

const useCache = useCacheStore() as any;
const bucketsLink = import.meta.env.VITE_APP_S3_LINK;

const skeleton = ref(true);
const cases = ref<any[]>(
  Array.from({ length: 10 }, () => ({
    Image: `${bucketsLink}/cases/covers/Pink_Case.png`,
    Name: "Pink Case",
    price_nano: 1_000_000_000,
    BGStart: "#B0137E",
    BGCenter: "#70104F",
    BGEnd: "#2B072C",
    Symbol: `${bucketsLink}/symbols/Teleplane.png`,
    Load: true,
  }))
);

const freeCases = computed(() => cases.value.filter((i) => i.price_nano === 0));

// ===== Timer (countdown to item.ResetTimestamp)
const nowTs = ref(Date.now());
let nowTid: number | null = null;

function toMs(ts: any): number {
  if (ts == null) return 0;

  if (typeof ts === "string") {
    // "2025-12-31 11:00:00" -> "2025-12-31T11:00:00+03:00"
    const s = ts.trim();
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(s)) {
      const iso = s.replace(" ", "T") + "+03:00";
      const parsed = Date.parse(iso);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    const parsed = Date.parse(s);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const n = typeof ts === "number" ? ts : Number(ts);
  if (!Number.isFinite(n)) return 0;
  return n < 1e12 ? n * 1000 : n;
}

function pad2(v: number) {
  return String(Math.max(0, v)).padStart(2, "0");
}

function formatTimer(resetTimestamp: any) {
  const targetMs = toMs(resetTimestamp);
  if (!targetMs) return "00:00:00";

  const diffMs = targetMs - nowTs.value;
  if (diffMs <= 0) return "00:00:00";

  const totalSec = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

let refreshOnZeroTid: number | null = null;

function msLeft(resetTimestamp: any) {
  return toMs(resetTimestamp) - nowTs.value;
}

onMounted(() => {
  nowTid = window.setInterval(() => {
    nowTs.value = Date.now();

    // если есть хотя бы один free-case, который "уже открыт" и дошёл до нуля — перезапрос
    const needsRefresh = freeCases.value.some(
      (i) => i.AlreadyOpened && msLeft(i.ResetTimestamp) <= 0
    );

    if (needsRefresh) {
      // защита от спама
      if (refreshOnZeroTid) return;
      refreshOnZeroTid = window.setTimeout(async () => {
        useCache.CasesData = null; // или как ты сбрасываешь кэш
        await getCases();
        refreshOnZeroTid = null;
      }, 300); // чуть задержка чтобы бэк точно переключил
    }
  }, 1000);

  getCases();
});

onBeforeUnmount(() => {
  if (nowTid) window.clearInterval(nowTid);
  nowTid = null;
  if (refreshOnZeroTid) window.clearTimeout(refreshOnZeroTid);
});

function preloadImages(urls: (string | null | undefined)[], timeout = 15000) {
  if (!urls) { return; }
  const list = (urls || []).filter(Boolean) as string[];
  if (!list.length) return Promise.resolve();

  return Promise.all(
    list.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          const done = () => resolve();
          const tid = setTimeout(done, timeout);

          img.onload = () => {
            clearTimeout(tid);
            resolve();
          };
          img.onerror = () => {
            clearTimeout(tid);
            resolve();
          };
          img.src = src;
        })
    )
  );
}

function openCase(payload: any) {
  if (payload.Load) return;
  emit("open-case", payload);
}

function openFreeCase(payload: any) {
  emit("open-free-case", {
    ...payload,
  });
}

async function getCases() {
  skeleton.value = true;

  let list: any[] | null = useCache.CasesData?.length ? useCache.CasesData : null;

  if (!list) {
    const res = await APICases.cases().catch(() => null);
    list = res?.cases ?? null;
    if (!list) return;
    useCache.CasesData = list;
  }

  await preloadImages(list.map((i) => i.Image));

  cases.value = list;
  skeleton.value = false;
}
</script>

<template>
    <div class="cases-block">
        <div v-if="props.ActiveTab === 'nfts'" class="items" :class="{ skeleton: skeleton }">
            <div 
                v-for="(item, index) in freeCases" 
                :key="index"
                class="item free" 
                @click="openFreeCase(item)"
                :style="{ 
                    '--case-start-color': `${item.BGCenter}`,
                    '--case-center-color': `${item.BGCenter}`,
                    '--case-end-color': `${item.BGEnd}`,
                    '--chamomile-color': `${item.ChamomileColor}`
                }"
            >
                <div class="sk-load" v-if="skeleton"></div>
                <div class="image">
                    <img :src="getImgSvg(item.Image)" alt="image" />
                </div>
                <div class="context">
                    <div class="title">
                        <h4>{{ item.Name }}</h4>
                    </div>
                    <div class="button">
                        <button v-if="!item.AlreadyOpened">
                            <p>{{ $t('cases.open') }}</p>
                        </button>
                        <button v-if="item.AlreadyOpened" class="timer">
                            <p>{{ formatTimer(item.ResetTimestamp) }}</p>
                        </button>
                    </div>
                </div>
            </div>
            <div 
                v-for="(item, index) in cases" 
                v-show="item.price_nano"
                :key="index"
                class="item" 
                @click="openCase(item)"
                :style="{ 
                    '--case-start-color': `${item.BGCenter}`,
                    '--case-center-color': `${item.BGCenter}`,
                    '--case-end-color': `${item.BGEnd}`
                }"
            >
                <div class="sk-load" v-if="skeleton"></div>
                <div class="image">
                    <img :src="getImgSvg(item.Image)" alt="image" />
                </div>
                <div class="context">
                    <div class="title">
                        <h4>{{ item.Name }}</h4>
                    </div>
                    <div class="button">
                        <button>
                            <p>{{ cutNumberNano(item?.price_nano ?? 0n) }}</p>
                            <img :src="Ton" alt="ton">
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <Empty
            v-if="props.ActiveTab === 'memgifts'"
            :Title="'Empty cases'"
            :Description="'No cases yet'"
        />
    </div>
</template>

<style lang="scss" src="./Cases.scss" scoped></style>