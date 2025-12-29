<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useAttrs, watch } from "vue";
import { cutNumberNano } from "../../../../utils/useTon";
import { useCacheStore } from "../../../../stores/pinia-store";
import { getImgSvg } from "../../../../utils/useApp";
import { Icon } from "../../../../components/Icon";

import Lottie from "../../../../components/Lottie.vue";
import * as APICases from "../../../../api/cases";

// Icons
import TonIcon from "@/assets/icons/ton.svg";
import TonWhiteRawIcon from "@/assets/icons/ton-white.svg?raw";
import TonBlackIcon from "@/assets/icons/ton-black.svg";
import DoneRawIcon from "@/assets/icons/done.svg?raw";
import CloseIcon from "@/assets/icons/close.svg";
import UsersRawIcon from "@/assets/icons/users.svg?raw";
import TelegramRawIcon from "@/assets/icons/telegram.svg?raw";
import ArrowRightRawIcon from "@/assets/icons/arrow-right.svg?raw";

import Roulette from "@/components/common/Roulette/Roulette.vue";

// Images
import Ton from "@/assets/icons/ton.svg";
import TelegramModule from "../../../../hooks/useTelegram";

import { showErrorToast } from "../../../../utils/toastManager";
import { useTasksPolling } from "./composables/useTasksPolling";
import { useSheetOverscrollProtection } from "./composables/useSheetOverscrollProtection";
import { preloadImages } from "./composables/preloadImages";
import { useCaseRewards } from "./composables/useCaseRewards";
import { useTranslation } from "i18next-vue";

const useCache = useCacheStore() as any;

const { t } = useTranslation();

defineOptions({ inheritAttrs: false });

const emit = defineEmits<{
  (e: "close"): void;
  (e: "not-enough", payload: any): void;
}>();

const props = defineProps<{ data: any }>();
const attrs = useAttrs();

const rouletteRef = ref<InstanceType<typeof Roulette> | null>(null);

const isRollClicked = ref(false);

const isRolling = ref(false);
const itemRolling = ref<any>({});

const isWin = ref(false);
const itemWin = ref<any | null>(null);

const skeletonTasks = ref(true);
const skeletonRewards = ref(true);

const itemTasks = ref<any[]>(Array.from({ length: 2 }, () => ({})));
const itemRewards = ref<any[]>(
  Array.from({ length: 9 }, () => ({
    bg_start: "#000000",
    bg_center: "#000000",
    bg_end: "#000000",
    image: null,
    price_ton: 100,
    name: "",
    loaded: false,
  }))
);

// ===== computed flags =====
const isSubCase = computed(() => props.data?.Status === "sub");
const isInvCase = computed(() => props.data?.Status === "inv");

// ===== symbol preload + fade-in =====
const symbolLoaded = ref(false);

const symbolSrc = computed(() => {
  const s = props.data?.Symbol;
  return s ? getImgSvg(s) : "";
});

function preloadSymbol(src: string) {
  symbolLoaded.value = false;
  if (!src) return;

  const img = new Image();
  img.decoding = "async";

  img.onload = () => {
    // если пока грузилось — символ поменялся, не показываем старый
    if (src === symbolSrc.value) symbolLoaded.value = true;
  };

  img.onerror = () => {
    if (src === symbolSrc.value) symbolLoaded.value = false;
  };

  img.src = src;

  // если уже в кеше
  if (img.complete) {
    if (src === symbolSrc.value) symbolLoaded.value = true;
  }
}

watch(
  () => symbolSrc.value,
  (src) => preloadSymbol(src),
  { immediate: true }
);

watch(
  () => isRolling.value,
  (rolling) => {
    if (rolling) symbolLoaded.value = false;
    else preloadSymbol(symbolSrc.value);
  }
);

function clearCase() {
  isRolling.value = false;
  isRollClicked.value = false;
  itemRolling.value = {};
  itemWin.value = null;
  isWin.value = false;
  skeletonRewards.value = false;
}

async function quickSell(id: string) {
  const res = await APICases.quick_sell(id).catch(() => null);
  if (!res?.ok) return;

  clearCase();
  useCache.UserData.BalanceNano = res.new_balance;
}

