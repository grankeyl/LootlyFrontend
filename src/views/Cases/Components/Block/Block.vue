<script setup lang="ts">
import { useRouter } from "vue-router";

// Images
import BlockBg from "@/assets/images/cases-pg/block-bg.png";

// Icons
import ChevroneRight from "@/assets/icons/chevrone-right.svg?raw";
import TelegramModule from "../../../../hooks/useTelegram";

const router = useRouter();

function openRocketGame() {
  TelegramModule.useMediumHaptic();
  router.push('/crash');
}
</script>

<template>
  <div class="block" @click="openRocketGame">
    <div class="bg">
      <img :src="BlockBg" alt="block-bg" />
    </div>
    <div class="title">
      <h4>Rocket Game</h4>
    </div>
    <div class="chevrone">
      <div class="kit-icon" v-html="ChevroneRight"></div>
    </div>
  </div>
</template>

<style lang="scss" src="./Block.scss" scoped></style>