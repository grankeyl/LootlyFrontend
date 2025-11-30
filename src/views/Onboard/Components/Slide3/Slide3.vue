<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from "vue";

import StoreIcon from "@/assets/icons/market.svg?raw";
import TickerBottom from "@/assets/images/onboard-pg/slide2/ticker-bottom.webp";
import BgEffect from "@/assets/images/onboard-pg/slide3/bg-effect.webp";
import Item from "@/assets/images/onboard-pg/slide3/item.webp";
import Backdrop from "@/assets/images/onboard-pg/slide3/blur.webp";

const props = defineProps<{ active: boolean }>();

const root = ref<HTMLElement|null>(null);
const loaded = ref(false);
const firedOnce = ref(false);

function onImageLoad() { loaded.value = true; }

// триггерим вход ОДИН раз, когда долистали до слайда 3
async function fireEnter() {
  if (firedOnce.value) return;
  await nextTick();
  root.value?.classList.add("is-in");
  firedOnce.value = true;
}

watch(() => props.active, (v) => { if (v) fireEnter(); });

onMounted(() => { if (props.active) fireEnter(); });
</script>

<template>
  <div class="backdrop" :class="{ loaded }">
    <img :src="Backdrop" alt="backdrop" @load="onImageLoad" />
  </div>

  <div class="slide slide3" ref="root">
    <div class="ticker">
      <div class="item">
        <div class="ticker-bg">
          <div class="effect">
            <img :src="BgEffect" alt="bg-effect" />
          </div>
          <div class="ticker-item">
            <img :src="Item" alt="item" />
          </div>
        </div>
      </div>
      <div class="ticker-bottom">
        <img :src="TickerBottom" alt="" />
      </div>
    </div>
    <div class="context">
      <div class="title">
        <h4>
          Забирай приз, продай его или купи любой в
          <span class="market">
            <div class="kit-icon" v-html="StoreIcon"></div>
            <p>Market</p>
          </span>
        </h4>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Slide3.scss" scoped></style>
<style scoped lang="scss">
.backdrop {
  opacity: 0;
  transition: opacity 0.6s ease;
  animation: bgDrift 2s ease-in-out 0.4s infinite alternate;
  &.loaded {
    opacity: .7;
  }
}

@keyframes bgDrift {
  0%   { opacity: .9; }
  50%   { opacity: .76; }
  100%   { opacity: .9; }
}
</style>