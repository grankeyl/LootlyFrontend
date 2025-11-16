<script setup lang="ts">
const props = defineProps<{
  slidesCount: number;
  currentSlide: number;
}>();

const emit = defineEmits<{
  (e: 'set-current-slide', payload: number): void
}>();

function onClick(slide: number) {
  emit('set-current-slide', slide);
}
</script>

<template>
  <div class="progress">
    <div 
      @click="onClick(value)"
      class="line"
      :class="{ active: value < props.currentSlide + 1 }"
      v-for="value in props.slidesCount"
    >
    </div>
  </div>
</template>

<style lang="scss" src="./Progress.scss" scoped></style>