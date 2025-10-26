<script setup lang="ts">
import { ref } from "vue";

// Icons
import LootcoinIcon from "@/assets/icons/lootcoin.svg";
import TonWhite from "@/assets/icons/ton-white.svg";
import ChevroneRight from "@/assets/icons/chevrone-right.svg";

// Images
import Reward from "@/assets/images/leaderboard-pg/reward.png";

const skeleton = ref(true);

setTimeout(() => {
  skeleton.value = false;
}, 1000);
</script>

<template>
  <div class="info">
    <div class="image">
      <img :src="Reward" alt="reward">
    </div>
    <div class="title">
      <h4>Leaderboard</h4>
    </div>
    <div class="description">
      <p>Описание по какому принципу и какой импакт</p>
    </div>
  </div>
</template>

<style lang="scss" src="./Info.scss" scoped></style>