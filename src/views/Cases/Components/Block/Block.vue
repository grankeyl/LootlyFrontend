<script setup lang="ts">
import { useRouter } from "vue-router";

// Images
import BlockBg from "@/assets/images/cases-pg/block-bg.png";
import BlockChickenBg from "@/assets/images/cases-pg/block-chicken-bg.png";

// Icons
import ChevroneRight from "@/assets/icons/chevrone-right.svg?raw";
import TelegramModule from "../../../../hooks/useTelegram";
import { showErrorToast } from "../../../../utils/toastManager";

const router = useRouter();

function openChickenGame() {
  showErrorToast("Sorry, Chicken Game is not available now");
  // TelegramModule.useMediumHaptic();
  // router.push('/chicken');
}

function openRocketGame() {
  TelegramModule.useMediumHaptic();
  router.push('/crash');
}
</script>

<template>
  <div class="blocker">
    <div class="block rocket" @click="openRocketGame">
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
    <div class="block chicken" @click="openChickenGame">
      <div class="bg">
        <img :src="BlockChickenBg" alt="block-bg" />
      </div>
      <div class="title">
        <h4>Chicken Game</h4>
      </div>
      <div class="chevrone">
        <div class="kit-icon" v-html="ChevroneRight"></div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Block.scss" scoped></style>