function onWin(reward: any) {
  if (!reward) return;

  if (reward.rewardItem && reward.rewardItem.demo) {
    itemWin.value = reward;
    isWin.value = true;
    return;
  }

  itemWin.value = reward;

  if (!reward?.rewardItem?.quick_sale) {
    useCache.UserData.BalanceNano += reward?.rewardItem?.reward_price ?? 0n;
  }

  isWin.value = true;
}

function skipRoll() {
  rouletteRef.value?.skip();
}

function onCollect() {
  clearCase();
}

const { getRewards } = useCaseRewards({
  getCaseId: () => props.data?.ID,
  useCache,
  itemRewards,
  skeletonRewards,
});

async function getTasksCase() {
  const id = props.data?.ID;
  if (!id) return;

  skeletonTasks.value = true;

  const cached = useCache.CasesTasksData?.[id];
  let items: any[] | null = null as any;

  if (cached) {
    items = cached;
  } else {
    const res = await APICases.tasksCase(id).catch(() => null);
    items = (res?.items ?? res?.data?.items ?? null) as any[] | null;
    if (!items) return;

    useCache.CasesTasksData = useCache.CasesTasksData || {};
    useCache.CasesTasksData[id] = items;
  }

  if (items) {
    await preloadImages(items.map((i: any) => i?.image));
    itemTasks.value = items;
  }

  skeletonTasks.value = false;
}

// ===== tasks polling (single loop) =====

function getTaskKey(t: any) {
  return String(t?.ID ?? t?.id ?? t?.task_id ?? t?.channel_id ?? t?.channel_name ?? "");
}

function taskType(t: any): "invite" | "subscribe" {
  const type = String(t?.type ?? "").toLowerCase();
  return type === "invite" ? "invite" : "subscribe";
}

function inviteNeed(t: any) {
  return Number(t?.task_need_friends ?? 3);
}

function inviteDone(t: any) {
  if (typeof t?.current_friends === "number") return t.current_friends;
  if (typeof t?.friends_done === "number") return t.friends_done;
  if (typeof t?.friends_completed_count === "number") return t.friends_completed_count;
  if (typeof t?.friends_completed === "boolean") return t.friends_completed ? inviteNeed(t) : 0;
  return 0;
}

function isDoneTask(t: any) {
  if (taskType(t) === "subscribe") return !!t?.subscribed;
  if (taskType(t) === "invite") return !!t?.friends_completed;
}

function ruPlural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function taskTitle(tk: any) {
  if (taskType(tk) === "invite") {
    const count = inviteNeed(tk);

    return t("cases.tasks.inviteFriends", {
      count,
      defaultValue: `Пригласить ${count} ${ruPlural(count, "друга", "друга", "друзей")}`,
    });
  }

  return t("cases.tasks.subscribeChannel", {
    defaultValue: "Подписаться на канал",
  });
}

function taskKey(t: any, idx: number) {
  const k = getTaskKey(t);
  return k || String(idx);
}

function friendsProgressText(t: any) {
  const need = inviteNeed(t);
  const done = inviteDone(t);
  return `${Math.min(done, need)}/${need}`;
}

function friendsProgressPercent(t: any) {
  const need = inviteNeed(t);
  const done = inviteDone(t);
  if (!need || need <= 0) return 0;

  const clampedDone = Math.min(Math.max(done, 0), need);
  return Math.max(0, Math.min(100, Math.round((clampedDone / need) * 100)));
}

const invTasks = computed(() =>
  (itemTasks.value || []).map((t: any, idx: number) => {
    const type = taskType(t);
    return {
      ...t,
      _idx: idx,
      _key: taskKey(t, idx),
      _type: type,
      _needFriends: type === "invite",
      _done: isDoneTask(t),
      _title: taskTitle(t),
      _progress: type === "invite" ? friendsProgressText(t) : "",
      _percent: type === "invite" ? friendsProgressPercent(t) : 0,
    };
  })
);

const subTasks = computed(() => (itemTasks.value || []).filter((t: any) => taskType(t) === "subscribe"));

const visibleTasks = computed(() => {
  if (isSubCase.value) return subTasks.value || [];
  if (isInvCase.value) return invTasks.value || [];
  return [];
});

const tasksTotal = computed(() => (visibleTasks.value || []).length);

