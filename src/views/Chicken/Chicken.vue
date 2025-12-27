<script setup lang="ts">
// Components
import Game from "./Game/Game.vue";
import Tools from "./Tools/Tools.vue";
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