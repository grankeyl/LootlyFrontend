<script setup lang="ts">
const props = defineProps<{
  isLast: boolean
}>();
</script>

<template>
  <div class="apriory">
    <button
      class="button"
      :class="{ active: props.isLast }"
      type="button"
    >
      <h4 v-if="props.isLast">{{ $t('onboard.game') }}</h4>
      <h4 v-else>{{ $t('onboard.next') }}</h4>
    </button>
  </div>
</template>

<style lang="scss" src="./Button.scss" scoped></style>