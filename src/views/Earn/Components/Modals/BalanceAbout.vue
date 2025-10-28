<script setup lang="ts">
// Images
import AboutBalanceImg from "@/assets/images/earn-pg/about-balance.png";

// Icons
import CloseIcon from "@/assets/icons/close.svg";
import LootcoinIcon from "@/assets/icons/lootcoin.svg";

const emit = defineEmits<{
  (e: "close"): void;
}>();

function close() {
  emit('close');
}
</script>

<template>
  <div class="sheet">
    <div class="close">
      <img :src="CloseIcon" alt="close-icon" aria-hidden="true" />
    </div>
    <div class="cover">
      <img :src="AboutBalanceImg" alt="about-balance" />
    </div>
    <div class="info">
      <img :src="LootcoinIcon" alt="">
      <h4>Lootly Coin</h4>
      <p>
        Additional balance in the app, used for airdrops
      </p>
    </div>
    <div class="buttons">
      <button @click="close">
        <h4>Okey</h4>
      </button>
    </div>
  </div>
</template>

<style lang="scss" src="./BalanceAbout.scss" scoped></style>