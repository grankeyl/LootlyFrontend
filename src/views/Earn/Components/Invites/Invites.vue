<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, nextTick } from "vue";
import * as APIUser from "../../../../api/user";

// Icons
import TonIcon from "@/assets/icons/ton.svg";
import TonWhiteIcon from "@/assets/icons/ton-white.svg";
import WithdrawIcon from "@/assets/icons/withdraw.svg";
import FriendsIcon from "@/assets/icons/friends.svg";
import PercentIcon from "@/assets/icons/percent.svg";
import TonLineIcon from "@/assets/icons/ton-line.svg";
import ChevroneDownIcon from "@/assets/icons/chevrone-down.svg";

const props = defineProps<{
  /** HTMLElement | Window | Ref<HTMLElement|null> */
  scrollEl?: any;
}>();

const emit = defineEmits<{
  (e: "open-modal-withdraw-referrals"): void;
  (e: "open-modal-withdraw-balance"): void;
}>();

const skeleton = ref(true);
const loadingMore = ref(false);
const hasMore = ref(true);

const referralsCount = ref(0);
const referralsOffset = ref(0);
const referralsLimit = ref(10);
const referrals = ref<any[]>([]);

const sentinel = ref<HTMLDivElement|null>(null);
let io: IntersectionObserver | null = null;

function handleClick() {
  emit("open-modal-withdraw-referrals");
}

async function getReferrals(initial = false) {
  if (loadingMore.value || (!hasMore.value && !initial)) return;

  loadingMore.value = true;
  if (initial) {
    skeleton.value = true;
    referrals.value = [];
    referralsOffset.value = 0;
    hasMore.value = true;
  }

  const res = await APIUser.referrals(referralsOffset.value, referralsLimit.value)
               .catch(() => null);

  if (!res) {
    loadingMore.value = false;
    skeleton.value = false;
    return;
  }

  if (initial) referralsCount.value = res.total ?? 0;

  const items: any[] = res.items ?? [];
  referrals.value.push(...items);
  referralsOffset.value += items.length;

  if (res.total != null) {
    hasMore.value = referrals.value.length < res.total;
  } else {
    // Фоллбек: если вернулась «короткая» страница — дальше нечего грузить
    hasMore.value = items.length === referralsLimit.value;
  }

  loadingMore.value = false;
  skeleton.value = false;
}

function resolveRoot(): Element | null {
  // Поддержка: передали ref, сам элемент, или вообще ничего (тогда корень = null => window)
  const el = props.scrollEl?.value ?? props.scrollEl ?? null;
  return el instanceof Element ? el : null; // null = viewport/window
}

function setupObserver() {
  if (!sentinel.value) return;
  io?.disconnect();

  const onIntersect = async (entry: IntersectionObserverEntry) => {
    if (!entry.isIntersecting) return;
    if (loadingMore.value || !hasMore.value) return;

    // снять наблюдение, чтобы гарантированно получить новое событие позже
    io?.unobserve(entry.target);
    await getReferrals(false);

    // после дорисовки — если сентинел все еще в зоне, сразу дольём ещё
    await nextTick();
    autoDrainIfStillVisible();

    // перевесить наблюдение (если ещё есть что грузить)
    if (sentinel.value && hasMore.value) io?.observe(sentinel.value);
  };

  io = new IntersectionObserver(
    (entries) => entries.forEach(onIntersect),
    { root: resolveRoot(), rootMargin: "0px 0px 800px 0px", threshold: 0 }
  );

  io.observe(sentinel.value);
}

let ro: ResizeObserver | null = null;
let scrollOff: (() => void) | null = null;

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
      if (!loadingMore.value && hasMore.value && nearBottom(700)) {
        await getReferrals(false);
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
  if (!sentinel.value) return false;
  const root = resolveRoot();
  const sRect = sentinel.value.getBoundingClientRect();

  if (root) {
    const rRect = (root as Element).getBoundingClientRect();
    return sRect.top <= rRect.bottom;
  }
  // window/viewport
  return sRect.top <= window.innerHeight;
}

async function autoDrainIfStillVisible() {
  // Подливаем, пока сентинел виден, есть ещё что грузить и мы не в процессе
  while (!loadingMore.value && hasMore.value && isSentinelVisible()) {
    await getReferrals(false);
    await nextTick();
  }
}

onMounted(async () => {
  await nextTick();
  await getReferrals(true);
  setupObserver();

  const list = document.querySelector(".friends .list") as HTMLElement | null;
  if (list) {
    ro = new ResizeObserver(() => autoDrainIfStillVisible());
    ro.observe(list);
  }

  attachScrollFallback();

  await nextTick();
  autoDrainIfStillVisible();
});

onBeforeUnmount(() => {
  if (io && sentinel.value) io.unobserve(sentinel.value);
  io?.disconnect();
  io = null;

  ro?.disconnect();
  ro = null;

  scrollOff?.();
  scrollOff = null;
});
</script>

<template>
  <div class="invites" :class="{ skeleton: skeleton }">
    <div class="balance">
      <div class="descr">
        <p>Earns from Referrals</p>
      </div>
      <div class="amount">
        <h1>0</h1>
        <img :src="TonIcon" alt="ton-icon" />
      </div>
      <div class="button" @click="handleClick">
        <img :src="WithdrawIcon" alt="withdraw-icon" />
        <h4>Withdraw</h4>
      </div>
    </div>
    <div class="stats">
      <div class="stat">
        <div class="title">
          <h4>0</h4>
          <img :src="FriendsIcon" alt="friends-icon" />
        </div>
        <div class="descr">
          <p>Referrals</p>
        </div>
      </div>
      <div class="stat">
        <div class="title">
          <h4>0</h4>
          <img :src="TonIcon" alt="friends-icon" />
        </div>
        <div class="descr">
          <p>Total Earned</p>
        </div>
      </div>
      <div class="stat">
        <div class="title">
          <h4>0</h4>
          <img :src="PercentIcon" alt="friends-icon" />
        </div>
        <div class="descr">
          <p>Your percent</p>
        </div>
      </div>
    </div>

    <div v-if="referrals && referrals.length > 0" class="friends">
      <div class="filters">
        <div class="item">
          <h4>@</h4>
        </div>
        <div class="item">
          <h4>{{ referralsCount }} Friends</h4>
        </div>
        <div class="item">
          <div class="select">
            <div class="icon">
              <img :src="TonLineIcon" alt="ton-line-icon" />
            </div>
            <h4>Deposits</h4>
            <span>
              <img :src="ChevroneDownIcon" alt="chevrone-down-icon" />
            </span>
          </div>
        </div>
      </div>
      <div class="list">
        <div class="sk-load" v-if="skeleton"></div>
        <div
          v-for="(item, index) in referrals"
          :key="item.id ?? index"
          class="item"
        >
          <div class="image">
            <img
              v-if="item.photo"
              :src="item.photo"
              alt="image"
              @error="item.photo = ''"
            />
            <div v-else class="avatar-null">
              <h4 v-if="item.name">{{ item.name?.[0] }}</h4>
            </div>
          </div>
          <div class="title">
            <h4 v-if="item.username">@{{ item.username }}</h4>
            <h4 v-else>{{ item.name }}</h4>
          </div>
          <div class="summary">
            <h4>{{ item.sum_deposit }}</h4>
            <img :src="TonWhiteIcon" alt="lootcoin-icon" />
          </div>
        </div>
      </div>

      <div ref="sentinel" class="sentinel"></div>

      <div v-if="!skeleton && loadingMore" class="loading-more">
        <div class="sk-load"></div>
        <h4>Loading…</h4>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "./Invites.scss" as *;
</style>