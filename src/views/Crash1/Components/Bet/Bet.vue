<script setup lang="ts">
const emit = defineEmits<{
  (e:'open-bet-modal'): void
}>();

function openBetModal() {
  emit('open-bet-modal');
}
</script>

<template>
  <div class="bet">
    <button @click="openBetModal()">
      <h4>Place Bit</h4>
    </button>
  </div>
</template>

<style lang="scss" src="./Bet.scss" scoped></style>