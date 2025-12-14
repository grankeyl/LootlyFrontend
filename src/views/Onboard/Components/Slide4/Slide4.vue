<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from "vue";

import Game from "./Game/Game.vue";

const props = defineProps<{ active: boolean }>();

const root = ref<HTMLElement|null>(null);
const firedOnce = ref(false);

const x = ref(1.00);
const xInterval = ref();

const gameStatus = ref('playing');

async function fireEnter() {
  if (firedOnce.value) return;
  await nextTick();
  root.value?.classList.add("is-in");
  firedOnce.value = true;
}

async function startX() {
  if (xInterval.value) return;
  xInterval.value = window.setInterval(() => {
    x.value = x.value + 0.01;
  }, 100);
}

async function stopX() {
  if (!xInterval.value) return;
  window.clearInterval(xInterval.value);
  xInterval.value = null;
}

watch(() => props.active, (v) => { 
  if (v) {
    fireEnter();
    startX();
  }
});

onMounted(() => { 
  if (props.active) {
    fireEnter();
    startX();
  }
});
onBeforeUnmount(() => { stopX(); });
</script>

<template>
  <div class="slide slide4" ref="root">

    <div class="ticker">
       <Game 
        :GameStatus="gameStatus"
        :GameBettingEtaMs="5000"
        :GameX="x"
       />
    </div>
    <div class="context">
      <div class="title">
        <h4>
          {{ $t('onboard.slide4.launch') }}
          <span class="market">Rocket Game</span> <br>
          {{ $t('onboard.slide4.andCatchYourLuck') }}
        </h4>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Slide4.scss" scoped></style>