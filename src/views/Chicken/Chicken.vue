<script setup lang="ts">
// Components
import { onMounted } from "vue";
import { useRouter } from "vue-router";

import Game from "./Game/Game.vue";
import Tools from "./Tools/Tools.vue";
import TelegramModule from "../../hooks/useTelegram";

const router = useRouter();

onMounted(() => {
  TelegramModule.useBackButton(() => router.back());
});
</script>

<template>
  <div class="chicken">
    <div class="chicken-game">
      <Game />
    </div>
    <div class="chicken-tools">
      <Tools />
    </div>
  </div>
</template>

<style lang="scss" src="./Chicken.scss" scoped></style>