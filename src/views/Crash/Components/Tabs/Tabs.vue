<script setup lang="ts">
import { ref } from "vue";

// Icons
import TonWhiteIcon from "@/assets/icons/ton-white.svg";

const skeleton = ref(true);

setTimeout(() => {
  skeleton.value = false;
}, 1000);
</script>

<template>
  <div class="tabs">
    <div class="latests">
      <div class="item " v-for="value in 12" :key="value">
          <h4>1,74x</h4>
      </div>
    </div>
    <div class="actions">
      <div class="top">
        <div class="input">
          <input
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="Your Price"
            :value="100"
          />
          <img :src="TonWhiteIcon" alt="ton-icon" aria-hidden="true" />
        </div>
        <div class="button">
          <button>
            <h4>Place Bit</h4>
          </button>
        </div>
      </div>
    </div>
    <div class="select">
      <div class="item" v-for="value in 4" :key="value">
        <h4>100</h4>
        <img :src="TonWhiteIcon" alt="ton-icon" aria-hidden="true" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Tabs.scss" scoped></style>