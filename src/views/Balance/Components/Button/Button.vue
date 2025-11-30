<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

const BackButton = () => {
  const state = window.history.state || {};

  if (state.back === "/balance/onboard") {
    router.go(-2);
  } else {
    router.back();
  }
};
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