const tasksDone = computed(() => {
  const list = visibleTasks.value || [];
  return list.reduce((acc: number, t: any) => {
    const done = typeof t?._done === "boolean" ? t._done : isDoneTask(t);
    return acc + (done ? 1 : 0);
  }, 0);
});

const allTasksDone = computed(() => tasksTotal.value > 0 && tasksDone.value >= tasksTotal.value);

const tasksProgressLabel = computed(() => {
  if (skeletonTasks.value) return "...";
  const total = tasksTotal.value;
  if (!total) return t("cases.modals.num_completed", { num: "0/0" });
  return `${t("cases.modals.num_completed", { num: `${tasksDone.value}/${total}` })}`;
});

function mergeTaskState(fresh: any[], current: any[]) {
  const curByKey = new Map(current.map((t) => [getTaskKey(t), t]));
  return fresh.map((t) => {
    const cur = curByKey.get(getTaskKey(t));
    return {
      ...t,
      loading: cur?.loading ?? false,
      subscribed: t?.subscribed ?? cur?.subscribed ?? false,
    };
  });
}

async function fetchAndReplaceTasks() {
  const id = props.data?.ID;
  if (!id) return false;

  const res = await APICases.tasksCase(id).catch(() => null);
  const fresh = (res?.items ?? res?.data?.items ?? null) as any[] | null;
  if (!fresh) return false;

  const merged = mergeTaskState(fresh, itemTasks.value);
  itemTasks.value = merged;

  useCache.CasesTasksData = useCache.CasesTasksData || {};
  useCache.CasesTasksData[id] = merged;

  return true;
}

const { start: startTasksPolling, stop: stopTasksPolling } = useTasksPolling({
  fetchAndReplace: fetchAndReplaceTasks,
  isDone: isDoneTask,
  getTasks: () => itemTasks.value || [],
  setTasks: (tasks) => {
    itemTasks.value = tasks;
  },
  onCacheSync: () => {
    const id = props.data?.ID;
    if (id) {
      useCache.CasesTasksData = useCache.CasesTasksData || {};
      useCache.CasesTasksData[id] = itemTasks.value;
    }
  },
  intervalMs: 2000,
});

async function onTaskClick(task: any, index?: number) {
  if (skeletonTasks.value) return;
  if (!task) return;

  const srcIndex = typeof index === "number" ? index : task?._idx;
  const src =
    typeof srcIndex === "number" && itemTasks.value?.[srcIndex]
      ? itemTasks.value[srcIndex]
      : itemTasks.value?.find((t: any, i: number) => taskKey(t, i) === (task?._key ?? taskKey(task, 0)));

  if (!src) return;
  if (isDoneTask(src)) return;

  src.loading = true;

  const type = taskType(src);
  await nextTick();

  if (type === "subscribe") {
    const link = src?.channel_link;
    if (typeof link === "string" && link.startsWith("http")) {
      try {
        TelegramModule.useLink(link);
      } catch {}
    }
  }

  if (type === "invite") {
    inviteFriend();
  }

  const id = props.data?.ID;
  if (id) {
    useCache.CasesTasksData = useCache.CasesTasksData || {};
    useCache.CasesTasksData[id] = itemTasks.value;
  }

  startTasksPolling();
}

async function rollTo() {
  console.log("rollTo");
  console.log(skeletonTasks.value);
  console.log(isRollClicked.value, isRolling.value);
  if (skeletonTasks.value) return;
  if (isRollClicked.value || isRolling.value) return;

  useCache.TasksData = [];
  isRollClicked.value = true;

  const open = await APICases.open(props.data.ID).catch(() => null);

  if (!open?.ok) {
    console.log(open);
    if (open?.error === "already_opened") {
      showErrorToast("Кейс уже недоступен");
    } else {
      showErrorToast("Не удалось открыть кейс");
    };

    isRollClicked.value = false;
    isRolling.value = false;
    return;
  }

  itemRolling.value = open;

  await nextTick();

  TelegramModule.useLightHaptic();
  isRolling.value = true;
  useCache.UserData.BalanceNano -= props.data.price_nano;
  isWin.value = false;
}

function inviteFriend() {
  const miniAppLink = import.meta.env.VITE_APP_MINI_APP_LINK;
  const code = useCache.UserData.Code;
  const link = `${miniAppLink}=${code}`;
  const message = t('earn.button.inviteFriendsMsg');
  TelegramModule.useShare(link, message);
}

