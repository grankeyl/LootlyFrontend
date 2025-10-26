<script setup lang="ts">
// Images
import Empty from "@/assets/images/empty.svg";

const props = defineProps<{ 
  Title: string,
  Description: string,
}>() as any;

</script>

<template>
  <div class="empty">
    <div class="image">
      <img :src="Empty" alt="empty" />
    </div>
    <div class="title">
      <h4>{{ props.Title }}</h4>
    </div>
    <div class="description">
      <p>{{ props.Description }}</p>
    </div>
  </div>
</template>

<style lang="scss" src="./Empty.scss" scoped></style>