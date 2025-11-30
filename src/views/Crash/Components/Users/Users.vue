<script setup lang="ts">
import { computed, ref, reactive } from "vue";
import { cutNumberNano } from "../../../../utils/useTon";

import TonOutlineRawIcon from "@/assets/icons/ton-outline.svg?raw";

const props = defineProps<{
  GameX: number;
  GameStatus: string;
  GameBets: any;
}>();

const skeleton = ref(true);
const bets = computed(() => {
  if (!props.GameBets) return [];
  return [...props.GameBets].reverse();
});

setTimeout(() => { skeleton.value = false; }, 1000);

const imageLoaded = reactive<Record<string, boolean>>({});
const keyFor = (item: any, index: number) => item.id ?? `${index}-${item.username ?? 'u'}`;
const onImgLoad = (k: string) => (imageLoaded[k] = true);
const onImgError = (k: string) => (imageLoaded[k] = false);
</script>

<template>
  <div class="users">
    <transition-group name="user" tag="div" class="items" appear>
      <div
        class="item"
        v-for="(item, index) in bets"
        :key="keyFor(item, index)"
        :style="`--i:${index}`"
      >
        <div class="number"><p>#{{ index + 1 }}</p></div>

        <div class="image">
          <div class="avatar_null" v-if="!item.user_photo || !imageLoaded[keyFor(item, index)]">
            <h4 v-if="item.user_first_name">{{ item.user_first_name.substring(0, 1) }}</h4>
          </div>

          <img
            v-if="item.user_photo"
            :src="item.user_photo"
            :alt="item.username ?? item.user_first_name ?? 'user'"
            @load="onImgLoad(keyFor(item, index))"
            @error="onImgError(keyFor(item, index))"
            :class="{ show: imageLoaded[keyFor(item, index)] }"
          />
        </div>

        <div class="name">
          <h4 v-if="item.username">@{{ item.username }}</h4>
          <h4 v-else>{{ item.user_first_name }}</h4>
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
  transform: translateY(10px) scale(.98);
}
.user-enter-active {
  transition: transform .28s ease, opacity .28s ease;
}
.user-leave-from { opacity: 1; transform: none; }
.user-leave-to   { opacity: 0; transform: translateY(6px) scale(.98); }
.user-leave-active { transition: transform .22s ease, opacity .22s ease; }
.user-move {
  transition: transform .25s ease;
  will-change: transform;
}

/* доп. «поп-ин» слайд при добавлении (легкий, со ступенчатой задержкой) */
.items .item {
  animation: popIn .35s cubic-bezier(.2,.8,.2,1) both;
  animation-delay: calc(var(--i, 0) * 40ms);
  will-change: transform, opacity;
}
@keyframes popIn {
  from { opacity: 0; transform: translateY(8px) scale(.985); }
  to   { opacity: 1; transform: none; }
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
  .user-enter-active, .user-leave-active, .user-move, .items .item { transition: none !important; animation: none !important; }
}
</style>