<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useCacheStore } from '../../../stores/pinia-store';
import { useRouter } from 'vue-router';

import * as APIUser from '../../../api/user';

// Images
import LogoImage from "@/assets/images/logo.svg";
import CloseIcon from "@/assets/icons/close.svg?raw";

import Slide1 from './Components/Slide1/Slide1.vue';
import Slide2 from './Components/Slide2/Slide2.vue';
import Slide3 from './Components/Slide3/Slide3.vue';
import Button from './Components/Button/Button.vue';
import Progress from './Components/Progress/Progress.vue';

const useCache = useCacheStore() as any;
const router = useRouter();

const currentSlide = ref(1);
const slidesCount  = ref(1);
const isLast = ref(false);

const PageRef  = ref<HTMLElement|null>(null);
const TrackRef = ref<HTMLElement|null>(null);
let io: IntersectionObserver | null = null;

function updateIsLast(){ isLast.value = currentSlide.value >= slidesCount.value; }

async function goTo(index: number){
  if (isLast.value) {
    const res = await APIUser.onboarding();
    if (!res?.ok) return;
    if (res.ok) {
      const res = await APIUser.onbalance();
      if (!res?.ok) return;
      if (res.ok) {
        useCache.UserData.OnBoardingBalance = res.on_boarding;
        router.push('/balance');
      }
    }
    return;
  };

  const max = slidesCount.value || 1;
  const clamped = Math.max(1, Math.min(max, index));
  const el = TrackRef.value?.querySelector<HTMLElement>(`.onb-slide:nth-child(${clamped})`);
  el?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
}

function setCurrentSlide(i:number) {
  goTo(i); 
}

function close() {
  router.push('/balance');
}

onMounted(async () => {
  await nextTick();
  const all = Array.from(TrackRef.value?.querySelectorAll<HTMLElement>(':scope > .onb-slide') ?? []);
  slidesCount.value = all.length || 1;
  updateIsLast();

  // Наблюдаем какой слайд в центре — обновляем индикатор
  io = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    const idx = all.indexOf(visible.target as HTMLElement) + 1;
    if (idx > 0 && idx !== currentSlide.value){
      currentSlide.value = idx;
      updateIsLast();
    }
  }, { root: PageRef.value, threshold: [0.5, 0.75, 0.9] });

  all.forEach(el => io!.observe(el));
});

onBeforeUnmount(() => { io?.disconnect(); io = null; });
</script>

<template>
  <div class="onb-page" ref="PageRef">
    <div class="head">
      <img :src="LogoImage" alt="logotype">
      <h4>Баланс</h4>
      <div class="close" @click="close">
        <div class="kit-icon" v-html="CloseIcon"></div>
      </div>
    </div>

    <div class="onb-track" ref="TrackRef">
      <div class="onb-slide"><Slide1 :active="currentSlide === 1" /></div>
      <div class="onb-slide"><Slide2 :active="currentSlide === 2" /></div>
      <div class="onb-slide"><Slide3 :active="currentSlide === 3" /></div>
    </div>

    <div class="onb-progress">
      <Button @click="goTo(currentSlide+1)" :isLast="isLast" />
      <Progress
        @set-current-slide="setCurrentSlide"
        :slidesCount="slidesCount"
        :currentSlide="currentSlide"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.onb-page{
  position:relative; width:100%; max-width:var(--max-width);
  height:100%; overflow:hidden; touch-action: pan-y; 

  .head {
    width: 100%;
    height: fit-content;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    padding-top: calc(
      var(--tg-safe-area-inset-top, -10px) + 70px
    );
    padding-left: var(--padding-left);
    padding-right: var(--padding-left);


    img {
      width: 114px;
      height: 28px;
      object-fit: contain;
    }

    h4 {
      font-weight: 700;
      font-size: 2.4rem;
      color: var(--color-descr);
      margin-right: auto;
    }

    .close {
      width: fit-content;
      height: fit-content;
      z-index: 1;

      .kit-icon {
        width: 24px;
        height: 24px;
        :deep(svg) {
          width: 24px;
          height: 24px;
        }
      }
    }
  }
}

/* Нативный скролл по оси X с защёлками */
.onb-track{
  height:100%;
  display:flex;
  overflow-x:auto;
  scroll-snap-type: x mandatory;
  scroll-behavior:smooth;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
}
.onb-track::-webkit-scrollbar{ display:none; } /* Chrome/Safari */

/* Каждый слайд — точка защёлки */
.onb-slide{
  flex: 0 0 100%;
  min-width:100%;
  height:100%;
  scroll-snap-align: start;
  position:relative; overflow:hidden;
}

.onb-slide img{ pointer-events:none; -webkit-user-drag:none; user-select:none; }

.onb-progress{
  position:absolute; left:0; right:0; bottom:max(14px, env(safe-area-inset-bottom));
  display:grid; gap:10px; padding:0 16px;
  z-index: 11;
  pointer-events:none; > *{ pointer-events:auto; }
}
</style>