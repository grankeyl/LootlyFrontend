<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';

import * as APIUser from '../../api/user';

import Slide1 from './Components/Slide1/Slide1.vue';
import Slide2 from './Components/Slide2/Slide2.vue';
import Slide3 from './Components/Slide3/Slide3.vue';
import Slide4 from './Components/Slide4/Slide4.vue';
import Slide5 from './Components/Slide5/Slide5.vue';
import Button from './Components/Button/Button.vue';
import Progress from './Components/Progress/Progress.vue';

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
      router.push('/');
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
    <div class="onb-track" ref="TrackRef">
      <div class="onb-slide"><Slide1 /></div>
      <div class="onb-slide"><Slide2 :active="currentSlide === 2" /></div>
      <div class="onb-slide"><Slide3 :active="currentSlide === 3" /></div>
      <div class="onb-slide"><Slide4 :active="currentSlide === 4" /></div>
      <div class="onb-slide"><Slide5 :active="currentSlide === 5" /></div>
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