<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useAttrs, watch } from "vue";
import { cutNumberNano } from "../../../../utils/useTon";
import { useCacheStore } from "../../../../stores/pinia-store";
import { getImgSvg } from "../../../../utils/useApp";
import { Icon } from "../../../../components/Icon";

import Lottie from "../../../../components/Lottie.vue";
import * as APICases from "../../../../api/cases";

import TonIcon from "@/assets/icons/ton.svg";
import TonWhiteRawIcon from "@/assets/icons/ton-white.svg?raw";
import TonBlackIcon from "@/assets/icons/ton-black.svg";
import DoneRawIcon from "@/assets/icons/done.svg?raw";
import CloseIcon from "@/assets/icons/close.svg";
import UsersRawIcon from "@/assets/icons/users.svg?raw";
import ArrowRightRawIcon from "@/assets/icons/arrow-right.svg?raw";
import Roulette from "@/components/common/Roulette/Roulette.vue";

import Ton from "@/assets/icons/ton.svg";
import TelegramModule from "../../../../hooks/useTelegram";

import { showErrorToast } from "../../../../utils/toastManager";
import { useSheetOverscrollProtection } from "./composables/useSheetOverscrollProtection";
import { useCaseRewards } from "./composables/useCaseRewards";
import { useRouter } from "vue-router";
import { useTranslation } from "i18next-vue";

const useCache = useCacheStore() as any;
const router = useRouter();

const { t } = useTranslation();

defineOptions({ inheritAttrs: false });

const emit = defineEmits<{
  (e: "close"): void;
  (e: "not-enough", payload: any): void;
}>();

const props = defineProps<{ data: { ID: number } }>();
const attrs = useAttrs();

/* =========================
   REACTIVE CASE FROM STORE
========================= */

const caseData = computed<any>(() => {
  return (useCache.CasesData as any[])?.find(i => i.ID === props.data.ID);
}) as any;

const isTimerActive = computed(() => {
  if (!caseData.value) return false;
  return caseData.value.OpenedToday >= caseData.value.DailyLimit;
});

/* ========================= */

const alreadyOpened = ref(false);
const resetTimestamp = ref<number>(0);

watch(caseData, (v) => {
  alreadyOpened.value = !!v?.AlreadyOpened;
  resetTimestamp.value = v?.ResetTimestamp ?? 0;
}, { immediate: true });

const rouletteRef = ref<InstanceType<typeof Roulette> | null>(null);

const isRollClicked = ref(false);
const isRolling = ref(false);
const isWin = ref(false);

const itemRolling = ref<any>({});
const itemWin = ref<any>(null);

const skeletonTasks = ref(true);
const skeletonRewards = ref(true);

const tasks = ref<any[]>([]);
const itemRewards = ref<any[]>(Array.from({ length: 9 }, () => ({
  bg_start: "#000000",
  bg_center: "#000000",
  bg_end: "#000000",
  image: null,
  price_ton: 0,
  name: "",
  loaded: false,
})));

const isDepCase = computed(() => caseData.value?.Status === "dep");

/* =========================
   SYMBOL
========================= */

const symbolLoaded = ref(false);

const symbolSrc = computed(() => {
  const s = caseData.value?.Symbol;
  return s ? getImgSvg(s) : "";
});

function preloadSymbol(src: string) {
  symbolLoaded.value = false;
  if (!src) return;

  const img = new Image();
  img.onload = () => src === symbolSrc.value && (symbolLoaded.value = true);
  img.src = src;
}

watch(symbolSrc, preloadSymbol, { immediate: true });

/* =========================
   REWARDS
========================= */

const { getRewards } = useCaseRewards({
  getCaseId: () => caseData.value?.ID,
  useCache,
  itemRewards,
  skeletonRewards,
});

/* =========================
   TASKS
========================= */

function getTasksCase() {
  if (!caseData.value) return;

  skeletonTasks.value = true;

  tasks.value = [{
    _id: "1",
    _done: caseData.value.AvailableOpens !== 0,
    _title: t("cases.modals.case.makeDeposit", { amount: cutNumberNano(caseData.value.MinDepositNano, 0) }),
  }];

  skeletonTasks.value = false;
}

watch(caseData, getTasksCase, { immediate: true });

function taskKey(t: any, i: number) {
  return t?._id ?? i;
}

function onTaskClick() {
  router.push("/balance");
  close();
}

/* =========================
   OPEN CASE
========================= */

async function rollTo() {
  if (isRollClicked.value || isRolling.value) return;

  isRollClicked.value = true;

  const open = await APICases.open(caseData.value.ID).catch(() => null);

  if (!open?.ok) {
    showErrorToast("Не удалось открыть кейс");
    isRollClicked.value = false;
    return;
  }

  (useCache.CasesData as any[]).forEach(i => {
    if (i.ID === caseData.value.ID) {
      i.AlreadyOpened = true;
      i.AvailableOpens = 0;
      i.OpenedToday += 1;
      i.ResetTimestamp = open.reset_timestamp;
    }
  });

  itemRolling.value = open;
  await nextTick();

  TelegramModule.useLightHaptic();
  isRolling.value = true;
  (useCache.UserData as any).BalanceNano -= caseData.value.price_nano;
}