function close() {
  emit("close");
}

// ===== sheet overscroll protection =====
const sheetOverscroll = useSheetOverscrollProtection(".sheet");

onMounted(() => {
  getRewards();
  getTasksCase();
  sheetOverscroll.mount();
});

onBeforeUnmount(() => {
  stopTasksPolling();
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
        <div class="close" @click="close">
          <img :src="CloseIcon" alt="close-icon" aria-hidden="true" />
        </div>

        <div
          class="backdrop"
          :style="{
            '--case-start-color': `${props.data.BGStart ?? '#000000'}`,
            '--case-center-color': `${props.data.BGCenter ?? '#000000'}`,
            '--case-end-color': `${props.data.BGEnd ?? '#000000'}`,
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
              <h4>{{ $t("cases.modals.case.congrats") }}</h4>
              <span>{{ $t("cases.modals.case.congratsDesc") }}</span>
            </div>
          </div>

          <div v-if="isWin" class="cover-win">
            <div class="lottie-win">
              <Lottie path="/animations/confetti.json" :loop="false" renderer="svg" width="100%" height="100%" />
            </div>
            <div class="image-win">
              <div class="kit-icon" v-html="Icon.Flower" :style="{ '--chamomile-color': props.data.ChamomileColor }"></div>
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
            <div class="winner-gift-name">
              <h4>{{ itemWin?.name }}</h4>
            </div>
          </div>
        </div>

        <div v-if="!isRolling" class="cover not-rolling">
          <div class="relay">
            <div class="model">
              <div class="upg">
                <div class="image">
                  <img :src="getImgSvg(props.data.Image)" alt="model" />
                </div>
              </div>
            </div>
          </div>

          <div class="title">
            <div class="top">
              <h4>{{ props.data.Name }}</h4>
              <button>
                <h4>{{ cutNumberNano(props?.data?.price_nano ?? 0n) }}</h4>
                <div class="kit-icon" v-html="TonWhiteRawIcon"></div>
              </button>
            </div>
            <div v-if="isWin" class="win">
              <h4>{{ $t("cases.modals.case.congrats") }}</h4>
              <span>{{ $t("cases.modals.case.congratsDesc") }}</span>
            </div>
          </div>

          <!-- SUB TASKS -->
          <div v-if="isSubCase" class="tasks">
            <div
              v-for="(item, index) in subTasks"
              :key="taskKey(item, index)"
              class="task"
              :class="{ skeleton: skeletonTasks }"
              @click="onTaskClick(item)"
            >
              <div class="image">
                <img :src="item.channel_avatar" alt="avatar" />
              </div>
              <div class="task-title">
                <div class="sk-load" v-if="skeletonTasks"></div>
                <h4>Subscribe to {{ item.channel_name }} Telegram</h4>
              </div>
              <div class="button">
                <div v-if="!item.subscribed && !item.loading" class="inner none">
                  <div class="kit-icon" v-html="Icon.ChevroneRight"></div>
                </div>
                <div v-if="item.loading" class="inner loading">
                  <div class="load-icon"></div>
                </div>
                <div v-if="item.subscribed && !item.loading" class="inner done">
                  <div class="kit-icon" v-html="DoneRawIcon"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- INV TASKS (refactored) -->
          <div v-if="isInvCase" class="inv-tasks">
            <div
              v-for="(item, index) in invTasks"
              :key="taskKey(item, index)"
              class="task"
              :class="{ skeleton: skeletonTasks, done: item._done }"
              @click="onTaskClick(item, index)"
            >
              <div class="sk-load" v-if="skeletonTasks"></div>
              <div class="top">
                <div class="icon">
                  <div v-if="item._type === 'invite'" class="kit-icon" v-html="UsersRawIcon"></div>
                  <div v-else class="kit-icon" v-html="TelegramRawIcon"></div>
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
            <button @click="onCollect">
              <h4>{{ $t("cases.modals.case.buttons.ok") }}</h4>
            </button>
          </div>
        </div>

        <div v-if="!isRolling" class="buttons">
          <div class="topper">
            <button v-if="!allTasksDone" class="progress">
              <h4>{{ tasksProgressLabel }}</h4>
            </button>

            <button v-else class="primary" :disabled="skeletonTasks" @click="rollTo()">
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