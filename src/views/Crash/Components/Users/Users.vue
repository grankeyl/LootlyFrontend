<script setup lang="ts">
import { computed, ref, reactive } from "vue";
import { cutNumberNano } from "../../../../utils/useTon";

import TonOutlineRawIcon from "@/assets/icons/ton-outline.svg?raw";


const props = defineProps<{
  GameX: number;
  GameStatus: string;
  GameBets: any;
}>();

const normalizeAmount = (raw: unknown): number => {
  if (typeof raw === "bigint") return Number(raw);
  if (typeof raw === "number") return raw;
  const n = Number(raw ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const uniqueKey = (item: any): string =>
  String(
    item?.id ??
    item?.user_id ??
    item?.username ??
    item?.user_first_name ??
    JSON.stringify(item ?? {})
  );

const skeleton = ref(true);
const bets = computed(() => {
  if (!props.GameBets || !Array.isArray(props.GameBets)) return [];

  const seen = new Set<string>();
  const unique: any[] = [];

  for (const raw of props.GameBets as any[]) {
    const key = uniqueKey(raw);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(raw);
  }

  unique.sort((a, b) => normalizeAmount(b?.amount) - normalizeAmount(a?.amount));

  return unique;
});

setTimeout(() => { skeleton.value = false; }, 1000);

const imageLoaded = reactive<Record<string, boolean>>({});
const keyFor = (item: any) => uniqueKey(item);
const onImgLoad = (k: string) => (imageLoaded[k] = true);
const onImgError = (k: string) => (imageLoaded[k] = false);
</script>

<template>
  <div class="users">
    <transition-group name="user" tag="div" class="items" appear>
      <div
        class="item"
        v-for="(item, index) in bets"
        :key="keyFor(item)"
        :style="`--i:${index}`"
      >
        <div class="number"><p>#{{ index + 1 }}</p></div>

        <div class="image">
          <div class="avatar_null" v-if="!item.user_photo || !imageLoaded[keyFor(item)]">
            <h4 v-if="item.user_first_name">{{ item.user_first_name.substring(0, 1) }}</h4>
          </div>

          <img
            v-if="item.user_photo"
            :src="item.user_photo"
            :alt="item.username ?? item.user_first_name ?? 'user'"
            @load="onImgLoad(keyFor(item))"
            @error="onImgError(keyFor(item))"
            :class="{ show: imageLoaded[keyFor(item)] }"
          />
        </div>

        <div class="blocker">
          <div class="name">
            <h4 v-if="item.username">@{{ item.username }}</h4>
            <h4 v-else>{{ item.user_first_name }}</h4>
          </div>
          <!-- <div class="descr">
            <p>205.3 TON</p>
          </div> -->
        </div>

        <!-- active -->
        <div v-if="item.status === 'active' && props.GameStatus === 'loading'" class="placing">
          <span class="chip">
            <div class="spinner"></div>
          </span>
        </div>
        
        <div v-if="item.status === 'active' && props.GameStatus === 'prepare'" class="placing">
          <span class="chip">
            <h4>{{ cutNumberNano(item?.amount ?? 0n) }}</h4>
            <div class="kit-icon" v-html="TonOutlineRawIcon"></div>
          </span>
        </div>

        <!-- active -->
        <div v-if="item.status === 'active' && props.GameStatus === 'playing'" class="placing">
          <span class="chip -muted">
            <h4>{{ cutNumberNano(item?.amount ?? 0n) }}</h4>
            <div class="kit-icon" v-html="TonOutlineRawIcon"></div>
          </span>
          <div class="marker">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18L15 12L9 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span class="chip">
            <h4>{{ cutNumberNano(item?.value ?? 0n) }}</h4>
            <div class="kit-icon" v-html="TonOutlineRawIcon"></div>
          </span>
        </div>
        <div v-if="item.status === 'active' && props.GameStatus === 'completed'" class="placing">
          <span class="chip -lose">
            <h4>{{ cutNumberNano(item?.amount ?? 0n) }}</h4>
            <div class="kit-icon" v-html="TonOutlineRawIcon"></div>
          </span>
        </div>

        <!-- cashed / autocashed -->
        <div v-else-if="item.status === 'cashed' || item.status === 'autocashed'" class="placing">
          <span class="chip -primary">
            <h4>{{ item.settled_mult }}x</h4>
          </span>
          <span class="badge -primary">
            <h4>{{ cutNumberNano(item?.value ?? 0n) }}</h4>
            <div class="kit-icon" v-html="TonOutlineRawIcon"></div>
          </span>
        </div>
      </div>
    </transition-group>

    <!-- <div class="sk-load" v-if="skeleton"></div> -->
  </div>
</template>

<style lang="scss" src="./Users.scss"></style>
<style lang="scss" scoped>
/* ----- transition-group для появления/перемещения ----- */
.user-enter-from {
  opacity: 0;
  transform: translateY(14px) scale(.97);
  filter: blur(3px);
}

.user-enter-active {
  transition:
    opacity .34s cubic-bezier(.21, .8, .35, 1),
    transform .34s cubic-bezier(.21, .8, .35, 1),
    filter .34s cubic-bezier(.21, .8, .35, 1);
}

.user-leave-from {
  opacity: 1;
  transform: none;
  filter: blur(0);
}

.user-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(.96);
  filter: blur(2px);
}

.user-leave-active {
  transition:
    opacity .26s cubic-bezier(.4, 0, .2, 1),
    transform .26s cubic-bezier(.4, 0, .2, 1),
    filter .26s cubic-bezier(.4, 0, .2, 1);
}

.user-move {
  transition: transform .28s cubic-bezier(.25, .8, .25, 1);
  will-change: transform;
}

.items .item {
  animation: popIn .42s cubic-bezier(.18, .89, .32, 1.1) both;
  animation-delay: calc(var(--i, 0) * 42ms);
  will-change: transform, opacity, filter;
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: translateY(12px) scale(.96);
    filter: blur(4px);
  }
  60% {
    opacity: 1;
    transform: translateY(-2px) scale(1.01);
    filter: blur(0);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

/* аватар */
.image {
  position: relative;
  width: 36px; height: 36px;
  border-radius: 50%;
  overflow: hidden;
}
.image img {
  width: 100%; height: 100%; object-fit: cover; display: block;
  opacity: 0;
  transition: opacity .24s ease;
}
.image img.show { opacity: 1; }

.avatar_null {
  animation: pulse .9s ease-in-out infinite;
}
.avatar_null h4 { font-weight: 700; letter-spacing: .2px; }

@keyframes pulse {
  0%, 100% { transform: scale(1);   filter: brightness(1); }
  50%      { transform: scale(1.04); filter: brightness(1.1); }
}

/* необязательные мелочи для чипов/стрелки — плавность */
.chip, .badge, .arrow { transition: transform .2s ease, opacity .2s ease; }

/* уважение reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .user-enter-active,
  .user-leave-active,
  .user-move,
  .items .item {
    transition: none !important;
    animation: none !important;
    filter: none !important;
  }
}
</style>