// ===== Timer (countdown to item.ResetTimestamp)
const nowTs = ref(Date.now());

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

onMounted(() => {
  const interval = setInterval(() => {
    nowTs.value = Date.now();
  }, 1000);
  return () => clearInterval(interval);
});

/* =========================
   WIN
========================= */

function onWin(reward: any) {
  itemWin.value = reward;
  isWin.value = true;

  if (!reward?.rewardItem?.quick_sale) {
    (useCache.UserData as any).BalanceNano += reward?.rewardItem?.reward_price ?? 0n;
  }
}

function onCollect() {
  clearCase();
}

async function quickSell(id: string) {
  const res = await APICases.quick_sell(id).catch(() => null);
  if (!res?.ok) return;

  (useCache.UserData as any).BalanceNano = res.new_balance;
  clearCase();
}

function skipRoll() {
  rouletteRef.value?.skip();
}

function clearCase() {
  isRolling.value = false;
  isRollClicked.value = false;
  isWin.value = false;
  itemRolling.value = {};
  itemWin.value = null;
}

/* ========================= */

function available() {
  const cur = Number(caseData.value?.DailyLimit ?? 0);
  const used = Number(caseData.value?.OpenedToday ?? 0);
  return Math.max(0, cur - used);
}

const canOpenNow = computed(() => !!caseData.value?.AvailableOpens);

function close() {
  emit("close");
}

function openDeposit() {
  router.push("/balance");
  close();
}

/* ========================= */

const sheetOverscroll = useSheetOverscrollProtection(".sheet");

onMounted(() => {
  getRewards();
  sheetOverscroll.mount();
});

onBeforeUnmount(() => {
  sheetOverscroll.unmount();
});
</script>

