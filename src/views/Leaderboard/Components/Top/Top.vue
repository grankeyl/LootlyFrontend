
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { cutNumberNano } from "../../../../utils/useTon";
import { maskUsername, telegramAvatarBg } from "../../../../utils/useApp";

import * as APIUser from "../../../../api/user";

// Icons
import TonWhiteIcon from "@/assets/icons/ton-white.svg";

// Images
import Place1 from "@/assets/images/leaderboard-pg/place-1.png";
import Place2 from "@/assets/images/leaderboard-pg/place-2.png";
import Place3 from "@/assets/images/leaderboard-pg/place-3.png";

const props = defineProps<{
  scrollEl?: any;
}>();

let io: IntersectionObserver | null = null;

const skeleton = ref(true);


const leaderboard = ref<any[]>([]);

function avatarLetter(item: any) {
  const s = (item?.username || item?.name || "?").toString();
  return (s[0] || "?").toUpperCase();
}

function makePlaceholderLeader(rank: 1 | 2 | 3) {
  return {
    rank,
    photo: "",
    username: null,
    name: "—",
    sum_volume_nano: 0,
  };
}

const primaryLeaders = computed(() => {
  const top3 = leaderboard.value.slice(0, 3);
  const missing: (1 | 2 | 3)[] = ([1, 2, 3] as const).filter(
    (r) => !top3.some((x) => Number(x?.rank) === r)
  );
  const filled = [...top3, ...missing.map((r) => makePlaceholderLeader(r))]
    .slice(0, 3);
  const r1 = filled.find((x) => Number(x?.rank) === 1) ?? makePlaceholderLeader(1);
  const r2 = filled.find((x) => Number(x?.rank) === 2) ?? makePlaceholderLeader(2);
  const r3 = filled.find((x) => Number(x?.rank) === 3) ?? makePlaceholderLeader(3);
  return [r2, r1, r3];
});
const otherLeaders  = computed(() => leaderboard.value.slice(3))

const leaderboardSentinel = ref<HTMLDivElement|null>(null);
const leaderboardLoadingMore = ref(false);
const leaderboardHasMore = ref(true);
const leaderboardOffset = ref(0);
const leaderboardLimit = ref(10);

async function getLeaderboard(initial = false) {
  if (leaderboardLoadingMore.value || (!leaderboardHasMore.value && !initial)) return;
  if (leaderboardOffset.value >= 100) return;

  leaderboardLoadingMore.value = true;
  if (initial) {
    skeleton.value = true;
    leaderboard.value = [];
    leaderboardOffset.value = 0;
    leaderboardHasMore.value = true;
  }

  const res = await APIUser.leaderboard(
    leaderboardOffset.value,
    leaderboardLimit.value
  ).catch(() => null);

  if (!res) {
    leaderboardLoadingMore.value = false;
    skeleton.value = false;
    return;
  }

  const items: any[] = res.items ?? [];
  leaderboard.value.push(...items);
  leaderboardOffset.value += items.length;

  if (res.total_users != null) {
    leaderboardHasMore.value = leaderboard.value.length < res.total_users;
  } else {
    // Фоллбек
    leaderboardHasMore.value = items.length === leaderboardLimit.value;
  }

  leaderboardLoadingMore.value = false;
  skeleton.value = false;
}

function resolveRoot(): Element | null {
  const el = props.scrollEl?.value ?? props.scrollEl ?? null;
  return el instanceof Element ? el : null;
}

function setupObserver() {
  if (!leaderboardSentinel.value) return;
  io?.disconnect();

  io = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (leaderboardLoadingMore.value || !leaderboardHasMore.value) continue;
        io?.unobserve(entry.target);
        (async () => {
          await getLeaderboard(false);
          await nextTick();
          await autoDrainIfStillVisible();
          if (leaderboardSentinel.value && leaderboardHasMore.value) {
            io?.observe(leaderboardSentinel.value);
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

  io.observe(leaderboardSentinel.value);
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
      if (!leaderboardLoadingMore.value && leaderboardHasMore.value && nearBottom(700)) {
        await getLeaderboard(false);
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
  if (!leaderboardSentinel.value) return false;
  const root = resolveRoot();
  const sRect = leaderboardSentinel.value.getBoundingClientRect();

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
    leaderboardHasMore.value &&
    !leaderboardLoadingMore.value &&
    needsMoreToFill(120) &&
    pages < maxPages
  ) {
    await getLeaderboard(false);
    await nextTick();
    pages++;
  }
}

async function autoDrainIfStillVisible() {
  await topUpViewport(10);
  while (
    !leaderboardLoadingMore.value &&
    leaderboardHasMore.value &&
    isSentinelVisible()
  ) {
    await getLeaderboard(false);
    await nextTick();
    await topUpViewport(5);
  }
}

onMounted(async () => {
  await nextTick();
  await getLeaderboard(true);
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
  if (io && leaderboardSentinel.value) io.unobserve(leaderboardSentinel.value);
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
  <div class="top" :class="{ skeleton: skeleton }">
    <div class="primary">
      <div class="sk-load" v-if="skeleton"></div>
      <div class="item" v-for="(item, index) in primaryLeaders" :key="index">
        <div class="user">
          <div class="image">
            <div
              class="avatar_null"
              :style="{ background: telegramAvatarBg(item.username || item.name || 'user') }"
            >
              <h4>{{ avatarLetter(item) }}</h4>
            </div>
            <div class="mark">
              <p>{{ cutNumberNano(item.sum_volume_nano) }}</p>
              <img :src="TonWhiteIcon" alt="ton-white-icon" />
            </div>
          </div>
          <div class="title">
            <h4 v-if="item.username">{{ maskUsername(`@${item.username}`) }}</h4>
            <h4 v-else>{{ maskUsername(`@${item.name}`) }}</h4>
          </div>
        </div>
        <div class="buck">
          <img v-if="item.rank === 1" :src="Place1" alt="place-1" />
          <img v-else-if="item.rank === 2" :src="Place2" alt="place-2" />
          <img v-else-if="item.rank === 3" :src="Place3" alt="place-3" />
        </div>
      </div>
    </div>
    <div class="others">
      <div class="sk-load" v-if="skeleton"></div>
      <div
        class="other"
        v-for="(item, index) in otherLeaders"
        :key="index"
      >
        <div class="number">
          <p>#{{ item.rank }}</p>
        </div>
        <div class="image">
          <div
            class="avatar_null"
            :style="{ background: telegramAvatarBg(item.username || item.name || 'user') }"
          >
            <h4>{{ avatarLetter(item) }}</h4>
          </div>
        </div>
        <div class="name">
          <h4 v-if="item.username">{{ maskUsername(`@${item.username}`) }}</h4>
          <h4 v-else>{{ maskUsername(`${item.name}`) }}</h4>
        </div>
        <div class="button">
          <button>
            <h4>{{ cutNumberNano(item.sum_volume_nano) }}</h4>
            <img :src="TonWhiteIcon" alt="">
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Top.scss" scoped></style>