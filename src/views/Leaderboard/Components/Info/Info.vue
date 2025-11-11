<script setup lang="ts">
import { ref } from "vue";

// Images
import Reward from "@/assets/images/leaderboard-pg/reward.png";

const skeleton = ref(true);
setTimeout(() => { skeleton.value = false; }, 1000);
</script>

<template>
  <div class="info">
    <div class="image">
      <img :src="Reward" alt="reward">
    </div>
    <div class="title">
      <h4>{{ $t('leaderboard.info.title') }}</h4>
    </div>
    <div class="description">
      <p>{{ $t('leaderboard.info.descr') }}</p>
    </div>
  </div>
</template>

<style lang="scss" src="./Info.scss" scoped></style>