<template>
  <div class="case-root" v-bind="attrs">
    <div class="balance">
      <div class="context">
        <h4>{{ cutNumberNano(useCache?.UserData?.BalanceNano ?? 0n, 2) }}</h4>
        <img :src="Ton" alt="ton" />
      </div>
      <div class="action">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10.0003 4.16675V15.8334M4.16699 10.0001H15.8337"
            stroke="#1E1E1E"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>

    <div class="sheet" :class="{ rolling: isRolling }">
      <div class="sheetContent">
        <div class="available">
          <h4>
            {{ caseData?.DailyLimit - available() }} / {{ caseData?.DailyLimit }}
          </h4>
        </div>
        <div class="close" @click="close">
          <img :src="CloseIcon" alt="close-icon" aria-hidden="true" />
        </div>

        <div
          class="backdrop"
          :style="{
            '--case-start-color': `${caseData?.BGStart ?? '#000000'}`,
            '--case-center-color': `${caseData?.BGCenter ?? '#000000'}`,
            '--case-end-color': `${caseData?.BGEnd ?? '#000000'}`,
          }"
        >
          <div class="backdrop-relay"></div>

          <div v-if="!isRolling" class="symbol upg">
            <img
              :src="symbolSrc"
              alt="symbol"
              class="symbol-img"
              :class="{ loaded: symbolLoaded }"
              @load="symbolLoaded = true"
              decoding="async"
            />
          </div>
        </div>

        <div v-if="isRolling" class="cover">
          <div class="title">
            <div v-if="isWin" class="win">
              <div class="text">
                <h4>{{ $t("cases.modals.case.congrats") }}</h4>
              </div>
              <div class="descr">
                <span>{{ $t("cases.modals.case.depositTon") }}</span>
              </div>
            </div>
          </div>

          <div v-if="isWin" class="cover-win">
            <div class="lottie-win">
              <Lottie path="/animations/confetti.json" :loop="false" renderer="svg" width="100%" height="100%" />
            </div>
            <div class="image-win">
              <div class="kit-icon" v-html="Icon.Flower" :style="{ '--chamomile-color': caseData?.ChamomileColor }"></div>
            </div>
          </div>

          <div v-if="!isWin" class="roll">
            <Roulette ref="rouletteRef" :Rolling="isRolling" :Items="itemRewards" :NeedItem="itemRolling" @win="onWin" />
          </div>

          <div v-if="isWin" class="winner-gift">
            <div
              class="item"
              :style="{
                '--bg-start-color': itemWin?.bg_start || '#000000',
                '--bg-center-color': itemWin?.bg_center || '#000000',
                '--bg-end-color': itemWin?.bg_end || '#000000',
              }"
            >
              <div class="image">
                <img :src="getImgSvg(itemWin?.image)" alt="gift image" />
              </div>
              <div class="price">
                <p>{{ itemWin?.price_ton }}</p>
                <div class="kit-icon" v-html="TonWhiteRawIcon"></div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!isRolling" class="cover not-rolling">
          <div class="relay">
            <div class="model">
              <div class="upg">
                <div class="image">
                  <img :src="getImgSvg(caseData?.Image)" alt="model" />
                </div>
              </div>
            </div>
          </div>

          <div class="title">
            <div class="top">
              <h4>{{ caseData?.Name }}</h4>
            </div>
            <div v-if="isWin" class="win">
              <h4>{{ $t("cases.modals.case.congrats") }}</h4>
              <span>{{ $t("cases.modals.case.congratsDesc") }}</span>
            </div>
          </div>

          <!-- DEP TASKS (refactored) -->
          <div v-if="isDepCase" class="inv-tasks">
            <div
              v-for="(item, index) in tasks"
              :key="taskKey(item, index)"
              class="task"
              :class="{ skeleton: skeletonTasks, done: item._done }"
              @click="onTaskClick()"
            >
              <div class="sk-load" v-if="skeletonTasks"></div>
              <div class="top">
                <div class="icon">
                  <div v-if="item._type === 'invite'" class="kit-icon" v-html="UsersRawIcon"></div>
                  <div v-else class="kit-icon" v-html="TonWhiteRawIcon"></div>
                </div>

                <div v-if="item._type === 'invite' && !item._done && !item.loading" class="progress">
                  <div class="progress-line" :style="{ width: item._percent + '%' }"></div>
                  <p>{{ item._progress }}</p>
                </div>

                <div v-else-if="!item._done && !item.loading" class="next">
                  <div class="kit-icon" v-html="ArrowRightRawIcon"></div>
                </div>

                <div v-if="item.loading" class="loading">
                  <div class="load-icon"></div>
                </div>

                <div v-if="item._done && !item.loading" class="done">
                  <div class="kit-icon" v-html="DoneRawIcon"></div>
                </div>
              </div>

              <div class="title">
                <h4>{{ item._title }}</h4>
              </div>
            </div>
          </div>

          <div v-if="itemRewards && itemRewards.length" class="items-title">
            <h4>{{ $t("cases.modals.whatsInside") }}</h4>
          </div>

          <div class="items">
            <div
              class="item"
              v-for="(reward, index) in itemRewards"
              :key="index"
              :class="{ skeleton: skeletonRewards }"
              :style="{
                '--bg-start-color': reward.bg_start || '#000000',
                '--bg-center-color': reward.bg_center || '#000000',
                '--bg-end-color': reward.bg_end || '#000000',
              }"
            >
              <div class="sk-load" v-if="skeletonRewards"></div>

              <div class="image">
                <div class="img-ph" v-show="!reward.loaded">
                  <div class="spinner" role="status" aria-label="Loading"></div>
                </div>

                <img
                  v-if="getImgSvg(reward.image)"
                  :src="getImgSvg(reward.image)"
                  loading="lazy"
                  decoding="async"
                  :class="['showing', { loaded: reward.loaded }]"
                  @load="reward.loaded = true"
                  :alt="reward.loaded ? 'gift image' : ''"
                />
              </div>

              <div class="price">
                <p>{{ reward.price_ton }}</p>
                <img :src="TonIcon" alt="ton" />
              </div>
            </div>
          </div>
        </div>

        <div v-if="isRolling && !isWin" class="buttons rolling">
          <div class="topper">
            <button class="skip" @click="skipRoll">
              <h4>{{ $t("cases.modals.case.buttons.skip") }}</h4>
            </button>
          </div>
        </div>

        <div v-if="isRolling && isWin" class="buttons win">
          <div v-if="itemWin?.rewardItem?.quick_sale" class="topper">
            <button @click="quickSell(itemWin.rewardItem.reward)">
              <h4>{{ $t("cases.modals.case.buttons.sellFor", { price: itemWin?.price_ton }) }}</h4>
              <img :src="TonBlackIcon" alt="ton-icon" />
            </button>
            <button @click="onCollect">
              <h4>{{ $t("cases.modals.case.buttons.collect") }}</h4>
            </button>
          </div>
          <div v-else class="topper">
            <div class="blocker">
              <button @click="onCollect" class="ok">
                <h4>{{ $t("cases.modals.case.buttons.ok") }}</h4>
              </button>
              <button class="deposit" @click="openDeposit">
                <h4>{{ $t("cases.modals.case.buttons.makeDeposit") }}</h4>
              </button>
            </div>
          </div>
        </div>

        <div v-if="!isRolling" class="buttons">
          <div class="topper">
            <button v-if="isTimerActive" class="timer disabled">
              <h4>{{ formatTimer(caseData.ResetTimestamp) }}</h4>
            </button>

            <button v-else-if="!caseData?.AvailableOpens && !isTimerActive" class="timer" @click="openDeposit">
              <h4>{{ $t("cases.modals.case.buttons.condition") }}</h4>
            </button>

            <button v-else class="primary" :disabled="!canOpenNow" @click="rollTo()">
              <h4>{{ $t("cases.modals.open") }}</h4>
            </button>
          </div>
        </div>
        
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./FreeCase.scss" scoped></style>
<style>
.symbol-img {
  opacity: 0;
  transition: opacity 260ms ease;
  will-change: opacity;
}
.symbol-img.loaded {
  opacity: 1;
}
</style>