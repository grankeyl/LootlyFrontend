<script setup lang="ts">
import { useCacheStore } from "../../../../stores/pinia-store";

// Icons
import InfoIcon from "@/assets/icons/info.svg";
import LootcoinIcon from "@/assets/icons/lootcoin.svg";

const useCache = useCacheStore() as any;

const emit = defineEmits<{
  (e: 'open-modal-balance-about', value: number): void
}>();

defineProps<{
}>();

function openAbout() {
  emit('open-modal-balance-about', 0);
}
</script>

<template>
  <div class="balance" @click="openAbout">
    <div class="about">
      <img :src="InfoIcon" alt="info-icon" />
    </div>
    <div class="context">
      <h1>{{ useCache.UserData.BonusBalance }}</h1>
      <img :src="LootcoinIcon" alt="">
    </div>
  </div>
</template>

<style lang="scss" src="./Balance.scss" scoped></style>