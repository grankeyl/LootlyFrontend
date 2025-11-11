<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

const BackButton = () => {
  router.back();
}
</script>

<template>
  <div class="apriory">
    <button
      @click="BackButton"
      class="button"
      type="button"
    >
      <h4>{{ $t('balance.button.back') }}</h4>
    </button>
  </div>
</template>

<style lang="scss" src="./Button.scss" scoped></style>