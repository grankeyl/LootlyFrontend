<script setup lang="ts">
// Icons
import InfoIcon from "@/assets/icons/info.svg";
import LootcoinIcon from "@/assets/icons/lootcoin.svg";
</script>

<template>
  <div class="balance">
    <div class="about">
      <img :src="InfoIcon" alt="info-icon" />
    </div>
    <div class="context">
      <h1>15,2k</h1>
      <img :src="LootcoinIcon" alt="">
    </div>
  </div>
</template>

<style lang="scss" src="./Balance.scss" scoped></style>