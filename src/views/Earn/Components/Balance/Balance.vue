<script setup lang="ts">
import { ref, watch } from "vue";
import { useCacheStore } from "../../../../stores/pinia-store";

import InfoIcon from "@/assets/icons/info.svg";
import LootcoinIcon from "@/assets/icons/lootcoin.svg";

const emit = defineEmits<{
  (e: 'open-modal-balance-about', value: number): void
}>();

defineProps<{}>();

const useCache = useCacheStore() as any;

const displayed = ref(useCache.UserData?.BonusBalance ?? 0);
const duration = 550;
let frame: number | null = null;

function openAbout() {
  emit("open-modal-balance-about", 0);
}

// плавная функция затухания
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

watch(
  () => useCache.UserData?.BonusBalance,
  (newVal) => {
    if (typeof newVal !== "number" || isNaN(newVal)) return;

    const start = displayed.value;
    const end = newVal;
    if (start === end) return;

    const startTime = performance.now();

    if (frame) cancelAnimationFrame(frame);

    const animate = (time: number) => {
      const rawProgress = (time - startTime) / duration;
      const progress = Math.min(Math.max(rawProgress, 0), 1);

      const eased = easeOutCubic(progress);
      const value = start + (end - start) * eased;

      displayed.value = Math.round(value);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
  },
  { immediate: false }
);
</script>

<template>
  <div class="balance" @click="openAbout">
    <div class="about">
      <img :src="InfoIcon" alt="info-icon" />
    </div>
    <div class="context">
      <h1>{{ displayed }}</h1>
      <img :src="LootcoinIcon" alt="">
    </div>
  </div>
</template>

<style lang="scss" src="./Balance.scss" scoped></style>