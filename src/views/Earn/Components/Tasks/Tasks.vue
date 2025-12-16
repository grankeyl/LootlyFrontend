<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useCacheStore } from "../../../../stores/pinia-store";
import { showSuccessToast } from "../../../../utils/toastManager";
import { shootConfetti } from "../../../../utils/useConfetti";
import { useTranslation } from "i18next-vue";

import * as APITasks from "../../../../api/tasks";

// Icons
import LootcoinIcon from "@/assets/icons/lootcoin.svg";
import LootcoinRawIcon from "@/assets/icons/lootcoin.svg?raw";
import ProfileIcon from "@/assets/icons/profile.svg";
// import TonWhite from "@/assets/icons/ton-white.svg";
import ChevroneRight from "@/assets/icons/chevrone-right.svg";
import DoneRawIcon from "@/assets/icons/done.svg?raw";
import TelegramIcon from "@/assets/icons/telegram.svg";
import TelegramRawIcon from "@/assets/icons/telegram.svg?raw";
import TonWhiteIcon from "@/assets/icons/ton-white.svg";
import CaseIcon from "@/assets/icons/case.svg";
import RepostIcon from "@/assets/icons/repost.svg";

// Images
// import Gifted from "@/assets/images/earn-pg/gifted.png";
import TelegramModule from "../../../../hooks/useTelegram";

type Task = any;

const { t } = useTranslation();

const props = defineProps<{ 
  scrollEl?: Element | null 
}>();

const useCache = useCacheStore() as any;

const skeleton = ref(true);
const items = ref<Task[]>(Array.from({ length: 10 }));
const hasMore = ref(true);
const loading = ref(false);
const limit = 20;
const offset = ref(0);

const swipersTasksTypes = ['invite', 'volume', 'open', 'createStory'];

