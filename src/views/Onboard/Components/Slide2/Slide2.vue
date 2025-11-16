<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";

// Images
import TickerTop from "@/assets/images/onboard-pg/slide2/ticker-top.png";
import TickerBottom from "@/assets/images/onboard-pg/slide2/ticker-bottom.png";

const props = defineProps<{ active: boolean }>();

const root = ref<HTMLElement|null>(null);
const firedOnce = ref(false);

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
  <div class="slide slide2" ref="root">
    <div class="ticker">
      <div class="ticker-top">
          <img :src="TickerTop" alt="" />
      </div>
      <div class="ticker-bottom">
        <img :src="TickerBottom" alt="" />
      </div>
    </div>
    <div class="context">
      <div class="title">
        <h4>Открывай кейсы и наслаждайся лутом</h4>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Slide2.scss" scoped></style>
<style lang="scss" scoped>
</style>