const swipersTasksApplied = ref(false);
const swipersTasks = computed(() => {
  const array = items.value || [];

  const filtered = array
    .map((t, idx) => ({ t, idx }))
    .filter(x => x.t && x.t.type && swipersTasksTypes.includes(x.t.type));

  // если уже сортировали один раз — больше порядок не трогаем
  // if (swipersTasksApplied.value) {
  //   return filtered.map(x => x.t);
  // }

  const getProgress = (task: Task): number => {
    if (!task) return 0;

    if (typeof task.current === 'number' && typeof task.need === 'number' && task.need > 0) {
      return Math.min(Math.max(task.current / task.need, 0), 1);
    }
    if (typeof task.progress === 'number') {
      return Math.min(Math.max(task.progress, 0), 1);
    }

    if (task.type === 'invite') {
      const need = Number(task?.config?.TaskNeedFriends ?? 3);
      const current = Number(useCache.UserDataMeta?.ref_count ?? 0);
      const ratio = need > 0 ? current / need : 0;
      return Math.min(Math.max(ratio, 0), 1);
    }

    // если поля opens/volumes отсутствуют — считаем 0
    if (task.type === 'open') {
      const need = Number(task?.config?.TaskNeedCaseOpened ?? task?.need ?? 0);
      const current = Number(task?.opens ?? 0);
      const ratio = need > 0 ? current / need : 0;
      return Math.min(Math.max(ratio, 0), 1);
    }

    if (task.type === 'volume') {
      const need = Number(task?.config?.TaskNeedVolumes ?? task?.need ?? 0);
      const current = Number(task?.volumes ?? 0);
      const ratio = need > 0 ? current / need : 0;
      return Math.min(Math.max(ratio, 0), 1);
    }

    return 0;
  };

  const canClaim = (task: Task): boolean => {
    if (!task) return false;
    if (task.user_status === 'success') return true;

    if (task.type === 'invite') {
      const current = useCache.UserDataMeta?.ref_count ?? 0;
      if (current >= 3) return true;
    }

    if (getProgress(task) >= 1) return true;
    return false;
  };

  filtered.sort((a, b) => {
    const ta = a.t;
    const tb = b.t;

    const claimA = canClaim(ta);
    const claimB = canClaim(tb);
    if (claimA !== claimB) return claimA ? -1 : 1;         // Claim вверх

    const doneA = ta.user_status === 'claim';
    const doneB = tb.user_status === 'claim';
    if (doneA !== doneB) return doneA ? 1 : -1;            // Done вниз

    const pA = getProgress(ta);
    const pB = getProgress(tb);
    if (pA !== pB) return pB - pA;                         // больше прогресс — выше

    return a.idx - b.idx;
  });

  swipersTasksApplied.value = true;

  return filtered.map(x => x.t);
});
const otherTasks = computed(() => {
  const array = items.value || [];
  return array.filter(t => 
    t && t.type && !swipersTasksTypes.includes(t.type)
  );
});

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
  if (useCache.TasksData && useCache.TasksData.length) {
    skeleton.value = false;
    items.value = useCache.TasksData;
    return;
  };

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
    const withFlags = page.map(g => ({ ...g, _imgLoaded: false, _loading: false }));

    if (initial) items.value = withFlags;
    else items.value.push(...withFlags);

    useCache.TasksData = withFlags;

    offset.value += page.length;

    if (typeof res.total_all === "number") {
      hasMore.value = items.value.length < res.total_all;
    } else {
      hasMore.value = page.length === limit;
    }
  } finally {
    if (token === inFlight) {
      loading.value = false;
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

const checkReferralsTask = (need: number) => {
  const referrals = useCache.UserDataMeta.ref_count ?? 0;
  return referrals >= need;
}

const checkOpenedCases = (current: number | undefined | null, need: number) => {
  const c = Number(current ?? 0);
  const n = Number(need ?? 0);
  return c >= n;
}

const checkOpenedVolumes = (current: number | undefined | null, need: number) => {
  const c = Number(current ?? 0);
  const n = Number(need ?? 0);
  return c >= n;
}
 
const taskCurrentInfo = (current: number | undefined | null, need: number) => {
  const c = Number(current ?? 0);
  const n = Number(need ?? 0);
  const currentClear = Math.min(Math.max(c, 0), n);
  return currentClear;
};

async function claimTask(task: Task) {
  if (!task) return;
  if (task._loading) return;

  items.value.find(i => i.id === task.id)!._loading = true;

  const res = await APITasks.taskClaim(task.id);
  if (!res) { items.value.find(i => i.id === task.id)!._loading = false; return; };
  if (res.ok) {
    if (res.data.status === "success") {
      items.value.find(i => i.id === task.id)!._loading = false;
      items.value.find(i => i.id === task.id)!.user_status = "success";
      shootConfetti();
    } else if (res.data.status === "claimed") {
      items.value.find(i => i.id === task.id)!._loading = false;
      items.value.find(i => i.id === task.id)!.user_status = "claimed";
      useCache.UserData.BonusBalance += res.data.amount;
      showSuccessToast(t('extra.taskSuccessClaimed'));
      shootConfetti();
    }
  }
}


async function postStory(task: Task) {
  if (!task) return;
  if (task._loading) return;

  if (task.user_status === "claimed") return;
  if (task.user_status === "success") {
    claimTask(task);
    return;
  };

  items.value.find(i => i.id === task.id)!._loading = true;

  const storyMedia = task.config.StoryMedia;
  if (!storyMedia) return;

  TelegramModule.useLightHaptic();
  TelegramModule.useStory(storyMedia);

  setTimeout(() => {
    items.value.find(i => i.id === task.id)!._loading = false;
    items.value.find(i => i.id === task.id)!.user_status = "success";
    shootConfetti();
  }, 7000);
}


const tasksCheckSubcriptions = ref<Record<string, number>>({});

async function startCheckSubscription(task: Task) {
  if (!task) return;
  if (task._loading) return;

  if (task.user_status === "claimed") return;
  if (task.user_status === "success") {
    claimTask(task);
    return;
  };

  const taskId = task.id as string;

  if (tasksCheckSubcriptions.value[taskId]) return;

  TelegramModule.useLink(task.config.ChannelLink);

  items.value.find(i => i.id === taskId)!._loading = true;

  const first = await APITasks.taskCheckSubscription(taskId).catch(() => null);
  if (first && first.ok) {
    if(first.status === "success") {
      items.value.find(i => i.id === taskId)!._loading = false;
      items.value.find(i => i.id === taskId)!.user_status = first.status;
      return;
    }
  }

  const intervalId = window.setInterval(async () => {
    const res = await APITasks.taskCheckSubscription(taskId).catch(() => null);
    if (!res) return;
    if (res && res.ok) {
      if (res.status === "success") {
        items.value.find(i => i.id === taskId)!._loading = false;
        items.value.find(i => i.id === taskId)!.user_status = res.status;
        stopCheckSubscription(taskId);
      }
    }
  }, 2000);

  tasksCheckSubcriptions.value[taskId] = intervalId;
}

function stopCheckSubscription(taskId: string) {
  const intervals = tasksCheckSubcriptions.value;
  const intervalId = intervals[taskId];
  if (intervalId) {
    clearInterval(intervalId);
    delete intervals[taskId];
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

  Object.values(tasksCheckSubcriptions.value).forEach(id => clearInterval(id));
  tasksCheckSubcriptions.value = {};
});
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

    <div class="swipers">
      <div class="swipers-scroll">
        <div v-if="skeleton" class="swiper skeleton" v-for="_ in 6">
          <div class="sk-load"></div>
          <div class="swiper-block">
            <div class="amount">
              <div class="glow"></div>
              <h4>100</h4>
              <div class="kit-icon" v-html="LootcoinRawIcon"></div>
            </div>
            <div class="context">
              <h4>
                Loading
                <img :src="TelegramIcon" alt="profile-icon" />
              </h4>
            </div>
            <div class="button"></div>
          </div>
        </div>
      </div>

      <div v-if="!skeleton" class="swipers-scroll">
        <div 
          class="swiper" 
          v-for="(item, index) in swipersTasks" 
          :key="index"
        >
          <div v-if="item.type && item.type === 'invite'" class="swiper-block">
            <div class="amount">
              <div class="glow"></div>
              <h4>{{ item.amount }}</h4>
              <div class="kit-icon" v-html="LootcoinRawIcon"></div>
            </div>
            <div class="context">
              <h4>
                {{ $t('earn.tasks.swipers.invite') }} {{ item.config.TaskNeedFriends }}
                <img :src="ProfileIcon" alt="profile-icon" />
                {{ $t('earn.tasks.swipers.friends') }}
              </h4>
            </div>
            <div v-if="item._loading" class="button loading">
              <div class="spinner"></div>
            </div>
            <div v-else-if="item.user_status && ['new', 'success'].includes(item.user_status) && !checkReferralsTask(item.config.TaskNeedFriends)" class="button">
              <h4>{{ $t('earn.tasks.swipers.invite') }}</h4>
              <span class="proccess">
                <p>{{ taskCurrentInfo(useCache.UserDataMeta.ref_count, item.config.TaskNeedFriends) }}/{{ item.config.TaskNeedFriends }}</p>
                <img :src="ProfileIcon" alt="profile-icon" />
              </span>
            </div>
            <div v-else-if="item.user_status && item.user_status === 'success' || checkReferralsTask(3) && item.user_status !== 'claimed'" class="button claim" @click="claimTask(item)">
              <h4>{{ $t('earn.tasks.swipers.claim') }}</h4>
            </div>
            <div v-else-if="item.user_status && item.user_status === 'claimed'" class="button done">
              <div class="done">
                <div class="kit-icon" v-html="DoneRawIcon"></div>
              </div>
            </div>
          </div>

          <div v-if="item.type && item.type === 'volume'" class="swiper-block">
            <div class="amount">
              <div class="glow"></div>
              <h4>{{ item.amount }}</h4>
              <div class="kit-icon" v-html="LootcoinRawIcon"></div>
            </div>
            <div class="context">
              <h4>
                {{ $t('earn.tasks.swipers.achieveAVolume') }} {{ item.config.TaskNeedVolumes }}
                <img :src="TonWhiteIcon" alt="profile-icon" />
                {{ $t('earn.tasks.swipers.inGame') }}
              </h4>
            </div>

            <div v-if="item._loading" class="button loading">
              <div class="spinner"></div>
            </div>
            <div v-else-if="item.user_status && ['new'].includes(item.user_status) && !checkOpenedVolumes(item.volumes, item.config.TaskNeedVolumes)" class="button">
              <h4>{{ $t('earn.tasks.swipers.go') }}</h4>
              <span class="proccess">
                <p>{{ taskCurrentInfo(item.volumes ?? 0, item.config.TaskNeedVolumes) }}/{{ item.config.TaskNeedVolumes }}</p>
                <img :src="TonWhiteIcon" alt="profile-icon" />
              </span>
            </div>
            <div v-else-if="item.user_status && item.user_status === 'success' || checkOpenedVolumes(item.volumes, item.config.TaskNeedVolumes) && item.user_status !== 'claimed'" class="button claim" @click="claimTask(item)">
              <h4>{{ $t('earn.tasks.swipers.claim') }}</h4>
            </div>
            <div v-else-if="item.user_status && item.user_status === 'claimed'" class="button done">
              <div class="done">
                <div class="kit-icon" v-html="DoneRawIcon"></div>
              </div>
            </div>
          </div>

          <div v-if="item.type && item.type === 'open'" class="swiper-block">
            <div class="amount">
              <div class="glow"></div>
              <h4>{{ item.amount }}</h4>
              <div class="kit-icon" v-html="LootcoinRawIcon"></div>
            </div>
            <div class="context">
              <h4>
                {{ $t('earn.tasks.swipers.open') }} {{ item.config.TaskNeedCaseOpened }}
                <img :src="CaseIcon" alt="profile-icon" class="case" />
                {{ $t('earn.tasks.swipers.cases') }}
              </h4>
            </div>

            <div v-if="item._loading" class="button loading">
              <div class="spinner"></div>
            </div>
            <div v-else-if="item.user_status && ['new'].includes(item.user_status) && !checkOpenedCases(item.opens, item.config.TaskNeedCaseOpened)" class="button">
              <h4>{{ $t('earn.tasks.swipers.go') }}</h4>
              <span class="proccess">
                <p>{{ taskCurrentInfo(item.opens ?? 0, item.config.TaskNeedCaseOpened) }}/{{ item.config.TaskNeedCaseOpened }}</p>
              </span>
            </div>
            <div v-else-if="item.user_status && item.user_status === 'success' || checkOpenedCases(item.opens, item.config.TaskNeedCaseOpened) && item.user_status !== 'claimed'" class="button claim" @click="claimTask(item)">
              <h4>{{ $t('earn.tasks.swipers.claim') }}</h4>
            </div>
            <div v-else-if="item.user_status && item.user_status === 'claimed'" class="button done">
              <div class="done">
                <div class="kit-icon" v-html="DoneRawIcon"></div>
              </div>
            </div>
          </div>

          <div v-if="item.type && item.type === 'createStory'" class="swiper-block">
            <div class="amount">
              <div class="glow"></div>
              <h4>{{ item.amount }}</h4>
              <div class="kit-icon" v-html="LootcoinRawIcon"></div>
            </div>
            <div class="context">
              <h4>
                {{ $t('earn.tasks.swipers.postStory') }}
                <img :src="TelegramIcon" alt="profile-icon" />
              </h4>
            </div>

            <div v-if="item._loading" class="button loading">
              <div class="spinner"></div>
            </div>
            <div v-else-if="item.user_status && ['new'].includes(item.user_status)" class="button" @click="postStory(item)">
              <h4>{{ $t('earn.tasks.swipers.repost') }}</h4>
              <span><img :src="RepostIcon" alt="repost-icon" class="repost" /></span>
            </div>
            <div v-else-if="item.user_status && item.user_status === 'success'" class="button claim" @click="claimTask(item)">
              <h4>{{ $t('earn.tasks.swipers.claim') }}</h4>
            </div>
            <div v-else-if="item.user_status && item.user_status === 'claimed'" class="button done">
              <div class="done">
                <div class="kit-icon" v-html="DoneRawIcon"></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

    <div class="others">
      <div v-if="skeleton" class="others-inner skeleton">
        <div 
          class="other"
          v-for="_ in 6"
        >
          <div class="sk-load"></div>
          <div class="image">
            <div class="kit-icon" v-html="TelegramRawIcon"></div>
          </div>
          <div class="context">
            <h4>{{ $t('earn.tasks.others.taskTitle') }}</h4>
            <span>
              <p>100</p>
              <img :src="LootcoinIcon" alt="lootcoin-icon" />
            </span>
          </div>
          <div class="mark notactive">
            <img :src="ChevroneRight" alt="chevrone-right-icon">
          </div>
        </div>
      </div>
      
      <div v-if="!skeleton" class="others-inner">
        <div 
          class="other" 
          v-for="(item, index) in otherTasks" 
          :key="index"
        >
          <div v-if="item.type && item.type === 'subscribe'" @click="() => { startCheckSubscription(item); }" class="other-inner">
            <div class="image">
              <div class="kit-icon" v-html="TelegramRawIcon"></div>
            </div>
            <div class="context">
              <h4>{{ $t('earn.tasks.others.taskTitle') }}</h4>
              <span>
                <p>{{ item.amount }}</p>
                <img :src="LootcoinIcon" alt="lootcoin-icon" />
              </span>
            </div>
            <div v-if="item._loading" class="mark loading">
              <div class="spinner"></div>
            </div>
            <div v-else-if="item.user_status && ['new'].includes(item.user_status)" class="mark notactive">
              <img :src="ChevroneRight" alt="chevrone-right-icon">
            </div>
            <div v-else-if="item.user_status && item.user_status === 'success'" class="mark claim">
              <h4>{{ $t('earn.tasks.swipers.claim') }}</h4>
            </div>
            <div v-else-if="item.user_status && item.user_status === 'claimed'" class="mark done">
              <div class="done">
                <div class="kit-icon" v-html="DoneRawIcon"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Tasks.scss" scoped></style>